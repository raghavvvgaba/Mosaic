'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAllDocuments, createDocument, deleteDocument } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { SearchBar } from '@/components/sidebar/SearchBar';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateDocument();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function loadDocuments() {
    const docs = await getAllDocuments();
    setDocuments(docs);
    setLoading(false);
  }

  async function handleCreateDocument() {
    const doc = await createDocument();
    router.push(`/documents/${doc.id}`);
  }

  async function handleDeleteDocument(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id);
      loadDocuments();
    }
  }

  function handleSearchResultClick(doc: Document) {
    router.push(`/documents/${doc.id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My Documents</h1>
          <div className="flex gap-3 items-center">
            <ThemeToggle />
            <Button onClick={() => setSearchOpen(true)} variant="outline" size="lg">
              <Search className="w-5 h-5 mr-2" />
              Search
              <kbd className="ml-3 px-2 py-1 text-xs bg-muted rounded border">⌘K</kbd>
            </Button>
            <Button onClick={handleCreateDocument} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              New Document
              <kbd className="ml-3 px-2 py-1 text-xs bg-muted rounded border">⌘N</kbd>
            </Button>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No documents yet</p>
            <Button onClick={handleCreateDocument} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create your first document
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map(doc => (
              <div
                key={doc.id}
                onClick={() => router.push(`/documents/${doc.id}`)}
                className="bg-card p-6 rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                      {doc.title || 'Untitled'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search Documents</DialogTitle>
          </DialogHeader>
          <SearchBar 
            onResultClick={handleSearchResultClick}
            onClose={() => setSearchOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
