import { fetchDocumentById, fetchDocumentsByIds } from './appwrite.ts';
import { buildEmbeddingSourceText, splitTextIntoChunks } from './chunk.ts';
import { embedTexts, getEmbeddingModel } from './openrouter.ts';
import { ensureCollection, replaceNoteVectors, searchVectors } from './qdrant.ts';
import type {
  AppwriteFunctionContext,
  AppwriteFunctionRequest,
  AppwriteFunctionResponse,
  ChunkEmbeddingPoint,
  IndexRequestBody,
  SearchRequestBody,
  SemanticSearchResult,
} from './types.ts';

const MIN_EMBEDDABLE_TEXT_LENGTH = 20;
const DEFAULT_SEARCH_LIMIT = 8;
const MAX_SEARCH_LIMIT = 25;
const QDRANT_CANDIDATE_LIMIT = 40;

function normalizePath(pathOrUrl: string | undefined): string {
  if (!pathOrUrl || !pathOrUrl.trim()) return '/';

  let raw = pathOrUrl.trim();

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      raw = new URL(raw).pathname;
    } catch {
      raw = '/';
    }
  }

  raw = raw.split('?')[0]?.split('#')[0] ?? '/';
  if (!raw.startsWith('/')) raw = `/${raw}`;

  return raw;
}

function getHeader(headers: Record<string, string | undefined> | undefined, name: string): string | null {
  if (!headers) return null;
  const exact = headers[name];
  if (typeof exact === 'string') return exact;

  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target && typeof value === 'string') {
      return value;
    }
  }

  return null;
}

function getAuthenticatedUserId(req: AppwriteFunctionRequest): string | null {
  const value = getHeader(req.headers, 'x-appwrite-user-id')?.trim();
  if (!value || value === 'null' || value === 'undefined' || value === 'guest') {
    return null;
  }
  return value;
}

function parseBody(req: AppwriteFunctionRequest): Record<string, unknown> {
  if (req.bodyJson && typeof req.bodyJson === 'object' && !Array.isArray(req.bodyJson)) {
    return req.bodyJson as Record<string, unknown>;
  }

  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return req.body as Record<string, unknown>;
  }

  const rawBody =
    (typeof req.bodyRaw === 'string' && req.bodyRaw) ||
    (typeof req.bodyText === 'string' && req.bodyText) ||
    (typeof req.payload === 'string' && req.payload) ||
    (typeof req.body === 'string' && req.body) ||
    '';

  if (!rawBody) return {};

  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

function sendJson(
  res: AppwriteFunctionResponse | undefined,
  statusCode: number,
  payload: Record<string, unknown>
): unknown {
  if (res?.json) {
    return res.json(payload, statusCode);
  }

  const serialized = JSON.stringify(payload);
  if (res?.send) {
    return res.send(serialized, statusCode, { 'Content-Type': 'application/json' });
  }

  if (res?.text) {
    return res.text(serialized, statusCode, { 'Content-Type': 'application/json' });
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: serialized,
  };
}

function parseIndexRequest(body: Record<string, unknown>): IndexRequestBody | null {
  const noteId = body.noteId;
  if (typeof noteId !== 'string' || !noteId.trim()) {
    return null;
  }

  return {
    noteId: noteId.trim(),
  };
}

function parseSearchRequest(body: Record<string, unknown>): SearchRequestBody | null {
  const query = body.query;
  if (typeof query !== 'string' || !query.trim()) {
    return null;
  }

  const workspaceRaw = body.workspaceId;
  const limitRaw = body.limit;

  return {
    query: query.trim(),
    workspaceId:
      typeof workspaceRaw === 'string' && workspaceRaw.trim().length > 0
        ? workspaceRaw.trim()
        : null,
    limit: typeof limitRaw === 'number' && Number.isFinite(limitRaw) ? limitRaw : undefined,
  };
}

function clampLimit(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SEARCH_LIMIT;
  return Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(value)));
}

