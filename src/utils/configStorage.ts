import type { ProjectConfig } from '../types';

const STORAGE_KEY = 'excel_analyzer_projects';

interface StorageRoot {
  projects: Record<string, ProjectConfig>;
}

export function loadProjects(): Record<string, ProjectConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StorageRoot;
    return parsed.projects ?? {};
  } catch {
    // Auto-heal corrupted storage payload to avoid app boot crash loops.
    localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

export function saveProjects(projects: Record<string, ProjectConfig>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects }));
}

export function resetProjectsStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function saveProject(config: ProjectConfig): void {
  const all = loadProjects();
  all[config.projectKey] = { ...config, lastUpdated: new Date().toISOString() };
  saveProjects(all);
}

export function deleteProject(projectKey: string): void {
  const all = loadProjects();
  delete all[projectKey];
  saveProjects(all);
}

export function exportProject(config: ProjectConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const day = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${config.projectName}_${day}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProject(file: File): Promise<ProjectConfig> {
  const text = await file.text();
  const parsed = JSON.parse(text) as ProjectConfig;
  if (!parsed.projectKey || !Array.isArray(parsed.views)) {
    throw new Error('配置文件格式不匹配，请检查文件');
  }
  return parsed;
}
