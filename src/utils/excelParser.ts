import * as XLSX from 'xlsx';
import type { Column, ColumnGroup, DataRow, ParseResult, ParseWarning, Question, Table } from '../types';

interface FileMeta {
  name?: string;
  size: number;
  lastModified: number;
}

interface NormalizedWorkbook {
  toc: XLSX.WorkSheet;
  abs: XLSX.WorkSheet;
  pct: XLSX.WorkSheet;
  sig?: XLSX.WorkSheet;
}

interface TablePos {
  tableId: string;
  start: number;
  end: number;
}

interface ParsedTable {
  table: Table;
  questionId: string;
  questionDescription: string;
}

export interface ParseMapping {
  tableTitleRegex: string;
  questionRowOffset: number;
  headerRowOffset: number;
  baseRowOffset: number;
  groupRowOffset: number;
  columnRowOffset: number;
  dataStartRowOffset: number;
  rowLabelColIndex: number;
  dataStartColIndex: number;
}

export interface MappingPreview {
  sheetName: string;
  tableStartRow: number;
  previewStartRow: number;
  cells: string[][];
}

const REQUIRED_SHEETS = ['table of contents', 'abs', '%'];

const normalize = (v: string) => v.trim().toLowerCase();

export function defaultParseMapping(): ParseMapping {
  return {
    tableTitleRegex: '^table\\s+\\d+[a-z]?$',
    questionRowOffset: 1,
    headerRowOffset: 2,
    baseRowOffset: 3,
    groupRowOffset: 4,
    columnRowOffset: 5,
    dataStartRowOffset: 6,
    rowLabelColIndex: 0,
    dataStartColIndex: 1,
  };
}

function isLikelyQuestionRow(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /\sby\s/i.test(t) || /\(Q[0-9A-Z]+\)/i.test(t) || /^Q\d+[A-Z]?(?:[_\s]|$)/i.test(t);
}

function isLikelyHeaderRow(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /^header[:\s]/i.test(t);
}

function isLikelyBaseRow(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /^base[:：\s]/i.test(t) || /^n\s*=/i.test(t);
}

function countNonEmptyFrom(row: string[], from: number, to: number): number {
  let count = 0;
  for (let c = from; c <= to && c < row.length; c += 1) {
    if (String(row[c] ?? '').trim()) count += 1;
  }
  return count;
}

function firstNonEmptyFrom(row: string[], from: number, to: number): number {
  for (let c = from; c <= to && c < row.length; c += 1) {
    if (String(row[c] ?? '').trim()) return c;
  }
  return from;
}

export function suggestParseMappingFromPreview(preview: MappingPreview, base?: ParseMapping): ParseMapping {
  const fallback = { ...(base ?? defaultParseMapping()) };
  const startOffsetMapping: ParseMapping = isLikelyQuestionRow(String(preview.cells[preview.tableStartRow - preview.previewStartRow]?.[0] ?? ''))
    ? {
        ...fallback,
        questionRowOffset: 0,
        headerRowOffset: 1,
        baseRowOffset: 2,
        groupRowOffset: 3,
        columnRowOffset: 4,
        dataStartRowOffset: 5,
      }
    : fallback;

  const startGlobal = preview.tableStartRow;
  const rows = preview.cells;
  const localStart = Math.max(0, startGlobal - preview.previewStartRow);
  const scanEnd = Math.min(rows.length - 1, localStart + 10);

  let questionRel = startOffsetMapping.questionRowOffset;
  let headerRel = startOffsetMapping.headerRowOffset;
  let baseRel = startOffsetMapping.baseRowOffset;
  let groupRel = startOffsetMapping.groupRowOffset;
  let columnRel = startOffsetMapping.columnRowOffset;
  let dataStartRel = startOffsetMapping.dataStartRowOffset;
  let dataStartColIndex = startOffsetMapping.dataStartColIndex;

  for (let i = localStart; i <= scanEnd; i += 1) {
    const first = String(rows[i]?.[0] ?? '').trim();
    const rel = i - localStart;
    if (isLikelyQuestionRow(first) && rel <= 2) questionRel = rel;
    if (isLikelyHeaderRow(first) && rel <= 4) headerRel = rel;
    if (isLikelyBaseRow(first) && rel <= 6) baseRel = rel;
  }

  const structuralRows: number[] = [];
  for (let i = localStart; i <= scanEnd; i += 1) {
    const row = rows[i] ?? [];
    const filled = countNonEmptyFrom(row, 1, 20);
    if (filled >= 2) structuralRows.push(i - localStart);
  }

  const afterBase = structuralRows.filter((r) => r > baseRel);
  if (afterBase.length >= 1) groupRel = afterBase[0];
  if (afterBase.length >= 2) columnRel = afterBase[1];
  else if (afterBase.length === 1) columnRel = afterBase[0] + 1;
  dataStartRel = Math.max(columnRel + 1, dataStartRel);

  const columnLocal = localStart + columnRel;
  if (columnLocal >= 0 && columnLocal < rows.length) {
    dataStartColIndex = firstNonEmptyFrom(rows[columnLocal] ?? [], 1, 40);
  }

  return {
    ...startOffsetMapping,
    questionRowOffset: Math.max(0, questionRel),
    headerRowOffset: Math.max(0, headerRel),
    baseRowOffset: Math.max(0, baseRel),
    groupRowOffset: Math.max(0, groupRel),
    columnRowOffset: Math.max(0, columnRel),
    dataStartRowOffset: Math.max(0, dataStartRel),
    dataStartColIndex: Math.max(1, dataStartColIndex),
  };
}

