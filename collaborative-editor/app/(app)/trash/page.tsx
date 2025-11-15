'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Trash2, FileText, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getDeletedDocuments, restoreDocument, permanentlyDeleteDocument } from '@/lib/db/documents';
import type { Document, DocumentFont } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ConfirmDialog } from '@/components/AlertDialog';
import { cn } from '@/lib/utils';

export default function TrashPage() {
  const router = useRouter();
    const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    action: () => Promise<void> | void;
  } | null>(null);

  const FONT_CLASS_MAP: Record<DocumentFont, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };

  const loadDocuments = useCallback(async (workspaceId: string) => {
    const docs = await getDeletedDocuments(workspaceId);
    setDocuments(docs);
    setLoading(false);
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmConfig) return;
    try {
      await confirmConfig.action();
    } finally {
      setConfirmConfig(null);
    }
  }, [confirmConfig]);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    setSelectionMode(false);
    setSelectedIds(new Set());
    setLoading(true);
    loadDocuments(activeWorkspaceId);

    // Listen for ESC key to exit selection mode
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectionMode) {
        setSelectionMode(false);
        setSelectedIds(new Set());
      }
    }

    const handleDocumentsChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail as { workspaceId?: string } | undefined;
      if (!detail || !detail.workspaceId || detail.workspaceId === activeWorkspaceId) {
        loadDocuments(activeWorkspaceId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('documentsChanged', handleDocumentsChanged);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('documentsChanged', handleDocumentsChanged);
    };
  }, [selectionMode, activeWorkspaceId, loadDocuments]);

  async function handleRestore(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    await restoreDocument(id);
    loadDocuments(activeWorkspaceId);
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
  }

  const handlePermanentDelete = useCallback((id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    const workspaceId = activeWorkspaceId;
    setConfirmConfig({
      title: 'Delete Forever',
      description: `Permanently delete "${title || 'Untitled'}"? This cannot be undone.`,
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      variant: 'destructive',
      action: async () => {
        try {
          await permanentlyDeleteDocument(id);
          await loadDocuments(workspaceId);
          window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
        } catch (error) {
          console.error('Failed to delete document permanently:', error);
          alert('Failed to delete document permanently');
        }
      },
    });
  }, [activeWorkspaceId, loadDocuments]);

  const handleEmptyTrash = useCallback(() => {
    if (documents.length === 0 || !activeWorkspaceId) return;
    const workspaceId = activeWorkspaceId;
    const ids = documents.map((doc) => doc.id);
    setConfirmConfig({
      title: 'Empty Trash',
      description: `Permanently delete all ${ids.length} documents? This cannot be undone.`,
      confirmText: 'Empty Trash',
      cancelText: 'Cancel',
      variant: 'destructive',
      action: async () => {
        try {
          await Promise.all(ids.map((id) => permanentlyDeleteDocument(id)));
          await loadDocuments(workspaceId);
          window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
        } catch (error) {
          console.error('Failed to empty trash:', error);
          alert('Failed to empty trash');
        }
      },
    });
  }, [documents, activeWorkspaceId, loadDocuments]);

  const handleRestoreAll = useCallback(() => {
    if (documents.length === 0 || !activeWorkspaceId) return;
    const workspaceId = activeWorkspaceId;
    const ids = documents.map((doc) => doc.id);
    setConfirmConfig({
      title: 'Restore All',
      description: `Restore all ${ids.length} document(s) from trash?`,
      confirmText: 'Restore All',
      cancelText: 'Cancel',
      variant: 'default',
      action: async () => {
        try {
          await Promise.all(ids.map((id) => restoreDocument(id)));
          await loadDocuments(workspaceId);
          window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
        } catch (error) {
          console.error('Failed to restore documents:', error);
          alert('Failed to restore documents');
        }
      },
    });
  }, [documents, activeWorkspaceId, loadDocuments]);

  function handleSelectDocument(docId: string, checked: boolean) {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(docId);
    } else {
      newSelected.delete(docId);
    }
    setSelectedIds(newSelected);
  }

  function handleToggleSelectionMode() {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedIds(new Set());
    }
  }

  function handleSelectAll() {
    setSelectedIds(new Set(documents.map(doc => doc.id)));
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  const handleBulkRestore = useCallback(() => {
    if (selectedIds.size === 0 || !activeWorkspaceId) return;
    const workspaceId = activeWorkspaceId;
    const ids = Array.from(selectedIds);
    setConfirmConfig({
      title: 'Restore Documents',
      description: `Restore ${ids.length} document(s) from trash?`,
      confirmText: 'Restore',
      cancelText: 'Cancel',
      action: async () => {
        try {
          await Promise.all(ids.map((id) => restoreDocument(id)));
          setSelectedIds(new Set());
          setSelectionMode(false);
          await loadDocuments(workspaceId);
          window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
        } catch (error) {
          console.error('Failed to restore selected documents:', error);
          alert('Failed to restore selected documents');
        }
      },
    });
  }, [activeWorkspaceId, selectedIds, loadDocuments]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0 || !activeWorkspaceId) return;
    const workspaceId = activeWorkspaceId;
    const ids = Array.from(selectedIds);
    setConfirmConfig({
      title: 'Delete Forever',
      description: `Permanently delete ${ids.length} document(s)? This cannot be undone.`,
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      variant: 'destructive',
      action: async () => {
        try {
          await Promise.all(ids.map((id) => permanentlyDeleteDocument(id)));
          setSelectedIds(new Set());
          setSelectionMode(false);
          await loadDocuments(workspaceId);
          window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
        } catch (error) {
          console.error('Failed to delete selected documents permanently:', error);
          alert('Failed to delete selected documents');
        }
      },
    });
  }, [activeWorkspaceId, selectedIds, loadDocuments]);

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Trash</h1>
            <p className="text-muted-foreground mt-2">
              {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Workspace: {activeWorkspace?.name ?? 'Loading...'}
            </p>
          </div>
          {documents.length > 0 && (
            <div className="flex items-center gap-2">
              {selectionMode && selectedIds.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              )}
              {selectionMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
              )}
              {!selectionMode && (
                <>
                  <Button variant="outline" onClick={handleRestoreAll}>
                    <ArchiveRestore className="w-4 h-4 mr-2" />
                    Restore All
                  </Button>
                  <Button variant="destructive" onClick={handleEmptyTrash}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Empty Trash
                  </Button>
                </>
              )}
              <Button
                variant={selectionMode ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleSelectionMode}
              >
                {selectionMode ? 'Cancel' : 'Select'}
              </Button>
            </div>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-16">
            <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">Trash is empty</p>
            <Button variant="outline" onClick={() => router.push('/')}>
              Go to All Documents
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="relative bg-card rounded-xl border transition-all overflow-hidden hover:border-primary/50 hover:shadow-lg"
              >
                <div className="p-6 h-40 flex flex-col">
                  <div className="flex items-start gap-3">
                    {selectionMode && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(doc.id)}
                          onCheckedChange={(checked) => handleSelectDocument(doc.id, checked as boolean)}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <h2 className={cn('text-lg font-semibold', FONT_CLASS_MAP[doc.font ?? 'sans'])}>
                          {doc.title || 'Untitled'}
                        </h2>
                      </div>
                      <p className={cn('text-sm text-muted-foreground', FONT_CLASS_MAP[doc.font ?? 'sans'])}>
                        Deleted {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {!selectionMode && (
                    <div className="mt-auto flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={(e) => handleRestore(doc.id, e)}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => handlePermanentDelete(doc.id, doc.title, e)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Forever
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk actions toolbar for trash */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-primary text-primary-foreground rounded-full shadow-lg px-6 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">{selectedIds.size} selected</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkRestore}
                className="hover:bg-primary-foreground/20 text-primary-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkDelete}
                className="hover:bg-primary-foreground/20 text-primary-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Forever
              </Button>
              
              <div className="w-px h-6 bg-primary-foreground/20" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="hover:bg-primary-foreground/20 text-primary-foreground"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}

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
