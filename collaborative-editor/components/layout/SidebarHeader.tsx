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
      <div className="p-5 border-b border-border/30 space-y-3">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded-2xl mb-3"></div>
          <div className="h-8 bg-muted rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 border-b border-border/30 space-y-3">
      <WorkspaceSwitcher />
      <Button
        onClick={onSearch}
        variant="neu"
        className="w-full justify-start h-10 text-muted-foreground"
        size="sm"
        disabled={!user}
      >
        <Search className="w-4 h-4 mr-3" />
        Search
        <kbd className="ml-auto px-2 py-0.5 text-xs bg-muted/80 rounded-md border border-border/50">⌘K</kbd>
      </Button>
    </div>
  );
}
