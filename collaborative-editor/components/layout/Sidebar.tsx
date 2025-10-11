'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarDocumentList } from './SidebarDocumentList';
import { SidebarFooter } from './SidebarFooter';
import { getAllDocuments, getRecentDocuments, getDeletedDocuments, getFavoriteDocuments, createDocument } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';

interface SidebarProps {
  onSearchOpen: () => void;
  onShowShortcuts: () => void;
}

export function Sidebar({ onSearchOpen, onShowShortcuts }: SidebarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [favoriteDocuments, setFavoriteDocuments] = useState<Document[]>([]);
  const [trashedDocuments, setTrashedDocuments] = useState<Document[]>([]);

  useEffect(() => {
    loadDocuments();
    
    // Listen for document changes
    const handleDocumentsChanged = () => {
      loadDocuments();
    };
    
    window.addEventListener('documentsChanged', handleDocumentsChanged);
    return () => window.removeEventListener('documentsChanged', handleDocumentsChanged);
  }, []);

  async function loadDocuments() {
    const [all, recent, favorites, trashed] = await Promise.all([
      getAllDocuments(),
      getRecentDocuments(),
      getFavoriteDocuments(),
      getDeletedDocuments(),
    ]);
    setDocuments(all);
    setRecentDocuments(recent);
    setFavoriteDocuments(favorites);
    setTrashedDocuments(trashed);
  }

  async function handleNewDocument() {
    const doc = await createDocument();
    router.push(`/documents/${doc.id}`);
    loadDocuments();
    window.dispatchEvent(new Event('documentsChanged'));
  }

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
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

        <div className="px-2 pt-2 pb-1 flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground px-3">
            DOCUMENTS
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleNewDocument}
            title="New Document (⌘N)"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <SidebarDocumentList documents={documents} />

        <div className="flex-1" />

        <SidebarFooter onShowShortcuts={onShowShortcuts} />
      </aside>
    </>
  );
}
