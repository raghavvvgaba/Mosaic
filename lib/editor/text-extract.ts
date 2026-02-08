type InlineNode = { text?: unknown }

type EditorLikeBlock = {
  content?: unknown
  children?: unknown
}

type ExtractOptions = {
  maxChars?: number
}

function extractTextFromBlockContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  const parts: string[] = []
  for (const item of content) {
    if (typeof item === 'string') {
      parts.push(item)
      continue
    }
    if (item && typeof item === 'object') {
      const maybeText = (item as InlineNode).text
      if (typeof maybeText === 'string') parts.push(maybeText)
    }
  }
  return parts.join(' ').trim()
}

function walkBlocks(blocks: unknown[], out: string[]) {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    const typedBlock = block as EditorLikeBlock
    const text = extractTextFromBlockContent(typedBlock.content)
    if (text) out.push(text)

    if (Array.isArray(typedBlock.children) && typedBlock.children.length > 0) {
      walkBlocks(typedBlock.children, out)
    }
  }
}

export function extractPlainTextFromEditorBlocks(blocks: unknown[], options: ExtractOptions = {}): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return ''

  const out: string[] = []
  walkBlocks(blocks, out)

  let text = out.join('\n').trim()
  const maxChars = options.maxChars
  if (typeof maxChars === 'number' && Number.isFinite(maxChars) && maxChars > 0 && text.length > maxChars) {
    text = text.slice(0, maxChars)
  }

  return text
}
