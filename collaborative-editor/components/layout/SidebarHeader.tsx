'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

interface SidebarHeaderProps {
  onSearch: () => void;
}

export function SidebarHeader({ onSearch }: SidebarHeaderProps) {
  return (
    <div className="p-4 border-b space-y-3">
      <WorkspaceSwitcher />
      <Button 
        onClick={onSearch} 
        variant="outline" 
        className="w-full justify-start"
        size="sm"
      >
        <Search className="w-4 h-4 mr-2" />
        Search
        <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd>
      </Button>
    </div>
  );
}
