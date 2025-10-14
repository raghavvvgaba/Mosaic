'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { FileText, MoreHorizontal, Edit2, Trash2, ExternalLink, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/AlertDialog';
import { RenameDialog } from '@/components/RenameDialog';
import { updateDocument, deleteDocument, createDocument } from '@/lib/db/documents';
import { useTabs } from '@/contexts/TabsContext';
import type { DocumentNode } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface SidebarDocumentListProps {
  documents: DocumentNode[];
}

export function SidebarDocumentList({ documents }: SidebarDocumentListProps) {
  const pathname = usePathname();
  const { openDocument, openTab } = useTabs();
  const { activeWorkspaceId } = useWorkspace();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleRename = async (newTitle: string) => {
    if (!selectedDoc) return;
    await updateDocument(selectedDoc.id, { title: newTitle });
    const workspaceId = selectedDoc.workspaceId || activeWorkspaceId;
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    await deleteDocument(selectedDoc.id);
    const workspaceId = selectedDoc.workspaceId || activeWorkspaceId;
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
    setDeleteDialogOpen(false);
  };

  const handleOpenInNewTab = useCallback((doc: DocumentNode) => {
    openTab(doc.id, doc.title);
  }, [openTab]);

  const expandedStorageKey = useMemo(() => {
    if (!activeWorkspaceId) return null;
    return `expandedDocuments:${activeWorkspaceId}`;
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!expandedStorageKey) {
      setExpandedIds(new Set());
      return;
    }
    const stored = sessionStorage.getItem(expandedStorageKey);
    if (stored) {
      try {
        const parsed: string[] = JSON.parse(stored);
        setExpandedIds(new Set(parsed));
        return;
      } catch {
        // ignore parse errors and fall through to default
      }
    }
    const defaultExpanded = new Set<string>();
    documents.forEach((doc) => {
      if (doc.children.length > 0) {
        defaultExpanded.add(doc.id);
      }
    });
    setExpandedIds(defaultExpanded);
  }, [expandedStorageKey, documents]);

  const persistExpanded = useCallback((next: Set<string>) => {
    if (!expandedStorageKey) return;
    sessionStorage.setItem(expandedStorageKey, JSON.stringify(Array.from(next)));
  }, [expandedStorageKey]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      persistExpanded(next);
      return next;
    });
  }, [persistExpanded]);

  const findAncestorIds = useCallback((nodes: DocumentNode[], targetId: string, path: string[] = []): string[] => {
    for (const node of nodes) {
      const nextPath = [...path, node.id];
      if (node.id === targetId) {
        return path;
      }
      const result = findAncestorIds(node.children, targetId, nextPath);
      if (result.length > 0) {
        return result;
      }
    }
    return [];
  }, []);

  const activeDocumentId = useMemo(() => {
    const match = pathname.match(/\/documents\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  useEffect(() => {
    if (!activeDocumentId) return;
    setExpandedIds((prev) => {
      const ancestors = findAncestorIds(documents, activeDocumentId);
      if (ancestors.length === 0) return prev;
      const next = new Set(prev);
      let changed = false;
      ancestors.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      if (changed) {
        persistExpanded(next);
        return next;
      }
      return prev;
    });
  }, [activeDocumentId, documents, findAncestorIds, persistExpanded]);

  const handleAddSubpage = useCallback(
    async (parent: DocumentNode) => {
      if (!activeWorkspaceId) return;
      const newDoc = await createDocument('Untitled', activeWorkspaceId, parent.id);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(parent.id);
        persistExpanded(next);
        return next;
      });
      openDocument(newDoc.id, newDoc.title);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: activeWorkspaceId } }));
    },
    [activeWorkspaceId, openDocument, persistExpanded]
  );

  const renderNodes = useCallback((nodes: DocumentNode[], depth: number = 0) => {
    return nodes.map((doc) => {
      const isActive = pathname === `/documents/${doc.id}`;
      const hasChildren = doc.children.length > 0;
      const isExpanded = expandedIds.has(doc.id);
      return (
        <div key={doc.id}>
          <div
            className={`group flex items-center gap-1 rounded-lg transition-colors ${
              isActive
                ? 'bg-secondary text-secondary-foreground font-medium'
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            }`}
            style={{ paddingLeft: depth * 12 + 8 }}
          >
            <button
              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() => hasChildren && toggleExpanded(doc.id)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              disabled={!hasChildren}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              ) : (
                <span className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => openDocument(doc.id, doc.title)}
              className="flex items-start gap-2 flex-1 min-w-0 text-left py-2"
            >
              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {doc.title || 'Untitled'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                </div>
              </div>
            </button>
            <div className="flex items-center gap-1 pr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddSubpage(doc);
                }}
                aria-label="Add subpage"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDoc(doc);
                      setRenameDialogOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddSubpage(doc);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subpage
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInNewTab(doc);
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDoc(doc);
                      setDeleteDialogOpen(true);
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
          {hasChildren && isExpanded && (
            <div>
              {renderNodes(doc.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  }, [expandedIds, handleAddSubpage, handleOpenInNewTab, openDocument, pathname, toggleExpanded]);

  if (documents.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No documents yet
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="p-1 space-y-0.5">
          {renderNodes(documents)}
        </div>
      </div>

      {/* Rename Dialog */}
      {selectedDoc && (
        <RenameDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          currentTitle={selectedDoc.title}
          onRename={handleRename}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {selectedDoc && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Move to Trash"
          description={`Are you sure you want to move "${selectedDoc.title || 'Untitled'}" to trash?`}
          confirmText="Move to Trash"
          cancelText="Cancel"
          onConfirm={handleDelete}
          variant="destructive"
        />
      )}
    </>
  );
}
