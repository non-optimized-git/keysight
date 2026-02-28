import { useState } from 'react';
import type { Question, ViewConfig } from '../../types';
import { tableHasSelectedGroup } from '../../utils/dataFilter';
import { DataTableCard } from './DataTableCard';

interface Props {
  questions: Question[];
  activeView: ViewConfig;
  onDisplayChange: (
    tableId: string,
    patch: { dataType?: 'abs' | 'pct'; decimalPlaces?: number; orderMode?: 'default' | 'desc' | 'asc'; sigHighlight?: boolean }
  ) => void;
  dataFontSize: number;
  onDataFontSizeChange: (next: number) => void;
  onRemoveQuestion: (questionId: string) => void;
}

export function DataTable({ questions, activeView, onDisplayChange, dataFontSize, onDataFontSizeChange, onRemoveQuestion }: Props) {
  const [allCopied, setAllCopied] = useState(false);
  if (!questions.length) {
    return <div className="h-full grid place-items-center text-secondary">请上传并解析 Excel 文件</div>;
  }

  const selectedGroups = new Set(activeView.selectedHeaderIds ?? []);
  const selectedQuestions = new Set(activeView.selectedQuestionIds ?? []);

  if (selectedGroups.size === 0 || selectedQuestions.size === 0) {
    return <div className="h-full grid place-items-center text-secondary">请先选择 Header 和题目</div>;
  }

  const cards = questions
    .filter((q) => selectedQuestions.has(q.id))
    .flatMap((q) =>
      q.tables
        .filter((t) => tableHasSelectedGroup(t, activeView))
        .map((t) => (
          <DataTableCard
            key={`${q.id}-${t.tableId}`}
            question={q}
            table={t}
            view={activeView}
            onDisplayChange={onDisplayChange}
            dataFontSize={dataFontSize}
            onRemove={() => onRemoveQuestion(q.id)}
            onCopy={async (text) => {
              await navigator.clipboard.writeText(text);
            }}
          />
        ))
    );

  if (!cards.length) {
    return <div className="h-full grid place-items-center text-secondary">当前条件下没有可展示数据</div>;
  }

  return (
    <div className="p-4 space-y-4 overflow-auto">
      <div className="flex justify-end">
        <div className="flex items-center gap-2 mr-2">
          <button className="muji-btn muji-btn-secondary text-base px-3 py-1.5" onClick={() => onDataFontSizeChange(Math.max(8, dataFontSize - 1))}>
            A-
          </button>
          <button className="muji-btn muji-btn-secondary text-base px-3 py-1.5" onClick={() => onDataFontSizeChange(Math.min(30, dataFontSize + 1))}>
            A+
          </button>
        </div>
        <button
          className={`muji-btn muji-btn-secondary text-base px-3 py-1.5 ${allCopied ? 'is-copied' : ''}`}
          onClick={async () => {
            const all = Array.from(document.querySelectorAll('section'))
              .map((el) => el.textContent ?? '')
              .join('\n\n');
            await navigator.clipboard.writeText(all);
            setAllCopied(true);
            window.setTimeout(() => setAllCopied(false), 520);
          }}
        >
          {allCopied ? '复制成功' : '复制当前页面'}
        </button>
      </div>
      {cards}
    </div>
  );
}
