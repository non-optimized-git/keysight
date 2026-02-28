import { Button } from '../ui/Button';

interface Props {
  projectName: string;
  onUpload: () => void;
  onImport: () => void;
  onExport: () => void;
  onSave: () => void;
  onResetLocal: () => void;
}

export function TopNav({ projectName, onUpload, onImport, onExport, onSave, onResetLocal }: Props) {
  return (
    <header className="h-20 border-b border-border/70 muji-glass px-4 flex items-center justify-between backdrop-blur-md">
      <div className="font-semibold text-[20px] flex items-center gap-2 brand-title">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 4h18l-9 16L3 4z" fill="#F3D36B" stroke="#8A7552" strokeWidth="1.2" />
          <circle cx="9" cy="9" r="1.3" fill="#D5B24D" />
          <circle cx="14.5" cy="8" r="1.1" fill="#D5B24D" />
          <circle cx="12.5" cy="12.8" r="1.5" fill="#D5B24D" />
        </svg>
        <span>启思 Keysight</span>
      </div>
      <div className="flex gap-2 items-center">
        <Button onClick={onUpload}>上传文件</Button>
        <span className="text-xs text-secondary max-w-[260px] truncate" title={projectName || '未命名项目'}>
          {projectName || '未命名项目'}
        </span>
        <Button onClick={onImport}>导入配置</Button>
        <Button onClick={onExport}>导出配置</Button>
        <Button onClick={onResetLocal}>重置本地配置</Button>
        <Button variant="primary" onClick={onSave}>保存</Button>
      </div>
    </header>
  );
}
