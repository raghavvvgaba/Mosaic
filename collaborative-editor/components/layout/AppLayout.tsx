'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchBar } from '@/components/sidebar/SearchBar';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { SyncStatusIndicator } from '@/components/sync/SyncStatusIndicator';
import { ConflictResolutionModal } from '@/components/sync/ConflictResolutionModal';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSyncStatus } from '@/lib/sync';
import { syncFacade } from '@/lib/sync/sync-facade';
import type { Document } from '@/lib/db/types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { openDocument } = useNavigation();
  const { user } = useAuthContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [conflictModal, setConflictModal] = useState<{ isOpen: boolean; documentId: string; conflicts: any[] }>({
    isOpen: false,
    documentId: '',
    conflicts: []
  });

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({ context: 'global' });

  // Initialize sync system (only if cloud sync is enabled and user is authenticated)
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_CLOUD_SYNC === 'true' && user) {
      syncFacade.initializeForUser(user).catch(console.error);

      // Cleanup when component unmounts or user changes
      return () => {
        syncFacade.cleanup().catch(console.error);
      };
    }
  }, [user]);

  // Handle sync status (only if cloud sync is enabled and user is authenticated)
  const syncStatus = process.env.NEXT_PUBLIC_ENABLE_CLOUD_SYNC === 'true' && user ? useSyncStatus() : null;
  const isAuthenticated = !!user;

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onSearchOpen={() => setSearchOpen(true)}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Main content area */}
      <div className="flex-1 md:ml-64 flex flex-col">
        {/* Sync Status Bar - Only show for authenticated users */}
        {isAuthenticated && (
          <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
            <div className="flex-1" />
            <SyncStatusIndicator className="text-sm" />
          </div>
        )}

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

      
      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={conflictModal.isOpen}
        onClose={() => setConflictModal({ isOpen: false, documentId: '', conflicts: [] })}
        documentId={conflictModal.documentId}
        conflicts={conflictModal.conflicts}
        onResolved={() => {
          setConflictModal({ isOpen: false, documentId: '', conflicts: [] });
          if (user) {
            syncFacade.forceSyncNow(user).catch(console.error);
          }
        }}
      />
    </div>
  );
}
