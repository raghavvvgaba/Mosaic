'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useDocumentsMetadata, useDocumentMutations } from '@/hooks/swr';
import { filterDeletedDocuments } from '@/lib/db/documents';
import type { DocumentMetadata, DocumentFont } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ConfirmDialog } from '@/components/AlertDialog';
import { cn } from '@/lib/utils';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';

export default function TrashPage() {
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspace();
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
    setSelectionMode(false);
    setSelectedIds(new Set());

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
    if (checked) newSelected.add(docId);
    else newSelected.delete(docId);
    setSelectedIds(newSelected);
  }

  function handleToggleSelectionMode() {
    setSelectionMode(!selectionMode);
    if (selectionMode) setSelectedIds(new Set());
  }

  function handleSelectAll() {
    if (documents) {
      if (selectedIds.size === documents.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(documents.map(doc => doc.id)));
      }
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
        <div className="text-muted-foreground animate-pulse">Loading trash...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      <DashboardTopBar 
        selectionMode={selectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        selectedCount={selectedIds.size}
        onSelectAll={handleSelectAll}
        showSelectAll={(documents?.length ?? 0) > 0}
      />

      <main className="flex-1 w-full p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        <div className="container mx-auto max-w-6xl">
          {/* Global Trash Actions (Visible when not selecting) */}
          {!selectionMode && documents && documents.length > 0 && (
             <div className="mb-6 flex gap-3 justify-end">
                <Button variant="outline" size="sm" onClick={handleRestoreAll}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore All
                </Button>
                <Button variant="destructive" size="sm" onClick={handleEmptyTrash}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Empty Trash
                </Button>
             </div>
          )}

          {!documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-card/50 rounded-xl border border-dashed border-border/60">
              <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                <Trash2 className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Trash is empty</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Documents you delete will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5">
              {documents.map((doc) => {
                const isSelected = selectionMode && selectedIds.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      'relative flex flex-col',
                      'bg-card border border-border shadow-sm rounded-lg',
                      'transition-all duration-200 group',
                      selectionMode ? 'cursor-pointer' : 'cursor-default hover:shadow-md hover:border-primary/20',
                      isSelected && 'ring-2 ring-primary border-primary',
                      'p-3 sm:p-5',
                      'min-h-[120px] sm:min-h-[140px]',
                      FONT_CLASS_MAP[doc.font ?? 'sans']
                    )}
                    onClick={(e) => {
                      if (selectionMode) {
                        e.stopPropagation();
                        handleSelectDocument(doc.id, !isSelected);
                      }
                    }}
                  >
                    {/* Selection Checkbox */}
                    {selectionMode && (
                      <div className="absolute top-2 right-2 z-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {}}
                          className={cn(
                            'size-5 rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
                            !isSelected && "bg-background/80 backdrop-blur-sm"
                          )}
                        />
                      </div>
                    )}

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col justify-center items-center text-center space-y-1.5 sm:space-y-2 mt-2 sm:mt-0">
                      <h3 className={cn(
                        'font-medium text-sm sm:text-base line-clamp-2 text-card-foreground transition-colors',
                        !selectionMode && 'group-hover:text-primary'
                      )}>
                        {doc.title || 'Untitled'}
                      </h3>
                      <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Deleted {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-transparent group-hover:border-border/30 transition-colors h-8 opacity-0 group-hover:opacity-100">
                      {!selectionMode && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => handleRestore(doc.id, e)}
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            title="Restore"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => handlePermanentDelete(doc.id, doc.title, e)}
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete Forever"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />

      {/* Bulk actions toolbar for trash */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-primary text-primary-foreground rounded-full shadow-lg px-6 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <span className="font-medium text-sm whitespace-nowrap">{selectedIds.size} selected</span>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkRestore}
                className="hover:bg-primary-foreground/20 text-primary-foreground h-8 px-2"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkDelete}
                className="hover:bg-primary-foreground/20 text-primary-foreground h-8 px-2"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              
              <div className="w-px h-5 bg-primary-foreground/20 mx-1" />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearSelection}
                className="hover:bg-primary-foreground/20 text-primary-foreground h-8 w-8 rounded-full"
              >
                <span className="text-lg">×</span>
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
