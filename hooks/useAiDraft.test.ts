import { describe, expect, it } from 'vitest'
import { normalizeAiDraftOptions } from './aiDraftOptions'

describe('normalizeAiDraftOptions', () => {
  it('drops legacy model field and keeps valid options', () => {
    const normalized = normalizeAiDraftOptions({
      tone: 'formal',
      length: 'long',
      temperature: 0.9,
      includeContext: true,
      model: 'openai/gpt-4o-mini',
    })

    expect(normalized).toEqual({
      tone: 'formal',
      length: 'long',
      temperature: 0.9,
      includeContext: true,
    })
    expect('model' in normalized).toBe(false)
  })
})
