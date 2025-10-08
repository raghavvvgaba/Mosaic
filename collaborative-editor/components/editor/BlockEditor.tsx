'use client';

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import { useCallback, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { uploadImageToBase64, validateImageFile } from '@/lib/editor/image-upload';
import { useTheme } from 'next-themes';

interface BlockEditorProps {
  documentId: string;
  initialContent?: string;
  onSave: (content: string) => void;
}

export function BlockEditor({ 
  documentId, 
  initialContent,
  onSave 
}: BlockEditorProps) {
  const { theme } = useTheme();
  
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

  return (
    <div className="editor-wrapper">
      <BlockNoteView 
        editor={editor}
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    </div>
  );
}
