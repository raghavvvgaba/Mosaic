export type GenerateParams = {
  prompt: string
  mode?: 'draft' | 'improve'
  temperature?: number
  tone?: 'neutral' | 'friendly' | 'formal'
  length?: 'short' | 'medium' | 'long'
  model?: string
  context?: string
}

export type StreamCallbacks = {
  onToken?: (t: string) => void
  onDone?: () => void
  onError?: (err: string) => void
}

// Parse OpenAI-style SSE: lines beginning with "data:"; [DONE] ends stream.
function parseSSEChunk(chunk: string, cb: StreamCallbacks) {
  const lines = chunk.split(/\r?\n/)
  for (const l of lines) {
    const line = l.trim()
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') {
      if (data === '[DONE]') cb.onDone?.()
      continue
    }
    try {
      const json = JSON.parse(data)
      const delta = json?.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta.length) cb.onToken?.(delta)
    } catch {
      // Non-JSON lines can be ignored
    }
  }
}

// Legacy generateWithOpenRouter removed; use streamGenerate/completeGenerate with task-based API instead.

// New streaming generator for task-based API
export function streamGenerate(task: string, params: GenerateParams, signal?: AbortSignal, cb?: StreamCallbacks) {
  const controller = new AbortController()
  const combined = signal ? new AbortController() : controller
  if (signal) signal.addEventListener('abort', () => combined.abort(), { once: true })

  let stopped = false
  const stop = () => { stopped = true; combined.abort() }

  const promise = fetch(`/api/ai/${encodeURIComponent(task)}`, {
    method: 'POST',
    signal: combined.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        cb?.onError?.(text || `HTTP ${res.status}`)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      while (true && !stopped) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lastNewline = Math.max(buffer.lastIndexOf('\n'), buffer.lastIndexOf('\r'))
        if (lastNewline >= 0) {
          const chunk = buffer.slice(0, lastNewline + 1)
          buffer = buffer.slice(lastNewline + 1)
          parseSSEChunk(chunk, cb || {})
        }
      }
      if (buffer) parseSSEChunk(buffer, cb || {})
      cb?.onDone?.()
    })
    .catch((err) => cb?.onError?.(String(err)))

  return { stop, promise }
}

// Non-streaming completion for task-based API; returns raw text
export async function completeGenerate(task: string, params: GenerateParams): Promise<string> {
  const res = await fetch(`/api/ai/${encodeURIComponent(task)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.startsWith('text/plain')) {
    return await res.text()
  }
  // Fallback to reading text even for JSON; callers can parse if needed
  return await res.text()
}
