import { useMemo, useState } from 'react';
import type { Question, ViewConfig } from '../../types';

interface Props {
  questions: Question[];
  activeView: ViewConfig;
  onChange: (updater: (view: ViewConfig) => ViewConfig) => void;
}

interface GroupItem {
  groupName: string;
  subLabels: string[];
}

function buildGroups(questions: Question[]): GroupItem[] {
  const map = new Map<string, Set<string>>();
  questions.forEach((q) => {
    q.tables.forEach((t) => {
      t.columnGroups.forEach((g) => {
        const name = g.groupName.trim();
        if (!name) return;
        if (!map.has(name)) map.set(name, new Set<string>());
        g.columns.forEach((c) => map.get(name)?.add(c.label));
      });
    });
  });
  return Array.from(map.entries()).map(([groupName, labels]) => ({
    groupName,
    subLabels: Array.from(labels),
  }));
}

export function HeaderBanner({ questions, activeView, onChange }: Props) {
  const groups = useMemo(() => buildGroups(questions), [questions]);
  const selectedGroups = new Set(activeView.selectedHeaderIds);
  const selectedSubs = new Set(activeView.selectedSubHeaderKeys);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="bg-white border-b border-border px-4 py-3">
      <div className="text-base text-secondary mb-2">Header 选择（一级 + 二级）</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {groups.map((g) => {
          const groupChecked = selectedGroups.has(g.groupName);
          const expanded = open[g.groupName] ?? false;
          return (
            <div key={g.groupName} className="muji-surface min-w-[240px]">
              <div className="px-3 py-2 flex items-center gap-2 text-base">
                <input
                  type="checkbox"
                  className="muji-check"
                  checked={groupChecked}
                  onChange={(e) => {
                    const keep = e.target.checked;
                    onChange((view) => {
                      const gSet = new Set(view.selectedHeaderIds);
                      const sSet = new Set(view.selectedSubHeaderKeys);
                      if (keep) {
                        gSet.add(g.groupName);
                        g.subLabels.forEach((l) => sSet.add(`${g.groupName}::${l}`));
                      } else {
                        gSet.delete(g.groupName);
                        g.subLabels.forEach((l) => sSet.delete(`${g.groupName}::${l}`));
                      }
                      return {
                        ...view,
                        selectedHeaderIds: Array.from(gSet),
                        selectedSubHeaderKeys: Array.from(sSet),
                      };
                    });
                  }}
                />
                <span className="whitespace-nowrap truncate flex-1">{g.groupName}</span>
                <span className="text-xs text-secondary border border-border rounded-full px-2 py-0.5">{g.subLabels.length}</span>
                <button
                  type="button"
                  className="h-7 w-7 rounded-md border border-border text-secondary"
                  onClick={() => setOpen((prev) => ({ ...prev, [g.groupName]: !expanded }))}
                  aria-label={expanded ? '收起' : '展开'}
                >
                  {expanded ? '▾' : '▸'}
                </button>
              </div>

              {expanded ? (
                <div className="px-3 pb-3 space-y-2 max-h-56 overflow-auto text-base border-t border-border/70">
                  {g.subLabels.map((label) => {
                    const key = `${g.groupName}::${label}`;
                    const checked = selectedSubs.has(key);
                    return (
                      <label key={key} className="flex items-start gap-2 pt-2">
                        <input
                          type="checkbox"
                          className="muji-check"
                          checked={checked}
                          onChange={(e) => {
                            const keep = e.target.checked;
                            onChange((view) => {
                              const gSet = new Set(view.selectedHeaderIds);
                              const sSet = new Set(view.selectedSubHeaderKeys);
                              gSet.add(g.groupName);
                              if (keep) sSet.add(key);
                              else sSet.delete(key);
                              return {
                                ...view,
                                selectedHeaderIds: Array.from(gSet),
                                selectedSubHeaderKeys: Array.from(sSet),
                              };
                            });
                          }}
                        />
                        <span className="leading-5">{label}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
