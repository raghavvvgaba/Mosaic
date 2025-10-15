'use client';

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import "@blocknote/core/fonts/inter.css";
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { uploadImageToBase64, validateImageFile } from '@/lib/editor/image-upload';
import { useTheme } from 'next-themes';
import type { DocumentFont } from '@/lib/db/types';

interface BlockEditorProps {
  documentId?: string;
  initialContent?: string;
  onSave: (content: string) => void;
  className?: string;
  font?: DocumentFont;
}

export function BlockEditor({ 
  documentId, 
  initialContent,
  onSave,
  className,
  font,
}: BlockEditorProps) {
  const { theme } = useTheme();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
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
    const content = JSON.stringify(editor.document);
    debouncedSave(content);
  }, [editor, debouncedSave]);

  useEffect(() => {
    return editor.onChange(handleChange);
  }, [editor, handleChange]);

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

  return (
    <div ref={wrapperRef} className={className}>
      <BlockNoteView 
        editor={editor}
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    </div>
  );
}
