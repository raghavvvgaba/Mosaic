import { Loader2 } from 'lucide-react'

interface ImproveWritingLoaderProps {
  message?: string
}

export function ImproveWritingLoader({ message = "Improving your writing..." }: ImproveWritingLoaderProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 bg-card border border-border rounded-xl shadow-sm transition-all">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span className="text-sm text-foreground font-medium">
        {message}
      </span>
    </div>
  )
}