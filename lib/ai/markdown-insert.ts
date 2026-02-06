export function sanitizeMarkdownForInsert(input: string): string {
  if (!input) return ''

  const normalized = input.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  const cleaned: string[] = []
  let inCodeFence = false

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()

    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence
      cleaned.push(rawLine)
      continue
    }

    if (!inCodeFence) {
      if (/^\\+$/.test(trimmed)) {
        continue
      }
      cleaned.push(rawLine.replace(/(?:\s*\\)+\s*$/, ''))
      continue
    }

    cleaned.push(rawLine)
  }

  return cleaned.join('\n').trim()
}
