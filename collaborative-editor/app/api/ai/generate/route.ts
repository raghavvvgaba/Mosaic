import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

type Body = {
  prompt: string
  mode?: 'draft'
  temperature?: number
  tone?: string
  length?: 'short' | 'medium' | 'long'
  model?: string
  context?: string
}

// Type-safe global rate limit bucket attached to globalThis
// Using declare global to avoid "any" casts when storing per-process state
type RateBucket = { last: number; count: number; window: number }

declare global {
  var __ai_rl: Map<string, RateBucket> | undefined
}

function buildSystemPrompt(opts: { tone?: string; length?: Body['length'] }) {
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

export async function POST(req: NextRequest) {
  // Basic in-memory rate limit (best-effort): 1 req/sec and 20/min per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const now = Date.now()
  globalThis.__ai_rl ||= new Map<string, RateBucket>()
  const bucket = globalThis.__ai_rl
  const state: RateBucket = bucket.get(ip) || { last: 0, count: 0, window: now }
  if (now - state.last < 1000) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  }
  if (now - state.window > 60_000) { state.window = now; state.count = 0 }
  state.last = now; state.count += 1; bucket.set(ip, state)
  if (state.count > 20) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing OPENROUTER_API_KEY' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const origin = req.headers.get('origin') || ''
  // Optional same-origin guard in production
  if (process.env.NODE_ENV === 'production' && origin) {
    const url = new URL(req.url)
    if (origin !== `${url.protocol}//${url.host}`) {
      return new Response('Forbidden', { status: 403 })
    }
  }

  const body = (await req.json()) as Body
  const {
    prompt,
    temperature = 0.7,
    tone,
    length,
    model = process.env.OPENROUTER_MODEL || 'xai/grok-2-latest',
    context,
  } = body

  if (!prompt || typeof prompt !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Invalid prompt' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const controller = new AbortController()
  const system = buildSystemPrompt({ tone, length })

  const messages = [
    { role: 'system', content: system },
    ...(context ? [{ role: 'system', content: `Context (may inform style/topic):\n${context}` }] : []),
    { role: 'user', content: prompt },
  ]

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.OPENROUTER_SITE || 'http://localhost',
      'X-Title': process.env.OPENROUTER_TITLE || 'Notes AI Draft',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream: true,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    return new Response(JSON.stringify({ error: 'Upstream error', detail: text }), {
      status: upstream.status || 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Pass through SSE; client will parse `data:` lines.
  const readable = new ReadableStream({
    start(controller) {
      const reader = upstream.body!.getReader()
      ;(async function pump() {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      })()
    },
    cancel() {
      controller.abort()
    },
  })

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
