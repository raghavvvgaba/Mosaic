"use client";

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { usePathname } from 'next/navigation';
import {
  FileText,
  MoreHorizontal,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  Copy,
} from 'lucide-react';
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
import { updateDocument, deleteDocument, createDocument, moveDocument, duplicateDocument } from '@/lib/db/documents';
import { useNavigation } from '@/contexts/NavigationContext';
import type { DocumentFont, DocumentNode } from '@/lib/db/types';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { MoveDocumentDialog } from '@/components/MoveDocumentDialog';
import { cn } from '@/lib/utils';
import { DocumentListSkeleton } from '@/components/ui/document-list-skeleton';

// Indentation utility based on tree depth
const depthPaddingClass = (depth: number) => {
  const paddings = ['pl-2', 'pl-4', 'pl-6', 'pl-8', 'pl-10', 'pl-12'];
  return paddings[Math.min(Math.max(depth, 0), paddings.length - 1)];
};

interface SidebarDocumentListProps {
  documents: DocumentNode[];
  userId: string;
  isLoading?: boolean;
}

export function SidebarDocumentList({ documents, userId, isLoading = false }: SidebarDocumentListProps) {
  const pathname = usePathname();
  const { openDocument } = useNavigation();
  const { activeWorkspaceId } = useWorkspace();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentNode | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<DocumentNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [invalidDropTargets, setInvalidDropTargets] = useState<Set<string>>(new Set());

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

  const handleOpenInNewTab = useCallback(
    (doc: DocumentNode) => {
      // Simply navigate to the document (replacing current view)
      openDocument(doc.id, doc.title);
    },
    [openDocument]
  );

  const handleDuplicate = useCallback(async (doc: DocumentNode) => {
    try {
      const dup = await duplicateDocument(doc.id);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: dup.workspaceId } }));
      openDocument(dup.id, dup.title);
    } catch (err) {
      console.error('Failed to duplicate document:', err);
      alert('Failed to duplicate document');
    }
  }, [openDocument]);

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

  const persistExpanded = useCallback(
    (next: Set<string>) => {
      if (!expandedStorageKey) return;
      sessionStorage.setItem(expandedStorageKey, JSON.stringify(Array.from(next)));
    },
    [expandedStorageKey]
  );

  const toggleExpanded = useCallback(
    (id: string) => {
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
    },
    [persistExpanded]
  );

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

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const FONT_CLASS_MAP: Record<DocumentFont, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };

  const descendantMap = useMemo(() => {
    const map = new Map<string, string[]>();

    const collect = (node: DocumentNode): string[] => {
      const childIds = node.children.flatMap((child) => [child.id, ...collect(child)]);
      map.set(node.id, childIds);
      return childIds;
    };

    documents.forEach((doc) => {
      collect(doc);
    });

    return map;
  }, [documents]);

  // Filter documents by user ownership and permissions
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Show documents owned by the user
      if (doc.ownerId === userId) return true;

      // Show documents where user is in collaborators list
      if (doc.collaborators && doc.collaborators.some((collab) => collab.userId === userId)) {
        return true;
      }

      // Show documents with user permissions
      if (doc.permissions && doc.permissions.some((perm) => perm.userId === userId)) {
        return true;
      }

      return false;
    });
  }, [documents, userId]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = event.active.id as string;
      setDraggingId(id);
      const descendantIds = descendantMap.get(id) ?? [];
      setInvalidDropTargets(new Set([id, ...descendantIds]));
    },
    [descendantMap]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const disallowed = invalidDropTargets;
      setDraggingId(null);
      setInvalidDropTargets(new Set());

      if (!over) return;

      const activeId = active.id as string;
      let overId = over.id as string;

      if (overId === 'root-dropzone' || overId === 'root-container') {
        overId = '';
      }

      if (overId && disallowed.has(overId)) {
        return;
      }

      const currentParent = (active.data.current?.parentId as string | undefined) ?? '';
      const nextParent = overId ?? '';

      if (currentParent === nextParent) {
        return;
      }

      try {
        await moveDocument(activeId, activeWorkspaceId || '', overId || undefined);
        if (overId) {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            if (!next.has(overId)) {
              next.add(overId);
              persistExpanded(next);
            }
            return next;
          });
        }
        const workspaceId = active.data.current?.workspaceId as string | undefined;
        window.dispatchEvent(
          new CustomEvent('documentsChanged', { detail: { workspaceId: workspaceId || activeWorkspaceId } })
        );
      } catch (error) {
        console.error('Failed to move document:', error);
        alert('Failed to move document');
      }
    },
    [activeWorkspaceId, invalidDropTargets, persistExpanded]
  );

  if (isLoading) {
    return <DocumentListSkeleton />;
  }

  if (filteredDocuments.length === 0) {
    return (
      <div className="px-4 py-1 text-center text-sm text-muted-foreground">
        No documents yet
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <RootDropZone active={draggingId !== null} />
          <RootContainer
            documents={filteredDocuments}
            pathname={pathname}
            expandedIds={expandedIds}
            toggleExpanded={toggleExpanded}
            openDocument={openDocument}
            handleAddSubpage={handleAddSubpage}
            handleOpenInNewTab={handleOpenInNewTab}
            setSelectedDoc={setSelectedDoc}
            setRenameDialogOpen={setRenameDialogOpen}
            setDeleteDialogOpen={setDeleteDialogOpen}
            setMoveTarget={setMoveTarget}
            setMoveDialogOpen={setMoveDialogOpen}
            invalidDropTargets={invalidDropTargets}
            draggingId={draggingId}
            fontClassMap={FONT_CLASS_MAP}
            handleDuplicate={handleDuplicate}
          />
          <DragOverlay />
        </DndContext>
      </div>

      {selectedDoc && (
        <RenameDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          currentTitle={selectedDoc.title}
          onRename={handleRename}
        />
      )}

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

      {moveTarget && activeWorkspaceId && (
        <MoveDocumentDialog
          open={moveDialogOpen}
          onOpenChange={(open) => {
            setMoveDialogOpen(open);
            if (!open) {
              setMoveTarget(null);
            }
          }}
          documentId={moveTarget.id}
          documentTitle={moveTarget.title}
          currentParentId={moveTarget.parentId}
          workspaceId={activeWorkspaceId}
          onMoved={(newParentId) => {
            setMoveDialogOpen(false);
            setMoveTarget(null);
            if (newParentId) {
              setExpandedIds((prev) => {
                const next = new Set(prev);
                if (!next.has(newParentId)) {
                  next.add(newParentId);
                  persistExpanded(next);
                }
                return next;
              });
            }
          }}
        />
      )}
    </>
  );
}

