'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { FileText, Trash2, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useDocumentsMetadata, useDocumentMutations } from '@/hooks/swr';
import type { DocumentMetadata, DocumentFont } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { BulkActionsToolbar } from '@/components/BulkActionsToolbar';
import { useNavigation } from '@/contexts/NavigationContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/AlertDialog';

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

export default function Home() {
  const { openDocument } = useNavigation();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const { data: documents, isLoading } = useDocumentsMetadata({
    workspaceId: activeWorkspaceId ?? undefined,
    includeDeleted: true,
  });

  // Filter out deleted documents for dashboard display
  const activeDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter(doc => !doc.isDeleted);
  }, [documents]);

  const { deleteDocument, toggleFavorite } = useDocumentMutations();
  const [greeting, setGreeting] = useState('');
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

  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

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

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeWorkspaceId]);

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
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(doc.id);
            return next;
          });
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

  function handleSelectDocument(docId: string, checked: boolean) {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(docId);
    } else {
      newSelected.delete(docId);
    }
    setSelectedIds(newSelected);
  }

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);
    setConfirmConfig({
      title: 'Move to Trash',
      description: `Move ${idsToDelete.length} document(s) to trash?`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      variant: 'destructive',
      action: async () => {
        try {
          await Promise.all(idsToDelete.map((id) => deleteDocument(id)));
          setSelectedIds(new Set());
        } catch (error) {
          console.error('Failed to move documents to trash:', error);
          alert('Failed to move documents to trash');
        }
      },
    });
  }, [selectedIds, deleteDocument]);

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  function handleToggleSelectionMode() {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Clear selections when exiting selection mode
      setSelectedIds(new Set());
    }
  }

  function handleSelectAll() {
    if (activeDocuments) {
      setSelectedIds(new Set(activeDocuments.map(doc => doc.id)));
    }
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

  return (
    <div className="w-full p-8">
      <div className="container mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {greeting && (
                <p className="text-2xl font-medium text-foreground mb-2 opacity-80">
                  {greeting}
                </p>
              )}
              <h1 className="text-3xl font-bold tracking-tight">All Documents</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {activeDocuments?.length ?? 0} {(activeDocuments?.length ?? 0) === 1 ? 'document' : 'documents'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                Workspace: {activeWorkspace?.name ?? 'Loading...'}
              </p>
            </div>
            {(activeDocuments?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0 ml-6">
                {selectionMode && selectedIds.size > 0 && (
                  <span className="text-sm text-muted-foreground px-3 py-1.5 bg-muted/60 rounded-xl">
                    {selectedIds.size} selected
                  </span>
                )}
                {selectionMode && (
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={handleSelectAll}
                    className="glass"
                  >
                    Select All
                  </Button>
                )}
                <Button
                  variant={selectionMode ? 'default' : 'glass'}
                  size="sm"
                  onClick={handleToggleSelectionMode}
                  className={selectionMode ? '' : 'glass'}
                >
                  {selectionMode ? 'Cancel' : 'Select'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {!activeDocuments || activeDocuments.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center p-4 rounded-2xl transition-all duration-200 bg-[#0a0f16] shadow-[inset_4px_4px_10px_rgba(0,0,0,0.55),inset_-3px_-3px_6px_rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:bg-[#0e161f] hover:shadow-[12px_14px_30px_rgba(0,0,0,0.75),-8px_-8px_20px_rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.12)] hover:transform hover:-translate-y-0.5">
              <FileText className="w-12 h-12 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No documents yet</h3>
            <p className="text-sm text-muted-foreground">
              Click "New Document" in the sidebar to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {activeDocuments.map(doc => {
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
                onClick={(e) => {
                  if (selectionMode) {
                    e.stopPropagation();
                    handleSelectDocument(doc.id, !selectedIds.has(doc.id));
                  } else {
                    openDocument(doc.id, doc.title);
                  }
                }}
              >
                {/* Selection checkbox at top right */}
                {selectionMode && (
                  <div className="flex justify-end -mt-4 -mr-4 mb-2">
                    <Checkbox
                      checked={selectedIds.has(doc.id)}
                      onCheckedChange={(checked) => {
                        // Checkbox state is managed by parent click
                      }}
                      className={cn(
                        'size-4 rounded border transition-colors pointer-events-none',
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
                  {doc.lastChangedAt && (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
                      <Clock className="w-3 h-3" />
                      <span>{formatShortTime(new Date(doc.lastChangedAt))}</span>
                    </div>
                  )}
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
                          handleToggleFavorite(e, doc.id, doc.isFavorite ?? false);
                        }}
                        className={`h-6 w-6 transition-all ${doc.isFavorite ? 'text-yellow-500 opacity-100' : 'hover:bg-accent/20'}`}
                      >
                        <Star className={`w-3 h-3 ${doc.isFavorite ? 'fill-yellow-500' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteDocument(doc, e);
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
      
      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        onClear={handleClearSelection}
        onDelete={handleBulkDelete}
      />

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
