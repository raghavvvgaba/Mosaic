import { completeGenerate } from '@/lib/ai/openrouter-client'

const STOPWORDS = new Set([
  'a','an','and','the','of','to','in','on','for','with','by','at','from','as','that','this','these','those','is','are','was','were','be','been','being','it','its','into','about','over','under','after','before','than','then','so','such','but','or','nor','not','like','unlike','within','without','across','through','while','during','between','among','via'
])

type BlockContent = { content?: unknown }
type TextLike = { text?: unknown }

export function extractPlainTextFromBlocks(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString)
    if (!Array.isArray(parsed)) return ''
    let text = ''
    for (const block of parsed) {
      if (!block || typeof block !== 'object') continue
      const c = (block as BlockContent).content
      if (Array.isArray(c)) {
        for (const item of c) {
          if (typeof item === 'string') {
            text += item + ' '
          } else if (item && typeof item === 'object' && 'text' in item) {
            const t = (item as TextLike).text
            if (typeof t === 'string') text += t + ' '
          }
        }
      } else if (typeof c === 'string') {
        text += c + ' '
      }
    }
    return text.trim()
  } catch {
    return ''
  }
}

// Clean noisy artifacts (code/URLs/markup) and take the first meaningful paragraphs
export function cleanContentForTitle(raw: string, maxChars = 1500): string {
  if (!raw) return ''
  let s = raw
  // Code fences and inline code
  s = s.replace(/```[\s\S]*?```/g, ' ')
  s = s.replace(/`[^`]*`/g, ' ')
  // Markdown links: keep text
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
  // URLs and emails
  s = s.replace(/https?:\/\/\S+|www\.[^\s]+/g, ' ')
  s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ' ')
  // HTML tags
  s = s.replace(/<[^>]+>/g, ' ')
  // Normalize whitespace
  s = s.replace(/[\t\r]+/g, ' ').replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n')

  const paras = s.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const meaningful: string[] = []
  for (const p of paras) {
    const wordish = p.replace(/[^A-Za-z\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean)
    if (wordish.length >= 3) {
      meaningful.push(p)
      if (meaningful.join('\n').length >= maxChars || meaningful.length >= 3) break
    }
  }
  let out = (meaningful.length ? meaningful.join('\n') : s).trim()
  if (out.length > maxChars) out = out.slice(0, maxChars)
  return out
}

function isMostlyNonLatin(text: string): boolean {
  if (!text) return false
  const latin = (text.match(/[A-Za-z]/g) || []).length
  const nonLatin = (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Arabic}\p{Script=Hebrew}]/gu) || []).length
  return nonLatin > latin
}

export function suggestTitleHeuristic(content: string): string | null {
  if (!content) return null
  const cleanedInput = cleanContentForTitle(content, 400)
  const firstSentences = cleanedInput.split(/(?<=[.!?])\s+|\n+/).slice(0, 3).join(' ') || cleanedInput
  const cleaned = firstSentences.replace(/[\"'`~!@#$%^&*()_+={}|\[\]\\:;<>/?]+/g, ' ')
  const tokens = cleaned.split(/\s+/).filter(Boolean)
  if (tokens.length < 2) return null

  // Prefer a contiguous capitalized phrase allowing joiners (of/and/the/a/an)
  const JOINERS = new Set(['of','and','the','a','an'])
  type Span = { start: number; end: number }
  const spans: Span[] = []
  let i = 0
  while (i < tokens.length) {
    if (/^[A-Z][a-zA-Z0-9-]*$/.test(tokens[i])) {
      let j = i + 1
      while (j < tokens.length) {
        const tok = tokens[j]
        const low = tok.toLowerCase()
        const isCap = /^[A-Z][a-zA-Z0-9-]*$/.test(tok)
        if (isCap || JOINERS.has(low)) {
          j++
          continue
        }
        break
      }
      if (j - i >= 2) spans.push({ start: i, end: j })
      i = j
    } else {
      i++
    }
  }
  if (spans.length) {
    spans.sort((a,b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start)
    const best = spans[0]
    const phrase = tokens.slice(best.start, best.end).join(' ')
    const candidate = sanitizeTitle(phrase)
    if (candidate) return candidate
  }

  // Prefer meaningful capitalized tokens not in stopwords
  const caps: string[] = []
  for (const tok of tokens) {
    const low = tok.toLowerCase()
    const isCap = /^[A-Z][a-zA-Z0-9-]*$/.test(tok)
    if (isCap && !STOPWORDS.has(low)) caps.push(tok)
    if (caps.length >= 3) break
  }
  let picked: string[] = caps

  // Fallback: pick first non-stopword tokens (length > 2)
  if (picked.length === 0) {
    for (const tok of tokens) {
      const low = tok.toLowerCase()
      if (!STOPWORDS.has(low) && /[a-zA-Z]/.test(tok) && tok.length > 2) {
        picked.push(tok)
        if (picked.length >= 3) break
      }
    }
  }
  // If still empty (likely non-Latin), just take first 2-3 tokens
  if (picked.length === 0) {
    for (const tok of tokens) {
      if (tok.trim()) picked.push(tok)
      if (picked.length >= 3) break
    }
  }
  if (picked.length === 0) return null
  picked = picked.slice(0, 3)
  const title = picked.join(' ')
  return sanitizeTitle(title)
}

export function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

export function sanitizeTitle(s: string): string | null {
  if (!s) return null
  let t = s.trim().replace(/[\"'`]+/g, '').replace(/\s+/g, ' ')
  if (!t) return null
  // Limit words
  const words = t.split(' ').slice(0, 3)
  t = words.join(' ')
  if (!isMostlyNonLatin(t)) t = toTitleCase(t)
  if (t.length > 40) t = t.slice(0, 40).trim()
  if (!t) return null
  return t
}

export async function suggestTitleAI(plainText: string): Promise<string | null> {
  if (!plainText) return null
  // Use first ~1500 chars to keep prompt small
  const excerpt = plainText.slice(0, 1500)
  const prompt = `${excerpt}`

  try {
    const out = await completeGenerate('title', { prompt })
    const text = out.trim()
    if (!text && process.env.NODE_ENV !== 'production') {
      // Dev-only diagnostic: empty AI response triggers fallback
      console.warn('[title-ai] empty response from /api/ai/title; heuristic fallback will be used')
    }
    return text || null
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[title-ai] request failed; heuristic fallback will be used', e)
    }
    return null
  }
}

// Minimal helper: generate a title from BlockNote JSON using AI first, then heuristic fallback
export async function generateTitleFromBlocks(jsonString: string): Promise<string | null> {
  const plain = extractPlainTextFromBlocks(jsonString)
  if (!plain) return null
  const ai = await suggestTitleAI(plain)
  if (ai && ai.trim()) return ai.trim()
  const heuristic = suggestTitleHeuristic(plain)
  return heuristic ? sanitizeTitle(heuristic) : null
}
