"use client";

interface DocumentListSkeletonProps {
  count?: number;
}

export function DocumentListSkeleton({ count = 10 }: DocumentListSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="relative flex flex-col bg-card border border-border/60 shadow-sm rounded-xl p-3 sm:p-5 min-h-[120px] sm:min-h-[140px] animate-pulse"
        >
          <div className="flex-1 flex flex-col justify-center items-center space-y-3">
            <div className="h-4 bg-muted rounded-md w-3/4" />
            <div className="h-3 bg-muted rounded-md w-1/4" />
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 h-8">
            <div className="h-4 w-4 bg-muted rounded-full" />
            <div className="h-4 w-4 bg-muted rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}