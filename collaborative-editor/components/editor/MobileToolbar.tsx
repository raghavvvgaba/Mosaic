'use client';

import React from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  CheckSquare,
  Sparkles,
  Undo2,
  Redo2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EditorBlock = { type?: string } & Record<string, unknown>;
type MobileEditor = {
  addStyles?: (styles: Record<string, boolean>) => void;
  getTextCursorPosition?: () => { block?: EditorBlock } | null;
  updateBlock?: (block: EditorBlock, update: Record<string, unknown>) => void;
  undo?: () => void;
  redo?: () => void;
};

interface MobileToolbarProps {
  editor: MobileEditor | null;
  onOpenAIDraft?: () => void;
  className?: string;
}

export function MobileToolbar({ editor, onOpenAIDraft, className }: MobileToolbarProps) {
  if (!editor) return null;

  const toggleBold = () => editor.addStyles?.({ bold: true });
  const toggleItalic = () => editor.addStyles?.({ italic: true });
  const toggleUnderline = () => editor.addStyles?.({ underline: true });
  
  const setHeading = (level: 1 | 2 | 3) => {
    const currentBlock = editor.getTextCursorPosition?.()?.block;
    if (!currentBlock || !editor.updateBlock) return;
    editor.updateBlock(currentBlock, { type: "heading", props: { level } });
  };

  const setParagraph = () => {
    const currentBlock = editor.getTextCursorPosition?.()?.block;
    if (!currentBlock || !editor.updateBlock) return;
    editor.updateBlock(currentBlock, { type: "paragraph" });
  };

  const toggleList = (type: "bulletListItem" | "numberedListItem" | "checkListItem") => {
    const currentBlock = editor.getTextCursorPosition?.()?.block;
    if (!currentBlock || !editor.updateBlock) return;
    if (currentBlock.type === type) {
      setParagraph();
    } else {
      editor.updateBlock(currentBlock, { type });
    }
  };

  return (
    <div className={cn(
      "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-2 py-1 flex items-center gap-1 overflow-x-auto scrollbar-hide pb-safe",
      className
    )}>
      <div className="flex items-center gap-1 pr-2 border-r border-border mr-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => editor.undo?.()}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => editor.redo?.()}>
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 pr-2 border-r border-border mr-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={toggleBold}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={toggleItalic}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={toggleUnderline}>
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 pr-2 border-r border-border mr-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setHeading(1)}>
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setHeading(2)}>
          <Heading2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 pr-2 border-r border-border mr-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => toggleList("bulletListItem")}>
          <List className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => toggleList("numberedListItem")}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => toggleList("checkListItem")}>
          <CheckSquare className="h-4 w-4" />
        </Button>
      </div>

      {onOpenAIDraft && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 shrink-0 text-primary" 
          onClick={onOpenAIDraft}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
