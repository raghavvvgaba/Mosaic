import { NextRequest } from 'next/server'
import { openrouterConfig } from '@/lib/ai/tasks'
import { getTaskDefinition, resolveModel, resolveTemperature, type CommonParams } from '@/lib/ai/tasks'

export const runtime = 'nodejs'

type RateBucket = { last: number; count: number; window: number }

declare global { var __ai_rl: Map<string, RateBucket> | undefined }

export async function POST(req: NextRequest, ctx: { params: Promise<{ task: string }> }) {
  const { task } = await ctx.params
  const def = getTaskDefinition(task)
  if (!def) {
    return new Response(JSON.stringify({ error: `Unknown task: ${task}` }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  // Basic in-memory rate limit (best-effort): 1 req/sec and 20/min per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const now = Date.now()
  globalThis.__ai_rl ||= new Map<string, RateBucket>()
  const bucket: Map<string, RateBucket> = globalThis.__ai_rl
  const state: RateBucket = bucket.get(ip) || { last: 0, count: 0, window: now }
  if (now - state.last < 1000) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  }
  if (now - state.window > 60_000) { state.window = now; state.count = 0 }
  state.last = now; state.count += 1; bucket.set(ip, state)
  if (state.count > 20) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
  }

  if (!openrouterConfig.apiKey) {
    return new Response(JSON.stringify({ error: 'Missing OPENROUTER_API_KEY' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const origin = req.headers.get('origin') || ''
  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction && origin) {
    const url = new URL(req.url)
    if (origin !== `${url.protocol}//${url.host}`) {
      return new Response('Forbidden', { status: 403 })
    }
  }

  const body = (await req.json()) as CommonParams
  const { prompt, context, temperature, model, tone, length } = body
  if (!prompt || typeof prompt !== 'string') {
    return new Response(JSON.stringify({ error: 'Invalid prompt' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const controller = new AbortController()
  const system = def.systemPrompt({ prompt, context, temperature, model, tone, length })
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
      Authorization: `Bearer ${openrouterConfig.apiKey}`,
      'HTTP-Referer': openrouterConfig.site,
      'X-Title': openrouterConfig.title,
    },
    body: JSON.stringify({
      model: resolveModel(task, body),
      messages,
      temperature: resolveTemperature(task, body),
      stream: def.stream,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    return new Response(JSON.stringify({ error: 'Upstream error', detail: text }), {
      status: upstream.status || 502,
      headers: { 'Content-Type': 'application/json', 'X-AI-Task': task },
    })
  }

  if (def.stream) {
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
      cancel() { controller.abort() },
    })
    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-AI-Task': task,
        'X-Upstream-Status': String(upstream.status),
      },
    })
  }

  // Non-streaming: extract text from JSON
  try {
    const json = await upstream.json()
    const choice = json?.choices?.[0] || {}
    const text: string = choice?.message?.content || choice?.text || ''
    return new Response((text || '').toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-AI-Task': task, 'X-Upstream-Status': String(upstream.status) },
    })
  } catch {
    return new Response('', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-AI-Task': task, 'X-Upstream-Status': String(upstream.status) } })
  }
}
