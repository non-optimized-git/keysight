import type { Question, Table, ViewConfig } from '../types';
import { getColumnDataIndex, getFilteredRows, getVisibleColumns } from '../utils/dataFilter';

interface PromptPayload {
  prompt: string;
  truncated: boolean;
  fromRows: number;
  toRows: number;
}

export function buildPrompt(questions: Question[], view: ViewConfig, userMessage: string): PromptPayload {
  const lines: string[] = [];
  let rowCount = 0;
  const maxRows = 200;
  const maxCols = 20;

  questions.forEach((q) => {
    q.tables.forEach((t: Table) => {
      const visibleCols = getVisibleColumns(t, view).flatMap((g) => g.columns).slice(0, maxCols);
      const rows = getFilteredRows(t, view);
      const remaining = maxRows - rowCount;
      if (remaining <= 0) return;

      const taken = rows.slice(0, remaining);
      rowCount += taken.length;

      lines.push(`[表格: ${q.description} | ${t.headerName}]`);
      lines.push(`Base: ${t.base} (n=${t.baseSize})`);
      lines.push(['Label', ...visibleCols.map((c) => c.label)].join(' | '));
      taken.forEach((row) => {
        const vals = visibleCols.map((c) => {
          const idx = getColumnDataIndex(t, c.letter);
          const raw = idx < 0 ? null : view.dataType === 'abs' ? row.absValues[idx] : row.pctValues[idx];
          return raw == null ? '' : raw.toFixed(view.decimalPlaces);
        });
        lines.push([row.label, ...vals].join(' | '));
      });
      lines.push('');
    });
  });

  const truncated = rowCount >= maxRows;
  const notice = truncated ? `已从超过 ${maxRows} 行截断至 ${maxRows} 行。` : '';

  return {
    truncated,
    fromRows: rowCount,
    toRows: Math.min(rowCount, maxRows),
    prompt: [
      '你是一个问卷交叉表分析助手，请用中文回答。',
      notice,
      ...lines,
      `用户问题：${userMessage}`,
      '请在回答中给出关键结论，并在需要时附带 Markdown 表格。',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
