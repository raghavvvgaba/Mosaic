"use client";

import { useMemo, useState, useEffect, useCallback, memo } from 'react';
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
import type { DocumentFont, DocumentNodeMetadata } from '@/lib/db/types';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { MoveDocumentDialog } from '@/components/MoveDocumentDialog';
import { cn } from '@/lib/utils';
import { DocumentListSkeleton } from '@/components/ui/document-list-skeleton';

// Depth-based styling utilities
const getDepthStyles = (depth: number) => {
  const styles = [
    { padding: 'pl-1', indent: 0, borderLeft: '', textSize: 'text-[14px]', iconSize: 'w-[18px] h-[18px]' },
    { padding: 'pl-7', indent: 1, borderLeft: 'border-l border-white/5', textSize: 'text-[13px]', iconSize: 'w-[16px] h-[16px]' },
    { padding: 'pl-11', indent: 2, borderLeft: 'border-l border-white/10', textSize: 'text-[12.5px]', iconSize: 'w-[15px] h-[15px]' },
    { padding: 'pl-[3.5rem]', indent: 3, borderLeft: 'border-l border-white/15', textSize: 'text-[12px]', iconSize: 'w-[14px] h-[14px]' },
    { padding: 'pl-[4.25rem]', indent: 4, borderLeft: 'border-l border-white/10', textSize: 'text-[12px]', iconSize: 'w-[14px] h-[14px]' },
    { padding: 'pl-[5rem]', indent: 5, borderLeft: 'border-l border-white/10', textSize: 'text-[12px]', iconSize: 'w-[14px] h-[14px]' },
  ];
  return styles[Math.min(Math.max(depth, 0), styles.length - 1)];
};

const isLastChild = (children: DocumentNodeMetadata[], index: number) => {
  return index === children.length - 1;
};

interface SidebarDocumentListProps {
  documents: DocumentNodeMetadata[];
  userId: string;
  isLoading?: boolean;
}

