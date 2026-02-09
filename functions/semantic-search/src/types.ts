export interface AppwriteFunctionRequest {
  method?: string;
  path?: string;
  url?: string;
  headers?: Record<string, string | undefined>;
  body?: string | Record<string, unknown> | null;
  bodyRaw?: string;
  bodyText?: string;
  bodyJson?: unknown;
  payload?: string;
}

export interface AppwriteFunctionResponse {
  json?: (body: unknown, statusCode?: number, headers?: Record<string, string>) => unknown;
  send?: (body: string, statusCode?: number, headers?: Record<string, string>) => unknown;
  text?: (body: string, statusCode?: number, headers?: Record<string, string>) => unknown;
  empty?: (statusCode?: number, headers?: Record<string, string>) => unknown;
}

export interface AppwriteFunctionContext {
  req?: AppwriteFunctionRequest;
  res?: AppwriteFunctionResponse;
  log?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}

export interface SearchRequestBody {
  query: string;
  workspaceId?: string | null;
  limit?: number;
}

export interface IndexRequestBody {
  noteId: string;
}

export interface AppwriteDocumentRow {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  content?: string;
  workspaceId: string;
  icon?: string;
  lastChangedAt?: string;
  isDeleted?: boolean;
  isFavorite?: boolean;
  font?: string;
  isPublic?: boolean;
  ownerId?: string;
  collaborators?: unknown[];
}

export interface ChunkEmbeddingPoint {
  id: string;
  vector: number[];
  payload: {
    noteId: string;
    userId: string;
    workspaceId: string;
    chunkIndex: number;
    title: string;
    snippet: string;
    updatedAt: string;
    embeddingVersion: string;
  };
}

export interface SemanticSearchResult {
  noteId: string;
  score: number;
  snippet?: string;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
  notes: AppwriteDocumentRow[];
}

export interface QdrantSearchHit {
  id: string | number;
  score: number;
  payload?: {
    noteId?: string;
    userId?: string;
    workspaceId?: string;
    chunkIndex?: number;
    title?: string;
    snippet?: string;
    updatedAt?: string;
    embeddingVersion?: string;
  };
}
