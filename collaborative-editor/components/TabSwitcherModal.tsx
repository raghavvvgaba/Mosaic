'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Search, Plus } from 'lucide-react';
import { getAllDocuments, createDocument } from '@/lib/db/documents';
import { useTabs } from '@/contexts/TabsContext';
import type { Document } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface TabSwitcherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TabSwitcherModal({ open, onOpenChange }: TabSwitcherModalProps) {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const { openTab } = useTabs();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();

  useEffect(() => {
    if (open && activeWorkspaceId) {
      loadDocuments(activeWorkspaceId);
      setQuery(''); // Reset search when opening
    }
  }, [open, activeWorkspaceId]);

  async function loadDocuments(workspaceId: string) {
    const docs = await getAllDocuments(workspaceId);
    setDocuments(docs);
  }

  async function handleCreateNew() {
    if (!activeWorkspaceId) return;
    const doc = await createDocument(undefined, activeWorkspaceId);
    openTab(doc.id, doc.title);
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
    onOpenChange(false);
  }

  function handleDocumentClick(doc: Document) {
    openTab(doc.id, doc.title);
    onOpenChange(false);
  }

  const filteredDocs = query.length > 0
    ? documents.filter(doc => 
        doc.title.toLowerCase().includes(query.toLowerCase())
      )
    : documents;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[600px] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Open in New Tab</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Workspace: {activeWorkspace?.name ?? 'Loading...'}
          </p>
        </DialogHeader>

        {/* Create new note button */}
        <div className="px-4 pt-4">
          <Button
            onClick={handleCreateNew}
            className="w-full justify-start"
            variant="outline"
            disabled={!activeWorkspaceId}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create new note
          </Button>
        </div>

        {/* Search input */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Document list */}
        <div className="overflow-y-auto max-h-[400px] px-2 pb-4">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {query.length > 0
                ? 'No documents match your search in this workspace'
                : 'No documents in this workspace yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {doc.title || 'Untitled'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(doc.updatedAt, { addSuffix: true })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
