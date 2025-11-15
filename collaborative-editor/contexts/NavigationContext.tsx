'use client';

import { createContext, useContext, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface NavigationContextType {
  openDocument: (id: string, title: string) => void;
  openPage: (path: string, title: string) => void;
  navigateToDocument: (id: string) => void;
  navigateToPage: (path: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const openDocument = useCallback((id: string, title: string) => {
    // Simply navigate to the document, replacing current view
    router.push(`/documents/${id}`);
  }, [router]);

  const openPage = useCallback((path: string, title: string) => {
    // Simply navigate to the page, replacing current view
    router.push(path);
  }, [router]);

  const navigateToDocument = useCallback((id: string) => {
    router.push(`/documents/${id}`);
  }, [router]);

  const navigateToPage = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  return (
    <NavigationContext.Provider value={{
      openDocument,
      openPage,
      navigateToDocument,
      navigateToPage
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}