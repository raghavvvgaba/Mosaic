'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Download, MoreVertical, Copy, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { getDocument, updateDocument, permanentlyDeleteDocument, updateLastOpened, duplicateDocument, toggleFavorite } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { formatDistanceToNow } from 'date-fns';
import { exportDocumentAsMarkdown } from '@/lib/export/markdown';
import { useTabs } from '@/contexts/TabsContext';

export default function DocumentPage() {
  const params = useParams();
  const documentId = params.id as string;
  const { updateTabTitle, ensureTabExists } = useTabs();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const documentRef = useRef<Document | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // Ensure tab exists and update title when document loads
  useEffect(() => {
    if (document) {
      ensureTabExists(documentId, document.title);
      updateTabTitle(documentId, document.title);
    }
  }, [document, documentId, updateTabTitle, ensureTabExists]);

  async function loadDocument() {
    const doc = await getDocument(documentId);
    if (doc) {
      setDocument(doc);
      documentRef.current = doc;
      setLastSaved(doc.updatedAt);
    }
    setLoading(false);
  }



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

  async function handleExportMarkdown() {
    try {
      await exportDocumentAsMarkdown(documentId);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export document');
    }
  }

  async function handleDuplicate() {
    try {
      const duplicate = await duplicateDocument(documentId);
      // Notify sidebar to refresh
      window.dispatchEvent(new Event('documentsChanged'));
      // Open duplicate in new tab
      openTab(duplicate.id, duplicate.title);
    } catch (error) {
      console.error('Duplicate failed:', error);
      alert('Failed to duplicate document');
    }
  }

  async function handleToggleFavorite() {
    try {
      await toggleFavorite(documentId);
      if (document) {
        setDocument({ ...document, isFavorite: !document.isFavorite });
        documentRef.current = { ...document, isFavorite: !document.isFavorite };
      }
      // Notify sidebar to refresh
      window.dispatchEvent(new Event('documentsChanged'));
    } catch (error) {
      console.error('Toggle favorite failed:', error);
    }
  }

  function getWordCount(): number {
    if (!document) return 0;
    try {
      const blocks = JSON.parse(document.content);
      let text = '';
      blocks.forEach((block: any) => {
        if (block.content) {
          if (Array.isArray(block.content)) {
            block.content.forEach((item: any) => {
              if (typeof item === 'string') text += item + ' ';
              else if (item.text) text += item.text + ' ';
            });
          } else if (typeof block.content === 'string') {
            text += block.content + ' ';
          }
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-background sticky top-0 z-10">
        {/* Title bar */}
        <div className="p-4 flex items-center gap-4">
          <input
            type="text"
            value={document.title}
            onChange={handleTitleChange}
            className="flex-1 text-2xl font-bold border-none outline-none bg-transparent"
            placeholder="Untitled"
          />

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportMarkdown}>
                <Download className="w-4 h-4 mr-2" />
                Export as Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            documentId={documentId}
            initialContent={document.content}
            onSave={handleContentSave}
          />
        </div>
      </div>
    </div>
  );
}
