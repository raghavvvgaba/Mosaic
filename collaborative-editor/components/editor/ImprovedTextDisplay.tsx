import { Check, Sparkles, X, RefreshCw, ArrowDown } from 'lucide-react'

interface ImprovedTextDisplayProps {
  improvedText: string
  onAction: (action: 'accept' | 'discard' | 'try-again' | 'insert-below') => void
}

export function ImprovedTextDisplay({ improvedText, onAction }: ImprovedTextDisplayProps) {
  return (
    <div className="relative group">
      {/* AI improved text container */}
      <div className="mt-3 p-5 bg-card border border-border rounded-xl shadow-sm transition-all">
        {/* AI indicator */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-background/80 backdrop-blur-md border border-border shadow-sm w-8 h-8 rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
            AI Improved
          </span>
        </div>

        {/* Improved text content */}
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-5 bg-muted/50 rounded-lg border border-transparent p-4">
          {improvedText}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onAction('accept')}
            className="flex items-center gap-2 px-4 py-2.5 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 text-foreground font-medium rounded-xl hover:opacity-90 transition-all"
          >
            <Check className="w-4 h-4" />
            Accept
          </button>

          <button
            onClick={() => onAction('discard')}
            className="flex items-center gap-2 px-4 py-2.5 bg-background/80 backdrop-blur-md border border-border shadow-sm text-foreground text-sm font-medium rounded-xl hover:bg-accent/50 transition-all"
          >
            <X className="w-4 h-4" />
            Discard
          </button>

          <button
            onClick={() => onAction('try-again')}
            className="flex items-center gap-2 px-4 py-2.5 bg-background/80 backdrop-blur-md border border-border shadow-sm text-foreground text-sm font-medium rounded-xl hover:bg-accent/50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>

          <button
            onClick={() => onAction('insert-below')}
            className="flex items-center gap-2 px-4 py-2.5 bg-background/80 backdrop-blur-md border border-border shadow-sm text-foreground text-sm font-medium rounded-xl hover:bg-accent/50 transition-all"
          >
            <ArrowDown className="w-4 h-4" />
            Insert below
          </button>
        </div>
      </div>
    </div>
  )
}