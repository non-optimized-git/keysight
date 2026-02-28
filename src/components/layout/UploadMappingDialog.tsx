import { useEffect, useMemo, useState } from 'react';
import type { MappingPreview, ParseMapping } from '../../utils/excelParser';
import { Button } from '../ui/Button';

type PickTarget =
  | 'questionRowOffset'
  | 'groupRowOffset'
  | 'columnRowOffset'
  | 'dataStartRowOffset'
  | 'dataStartColIndex'
  | null;

interface Props {
  open: boolean;
  initial: ParseMapping;
  preview: MappingPreview | null;
  onCancel: () => void;
  onConfirm: (mapping: ParseMapping) => void;
}

export function UploadMappingDialog({ open, initial, preview, onCancel, onConfirm }: Props) {
  const [form, setForm] = useState<ParseMapping>(initial);
  const [pick, setPick] = useState<PickTarget>(null);
  const [pickedCell, setPickedCell] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...initial, rowLabelColIndex: 0 });
      setPick(null);
      setPickedCell(null);
    }
  }, [open, initial]);

  const hint = useMemo(() => {
    if (!pick) return '点击下方“选择”后，直接点预览单元格即可映射。';
    return `当前选择目标: ${pick}`;
  }, [pick]);

  if (!open) return null;

  const tableStart = preview?.tableStartRow ?? 0;

  const mapButtons: Array<{ key: PickTarget; label: string; desc: string }> = [
    { key: 'questionRowOffset', label: '选择题目所在单元行', desc: '例如: Q4a_... by BANNER1' },
    { key: 'groupRowOffset', label: '选择一级表头所在单元格', desc: '例如: H1_城市级别' },
    { key: 'columnRowOffset', label: '选择二级表头所在单元格', desc: '例如: Tier 1一线城市' },
    { key: 'dataStartColIndex', label: '选择有数据的第一列', desc: '第一列数值列' },
  ];

  const complete =
    form.questionRowOffset >= 0 &&
    form.groupRowOffset >= 0 &&
    form.columnRowOffset >= 0 &&
    form.dataStartColIndex >= 0;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 grid place-items-center p-4">
      <div className="muji-modal w-full max-w-[1120px] rounded-xl border border-border p-4">
        <div className="text-lg font-semibold mb-1">上传前结构映射（简化）</div>
        <div className="text-sm text-secondary mb-3">只需要映射 4 个关键点。已预览 {preview?.sheetName ?? 'Abs'}，参考表起始行 = {tableStart + 1}</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-base mb-3">
          {mapButtons.map((it) => (
            <div key={it.key} className="border border-border rounded p-2 flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{it.label}: {String(form[it.key as keyof ParseMapping])}</div>
                <div className="text-sm text-secondary">{it.desc}</div>
              </div>
              <Button className="!px-2 !py-1" onClick={() => setPick(it.key)}>
                {pick === it.key ? '点击单元格中…' : '选择'}
              </Button>
            </div>
          ))}
        </div>

        <div className="mb-3 rounded border border-border bg-app px-3 py-2 text-sm text-secondary space-y-1">
          <div><strong className="text-primary">映射解释</strong></div>
          <div>题目行: 题目文本所在行，例如 `Q4a_您的出生年份是？ by BANNER1`。</div>
          <div>一级列头: 蓝色大类标题，例如 `H1_城市级别`。</div>
          <div>二级列头: 具体列名行，例如 `Tier 1一线城市`。</div>
          <div>数据起始列: 第一列数值列的位置。这个是“最后一个映射”，用于告诉系统从哪一列开始读数值。</div>
          <div>行标签列固定为第 0 列，无需映射。</div>
        </div>

        <div className="text-sm text-secondary mb-2">{hint}</div>

        <div className="border border-border rounded overflow-auto max-h-[430px]">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[#F5F5F7] sticky top-0">
              <tr>
                <th className="border border-border p-1 text-center">Row</th>
                {(preview?.cells?.[0] ?? []).map((_, c) => (
                  <th key={c} className="border border-border p-1 text-center">C{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(preview?.cells ?? []).map((row, i) => {
                const absRow = (preview?.previewStartRow ?? 0) + i;
                return (
                  <tr key={i}>
                    <td className="border border-border p-1 text-center">{absRow + 1}</td>
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={`border border-border p-1 whitespace-nowrap cursor-pointer ${pick ? 'hover:bg-accentSoft' : ''}`}
                        onClick={() => {
                          if (!pick) return;
                          setPickedCell(`${i}-${c}`);
                          window.setTimeout(() => setPickedCell(null), 420);
                          const offset = absRow - tableStart;
                          if (pick === 'questionRowOffset') {
                            setForm((f) => ({ ...f, questionRowOffset: offset, headerRowOffset: offset, baseRowOffset: offset + 2 }));
                            return;
                          }
                          if (pick === 'groupRowOffset') {
                            setForm((f) => ({ ...f, groupRowOffset: offset }));
                            return;
                          }
                          if (pick === 'columnRowOffset') {
                            setForm((f) => ({ ...f, columnRowOffset: offset, dataStartRowOffset: offset + 1 }));
                            return;
                          }
                          if (pick === 'dataStartColIndex') {
                            setForm((f) => ({ ...f, dataStartColIndex: c }));
                          }
                        }}
                        title={pick ? `点击设置 ${pick}` : ''}
                      >
                        <span className={pickedCell === `${i}-${c}` ? 'map-picked' : ''}>{cell}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onCancel}>取消</Button>
          <Button variant="primary" onClick={() => onConfirm({ ...form, rowLabelColIndex: 0 })} disabled={!complete}>按此映射解析</Button>
        </div>
      </div>
    </div>
  );
}
