'use client';

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import "@blocknote/core/fonts/inter.css";
import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { uploadImageToBase64, validateImageFile } from '@/lib/editor/image-upload';
import { useTheme } from 'next-themes';
import type { DocumentFont } from '@/lib/db/types';

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
  documentId, 
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
  });

  const debouncedSave = useDebouncedCallback(
    (content: string) => {
      onSave(content);
    },
    2000
  );

  const handleChange = useCallback(() => {
    const jsonDoc = editor.document as unknown as Array<any>;
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
    const jsonDoc = editor.document as unknown as Array<any>;
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
        const block = { type: 'paragraph', content: [{ type: 'text', text }] } as any
        // Prefer inserting after current block; if current block is empty, replace it
        // @ts-ignore - BlockNote typing may vary across versions
        const cursor = (editor as any).getTextCursorPosition?.()
        const currentBlock = cursor?.block
        if (currentBlock && Array.isArray(currentBlock.content) && currentBlock.content.length === 0) {
          // @ts-ignore
          ;(editor as any).updateBlock?.(currentBlock, block)
        } else if ((editor as any).insertBlocks) {
          // @ts-ignore
          ;(editor as any).insertBlocks?.([block], currentBlock, 'after')
        } else {
          // Fallback: append block at end by setting document
          const doc = (editor as any).document || []
          const next = [...doc, block]
          if ((editor as any).replaceDocument) {
            // @ts-ignore
            ;(editor as any).replaceDocument(next)
          }
        }
      } catch (e) {
        console.error('Failed to insert text into editor', e)
      }
    },
    getContextWindow({ around = 2, maxChars = 1400 } = {}) {
      try {
        const docArr = (editor as any).document as any[];
        if (!Array.isArray(docArr)) return '';
        const cursor = (editor as any).getTextCursorPosition?.();
        const current = cursor?.block;
        const idx = current ? docArr.findIndex((b) => b === current) : -1;
        const start = Math.max(0, idx >= 0 ? idx - around : 0);
        const end = Math.min(docArr.length, idx >= 0 ? idx + around + 1 : Math.min(docArr.length, around * 2));
        const slice = docArr.slice(start, end);
        const extract = (b: any) => {
          const c = b?.content;
          if (Array.isArray(c)) return c.map((x: any) => (typeof x?.text === 'string' ? x.text : '')).join(' ');
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

  // Handle Enter on a slash command like "/ai" to open AI Draft (without auto-opening while typing)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      try {
        const cursor = (editor as any).getTextCursorPosition?.();
        const block = cursor?.block;
        const contentArr = block?.content;
        const plain = Array.isArray(contentArr)
          ? contentArr.map((n: any) => (typeof n?.text === 'string' ? n.text : '')).join('')
          : typeof contentArr === 'string'
          ? contentArr
          : '';
        const norm = (plain || '').trim().toLowerCase();
        if (norm === '/ai' || norm === '/ai draft' || norm === '/aidraft') {
          e.preventDefault();
          e.stopPropagation();
          onOpenAIDraft?.();
          try {
            const emptyBlock = { type: 'paragraph', content: [] } as any;
            (editor as any).updateBlock?.(block, emptyBlock);
          } catch {}
        }
      } catch {
        // ignore
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [editor, onOpenAIDraft]);

  return (
    <div ref={wrapperRef} className={className}>
      <div className="relative">
        {isEmpty && (
          <>
            <div className="pointer-events-none absolute top-2 left-3 z-10 text-muted-foreground select-none">
              Enter text or type / for commands
            </div>
            <button
              type="button"
              onClick={() => onOpenAIDraft?.()}
              className="absolute top-2 right-3 z-10 text-xs rounded-full border bg-background px-2 py-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
            >
              Generate with AI
            </button>
          </>
        )}
        <BlockNoteView
          editor={editor}
          theme={theme === 'dark' ? 'dark' : 'light'}
        />
      </div>
    </div>
  );
});
