'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchBar } from '@/components/sidebar/SearchBar';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { TabBar } from '@/components/TabBar';
import { TabSwitcherModal } from '@/components/TabSwitcherModal';
import { useTabs } from '@/contexts/TabsContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Document } from '@/lib/db/types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { openDocument } = useTabs();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tabSwitcherOpen, setTabSwitcherOpen] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({ context: 'global' });

  // Handle custom events from keyboard shortcuts
  useEffect(() => {
    function handleOpenSearch() {
      setSearchOpen(true);
    }

    function handleShowShortcuts() {
      setShortcutsOpen(true);
    }

    function handleOpenTabSwitcher() {
      setTabSwitcherOpen(true);
    }

    function handleGlobalEscape() {
      // Close any open modals
      if (searchOpen) setSearchOpen(false);
      if (shortcutsOpen) setShortcutsOpen(false);
      if (tabSwitcherOpen) setTabSwitcherOpen(false);
    }

    // Register event listeners
    window.addEventListener('open-search', handleOpenSearch);
    window.addEventListener('show-shortcuts', handleShowShortcuts);
    window.addEventListener('open-tab-switcher', handleOpenTabSwitcher);
    window.addEventListener('global-escape', handleGlobalEscape);

    return () => {
      window.removeEventListener('open-search', handleOpenSearch);
      window.removeEventListener('show-shortcuts', handleShowShortcuts);
      window.removeEventListener('open-tab-switcher', handleOpenTabSwitcher);
      window.removeEventListener('global-escape', handleGlobalEscape);
    };
  }, [searchOpen, shortcutsOpen, tabSwitcherOpen]);

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

      {/* Tab Switcher modal */}
      <TabSwitcherModal
        open={tabSwitcherOpen}
        onOpenChange={setTabSwitcherOpen}
      />
    </div>
  );
}
