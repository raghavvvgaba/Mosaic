'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFavoriteDocuments, toggleFavorite } from '@/lib/db/documents';
import type { Document, DocumentFont } from '@/lib/db/types';
// import { formatDistanceToNow } from 'date-fns';
import { useTabs } from '@/contexts/TabsContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

export default function FavoritesPage() {
  const { openDocument, ensureTabExists } = useTabs();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState<Document[]>([]);

  const loadFavorites = useCallback(async (workspaceId: string) => {
    const docs = await getFavoriteDocuments(workspaceId);
    setDocuments(docs);
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    ensureTabExists('/favorites', 'Favorites', 'page', 'favorites');
    setDocuments([]);
    loadFavorites(activeWorkspaceId);

    const handleDocumentsChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail as { workspaceId?: string } | undefined;
      if (!detail || !detail.workspaceId || detail.workspaceId === activeWorkspaceId) {
        loadFavorites(activeWorkspaceId);
      }
    };

    window.addEventListener('documentsChanged', handleDocumentsChanged);
    return () => window.removeEventListener('documentsChanged', handleDocumentsChanged);
  }, [ensureTabExists, activeWorkspaceId, loadFavorites]);

  async function handleToggleFavorite(e: React.MouseEvent, docId: string) {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    await toggleFavorite(docId);
    loadFavorites(activeWorkspaceId);
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
  }

  function handleDocumentClick(doc: Document) {
    openDocument(doc.id, doc.title);
  }

  const FONT_CLASS_MAP: Record<DocumentFont, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };

  if (documents.length === 0) {
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
                {/* No updated time on favorites page */}
              </div>
              <div className="mt-auto flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleToggleFavorite(e, doc.id)}
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
