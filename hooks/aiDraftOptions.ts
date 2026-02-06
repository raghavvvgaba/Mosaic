export type AiOptions = {
  tone: 'neutral' | 'friendly' | 'formal'
  length: 'short' | 'medium' | 'long'
  temperature: number
  includeContext: boolean
}

export const DEFAULT_AI_OPTIONS: AiOptions = {
  tone: 'neutral',
  length: 'medium',
  temperature: 0.7,
  includeContext: false,
}

export function normalizeAiDraftOptions(value: unknown): AiOptions {
  if (!value || typeof value !== 'object') return DEFAULT_AI_OPTIONS

  const input = value as Partial<Record<keyof AiOptions, unknown>> & { model?: unknown }
  const tone = input.tone
  const length = input.length
  const temperature = input.temperature
  const includeContext = input.includeContext

  return {
    tone: tone === 'neutral' || tone === 'friendly' || tone === 'formal' ? tone : DEFAULT_AI_OPTIONS.tone,
    length: length === 'short' || length === 'medium' || length === 'long' ? length : DEFAULT_AI_OPTIONS.length,
    temperature:
      typeof temperature === 'number' && Number.isFinite(temperature)
        ? Math.min(1, Math.max(0, temperature))
        : DEFAULT_AI_OPTIONS.temperature,
    includeContext: typeof includeContext === 'boolean' ? includeContext : DEFAULT_AI_OPTIONS.includeContext,
  }
}
