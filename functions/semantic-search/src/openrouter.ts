const OPENROUTER_EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings';
const DEFAULT_EMBED_MODEL = 'openai/text-embedding-3-small';
const DEFAULT_OPENROUTER_HTTP_TIMEOUT_MS = 25000;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function getEmbeddingModel(): string {
  return process.env.OPENROUTER_EMBED_MODEL?.trim() || DEFAULT_EMBED_MODEL;
}

function getOpenRouterTimeoutMs(): number {
  const raw = process.env.OPENROUTER_HTTP_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;

  if (!Number.isFinite(parsed)) return DEFAULT_OPENROUTER_HTTP_TIMEOUT_MS;
  return Math.max(1000, Math.min(120000, Math.floor(parsed)));
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { name?: string; code?: string };
  return err.name === 'AbortError' || err.code === 'ABORT_ERR';
}

type OpenRouterEmbeddingItem = {
  embedding?: number[];
  index?: number;
};

type OpenRouterEmbeddingResponse = {
  data?: OpenRouterEmbeddingItem[];
};

export async function embedTexts(input: string[]): Promise<number[][]> {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error('embedTexts requires at least one input string');
  }

  const apiKey = getRequiredEnv('OPENROUTER_API_KEY');
  const model = getEmbeddingModel();
  const timeoutMs = getOpenRouterTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(process.env.OPENROUTER_SITE
          ? { 'HTTP-Referer': process.env.OPENROUTER_SITE }
          : {}),
        ...(process.env.OPENROUTER_TITLE
          ? { 'X-Title': process.env.OPENROUTER_TITLE }
          : {}),
      },
      body: JSON.stringify({
        model,
        input,
        encoding_format: 'float',
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(
        `OpenRouter embeddings request timed out after ${timeoutMs}ms for model: ${model}`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenRouter embeddings request failed (${response.status}): ${detail}`);
  }

  const json = (await response.json()) as OpenRouterEmbeddingResponse;
  if (!Array.isArray(json.data) || json.data.length === 0) {
    throw new Error('OpenRouter embeddings response missing data');
  }

  const sorted = [...json.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const embeddings: number[][] = [];

  for (const item of sorted) {
    if (!Array.isArray(item.embedding) || item.embedding.length === 0) {
      throw new Error('OpenRouter embeddings response contains an invalid embedding');
    }
    embeddings.push(item.embedding);
  }

  if (embeddings.length !== input.length) {
    throw new Error(
      `OpenRouter embeddings count mismatch: expected ${input.length}, got ${embeddings.length}`
    );
  }

  return embeddings;
}
