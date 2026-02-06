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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="glass px-6 py-3.5 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 rounded-2xl border-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{selectedCount} selected</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="hover:bg-destructive/20 text-destructive h-8"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>

          <div className="w-px h-6 bg-border/30 mx-1" />

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            className="hover:bg-accent/20 text-foreground h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
