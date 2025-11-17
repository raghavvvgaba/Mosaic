'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Shortcut, ShortcutCategory } from '@/lib/shortcuts/shortcutConfig';
import { matchesShortcut, isMac } from '@/lib/shortcuts/shortcutConfig';
import { createDocument } from '@/lib/db/documents';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  context?: 'global' | 'editor' | 'navigation';
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, context = 'global' } = options;
  const { openDocument } = useNavigation();
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useAuthContext();
  const pathname = usePathname();
  const shortcutsRef = useRef<Shortcut[]>([]);

  // Toast notification function (simple implementation for now)
  const showToast = useCallback((message: string) => {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-background border border-border rounded-lg shadow-lg px-4 py-2 text-sm z-50 animate-in slide-in-from-bottom-2';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('animate-out', 'slide-out-to-bottom-2');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 200);
    }, 2000);
  }, []);

  const createDocumentAndOpen = useCallback(async () => {
    if (!activeWorkspaceId) {
      showToast('Workspace is loading...');
      return;
    }

    try {
      const doc = await createDocument(undefined, activeWorkspaceId);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
      openDocument(doc.id, doc.title);
      showToast('New document created');
    } catch (error) {
      console.error('Failed to create document:', error);
      showToast('Failed to create document');
    }
  }, [activeWorkspaceId, openDocument, showToast]);

  const handleCreateDocument = useCallback(() => {
    void createDocumentAndOpen();
  }, [createDocumentAndOpen]);

  // Helper function to get current document ID from pathname
  const getCurrentDocumentId = useCallback(() => {
    const docMatch = pathname.match(/\/documents\/([^/]+)/);
    return docMatch ? docMatch[1] : null;
  }, [pathname]);

  const duplicateCurrentDocument = useCallback(() => {
    const documentId = getCurrentDocumentId();
    if (!documentId) {
      showToast('Open a document to duplicate it');
      return;
    }
    window.dispatchEvent(new CustomEvent('duplicate-document', { detail: { documentId } }));
  }, [getCurrentDocumentId, showToast]);

  const createSubpageForCurrentDocument = useCallback(() => {
    const documentId = getCurrentDocumentId();
    if (!documentId) {
      showToast('Open a document to create a subpage');
      return;
    }
    window.dispatchEvent(new CustomEvent('create-subpage', { detail: { documentId } }));
    showToast('Creating subpage...');
  }, [getCurrentDocumentId, showToast]);

  const exportCurrentDocument = useCallback(() => {
    const documentId = getCurrentDocumentId();
    if (!documentId) {
      showToast('Open a document to export it');
      return;
    }
    showToast('Opening export dialog...');
    window.dispatchEvent(new CustomEvent('export-document', { detail: { documentId } }));
  }, [getCurrentDocumentId, showToast]);

  const toggleFavorite = useCallback(() => {
    const documentId = getCurrentDocumentId();
    if (!documentId) {
      showToast('Open a document to toggle favorite');
      return;
    }
    window.dispatchEvent(new CustomEvent('toggle-favorite', { detail: { documentId } }));
  }, [getCurrentDocumentId, showToast]);

  const moveToTrash = useCallback(() => {
    const documentId = getCurrentDocumentId();
    if (!documentId) {
      showToast('Open a document to move it to trash');
      return;
    }
    window.dispatchEvent(new CustomEvent('move-to-trash', { detail: { documentId } }));
  }, [getCurrentDocumentId, showToast]);

  const openAIDraft = useCallback(() => {
    const documentId = getCurrentDocumentId();
    if (!documentId) {
      showToast('Open a document to use AI Draft');
      return;
    }
    window.dispatchEvent(new CustomEvent('ai-draft-open', { detail: { documentId } }));
  }, [getCurrentDocumentId, showToast]);

  // Search and navigation
  const openSearch = useCallback(() => {
    showToast('Opening search...');
    // This will trigger the search modal
    window.dispatchEvent(new CustomEvent('open-search'));
  }, [showToast]);

  const showShortcuts = useCallback(() => {
    // This will trigger the shortcuts dialog
    window.dispatchEvent(new CustomEvent('show-shortcuts'));
  }, []);

  // Editor shortcuts (these will be handled by the BlockNote editor)
  const editorBold = useCallback(() => {
    // BlockNote handles this, but we can add custom behavior if needed
    window.dispatchEvent(new CustomEvent('editor-bold'));
  }, []);

  const editorItalic = useCallback(() => {
    window.dispatchEvent(new CustomEvent('editor-italic'));
  }, []);

  const editorUnderline = useCallback(() => {
    window.dispatchEvent(new CustomEvent('editor-underline'));
  }, []);

  // Define all shortcuts
  const shortcuts: Shortcut[] = [
    // General shortcuts
    {
      id: 'search',
      keys: isMac ? ['meta', 'k'] : ['ctrl', 'k'],
      description: 'Search documents',
      category: 'general',
      action: openSearch,
      global: true,
      context: 'global'
    },
    {
      id: 'new-document',
      keys: isMac ? ['meta', 'n'] : ['ctrl', 'n'],
      description: 'Create new document',
      category: 'general',
      action: handleCreateDocument,
      global: true,
      context: 'global'
    },
    {
      id: 'new-subpage',
      keys: isMac ? ['meta', 'alt', 'n'] : ['ctrl', 'alt', 'n'],
      description: 'Create subpage under current document',
      category: 'general',
      action: createSubpageForCurrentDocument,
      global: true,
      context: 'global'
    },
    {
      id: 'show-shortcuts',
      keys: ['shift', '?'],
      description: 'Show keyboard shortcuts',
      category: 'general',
      action: showShortcuts,
      global: true,
      context: 'global'
    },

    // Document shortcuts
    {
      id: 'save-document',
      keys: isMac ? ['meta', 's'] : ['ctrl', 's'],
      description: 'Save document',
      category: 'document',
      action: () => showToast('Document saved'),
      global: true,
      context: 'global'
    },
    {
      id: 'export-document',
      keys: isMac ? ['meta', 'shift', 's'] : ['ctrl', 'shift', 's'],
      description: 'Export document',
      category: 'document',
      action: exportCurrentDocument,
      global: true,
      context: 'global'
    },
    {
      id: 'duplicate-document',
      keys: isMac ? ['meta', 'd'] : ['ctrl', 'd'],
      description: 'Duplicate document',
      category: 'document',
      action: duplicateCurrentDocument,
      global: true,
      context: 'global'
    },
    {
      id: 'ai-draft-open',
      keys: isMac ? ['meta', 'shift', 'g'] : ['ctrl', 'shift', 'g'],
      description: 'Open AI Draft',
      category: 'document',
      action: openAIDraft,
      global: true,
      context: 'global'
    },
    {
      id: 'toggle-favorite',
      keys: isMac ? ['meta', 'shift', 'd'] : ['ctrl', 'shift', 'd'],
      description: 'Toggle favorite',
      category: 'document',
      action: toggleFavorite,
      global: true,
      context: 'global'
    },
    {
      id: 'move-to-trash',
      keys: isMac ? ['meta', 'delete'] : ['ctrl', 'delete'],
      description: 'Move to trash',
      category: 'document',
      action: moveToTrash,
      global: true,
      context: 'global'
    },

    // Editor shortcuts (these are mainly for the BlockNote editor)
    {
      id: 'editor-bold',
      keys: isMac ? ['meta', 'b'] : ['ctrl', 'b'],
      description: 'Bold text',
      category: 'editor',
      action: editorBold,
      global: false,
      context: 'editor'
    },
    {
      id: 'editor-italic',
      keys: isMac ? ['meta', 'i'] : ['ctrl', 'i'],
      description: 'Italic text',
      category: 'editor',
      action: editorItalic,
      global: false,
      context: 'editor'
    },
    {
      id: 'editor-underline',
      keys: isMac ? ['meta', 'u'] : ['ctrl', 'u'],
      description: 'Underline text',
      category: 'editor',
      action: editorUnderline,
      global: false,
      context: 'editor'
    },

    // App shortcuts
    {
      id: 'escape',
      keys: ['escape'],
      description: 'Exit modals/selection mode',
      category: 'app',
      action: () => {
        // Dispatch escape event for modals to handle
        window.dispatchEvent(new CustomEvent('global-escape'));
      },
      global: true,
      context: 'global'
    }
  ];

  // Store shortcuts in ref
  shortcutsRef.current = shortcuts;

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;

    // Check if we're in a BlockNote suggestion menu (slash commands)
    const isInSuggestionMenu = target.closest('[role="menu"]') !== null ||
                              target.closest('[data-suggestion-menu]') !== null ||
                              target.closest('.bn-suggestion-menu-item') !== null;

    // Allow arrow key navigation in suggestion menus
    if (isInSuggestionMenu && (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter' || event.key === 'Escape')) {
      return; // Let the menu handle these keys
    }

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      // Only allow escape and specific shortcuts in input fields
      if (event.key !== 'Escape') return;
    }

    // Check each shortcut
    for (const shortcut of shortcutsRef.current) {
      // Check if shortcut is enabled and matches current context
      if (shortcut.enabled === false) continue;
      if (shortcut.context && shortcut.context !== context) continue;

      // Check if event matches shortcut keys
      if (matchesShortcut(event, shortcut.keys)) {
        event.preventDefault();
        event.stopPropagation();
        
        try {
          const result = shortcut.action();
          if (result && typeof (result as Promise<void>).then === 'function') {
            (result as Promise<void>).catch((error) => {
              console.error(`Error executing shortcut ${shortcut.id}:`, error);
            });
          }
        } catch (error) {
          console.error(`Error executing shortcut ${shortcut.id}:`, error);
        }
        
        return; // Stop after first match
      }
    }
  }, [enabled, context]);

  // Set up event listener
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // Return shortcuts for display in help dialog
  const getShortcutsByCategory = useCallback((category?: ShortcutCategory) => {
    if (category) {
      return shortcutsRef.current.filter(s => s.category === category);
    }
    return shortcutsRef.current;
  }, []);

  return {
    shortcuts: shortcutsRef.current,
    getShortcutsByCategory,
    showToast
  };
}
