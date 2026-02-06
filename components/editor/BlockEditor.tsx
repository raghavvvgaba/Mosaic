'use client';

import React from 'react';
import { useCreateBlockNote, DefaultReactSuggestionItem, getDefaultReactSlashMenuItems, SuggestionMenuController, FormattingToolbarController, useComponentsContext, getFormattingToolbarItems, useBlockNoteEditor, useSelectedBlocks } from "@blocknote/react";
import { useImproveWriting } from "@/hooks/useImproveWriting";
import { ImproveWritingLoader } from "./ImproveWritingLoader";
import { ImprovedTextDisplay } from "./ImprovedTextDisplay";
import { getSelectedText, replaceSelectedText, insertTextBelow } from "@/lib/editor/selection-utils";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import "@blocknote/core/fonts/inter.css";
import { filterSuggestionItems } from "@blocknote/core";
import type { BlockNoteEditor } from "@blocknote/core";
import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { StorageService } from '@/lib/appwrite/storage';
import { useTheme } from 'next-themes';
import type { DocumentFont } from '@/lib/db/types';
import { Sparkles, X } from 'lucide-react';
import { AIAssistantButton } from '@/components/ui/AIAssistantButton';
import { MobileToolbar } from './MobileToolbar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sanitizeMarkdownForInsert } from '@/lib/ai/markdown-insert';

// Minimal shapes to avoid `any` while remaining version-tolerant
type InlineNode = { type?: string; text?: string } & Record<string, unknown>;
type BlockContent = InlineNode[] | string | undefined;
interface EditorBlock { type?: string; content?: BlockContent; [key: string]: unknown }

// Augment the editor with optional helpers that may vary by version
type MaybeExtraEditor = BlockNoteEditor & {
  getTextCursorPosition?: () => { block?: EditorBlock } | undefined;
  updateBlock?: (oldBlock: EditorBlock, newBlock: EditorBlock) => void;
  insertBlocks?: (blocks: unknown[], target?: unknown, position?: 'after' | 'before' | 'replace') => void;
  replaceBlocks?: (blocksToRemove: unknown[], blocksToInsert: unknown[]) => void;
  replaceDocument?: (doc: unknown[]) => void;
  tryParseMarkdownToBlocks?: (markdown: string) => unknown[];
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

// Custom Improve Writing Button component
const ImproveWritingButton = ({ onClick }: { onClick: () => void }) => {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const selectedBlocks = useSelectedBlocks();

  // Only show if there are selected blocks with content
  const hasSelectedText = selectedBlocks.some((block) => {
    const content = (block as EditorBlock).content;
    if (!content) return false;
    if (typeof content === 'string') {
      return content.trim().length > 0;
    }
    if (Array.isArray(content)) {
      return content.some((item) => typeof item?.text === 'string' && item.text.trim().length > 0);
    }
    return false;
  });

  if (!hasSelectedText || !editor.isEditable) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      onClick={onClick}
      label="Improve Writing"
      mainTooltip="Improve writing with AI assistance"
      icon={<Sparkles size={16} />}
    >
      Improve Writing
    </Components.FormattingToolbar.Button>
  );
};

