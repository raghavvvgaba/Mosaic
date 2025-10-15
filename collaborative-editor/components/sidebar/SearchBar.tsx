'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchDocuments } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface SearchBarProps {
  onResultClick: (doc: Document) => void;
  onClose?: () => void;
}

export function SearchBar({ onResultClick, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Document[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { activeWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (!activeWorkspaceId) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    async function performSearch(workspaceId: string) {
      if (query.length > 1) {
        const docs = await searchDocuments(workspaceId, query);
        setResults(docs);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }
    performSearch(activeWorkspaceId);
  }, [query, activeWorkspaceId]);

  function handleResultClick(doc: Document) {
    onResultClick(doc);
    setQuery('');
    setIsOpen(false);
    onClose?.();
  }

  function handleClose() {
    setQuery('');
    setIsOpen(false);
    onClose?.();
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents..."
          className="pl-10 pr-10"
          autoFocus
        />
        {query && (
          <button
            onClick={handleClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg max-h-96 overflow-auto z-50">
          {results.map(doc => (
            <button
              key={doc.id}
              onClick={() => handleResultClick(doc)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
            >
              <div className="font-medium mb-1">{doc.title || 'Untitled'}</div>
              <div className="text-sm text-gray-500 truncate mb-1">
                {getContentPreview(doc.content)}
              </div>
              <div className="text-xs text-gray-400">
                Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length > 1 && (
        <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500 z-50">
          No documents found for “{query}”
        </div>
      )}
    </div>
  );
}

function getContentPreview(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const firstBlock = parsed[0];
      if (!firstBlock || typeof firstBlock !== 'object') {
        return 'Empty document';
      }
      const contentValue = (firstBlock as { content?: unknown }).content;
      if (Array.isArray(contentValue)) {
        return contentValue
          .map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && 'text' in item) {
              const { text } = item as { text?: unknown };
              return typeof text === 'string' ? text : '';
            }
            return '';
          })
          .join('')
          .slice(0, 100);
      }
      if (typeof contentValue === 'string') {
        return contentValue.slice(0, 100);
      }
      return 'Empty document';
    }
    return 'Empty document';
  } catch {
    return content.slice(0, 100);
  }
}
