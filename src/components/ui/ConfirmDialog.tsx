import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmText = '确认', cancelText = '取消', onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/35 grid place-items-center p-4">
      <div className="muji-modal w-full max-w-[420px] rounded-xl border border-border p-4">
        <div className="text-lg font-semibold mb-2">{title}</div>
        <div className="text-sm text-secondary mb-4">{message}</div>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>{cancelText}</Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
