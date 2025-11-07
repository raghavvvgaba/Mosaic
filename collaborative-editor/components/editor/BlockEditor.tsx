'use client';

import React from 'react';
import { useCreateBlockNote, DefaultReactSuggestionItem, getDefaultReactSlashMenuItems, SuggestionMenuController, FormattingToolbarController, useComponentsContext, useEditorContentOrSelectionChange, getFormattingToolbarItems } from "@blocknote/react";
import { useImproveWriting } from "@/hooks/useImproveWriting";
import { ImproveWritingLoader } from "./ImproveWritingLoader";
import { ImprovedTextDisplay } from "./ImprovedTextDisplay";
import { getSelectedText, getPositionBelowSelection, replaceSelectedText, insertTextBelow } from "@/lib/editor/selection-utils";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import "@blocknote/core/fonts/inter.css";
import { filterSuggestionItems } from "@blocknote/core";
import type { BlockNoteEditor } from "@blocknote/core";
import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { uploadImageToBase64, validateImageFile } from '@/lib/editor/image-upload';
import { useTheme } from 'next-themes';
import type { DocumentFont } from '@/lib/db/types';
import { Sparkles, X } from 'lucide-react';

// Minimal shapes to avoid `any` while remaining version-tolerant
type InlineNode = { type?: string; text?: string } & Record<string, unknown>;
type BlockContent = InlineNode[] | string | undefined;
interface EditorBlock { type?: string; content?: BlockContent; [key: string]: unknown }

// Augment the editor with optional helpers that may vary by version
type MaybeExtraEditor = BlockNoteEditor & {
  getTextCursorPosition?: () => { block?: EditorBlock } | undefined;
  updateBlock?: (oldBlock: EditorBlock, newBlock: EditorBlock) => void;
  insertBlocks?: unknown;
  replaceDocument?: unknown;
};

export interface BlockEditorProps {
  documentId?: string;
  initialContent?: string;
  onSave: (content: string) => void;
  className?: string;
  font?: DocumentFont;
  onOpenAIDraft?: () => void;
}

export interface BlockEditorHandle {
  insertTextAtCursor: (text: string) => void;
  getContextWindow: (opts?: { around?: number; maxChars?: number }) => string;
}

