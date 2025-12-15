'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { FileText, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getAllDocuments, deleteDocument, toggleFavorite } from '@/lib/db/documents';
import type { Document, DocumentFont } from '@/lib/db/types';
// import { formatDistanceToNow } from 'date-fns';
import { BulkActionsToolbar } from '@/components/BulkActionsToolbar';
import { useNavigation } from '@/contexts/NavigationContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/AlertDialog';

export default function Home() {
  const { openDocument } = useNavigation();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadDocuments = useCallback(async (workspaceId: string) => {
    const docs = await getAllDocuments(workspaceId);
    setDocuments(docs);
    setLoading(false);
  }, []);

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
    if (!activeWorkspaceId) return;

    setSelectionMode(false);
    setSelectedIds(new Set());
    setLoading(true);
    loadDocuments(activeWorkspaceId);

    const handleDocumentsChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail as { workspaceId?: string } | undefined;
      if (!detail || !detail.workspaceId || detail.workspaceId === activeWorkspaceId) {
        loadDocuments(activeWorkspaceId);
      }
    };

    // Listen for ESC key to exit selection mode
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectionModeRef.current) {
        setSelectionMode(false);
        setSelectedIds(new Set());
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('documentsChanged', handleDocumentsChanged);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('documentsChanged', handleDocumentsChanged);
    };
  }, [activeWorkspaceId, loadDocuments]);

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
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(doc.id);
            return next;
          });
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
    if (selectedIds.size === 0 || !activeWorkspaceId) return;
    const workspaceId = activeWorkspaceId;
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
          await loadDocuments(workspaceId);
          window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
        } catch (error) {
          console.error('Failed to move documents to trash:', error);
          alert('Failed to move documents to trash');
        }
      },
    });
  }, [activeWorkspaceId, selectedIds, loadDocuments]);

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
    setSelectedIds(new Set(documents.map(doc => doc.id)));
  }

  const FONT_CLASS_MAP: Record<DocumentFont, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full py-6">
      <div className="w-full pl-2 pr-6 md:pl-4 md:pr-6">
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
                {documents.length} {documents.length === 1 ? 'document' : 'documents'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                Workspace: {activeWorkspace?.name ?? 'Loading...'}
              </p>
            </div>
            {documents.length > 0 && (
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

        {documents.length === 0 ? (
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {documents.map(doc => {
              const isSelected = selectionMode && selectedIds.has(doc.id);
              return (
              <div
                key={doc.id}
                className={cn(
                  'p-4 rounded-2xl transition-all duration-200 group overflow-hidden h-40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
                  'bg-[#0a0f16] shadow-[inset_4px_4px_10px_rgba(0,0,0,0.55),inset_-3px_-3px_6px_rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]',
                  'hover:bg-[#0e161f] hover:shadow-[12px_14px_30px_rgba(0,0,0,0.75),-8px_-8px_20px_rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.12)]',
                  'hover:transform hover:-translate-y-0.5',
                  'cursor-pointer',
                  isSelected && 'ring-2 ring-primary/50',
                  FONT_CLASS_MAP[doc.font ?? 'sans']
                )}
                tabIndex={0}
              >
                {/* Selection checkbox at top right */}
                {selectionMode && (
                  <div
                    className="flex justify-end -mt-1 -mr-1 mb-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectDocument(doc.id, checked as boolean)}
                      className={cn(
                        'size-4 rounded border transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border/70 bg-background/50'
                      )}
                    />
                  </div>
                )}

                {/* Main content */}
                <div
                  className="h-full flex flex-col justify-center"
                  onClick={() => openDocument(doc.id, doc.title)}
                >
                  {/* Inset content area */}
                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] -m-1 transition-all duration-300 border border-transparent hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.08)] hover:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] hover:scale-[1.01] cursor-pointer">
                    <h3
                      className={cn(
                        'text-center font-medium text-sm line-clamp-2 text-slate-200 group-hover:text-primary transition-colors',
                        FONT_CLASS_MAP[doc.font ?? 'sans']
                      )}
                    >
                      {doc.title || 'Untitled'}
                    </h3>
                  </div>

                  {/* Metadata and actions */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-slate-400">
                      Document
                    </div>

                    {!selectionMode && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => handleToggleFavorite(e, doc.id)}
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
                    )}
                  </div>
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
