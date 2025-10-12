'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Trash2, FileText, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getDeletedDocuments, restoreDocument, permanentlyDeleteDocument } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useTabs } from '@/contexts/TabsContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function TrashPage() {
  const router = useRouter();
  const { ensureTabExists } = useTabs();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const loadDocuments = useCallback(async (workspaceId: string) => {
    const docs = await getDeletedDocuments(workspaceId);
    setDocuments(docs);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    ensureTabExists('/trash', 'Trash', 'page', 'trash');
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
  }, [selectionMode, ensureTabExists, activeWorkspaceId, loadDocuments]);

  async function handleRestore(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    await restoreDocument(id);
    loadDocuments(activeWorkspaceId);
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
  }

  async function handlePermanentDelete(id: string, title: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    if (confirm(`Permanently delete "${title || 'Untitled'}"? This cannot be undone.`)) {
      await permanentlyDeleteDocument(id);
      loadDocuments(activeWorkspaceId);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
    }
  }

  async function handleEmptyTrash() {
    if (documents.length === 0) return;
    if (!activeWorkspaceId) return;
    
    if (confirm(`Permanently delete all ${documents.length} documents? This cannot be undone.`)) {
      await Promise.all(documents.map(doc => permanentlyDeleteDocument(doc.id)));
      loadDocuments(activeWorkspaceId);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
    }
  }

  async function handleRestoreAll() {
    if (documents.length === 0) return;
    if (!activeWorkspaceId) return;
    
    if (confirm(`Restore all ${documents.length} document(s) from trash?`)) {
      await Promise.all(documents.map(doc => restoreDocument(doc.id)));
      loadDocuments(activeWorkspaceId);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
    }
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

  async function handleBulkRestore() {
    if (selectedIds.size === 0) return;
    if (!activeWorkspaceId) return;
    
    if (confirm(`Restore ${selectedIds.size} document(s) from trash?`)) {
      await Promise.all(Array.from(selectedIds).map(id => restoreDocument(id)));
      setSelectedIds(new Set());
      setSelectionMode(false);
      loadDocuments(activeWorkspaceId);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!activeWorkspaceId) return;
    
    if (confirm(`Permanently delete ${selectedIds.size} document(s)? This cannot be undone.`)) {
      await Promise.all(Array.from(selectedIds).map(id => permanentlyDeleteDocument(id)));
      setSelectedIds(new Set());
      setSelectionMode(false);
      loadDocuments(activeWorkspaceId);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
    }
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
          <div className="grid gap-4">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="bg-card p-6 rounded-lg border"
              >
                <div className="flex items-start gap-4">
                  {selectionMode && (
                    <div 
                      className="pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.has(doc.id)}
                        onCheckedChange={(checked) => handleSelectDocument(doc.id, checked as boolean)}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-xl font-semibold">
                          {doc.title || 'Untitled'}
                        </h2>
                      </div>
                      <p className="text-sm text-gray-500">
                        Deleted {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!selectionMode && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleRestore(doc.id, e)}
                        >
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
    </div>
  );
}
