import { useCallback, useState } from 'react';
import type { ParseResult } from '../types';
import type { ParseMapping } from '../utils/excelParser';
import { parseExcelFile } from '../utils/excelParser';

export function useExcelParser() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parse = useCallback(async (file: File, mapping?: ParseMapping) => {
    setParsing(true);
    setError(null);
    try {
      const parsed = await parseExcelFile(file, mapping);
      setResult(parsed);
      return parsed;
    } catch (e) {
      const message = e instanceof Error ? e.message : '解析失败';
      setError(message);
      throw e;
    } finally {
      setParsing(false);
    }
  }, []);

  return { result, parsing, error, parse };
}
