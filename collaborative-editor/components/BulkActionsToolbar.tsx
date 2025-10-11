'use client';

import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
}

export function BulkActionsToolbar({ selectedCount, onClear, onDelete }: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-primary text-primary-foreground rounded-full shadow-lg px-6 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">{selectedCount} selected</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="hover:bg-primary-foreground/20 text-primary-foreground"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          
          <div className="w-px h-6 bg-primary-foreground/20" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="hover:bg-primary-foreground/20 text-primary-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
