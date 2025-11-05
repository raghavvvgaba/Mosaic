import { Check, Sparkles, X, RefreshCw, ArrowDown } from 'lucide-react'

interface ImprovedTextDisplayProps {
  originalText: string
  improvedText: string
  onAction: (action: 'accept' | 'discard' | 'try-again' | 'insert-below') => void
}

export function ImprovedTextDisplay({ originalText, improvedText, onAction }: ImprovedTextDisplayProps) {
  return (
    <div className="relative group">
      {/* AI improved text container - Notion-like styling */}
      <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        {/* AI indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full">
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            AI improved writing
          </span>
        </div>

        {/* Improved text content */}
        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap mb-4">
          {improvedText}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onAction('accept')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black text-xs font-medium rounded transition-colors"
          >
            <Check className="w-3 h-3" />
            Accept
          </button>

          <button
            onClick={() => onAction('discard')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded transition-colors"
          >
            <X className="w-3 h-3" />
            Discard
          </button>

          <button
            onClick={() => onAction('try-again')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>

          <button
            onClick={() => onAction('insert-below')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded transition-colors"
          >
            <ArrowDown className="w-3 h-3" />
            Insert below
          </button>
        </div>
      </div>
    </div>
  )
}