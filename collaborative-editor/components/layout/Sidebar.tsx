'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarDocumentList } from './SidebarDocumentList';
import { SidebarFooter } from './SidebarFooter';
import {
  getAllDocumentsMetadata,
  getRecentDocumentsMetadata,
  getDeletedDocuments,
  getFavoriteDocumentsMetadata,
  createDocument,
  getDocumentTreeMetadata
} from '@/lib/db/documents';
import type { Document, DocumentMetadata, DocumentNodeMetadata } from '@/lib/db/types';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuthContext } from '@/contexts/AuthContext';

interface SidebarProps {
  onSearchOpen: () => void;
  onShowShortcuts: () => void;
}

export function Sidebar({ onSearchOpen, onShowShortcuts }: SidebarProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const { activeWorkspaceId } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [documentTree, setDocumentTree] = useState<DocumentNodeMetadata[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<DocumentMetadata[]>([]);
  const [favoriteDocuments, setFavoriteDocuments] = useState<DocumentMetadata[]>([]);
  const [trashedDocuments, setTrashedDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  const loadDocuments = useCallback(async (workspaceId: string) => {
    setIsLoadingDocuments(true);
    try {
      const [all, recent, favorites, trashed, tree] = await Promise.all([
        getAllDocumentsMetadata(workspaceId),
        getRecentDocumentsMetadata(workspaceId),
        getFavoriteDocumentsMetadata(workspaceId),
        getDeletedDocuments(workspaceId),
        getDocumentTreeMetadata(workspaceId),
      ]);
      setDocuments(all);
      setRecentDocuments(recent);
      setFavoriteDocuments(favorites);
      setTrashedDocuments(trashed);
      setDocumentTree(tree);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  // Helper function to update a single document in the tree
  const updateDocumentInTree = useCallback((nodes: DocumentNodeMetadata[], documentId: string, updatedDoc: Partial<Document>): DocumentNodeMetadata[] => {
    return nodes.map(node => {
      if (node.id === documentId) {
        return { ...node, ...updatedDoc };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateDocumentInTree(node.children, documentId, updatedDoc)
        };
      }
      return node;
    });
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId || !user || authLoading) return;

    loadDocuments(activeWorkspaceId);

    const handleDataChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail as { workspaceId?: string } | undefined;
      if (!detail || !detail.workspaceId || detail.workspaceId === activeWorkspaceId) {
        loadDocuments(activeWorkspaceId);
      }
    };

    const handleDocumentUpdated = (event: Event) => {
      const detail = event as CustomEvent<{
        workspaceId: string;
        documentId: string;
        document: Document;
        operation?: string;
      }>;

      if (detail.detail.workspaceId === activeWorkspaceId) {
        // Update the specific document in all relevant state arrays
        const { document: updatedDoc, documentId } = detail.detail;

        // Update documents array
        setDocuments(prev => prev.map(doc =>
          doc.id === documentId ? { ...doc, ...updatedDoc } : doc
        ));

        // Update recent documents if needed
        setRecentDocuments(prev => prev.map(doc =>
          doc.id === documentId ? { ...doc, ...updatedDoc } : doc
        ));

        // Update favorite documents if needed
        setFavoriteDocuments(prev => prev.map(doc =>
          doc.id === documentId ? { ...doc, ...updatedDoc } : doc
        ));

        // Update document tree
        setDocumentTree(prev => updateDocumentInTree(prev, documentId, updatedDoc));
      }
    };

    window.addEventListener('documentsChanged', handleDataChanged);
    window.addEventListener('documentUpdated', handleDocumentUpdated);
    window.addEventListener('activeWorkspaceChanged', handleDataChanged);

    return () => {
      window.removeEventListener('documentsChanged', handleDataChanged);
      window.removeEventListener('documentUpdated', handleDocumentUpdated);
      window.removeEventListener('activeWorkspaceChanged', handleDataChanged);
    };
  }, [activeWorkspaceId, loadDocuments, user, authLoading, updateDocumentInTree]);

  useEffect(() => {
    // Reset loading state when user or workspace changes
    setIsLoadingDocuments(true);
    setDocumentTree([]);
  }, [activeWorkspaceId, user]);

  async function handleNewDocument() {
    if (!activeWorkspaceId || !user) return;

    const doc = await createDocument('Untitled', activeWorkspaceId);
    router.push(`/dashboard/documents/${doc.id}`);
    loadDocuments(activeWorkspaceId);
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
  }

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="glass"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-60 glass"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-45 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 neu-card border-0 flex flex-col z-40 transition-transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarHeader onSearch={onSearchOpen} />

        <SidebarNav
          allCount={documents.length}
          recentCount={recentDocuments.length}
          favoritesCount={favoriteDocuments.length}
          trashCount={trashedDocuments.length}
        />

        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Documents
          </div>
          <Button
            variant="glass"
            size="icon-sm"
            onClick={handleNewDocument}
            title="New Document (⌘N)"
            className="glass"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className='flex-1 overflow-hidden px-3'>
          {user ? (
            <SidebarDocumentList
              documents={documentTree}
              userId={user.id}
              isLoading={isLoadingDocuments || authLoading}
            />
          ) : (
            <SidebarDocumentList
              documents={[]}
              userId=""
              isLoading={true}
            />
          )}
        </div>

        <SidebarFooter onShowShortcuts={onShowShortcuts} />
      </aside>
    </>
  );
}
