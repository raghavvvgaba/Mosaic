'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, FileText, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRecentDocuments, deleteDocument, toggleFavorite } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useTabs } from '@/contexts/TabsContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function RecentPage() {
  const router = useRouter();
  const { openDocument, ensureTabExists } = useTabs();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async (workspaceId: string) => {
    const docs = await getRecentDocuments(workspaceId, 20);
    setDocuments(docs);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    ensureTabExists('/recent', 'Recent', 'page', 'recent');
    setLoading(true);
    loadDocuments(activeWorkspaceId);

    const handleDocumentsChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail as { workspaceId?: string } | undefined;
      if (!detail || !detail.workspaceId || detail.workspaceId === activeWorkspaceId) {
        loadDocuments(activeWorkspaceId);
      }
    };

    window.addEventListener('documentsChanged', handleDocumentsChanged);
    return () => window.removeEventListener('documentsChanged', handleDocumentsChanged);
  }, [ensureTabExists, activeWorkspaceId, loadDocuments]);

  async function handleDeleteDocument(id: string, title: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    if (confirm(`Move "${title || 'Untitled'}" to trash?`)) {
      await deleteDocument(id);
      loadDocuments(activeWorkspaceId);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
    }
  }

  async function handleToggleFavorite(e: React.MouseEvent, docId: string) {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    await toggleFavorite(docId);
    loadDocuments(activeWorkspaceId);
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Recent Documents</h1>
          <p className="text-muted-foreground mt-2">
            Documents you&apos;ve opened recently
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Workspace: {activeWorkspace?.name ?? 'Loading...'}
          </p>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No recent documents</p>
            <p className="text-sm text-muted-foreground mb-4">
              Open a document to see it here
            </p>
            <Button variant="outline" onClick={() => router.push('/')}>
              Go to All Documents
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map(doc => (
              <div
                key={doc.id}
                onClick={() => openDocument(doc.id, doc.title)}
                className="bg-card p-6 rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <h2 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
                        {doc.title || 'Untitled'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Opened {formatDistanceToNow(new Date(doc.lastOpenedAt!), { addSuffix: true })}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span>
                        Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleToggleFavorite(e, doc.id)}
                      className={`${doc.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity ${doc.isFavorite ? 'text-yellow-500' : ''}`}
                    >
                      <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-yellow-500' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteDocument(doc.id, doc.title, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
