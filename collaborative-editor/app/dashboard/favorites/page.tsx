'use client';

import { useEffect, useMemo } from 'react';
import { Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentsMetadata, useDocumentMutations } from '@/hooks/swr';
import { filterFavoriteDocuments } from '@/lib/db/documents';
import type { DocumentMetadata, DocumentFont } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';

function formatShortTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
import { useNavigation } from '@/contexts/NavigationContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

export default function FavoritesPage() {
  const { openDocument } = useNavigation();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const { data: allDocuments, isLoading } = useDocumentsMetadata({
    workspaceId: activeWorkspaceId ?? undefined,
    includeDeleted: true,
  });
  const { toggleFavorite } = useDocumentMutations();

  const documents = useMemo(() => {
    if (!allDocuments) return [];
    return filterFavoriteDocuments(allDocuments);
  }, [allDocuments]);

  async function handleToggleFavorite(e: React.MouseEvent, docId: string, currentStatus: boolean) {
    e.stopPropagation();
    await toggleFavorite(docId, currentStatus, activeWorkspaceId ?? undefined);
  }

  function handleDocumentClick(doc: DocumentMetadata) {
    openDocument(doc.id, doc.title);
  }

  const FONT_CLASS_MAP: Record<DocumentFont, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="w-full p-4 sm:p-6 md:p-8">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold mb-2">Favorites</h1>
          <p className="text-muted-foreground mb-8">
            Your starred documents will appear here
          </p>

          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Star className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No favorite documents yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Click the star icon on any document to add it to favorites
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 md:p-8">
      <div className="container mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2">Favorites</h1>
          <p className="text-muted-foreground mt-2">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Workspace: {activeWorkspace?.name ?? 'Loading...'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => handleDocumentClick(doc)}
            className={cn(
              'p-4 sm:p-5 md:p-6 rounded-2xl transition-all duration-200 group overflow-hidden min-h-[140px] sm:h-36 md:h-40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background flex flex-col',
              'bg-[#0a0f16] shadow-[inset_4px_4px_10px_rgba(0,0,0,0.55),inset_-3px_-3px_6px_rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]',
              'hover:bg-[#0e161f] hover:shadow-[12px_14px_30px_rgba(0,0,0,0.75),-8px_-8px_20px_rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.12)]',
              'hover:transform hover:-translate-y-0.5',
              'cursor-pointer',
              FONT_CLASS_MAP[doc.font ?? 'sans']
            )}
          >
            {/* Main content */}
            <div className="flex-1 flex flex-col justify-center">
              <h3
                className={cn(
                  'text-center font-medium text-sm line-clamp-2 text-slate-200 transition-colors group-hover:text-primary',
                  FONT_CLASS_MAP[doc.font ?? 'sans']
                )}
              >
                {doc.title || 'Untitled'}
              </h3>
              {doc.lastChangedAt && (
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3" />
                  <span>{formatShortTime(new Date(doc.lastChangedAt))}</span>
                </div>
              )}
            </div>

            {/* Metadata and actions */}
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(e, doc.id, doc.isFavorite ?? false);
                  }}
                  className={`h-6 w-6 transition-all ${doc.isFavorite ? 'text-yellow-500 opacity-100' : 'hover:bg-accent/20'}`}
                >
                  <Star className={`w-3 h-3 ${doc.isFavorite ? 'fill-yellow-500' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
