import type { DataRow, Table, ViewConfig } from '../types';

export function getFlatColumns(table: Table) {
  return table.columnGroups.flatMap((g) => g.columns);
}

export function getColumnDataIndex(table: Table, letter: string): number {
  return getFlatColumns(table).findIndex((c) => c.letter === letter);
}

export function tableHasSelectedGroup(table: Table, view: ViewConfig): boolean {
  const selected = new Set(view.selectedHeaderIds);
  if (selected.size === 0) return false;
  return table.columnGroups.some((g) => selected.has(g.groupName));
}

export function getTableDisplayConfig(view: ViewConfig, tableId: string) {
  const cfg = view.tableDisplayConfigs.find((c) => c.tableId === tableId);
  return {
    dataType: cfg?.dataType ?? 'pct',
    decimalPlaces: cfg?.decimalPlaces ?? 0,
    orderMode: cfg?.orderMode ?? 'default',
    sigHighlight: cfg?.sigHighlight ?? false,
  } as const;
}

function isColumnSelected(view: ViewConfig, groupName: string, label: string): boolean {
  const key = `${groupName}::${label}`;
  const selectedSubs = new Set(view.selectedSubHeaderKeys ?? []);
  const hasAnyForGroup = Array.from(selectedSubs).some((k) => k.startsWith(`${groupName}::`));
  if (!hasAnyForGroup) return true;
  return selectedSubs.has(key);
}

function getVisibleLetters(view: ViewConfig, table: Table): Set<string> {
  const selectedGroups = new Set(view.selectedHeaderIds);
  const all = table.columnGroups
    .filter((g) => g.groupName === '' || selectedGroups.has(g.groupName))
    .flatMap((g) =>
      g.columns
        .filter((c) => (g.groupName ? isColumnSelected(view, g.groupName, c.label) : true))
        .map((c) => c.letter)
    );
  return new Set(all);
}

export function getFilteredRows(table: Table, view: ViewConfig): DataRow[] {
  const mode = getTableDisplayConfig(view, table.tableId).orderMode;
  if (mode === 'default') return table.rows;
  const totals = table.rows.filter((r) => r.isTotal);
  const data = table.rows.filter((r) => !r.isTotal).slice();
  if (mode === 'desc') data.reverse();
  return [...totals, ...data];
}

export function getVisibleColumns(table: Table, view: ViewConfig) {
  const selectedGroups = new Set(view.selectedHeaderIds);
  const visibleLetters = getVisibleLetters(view, table);

  return table.columnGroups
    .filter((g) => g.groupName === '' || selectedGroups.has(g.groupName))
    .map((group) => ({
      groupName: group.groupName,
      columns: group.columns
        .filter((c) => visibleLetters.has(c.letter))
        .filter((c) => (group.groupName ? isColumnSelected(view, group.groupName, c.label) : true)),
    }))
    .filter((g) => g.columns.length > 0);
}

export function formatCell(value: number | null, decimals: number): string {
  if (value == null) return '';
  return value.toFixed(decimals);
}
