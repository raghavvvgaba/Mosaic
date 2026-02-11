'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDocumentSearch } from '@/hooks/swr';
import type { Document } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuthContext } from '@/contexts/AuthContext';

interface SearchBarProps {
  onResultClick: (doc: Document) => void;
  onClose?: () => void;
}

export function SearchBar({ onResultClick, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useAuthContext();

  // Use SWR hook for document search
  const { data: searchResults } = useDocumentSearch(debouncedQuery, { workspaceId: activeWorkspaceId ?? undefined });

  // Filter results by user ownership and permissions
  const results = useMemo(() => {
    if (!searchResults || !user) return [];
    return searchResults.filter((doc) => {
      if (doc.ownerId === user.id) return true;

      if (doc.collaborators && doc.collaborators.some((collab) => collab.userId === user.id)) {
        return true;
      }

      return false;
    });
  }, [searchResults, user]);

  const isOpen = query.length > 1 && results.length >= 0;

  // Debounce the search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  function handleResultClick(doc: Document) {
    onResultClick(doc);
    setQuery('');
    onClose?.();
  }

  function handleClose() {
    setQuery('');
    onClose?.();
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="pl-8 pr-8 md:pr-4 w-full text-sm h-9 md:h-10 border-none bg-transparent focus-visible:ring-0 shadow-none"
        />
        {query && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-accent/20"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-3 w-full bg-card border border-border rounded-xl shadow-sm transition-all rounded-2xl max-h-96 overflow-auto z-50 shadow-2xl">
          {results.map(doc => (
            <button
              key={doc.id}
              onClick={() => handleResultClick(doc)}
              className="w-full text-left px-5 py-4 hover:bg-accent/10 border-b border-border/20 last:border-b-0 transition-all rounded-t-2xl first:rounded-t-2xl last:rounded-b-2xl group"
            >
              <div className="font-semibold mb-1 text-base group-hover:text-primary transition-colors">{doc.title || 'Untitled'}</div>
              <div className="text-sm text-muted-foreground truncate mb-2 line-clamp-2">
                {getContentPreview(doc.content)}
              </div>
              <div className="text-xs text-muted-foreground opacity-70">
                Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length > 1 && (
        <div className="absolute top-full mt-3 w-full bg-card border border-border rounded-xl shadow-sm transition-all rounded-2xl p-6 text-center text-muted-foreground z-50 shadow-2xl">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No documents found for &quot;{query}&quot;</p>
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
