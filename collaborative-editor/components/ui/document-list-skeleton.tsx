"use client";

interface DocumentListSkeletonProps {
  count?: number;
}

export function DocumentListSkeleton({ count = 5 }: DocumentListSkeletonProps) {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="group flex items-center gap-1 rounded-lg px-2 py-2">
          <div className="h-6 w-6 flex items-center justify-center">
            <div className="w-4 h-4 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="w-4 h-4 mt-0.5 flex-shrink-0 bg-muted animate-pulse rounded" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-1 pr-2 opacity-0">
            <div className="w-8 h-8 bg-muted animate-pulse rounded" />
            <div className="w-8 h-8 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}