export const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(function BlockEditor({ 
  initialContent,
  onSave,
  className,
  font,
  onOpenAIDraft,
}: BlockEditorProps, ref) {
  const { theme } = useTheme();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [imageUpload, setImageUpload] = useState({
    loading: false,
    error: null as string | null,
  });
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

  // Show toast notifications for image upload status
  useEffect(() => {
    if (imageUpload.loading) {
      const toastId = toast.loading('Uploading image...');

      // Handle toast state when upload completes or fails
      return () => {
        if (!imageUpload.loading && !imageUpload.error) {
          toast.success('Image uploaded successfully', { id: toastId });
        } else if (imageUpload.error) {
          toast.error(imageUpload.error, { id: toastId });
        } else {
          toast.dismiss(toastId);
        }
      };
    }
  }, [imageUpload.loading, imageUpload.error]);

  const editor = useCreateBlockNote({
    initialContent: initialContent 
      ? JSON.parse(initialContent) 
      : undefined,
    uploadFile: async (file: File) => {
      setImageUpload({ loading: true, error: null });
      try {
        const imageUrl = await StorageService.uploadDocumentImage(file);
        setImageUpload({ loading: false, error: null });
        return imageUrl;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
        setImageUpload({ loading: false, error: errorMessage });
        console.error('Image upload failed:', error);
        throw error instanceof Error ? error : new Error(errorMessage);
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
      .querySelectorAll<HTMLElement>('.bn-default-styles, .bn-block-content, .bn-inline-content, .bn-editor, .bn-main, .bn-container')
      .forEach((node) => {
        node.style.setProperty('font-family', fontFamily, 'important');
        node.style.setProperty('background-color', 'transparent', 'important');
        node.style.setProperty('background', 'transparent', 'important');
        // Aggressively remove internal padding/margin that might create a "box" look
        if (node.classList.contains('bn-editor') || node.classList.contains('bn-main')) {
          node.style.setProperty('padding-left', '0', 'important');
          node.style.setProperty('padding-right', '0', 'important');
          node.style.setProperty('margin-left', '0', 'important');
          node.style.setProperty('margin-right', '0', 'important');
        }
      });
  }, [fontFamily]);

  // Flush pending saves on unmount to prevent data loss
  useEffect(() => {
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  useImperativeHandle(ref, () => ({
    insertTextAtCursor(text: string) {
      const insertBlocksSafely = (blocksToInsert: unknown[]): boolean => {
        if (!Array.isArray(blocksToInsert) || blocksToInsert.length === 0) return false

        const cursor = editor.getTextCursorPosition?.();
        const currentBlock = cursor?.block as EditorBlock | undefined;
        const isCurrentEmptyBlock =
          !!currentBlock &&
          ((Array.isArray(currentBlock.content) && currentBlock.content.length === 0) ||
            (typeof currentBlock.content === 'string' && currentBlock.content.trim().length === 0));

        if (isCurrentEmptyBlock && typeof editor.replaceBlocks === 'function') {
          editor.replaceBlocks([currentBlock], blocksToInsert);
          return true
        }

        if (currentBlock && typeof editor.insertBlocks === 'function') {
          editor.insertBlocks(blocksToInsert, currentBlock, 'after');
          return true
        }

        const doc = (editor as unknown as { document?: unknown[] }).document ?? [];
        if (doc.length > 0 && typeof editor.insertBlocks === 'function') {
          const lastBlock = doc[doc.length - 1];
          editor.insertBlocks(blocksToInsert, lastBlock, 'after');
          return true
        }

        if (typeof editor.replaceDocument === 'function') {
          editor.replaceDocument([...(doc as unknown[]), ...blocksToInsert]);
          return true
        }

        return false
      }

      try {
        const fallbackBlock: EditorBlock = { type: 'paragraph', content: [{ type: 'text', text }] };
        const sanitizedMarkdown = sanitizeMarkdownForInsert(text);
        const parsedBlocks =
          typeof editor.tryParseMarkdownToBlocks === 'function' && sanitizedMarkdown
            ? editor.tryParseMarkdownToBlocks(sanitizedMarkdown)
            : [];

        if (Array.isArray(parsedBlocks) && parsedBlocks.length > 0) {
          if (insertBlocksSafely(parsedBlocks)) return;
        }

        if (!insertBlocksSafely([fallbackBlock])) {
          console.error('Failed to insert AI draft content: no compatible insertion API found');
        }
      } catch (e) {
        console.error('Failed to insert text into editor', e);
        try {
          const fallbackBlock: EditorBlock = { type: 'paragraph', content: [{ type: 'text', text }] };
          if (!insertBlocksSafely([fallbackBlock])) {
            console.error('Fallback insertion failed: no compatible insertion API found');
          }
        } catch (fallbackError) {
          console.error('Fallback insertion failed', fallbackError);
        }
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

  // Improve Writing functionality
  const improveWriting = useImproveWriting();

  // Handle improve writing click
  const handleImproveWriting = useCallback(() => {
    const selection = getSelectedText(editor);
    if (selection.text) {
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
        break;
      case 'discard':
        improveWriting.actions.handleAction('discard');
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
        break;
    }
  }, [editor, improveWriting]);

  // Custom formatting toolbar that extends default items
  const CustomFormattingToolbar = useCallback(() => {
    // Custom toolbar component that uses the context internally
    const CustomToolbar = () => {
      const Components = useComponentsContext()!;
      const defaultItems = getFormattingToolbarItems();

      return (
        <Components.FormattingToolbar.Root className="bn-toolbar bn-formatting-toolbar">
          <ImproveWritingButton onClick={handleImproveWriting} />
          {defaultItems}
        </Components.FormattingToolbar.Root>
      );
    };

    return <CustomToolbar />;
  }, [handleImproveWriting]);
  return (
    <div ref={wrapperRef} className={cn("bg-transparent", className)}>
      <div className="relative bg-transparent">
        <BlockNoteView
          editor={editor}
          theme={theme === 'dark' ? 'dark' : 'light'}
          slashMenu={false}
          formattingToolbar={false}
          data-theming-transparent
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
        </BlockNoteView>

        {/* Improve Writing UI - Fixed position */}
        {improveWriting.state.loading && (
          <div className="fixed bottom-8 right-8 z-50 animate-in fade-in duration-200">
            <ImproveWritingLoader />
          </div>
        )}

        {improveWriting.state.error && (
          <div className="fixed bottom-8 right-8 z-50 animate-in fade-in duration-200">
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
          <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-top-1 duration-300">
            <ImprovedTextDisplay
              improvedText={improveWriting.state.improvedText}
              onAction={handleImproveAction}
            />
          </div>
        )}

        {/* AI Assistant Button */}
        <AIAssistantButton
          onImproveWriting={handleImproveWriting}
          onAIDraft={onOpenAIDraft}
          onSummarize={() => {
            // TODO: Implement summarize functionality
            toast.info('Summarize feature coming soon');
          }}
          onTranslate={() => {
            // TODO: Implement translate functionality
            toast.info('Translate feature coming soon');
          }}
          onBrainstorm={() => {
            // TODO: Implement brainstorm functionality
            toast.info('Brainstorm feature coming soon');
          }}
          onAskAI={() => {
            // TODO: Implement AI chat functionality
            toast.info('AI Chat feature coming soon');
          }}
        />

        <MobileToolbar 
          editor={editor} 
          onOpenAIDraft={onOpenAIDraft} 
        />
      </div>
    </div>
  );
});