function RootDropZone({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'root-dropzone' });

  return (
    <div
      ref={setNodeRef}
      className={`mx-1 mb-1 rounded-md border border-dashed text-xs px-2 py-1.5 transition-colors ${
        isOver ? 'border-accent bg-accent/20 text-accent-foreground' : 'border-border text-muted-foreground'
      } ${active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      Drop here to move to top level
    </div>
  );
}

interface RootContainerProps {
  documents: DocumentNode[];
  pathname: string;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  openDocument: (id: string, title: string) => void;
  handleAddSubpage: (doc: DocumentNode) => void;
  handleOpenInNewTab: (doc: DocumentNode) => void;
  setSelectedDoc: (doc: DocumentNode | null) => void;
  setRenameDialogOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setMoveTarget: (doc: DocumentNode | null) => void;
  setMoveDialogOpen: (open: boolean) => void;
  invalidDropTargets: Set<string>;
  draggingId: string | null;
  fontClassMap: Record<DocumentFont, string>;
  handleDuplicate: (doc: DocumentNode) => void;
}

function RootContainer({
  documents,
  pathname,
  expandedIds,
  toggleExpanded,
  openDocument,
  handleAddSubpage,
  handleOpenInNewTab,
  setSelectedDoc,
  setRenameDialogOpen,
  setDeleteDialogOpen,
  setMoveTarget,
  setMoveDialogOpen,
  invalidDropTargets,
  draggingId,
  fontClassMap,
  handleDuplicate,
}: RootContainerProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'root-container' });

  return (
      <div
        ref={setNodeRef}
        className={`relative px-2 py-0 space-y-0.5 ${isOver ? 'ring-2 ring-accent/50 rounded-lg' : ''}`}
      >
      {documents.map((doc) => (
          <SidebarNode
            key={doc.id}
            doc={doc}
            depth={0}
            pathname={pathname}
            expandedIds={expandedIds}
            toggleExpanded={toggleExpanded}
            openDocument={openDocument}
            handleAddSubpage={handleAddSubpage}
            handleOpenInNewTab={handleOpenInNewTab}
            setSelectedDoc={setSelectedDoc}
            setRenameDialogOpen={setRenameDialogOpen}
            setDeleteDialogOpen={setDeleteDialogOpen}
            setMoveTarget={setMoveTarget}
            setMoveDialogOpen={setMoveDialogOpen}
            invalidDropTargets={invalidDropTargets}
            draggingId={draggingId}
            fontClassMap={fontClassMap}
            handleDuplicate={handleDuplicate}
          />

      ))}
    </div>
  );
}

interface SidebarNodeProps {
  doc: DocumentNode;
  depth: number;
  pathname: string;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  openDocument: (id: string, title: string) => void;
  handleAddSubpage: (doc: DocumentNode) => void;
  handleOpenInNewTab: (doc: DocumentNode) => void;
  setSelectedDoc: (doc: DocumentNode | null) => void;
  setRenameDialogOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setMoveTarget: (doc: DocumentNode | null) => void;
  setMoveDialogOpen: (open: boolean) => void;
  invalidDropTargets: Set<string>;
  draggingId: string | null;
  fontClassMap: Record<DocumentFont, string>;
  handleDuplicate: (doc: DocumentNode) => void;
}

function SidebarNode({
  doc,
  depth,
  pathname,
  expandedIds,
  toggleExpanded,
  openDocument,
  handleAddSubpage,
  handleOpenInNewTab,
  setSelectedDoc,
  setRenameDialogOpen,
  setDeleteDialogOpen,
  setMoveTarget,
  setMoveDialogOpen,
  invalidDropTargets,
  draggingId,
  fontClassMap,
  handleDuplicate,
}: SidebarNodeProps) {
  const isActive = pathname === `/dashboard/documents/${doc.id}`;
  const hasChildren = doc.children.length > 0;
  const isExpanded = expandedIds.has(doc.id);
  const isDragged = draggingId === doc.id;
  const droppableDisabled = invalidDropTargets.has(doc.id);

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: doc.id,
    disabled: droppableDisabled,
  });

  const { attributes, listeners, setNodeRef: setDragRef, transform } = useDraggable({
    id: doc.id,
    data: {
      parentId: doc.parentId ?? '',
      workspaceId: doc.workspaceId,
    },
  });

  const setRefs = (node: HTMLDivElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div ref={setRefs} style={style} className={isDragged ? 'opacity-60' : undefined}>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg transition-colors',
          isActive
            ? 'bg-secondary text-secondary-foreground font-medium border border-secondary-foreground/20'
            : 'hover:bg-accent text-muted-foreground hover:text-foreground border border-transparent hover:border-accent/50',
          isOver && !droppableDisabled && 'border-accent bg-accent/20',
          depthPaddingClass(depth)
        )}
        {...listeners}
        {...attributes}
      >
         {hasChildren ? (
           <button
             className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded"
             onClick={() => toggleExpanded(doc.id)}
             aria-label={isExpanded ? 'Collapse' : 'Expand'}
           >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
           </button>
         ) : (
           <div className="h-6 w-6 flex items-center justify-center">
             <span className="w-4 h-4" aria-hidden="true" />
           </div>
         )}
         <button
           onClick={() => openDocument(doc.id, doc.title)}
           className="flex items-start gap-2 flex-1 min-w-0 text-left py-2 rounded focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
         >
          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
          <div className="flex-1 min-w-0">
            <div className={cn('font-medium text-sm truncate', fontClassMap[doc.font ?? 'sans'])}>
              {doc.title || 'Untitled'}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 pr-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
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
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
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
                  handleDuplicate(doc);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveTarget(doc);
                  setMoveDialogOpen(true);
                }}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Move to…
              </DropdownMenuItem>
              {/* Note: "Add Subpage" menu item removed to avoid redundancy with the quick action button above */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenInNewTab(doc);
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  // Safely get the origin URL with fallback
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  const url = `${origin}/dashboard/documents/${doc.id}`;
                  navigator.clipboard.writeText(url).catch((error) => {
                    console.error('Clipboard write failed:', error);
                    alert('Failed to copy link to clipboard. Please copy it manually: ' + url);
                  });
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy link
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
          {doc.children.map((child) => (
            <SidebarNode
              key={child.id}
              doc={child}
              depth={depth + 1}
              pathname={pathname}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              openDocument={openDocument}
              handleAddSubpage={handleAddSubpage}
              handleOpenInNewTab={handleOpenInNewTab}
              setSelectedDoc={setSelectedDoc}
              setRenameDialogOpen={setRenameDialogOpen}
              setDeleteDialogOpen={setDeleteDialogOpen}
              setMoveTarget={setMoveTarget}
              setMoveDialogOpen={setMoveDialogOpen}
              invalidDropTargets={invalidDropTargets}
              draggingId={draggingId}
              fontClassMap={fontClassMap}
              handleDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
