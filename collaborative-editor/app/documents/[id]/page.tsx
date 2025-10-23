'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MoreVertical, Copy, Star, Plus, Trash2, FolderPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { getDocument, updateDocument, permanentlyDeleteDocument, updateLastOpened, duplicateDocument, toggleFavorite, deleteDocument, createDocument, getDocumentPath } from '@/lib/db/documents';
import type { Document, DocumentFont } from '@/lib/db/types';
import { BlockEditor, type BlockEditorHandle } from '@/components/editor/BlockEditor';
import { formatDistanceToNow } from 'date-fns';
import { useTabs } from '@/contexts/TabsContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ExportButton } from '@/components/export/ExportButton';
import { ConfirmDialog } from '@/components/AlertDialog';
import { MoveDocumentDialog } from '@/components/MoveDocumentDialog';
import { AIDraftDialog } from '@/components/ai/AIDraftDialog';

export default function DocumentPage() {
  const params = useParams();
  const documentId = params.id as string;
  const { updateTabTitle, ensureTabExists, openTab, openPage, openDocument } = useTabs();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspace();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [documentPath, setDocumentPath] = useState<Document[]>([]);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
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
  const [aiOpen, setAiOpen] = useState(false);

  const loadDocumentPath = useCallback(async (id: string) => {
    const path = await getDocumentPath(id);
    setDocumentPath(path);
  }, []);

  const loadDocument = useCallback(async () => {
    const doc = await getDocument(documentId);
    if (doc) {
      setDocument(doc);
      documentRef.current = doc;
      setLastSaved(doc.updatedAt);
      if (!activeWorkspaceId || activeWorkspaceId !== doc.workspaceId) {
        setActiveWorkspace(doc.workspaceId, { navigate: false });
      }
      await loadDocumentPath(doc.id);
    }
    setLoading(false);
  }, [documentId, activeWorkspaceId, setActiveWorkspace, loadDocumentPath]);

  useEffect(() => {
    loadDocument();

    // Track that this document was opened
    updateLastOpened(documentId);

    // Cleanup: delete empty documents when leaving the page
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
  }, [documentId, loadDocument]);

  // Ensure tab exists and update title when document loads
  useEffect(() => {
    if (document) {
      ensureTabExists(documentId, document.title);
      updateTabTitle(documentId, document.title);
    }
  }, [document, documentId, updateTabTitle, ensureTabExists]);



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

  async function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    if (document) {
      const updatedDoc = { ...document, title: newTitle };
      setDocument(updatedDoc);
      documentRef.current = updatedDoc;
      await handleSave({ title: newTitle });
      void loadDocumentPath(documentId);
    }
  }

  async function handleContentSave(content: string) {
    if (document) {
      const updatedDoc = { ...document, content };
      documentRef.current = updatedDoc;
    }
    await handleSave({ content });
  }

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
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: duplicate.workspaceId } }));
      openTab(duplicate.id, duplicate.title);
    } catch (error) {
      console.error('Duplicate failed:', error);
      alert('Failed to duplicate document');
    }
  }, [documentId, openTab]);

  const handleToggleFavorite = useCallback(async () => {
    try {
      await toggleFavorite(documentId);
      setDocument((current) => {
        if (!current) return current;
        const updated = { ...current, isFavorite: !current.isFavorite };
        documentRef.current = updated;
        return updated;
      });
      if (documentRef.current) {
        window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: documentRef.current.workspaceId } }));
      }
    } catch (error) {
      console.error('Toggle favorite failed:', error);
    }
  }, [documentId]);

  const handleFontChange = useCallback(async (font: DocumentFont) => {
    const current = documentRef.current;
    if (!current) return;

    const updatedDoc: Document = { ...current, font };
    setDocument(updatedDoc);
    documentRef.current = updatedDoc;

    try {
      await updateDocument(current.id, { font });
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: current.workspaceId } }));
    } catch (error) {
      console.error('Failed to update font:', error);
      alert('Failed to update font');
    }
  }, []);

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
          openPage('/', 'Home', 'home');
        } catch (error) {
          console.error('Failed to move document to trash:', error);
          alert('Failed to move document to trash');
        }
      },
    });
  }, [documentId, openPage]);

  const handleCreateSubpage = useCallback(async () => {
    if (!document) return;
    try {
      const newDoc = await createDocument('Untitled', document.workspaceId, document.id);
      openDocument(newDoc.id, newDoc.title);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: document.workspaceId } }));
    } catch (error) {
      console.error('Failed to create subpage:', error);
      alert('Failed to create subpage');
    }
  }, [document, openDocument]);

  const handleBreadcrumbNavigate = useCallback((target: Document) => {
    if (target.id === documentId) return;
    openDocument(target.id, target.title);
  }, [documentId, openDocument]);

  useEffect(() => {
    function handleDocumentsChanged(event: Event) {
      const detail = (event as CustomEvent).detail as { workspaceId?: string } | undefined;
      const current = documentRef.current;
      if (!current) return;
      if (!detail || !detail.workspaceId || detail.workspaceId === current.workspaceId) {
        void loadDocument();
      }
    }

    window.addEventListener('documentsChanged', handleDocumentsChanged);
    return () => window.removeEventListener('documentsChanged', handleDocumentsChanged);
  }, [loadDocument]);

  // Handle keyboard shortcut events
  useEffect(() => {
    function handleDuplicateDocument() {
      void handleDuplicate();
    }

    function handleExportDocument() {
      const exportButton = window.document.querySelector('[data-export-button]') as HTMLButtonElement;
      if (exportButton) {
        exportButton.click();
      }
    }

    function handleToggleFavoriteEvent() {
      void handleToggleFavorite();
    }

    function handleMoveToTrashEvent() {
      requestMoveToTrash();
    }

    function handleCreateSubpageEvent(event: Event) {
      const detail = (event as CustomEvent).detail as { documentId?: string } | undefined;
      if (detail?.documentId && detail.documentId !== documentId) {
        return;
      }
      void handleCreateSubpage();
    }

    function handleAIDraftOpen() {
      setAiOpen(true);
    }

    window.addEventListener('duplicate-document', handleDuplicateDocument);
    window.addEventListener('export-document', handleExportDocument);
    window.addEventListener('toggle-favorite', handleToggleFavoriteEvent);
    window.addEventListener('move-to-trash', handleMoveToTrashEvent);
    window.addEventListener('create-subpage', handleCreateSubpageEvent);
    window.addEventListener('ai-draft-open', handleAIDraftOpen);

    return () => {
      window.removeEventListener('duplicate-document', handleDuplicateDocument);
      window.removeEventListener('export-document', handleExportDocument);
      window.removeEventListener('toggle-favorite', handleToggleFavoriteEvent);
      window.removeEventListener('move-to-trash', handleMoveToTrashEvent);
      window.removeEventListener('create-subpage', handleCreateSubpageEvent);
      window.removeEventListener('ai-draft-open', handleAIDraftOpen);
    };
  }, [documentId, handleCreateSubpage, handleDuplicate, handleToggleFavorite, requestMoveToTrash]);

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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading document...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="text-gray-500 mb-4">Document not found</div>
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
    <div className={`h-screen flex flex-col bg-background ${FONT_CLASS_MAP[documentFont]}`}>
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="p-4 space-y-3">
          {documentPath.length > 0 && (
            <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {documentPath.map((node, index) => (
                <div key={node.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbNavigate(node)}
                    className={`hover:text-foreground transition-colors ${node.id === documentId ? 'font-medium text-foreground' : ''}`}
                  >
                    {node.title || 'Untitled'}
                  </button>
                  {index < documentPath.length - 1 && <span className="text-muted-foreground">/</span>}
                </div>
              ))}
            </nav>
          )}

          {/* Title bar */}
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={document.title}
              onChange={handleTitleChange}
              className="flex-1 text-2xl font-bold border-none outline-none bg-transparent"
              placeholder="Untitled"
            />

            {/* Moved New subpage into dropdown */}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              className={document.isFavorite ? 'text-yellow-500' : ''}
            >
              <Star className={`w-4 h-4 ${document.isFavorite ? 'fill-yellow-500' : ''}`} />
            </Button>

            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {saving ? (
                'Saving...'
              ) : lastSaved ? (
                `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`
              ) : null}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiOpen(true)}
              className="flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              AI Draft
            </Button>

            <ExportButton document={document} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">AI</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setAiOpen(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Draft…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
                <DropdownMenuItem
                  onClick={() => {
                    void handleCreateSubpage();
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New subpage
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setMoveDialogOpen(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Move to…
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
        
        {/* Stats bar */}
        <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{readingTime} min read</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          <BlockEditor
            ref={editorRef}
            documentId={documentId}
            initialContent={document.content}
            onSave={handleContentSave}
            className={FONT_CLASS_MAP[documentFont]}
            font={documentFont}
            onOpenAIDraft={() => setAiOpen(true)}
          />
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
          currentParentId={document.parentId}
          workspaceId={document.workspaceId}
          onMoved={(newParentId) => {
            setMoveDialogOpen(false);
            setDocument((current) => {
              if (!current) return current;
              const updated = { ...current, parentId: newParentId ?? undefined };
              documentRef.current = updated;
              return updated;
            });
            void loadDocument();
          }}
        />
      )}

      <AIDraftDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        getContext={() => {
          const title = documentRef.current?.title || 'Untitled';
          const around = editorRef.current?.getContextWindow?.({ around: 2, maxChars: 1400 }) || '';
          return [`Title: ${title}`, around ? `Context:\n${around}` : ''].filter(Boolean).join('\n');
        }}
        onInsert={(text) => {
          editorRef.current?.insertTextAtCursor(text)
        }}
      />
    </div>
  );
}
