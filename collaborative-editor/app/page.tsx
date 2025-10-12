'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getAllDocuments, deleteDocument, toggleFavorite } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { BulkActionsToolbar } from '@/components/BulkActionsToolbar';
import { useTabs } from '@/contexts/TabsContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function Home() {
  const { openDocument, ensureTabExists } = useTabs();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const loadDocuments = useCallback(async (workspaceId: string) => {
    const docs = await getAllDocuments(workspaceId);
    setDocuments(docs);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    ensureTabExists('/', 'Home', 'page', 'home');
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
      if (e.key === 'Escape' && selectionMode) {
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
  }, [selectionMode, ensureTabExists, activeWorkspaceId, loadDocuments]);

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

  function handleSelectDocument(docId: string, checked: boolean) {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(docId);
    } else {
      newSelected.delete(docId);
    }
    setSelectedIds(newSelected);
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!activeWorkspaceId) return;
    
    if (confirm(`Move ${selectedIds.size} document(s) to trash?`)) {
      await Promise.all(Array.from(selectedIds).map(id => deleteDocument(id)));
      setSelectedIds(new Set());
      loadDocuments(activeWorkspaceId);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
    }
  }

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">All Documents</h1>
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

        {documents.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No documents yet</p>
            <p className="text-sm text-muted-foreground">
              Click &quot;New Document&quot; in the sidebar to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="relative bg-card rounded-xl border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
              >
                {selectionMode && (
                  <div 
                    className="absolute top-3 left-3 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.has(doc.id)}
                      onCheckedChange={(checked) => handleSelectDocument(doc.id, checked as boolean)}
                    />
                  </div>
                )}
                
                <div 
                  className="p-6 h-40 flex flex-col justify-between"
                  onClick={() => openDocument(doc.id, doc.title)}
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {doc.title || 'Untitled'}
                      </h3>
                      {doc.isFavorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                    </p>
                    
                    {!selectionMode && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleToggleFavorite(e, doc.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Star className={`w-3.5 h-3.5 ${doc.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteDocument(doc.id, doc.title, e)}
                          className="h-8 w-8 p-0 text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
      
      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        onClear={handleClearSelection}
        onDelete={handleBulkDelete}
      />
    </div>
  );
}
