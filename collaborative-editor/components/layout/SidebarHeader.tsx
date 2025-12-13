'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useAuthContext } from '@/contexts/AuthContext';

interface SidebarHeaderProps {
  onSearch: () => void;
}

export function SidebarHeader({ onSearch }: SidebarHeaderProps) {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="p-4 border-b space-y-3">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded mb-3"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b space-y-3">
      <WorkspaceSwitcher />
      <Button
        onClick={onSearch}
        variant="outline"
        className="w-full justify-start"
        size="sm"
        disabled={!user}
      >
        <Search className="w-4 h-4 mr-2" />
        Search
        <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd>
      </Button>
    </div>
  );
}
