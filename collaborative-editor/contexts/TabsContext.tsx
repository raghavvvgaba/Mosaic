'use client';

import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspace } from './WorkspaceContext';

interface Tab {
  id: string; // document ID or page path (/, /recent, etc.)
  title: string;
  type: 'document' | 'page';
  icon?: string; // icon name for pages
  workspaceId: string;
}

interface TabsContextType {
  tabs: Tab[];
  activeTabId: string | null;
  openDocument: (id: string, title: string) => void;
  openPage: (path: string, title: string, icon?: string) => void;
  openTab: (id: string, title: string) => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  ensureTabExists: (id: string, title: string, type?: 'document' | 'page', icon?: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { activeWorkspaceId } = useWorkspace();

  const getTabsStorageKey = useCallback(
    (workspaceId: string) => `openTabs:${workspaceId}`,
    []
  );

  const getActiveTabStorageKey = useCallback(
    (workspaceId: string) => `activeTab:${workspaceId}`,
    []
  );

  // Load tabs when workspace changes
  useLayoutEffect(() => {
    if (!activeWorkspaceId) {
      setTabs([]);
      setActiveTabId(null);
      return;
    }

    const savedTabs = sessionStorage.getItem(getTabsStorageKey(activeWorkspaceId));
    const savedActiveTab = sessionStorage.getItem(getActiveTabStorageKey(activeWorkspaceId));

    const parsedTabs: Tab[] = savedTabs ? JSON.parse(savedTabs) : [];
    const normalizedTabs = parsedTabs.map((tab) => ({ ...tab, workspaceId: tab.workspaceId ?? activeWorkspaceId }));

    setTabs(normalizedTabs);
    setActiveTabId(savedActiveTab ?? null);
  }, [activeWorkspaceId, getTabsStorageKey, getActiveTabStorageKey]);

  // Save tabs to sessionStorage whenever they change
  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (tabs.length > 0) {
      sessionStorage.setItem(getTabsStorageKey(activeWorkspaceId), JSON.stringify(tabs));
    } else {
      sessionStorage.removeItem(getTabsStorageKey(activeWorkspaceId));
    }
  }, [tabs, activeWorkspaceId, getTabsStorageKey]);

  // Save active tab to sessionStorage
  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (activeTabId) {
      sessionStorage.setItem(getActiveTabStorageKey(activeWorkspaceId), activeTabId);
    } else {
      sessionStorage.removeItem(getActiveTabStorageKey(activeWorkspaceId));
    }
  }, [activeTabId, activeWorkspaceId, getActiveTabStorageKey]);

  // Sync active tab with current pathname
  useEffect(() => {
    if (!activeWorkspaceId) return;
    // Check if it's a document page
    const docMatch = pathname.match(/\/documents\/([^/]+)/);
    if (docMatch) {
      const docId = docMatch[1];
      // Only update if it's actually different to avoid infinite loops
      if (docId !== activeTabId) {
        setActiveTabId(docId);
      }
    } else {
      // It's a page route (/, /recent, /favorites, /trash)
      if (pathname !== activeTabId) {
        setActiveTabId(pathname);
      }
    }
  }, [pathname, activeTabId, activeWorkspaceId]);

  const openDocument = useCallback((id: string, title: string) => {
    if (!activeWorkspaceId) return;
    setTabs(prev => {
      // Check if document is already open in another tab
      const existingTab = prev.find(tab => tab.id === id);
      if (existingTab) {
        // Document already open, don't replace - just switch to it
        return prev;
      }
      
      if (activeTabId) {
        // Replace the active tab with new document
        return prev.map(tab =>
          tab.id === activeTabId
            ? { id, title, type: 'document' as const, workspaceId: activeWorkspaceId }
            : tab
        );
      } else {
        // No tabs exist, create first one
        return [{ id, title, type: 'document' as const, workspaceId: activeWorkspaceId }];
      }
    });
    
    // Navigate to the document
    setActiveTabId(id);
    router.push(`/documents/${id}`);
  }, [activeTabId, router, activeWorkspaceId]);

  const openPage = useCallback((path: string, title: string, icon?: string) => {
    if (!activeWorkspaceId) return;
    setTabs(prev => {
      // Check if page is already open in another tab
      const existingTab = prev.find(tab => tab.id === path);
      if (existingTab) {
        // Page already open, just switch to it
        return prev;
      }
      
      if (activeTabId) {
        // Replace the active tab with new page
        return prev.map(tab =>
          tab.id === activeTabId
            ? { id: path, title, type: 'page' as const, icon, workspaceId: activeWorkspaceId }
            : tab
        );
      } else {
        // No tabs exist, create first one
        return [{ id: path, title, type: 'page' as const, icon, workspaceId: activeWorkspaceId }];
      }
    });
    
    // Navigate to the page
    setActiveTabId(path);
    router.push(path);
  }, [activeTabId, router, activeWorkspaceId]);

  const openTab = useCallback((id: string, title: string) => {
    if (!activeWorkspaceId) return;
    // Check if document is already open in a tab
    setTabs(prev => {
      const existingTab = prev.find(tab => tab.id === id);
      if (existingTab) {
        // Already open, just switch to it (don't create duplicate)
        return prev;
      }
      // Create new tab for document
      return [...prev, { id, title, type: 'document' as const, workspaceId: activeWorkspaceId }];
    });
    
    // Switch to the tab and navigate
    setActiveTabId(id);
    router.push(`/documents/${id}`);
  }, [router, activeWorkspaceId]);

  const closeTab = useCallback((id: string) => {
    if (!activeWorkspaceId) return;
    // Don't allow closing the last tab
    if (tabs.length <= 1) {
      return;
    }

    // First, determine navigation target before updating state
    let shouldNavigate = false;
    let navigationTarget: string | null = null;
    let newActiveId: string | null = null;

    setTabs(prev => {
      const tabIndex = prev.findIndex(tab => tab.id === id);
      const newTabs = prev.filter(tab => tab.id !== id);

      // If closing active tab, determine where to navigate
      if (id === activeTabId) {
        shouldNavigate = true;
        if (newTabs.length > 0) {
          // Switch to previous tab or first tab
          const newActiveTab = tabIndex > 0 ? newTabs[tabIndex - 1] : newTabs[0];
          newActiveId = newActiveTab.id;
          navigationTarget = newActiveTab.type === 'page' 
            ? newActiveTab.id 
            : `/documents/${newActiveTab.id}`;
        }
      }

      return newTabs;
    });

    // Perform navigation after state update
    if (shouldNavigate && navigationTarget) {
      setActiveTabId(newActiveId);
      router.push(navigationTarget);
    }
  }, [activeTabId, router, tabs.length, activeWorkspaceId]);

  const switchTab = useCallback((id: string) => {
    if (!activeWorkspaceId) return;
    setActiveTabId(id);
    // Check if it's a page path (starts with /) or a document ID
    const path = id.startsWith('/') ? id : `/documents/${id}`;
    router.push(path);
  }, [router, activeWorkspaceId]);

  const updateTabTitle = useCallback((id: string, title: string) => {
    setTabs(prev => 
      prev.map(tab => tab.id === id ? { ...tab, title } : tab)
    );
  }, []);

  const ensureTabExists = useCallback((id: string, title: string, type: 'document' | 'page' = 'document', icon?: string) => {
    if (!activeWorkspaceId) return;
    setTabs(prev => {
      const existingTab = prev.find(tab => tab.id === id);
      if (!existingTab) {
        return [...prev, { id, title, type, icon, workspaceId: activeWorkspaceId }];
      }
      return prev;
    });
  }, [activeWorkspaceId]);

  return (
    <TabsContext.Provider value={{ 
      tabs, 
      activeTabId, 
      openDocument,
      openPage,
      openTab, 
      closeTab, 
      switchTab,
      updateTabTitle,
      ensureTabExists 
    }}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabsContext);
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
}
