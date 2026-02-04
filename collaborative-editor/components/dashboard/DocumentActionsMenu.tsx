'use client';

import { 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Star,
  FolderInput 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface DocumentActionsMenuProps {
  onRename: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentActionsMenu({
  onRename,
  onDelete,
  onToggleFavorite,
  isFavorite,
  isOpen,
  onOpenChange
}: DocumentActionsMenuProps) {
  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
          <Pencil className="mr-2 h-4 w-4" />
          <span>Rename</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}>
          <Star className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          <span>{isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</span>
        </DropdownMenuItem>
        {/* Placeholder for Move functionality if implemented */}
        <DropdownMenuItem disabled>
          <FolderInput className="mr-2 h-4 w-4" />
          <span>Move to...</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
