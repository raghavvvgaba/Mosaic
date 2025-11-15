'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarDocumentList } from './SidebarDocumentList';
import { SidebarFooter } from './SidebarFooter';
import { getAllDocuments, getRecentDocuments, getDeletedDocuments, getFavoriteDocuments, createDocument, getDocumentTree, canCreateGuestDocument } from '@/lib/db/documents';
import type { Document, DocumentNode } from '@/lib/db/types';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useGuestLimit } from '@/contexts/GuestLimitContext';

interface SidebarProps {
  onSearchOpen: () => void;
  onShowShortcuts: () => void;
}

export function Sidebar({ onSearchOpen, onShowShortcuts }: SidebarProps) {
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspace();
  const { isAuthenticated, user } = useAuthContext();
  const { showGuestLimit } = useGuestLimit();
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTree, setDocumentTree] = useState<DocumentNode[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [favoriteDocuments, setFavoriteDocuments] = useState<Document[]>([]);
  const [trashedDocuments, setTrashedDocuments] = useState<Document[]>([]);

  const loadDocuments = useCallback(async (workspaceId: string) => {
    const [all, recent, favorites, trashed, tree] = await Promise.all([
      getAllDocuments(workspaceId),
      getRecentDocuments(workspaceId),
      getFavoriteDocuments(workspaceId),
      getDeletedDocuments(workspaceId),
      getDocumentTree(workspaceId),
    ]);
    setDocuments(all);
    setRecentDocuments(recent);
    setFavoriteDocuments(favorites);
    setTrashedDocuments(trashed);
    setDocumentTree(tree);
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    loadDocuments(activeWorkspaceId);

    const handleDataChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail as { workspaceId?: string } | undefined;
      if (!detail || !detail.workspaceId || detail.workspaceId === activeWorkspaceId) {
        loadDocuments(activeWorkspaceId);
      }
    };

    window.addEventListener('documentsChanged', handleDataChanged);
    window.addEventListener('activeWorkspaceChanged', handleDataChanged);

    return () => {
      window.removeEventListener('documentsChanged', handleDataChanged);
      window.removeEventListener('activeWorkspaceChanged', handleDataChanged);
    };
  }, [activeWorkspaceId, loadDocuments]);

  async function handleNewDocument() {
    if (!activeWorkspaceId) return;

    // Check guest limits if not authenticated
    if (!isAuthenticated) {
      const canCreate = await canCreateGuestDocument();
      if (!canCreate) {
        showGuestLimit('document');
        return;
      }
    }

    const doc = await createDocument('Untitled', activeWorkspaceId);
    router.push(`/documents/${doc.id}`);
    loadDocuments(activeWorkspaceId);
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
  }

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-60"
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
        className={`fixed left-0 top-0 h-screen w-64 bg-background border-r flex flex-col z-40 transition-transform md:translate-x-0 ${
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

        <div className="px-2 py-1 flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground px-3">
            DOCUMENTS
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewDocument}
            title="New Document (⌘N)"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className='flex-1 overflow-hidden'>
          <SidebarDocumentList documents={documentTree} />
        </div>

        <SidebarFooter onShowShortcuts={onShowShortcuts} />
      </aside>
    </>
  );
}
