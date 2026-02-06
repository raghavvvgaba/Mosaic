import { useCallback, useState } from 'react'
import { completeGenerate, type GenerateParams } from '@/lib/ai/openrouter-client'

export type ImproveOptions = {
  tone: 'neutral' | 'friendly' | 'formal'
  model?: string
}

export type ImproveAction = 'accept' | 'discard' | 'try-again' | 'insert-below'

export function useImproveWriting() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalText, setOriginalText] = useState('')
  const [improvedText, setImprovedText] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const improve = useCallback(async (text: string, options: ImproveOptions = { tone: 'neutral' }) => {
    if (loading) return

    // Validate input
    if (!text || text.trim().length === 0) {
      setError('Please select some text to improve')
      return
    }

    if (text.length > 5000) {
      setError('Text is too long. Please select shorter text (max 5000 characters).')
      return
    }

    setError(null)
    setOriginalText(text)
    setImprovedText('')
    setShowResult(false)
    setLoading(true)

    try {
      const payload: GenerateParams = {
        prompt: text,
        mode: 'improve',
        tone: options.tone,
        model: options.model,
      }

      // Add timeout for AI request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 30000)
      })

      const result = await Promise.race([
        completeGenerate('improve', payload),
        timeoutPromise
      ]) as string

      if (!result || result.trim().length === 0) {
        throw new Error('AI returned empty response. Please try again.')
      }

      if (result === text) {
        throw new Error('AI couldn\'t improve this text. The text might already be well-written.')
      }

      setImprovedText(result)
      setShowResult(true)
      setRetryCount(0) // Reset retry count on success
    } catch (err) {
      let errorMessage = 'Improvement failed'

      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.'
        } else if (err.message.includes('429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.'
        } else if (err.message.includes('500')) {
          errorMessage = 'AI service is temporarily unavailable. Please try again later.'
        } else {
          errorMessage = err.message
        }
      }

      // Auto-retry for network errors (max 3 retries)
      if (retryCount < 3 && (
        err instanceof Error &&
        (err.message.includes('Failed to fetch') ||
         err.message.includes('timeout') ||
         err.message.includes('500'))
      )) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => {
          improve(text, options)
        }, Math.pow(2, retryCount) * 1000) // Exponential backoff: 1s, 2s, 4s
        return
      }

      setError(errorMessage)
      setRetryCount(0)
    } finally {
      setLoading(false)
    }
  }, [loading, retryCount])

  const handleAction = useCallback((action: ImproveAction) => {
    switch (action) {
      case 'accept':
        // This will be handled by the parent component
        break
      case 'discard':
        setOriginalText('')
        setImprovedText('')
        setShowResult(false)
        setError(null)
        break
      case 'try-again':
        if (originalText) {
          improve(originalText)
        }
        break
      case 'insert-below':
        // This will be handled by the parent component
        break
    }
  }, [improve, originalText])

  const reset = useCallback(() => {
    setOriginalText('')
    setImprovedText('')
    setShowResult(false)
    setError(null)
    setLoading(false)
  }, [])

  return {
    state: {
      loading,
      error,
      originalText,
      improvedText,
      showResult,
    },
    actions: {
      improve,
      handleAction,
      reset,
    },
  }
}