function SidebarDocumentList({ documents, userId, isLoading = false }: SidebarDocumentListProps) {
  const pathname = usePathname();
  const { openDocument } = useNavigation();
  const { activeWorkspaceId } = useWorkspace();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentNodeMetadata | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<DocumentNodeMetadata | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [invalidDropTargets, setInvalidDropTargets] = useState<Set<string>>(new Set());

  const handleRename = async (newTitle: string) => {
    if (!selectedDoc) return;
    const updatedDoc = await updateDocument(selectedDoc.id, { title: newTitle });
    const workspaceId = selectedDoc.workspaceId || activeWorkspaceId;

    window.dispatchEvent(new CustomEvent('documentUpdated', {
      detail: {
        workspaceId,
        documentId: selectedDoc.id,
        document: updatedDoc,
        operation: 'title'
      }
    }));
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    await deleteDocument(selectedDoc.id);
    const workspaceId = selectedDoc.workspaceId || activeWorkspaceId;
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
    setDeleteDialogOpen(false);
  };

  const handleOpenInNewTab = useCallback(
    (doc: DocumentNodeMetadata) => {
      openDocument(doc.id, doc.title);
    },
    [openDocument]
  );

  const handleDuplicate = useCallback(async (doc: DocumentNodeMetadata) => {
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

  const findAncestorIds = useCallback((nodes: DocumentNodeMetadata[], targetId: string, path: string[] = []): string[] => {
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
    async (parent: DocumentNodeMetadata) => {
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

    const collect = (node: DocumentNodeMetadata): string[] => {
      const childIds = node.children.flatMap((child) => [child.id, ...collect(child)]);
      map.set(node.id, childIds);
      return childIds;
    };

    documents.forEach((doc) => {
      collect(doc);
    });

    return map;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (doc.ownerId === userId) return true;

      if (doc.collaborators && doc.collaborators.some((collab) => collab.userId === userId)) {
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
      <div className="px-6 py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 mb-4">
          <FileText className="w-8 h-8 text-muted-foreground/60" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">No documents yet</p>
        <p className="text-xs text-muted-foreground/60">Create your first document to get started</p>
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
      className={cn(
        "mx-2 mb-3 rounded-xl border border-dashed px-3 py-2 transition-all duration-200",
        "border-white/5 bg-white/[0.02]",
        active && "opacity-100",
        !active && "opacity-40 pointer-events-none",
        isOver && "border-accent/50 bg-accent/10 shadow-[0_0_20px_-5px_rgba(255,184,107,0.15)]"
      )}
    >
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Plus className="w-3.5 h-3.5" />
        <span>Drop here to move to top level</span>
      </div>
    </div>
  );
}

interface RootContainerProps {
  documents: DocumentNodeMetadata[];
  pathname: string;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  openDocument: (id: string, title: string) => void;
  handleAddSubpage: (doc: DocumentNodeMetadata) => void;
  handleOpenInNewTab: (doc: DocumentNodeMetadata) => void;
  setSelectedDoc: (doc: DocumentNodeMetadata | null) => void;
  setRenameDialogOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setMoveTarget: (doc: DocumentNodeMetadata | null) => void;
  setMoveDialogOpen: (open: boolean) => void;
  invalidDropTargets: Set<string>;
  draggingId: string | null;
  fontClassMap: Record<DocumentFont, string>;
  handleDuplicate: (doc: DocumentNodeMetadata) => void;
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
      className={cn(
        "relative px-2 py-1",
        isOver && "after:absolute after:inset-0 after:rounded-xl after:border-2 after:border-accent/30 after:content-['']"
      )}
    >
      {documents.map((doc, index) => (
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
          isLastChild={index === documents.length - 1}
          children={documents}
          childIndex={index}
        />
      ))}
    </div>
  );
}

interface SidebarNodeProps {
  doc: DocumentNodeMetadata;
  depth: number;
  pathname: string;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  openDocument: (id: string, title: string) => void;
  handleAddSubpage: (doc: DocumentNodeMetadata) => void;
  handleOpenInNewTab: (doc: DocumentNodeMetadata) => void;
  setSelectedDoc: (doc: DocumentNodeMetadata | null) => void;
  setRenameDialogOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setMoveTarget: (doc: DocumentNodeMetadata | null) => void;
  setMoveDialogOpen: (open: boolean) => void;
  invalidDropTargets: Set<string>;
  draggingId: string | null;
  fontClassMap: Record<DocumentFont, string>;
  handleDuplicate: (doc: DocumentNodeMetadata) => void;
  isLastChild?: boolean;
  children?: DocumentNodeMetadata[];
  childIndex?: number;
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
  isLastChild = false,
  children = [],
  childIndex = 0,
}: SidebarNodeProps) {
  const isActive = pathname === `/dashboard/documents/${doc.id}`;
  const hasChildren = doc.children.length > 0;
  const isExpanded = expandedIds.has(doc.id);
  const isDragged = draggingId === doc.id;
  const droppableDisabled = invalidDropTargets.has(doc.id);
  const depthStyles = getDepthStyles(depth);

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

  // Tree line connector for nested items
  const hasTreeLine = depth > 0;
  const showTreeLineDown = !isLastChild || (hasChildren && isExpanded);

  return (
    <div ref={setRefs} style={style} className={cn("relative", isDragged && "opacity-40")}>
      {/* Tree Line - Vertical connector from parent */}
      {hasTreeLine && (
        <div
          className={cn(
            "absolute left-[1.125rem] top-0 bottom-0 w-px border-r border-white/5",
            !showTreeLineDown && "h-6"
          )}
          aria-hidden="true"
        />
      )}

      {/* Tree Line - Horizontal connector to document */}
      {hasTreeLine && (
        <div
          className={cn(
            "absolute left-[1.125rem] top-[1.875rem] w-4 h-px border-t border-white/5 rounded-r-sm",
            "origin-right"
          )}
          aria-hidden="true"
        />
      )}

      {/* Document Row */}
      <div
        className={cn(
          // Base styles
          "group relative flex items-center gap-1.5 rounded-xl",
          // Padding based on depth
          depthStyles.padding,
          // Border left for depth indication
          depthStyles.borderLeft,
          // Transitions
          "transition-all duration-200 ease-out",
          // Active state - distinctive and unmistakable
          isActive && [
            "bg-accent/15",
            "border-l-3 border-l-accent",
            "shadow-[0_0_20px_-5px_rgba(255,184,107,0.12)]",
            "ring-1 ring-accent/20"
          ],
          // Inactive state
          !isActive && [
            "border-l border-transparent",
            "hover:bg-white/[0.03]",
            "hover:border-l-white/10"
          ],
          // Drop zone feedback
          isOver && !droppableDisabled && [
            "bg-accent/10",
            "border-l-2 border-l-accent/50",
            "ring-2 ring-accent/30"
          ],
          // Disabled drop target
          droppableDisabled && draggingId && "opacity-50 grayscale"
        )}
        {...listeners}
        {...attributes}
      >
        {/* Expand/Collapse Chevron */}
        {hasChildren ? (
          <button
            className={cn(
              "flex items-center justify-center w-5 h-5 rounded-lg",
              "text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.05]",
              "transition-all duration-200 ease-out",
              "focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isExpanded && "text-accent",
              !hasChildren && "invisible"
            )}
            onClick={() => toggleExpanded(doc.id)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
          >
            <ChevronRight
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-300 ease-out",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <div className="w-5 h-5" aria-hidden="true" />
        )}

        {/* Document Content - Icon + Title */}
        <button
          onClick={() => openDocument(doc.id, doc.title)}
          className={cn(
            "flex items-center gap-2 flex-1 min-w-0 text-left",
            "py-1.5 pr-1 rounded-lg",
            "transition-all duration-150 ease-out",
            "focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          {/* Document Icon */}
          <FileText
            className={cn(
              "flex-shrink-0 transition-colors duration-150",
              depthStyles.iconSize,
              isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground/80"
            )}
          />

          {/* Document Title */}
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "truncate transition-colors duration-150",
                depthStyles.textSize,
                isActive ? "text-foreground font-medium" : "text-muted-foreground font-normal",
                fontClassMap[doc.font ?? 'sans']
              )}
            >
              {doc.title || 'Untitled'}
            </div>
          </div>
        </button>

        {/* Action Buttons - Always visible but subtle */}
        <div className="flex items-center gap-0.5 pr-1.5">
          {/* Add Subpage Button */}
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              "w-7 h-7 rounded-lg",
              hasChildren ? "opacity-40" : "opacity-30",
              "hover:opacity-100 hover:bg-white/[0.08]",
              "transition-all duration-150 ease-out",
              "text-muted-foreground/60 hover:text-foreground"
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleAddSubpage(doc);
            }}
            aria-label="Add subpage"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>

          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "w-7 h-7 rounded-lg",
                  hasChildren ? "opacity-40" : "opacity-30",
                  "hover:opacity-100 hover:bg-white/[0.08]",
                  "transition-all duration-150 ease-out",
                  "text-muted-foreground/60 hover:text-foreground"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
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

      {/* Children Container with Animation */}
      {hasChildren && isExpanded && (
        <div className="relative overflow-hidden">
          <div
            className={cn(
              "space-y-0.5",
              "animate-children-reveal"
            )}
          >
            {doc.children.map((child, index) => (
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
                isLastChild={index === doc.children.length - 1}
                children={doc.children}
                childIndex={index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
const SidebarDocumentListMemo = memo(SidebarDocumentList);
SidebarDocumentListMemo.displayName = 'SidebarDocumentList';

export { SidebarDocumentListMemo as SidebarDocumentList };
