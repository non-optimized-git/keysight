import * as XLSX from 'xlsx';
import { colIndexToLetters, parseWorkbook } from './excelParser';

describe('colIndexToLetters', () => {
  test('supports 1~200 columns', () => {
    expect(colIndexToLetters(0)).toBe('A');
    expect(colIndexToLetters(25)).toBe('Z');
    expect(colIndexToLetters(26)).toBe('AA');
    expect(colIndexToLetters(27)).toBe('AB');
    expect(colIndexToLetters(199)).toBe('GR');
  });
});

describe('parseWorkbook', () => {
  test('parses when %Sig is missing', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['1A']]), 'Table of Contents');
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Table 1A'],
        ['(Q101) 题目'],
        ['Header: HEADER A 用户'],
        ['Base: B1. ALL'],
        ['', '城市'],
        ['', '成都市区(A)'],
        ['TOTAL', 100],
        ['Abs', 'Abs'],
        ['锦江区', 45],
      ]),
      'Abs'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Table 1A'],
        ['(Q101) 题目'],
        ['Header: HEADER A 用户'],
        ['Base: B1. ALL'],
        ['', '城市'],
        ['', '成都市区(A)'],
        ['TOTAL', 53.5],
        ['%', '%'],
        ['锦江区', 24.1],
      ]),
      '%'
    );

    const parsed = parseWorkbook(wb, {
      name: 'x.xlsx',
      size: 1,
      lastModified: 1,
    });
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0].tables[0].rows[1].sigValues[0]).toBe('');
  });

  test('parses a minimal table', () => {
    const toc = XLSX.utils.aoa_to_sheet([
      ['1A', '', '', '(Q101) 题目', 'Base: B1. ALL', 'Header: HEADER A 用户', 187],
    ]);

    const abs = XLSX.utils.aoa_to_sheet([
      ['Table 1A'],
      ['(Q101) 题目'],
      ['Header: HEADER A 用户'],
      ['Base: B1. ALL'],
      ['', '城市', '城市'],
      ['', '成都市区(A)', '成都郊区(B)'],
      ['TOTAL', 100, 87],
      ['Abs', 'Abs', 'Abs'],
      ['锦江区', 45, 23],
    ]);

    const pct = XLSX.utils.aoa_to_sheet([
      ['Table 1A'],
      ['(Q101) 题目'],
      ['Header: HEADER A 用户'],
      ['Base: B1. ALL'],
      ['', '城市', '城市'],
      ['', '成都市区(A)', '成都郊区(B)'],
      ['TOTAL', 53.5, 46.5],
      ['%', '%', '%'],
      ['锦江区', 24.1, 12.3],
    ]);

    const sig = XLSX.utils.aoa_to_sheet([
      ['Table 1A'],
      ['(Q101) 题目'],
      ['Header: HEADER A 用户'],
      ['Base: B1. ALL'],
      ['', '城市', '城市'],
      ['', '成都市区(A)', '成都郊区(B)'],
      ['TOTAL', '', ''],
      ['%Sig', '', ''],
      ['锦江区', 'B', 'A'],
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, toc, 'Table of Contents');
    XLSX.utils.book_append_sheet(wb, abs, 'Abs');
    XLSX.utils.book_append_sheet(wb, pct, '%');
    XLSX.utils.book_append_sheet(wb, sig, '%Sig');

    const parsed = parseWorkbook(wb, {
      name: 'x.xlsx',
      size: 123,
      lastModified: 1,
    });

    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0].id).toBe('Q101');
    expect(parsed.questions[0].tables[0].rows[1].sigValues[0]).toBe('B');
  });

  test('extracts sig letters from mixed %Sig cell text', () => {
    const toc = XLSX.utils.aoa_to_sheet([
      ['1A', '', '', '(Q101) 题目', 'Base: B1. ALL', 'Header: HEADER A 用户', 187],
    ]);
    const abs = XLSX.utils.aoa_to_sheet([
      ['Table 1A'],
      ['(Q101) 题目'],
      ['Header: HEADER A 用户'],
      ['Base: B1. ALL'],
      ['', '城市'],
      ['', '成都市区(A)'],
      ['TOTAL', 100],
      ['', 'Abs'],
      ['锦江区', 45],
    ]);
    const pct = XLSX.utils.aoa_to_sheet([
      ['Table 1A'],
      ['(Q101) 题目'],
      ['Header: HEADER A 用户'],
      ['Base: B1. ALL'],
      ['', '城市'],
      ['', '成都市区(A)'],
      ['TOTAL', 53.5],
      ['', '%'],
      ['锦江区', 24.1],
    ]);
    const sig = XLSX.utils.aoa_to_sheet([
      ['Table 1A'],
      ['(Q101) 题目'],
      ['Header: HEADER A 用户'],
      ['Base: B1. ALL'],
      ['', '城市'],
      ['', '成都市区(A)'],
      ['TOTAL', ''],
      ['', '%Sig'],
      ['锦江区', '15  BC'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, toc, 'Table of Contents');
    XLSX.utils.book_append_sheet(wb, abs, 'Abs');
    XLSX.utils.book_append_sheet(wb, pct, '%');
    XLSX.utils.book_append_sheet(wb, sig, '%Sig');

    const parsed = parseWorkbook(wb, { size: 1, lastModified: 1 });
    expect(parsed.questions[0].tables[0].rows[1].sigValues[0]).toBe('BC');
  });
});
