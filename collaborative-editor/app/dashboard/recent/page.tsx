'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, FileText, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentsMetadata, useDocumentMutations } from '@/hooks/swr';
import { filterRecentDocuments } from '@/lib/db/documents';
import type { DocumentMetadata, DocumentFont } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useNavigation } from '@/contexts/NavigationContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ConfirmDialog } from '@/components/AlertDialog';
import { cn } from '@/lib/utils';

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

export default function RecentPage() {
  const FONT_CLASS_MAP: Record<DocumentFont, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };
  const router = useRouter();
  const { openDocument } = useNavigation();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const { data: allDocuments, isLoading } = useDocumentsMetadata({
    workspaceId: activeWorkspaceId ?? undefined,
    includeDeleted: true,
  });
  const { deleteDocument, toggleFavorite } = useDocumentMutations();

  const documents = useMemo(() => {
    if (!allDocuments) return [];
    return filterRecentDocuments(allDocuments);
  }, [allDocuments]);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    action: () => Promise<void> | void;
  } | null>(null);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmConfig) return;
    try {
      await confirmConfig.action();
    } finally {
      setConfirmConfig(null);
    }
  }, [confirmConfig]);

  const requestDeleteDocument = useCallback((doc: DocumentMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      title: 'Move to Trash',
      description: `Move "${doc.title || 'Untitled'}" to trash?`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      variant: 'destructive',
      action: async () => {
        try {
          await deleteDocument(doc.id);
        } catch (error) {
          console.error('Failed to move document to trash:', error);
          alert('Failed to move document to trash');
        }
      },
    });
  }, [deleteDocument]);

  async function handleToggleFavorite(e: React.MouseEvent, docId: string, currentStatus: boolean) {
    e.stopPropagation();
    await toggleFavorite(docId, currentStatus, activeWorkspaceId ?? undefined);
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full p-8">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Recent Documents</h1>
          <p className="text-muted-foreground mt-2">
            Documents you&apos;ve recently changed
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Workspace: {activeWorkspace?.name ?? 'Loading...'}
          </p>
        </div>

        {!documents || documents.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No recent documents</p>
            <p className="text-sm text-muted-foreground mb-4">
              Edit a document to see it here
            </p>
            <Button variant="outline" onClick={() => router.push('/')}>
              Go to All Documents
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => openDocument(doc.id, doc.title)}
                className={cn(
                  'p-6 rounded-2xl transition-all duration-200 group overflow-hidden h-40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background flex flex-col cursor-pointer',
                  'bg-[#0a0f16] shadow-[inset_4px_4px_10px_rgba(0,0,0,0.55),inset_-3px_-3px_6px_rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]',
                  'hover:bg-[#0e161f] hover:shadow-[12px_14px_30px_rgba(0,0,0,0.75),-8px_-8px_20px_rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.12)]',
                  'hover:transform hover:-translate-y-0.5',
                  FONT_CLASS_MAP[doc.font ?? 'sans']
                )}
              >
                <div className="flex-1 flex flex-col justify-center">
                  <h3
                    className={cn(
                      'text-center font-medium text-sm line-clamp-2 text-slate-200 group-hover:text-primary transition-colors',
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

                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => handleToggleFavorite(e, doc.id, doc.isFavorite ?? false)}
                      className={`h-6 w-6 transition-all ${doc.isFavorite ? 'text-yellow-500 opacity-100' : 'hover:bg-accent/20'}`}
                    >
                      <Star className={`w-3 h-3 ${doc.isFavorite ? 'fill-yellow-500' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => requestDeleteDocument(doc, e)}
                      className="h-6 w-6 text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
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
