'use client';

import { useState } from 'react';
import { Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentActionsMenu } from './DocumentActionsMenu';
import type { DocumentMetadata, DocumentFont } from '@/lib/db/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface DocumentCardProps {
  doc: DocumentMetadata;
  selectionMode: boolean;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onClick: (doc: DocumentMetadata) => void;
  onRename: (doc: DocumentMetadata) => void;
  onDelete: (doc: DocumentMetadata) => void;
  onToggleFavorite: (doc: DocumentMetadata) => void;
}

const FONT_CLASS_MAP: Record<DocumentFont, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

function formatShortTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DocumentCard({
  doc,
  selectionMode,
  isSelected,
  onSelect,
  onClick,
  onRename,
  onDelete,
  onToggleFavorite
}: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        'relative flex flex-col',
        'bg-card border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)] rounded-xl',
        'transition-all duration-300 group',
        selectionMode ? 'cursor-pointer' : 'cursor-pointer hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 hover:-translate-y-0.5',
        isSelected && 'ring-2 ring-primary border-primary shadow-md',
        // Mobile optimization: Smaller padding, compact size
        'p-3 sm:p-5',
        'min-h-[120px] sm:min-h-[140px]',
        FONT_CLASS_MAP[doc.font ?? 'sans']
      )}
      onClick={(e) => {
        if (selectionMode) {
          e.stopPropagation();
          onSelect(doc.id, !isSelected);
        } else {
          onClick(doc);
        }
      }}
    >
      {/* Selection Checkbox (Visible only in selection mode) */}
      {selectionMode && (
        <div className="absolute top-2 right-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => {}} // Handled by parent div click
            className={cn(
              'size-5 rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
              !isSelected && "bg-background/80 backdrop-blur-sm"
            )}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-1.5 sm:space-y-2 mt-2 sm:mt-0">
        <h3
          className={cn(
            'font-medium text-sm sm:text-base break-words text-card-foreground transition-colors',
            !selectionMode && 'group-hover:text-primary'
          )}
        >
          {doc.title || 'Untitled'}
        </h3>
        
        {doc.lastChangedAt && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatShortTime(new Date(doc.lastChangedAt))}</span>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-transparent group-hover:border-border/30 transition-colors h-8">
        {/* Favorite Indicator (Always visible if favorite, or on hover) */}
         <div className="flex-1 flex items-center">
            {(doc.isFavorite || (!selectionMode && !menuOpen)) && (
               <Button
                 variant="ghost" 
                 size="icon-sm"
                 className={cn(
                   "h-6 w-6 sm:h-7 sm:w-7 transition-opacity",
                   doc.isFavorite ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                 )}
                 onClick={(e) => {
                   e.stopPropagation();
                   onToggleFavorite(doc);
                 }}
               >
                 <Star className={cn("w-3.5 h-3.5", doc.isFavorite && "fill-primary")} />
               </Button>
            )}
         </div>

        {/* Three Dots Menu */}
        {!selectionMode && (
          <div className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            menuOpen && "opacity-100" // Keep visible when menu is open
          )}>
            <DocumentActionsMenu 
              documentId={doc.id}
              onRename={() => onRename(doc)}
              onDelete={() => onDelete(doc)}
              onToggleFavorite={() => onToggleFavorite(doc)}
              isFavorite={doc.isFavorite ?? false}
              isOpen={menuOpen}
              onOpenChange={setMenuOpen}
            />
          </div>
        )}
      </div>
    </div>
  );
}
