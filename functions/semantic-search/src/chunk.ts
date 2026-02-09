type InlineNode = { text?: unknown };

type EditorLikeBlock = {
  content?: unknown;
  children?: unknown;
};

export type ChunkOptions = {
  chunkSizeChars?: number;
  overlapChars?: number;
  maxChunks?: number;
};

export type TextChunk = {
  text: string;
  chunkIndex: number;
};

const DEFAULT_CHUNK_SIZE_CHARS = 1400;
const DEFAULT_OVERLAP_CHARS = 200;
const DEFAULT_MAX_CHUNKS = 32;

function extractTextFromBlockContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === 'string') {
      parts.push(item);
      continue;
    }

    if (item && typeof item === 'object') {
      const maybeText = (item as InlineNode).text;
      if (typeof maybeText === 'string') {
        parts.push(maybeText);
      }
    }
  }

  return parts.join(' ').trim();
}

function walkBlocks(blocks: unknown[], out: string[]) {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;

    const typedBlock = block as EditorLikeBlock;
    const text = extractTextFromBlockContent(typedBlock.content);
    if (text) out.push(text);

    if (Array.isArray(typedBlock.children) && typedBlock.children.length > 0) {
      walkBlocks(typedBlock.children, out);
    }
  }
}

export function extractPlainTextFromEditorBlocks(blocks: unknown[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';

  const out: string[] = [];
  walkBlocks(blocks, out);

  return out.join('\n').trim();
}

export function extractDocumentPlainText(content: string | undefined): string {
  if (!content || !content.trim()) return '';

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return '';
    return extractPlainTextFromEditorBlocks(parsed);
  } catch {
    return content.trim();
  }
}

function findChunkEnd(text: string, start: number, targetEnd: number): number {
  if (targetEnd >= text.length) return text.length;

  const hardEnd = Math.min(targetEnd, text.length);
  const backwardWindowStart = Math.max(start + 1, hardEnd - 180);
  const window = text.slice(backwardWindowStart, hardEnd);

  const breakChars = ['\n\n', '\n', '. ', '! ', '? ', ' '];
  for (const token of breakChars) {
    const lastIndex = window.lastIndexOf(token);
    if (lastIndex >= 0) {
      const candidate = backwardWindowStart + lastIndex + token.length;
      if (candidate > start) return candidate;
    }
  }

  return hardEnd;
}

export function splitTextIntoChunks(text: string, options: ChunkOptions = {}): TextChunk[] {
  const source = text.trim();
  if (!source) return [];

  const chunkSizeChars = Math.max(200, options.chunkSizeChars ?? DEFAULT_CHUNK_SIZE_CHARS);
  const overlapCharsRaw = Math.max(0, options.overlapChars ?? DEFAULT_OVERLAP_CHARS);
  const overlapChars = Math.min(overlapCharsRaw, Math.floor(chunkSizeChars / 2));
  const maxChunks = Math.max(1, options.maxChunks ?? DEFAULT_MAX_CHUNKS);

  const chunks: TextChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < source.length && chunkIndex < maxChunks) {
    const targetEnd = start + chunkSizeChars;
    const end = findChunkEnd(source, start, targetEnd);
    const chunk = source.slice(start, end).trim();

    if (chunk) {
      chunks.push({ text: chunk, chunkIndex });
      chunkIndex += 1;
    }

    if (end >= source.length) break;

    const nextStart = Math.max(0, end - overlapChars);
    if (nextStart <= start) break;
    start = nextStart;
  }

  return chunks;
}

export function buildEmbeddingSourceText(title: string | undefined, content: string | undefined): string {
  const plainContent = extractDocumentPlainText(content);
  const titleText = typeof title === 'string' ? title.trim() : '';

  if (titleText && plainContent) {
    return `${titleText}\n${plainContent}`.trim();
  }

  return titleText || plainContent;
}
