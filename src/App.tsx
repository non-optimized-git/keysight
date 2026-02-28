import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { ViewConfig } from './types';
import { TopNav } from './components/layout/TopNav';
import { Sidebar } from './components/layout/Sidebar';
import { ViewTabs } from './components/views/ViewTabs';
import { HeaderBanner } from './components/views/HeaderBanner';
import { DataTable } from './components/views/DataTable';
import { UploadMappingDialog } from './components/layout/UploadMappingDialog';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { TextPromptDialog } from './components/ui/TextPromptDialog';
import { useExcelParser } from './hooks/useExcelParser';
import { useProjectConfig } from './hooks/useProjectConfig';
import { useRuntimeErrors } from './hooks/useRuntimeErrors';
import { exportProject, importProject } from './utils/configStorage';
import { filterOutSummaryQuestions } from './utils/questionFilter';
import {
  defaultParseMapping,
  inspectExcelForMapping,
  type MappingPreview,
  type ParseMapping,
} from './utils/excelParser';

function createView(index: number): ViewConfig {
  return {
    id: crypto.randomUUID(),
    name: `视图 ${index}`,
    selectedHeaderIds: [],
    selectedSubHeaderKeys: [],
    selectedQuestionIds: [],
    selectedRowKeys: [],
    tableDisplayConfigs: [],
    selectedColumnGroups: [],
    dataType: 'pct',
    decimalPlaces: 0,
    sortConfig: null,
  };
}

