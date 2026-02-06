'use client';

import { FolderPlus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
// NOTE: This dialog is preserved for potential future reuse.
// It is currently non-functional as nested document structure has been removed.

interface MoveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  currentParentId?: string;
  workspaceId: string;
  onMoved?: (newParentId: string | null) => void;
}

export function MoveDocumentDialog({
  open,
  onOpenChange,
  documentTitle,
}: MoveDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className="glass w-10 h-10 rounded-xl flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-primary" />
            </div>
            Move &quot;{documentTitle || 'Untitled'}&quot;
          </DialogTitle>
          <DialogDescription className="text-base">
            NOTE: This dialog is preserved for future reuse. Nested document structure has been removed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Document nesting has been removed.</p>
            <p className="text-sm mt-2">This dialog is kept for potential future use.</p>
          </div>
        </div>
 
        <DialogFooter>
          <Button variant="glass" onClick={() => onOpenChange(false)} className="h-10">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
