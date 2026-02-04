import { useCallback, useRef, useState } from 'react'
import { streamGenerate, type GenerateParams } from '@/lib/ai/openrouter-client'

export type AiOptions = {
  tone: 'neutral' | 'friendly' | 'formal'
  length: 'short' | 'medium' | 'long'
  temperature: number
  includeContext: boolean
  model?: string
}

export function useAiDraft() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [prompt, setPrompt] = useState('')
  const lastPayloadRef = useRef<{ prompt: string; context?: string } | null>(null)
  const [options, setOptions] = useState<AiOptions>(() => {
    try {
      const raw = localStorage.getItem('ai:draft:opts')
      if (raw) return JSON.parse(raw)
    } catch {}
    return { tone: 'neutral', length: 'medium', temperature: 0.7, includeContext: false }
  })

  const stopRef = useRef<() => void>(() => {})
  const cooldownRef = useRef<number>(0)

  const persist = useCallback((next: AiOptions) => {
    setOptions(next)
    try { localStorage.setItem('ai:draft:opts', JSON.stringify(next)) } catch {}
  }, [])

  const start = useCallback(async (params: { prompt: string; context?: string }) => {
    if (loading) return
    const now = Date.now()
    if (now - cooldownRef.current < 1000) return
    cooldownRef.current = now

    setError(null)
    setText('')
    setPrompt(params.prompt)
    setLoading(true)
    lastPayloadRef.current = params

    const payload: GenerateParams = {
      prompt: params.prompt,
      mode: 'draft',
      temperature: options.temperature,
      tone: options.tone,
      length: options.length,
      model: options.model,
      context: options.includeContext ? params.context : undefined,
    }

    const { stop, promise } = streamGenerate('draft', payload, undefined, {
      onToken: (t) => setText((s) => s + t),
      onDone: () => setLoading(false),
      onError: (e) => { setError(e || 'Generation failed'); setLoading(false) },
    })

    stopRef.current = stop
    await promise
  }, [loading, options])

  const stop = useCallback(() => { stopRef.current?.() }, [])
  const reset = useCallback(() => { setText(''); setError(null); setLoading(false) }, [])
  const regenerate = useCallback(() => {
    const payload = lastPayloadRef.current
    if (!payload) return
    return start(payload)
  }, [start])

  return {
    ui: { open, setOpen, prompt, setPrompt, options, setOptions: persist },
    state: { loading, error, text },
    actions: { start, stop, reset, regenerate },
  }
}
