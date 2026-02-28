import { parseWorkbook } from '../utils/excelParser';
import * as XLSX from 'xlsx';

self.onmessage = (event: MessageEvent<{ arrayBuffer: ArrayBuffer; name: string; size: number; lastModified: number }>) => {
  const { arrayBuffer, name, size, lastModified } = event.data;
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const result = parseWorkbook(workbook, { name, size, lastModified });
  self.postMessage(result);
};
