# Semantic Search Function

Appwrite Function routes:

- `POST /index`
- `POST /search`

## Required environment variables

- `OPENROUTER_API_KEY`
- `OPENROUTER_EMBED_MODEL` (default: `openai/text-embedding-3-small`)
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION` (default: `notes_chunks_v1`)
- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_DOCUMENTS_TABLE_ID`

## Optional tuning variables

- `OPENROUTER_HTTP_TIMEOUT_MS` (default: `25000`)
- `QDRANT_HTTP_TIMEOUT_MS` (default: `20000`)
- `APPWRITE_HTTP_TIMEOUT_MS` (default: `15000`)
- `SEMANTIC_MAX_CHUNKS` (default: `12`)
- `SEMANTIC_CHUNK_SIZE_CHARS` (default: `1400`)
- `SEMANTIC_CHUNK_OVERLAP_CHARS` (default: `200`)
