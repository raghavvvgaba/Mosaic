import { describe, expect, it } from 'vitest'
import { getTaskDefinition, resolveModel } from './tasks'

describe('resolveModel', () => {
  it('returns pinned title model', () => {
    expect(resolveModel('title')).toBe('google/gemini-2.5-flash-lite-preview-09-2025')
  })

  it('returns pinned draft model', () => {
    expect(resolveModel('draft')).toBe('google/gemini-2.5-flash-lite')
  })

  it('includes markdown and backslash guardrails in draft prompt', () => {
    const draft = getTaskDefinition('draft')
    expect(draft).not.toBeNull()
    const prompt = draft!.systemPrompt({ prompt: 'test' })
    expect(prompt).toContain('Use clean Markdown structure')
    expect(prompt).toContain('Do not use trailing backslashes for line breaks.')
    expect(prompt).toContain('Do not wrap the entire response in a single code fence.')
  })
})
