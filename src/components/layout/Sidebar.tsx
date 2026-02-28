import { useMemo, useState } from 'react';
import type { Question, ViewConfig } from '../../types';

interface Props {
  questions: Question[];
  activeView: ViewConfig;
  onChange: (updater: (view: ViewConfig) => ViewConfig) => void;
  width: number;
}

function getSecondLevelRows(q: Question): Array<{ label: string; index: number }> {
  const rows = q.tables[0]?.rows ?? [];
  return rows.map((r, index) => ({ label: r.label, index }));
}

export function Sidebar({ questions, activeView, onChange, width }: Props) {
  const [kw, setKw] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const selected = new Set(activeView.selectedQuestionIds);
  const selectedRows = new Set(activeView.selectedRowKeys ?? []);

  const list = useMemo(() => {
    const k = kw.trim().toLowerCase();
    if (!k) return questions;
    return questions.filter((q) => q.description.toLowerCase().includes(k) || q.id.toLowerCase().includes(k));
  }, [questions, kw]);

  return (
    <aside className="bg-white border-r border-border p-4 overflow-auto space-y-4 shrink-0" style={{ width }}>
      <section>
        <div className="text-base font-medium mb-2 flex items-center justify-between">
          <span>题目（行）</span>
          <button
            className="muji-btn muji-btn-secondary text-sm px-3 py-1.5"
            onClick={() =>
              onChange((view) => ({
                ...view,
                selectedQuestionIds:
                  view.selectedQuestionIds.length === questions.length ? [] : questions.map((item) => item.id),
              }))
            }
          >
            {activeView.selectedQuestionIds.length === questions.length ? '取消全选' : '全选'}
          </button>
        </div>
        <input
          className="muji-input w-full px-3 py-2 text-sm mb-2"
          placeholder="搜索题目..."
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />

        <div className="space-y-2 text-base pr-1">
          {list.map((q) => {
            const children = getSecondLevelRows(q);
            const expanded = openItems[q.id] ?? false;
            const childKeys = children.map((row) => `${q.id}::${row.index}`);
            const checkedChildCount = childKeys.filter((k) => selectedRows.has(k)).length;
            const hasRowSelection = checkedChildCount > 0;
            return (
              <div key={q.id} className="muji-surface p-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-7 w-7 rounded-md border border-border text-secondary"
                    onClick={() => setOpenItems((prev) => ({ ...prev, [q.id]: !expanded }))}
                    aria-label={expanded ? '收起' : '展开'}
                  >
                    {expanded ? '▾' : '▸'}
                  </button>
                  <label className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      className="muji-check"
                      checked={selected.has(q.id) || (childKeys.length > 0 && checkedChildCount === childKeys.length)}
                      onChange={(e) => {
                        const keep = e.target.checked;
                        onChange((view) => {
                          const next = new Set(view.selectedQuestionIds);
                          const nextRows = new Set(view.selectedRowKeys ?? []);
                          if (keep) next.add(q.id);
                          else {
                            next.delete(q.id);
                            childKeys.forEach((k) => nextRows.delete(k));
                          }
                          if (keep && !hasRowSelection) childKeys.forEach((k) => nextRows.add(k));
                          return { ...view, selectedQuestionIds: Array.from(next), selectedRowKeys: Array.from(nextRows) };
                        });
                      }}
                    />
                    <span className="truncate">{q.description}</span>
                  </label>
                  <span className="text-xs text-secondary border border-border rounded-full px-2 py-0.5">{children.length}</span>
                </div>
                {expanded ? (
                  <div className="mt-2 ml-9 space-y-1">
                    {children.map((row) => (
                      <label
                        key={`${q.id}-${row.index}`}
                        className="flex items-center gap-2 text-sm text-secondary leading-6 border-b border-border/40 last:border-b-0 pb-1"
                      >
                        <input
                          type="checkbox"
                          className="muji-check"
                          checked={selectedRows.has(`${q.id}::${row.index}`)}
                          onChange={(e) => {
                            const keep = e.target.checked;
                            onChange((view) => {
                              const nextRows = new Set(view.selectedRowKeys ?? []);
                              const nextQuestions = new Set(view.selectedQuestionIds);
                              const key = `${q.id}::${row.index}`;
                              if (keep) {
                                nextRows.add(key);
                                nextQuestions.add(q.id);
                              } else {
                                nextRows.delete(key);
                                const stillHas = children.some((child) => nextRows.has(`${q.id}::${child.index}`));
                                if (!stillHas) nextQuestions.delete(q.id);
                              }
                              return { ...view, selectedRowKeys: Array.from(nextRows), selectedQuestionIds: Array.from(nextQuestions) };
                            });
                          }}
                        />
                        <span>{row.label}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
