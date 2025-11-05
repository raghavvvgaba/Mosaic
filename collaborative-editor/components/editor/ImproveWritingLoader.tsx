import { Loader2 } from 'lucide-react'

interface ImproveWritingLoaderProps {
  message?: string
}

export function ImproveWritingLoader({ message = "Improving your writing..." }: ImproveWritingLoaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500 dark:text-gray-400" />
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {message}
      </span>
    </div>
  )
}