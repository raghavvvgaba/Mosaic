'use client';

import { useEffect, useState } from 'react';
import { FileText, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFavoriteDocuments, toggleFavorite } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useTabs } from '@/contexts/TabsContext';

export default function FavoritesPage() {
  const { openDocument, ensureTabExists } = useTabs();
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    // Register this page as a tab
    ensureTabExists('/favorites', 'Favorites', 'page', 'favorites');
    loadFavorites();
  }, [ensureTabExists]);

  async function loadFavorites() {
    const docs = await getFavoriteDocuments();
    setDocuments(docs);
  }

  async function handleToggleFavorite(e: React.MouseEvent, docId: string) {
    e.stopPropagation();
    await toggleFavorite(docId);
    loadFavorites();
    window.dispatchEvent(new Event('documentsChanged'));
  }

  function handleDocumentClick(doc: Document) {
    openDocument(doc.id, doc.title);
  }

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
      <p className="text-muted-foreground mb-8">
        {documents.length} {documents.length === 1 ? 'document' : 'documents'}
      </p>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => handleDocumentClick(doc)}
            className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
          >
            <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{doc.title || 'Untitled'}</div>
              <div className="text-sm text-muted-foreground">
                Updated {formatDistanceToNow(doc.updatedAt, { addSuffix: true })}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleToggleFavorite(e, doc.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-yellow-500"
            >
              <Star className="w-4 h-4 fill-yellow-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
