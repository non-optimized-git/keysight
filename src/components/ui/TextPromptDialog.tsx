import { useEffect, useState } from 'react';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function TextPromptDialog({
  open,
  title,
  initialValue = '',
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/35 grid place-items-center p-4">
      <div className="muji-modal w-full max-w-[440px] rounded-xl border border-border p-4">
        <div className="text-lg font-semibold mb-3">{title}</div>
        <input className="muji-input w-full px-3 py-2 text-base mb-4" value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>{cancelText}</Button>
          <Button variant="primary" onClick={() => onConfirm(value.trim())} disabled={!value.trim()}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
