'use client';

import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  category: string;
  shortcuts: Shortcut[];
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    category: 'General',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Search documents' },
      { keys: ['⌘', 'N'], description: 'Create new document' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    category: 'Editor',
    shortcuts: [
      { keys: ['⌘', 'B'], description: 'Bold text' },
      { keys: ['⌘', 'I'], description: 'Italic text' },
      { keys: ['⌘', 'U'], description: 'Underline text' },
      { keys: ['⌘', 'S'], description: 'Save document (auto-saves)' },
      { keys: ['/'], description: 'Open block menu' },
    ],
  },
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Navigate blocks' },
      { keys: ['Tab'], description: 'Indent block' },
      { keys: ['Shift', 'Tab'], description: 'Outdent block' },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Boost your productivity with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {SHORTCUTS.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded border">?</kbd> anytime to view
          shortcuts • Press <kbd className="px-1.5 py-0.5 bg-muted rounded border">Esc</kbd> to
          close
        </div>
      </DialogContent>
    </Dialog>
  );
}
