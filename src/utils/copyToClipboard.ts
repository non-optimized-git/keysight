import type { Table, ViewConfig } from '../types';
import { formatCell, getColumnDataIndex, getFilteredRows, getVisibleColumns } from './dataFilter';

export async function copyTable(table: Table, view: ViewConfig): Promise<void> {
  const columns = getVisibleColumns(table, view).flatMap((g) => g.columns);
  const rows = getFilteredRows(table, view);

  const header = ['Label', ...columns.map((c) => c.label)].join('\t');
  const body = rows.map((row) => {
    const values = columns.map((c) => {
      const idx = getColumnDataIndex(table, c.letter);
      const raw = idx < 0 ? null : view.dataType === 'abs' ? row.absValues[idx] : row.pctValues[idx];
      return formatCell(raw, view.decimalPlaces);
    });
    return [row.label, ...values].join('\t');
  });

  await navigator.clipboard.writeText([header, ...body].join('\n'));
}