export function colIndexToLetters(i: number): string {
  let s = '';
  let idx = i;
  while (idx >= 0) {
    s = String.fromCharCode((idx % 26) + 65) + s;
    idx = Math.floor(idx / 26) - 1;
  }
  return s;
}

function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function getProjectKey(firstRow: string, file: FileMeta): string {
  return hashString(`${firstRow}|${file.size}|${file.lastModified}`);
}

function toRows(sheet: XLSX.WorkSheet): unknown[][] {
  const dense = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][];
  return expandMerges(dense, sheet['!merges'] ?? []);
}

function expandMerges(rows: unknown[][], merges: XLSX.Range[]): unknown[][] {
  const out = rows.map((r) => [...r]);
  merges.forEach((m) => {
    const v = out[m.s.r]?.[m.s.c];
    for (let r = m.s.r; r <= m.e.r; r += 1) {
      if (!out[r]) out[r] = [];
      for (let c = m.s.c; c <= m.e.c; c += 1) {
        if (out[r][c] == null || out[r][c] === '') out[r][c] = v;
      }
    }
  });
  return out;
}

function parseNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  const text = String(v).trim().replace(/,/g, '').replace(/%$/, '');
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function parseSig(v: unknown): string {
  if (v == null || typeof v === 'number') return '';
  const text = String(v).replace(/\s+/g, ' ').trim().toUpperCase();
  if (!text) return '';
  return text.match(/([A-Z]+)\s*$/)?.[1] ?? '';
}

function validateWorkbook(workbook: XLSX.WorkBook): NormalizedWorkbook {
  const map = new Map<string, string>();
  workbook.SheetNames.forEach((name) => map.set(normalize(name), name));

  REQUIRED_SHEETS.forEach((key) => {
    if (!map.has(key)) {
      throw new Error(`未找到 "${key}" 表。检测到的 Sheet: ${JSON.stringify(workbook.SheetNames)}`);
    }
  });

  return {
    toc: workbook.Sheets[map.get('table of contents') as string],
    abs: workbook.Sheets[map.get('abs') as string],
    pct: workbook.Sheets[map.get('%') as string],
    sig: map.get('%sig') ? workbook.Sheets[map.get('%sig') as string] : undefined,
  };
}

