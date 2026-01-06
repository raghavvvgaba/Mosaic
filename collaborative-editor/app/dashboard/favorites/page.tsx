'use client';

import { useEffect, useMemo } from 'react';
import { FileText, Star, Clock } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8">
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
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Favorites</h1>
      <p className="text-muted-foreground mt-2">
        {documents.length} {documents.length === 1 ? 'document' : 'documents'}
      </p>
      <p className="text-xs text-muted-foreground mt-1 mb-6">
        Workspace: {activeWorkspace?.name ?? 'Loading...'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => handleDocumentClick(doc)}
            className="relative bg-card rounded-xl border transition-all cursor-pointer group overflow-hidden hover:border-primary/50 hover:shadow-lg"
          >
            <div className="p-6 h-40 flex flex-col">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <h2 className={cn('text-xl font-semibold group-hover:text-primary transition-colors', FONT_CLASS_MAP[doc.font ?? 'sans'])}>
                    {doc.title || 'Untitled'}
                  </h2>
                </div>
                {doc.lastChangedAt && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatShortTime(new Date(doc.lastChangedAt))}</span>
                  </div>
                )}
              </div>
              <div className="mt-auto flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleToggleFavorite(e, doc.id, doc.isFavorite ?? false)}
                  className={`${doc.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity text-yellow-500`}
                >
                  <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-yellow-500' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
