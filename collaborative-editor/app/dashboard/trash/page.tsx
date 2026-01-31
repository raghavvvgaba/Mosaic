'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Trash2, ArchiveRestore, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useDocumentsMetadata, useDocumentMutations } from '@/hooks/swr';
import { filterDeletedDocuments } from '@/lib/db/documents';
import type { DocumentMetadata, DocumentFont } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ConfirmDialog } from '@/components/AlertDialog';
import { cn } from '@/lib/utils';

export default function TrashPage() {
  const router = useRouter();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const { data: allDocuments, isLoading } = useDocumentsMetadata({
    workspaceId: activeWorkspaceId ?? undefined,
    includeDeleted: true,
  });
  const { restoreDocument, permanentlyDeleteDocument } = useDocumentMutations();

  const documents = useMemo(() => {
    if (!allDocuments) return [];
    return filterDeletedDocuments(allDocuments);
  }, [allDocuments]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const selectionModeRef = useRef(selectionMode);
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

  const handleConfirmAction = useCallback(async () => {
    if (!confirmConfig) return;
    try {
      await confirmConfig.action();
    } finally {
      setConfirmConfig(null);
    }
  }, [confirmConfig]);

  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  useEffect(() => {
    // Clear selection when workspace changes
    setSelectionMode(false);
    setSelectedIds(new Set());

    // Listen for ESC key to exit selection mode
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectionModeRef.current) {
        setSelectionMode(false);
        setSelectedIds(new Set());
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorkspaceId]);

  async function handleRestore(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await restoreDocument(id);
  }

  const handlePermanentDelete = useCallback((id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      title: 'Delete Forever',
      description: `Permanently delete "${title || 'Untitled'}"? This cannot be undone.`,
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      variant: 'destructive',
      action: async () => {
        try {
          await permanentlyDeleteDocument(id);
        } catch (error) {
          console.error('Failed to delete document permanently:', error);
          alert('Failed to delete document permanently');
        }
      },
    });
  }, [permanentlyDeleteDocument]);

  const handleEmptyTrash = useCallback(() => {
    if (!documents || documents.length === 0) return;
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
        } catch (error) {
          console.error('Failed to empty trash:', error);
          alert('Failed to empty trash');
        }
      },
    });
  }, [documents, permanentlyDeleteDocument]);

  const handleRestoreAll = useCallback(() => {
    if (!documents || documents.length === 0) return;
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
        } catch (error) {
          console.error('Failed to restore documents:', error);
          alert('Failed to restore documents');
        }
      },
    });
  }, [documents, restoreDocument]);

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
    if (documents) {
      setSelectedIds(new Set(documents.map(doc => doc.id)));
    }
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  const handleBulkRestore = useCallback(() => {
    if (selectedIds.size === 0) return;
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
        } catch (error) {
          console.error('Failed to restore selected documents:', error);
          alert('Failed to restore selected documents');
        }
      },
    });
  }, [selectedIds, restoreDocument]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
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
        } catch (error) {
          console.error('Failed to delete selected documents permanently:', error);
          alert('Failed to delete selected documents');
        }
      },
    });
  }, [selectedIds, permanentlyDeleteDocument]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 md:p-8">
      <div className="container mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Trash</h1>
            <p className="text-muted-foreground mt-2">
              {documents?.length ?? 0} {(documents?.length ?? 0) === 1 ? 'document' : 'documents'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Workspace: {activeWorkspace?.name ?? 'Loading...'}
            </p>
          </div>
          {documents && documents.length > 0 && (
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
        </div>

        {!documents || documents.length === 0 ? (
          <div className="text-center py-16">
            <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">Trash is empty</p>
            <Button variant="outline" onClick={() => router.push('/')}>
              Go to All Documents
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {documents.map((doc) => {
              const isSelected = selectionMode && selectedIds.has(doc.id);
              return (
              <div
                key={doc.id}
                className={cn(
                  'p-4 sm:p-5 md:p-6 rounded-2xl transition-all duration-200 group overflow-hidden min-h-[140px] sm:h-36 md:h-40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background flex flex-col',
                  'bg-[#0a0f16] shadow-[inset_4px_4px_10px_rgba(0,0,0,0.55),inset_-3px_-3px_6px_rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]',
                  !selectionMode && 'hover:bg-[#0e161f] hover:shadow-[12px_14px_30px_rgba(0,0,0,0.75),-8px_-8px_20px_rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.12)]',
                  !selectionMode && 'hover:transform hover:-translate-y-0.5',
                  'cursor-pointer',
                  isSelected && 'ring-2 ring-primary/50',
                  FONT_CLASS_MAP[doc.font ?? 'sans']
                )}
              >
                {/* Selection checkbox at top right */}
                {selectionMode && (
                  <div className="flex justify-end -mt-4 -mr-4 mb-2">
                    <Checkbox
                      checked={selectedIds.has(doc.id)}
                      onCheckedChange={(checked) => {
                        handleSelectDocument(doc.id, checked as boolean);
                      }}
                      className={cn(
                        'size-4 rounded border transition-colors',
                        selectedIds.has(doc.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border/70 bg-background/50'
                      )}
                    />
                  </div>
                )}

                {/* Main content */}
                <div className="flex-1 flex flex-col justify-center">
                  <h3
                    className={cn(
                      'text-center font-medium text-sm line-clamp-2 text-slate-200 transition-colors',
                      !selectionMode && 'group-hover:text-primary',
                      FONT_CLASS_MAP[doc.font ?? 'sans']
                    )}
                  >
                    {doc.title || 'Untitled'}
                  </h3>
                  <p className={cn('flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2', FONT_CLASS_MAP[doc.font ?? 'sans'])}>
                    <Clock className="w-3 h-3" />
                    Deleted {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Metadata and actions */}
                <div className="flex items-center justify-end">
                  {!selectionMode && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(doc.id, e);
                        }}
                        className="h-6 w-6 text-green-500 hover:bg-green-500/10 transition-all"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePermanentDelete(doc.id, doc.title, e);
                        }}
                        className="h-6 w-6 text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk actions toolbar for trash */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50">
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