function normalizeTableTitle(raw: string): string {
  return raw.replace(/^['"]+/, '').trim();
}

function extractTableId(raw: string): string {
  const title = normalizeTableTitle(raw);
  const matched =
    title.match(/table\s*(\d+[A-Z]?)/i)?.[1] ??
    title.match(/\b(\d+[A-Z]?)\b/i)?.[1] ??
    '';
  if (matched) return matched.toUpperCase();
  return title ? title.toUpperCase() : '';
}

function findTableStarts(rows: unknown[][], mapping: ParseMapping): number[] {
  const starts: number[] = [];
  rows.forEach((r, idx) => {
    const first = String(r[mapping.rowLabelColIndex] ?? '').trim();
    let ok=false;
    try { ok = new RegExp(mapping.tableTitleRegex, 'i').test(first); } catch { ok = /^table\s+\d+[a-z]?$/i.test(first); }
    if (ok) starts.push(idx);
  });
  // Fallback for files where title looks like "Q4a_xxx by BANNER1" and no explicit "Table 1A".
  if (starts.length === 0) {
    rows.forEach((r, idx) => {
      const first = String(r[mapping.rowLabelColIndex] ?? '').trim();
      if (/\sby\s/i.test(first)) starts.push(idx);
    });
  }
  return starts;
}

function parseTablePositions(rows: unknown[][], mapping: ParseMapping): Map<string, TablePos> {
  const starts = findTableStarts(rows, mapping);
  const out = new Map<string, TablePos>();
  starts.forEach((start, i) => {
    const end = (starts[i + 1] ?? rows.length) - 1;
    const title = String(rows[start]?.[mapping.rowLabelColIndex] ?? '').trim();
    const tableId = extractTableId(title) || `TABLE_AT_${start}`;
    if (tableId) out.set(tableId, { tableId, start, end });
  });
  return out;
}

function parseColumns(groupRow: unknown[], labelRow: unknown[], mapping: ParseMapping): ColumnGroup[] {
  const columns: Array<Column & { groupName: string }> = [];
  const usedLetters = new Set<string>();

  for (let c = mapping.dataStartColIndex; c < labelRow.length; c += 1) {
    const label = String(labelRow[c] ?? '').trim();
    if (!label) continue;
    const parsed = label.match(/\(([A-Z]+)\)/)?.[1] ?? '';
    const fallback = colIndexToLetters(columns.length);
    const letter = parsed && !usedLetters.has(parsed) ? parsed : fallback;
    usedLetters.add(letter);
    const groupName = String(groupRow[c] ?? '').trim();
    columns.push({ letter, label, sheetColIndex: c, groupName });
  }

  const groupMap = new Map<string, Array<Column & { groupName: string }>>();
  columns.forEach((col) => {
    const key = col.groupName;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)?.push(col);
  });

  return Array.from(groupMap.entries()).map(([groupName, groupCols]) => ({
    groupName,
    columns: groupCols.map(({ groupName: _g, ...rest }) => rest),
  }));
}

function flattenColumns(groups: ColumnGroup[]): Column[] {
  return groups.flatMap((g) => g.columns);
}

function buildRowIndex(rows: unknown[][], start: number, end: number, mapping: ParseMapping): Map<string, number> {
  const out = new Map<string, number>();
  for (let r = start + mapping.dataStartRowOffset; r <= end; r += 1) {
    const label = String(rows[r]?.[mapping.rowLabelColIndex] ?? '').trim();
    if (!label) continue;
    if (/^table\s+\d+[a-z]?$/i.test(label)) continue;
    out.set(label, r);
  }
  return out;
}

function parseQuestionMeta(desc: string): { id: string; description: string } {
  const clean = desc.trim();
  const id = clean.match(/\((Q[0-9A-Z]+)\)/i)?.[1]?.toUpperCase() ?? clean;
  return { id, description: clean || id };
}

function parseHeaderMeta(raw: string, tableId: string): { headerId: string; headerName: string } {
  const clean = raw.replace(/^header:\s*/i, '').trim();
  const headerCode = clean.match(/^(HEADER\s+[A-Z0-9]+)/i)?.[1]?.toUpperCase();
  const headerName = clean.replace(/^HEADER\s+[A-Z0-9]+\s*/i, '').trim() || clean;
  return {
    headerId: headerCode ?? `${tableId}:${headerName || clean}`,
    headerName: headerName || clean,
  };
}

function parseTable(
  absRows: unknown[][],
  pctRows: unknown[][],
  sigRows: unknown[][] | null,
  absPos: TablePos,
  pctPos: TablePos,
  sigPos: TablePos | null,
  warnings: ParseWarning[],
  mapping: ParseMapping
): ParsedTable {
  const { start, end, tableId } = absPos;

  const desc = String(absRows[start + mapping.questionRowOffset]?.[mapping.rowLabelColIndex] ?? '').trim();
  const question = parseQuestionMeta(desc);
  const base = String(absRows[start + mapping.baseRowOffset]?.[mapping.rowLabelColIndex] ?? '').replace(/^base:\s*/i, '').trim();
  const headerRaw = String(absRows[start + mapping.headerRowOffset]?.[mapping.rowLabelColIndex] ?? '');
  const header = parseHeaderMeta(headerRaw, tableId);

  const groupRow = absRows[start + mapping.groupRowOffset] ?? [];
  const labelRow = absRows[start + mapping.columnRowOffset] ?? [];
  const columnGroups = parseColumns(groupRow, labelRow, mapping);
  const columns = flattenColumns(columnGroups);
  const pctRowIndex = buildRowIndex(pctRows, pctPos.start, pctPos.end, mapping);
  const sigRowIndex = sigRows && sigPos ? buildRowIndex(sigRows, sigPos.start, sigPos.end, mapping) : new Map<string, number>();

  const rows: DataRow[] = [];
  for (let r = start + mapping.dataStartRowOffset; r <= end; r += 1) {
    const label = String(absRows[r]?.[mapping.rowLabelColIndex] ?? '').trim();
    if (!label) continue;
    const secondCell = String(absRows[r]?.[mapping.dataStartColIndex] ?? '').trim().toLowerCase();
    if (label.toLowerCase() === 'total' && secondCell === 'abs') continue;
    if (['abs', '%', '%sig'].includes(secondCell)) continue;

    const pctR = pctRowIndex.get(label);
    const sigR = sigRowIndex.get(label);
    if (pctR == null) {
      warnings.push({
        code: 'ROW_MISMATCH',
        message: `${tableId} 行 "${label}" 在 % 中未找到，已按空值处理`,
        tableId,
      });
    }

    const absValues = columns.map((col) => parseNumber(absRows[r]?.[col.sheetColIndex]));
    const pctValues = columns.map((col) => (pctR == null ? null : parseNumber(pctRows[pctR]?.[col.sheetColIndex])));
    const sigValues = columns.map((col) => (sigRows && sigR != null ? parseSig(sigRows[sigR]?.[col.sheetColIndex]) : ''));

    rows.push({
      label,
      isTotal: /^total$/i.test(label),
      absValues,
      pctValues,
      sigValues,
    });
  }

  return {
    questionId: question.id,
    questionDescription: question.description,
    table: {
      tableId,
      headerId: header.headerId,
      headerName: header.headerName,
      base,
      baseSize: parseNumber(absRows[start + mapping.dataStartRowOffset]?.[mapping.dataStartColIndex]) ?? 0,
      columnGroups,
      rows,
      absStartRowIndex: start,
    },
  };
}

export function parseWorkbook(workbook: XLSX.WorkBook, file: FileMeta, parseMapping?: ParseMapping): ParseResult {
  const warnings: ParseWarning[] = [];
  const mapping = parseMapping ?? defaultParseMapping();
  const sheets = validateWorkbook(workbook);

  const absRows = toRows(sheets.abs);
  const projectFirstRow = String(absRows[0]?.[0] ?? '');
  const projectKey = getProjectKey(projectFirstRow, file);

  const pctRows = toRows(sheets.pct);
  const sigRows = sheets.sig ? toRows(sheets.sig) : null;
  const absPosMap = parseTablePositions(absRows, mapping);
  const pctPosMap = parseTablePositions(pctRows, mapping);
  const sigPosMap = sigRows ? parseTablePositions(sigRows, mapping) : new Map<string, TablePos>();
  const pctPosList = Array.from(pctPosMap.values());
  const sigPosList = Array.from(sigPosMap.values());

  const parsedTables: ParsedTable[] = [];
  Array.from(absPosMap.values()).forEach((absPos, idx) => {
    const pctPos = pctPosMap.get(absPos.tableId) ?? pctPosList[idx];
    const sigPos = sigPosMap.get(absPos.tableId) ?? sigPosList[idx];
    if (!pctPos) {
      warnings.push({ code: 'MISSING_PERCENT_TABLE', message: `% 表中未找到 Table ${absPos.tableId}`, tableId: absPos.tableId });
      return;
    }
    if (sigRows && !sigPos) {
      warnings.push({ code: 'MISSING_SIG_TABLE', message: `%Sig 表中未找到 Table ${absPos.tableId}`, tableId: absPos.tableId });
    }
    parsedTables.push(parseTable(absRows, pctRows, sigRows, absPos, pctPos, sigPos, warnings, mapping));
  });

  const qMap = new Map<string, Question>();
  parsedTables.forEach(({ table, questionId, questionDescription }) => {
    const key = `${questionId}|${questionDescription}`;
    if (!qMap.has(key)) {
      qMap.set(key, { id: questionId, description: questionDescription, tables: [] });
    }
    qMap.get(key)?.tables.push(table);
  });

  return {
    projectKey,
    questions: Array.from(qMap.values()),
    warnings,
  };
}

export async function parseExcelFile(file: File, mapping?: ParseMapping): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  return parseWorkbook(workbook, {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
  }, mapping);
}

export async function inspectExcelForMapping(file: File, mapping?: ParseMapping): Promise<MappingPreview> {
  const m = mapping ?? defaultParseMapping();
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames.find((s) => normalize(s) === 'abs') ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = toRows(sheet);
  const starts = findTableStarts(rows, m);
  const tableStartRow = starts[0] ?? 0;
  const previewStartRow = Math.max(0, tableStartRow - 2);
  const previewEndRow = Math.min(rows.length - 1, tableStartRow + 32);
  const maxCol = Math.max(16, m.dataStartColIndex + 12);
  const cells: string[][] = [];
  for (let r = previewStartRow; r <= previewEndRow; r += 1) {
    const line: string[] = [];
    for (let c = 0; c <= maxCol; c += 1) {
      line.push(String(rows[r]?.[c] ?? ''));
    }
    cells.push(line);
  }
  return { sheetName, tableStartRow, previewStartRow, cells };
}
