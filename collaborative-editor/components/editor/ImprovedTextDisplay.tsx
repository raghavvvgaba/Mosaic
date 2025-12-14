import { Check, Sparkles, X, RefreshCw, ArrowDown } from 'lucide-react'

interface ImprovedTextDisplayProps {
  improvedText: string
  onAction: (action: 'accept' | 'discard' | 'try-again' | 'insert-below') => void
}

export function ImprovedTextDisplay({ improvedText, onAction }: ImprovedTextDisplayProps) {
  return (
    <div className="relative group">
      {/* AI improved text container - Neumorphic styling */}
      <div className="mt-3 p-5 neu-card border-0">
        {/* AI indicator */}
        <div className="flex items-center gap-3 mb-4">
          <div className="glass w-8 h-8 rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
            AI Improved
          </span>
        </div>

        {/* Improved text content */}
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-5 neu-inset p-4 rounded-xl">
          {improvedText}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onAction('accept')}
            className="flex items-center gap-2 px-4 py-2.5 neu-button text-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-all"
          >
            <Check className="w-4 h-4" />
            Accept
          </button>

          <button
            onClick={() => onAction('discard')}
            className="flex items-center gap-2 px-4 py-2.5 glass text-foreground text-sm font-medium rounded-xl hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
            Discard
          </button>

          <button
            onClick={() => onAction('try-again')}
            className="flex items-center gap-2 px-4 py-2.5 glass text-foreground text-sm font-medium rounded-xl hover:bg-white/10 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>

          <button
            onClick={() => onAction('insert-below')}
            className="flex items-center gap-2 px-4 py-2.5 glass text-foreground text-sm font-medium rounded-xl hover:bg-white/10 transition-all"
          >
            <ArrowDown className="w-4 h-4" />
            Insert below
          </button>
        </div>
      </div>
    </div>
  )
}