'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchBar } from '@/components/sidebar/SearchBar';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { useNavigation } from '@/contexts/NavigationContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Document } from '@/lib/db/types';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { openDocument } = useNavigation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

    function handleGlobalEscape() {
      // Close any open modals
      if (searchOpen) setSearchOpen(false);
      if (shortcutsOpen) setShortcutsOpen(false);
    }

    // Register event listeners
    window.addEventListener('open-search', handleOpenSearch);
    window.addEventListener('show-shortcuts', handleShowShortcuts);
    window.addEventListener('global-escape', handleGlobalEscape);

    return () => {
      window.removeEventListener('open-search', handleOpenSearch);
      window.removeEventListener('show-shortcuts', handleShowShortcuts);
      window.removeEventListener('global-escape', handleGlobalEscape);
    };
  }, [searchOpen, shortcutsOpen]);

  function handleSearchResultClick(doc: Document) {
    openDocument(doc.id, doc.title);
    setSearchOpen(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        onSearchOpen={() => setSearchOpen(true)}
        onShowShortcuts={() => setShortcutsOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main content area */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden transition-all duration-300",
        // On desktop, the sidebar is part of the flex flow, so no margin needed if Sidebar is relative
        // We'll handle layout in Sidebar component to switch between fixed (mobile) and relative (desktop)
      )}>
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
