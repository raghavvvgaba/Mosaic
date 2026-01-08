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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="glass w-10 h-10 rounded-xl flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-primary" />
            </div>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-base">
            Boost your productivity with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-11"
            autoFocus
          />
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
          {shortcutsByCategory.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No shortcuts found matching "{searchQuery}"</p>
            </div>
          ) : (
            shortcutsByCategory.map(({ category, categoryInfo, shortcuts }) => (
              <div key={category}>
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-foreground uppercase tracking-wide">
                    {categoryInfo.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {categoryInfo.description}
                  </p>
                </div>
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between py-3 px-4 neu-card hover:transform hover:-translate-y-1 transition-all rounded-xl group"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-3 py-1.5 text-xs font-semibold glass rounded-lg border-0 group-hover:bg-white/10 transition-colors">
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

        <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border/30 space-y-2 bg-muted/20 rounded-b-2xl -mx-6 px-6 pb-4">
          <div>
            Press <kbd className="px-2 py-1 bg-muted/60 rounded-md border-0 glass">{formatKeys(['shift', '?'])}</kbd> anytime to view shortcuts
          </div>
          <div>
            Press <kbd className="px-2 py-1 bg-muted/60 rounded-md border-0 glass">Esc</kbd> to close
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
