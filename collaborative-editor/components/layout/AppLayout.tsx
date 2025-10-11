'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchBar } from '@/components/sidebar/SearchBar';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { TabBar } from '@/components/TabBar';
import { useTabs } from '@/contexts/TabsContext';
import type { Document } from '@/lib/db/types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { openDocument } = useTabs();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // ⌘K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      
      // ⌘\ for sidebar toggle (future enhancement)
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        // Toggle sidebar (can implement later)
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSearchResultClick(doc: Document) {
    openDocument(doc.id, doc.title);
    setSearchOpen(false);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        onSearchOpen={() => setSearchOpen(true)} 
        onShowShortcuts={() => setShortcutsOpen(true)}
      />
      
      {/* Main content area */}
      <div className="flex-1 md:ml-64 flex flex-col">
        <TabBar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search Documents</DialogTitle>
          </DialogHeader>
          <SearchBar 
            onResultClick={handleSearchResultClick}
            onClose={() => setSearchOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts dialog */}
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}
