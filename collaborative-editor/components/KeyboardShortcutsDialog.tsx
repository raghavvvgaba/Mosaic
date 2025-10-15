'use client';

import { useEffect, useState, useMemo } from 'react';
import { Keyboard, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatKeys, SHORTCUT_CATEGORIES, type ShortcutCategory } from '@/lib/shortcuts/shortcutConfig';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const { getShortcutsByCategory } = useKeyboardShortcuts({ enabled: false });
  const [searchQuery, setSearchQuery] = useState('');

  // Group shortcuts by category
  const shortcutsByCategory = useMemo(() => {
    const categories: ShortcutCategory[] = ['general', 'navigation', 'document', 'editor', 'app'];
    
    return categories.map(category => {
      const categoryInfo = SHORTCUT_CATEGORIES[category];
      const shortcuts = getShortcutsByCategory(category);
      
      // Filter by search query
      const filteredShortcuts = shortcuts.filter(shortcut =>
        shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortcut.keys.some(key => key.toLowerCase().includes(searchQuery.toLowerCase())) ||
        categoryInfo.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return {
        category,
        categoryInfo,
        shortcuts: filteredShortcuts
      };
    }).filter(cat => cat.shortcuts.length > 0);
  }, [getShortcutsByCategory, searchQuery]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Close dialog with Escape
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Boost your productivity with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {shortcutsByCategory.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No shortcuts found matching “{searchQuery}”
            </div>
          ) : (
            shortcutsByCategory.map(({ category, categoryInfo, shortcuts }) => (
              <div key={category}>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {categoryInfo.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {categoryInfo.description}
                  </p>
                </div>
                <div className="space-y-1">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border group-hover:bg-accent transition-colors">
                          {formatKeys(shortcut.keys)}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t space-y-1">
          <div>
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded border">{formatKeys(['shift', '?'])}</kbd> anytime to view shortcuts
          </div>
          <div>
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded border">Esc</kbd> to close
          </div>
          {searchQuery && (
            <div>
              Found {shortcutsByCategory.reduce((acc, cat) => acc + cat.shortcuts.length, 0)} shortcuts
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
