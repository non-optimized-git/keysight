export interface Column {
  letter: string;
  label: string;
  sheetColIndex: number;
}

export interface ColumnGroup {
  groupName: string;
  columns: Column[];
}

export interface DataRow {
  label: string;
  isTotal: boolean;
  absValues: Array<number | null>;
  pctValues: Array<number | null>;
  sigValues: string[];
}

export interface Table {
  tableId: string;
  headerId: string;
  headerName: string;
  base: string;
  baseSize: number;
  columnGroups: ColumnGroup[];
  rows: DataRow[];
  absStartRowIndex: number;
}

export interface Question {
  id: string;
  description: string;
  tables: Table[];
}

export interface ParseWarning {
  code: string;
  message: string;
  tableId?: string;
}

export interface ParseResult {
  projectKey: string;
  questions: Question[];
  warnings: ParseWarning[];
}

export interface ViewConfig {
  id: string;
  name: string;
  selectedHeaderIds: string[];
  selectedSubHeaderKeys: string[];
  selectedQuestionIds: string[];
  selectedRowKeys: string[];
  tableDisplayConfigs: Array<{
    tableId: string;
    dataType: 'abs' | 'pct';
    decimalPlaces: number;
    orderMode: 'default' | 'desc' | 'asc';
    sigHighlight: boolean;
  }>;
  selectedColumnGroups: Array<{
    headerId: string;
    groupName: string;
    hiddenColumnLetters: string[];
  }>;
  dataType: 'abs' | 'pct';
  decimalPlaces: number;
  sortConfig: { columnLetter: string; direction: 'asc' | 'desc' } | null;
}

export interface ProjectConfig {
  projectKey: string;
  projectName: string;
  lastUpdated: string;
  views: ViewConfig[];
  apiKey?: string;
}
