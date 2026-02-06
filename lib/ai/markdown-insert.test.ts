import { describe, expect, it } from 'vitest'
import { sanitizeMarkdownForInsert } from './markdown-insert'

describe('sanitizeMarkdownForInsert', () => {
  it('removes trailing line-break backslashes', () => {
    const input = 'Line one\\\\\nLine two\\'
    expect(sanitizeMarkdownForInsert(input)).toBe('Line one\nLine two')
  })

  it('removes standalone backslash lines', () => {
    const input = 'Intro\n\\\n\\\nBody'
    expect(sanitizeMarkdownForInsert(input)).toBe('Intro\nBody')
  })

  it('preserves regular markdown tokens', () => {
    const input = '# Title\n\n- item\n- **bold**\n- `code`'
    expect(sanitizeMarkdownForInsert(input)).toBe(input)
  })
})
