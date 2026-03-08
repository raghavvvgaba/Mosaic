"use client";

interface DocumentListSkeletonProps {
  count?: number;
}

export function DocumentListSkeleton({ count = 10 }: DocumentListSkeletonProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4 lg:gap-5 justify-items-center">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="relative flex flex-col bg-card border border-border/60 shadow-sm rounded-xl p-3 sm:p-4 aspect-square w-full max-w-[200px] justify-self-center animate-pulse"
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