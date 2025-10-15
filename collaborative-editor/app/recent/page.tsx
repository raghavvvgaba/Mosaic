'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, FileText, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRecentDocuments, deleteDocument, toggleFavorite } from '@/lib/db/documents';
import type { Document, DocumentFont } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useTabs } from '@/contexts/TabsContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ConfirmDialog } from '@/components/AlertDialog';
import { cn } from '@/lib/utils';

export default function RecentPage() {
  const FONT_CLASS_MAP: Record<DocumentFont, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };
  const router = useRouter();
  const { openDocument, ensureTabExists } = useTabs();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    action: () => Promise<void> | void;
  } | null>(null);

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

  const handleConfirmAction = useCallback(async () => {
    if (!confirmConfig) return;
    try {
      await confirmConfig.action();
    } finally {
      setConfirmConfig(null);
    }
  }, [confirmConfig]);

  const requestDeleteDocument = useCallback((doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    const workspaceId = activeWorkspaceId;
    setConfirmConfig({
      title: 'Move to Trash',
      description: `Move "${doc.title || 'Untitled'}" to trash?`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      variant: 'destructive',
      action: async () => {
        try {
          await deleteDocument(doc.id);
          await loadDocuments(workspaceId);
          window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
        } catch (error) {
          console.error('Failed to move document to trash:', error);
          alert('Failed to move document to trash');
        }
      },
    });
  }, [activeWorkspaceId, loadDocuments]);

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
                        <h2
                          className={cn(
                            'text-xl font-semibold group-hover:text-blue-600 transition-colors',
                            FONT_CLASS_MAP[doc.font ?? 'sans']
                          )}
                        >
                        {doc.title || 'Untitled'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Opened {formatDistanceToNow(new Date(doc.lastOpenedAt!), { addSuffix: true })}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className={FONT_CLASS_MAP[doc.font ?? 'sans']}>
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
                      onClick={(e) => requestDeleteDocument(doc, e)}
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
      <ConfirmDialog
        open={!!confirmConfig}
        onOpenChange={(open) => {
          if (!open) setConfirmConfig(null);
        }}
        title={confirmConfig?.title ?? ''}
        description={confirmConfig?.description ?? ''}
        confirmText={confirmConfig?.confirmText}
        cancelText={confirmConfig?.cancelText}
        variant={confirmConfig?.variant ?? 'default'}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
