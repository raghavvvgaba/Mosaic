'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarDocumentList } from './SidebarDocumentList';
import { SidebarFooter } from './SidebarFooter';
import {
  useDocumentsMetadata,
  useDocumentMutations,
} from '@/hooks/swr';
import {
  filterRecentDocuments,
  filterFavoriteDocuments,
  filterDeletedDocuments,
  buildDocumentTreeFromMetadata
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
  const { createDocument } = useDocumentMutations();
  const { data: allDocuments, isLoading } = useDocumentsMetadata({ workspaceId: activeWorkspaceId ?? undefined, includeDeleted: true });
  const [isOpen, setIsOpen] = useState(false);

  // Use useMemo for client-side filtering (performance optimization)
  const recentDocuments = useMemo(() => {
    if (!allDocuments) return [];
    return filterRecentDocuments(allDocuments);
  }, [allDocuments]);

  const favoriteDocuments = useMemo(() => {
    if (!allDocuments) return [];
    return filterFavoriteDocuments(allDocuments);
  }, [allDocuments]);

  const trashedDocuments = useMemo(() => {
    if (!allDocuments) return [];
    return filterDeletedDocuments(allDocuments);
  }, [allDocuments]);

  const documentTree = useMemo(() => {
    if (!allDocuments) return [];
    return buildDocumentTreeFromMetadata(allDocuments);
  }, [allDocuments]);

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
    const handleDocumentUpdated = (event: Event) => {
      const detail = event as CustomEvent<{
        workspaceId: string;
        documentId: string;
        document: Document;
        operation?: string;
      }>;

      if (detail.detail.workspaceId === activeWorkspaceId) {
        // Trigger a revalidate by calling mutate
        // SWR will handle the cache update automatically
        // This event listener is kept for compatibility with existing code
      }
    };

    window.addEventListener('documentUpdated', handleDocumentUpdated);

    return () => {
      window.removeEventListener('documentUpdated', handleDocumentUpdated);
    };
  }, [activeWorkspaceId]);

  async function handleNewDocument() {
    if (!activeWorkspaceId || !user) return;

    try {
      const doc = await createDocument('Untitled', activeWorkspaceId);

      // Navigate to the new document
      router.push(`/dashboard/documents/${doc.id}`);

      // SWR will automatically update the cache through the mutation
    } catch (error) {
      console.error('Failed to create document:', error);
    }
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
          allCount={allDocuments?.length ?? 0}
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
              isLoading={isLoading || authLoading}
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
