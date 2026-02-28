import { useMemo, useState } from 'react';
import type { ProjectConfig, Question, ViewConfig } from '../types';
import {
  deleteProject,
  loadProjects,
  resetProjectsStorage,
  saveProject,
  saveProjects,
} from '../utils/configStorage';

function createDefaultView(questions: Question[] = []): ViewConfig {
  const groupMap = new Map<string, { headerId: string; groupName: string; hiddenColumnLetters: string[] }>();
  questions.forEach((q) => {
    q.tables.forEach((t) => {
      t.columnGroups.forEach((g) => {
        const key = `${t.headerId}::${g.groupName}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, { headerId: t.headerId, groupName: g.groupName, hiddenColumnLetters: [] });
        }
      });
    });
  });

  return {
    id: crypto.randomUUID(),
    name: '视图 1',
    selectedHeaderIds: [],
    selectedSubHeaderKeys: [],
    selectedQuestionIds: [],
    selectedRowKeys: [],
    tableDisplayConfigs: [],
    selectedColumnGroups: Array.from(groupMap.values()),
    dataType: 'pct',
    decimalPlaces: 0,
    sortConfig: null,
  };
}

function normalizeView(input: unknown, idx: number): ViewConfig {
  const v = (input && typeof input === 'object' ? input : {}) as Partial<ViewConfig> & {
    id?: unknown;
    name?: unknown;
  };

  const tableDisplayConfigs: ViewConfig['tableDisplayConfigs'] = Array.isArray(v.tableDisplayConfigs)
    ? v.tableDisplayConfigs
        .filter((x): x is NonNullable<typeof x> => !!x && typeof x === 'object')
        .map((x: any) => ({
          tableId: typeof x.tableId === 'string' ? x.tableId : '',
          dataType: x.dataType === 'abs' || x.dataType === 'pct' ? x.dataType : 'pct',
          decimalPlaces: typeof x.decimalPlaces === 'number' ? x.decimalPlaces : 0,
          orderMode: (x.orderMode === 'desc' || x.orderMode === 'asc' ? x.orderMode : 'default') as 'default' | 'desc' | 'asc',
          sigHighlight: !!x.sigHighlight,
        }))
        .filter((x) => x.tableId)
    : [];

  return {
    id: typeof v.id === 'string' && v.id ? v.id : `view-${idx + 1}`,
    name: typeof v.name === 'string' && v.name ? v.name : `视图 ${idx + 1}`,
    selectedHeaderIds: Array.isArray(v.selectedHeaderIds) ? v.selectedHeaderIds.filter((x): x is string => typeof x === 'string') : [],
    selectedSubHeaderKeys: Array.isArray(v.selectedSubHeaderKeys) ? v.selectedSubHeaderKeys.filter((x): x is string => typeof x === 'string') : [],
    selectedQuestionIds: Array.isArray(v.selectedQuestionIds) ? v.selectedQuestionIds.filter((x): x is string => typeof x === 'string') : [],
    selectedRowKeys: Array.isArray((v as any).selectedRowKeys) ? (v as any).selectedRowKeys.filter((x: unknown): x is string => typeof x === 'string') : [],
    tableDisplayConfigs,
    selectedColumnGroups: Array.isArray(v.selectedColumnGroups)
      ? v.selectedColumnGroups
          .filter((x): x is any => !!x && typeof x === 'object')
          .map((x) => ({
            headerId: typeof x.headerId === 'string' ? x.headerId : '',
            groupName: typeof x.groupName === 'string' ? x.groupName : '',
            hiddenColumnLetters: Array.isArray(x.hiddenColumnLetters)
              ? x.hiddenColumnLetters.filter((t: unknown): t is string => typeof t === 'string')
              : [],
          }))
          .filter((x) => x.headerId || x.groupName)
      : [],
    dataType: v.dataType === 'abs' || v.dataType === 'pct' ? v.dataType : 'pct',
    decimalPlaces: typeof v.decimalPlaces === 'number' ? v.decimalPlaces : 0,
    sortConfig: v.sortConfig ?? null,
  };
}

function normalizeProject(project: unknown): ProjectConfig {
  const p = (project && typeof project === 'object' ? project : {}) as Partial<ProjectConfig>;
  const viewsRaw = Array.isArray(p.views) ? p.views : [];
  return {
    projectKey: typeof p.projectKey === 'string' && p.projectKey ? p.projectKey : crypto.randomUUID(),
    projectName: typeof p.projectName === 'string' ? p.projectName : '未命名项目',
    lastUpdated: typeof p.lastUpdated === 'string' ? p.lastUpdated : new Date().toISOString(),
    apiKey: typeof p.apiKey === 'string' ? p.apiKey : undefined,
    views: viewsRaw.map((v, idx) => normalizeView(v, idx)),
  };
}

export function useProjectConfig() {
  const [projects, setProjects] = useState<Record<string, ProjectConfig>>(() => {
    const raw = loadProjects();
    const next: Record<string, ProjectConfig> = {};
    try {
      Object.entries(raw).forEach(([k, v]) => {
        next[k] = normalizeProject(v);
      });
      saveProjects(next);
    } catch {
      resetProjectsStorage();
      return {};
    }
    return next;
  });
  const [currentKey, setCurrentKey] = useState<string | null>(null);

  const current = useMemo(() => (currentKey ? projects[currentKey] : null), [projects, currentKey]);

  const upsertProject = (project: ProjectConfig) => {
    const normalized = normalizeProject(project);
    saveProject(normalized);
    const nextRaw = loadProjects();
    const next: Record<string, ProjectConfig> = {};
    Object.entries(nextRaw).forEach(([k, v]) => {
      next[k] = normalizeProject(v);
    });
    setProjects(next);
    setCurrentKey(normalized.projectKey);
  };

  const createProjectIfMissing = (projectKey: string, projectName: string, questions: Question[] = []) => {
    if (projects[projectKey]) {
      setCurrentKey(projectKey);
      return projects[projectKey];
    }
    const created: ProjectConfig = {
      projectKey,
      projectName,
      lastUpdated: new Date().toISOString(),
      views: [createDefaultView(questions)],
    };
    upsertProject(created);
    return created;
  };

  const updateCurrentView = (viewId: string, updater: (view: ViewConfig) => ViewConfig) => {
    if (!currentKey) return;
    const project = projects[currentKey];
    if (!project) return;
    const nextViews = project.views.map((v) => (v.id === viewId ? updater(v) : v));
    upsertProject({ ...project, views: nextViews });
  };

  return {
    projects,
    current,
    currentKey,
    setCurrentKey,
    upsertProject,
    createProjectIfMissing,
    updateCurrentView,
    resetAllProjects: () => {
      resetProjectsStorage();
      setProjects({});
      setCurrentKey(null);
    },
    removeProject: (key: string) => {
      deleteProject(key);
      const nextRaw = loadProjects();
      const next: Record<string, ProjectConfig> = {};
      Object.entries(nextRaw).forEach(([k, v]) => {
        next[k] = normalizeProject(v);
      });
      setProjects(next);
      if (currentKey === key) setCurrentKey(null);
    },
  };
}
