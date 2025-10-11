'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Tab {
  id: string; // document ID or page path (/, /recent, etc.)
  title: string;
  type: 'document' | 'page';
  icon?: string; // icon name for pages
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

  // Load tabs from sessionStorage on mount
  useEffect(() => {
    const savedTabs = sessionStorage.getItem('openTabs');
    const savedActiveTab = sessionStorage.getItem('activeTab');
    
    if (savedTabs) {
      setTabs(JSON.parse(savedTabs));
    }
    
    if (savedActiveTab) {
      setActiveTabId(savedActiveTab);
    }
  }, []);

  // Save tabs to sessionStorage whenever they change
  useEffect(() => {
    if (tabs.length > 0) {
      sessionStorage.setItem('openTabs', JSON.stringify(tabs));
    } else {
      sessionStorage.removeItem('openTabs');
    }
  }, [tabs]);

  // Save active tab to sessionStorage
  useEffect(() => {
    if (activeTabId) {
      sessionStorage.setItem('activeTab', activeTabId);
    }
  }, [activeTabId]);

  // Sync active tab with current pathname
  useEffect(() => {
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
  }, [pathname, activeTabId]);

  const openDocument = useCallback((id: string, title: string) => {
    setTabs(prev => {
      // Check if document is already open in another tab
      const existingTab = prev.find(tab => tab.id === id);
      if (existingTab) {
        // Document already open, don't replace - just switch to it
        return prev;
      }
      
      if (activeTabId) {
        // Replace the active tab with new document
        return prev.map(tab => tab.id === activeTabId ? { id, title, type: 'document' } : tab);
      } else {
        // No tabs exist, create first one
        return [{ id, title, type: 'document' }];
      }
    });
    
    // Navigate to the document
    setActiveTabId(id);
    router.push(`/documents/${id}`);
  }, [activeTabId, router]);

  const openPage = useCallback((path: string, title: string, icon?: string) => {
    setTabs(prev => {
      // Check if page is already open in another tab
      const existingTab = prev.find(tab => tab.id === path);
      if (existingTab) {
        // Page already open, just switch to it
        return prev;
      }
      
      if (activeTabId) {
        // Replace the active tab with new page
        return prev.map(tab => tab.id === activeTabId ? { id: path, title, type: 'page' as const, icon } : tab);
      } else {
        // No tabs exist, create first one
        return [{ id: path, title, type: 'page' as const, icon }];
      }
    });
    
    // Navigate to the page
    setActiveTabId(path);
    router.push(path);
  }, [activeTabId, router]);

  const openTab = useCallback((id: string, title: string) => {
    // Check if document is already open in a tab
    setTabs(prev => {
      const existingTab = prev.find(tab => tab.id === id);
      if (existingTab) {
        // Already open, just switch to it (don't create duplicate)
        return prev;
      }
      // Create new tab for document
      return [...prev, { id, title, type: 'document' }];
    });
    
    // Switch to the tab and navigate
    setActiveTabId(id);
    router.push(`/documents/${id}`);
  }, [router]);

  const closeTab = useCallback((id: string) => {
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
  }, [activeTabId, router, tabs.length]);

  const switchTab = useCallback((id: string) => {
    setActiveTabId(id);
    // Check if it's a page path (starts with /) or a document ID
    const path = id.startsWith('/') ? id : `/documents/${id}`;
    router.push(path);
  }, [router]);

  const updateTabTitle = useCallback((id: string, title: string) => {
    setTabs(prev => 
      prev.map(tab => tab.id === id ? { ...tab, title } : tab)
    );
  }, []);

  const ensureTabExists = useCallback((id: string, title: string, type: 'document' | 'page' = 'document', icon?: string) => {
    setTabs(prev => {
      const existingTab = prev.find(tab => tab.id === id);
      if (!existingTab) {
        return [...prev, { id, title, type, icon }];
      }
      return prev;
    });
  }, []);

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