export const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(function BlockEditor({ 
  initialContent,
  onSave,
  className,
  font,
  onOpenAIDraft,
}: BlockEditorProps, ref) {
  const { theme } = useTheme();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isEmpty, setIsEmpty] = useState<boolean>(true);
  const fontKey = font ?? 'sans';
  const fontFamilies = useMemo<Record<DocumentFont, string>>(
    () => ({
      sans: 'var(--font-sans, Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
      serif: 'var(--font-serif, "Iowan Old Style", "Apple Garamond", "Times New Roman", serif)',
      mono: 'var(--font-mono, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    }),
    []
  );
  const fontFamily = fontFamilies[fontKey];
  
  const editor = useCreateBlockNote({
    initialContent: initialContent 
      ? JSON.parse(initialContent) 
      : undefined,
    uploadFile: async (file: File) => {
      try {
        validateImageFile(file);
        const base64Url = await uploadImageToBase64(file);
        return base64Url;
      } catch (error) {
        console.error('Image upload failed:', error);
        throw error;
      }
    },
  }) as unknown as MaybeExtraEditor;

  const debouncedSave = useDebouncedCallback(
    (content: string) => {
      onSave(content);
    },
    2000
  );

  const handleChange = useCallback(() => {
    const jsonDoc = editor.document as unknown as EditorBlock[];
    const content = JSON.stringify(jsonDoc);
    debouncedSave(content);

    try {
      const empty =
        !jsonDoc ||
        jsonDoc.length === 0 ||
        (jsonDoc.length === 1 &&
          jsonDoc[0] &&
          jsonDoc[0].type === 'paragraph' &&
          (!jsonDoc[0].content ||
            (Array.isArray(jsonDoc[0].content) && jsonDoc[0].content.length === 0)));
      setIsEmpty(empty);
    } catch {
      setIsEmpty(false);
    }
  }, [editor, debouncedSave]);

  useEffect(() => {
    return editor.onChange(handleChange);
  }, [editor, handleChange]);

  // Initialize empty state on mount
  useEffect(() => {
    const jsonDoc = editor.document as unknown as EditorBlock[];
    const empty =
      !jsonDoc ||
      jsonDoc.length === 0 ||
      (jsonDoc.length === 1 &&
        jsonDoc[0] &&
        jsonDoc[0].type === 'paragraph' &&
        (!jsonDoc[0].content || (Array.isArray(jsonDoc[0].content) && jsonDoc[0].content.length === 0)));
    setIsEmpty(empty);
  }, [editor]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    wrapper.style.setProperty('--bn-font-family', fontFamily);
    wrapper.style.setProperty('font-family', fontFamily, 'important');
    wrapper
      .querySelectorAll<HTMLElement>('.bn-default-styles, .bn-block-content, .bn-inline-content, .bn-editor')
      .forEach((node) => {
        node.style.setProperty('font-family', fontFamily, 'important');
      });
  }, [fontFamily]);

  useImperativeHandle(ref, () => ({
    insertTextAtCursor(text: string) {
      try {
        // Create a paragraph block with text
        const block: EditorBlock = { type: 'paragraph', content: [{ type: 'text', text }] };
        // Prefer inserting after current block; if current block is empty, replace it
        const cursor = editor.getTextCursorPosition?.();
        const currentBlock = cursor?.block;
        if (currentBlock && Array.isArray(currentBlock.content) && currentBlock.content.length === 0) {
          (editor as unknown as { updateBlock?: (a: unknown, b: unknown) => void }).updateBlock?.(currentBlock, block);
        } else {
          // Try insertBlocks when available
          const insertBlocks = editor.insertBlocks as unknown as ((blocks: unknown[], target?: unknown, position?: 'after' | 'before' | 'replace') => void) | undefined;
          insertBlocks?.([block], currentBlock, 'after');
          // Fallback: append block at end by setting document when insertBlocks is unavailable
          if (!insertBlocks) {
            const doc = (editor as unknown as { document?: EditorBlock[] }).document ?? [];
            const next: EditorBlock[] = [...doc, block];
            const replaceDocument = editor.replaceDocument as unknown as ((doc: unknown[]) => void) | undefined;
            replaceDocument?.(next as unknown[]);
          }
        }
      } catch (e) {
        console.error('Failed to insert text into editor', e);
      }
    },
    getContextWindow({ around = 2, maxChars = 1400 } = {}) {
      try {
        const docArr = (editor as unknown as { document?: EditorBlock[] }).document ?? [];
        if (!Array.isArray(docArr)) return '';
        const cursor = editor.getTextCursorPosition?.();
        const current = cursor?.block;
        const idx = current ? (docArr as EditorBlock[]).findIndex((b) => b === current) : -1;
        const start = Math.max(0, idx >= 0 ? idx - around : 0);
        const end = Math.min(docArr.length, idx >= 0 ? idx + around + 1 : Math.min(docArr.length, around * 2));
        const slice = docArr.slice(start, end) as EditorBlock[];
        const extract = (b: EditorBlock) => {
          const c = b?.content;
          if (Array.isArray(c)) return c.map((x: InlineNode) => (typeof x?.text === 'string' ? x.text : '')).join(' ');
          if (typeof c === 'string') return c;
          return '';
        };
        let text = slice.map(extract).filter(Boolean).join('\n').trim();
        if (text.length > maxChars) text = text.slice(0, maxChars);
        return text;
      } catch {
        return '';
      }
    },
  }), [editor]);

  // Custom Slash Menu item to open AI Draft dialog
  const getAiSlashItem = useCallback(() => ({
    title: "AI Draft",
    onItemClick: () => {
      onOpenAIDraft?.();
    },
    aliases: ["ai", "aidraft", "ai draft"],
    group: "AI",
    subtext: "Generate content with AI assistance",
    icon: <Sparkles size={16} />,
  }), [onOpenAIDraft]);

  // State for text selection detection
  const [hasTextSelection, setHasTextSelection] = useState(false);

  // Update selection state when content or selection changes
  useEditorContentOrSelectionChange(() => {
    try {
      const selection = editor.getSelection();
      const hasSelection = selection && selection.blocks.length > 0;
      setHasTextSelection(!!hasSelection);
    } catch {
      setHasTextSelection(false);
    }
  }, editor);

  // Improve Writing functionality
  const improveWriting = useImproveWriting();
  const [overlayPosition, setOverlayPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Handle improve writing click
  const handleImproveWriting = useCallback(() => {
    const selection = getSelectedText(editor);
    if (selection.text && wrapperRef.current) {
      // Calculate position for overlay relative to editor container
      const position = getPositionBelowSelection(selection, wrapperRef.current);
      setOverlayPosition(position);

      // Start the improvement process
      improveWriting.actions.improve(selection.text);
    }
  }, [editor, improveWriting.actions]);

  // Handle improve writing actions
  const handleImproveAction = useCallback((action: 'accept' | 'discard' | 'try-again' | 'insert-below') => {
    switch (action) {
      case 'accept':
        if (improveWriting.state.improvedText) {
          replaceSelectedText(editor, improveWriting.state.improvedText);
        }
        improveWriting.actions.reset();
        setOverlayPosition(null);
        break;
      case 'discard':
        improveWriting.actions.handleAction('discard');
        setOverlayPosition(null);
        break;
      case 'try-again':
        if (improveWriting.state.originalText) {
          improveWriting.actions.improve(improveWriting.state.originalText);
        }
        break;
      case 'insert-below':
        if (improveWriting.state.improvedText) {
          insertTextBelow(editor, improveWriting.state.improvedText);
        }
        improveWriting.actions.reset();
        setOverlayPosition(null);
        break;
    }
  }, [editor, improveWriting]);

  // Get Components context outside of callback
  const Components = useComponentsContext()!;

  // Custom formatting toolbar that extends default items
  const CustomFormattingToolbar = useCallback(() => {
    // Get all default formatting toolbar items
    const defaultItems = getFormattingToolbarItems();

    // Custom Improve Writing button that only shows when text is selected
    const improveWritingButton = hasTextSelection && editor.isEditable ? (
      <Components.FormattingToolbar.Button
        onClick={handleImproveWriting}
        label="Improve Writing"
        mainTooltip="Improve writing with AI assistance"
        icon={<Sparkles size={16} />}
      >
        Improve Writing
      </Components.FormattingToolbar.Button>
    ) : null;

    return (
      <Components.FormattingToolbar.Root className="bn-toolbar bn-formatting-toolbar">
        {[improveWritingButton, ...defaultItems].filter(Boolean)}
      </Components.FormattingToolbar.Root>
    );
  }, [Components, hasTextSelection, editor.isEditable, handleImproveWriting]);
  return (
    <div ref={wrapperRef} className={className}>
      <div className="relative">
        {isEmpty && (
          <>
            <div className="pointer-events-none absolute top-2 left-3 z-10 text-muted-foreground select-none">
              Enter text or type / for commands
            </div>
          </>
        )}
        <BlockNoteView
          editor={editor}
          theme={theme === 'dark' ? 'dark' : 'light'}
          slashMenu={false}
          formattingToolbar={false}
        >
          <FormattingToolbarController formattingToolbar={CustomFormattingToolbar} />
          <SuggestionMenuController
            triggerCharacter={"/"}
            getItems={async (query) =>
              filterSuggestionItems(
                [
                  ...getDefaultReactSlashMenuItems(editor),
                  getAiSlashItem() as unknown as DefaultReactSuggestionItem,
                ],
                query,
              )
            }
          />

          {/* Improve Writing Overlays */}
          {overlayPosition && (
            <div
              className="absolute z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                top: `${overlayPosition.top}px`,
                left: `${overlayPosition.left}px`,
                width: 'max-content', // Allow content to determine width
                maxWidth: '600px', // But cap it for readability
              }}
            >
              {improveWriting.state.loading && (
                <div className="pointer-events-auto animate-in fade-in duration-200">
                  <ImproveWritingLoader />
                </div>
              )}

              {improveWriting.state.error && (
                <div className="pointer-events-auto mt-2 animate-in fade-in duration-200">
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                        <X size={10} />
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {improveWriting.state.error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {improveWriting.state.showResult && improveWriting.state.improvedText && (
                <div className="pointer-events-auto animate-in fade-in slide-in-from-top-1 duration-300">
                  <ImprovedTextDisplay
                    improvedText={improveWriting.state.improvedText}
                    onAction={handleImproveAction}
                  />
                </div>
              )}
            </div>
          )}
        </BlockNoteView>
      </div>
    </div>
  );
});