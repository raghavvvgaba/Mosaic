export type TaskName = 'draft' | 'title' | string

export type CommonParams = {
  prompt: string
  context?: string
  temperature?: number
  model?: string
  tone?: 'neutral' | 'friendly' | 'formal'
  length?: 'short' | 'medium' | 'long'
}

export type TaskDefinition = {
  name: TaskName
  stream: boolean
  output: 'sse' | 'text'
  systemPrompt: (params: CommonParams) => string
}

// Centralized per-task model preferences
const TASK_MODELS: Record<string, string> = {
  draft: process.env.OPENROUTER_MODEL_DRAFT || process.env.OPENROUTER_MODEL || 'xai/grok-2-latest',
  title: process.env.OPENROUTER_MODEL_TITLE || process.env.OPENROUTER_MODEL || 'xai/grok-2-latest',
}

export function resolveModel(task: string, params: CommonParams): string {
  return params.model || TASK_MODELS[task] || process.env.OPENROUTER_MODEL || 'xai/grok-2-latest'
}

// Centralized per-task defaults (e.g., temperature)
const TASK_DEFAULTS: Record<string, { temperature?: number }> = {
  draft: { temperature: 0.7 },
  title: { temperature: 0.3 },
}

export function resolveTemperature(task: string, params: CommonParams): number {
  const fromParams = typeof params.temperature === 'number' ? params.temperature : undefined
  if (typeof fromParams === 'number') return fromParams
  const perTask = TASK_DEFAULTS[task]?.temperature
  if (typeof perTask === 'number') return perTask
  return 0.7
}

// Prompt builders live here to avoid file sprawl
function buildDraftSystemPrompt(opts: { tone?: CommonParams['tone']; length?: CommonParams['length'] }) {
  const tone = (opts.tone || 'neutral').toLowerCase()
  const length = opts.length || 'medium'
  const toneText =
    tone === 'friendly'
      ? 'Write with a friendly, approachable tone.'
      : tone === 'formal'
      ? 'Write with a clear, concise, and professional tone.'
      : 'Write with a neutral and concise tone.'
  const lengthText =
    length === 'short'
      ? 'Target roughly 80-120 words.'
      : length === 'long'
      ? 'Target roughly 400-600 words.'
      : 'Target roughly 200-300 words.'
  return `${toneText} ${lengthText} Avoid excessive preamble. Provide clean, ready-to-paste prose.`
}

const draftTask: TaskDefinition = {
  name: 'draft',
  stream: true,
  output: 'sse',
  systemPrompt: (p) => buildDraftSystemPrompt({ tone: p.tone, length: p.length }),
}

const titleTask: TaskDefinition = {
  name: 'title',
  stream: false,
  output: 'text',
  systemPrompt: () =>
    'Return ONLY a short, human-friendly title in 2-3 words, in the same language as the input. No punctuation, no quotes, no code tokens, no file extensions, no trailing period.',
}

const registry: Record<string, TaskDefinition> = {
  [draftTask.name]: draftTask,
  [titleTask.name]: titleTask,
}

export function getTaskDefinition(task: TaskName): TaskDefinition | null {
  const def = registry[task]
  return def || null
}
