import type { ViewConfig } from '../../types';

interface Props {
  views: ViewConfig[];
  activeId: string;
  onChange: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ViewTabs({ views, activeId, onChange, onAdd, onRename, onDelete }: Props) {
  return (
    <div className="bg-white border-b border-border px-4 flex gap-3 h-14 items-end">
      {views.map((v) => (
        <div key={v.id} className="flex items-center gap-1 pb-3">
          <button
            onClick={() => onChange(v.id)}
            onDoubleClick={() => onRename(v.id)}
            className={`text-base px-3 py-1.5 rounded ${activeId === v.id ? 'bg-accentSoft text-primary' : 'text-secondary'}`}
          >
            {v.name}
          </button>
          {views.length > 1 ? (
            <button className="text-base text-secondary" onClick={() => onDelete(v.id)}>×</button>
          ) : null}
        </div>
      ))}
      <button className="pb-3 text-base text-secondary" onClick={onAdd}>+ 新建视图</button>
    </div>
  );
}
