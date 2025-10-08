'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { getDocument, updateDocument } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { formatDistanceToNow } from 'date-fns';
import { exportDocumentAsMarkdown } from '@/lib/export/markdown';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  async function loadDocument() {
    const doc = await getDocument(documentId);
    if (doc) {
      setDocument(doc);
      setLastSaved(doc.updatedAt);
    }
    setLoading(false);
  }

  async function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    if (document) {
      setDocument({ ...document, title: newTitle });
      await handleSave({ title: newTitle });
    }
  }

  async function handleContentSave(content: string) {
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
        <Button onClick={() => router.push('/')}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b p-4 flex items-center gap-4 bg-background sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <input
          type="text"
          value={document.title}
          onChange={handleTitleChange}
          className="flex-1 text-2xl font-bold border-none outline-none bg-transparent"
          placeholder="Untitled"
        />

        <div className="text-sm text-muted-foreground">
          {saving ? (
            'Saving...'
          ) : lastSaved ? (
            `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`
          ) : null}
        </div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportMarkdown}>
              <Download className="w-4 h-4 mr-2" />
              Export as Markdown
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
