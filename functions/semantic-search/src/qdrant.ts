import type { ChunkEmbeddingPoint, QdrantSearchHit } from './types.ts';

const DEFAULT_QDRANT_COLLECTION = 'notes_chunks_v1';
const DEFAULT_VECTOR_DISTANCE = 'Cosine';
const DEFAULT_VECTOR_SIZE = 1536;

let collectionInitialized = false;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function getQdrantCollectionName(): string {
  return process.env.QDRANT_COLLECTION?.trim() || DEFAULT_QDRANT_COLLECTION;
}

function getQdrantBaseUrl(): string {
  const url = getRequiredEnv('QDRANT_URL');
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function qdrantRequest<TResponse>(
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PUT';
    body?: unknown;
    acceptedStatuses?: number[];
  }
): Promise<TResponse> {
  const apiKey = getRequiredEnv('QDRANT_API_KEY');
  const baseUrl = getQdrantBaseUrl();
  const acceptedStatuses = options.acceptedStatuses ?? [200];

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!acceptedStatuses.includes(response.status)) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Qdrant request failed (${response.status}): ${detail}`);
  }

  if (response.status === 204) {
    return {} as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function ensureCollection(vectorSize: number = DEFAULT_VECTOR_SIZE): Promise<void> {
  if (collectionInitialized) return;

  const collection = getQdrantCollectionName();
  const getResult = await qdrantRequest<{ result?: unknown }>(
    `/collections/${encodeURIComponent(collection)}`,
    {
      method: 'GET',
      acceptedStatuses: [200, 404],
    }
  );

  if (!getResult || !(getResult as { result?: unknown }).result) {
    await qdrantRequest(`/collections/${encodeURIComponent(collection)}`, {
      method: 'PUT',
      body: {
        vectors: {
          size: vectorSize,
          distance: DEFAULT_VECTOR_DISTANCE,
        },
      },
      acceptedStatuses: [200],
    });
  }

  collectionInitialized = true;
}

export async function replaceNoteVectors(noteId: string, points: ChunkEmbeddingPoint[]): Promise<void> {
  const collection = getQdrantCollectionName();

  await qdrantRequest(`/collections/${encodeURIComponent(collection)}/points/delete?wait=true`, {
    method: 'POST',
    body: {
      filter: {
        must: [
          {
            key: 'noteId',
            match: { value: noteId },
          },
        ],
      },
    },
    acceptedStatuses: [200],
  });

  if (points.length === 0) return;

  await qdrantRequest(`/collections/${encodeURIComponent(collection)}/points?wait=true`, {
    method: 'PUT',
    body: {
      points,
    },
    acceptedStatuses: [200],
  });
}

interface SearchVectorsParams {
  vector: number[];
  userId: string;
  workspaceId?: string | null;
  limit: number;
}

export async function searchVectors(params: SearchVectorsParams): Promise<QdrantSearchHit[]> {
  const collection = getQdrantCollectionName();
  const mustFilters: Array<Record<string, unknown>> = [
    {
      key: 'userId',
      match: { value: params.userId },
    },
  ];

  if (params.workspaceId) {
    mustFilters.push({
      key: 'workspaceId',
      match: { value: params.workspaceId },
    });
  }

  const result = await qdrantRequest<{ result?: QdrantSearchHit[] }>(
    `/collections/${encodeURIComponent(collection)}/points/search`,
    {
      method: 'POST',
      body: {
        vector: params.vector,
        limit: params.limit,
        with_payload: true,
        with_vector: false,
        filter: {
          must: mustFilters,
        },
      },
      acceptedStatuses: [200],
    }
  );

  return Array.isArray(result.result) ? result.result : [];
}
