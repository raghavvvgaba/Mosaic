import { describe, expect, it } from 'vitest'
import { getTaskDefinition, resolveModel } from './tasks'

describe('resolveModel', () => {
  it('returns pinned title model', () => {
    expect(resolveModel('title')).toBe('google/gemini-2.5-flash-lite-preview-09-2025')
  })

  it('returns pinned draft model', () => {
    expect(resolveModel('draft')).toBe('google/gemini-2.5-flash-lite')
  })

  it('returns pinned chat model equal to draft model', () => {
    expect(resolveModel('chat')).toBe('google/gemini-2.5-flash-lite')
  })

  it('includes markdown and backslash guardrails in draft prompt', () => {
    const draft = getTaskDefinition('draft')
    expect(draft).not.toBeNull()
    const prompt = draft!.systemPrompt({ prompt: 'test' })
    expect(prompt).toContain('Use clean Markdown structure')
    expect(prompt).toContain('Do not use trailing backslashes for line breaks.')
    expect(prompt).toContain('Do not wrap the entire response in a single code fence.')
    expect(prompt).toContain('Do not ask the user questions.')
    expect(prompt).toContain('Never return only a question.')
  })

  it('registers chat task as non-streaming text output', () => {
    const chat = getTaskDefinition('chat')
    expect(chat).not.toBeNull()
    expect(chat?.stream).toBe(false)
    expect(chat?.output).toBe('text')
  })
})
