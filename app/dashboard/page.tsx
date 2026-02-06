'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { useDocumentsMetadata, useDocumentMutations } from '@/hooks/swr';
import type { DocumentMetadata } from '@/lib/db/types';
import { BulkActionsToolbar } from '@/components/BulkActionsToolbar';
import { useNavigation } from '@/contexts/NavigationContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ConfirmDialog } from '@/components/AlertDialog';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { DocumentCard } from '@/components/dashboard/DocumentCard';
import { RenameDialog } from '@/components/RenameDialog';
import { DocumentListSkeleton } from '@/components/ui/document-list-skeleton';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { openDocument } = useNavigation();
  const { activeWorkspaceId } = useWorkspace();
  const { data: documents, isLoading } = useDocumentsMetadata({
    workspaceId: activeWorkspaceId ?? undefined,
    includeDeleted: true,
  });

  // Filter out deleted documents for dashboard display
  const activeDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter(doc => !doc.isDeleted);
  }, [documents]);

  const { deleteDocument, toggleFavorite, updateDocument, createDocument, isCreating } = useDocumentMutations();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const selectionModeRef = useRef(selectionMode);
  
  const handleCreateDocument = async () => {
    try {
      const newDoc = await createDocument('Untitled', activeWorkspaceId ?? undefined);
      if (newDoc) {
        openDocument(newDoc.id, newDoc.title);
      }
    } catch (error) {
      console.error('Failed to create document:', error);
      alert('Failed to create document');
    }
  };
  
  // Dialog States
  const [renameDoc, setRenameDoc] = useState<DocumentMetadata | null>(null);
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

  const handleConfirmAction = useCallback(async () => {
    if (!confirmConfig) return;
    try {
      await confirmConfig.action();
    } finally {
      setConfirmConfig(null);
    }
  }, [confirmConfig]);

  const handleRename = useCallback(async (newTitle: string) => {
    if (!renameDoc) return;
    try {
      await updateDocument(renameDoc.id, { title: newTitle });
      setRenameDoc(null);
    } catch (error) {
      console.error('Failed to rename document:', error);
      alert('Failed to rename document');
    }
  }, [renameDoc, updateDocument]);

  const handleDeleteDocument = useCallback((doc: DocumentMetadata) => {
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

  async function handleToggleFavorite(doc: DocumentMetadata) {
    await toggleFavorite(doc.id, doc.isFavorite ?? false, activeWorkspaceId ?? undefined);
  }

  function handleSelectDocument(docId: string, checked: boolean) {
    const newSelected = new Set(selectedIds);
    if (checked) newSelected.add(docId);
    else newSelected.delete(docId);
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
          setSelectionMode(false);
        } catch (error) {
          console.error('Failed to move documents to trash:', error);
          alert('Failed to move documents to trash');
        }
      },
    });
  }, [selectedIds, deleteDocument]);

  function handleToggleSelectionMode() {
    setSelectionMode(!selectionMode);
    if (selectionMode) setSelectedIds(new Set());
  }

  function handleSelectAll() {
    if (activeDocuments) {
      if (selectedIds.size === activeDocuments.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(activeDocuments.map(doc => doc.id)));
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <DashboardTopBar 
          selectionMode={false}
          onToggleSelectionMode={() => {}}
          selectedCount={0}
          showSelectAll={false}
        />
        <main className="flex-1 w-full p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto animate-in fade-in duration-500">
          <div className="w-full">
            <DocumentListSkeleton count={10} />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardTopBar 
        selectionMode={selectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        selectedCount={selectedIds.size}
        onSelectAll={handleSelectAll}
        showSelectAll={(activeDocuments?.length ?? 0) > 0}
      />

      <main className="flex-1 w-full p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        <div className="w-full">
          {!activeDocuments || activeDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-card/50 rounded-xl border border-dashed border-border/60">
              <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                <FileText className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No documents yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                Create your first document to get started writing.
              </p>
              <Button 
                onClick={handleCreateDocument} 
                disabled={isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5">
              {activeDocuments.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(doc.id)}
                  onSelect={handleSelectDocument}
                  onClick={(d) => openDocument(d.id, d.title)}
                  onRename={(d) => setRenameDoc(d)}
                  onDelete={handleDeleteDocument}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
      
      {selectionMode && (
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onDelete={handleBulkDelete}
        />
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

      <RenameDialog
        open={!!renameDoc}
        onOpenChange={(open) => !open && setRenameDoc(null)}
        currentTitle={renameDoc?.title ?? ''}
        onRename={handleRename}
      />
    </div>
  );
}
