import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { Question, Table, ViewConfig } from '../../types';
import { formatCell, getColumnDataIndex, getFilteredRows, getTableDisplayConfig, getVisibleColumns } from '../../utils/dataFilter';

interface Props {
  question: Question;
  table: Table;
  view: ViewConfig;
  onDisplayChange: (
    tableId: string,
    patch: { dataType?: 'abs' | 'pct'; decimalPlaces?: number; orderMode?: 'default' | 'desc' | 'asc'; sigHighlight?: boolean }
  ) => void;
  onCopy: (text: string) => void;
  dataFontSize: number;
  onRemove: () => void;
}

function clamp01To100(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function isNoVisualRow(label: string) {
  const t = label.trim().toLowerCase();
  return t === '合计' || t === '总计' || t === 'total' || /^column\s*n$/i.test(label.trim());
}

export function DataTableCard({ question, table, view, onDisplayChange, onCopy, dataFontSize, onRemove }: Props) {
  const groups = getVisibleColumns(table, view);
  const cols = groups.flatMap((g) => g.columns);
  const allRows = getFilteredRows(table, view);
  const selectedRowKeys = new Set(view.selectedRowKeys ?? []);
  const rowItems = allRows.map((row, rowIndex) => ({ row, rowIndex, key: `${question.id}::${rowIndex}` }));
  const hasRowFilter = rowItems.some((item) => selectedRowKeys.has(item.key));
  const rows = hasRowFilter ? rowItems.filter((item) => item.row.isTotal || selectedRowKeys.has(item.key)) : rowItems;
  const display = getTableDisplayConfig(view, table.tableId);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [labelWidth, setLabelWidth] = useState(260);
  const [containerWidth, setContainerWidth] = useState(0);
  const [copyPulse, setCopyPulse] = useState(false);

  useEffect(() => {
    if (!wrapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(next);
    });
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, []);

  const colWidth = useMemo(() => {
    if (cols.length === 0) return 120;
    const available = containerWidth > 0 ? containerWidth - labelWidth : 0;
    if (available <= 0) return 120;
    return Math.max(110, Math.floor(available / cols.length));
  }, [cols.length, containerWidth, labelWidth]);

  const onLabelResizeStart = (ev: ReactMouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    const startX = ev.clientX;
    const startWidth = labelWidth;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      setLabelWidth(Math.max(180, Math.min(560, startWidth + delta)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const highlightMap = new Map<number, number>();
  if (display.sigHighlight) {
    rows.forEach(({ row, rowIndex }) => {
      if (row.isTotal || isNoVisualRow(row.label)) return;
      const candidates = cols
        .map((c) => {
          const idx = getColumnDataIndex(table, c.letter);
          const value = idx >= 0 ? (display.dataType === 'abs' ? row.absValues[idx] : row.pctValues[idx]) : null;
          const isTotalCol = /total/i.test(c.label);
          return { idx, value, isTotalCol };
        })
        .filter((x) => x.idx >= 0 && !x.isTotalCol && x.value != null)
        .sort((a, b) => (b.value as number) - (a.value as number));
      if (candidates.length < 1) return;
      highlightMap.set(rowIndex, candidates[0].idx);
    });
  }

  const buildCopyText = () => {
    const head1 = ['Label', ...groups.flatMap((g) => g.columns.map(() => g.groupName || 'TOTAL'))];
    const head2 = ['Label', ...cols.map((c) => c.label)];
    const lines = [head1.join('\t'), head2.join('\t')];
    rows.forEach(({ row }) => {
      const vals = cols.map((c) => {
        const idx = getColumnDataIndex(table, c.letter);
        const v = idx < 0 ? null : display.dataType === 'abs' ? row.absValues[idx] : row.pctValues[idx];
        return formatCell(v, display.decimalPlaces);
      });
      lines.push([row.label, ...vals].join('\t'));
    });
    return lines.join('\n');
  };

  const onCopyClick = async () => {
    await onCopy(buildCopyText());
    setCopyPulse(true);
    window.setTimeout(() => setCopyPulse(false), 520);
  };

  return (
    <section className="relative bg-white rounded-card shadow-card border border-border p-4">
      <div className="absolute right-2 top-2 z-30 flex items-center gap-1">
        <button className="h-7 w-7 rounded-md border border-border bg-[#fffdf8] text-secondary hover:bg-[#f1ece3]" onClick={onRemove} title="删除本卡片">
          ×
        </button>
      </div>
      <header className="mb-3 flex items-center justify-between gap-3 pr-16">
        <div>
          <div className="text-[17px] font-semibold leading-6 pr-6">{question.description}</div>
          <div className="text-base text-secondary">{table.base} (n={table.baseSize})</div>
        </div>

        <div className="flex items-center gap-2 text-base text-secondary">
          <button className={`muji-btn muji-btn-secondary px-3 py-1.5 ${copyPulse ? 'is-copied' : ''}`} onClick={onCopyClick}>
            {copyPulse ? '已复制' : '复制'}
          </button>
          <button
            className={`muji-btn px-3 py-1.5 ${display.sigHighlight ? 'bg-[#f6edc6] border border-[#dac88f] text-[#58492d]' : 'muji-btn-secondary'}`}
            onClick={() => onDisplayChange(table.tableId, { sigHighlight: !display.sigHighlight })}
            title="高显著开关"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 18h6m-5 3h4m-6-6c-1.5-1.2-3-3.2-3-5.5A7 7 0 0 1 12 2a7 7 0 0 1 7 7.5c0 2.3-1.5 4.3-3 5.5" fill="none" stroke="#6c6155" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <label className="flex items-center gap-1">
            数据
            <select
              className="muji-select px-2 py-1 text-base"
              value={display.dataType}
              onChange={(e) => onDisplayChange(table.tableId, { dataType: e.target.value as 'abs' | 'pct' })}
            >
              <option value="pct">%</option>
              <option value="abs">Abs</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            小数
            <select
              className="muji-select px-2 py-1 text-base"
              value={display.decimalPlaces}
              onChange={(e) => onDisplayChange(table.tableId, { decimalPlaces: Number(e.target.value) })}
            >
              {[0, 1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            顺序
            <select
              className="muji-select px-2 py-1 text-base"
              value={display.orderMode}
              onChange={(e) => onDisplayChange(table.tableId, { orderMode: e.target.value as 'default' | 'desc' | 'asc' })}
            >
              <option value="default">默认</option>
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </label>
        </div>
      </header>

      <div ref={wrapRef} className="overflow-x-auto overflow-y-hidden">
        <table className="w-max min-w-full border-collapse table-fixed" style={{ fontSize: `${dataFontSize}px` }}>
          <thead>
            <tr className="bg-[#ECE7DD] text-primary">
              <th className="border border-border p-0 text-left sticky left-0 bg-[#ECE7DD] z-20" rowSpan={2} style={{ width: labelWidth, minWidth: labelWidth }}>
                <div className="relative h-full px-3 py-2">
                  Label
                  <button
                    type="button"
                    aria-label="调整 Label 宽度"
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize bg-transparent"
                    onMouseDown={onLabelResizeStart}
                  />
                </div>
              </th>
              {groups.map((g) => (
                <th key={`g-${g.groupName}`} className="border border-border p-2 text-center" colSpan={g.columns.length}>
                  {g.groupName || 'TOTAL'}
                </th>
              ))}
            </tr>
            <tr className="bg-[#F7F4EE]">
              {cols.map((c) => (
                <th key={c.letter} className="border border-border p-2 text-center whitespace-nowrap" style={{ width: colWidth, minWidth: colWidth }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, rowIndex }) => {
              const rowMaxAbs = Math.max(
                1,
                ...cols.map((c) => {
                  const idx = getColumnDataIndex(table, c.letter);
                  return idx < 0 ? 0 : row.absValues[idx] ?? 0;
                })
              );
              return (
                <tr key={`${row.label}-${rowIndex}`} className={row.isTotal ? 'bg-[#FAFAFA] font-semibold' : ''}>
                  <td className="border border-border p-2 text-left sticky left-0 bg-[#F7F4EE] z-10" style={{ width: labelWidth, minWidth: labelWidth }}>
                    {row.label}
                  </td>
                  {cols.map((c) => {
                    const idx = getColumnDataIndex(table, c.letter);
                    const v = idx < 0 ? null : display.dataType === 'abs' ? row.absValues[idx] : row.pctValues[idx];
                    const hideBar = row.isTotal || isNoVisualRow(row.label);
                    const barPct =
                      hideBar || idx < 0 || v == null
                        ? 0
                        : display.dataType === 'pct'
                          ? clamp01To100(v)
                          : clamp01To100((v / rowMaxAbs) * 100);
                    const sigHit = highlightMap.get(rowIndex) === idx;
                    return (
                      <td
                        key={`${row.label}-${rowIndex}-${c.letter}`}
                        className={`border border-border p-0 text-center overflow-hidden ${sigHit ? 'bg-[#f4e8b1] font-semibold' : ''}`}
                        style={{ width: colWidth, minWidth: colWidth }}
                      >
                        <div className="relative h-full min-h-[36px] flex items-center justify-center overflow-hidden">
                          <div className="absolute left-0 top-0 h-full bg-[#EFE8DC]" style={{ width: `${barPct}%` }} />
                          <span className="relative z-10 px-2 break-words">{formatCell(v, display.decimalPlaces)}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
