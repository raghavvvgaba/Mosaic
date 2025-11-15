'use client';

import { useState, createContext, useContext, ReactNode } from 'react';

interface GuestLimitContextType {
  showGuestLimit: (type: 'document' | 'workspace') => void;
  isGuestLimitModalOpen: boolean;
  limitType: 'document' | 'workspace';
  setIsGuestLimitModalOpen: (open: boolean) => void;
  handleGuestLimitSignUp: () => void;
}

const GuestLimitContext = createContext<GuestLimitContextType | null>(null);

export function useGuestLimit() {
  const context = useContext(GuestLimitContext);
  if (!context) {
    throw new Error('useGuestLimit must be used within GuestLimitProvider');
  }
  return context;
}

interface GuestLimitProviderProps {
  children: ReactNode;
}

export function GuestLimitProvider({ children }: GuestLimitProviderProps) {
  const [isGuestLimitModalOpen, setIsGuestLimitModalOpen] = useState(false);
  const [limitType, setLimitType] = useState<'document' | 'workspace'>('document');

  const showGuestLimit = (type: 'document' | 'workspace') => {
    setLimitType(type);
    setIsGuestLimitModalOpen(true);
  };

  const handleGuestLimitSignUp = () => {
    setIsGuestLimitModalOpen(false);
    // Navigate to signup page instead of opening modal
    window.location.href = '/signup';
  };

  return (
    <GuestLimitContext.Provider
      value={{
        showGuestLimit,
        isGuestLimitModalOpen,
        limitType,
        setIsGuestLimitModalOpen,
        handleGuestLimitSignUp
      }}
    >
      {children}
    </GuestLimitContext.Provider>
  );
}