async function handleIndex(
  req: AppwriteFunctionRequest,
  res: AppwriteFunctionResponse | undefined,
  userId: string
): Promise<unknown> {
  const body = parseBody(req);
  const payload = parseIndexRequest(body);

  if (!payload) {
    return sendJson(res, 400, { error: 'Invalid request body. Expected { noteId: string }.' });
  }

  const note = await fetchDocumentById(payload.noteId);
  if (!note) {
    return sendJson(res, 404, { error: 'Note not found.' });
  }

  if (!note.ownerId || note.ownerId !== userId) {
    return sendJson(res, 403, { error: 'Forbidden. You do not own this note.' });
  }

  const embeddingVersion = `openrouter:${getEmbeddingModel()}`;

  if (note.isDeleted) {
    await ensureCollection();
    await replaceNoteVectors(note.$id, []);
    return sendJson(res, 200, {
      ok: true,
      noteId: note.$id,
      indexedChunks: 0,
      skipped: 'note_deleted',
      embeddingVersion,
    });
  }

  const sourceText = buildEmbeddingSourceText(note.title, note.content);

  if (sourceText.length < MIN_EMBEDDABLE_TEXT_LENGTH) {
    await ensureCollection();
    await replaceNoteVectors(note.$id, []);
    return sendJson(res, 200, {
      ok: true,
      noteId: note.$id,
      indexedChunks: 0,
      skipped: 'text_too_short',
      embeddingVersion,
    });
  }

  const chunks = splitTextIntoChunks(sourceText, {
    chunkSizeChars: 1400,
    overlapChars: 200,
    maxChunks: 32,
  });

  if (chunks.length === 0) {
    await ensureCollection();
    await replaceNoteVectors(note.$id, []);
    return sendJson(res, 200, {
      ok: true,
      noteId: note.$id,
      indexedChunks: 0,
      skipped: 'no_chunks',
      embeddingVersion,
    });
  }

  const vectors = await embedTexts(chunks.map((chunk) => chunk.text));
  await ensureCollection(vectors[0]?.length ?? 1536);

  const points: ChunkEmbeddingPoint[] = chunks.map((chunk, index) => ({
    id: `${note.$id}:${chunk.chunkIndex}`,
    vector: vectors[index],
    payload: {
      noteId: note.$id,
      userId,
      workspaceId: note.workspaceId,
      chunkIndex: chunk.chunkIndex,
      title: note.title || 'Untitled',
      snippet: chunk.text.slice(0, 260),
      updatedAt: note.$updatedAt,
      embeddingVersion,
    },
  }));

  await replaceNoteVectors(note.$id, points);

  return sendJson(res, 200, {
    ok: true,
    noteId: note.$id,
    indexedChunks: points.length,
    embeddingVersion,
  });
}

async function handleSearch(
  req: AppwriteFunctionRequest,
  res: AppwriteFunctionResponse | undefined,
  userId: string
): Promise<unknown> {
  const body = parseBody(req);
  const payload = parseSearchRequest(body);

  if (!payload) {
    return sendJson(res, 400, {
      error: 'Invalid request body. Expected { query: string, workspaceId?: string|null, limit?: number }.',
    });
  }

  const limit = clampLimit(payload.limit);
  const [queryVector] = await embedTexts([payload.query]);

  await ensureCollection(queryVector.length);

  const hits = await searchVectors({
    vector: queryVector,
    userId,
    workspaceId: payload.workspaceId,
    limit: QDRANT_CANDIDATE_LIMIT,
  });

  const deduped = new Map<string, SemanticSearchResult>();

  for (const hit of hits) {
    const payloadNoteId = hit.payload?.noteId;
    const noteId = typeof payloadNoteId === 'string' && payloadNoteId.trim()
      ? payloadNoteId.trim()
      : null;

    if (!noteId) continue;

    const existing = deduped.get(noteId);
    if (!existing || hit.score > existing.score) {
      deduped.set(noteId, {
        noteId,
        score: hit.score,
        snippet: typeof hit.payload?.snippet === 'string' ? hit.payload.snippet : undefined,
      });
    }
  }

  const ranked = [...deduped.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  const noteIds = ranked.map((item) => item.noteId);

  const notes = await fetchDocumentsByIds(noteIds);
  const notesById = new Map(notes.map((note) => [note.$id, note]));

  const filteredResults: SemanticSearchResult[] = [];
  const filteredNotes = [];

  for (const result of ranked) {
    const note = notesById.get(result.noteId);
    if (!note) continue;
    if (note.isDeleted) continue;
    if (!note.ownerId || note.ownerId !== userId) continue;

    filteredResults.push(result);
    filteredNotes.push(note);
  }

  return sendJson(res, 200, {
    results: filteredResults,
    notes: filteredNotes,
  });
}

export default async function main(context: AppwriteFunctionContext): Promise<unknown> {
  const req = context?.req ?? {};
  const res = context?.res;
  const log = context?.log ?? (() => {});
  const errorLogger = context?.error ?? (() => {});

  try {
    const method = (req.method || 'GET').toUpperCase();
    const path = normalizePath(req.path || req.url);

    if (method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
    }

    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return sendJson(res, 401, { error: 'Unauthenticated request.' });
    }

    if (path === '/index') {
      return await handleIndex(req, res, userId);
    }

    if (path === '/search') {
      return await handleSearch(req, res, userId);
    }

    return sendJson(res, 404, { error: `Unknown route: ${path}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errorLogger('[semantic-search] fatal error:', message);
    log('[semantic-search] fatal error:', message);

    return sendJson(res, 500, {
      error: 'Internal server error',
      detail: message,
    });
  }
}
