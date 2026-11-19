/**
 * Storage Utilities — localStorage + GitHub API
 */

export const STORAGE_KEYS = {
  AUTH: 'memorial_auth',
  CONTENT: 'memorial_content',
  MEDIA: 'memorial_media',
  GITHUB_CONFIG: 'memorial_github_config',
  MEMORIES: 'memorial_memories',
} as const;

export function saveToStorage<T>(key: string, data: T): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const serialized = localStorage.getItem(key);
    if (!serialized) return defaultValue;
    return JSON.parse(serialized) as T;
  } catch {
    return defaultValue;
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ============================================================================
// Media Storage (Base64)
// ============================================================================
export interface MediaItem {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  size: number;
  uploadedAt: string;
  section: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Файл слишком большой (максимум 5 МБ)' };
  }

  const allAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
  if (!allAllowed.includes(file.type)) {
    return { valid: false, error: 'Недопустимый формат. Разрешены: JPG, PNG, WebP, GIF, MP4, WebM' };
  }

  return { valid: true };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

export function getMediaType(file: File): 'image' | 'video' {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return 'video';
  return 'image';
}

export function saveMedia(item: MediaItem): void {
  const existing = loadFromStorage<MediaItem[]>(STORAGE_KEYS.MEDIA, []);
  const filtered = existing.filter(m => !(m.section === item.section && m.id === item.id));
  filtered.push(item);
  saveToStorage(STORAGE_KEYS.MEDIA, filtered);
  
  // Автоматическая синхронизация с GitHub если настроен
  const githubConfig = getGitHubConfig();
  if (githubConfig?.token) {
    autoSyncToGitHub(githubConfig).catch(console.error);
  }
}

export function getMediaBySection(section: string): MediaItem[] {
  const all = loadFromStorage<MediaItem[]>(STORAGE_KEYS.MEDIA, []);
  return all.filter(m => m.section === section);
}

export function removeMedia(id: string): void {
  const existing = loadFromStorage<MediaItem[]>(STORAGE_KEYS.MEDIA, []);
  const filtered = existing.filter(m => m.id !== id);
  saveToStorage(STORAGE_KEYS.MEDIA, filtered);
}

// ============================================================================
// GitHub Integration
// ============================================================================
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export function saveGitHubConfig(config: GitHubConfig): void {
  saveToStorage(STORAGE_KEYS.GITHUB_CONFIG, config);
}

export function getGitHubConfig(): GitHubConfig | null {
  return loadFromStorage<GitHubConfig | null>(STORAGE_KEYS.GITHUB_CONFIG, null);
}

export async function pushToGitHub(
  config: GitHubConfig,
  filePath: string,
  content: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;

    let sha: string | undefined;
    try {
      const getResp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (getResp.ok) {
        const getData = await getResp.json();
        sha = getData.sha;
      }
    } catch {
      // File doesn't exist yet
    }

    const body: Record<string, string> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: config.branch,
    };
    if (sha) body.sha = sha;

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => null);
      return { success: false, error: errData?.message || `HTTP ${resp.status}` };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function pullFromGitHub(
  config: GitHubConfig,
  filePath: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}?ref=${config.branch}`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}` };
    }

    const data = await resp.json();
    const content = decodeURIComponent(escape(atob(data.content)));
    return { success: true, content };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function exportAllData(): string {
  const data = {
    content: loadFromStorage(STORAGE_KEYS.CONTENT, null),
    media: loadFromStorage<MediaItem[]>(STORAGE_KEYS.MEDIA, []),
    memories: loadFromStorage(STORAGE_KEYS.MEMORIES, []),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(json: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(json);
    if (data.content) saveToStorage(STORAGE_KEYS.CONTENT, data.content);
    if (data.media) saveToStorage(STORAGE_KEYS.MEDIA, data.media);
    if (data.memories) saveToStorage(STORAGE_KEYS.MEMORIES, data.memories);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================================
// Auto-sync to GitHub
// ============================================================================
export async function autoSyncToGitHub(config: GitHubConfig): Promise<void> {
  try {
    const data = exportAllData();
    await pushToGitHub(
      config,
      'data/site-content.json',
      data,
      `Auto-sync: ${new Date().toLocaleString('ru-RU')}`
    );
  } catch (error) {
    console.error('Auto-sync failed:', error);
  }
}

export async function manualSyncToGitHub(config: GitHubConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const data = exportAllData();
    const result = await pushToGitHub(
      config,
      'data/site-content.json',
      data,
      `Manual sync: ${new Date().toLocaleString('ru-RU')}`
    );
    return result;
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
