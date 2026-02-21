"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useParams, useRouter } from 'next/navigation';
import { MoreVertical, Copy, Star, Trash2, Loader2, CircleCheck, Save, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useDocument, useDocumentMutations } from '@/hooks/swr';
import type { Document, DocumentFont } from '@/lib/db/types';
import { BlockEditor, type BlockEditorHandle } from '@/components/editor/BlockEditor';
import { formatDistanceToNow } from 'date-fns';
import { useNavigation } from '@/contexts/NavigationContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ExportDialog } from '@/components/export/ExportDialog';
import { ConfirmDialog } from '@/components/AlertDialog';
import { MoveDocumentDialog } from '@/components/MoveDocumentDialog';
import { generateTitleFromBlocks } from '@/lib/ai/title';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AIAssistantButton } from '@/components/ui/AIAssistantButton';
import type { AssistantMode } from '@/types/ai-assistant';
import { completeGenerate } from '@/lib/ai/openrouter-client';
import { extractPlainTextFromEditorBlocks } from '@/lib/editor/text-extract';

// Save status icon component
function SaveStatusIcon({ saving, lastSaved }: { saving: boolean; lastSaved: Date | null }) {
  const getTooltipText = () => {
    if (saving) return 'Saving...';
    if (!lastSaved) return 'Not saved yet';
    return `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : lastSaved ? (
            <CircleCheck className="w-4 h-4 text-green-500" />
          ) : (
            <Save className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const { openDocument } = useNavigation();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspace();
  const { data: document, isLoading, mutate } = useDocument(documentId);
  const { updateDocument, duplicateDocument, toggleFavorite, deleteDocument, permanentlyDeleteDocument } = useDocumentMutations();

  const [saving, setSaving] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [localTitle, setLocalTitle] = useState<string>('');
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    action: () => Promise<void> | void;
  } | null>(null);
  const documentRef = useRef<Document | null>(null);
  const editorRef = useRef<BlockEditorHandle | null>(null);
  const assistantNonceRef = useRef(0);
  const [assistantOpenRequest, setAssistantOpenRequest] = useState<{ intent: AssistantMode; nonce: number } | null>(null);
  const [titleGenerating, setTitleGenerating] = useState(false);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize title textarea
  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [localTitle]);

  // Sync documentRef with SWR data and set workspace
  useEffect(() => {
    if (document) {
      documentRef.current = document;
      setLastSaved(document.updatedAt);
      // Only update local title if it's different from current document title
      // This prevents overwriting user's typing while they're still typing
      setLocalTitle(document.title);
      if (!activeWorkspaceId || activeWorkspaceId !== document.workspaceId) {
        setActiveWorkspace(document.workspaceId, { navigate: false });
      }
    }
  }, [document, activeWorkspaceId, setActiveWorkspace]);

  // Cleanup: delete empty documents when leaving the page
  useEffect(() => {
    return () => {
      const checkAndDeleteEmpty = async () => {
        if (documentRef.current) {
          const doc = documentRef.current;
          const isEmpty = isDocumentEmpty(doc);
          if (isEmpty) {
            await permanentlyDeleteDocument(doc.id);
          }
        }
      };
      checkAndDeleteEmpty();
    };
  }, [documentId, permanentlyDeleteDocument]);

  // (Minimal rebuild) Removed auto-title timers and retries

 


  function isDocumentEmpty(doc: Document): boolean {
    const hasNoTitle = !doc.title || doc.title.trim() === '' || doc.title === 'Untitled';
    
    // Check if content is empty or just has default empty paragraph
    let hasNoContent = false;
    try {
      const content = JSON.parse(doc.content);
      hasNoContent = !content || 
        content.length === 0 || 
        (content.length === 1 && 
         content[0].type === 'paragraph' && 
         (!content[0].content || content[0].content === '' || 
          (Array.isArray(content[0].content) && content[0].content.length === 0)));
    } catch {
      hasNoContent = !doc.content || doc.content.trim() === '';
    }
    
    return hasNoTitle && hasNoContent;
  }

  // Debounced function to save the title
  const debouncedSaveTitle = useDebouncedCallback(
    async (newTitle: string) => {
      if (documentRef.current) {
        setTitleSaving(true);
        try {
          // Send complete document state to prevent race conditions with content updates
          documentRef.current = { ...documentRef.current, title: newTitle };
          await updateDocument(documentId, { ...documentRef.current });
          setLastSaved(new Date());
        } catch (error) {
          console.error('Failed to save title:', error);
          // Rollback on error
          setLocalTitle(documentRef.current.title);
        } finally {
          setTitleSaving(false);
        }
      }
    },
    1000 // 1000ms debounce delay - balances responsiveness with performance
  );

  function handleTitleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newTitle = e.target.value;
    // Update local state immediately for responsive typing
    setLocalTitle(newTitle);
    // Update ref for optimistic updates
    if (documentRef.current) {
      documentRef.current = { ...documentRef.current, title: newTitle };
    }
    // Debounced save
    debouncedSaveTitle(newTitle);
  }

  async function handleContentSave(content: string) {
    if (documentRef.current) {
      documentRef.current = { ...documentRef.current, content };
      // Send complete document state to prevent race conditions with title updates
      await handleSave({ ...documentRef.current });
    }
  }

  // Minimal manual generate-title flow
  const handleGenerateTitle = useCallback(async () => {
    const current = documentRef.current;
    if (!current) return;
    setTitleGenerating(true);
    try {
      const title = await generateTitleFromBlocks(current.content);
      if (!title) {
        alert('Could not generate a title. Try adding more content.');
        return;
      }
      await updateDocument(current.id, { title });
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: current.workspaceId } }));
    } catch (e) {
      console.error('Generate title failed:', e);
      alert('Failed to generate title');
    } finally {
      setTitleGenerating(false);
    }
  }, [updateDocument]);

  async function handleSave(updates: Partial<Document>) {
    setSaving(true);
    try {
      await updateDocument(documentId, updates);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  }

  const handleDuplicate = useCallback(async () => {
    try {
      const duplicate = await duplicateDocument(documentId);
      openDocument(duplicate.id, duplicate.title);
    } catch (error) {
      console.error('Duplicate failed:', error);
      alert('Failed to duplicate document');
    }
  }, [documentId, openDocument, duplicateDocument]);

  const handleToggleFavorite = useCallback(async () => {
    try {
      if (!documentRef.current) return;

      // Store original state for potential rollback
      const originalStatus = documentRef.current.isFavorite ?? false;
      const newStatus = !originalStatus;

      // Optimistic UI update - update local state immediately
      documentRef.current = { ...documentRef.current, isFavorite: newStatus };

      // API call with workspaceId for proper cache updates
      await toggleFavorite(documentId, originalStatus, activeWorkspaceId ?? undefined);

      // Dispatch event to update other components
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: documentRef.current.workspaceId } }));
    } catch (error) {
      // Rollback local state on error
      if (documentRef.current) {
        documentRef.current = { ...documentRef.current, isFavorite: !documentRef.current.isFavorite };
      }
      console.error('Toggle favorite failed:', error);
      alert('Failed to toggle favorite');
    }
  }, [documentId, toggleFavorite, activeWorkspaceId]);

  const handleFontChange = useCallback(async (font: DocumentFont) => {
    const current = documentRef.current;
    if (!current) return;

    // Optimistic update - update the ref
    const updatedDoc: Document = { ...current, font };
    documentRef.current = updatedDoc;

    try {
      await updateDocument(current.id, { font });
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: current.workspaceId } }));
    } catch (error) {
      console.error('Failed to update font:', error);
      alert('Failed to update font');
    }
  }, [updateDocument]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmConfig) return;
    try {
      await confirmConfig.action();
    } finally {
      setConfirmConfig(null);
    }
  }, [confirmConfig]);

  const requestMoveToTrash = useCallback(() => {
    const current = documentRef.current;
    if (!current) return;
    setConfirmConfig({
      title: 'Move to Trash',
      description: 'Move this document to trash?',
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      variant: 'destructive',
      action: async () => {
        try {
          await deleteDocument(documentId);
          window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: current.workspaceId } }));
          router.push('/dashboard');
        } catch (error) {
          console.error('Failed to move document to trash:', error);
          alert('Failed to move document to trash');
        }
      },
    });
  }, [documentId, deleteDocument, router]);

  const requestAssistantOpen = useCallback((intent: AssistantMode) => {
    assistantNonceRef.current += 1;
    setAssistantOpenRequest({ intent, nonce: assistantNonceRef.current });
  }, []);

  const handleSummarizeFromAssistant = useCallback(async (): Promise<string> => {
    const content = documentRef.current?.content ?? '[]';
    let blocks: unknown[] = [];
    try {
      const parsed = JSON.parse(content) as unknown;
      if (Array.isArray(parsed)) {
        blocks = parsed;
      }
    } catch {
      blocks = [];
    }

    const extracted = extractPlainTextFromEditorBlocks(blocks, { maxChars: 12000 }).trim();
    if (!extracted) {
      throw new Error('There is no content in this note to summarize yet.');
    }

    const summary = (await completeGenerate('summarize', { prompt: extracted })).trim();
    if (!summary) {
      throw new Error('Summary generation returned an empty response. Please try again.');
    }

    return summary;
  }, []);

  useEffect(() => {
    function handleDocumentsChanged(event: Event) {
      const detail = (event as CustomEvent).detail as { workspaceId?: string } | undefined;
      const current = documentRef.current;
      if (!current) return;
      if (!detail || !detail.workspaceId || detail.workspaceId === current.workspaceId) {
        void mutate();
      }
    }

    window.addEventListener('documentsChanged', handleDocumentsChanged);
    return () => window.removeEventListener('documentsChanged', handleDocumentsChanged);
  }, [mutate]);

  // Handle keyboard shortcut events
  useEffect(() => {
    function handleDuplicateDocument() {
      void handleDuplicate();
    }

    function handleExportDocument() {
      setShowExportDialog(true);
    }

    function handleToggleFavoriteEvent() {
      void handleToggleFavorite();
    }

    function handleMoveToTrashEvent() {
      requestMoveToTrash();
    }

    function handleAIDraftOpen() {
      requestAssistantOpen('draft');
    }

    function handleAIAssistantOpen(event: Event) {
      const detail = (event as CustomEvent).detail as { intent?: AssistantMode } | undefined;
      const intent = detail?.intent === 'draft' ? 'draft' : 'chat';
      requestAssistantOpen(intent);
    }

    window.addEventListener('duplicate-document', handleDuplicateDocument);
    window.addEventListener('export-document', handleExportDocument);
    window.addEventListener('toggle-favorite', handleToggleFavoriteEvent);
    window.addEventListener('move-to-trash', handleMoveToTrashEvent);
    window.addEventListener('ai-assistant-open', handleAIAssistantOpen);
    window.addEventListener('ai-draft-open', handleAIDraftOpen);

    return () => {
      window.removeEventListener('duplicate-document', handleDuplicateDocument);
      window.removeEventListener('export-document', handleExportDocument);
      window.removeEventListener('toggle-favorite', handleToggleFavoriteEvent);
      window.removeEventListener('move-to-trash', handleMoveToTrashEvent);
      window.removeEventListener('ai-assistant-open', handleAIAssistantOpen);
      window.removeEventListener('ai-draft-open', handleAIDraftOpen);
    };
  }, [handleDuplicate, handleToggleFavorite, requestAssistantOpen, requestMoveToTrash]);

  function getWordCount(): number {
    if (!document) return 0;
    try {
      const parsed = JSON.parse(document.content) as unknown;
      if (!Array.isArray(parsed)) {
        return 0;
      }
      let text = '';
      parsed.forEach((block) => {
        if (!block || typeof block !== 'object') return;
        const blockContent = (block as { content?: unknown }).content;
        if (Array.isArray(blockContent)) {
          blockContent.forEach((item) => {
            if (typeof item === 'string') {
              text += `${item} `;
            } else if (item && typeof item === 'object' && 'text' in item) {
              const { text: innerText } = item as { text?: unknown };
              if (typeof innerText === 'string') {
                text += `${innerText} `;
              }
            }
          });
        } else if (typeof blockContent === 'string') {
          text += `${blockContent} `;
        }
      });
      return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    } catch {
      return 0;
    }
  }

  function getReadingTime(): number {
    const wordCount = getWordCount();
    return Math.ceil(wordCount / 200); // Average reading speed: 200 words per minute
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-background animate-in fade-in duration-500">
        <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="pl-14 pr-[5px] md:px-8 py-4">
            <div className="max-w-4xl mx-auto flex items-center gap-4">
              <div className="h-8 bg-muted animate-pulse rounded-md flex-1 max-w-sm" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-muted animate-pulse rounded-md" />
                <div className="h-8 w-8 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-4 md:mx-auto px-0 md:px-8 py-12 space-y-6">
            <div className="space-y-3">
              <div className="h-10 bg-muted animate-pulse rounded-md w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded-md w-1/4 opacity-50" />
            </div>
            <div className="space-y-4 pt-8">
              <div className="h-4 bg-muted animate-pulse rounded-md w-full" />
              <div className="h-4 bg-muted animate-pulse rounded-md w-[95%]" />
              <div className="h-4 bg-muted animate-pulse rounded-md w-[98%]" />
              <div className="h-4 bg-muted animate-pulse rounded-md w-[92%]" />
              <div className="h-4 bg-muted animate-pulse rounded-md w-[96%]" />
              <div className="h-4 bg-muted animate-pulse rounded-md w-[80%]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-muted-foreground mb-4">Document not found</div>
      </div>
    );
  }

  const wordCount = getWordCount();
  const readingTime = getReadingTime();

  const FONT_CLASS_MAP: Record<DocumentFont, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };

  const documentFont = document?.font ?? 'sans';
  const fontOptions: Array<{ id: DocumentFont; label: string; description: string; sampleClass: string }> = [
    { id: 'sans', label: 'Ag', description: 'Default', sampleClass: 'font-sans' },
    { id: 'serif', label: 'Ag', description: 'Serif', sampleClass: 'font-serif' },
    { id: 'mono', label: 'Ag', description: 'Mono', sampleClass: 'font-mono' },
  ];
  
  return (
    <TooltipProvider>
      <div className={`h-full flex flex-col bg-background ${FONT_CLASS_MAP[documentFont]}`}>
        <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="pl-14 pr-2 md:px-8 py-4">
          {/* Title bar */}
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-1 min-w-0 relative">
                <textarea
                  ref={titleTextareaRef}
                  rows={1}
                  value={localTitle}
                  onChange={handleTitleChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full text-xl sm:text-2xl font-bold border-none outline-none bg-transparent resize-none py-0 block min-h-[1.5em] leading-tight whitespace-pre-wrap break-words"
                  placeholder="Untitled"
                />
              </div>

            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 mt-1">
              <SaveStatusIcon saving={saving || titleGenerating || titleSaving} lastSaved={lastSaved} />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">Note font</DropdownMenuLabel>
                  <div className="px-1 py-2">
                    <div className="grid grid-cols-3 gap-2">
                      {fontOptions.map((option) => {
                        const isActive = documentFont === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleFontChange(option.id)}
                            className={`rounded-md border px-2 py-2 text-center transition-colors ${
                              isActive
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-transparent bg-muted/40 hover:bg-muted'
                            }`}
                          >
                            <div className={`text-lg leading-none ${option.sampleClass}`}>{option.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                          </button>
                        );
                      })}
                  </div>
                  </div>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleToggleFavorite}>
                    <Star className={`w-4 h-4 mr-2 ${document.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    {document.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.preventDefault();
                      requestMoveToTrash();
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Move to Trash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-4 md:mx-auto px-0 md:px-8 py-4 md:py-8 min-h-full">
          <BlockEditor
            ref={editorRef}
            documentId={documentId}
            initialContent={document.content}
            onSave={handleContentSave}
            className={FONT_CLASS_MAP[documentFont]}
            font={documentFont}
            onOpenAIAssistant={(intent) => {
              requestAssistantOpen(intent);
            }}
          />
        </div>
      </div>

      {/* Stats bar at bottom */}
      <div className="border-t px-8 py-1.5">
        <div className="max-w-4xl mx-auto flex items-center justify-start gap-2 sm:gap-4 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{wordCount} words</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{readingTime} min read</span>
          <span className="hidden sm:inline">•</span>
          <span>
            {saving ? (
              'Saving...'
            ) : lastSaved ? (
              `Last saved: ${formatDistanceToNow(lastSaved, { addSuffix: true })}`
            ) : (
              'Not saved'
            )}
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmConfig}
        onOpenChange={(open) => {
          if (!open) setConfirmConfig(null);
        }}
        title={confirmConfig?.title ?? ''}
        description={confirmConfig?.description ?? ''}
        confirmText={confirmConfig?.confirmText}
        cancelText={confirmConfig?.cancelText}
        variant={confirmConfig?.variant ?? 'default'}
        onConfirm={handleConfirmAction}
      />

      {document && (
        <MoveDocumentDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          documentId={document.id}
          documentTitle={document.title}
          workspaceId={document.workspaceId}
        />
      )}

      {document && (
        <ExportDialog
          document={document}
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
        />
      )}

      <AIAssistantButton
        documentId={documentId}
        documentTitle={documentRef.current?.title || localTitle || 'Untitled'}
        getContextWindow={() => {
          return editorRef.current?.getContextWindow?.({ around: 2, maxChars: 1400 }) || '';
        }}
        getSelectedText={() => {
          return editorRef.current?.getSelectedText?.() || '';
        }}
        insertAtCursor={(text) => {
          editorRef.current?.insertTextAtCursor(text);
        }}
        replaceSelection={(text) => {
          return editorRef.current?.replaceSelection?.(text) ?? false;
        }}
        onImproveWriting={() => {
          editorRef.current?.improveSelectedText?.();
        }}
        onSummarize={handleSummarizeFromAssistant}
        onGenerateTitle={() => void handleGenerateTitle()}
        openRequest={assistantOpenRequest}
        onOpenRequestHandled={() => setAssistantOpenRequest(null)}
      />
      </div>
    </TooltipProvider>
  );
}
