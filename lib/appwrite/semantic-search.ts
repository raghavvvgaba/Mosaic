import { ExecutionMethod, type Models } from 'appwrite';
import { getAppwrite } from './config';
import type {
  Collaborator,
  Document,
  SemanticSearchFunctionResponse,
} from '../db/types';

const DEFAULT_SEARCH_LIMIT = 8;
const DEFAULT_INDEX_DEBOUNCE_MS = 12000;

const indexQueue = new Map<string, ReturnType<typeof setTimeout>>();

function getSemanticFunctionId(): string | null {
  const functionId = process.env.NEXT_PUBLIC_APPWRITE_SEMANTIC_FUNCTION_ID;
  if (!functionId || !functionId.trim()) return null;
  return functionId.trim();
}

function getSearchLimit(): number {
  const parsed = Number(process.env.NEXT_PUBLIC_SEMANTIC_SEARCH_LIMIT);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SEARCH_LIMIT;
  return Math.floor(parsed);
}

function parseExecutionJson<T>(execution: Models.Execution): T {
  const statusCode = execution.responseStatusCode;
  const rawBody = execution.responseBody?.trim() || '';

  if (statusCode >= 400) {
    throw new Error(`Semantic function failed with status ${statusCode}: ${rawBody}`);
  }

  if (!rawBody) {
    throw new Error('Semantic function returned an empty response body');
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new Error('Semantic function returned invalid JSON');
  }
}

function mapSearchRowToDocument(row: Record<string, unknown>): Document {
  return {
    id: row.$id as string,
    title: (row.title as string) || 'Untitled',
    content: (row.content as string) || '',
    workspaceId: (row.workspaceId as string) || 'default',
    icon: row.icon as string,
    createdAt: new Date(row.$createdAt as string),
    updatedAt: new Date(row.$updatedAt as string),
    lastChangedAt: row.lastChangedAt ? new Date(row.lastChangedAt as string) : undefined,
    isDeleted: Boolean(row.isDeleted),
    isFavorite: Boolean(row.isFavorite),
    font: row.font as 'sans' | 'serif' | 'mono' | undefined,
    isPublic: Boolean(row.isPublic),
    ownerId: row.ownerId as string,
    collaborators: (row.collaborators as Collaborator[]) || [],
  };
}

async function executeSemanticFunction<T>(
  xpath: '/index' | '/search',
  body: Record<string, unknown>,
  asyncExecution: boolean
): Promise<T | null> {
  const functionId = getSemanticFunctionId();
  if (!functionId) {
    throw new Error('NEXT_PUBLIC_APPWRITE_SEMANTIC_FUNCTION_ID is not configured');
  }

  const appwrite = getAppwrite();
  const execution = await appwrite.functions.createExecution({
    functionId,
    body: JSON.stringify(body),
    async: asyncExecution,
    xpath,
    method: ExecutionMethod.POST,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (asyncExecution) {
    return null;
  }

  return parseExecutionJson<T>(execution);
}

async function triggerNoteIndex(noteId: string): Promise<void> {
  try {
    await executeSemanticFunction('/index', { noteId }, true);
  } catch (error) {
    console.warn('Failed to enqueue semantic indexing:', error);
  }
}

export function enqueueNoteIndex(
  noteId: string,
  options: { delayMs?: number } = {}
): void {
  const normalizedNoteId = noteId.trim();
  if (!normalizedNoteId) return;

  if (!getSemanticFunctionId()) return;
  if (typeof window === 'undefined') return;

  const existingTimer = indexQueue.get(normalizedNoteId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const delayMs =
    typeof options.delayMs === 'number' && Number.isFinite(options.delayMs) && options.delayMs >= 0
      ? Math.floor(options.delayMs)
      : DEFAULT_INDEX_DEBOUNCE_MS;

  const timeout = setTimeout(() => {
    indexQueue.delete(normalizedNoteId);
    void triggerNoteIndex(normalizedNoteId);
  }, delayMs);

  indexQueue.set(normalizedNoteId, timeout);
}

export async function searchSemantic(
  query: string,
  workspaceId?: string,
  limit: number = getSearchLimit()
): Promise<Document[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_SEARCH_LIMIT;

  const payload = {
    query: trimmedQuery,
    workspaceId: workspaceId?.trim() || null,
    limit: safeLimit,
  };

  const response = await executeSemanticFunction<SemanticSearchFunctionResponse>(
    '/search',
    payload,
    false
  );

  if (!response || !Array.isArray(response.notes)) {
    return [];
  }

  return response.notes
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    .map(mapSearchRowToDocument)
    .filter((doc) => !doc.isDeleted);
}
