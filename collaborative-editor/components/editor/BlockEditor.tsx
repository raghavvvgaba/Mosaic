'use client';

import { useCreateBlockNote, DefaultReactSuggestionItem, getDefaultReactSlashMenuItems, SuggestionMenuController } from "@blocknote/react";
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
import { Sparkles } from 'lucide-react';

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
        >
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
        </BlockNoteView>
      </div>
    </div>
  );
});