export default function App() {
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const { result, parsing, error, parse } = useExcelParser();
  const { current, upsertProject, createProjectIfMissing, updateCurrentView, resetAllProjects } = useProjectConfig();
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingDraft, setMappingDraft] = useState<ParseMapping>(defaultParseMapping());
  const [mappingPreview, setMappingPreview] = useState<MappingPreview | null>(null);
  const [diagnostic, setDiagnostic] = useState<{ mapping: ParseMapping; warnings: string[] } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [cardDataFontSize, setCardDataFontSize] = useState(16);
  const [deleteViewId, setDeleteViewId] = useState<string | null>(null);
  const [renameViewId, setRenameViewId] = useState<string | null>(null);
  const runtime = useRuntimeErrors();

  const questions = useMemo(() => filterOutSummaryQuestions(result?.questions ?? []), [result]);

  const onUpload = async (file: File, mapping?: ParseMapping) => {
    const parsed = await parse(file, mapping);
    const visibleQuestions = filterOutSummaryQuestions(parsed.questions);
    setDiagnostic({ mapping: mapping ?? defaultParseMapping(), warnings: parsed.warnings.map((w) => `${w.code}: ${w.message}`) });
    const project = createProjectIfMissing(parsed.projectKey, file.name.replace(/\.xlsx$/i, ''), visibleQuestions);
    if (!project.views.length) return;
    if (visibleQuestions.length === 0) {
      showToast('解析完成，但未识别到可展示题目，请检查映射');
    }
    setActiveViewId(project.views[0].id);
  };

  const activeView = current?.views.find((v) => v.id === activeViewId) ?? current?.views[0] ?? null;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2000);
  };

  const startSidebarResize = (ev: ReactMouseEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const startX = ev.clientX;
    const start = sidebarWidth;
    const onMove = (e: MouseEvent) => {
      setSidebarWidth(Math.max(280, Math.min(680, start + (e.clientX - startX))));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="h-screen flex flex-col">
      <TopNav
        projectName={current?.projectName ?? ''}
        onUpload={() => fileRef.current?.click()}
        onImport={() => importRef.current?.click()}
        onExport={() => {
          if (!current) return;
          exportProject(current);
          showToast('配置已导出');
        }}
        onSave={() => {
          if (!current) return;
          upsertProject(current);
          showToast('已保存');
        }}
        onResetLocal={() => {
          resetAllProjects();
          setActiveViewId(null);
          showToast('本地配置已重置');
        }}
      />

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setPendingUploadFile(f);
          const m = defaultParseMapping();
          setMappingDraft(m);
          void inspectExcelForMapping(f, m)
            .then((preview) => {
              setMappingPreview(preview);
            })
            .catch(() => setMappingPreview(null));
          setMappingOpen(true);
        }}
      />

      <input
        ref={importRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const cfg = await importProject(f);
            upsertProject(cfg);
            setActiveViewId(cfg.views[0]?.id ?? null);
            showToast('配置已导入');
          } catch {
            showToast('配置导入失败');
          }
        }}
      />

      <main className="flex-1 flex min-h-0">
        {activeView ? (
          <>
            <Sidebar
              questions={questions}
              activeView={activeView}
              onChange={(updater) => updateCurrentView(activeView.id, updater)}
              width={sidebarWidth}
            />
            <div className="w-2 cursor-col-resize bg-[#e7dfd2] hover:bg-[#d6c8b4] shrink-0" onMouseDown={startSidebarResize} />
          </>
        ) : null}

        <section className="flex-1 min-w-0 flex flex-col bg-app">
          {activeView ? (
            <ViewTabs
              views={current?.views ?? []}
              activeId={activeView.id}
              onChange={setActiveViewId}
              onAdd={() => {
                if (!current) return;
                const next = createView((current.views?.length ?? 0) + 1);
                upsertProject({ ...current, views: [...current.views, next] });
                setActiveViewId(next.id);
              }}
              onRename={(id) => {
                if (!current) return;
                setRenameViewId(id);
              }}
              onDelete={(id) => {
                if (!current || current.views.length <= 1) return;
                setDeleteViewId(id);
              }}
            />
          ) : null}

          {activeView ? (
            <HeaderBanner
              questions={questions}
              activeView={activeView}
              onChange={(updater) => updateCurrentView(activeView.id, updater)}
            />
          ) : null}

          {parsing ? <div className="p-4">正在解析表格...</div> : null}


          {result && questions.length === 0 ? (
            <div className="m-4 p-4 bg-white border border-red-200 rounded text-xs">
              <div className="font-semibold text-red-600 mb-2">解析为空：未识别到行/列</div>
              <div className="mb-2">请把以下诊断信息复制给我：</div>
              <pre className="whitespace-pre-wrap bg-[#fafafa] border border-border rounded p-2">{JSON.stringify(diagnostic, null, 2)}</pre>
              <button
                className="mt-2 border border-border rounded px-2 py-1"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2))}
              >
                复制诊断信息
              </button>
            </div>
          ) : null}
          {error ? <div className="p-4 text-red-500">{error}</div> : null}
          {activeView ? (
            <DataTable
              questions={questions}
              activeView={activeView}
              dataFontSize={cardDataFontSize}
              onDataFontSizeChange={setCardDataFontSize}
              onRemoveQuestion={(questionId) =>
                updateCurrentView(activeView.id, (v) => {
                  const qSet = new Set(v.selectedQuestionIds);
                  qSet.delete(questionId);
                  const nextRows = (v.selectedRowKeys ?? []).filter((k) => !k.startsWith(`${questionId}::`));
                  return { ...v, selectedQuestionIds: Array.from(qSet), selectedRowKeys: nextRows };
                })
              }
              onDisplayChange={(tableId, patch) =>
                updateCurrentView(activeView.id, (v) => {
                  const list = [...v.tableDisplayConfigs];
                  const idx = list.findIndex((x) => x.tableId === tableId);
                  const base =
                    idx >= 0
                      ? list[idx]
                      : ({ tableId, dataType: 'pct', decimalPlaces: 0, orderMode: 'default', sigHighlight: false } as const);
                  const next = { ...base, ...patch };
                  if (idx >= 0) list[idx] = next;
                  else list.push(next);
                  return { ...v, tableDisplayConfigs: list };
                })
              }
            />
          ) : (
            <div className="p-4">请上传文件</div>
          )}
        </section>
      </main>

      <UploadMappingDialog
        open={mappingOpen}
        initial={mappingDraft}
        preview={mappingPreview}
        onCancel={() => {
          setMappingOpen(false);
          setPendingUploadFile(null);
          setMappingPreview(null);
        }}
        onConfirm={async (m) => {
          if (!pendingUploadFile) return;
          setMappingOpen(false);
          setMappingDraft(m);
          try {
            await onUpload(pendingUploadFile, m);
          } catch {
            showToast('解析失败，请调整映射后重试');
          }
          setPendingUploadFile(null);
          setMappingPreview(null);
        }}
      />
      {toast ? <div className="fixed top-16 right-4 bg-black text-white text-xs rounded px-3 py-2">{toast}</div> : null}

      <ConfirmDialog
        open={!!deleteViewId}
        title="删除视图"
        message="删除后不可恢复，确认继续吗？"
        confirmText="删除"
        onCancel={() => setDeleteViewId(null)}
        onConfirm={() => {
          if (!current || !deleteViewId || current.views.length <= 1) return;
          const nextViews = current.views.filter((v) => v.id !== deleteViewId);
          upsertProject({ ...current, views: nextViews });
          if (activeViewId === deleteViewId) setActiveViewId(nextViews[0]?.id ?? null);
          setDeleteViewId(null);
        }}
      />

      <TextPromptDialog
        open={!!renameViewId}
        title="重命名视图"
        initialValue={current?.views.find((v) => v.id === renameViewId)?.name ?? ''}
        confirmText="保存"
        onCancel={() => setRenameViewId(null)}
        onConfirm={(name) => {
          if (!current || !renameViewId || !name) return;
          upsertProject({
            ...current,
            views: current.views.map((v) => (v.id === renameViewId ? { ...v, name } : v)),
          });
          setRenameViewId(null);
        }}
      />

      {runtime.errors.length > 0 ? (
        <>
          <button
            className="fixed right-4 bottom-4 z-50 bg-red-600 text-white text-xs rounded px-3 py-2"
            onClick={() => runtime.setOpen(true)}
          >
            错误日志 ({runtime.errors.length})
          </button>
          {runtime.open ? (
            <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
              <div className="muji-modal border border-border rounded-xl w-full max-w-[900px] max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <div className="font-medium text-sm">运行时错误日志</div>
                  <div className="flex gap-2">
                    <button className="text-xs border border-border rounded px-2 py-1" onClick={() => void runtime.copy()}>
                      复制
                    </button>
                    <button className="text-xs border border-border rounded px-2 py-1" onClick={() => runtime.setOpen(false)}>
                      关闭
                    </button>
                  </div>
                </div>
                <div className="p-3 overflow-auto text-xs space-y-3">
                  {runtime.errors.map((e, i) => (
                    <pre key={`${e.time}-${i}`} className="whitespace-pre-wrap border border-border rounded p-2 bg-[#fafafa]">
                      [{e.time}] {e.source}
                      {'\n'}
                      {e.message}
                      {e.stack ? `\n${e.stack}` : ''}
                    </pre>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
