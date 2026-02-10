import type { AppwriteDocumentRow } from './types.ts';

const DEFAULT_APPWRITE_HTTP_TIMEOUT_MS = 15000;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function getAppwriteTimeoutMs(): number {
  const raw = process.env.APPWRITE_HTTP_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;

  if (!Number.isFinite(parsed)) return DEFAULT_APPWRITE_HTTP_TIMEOUT_MS;
  return Math.max(1000, Math.min(120000, Math.floor(parsed)));
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { name?: string; code?: string };
  return err.name === 'AbortError' || err.code === 'ABORT_ERR';
}

function getAppwriteConfig() {
  const endpoint = getRequiredEnv('APPWRITE_ENDPOINT').replace(/\/$/, '');
  const projectId = getRequiredEnv('APPWRITE_PROJECT_ID');
  const apiKey = getRequiredEnv('APPWRITE_API_KEY');
  const databaseId = getRequiredEnv('APPWRITE_DATABASE_ID');
  const documentsTableId = getRequiredEnv('APPWRITE_DOCUMENTS_TABLE_ID');

  return {
    endpoint,
    projectId,
    apiKey,
    databaseId,
    documentsTableId,
  };
}

async function appwriteRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getAppwriteConfig();
  const timeoutMs = getAppwriteTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${config.endpoint}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': config.projectId,
        'X-Appwrite-Key': config.apiKey,
        ...(init?.headers || {}),
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`Appwrite request timed out after ${timeoutMs}ms for path: ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Appwrite request failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

export async function fetchDocumentById(noteId: string): Promise<AppwriteDocumentRow | null> {
  const { databaseId, documentsTableId } = getAppwriteConfig();

  const path = `/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(
    documentsTableId
  )}/rows/${encodeURIComponent(noteId)}`;

  try {
    return await appwriteRequest<AppwriteDocumentRow>(path, { method: 'GET' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('(404)')) {
      return null;
    }
    throw error;
  }
}

export async function fetchDocumentsByIds(noteIds: string[]): Promise<AppwriteDocumentRow[]> {
  if (!Array.isArray(noteIds) || noteIds.length === 0) return [];

  const results = await Promise.all(
    noteIds.map(async (noteId) => {
      try {
        return await fetchDocumentById(noteId);
      } catch {
        return null;
      }
    })
  );

  return results.filter((row): row is AppwriteDocumentRow => Boolean(row));
}
