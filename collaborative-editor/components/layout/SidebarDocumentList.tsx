"use client";

import { useState, memo } from 'react';
import {
  FileText,
  MoreHorizontal,
  Edit2,
  Trash2,
  ExternalLink,
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
import { updateDocument, deleteDocument, duplicateDocument } from '@/lib/db/documents';
import { useNavigation } from '@/contexts/NavigationContext';
import type { DocumentFont, DocumentMetadata } from '@/lib/db/types';
import { DocumentListSkeleton } from '@/components/ui/document-list-skeleton';
import { cn } from '@/lib/utils';

interface SidebarDocumentListProps {
  documents: DocumentMetadata[];
  userId: string;
  isLoading?: boolean;
}

function SidebarDocumentList({ documents, userId, isLoading = false }: SidebarDocumentListProps) {
  const { openDocument } = useNavigation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentMetadata | null>(null);

  const handleRename = async (newTitle: string) => {
    if (!selectedDoc) return;
    await updateDocument(selectedDoc.id, { title: newTitle });
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: selectedDoc.workspaceId } }));
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    await deleteDocument(selectedDoc.id);
    window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: selectedDoc.workspaceId } }));
    setDeleteDialogOpen(false);
  };

  const handleOpenInNewTab = (doc: DocumentMetadata) => {
    openDocument(doc.id, doc.title);
  };

  const handleDuplicate = async (doc: DocumentMetadata) => {
    try {
      const dup = await duplicateDocument(doc.id);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId: dup.workspaceId } }));
      openDocument(dup.id, dup.title);
    } catch (err) {
      console.error('Failed to duplicate document:', err);
      alert('Failed to duplicate document');
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (doc.ownerId === userId) return true;
    
    if (doc.collaborators && doc.collaborators.some((collab) => collab.userId === userId)) {
      return true;
    }

    return false;
  });

  const FONT_CLASS_MAP: Record<DocumentFont, string> = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  };

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
        <div className="px-2 py-1 space-y-0.5">
          {filteredDocuments.map((doc) => (
            <SidebarDocumentItem
              key={doc.id}
              doc={doc}
              openDocument={openDocument}
              setSelectedDoc={setSelectedDoc}
              setRenameDialogOpen={setRenameDialogOpen}
              setDeleteDialogOpen={setDeleteDialogOpen}
              handleOpenInNewTab={handleOpenInNewTab}
              handleDuplicate={handleDuplicate}
              fontClassMap={FONT_CLASS_MAP}
            />
          ))}
        </div>
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
    </>
  );
}

interface SidebarDocumentItemProps {
  doc: DocumentMetadata;
  openDocument: (id: string, title: string) => void;
  setSelectedDoc: (doc: DocumentMetadata | null) => void;
  setRenameDialogOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  handleOpenInNewTab: (doc: DocumentMetadata) => void;
  handleDuplicate: (doc: DocumentMetadata) => void;
  fontClassMap: Record<DocumentFont, string>;
}

function SidebarDocumentItem({
  doc,
  openDocument,
  setSelectedDoc,
  setRenameDialogOpen,
  setDeleteDialogOpen,
  handleOpenInNewTab,
  handleDuplicate,
  fontClassMap,
}: SidebarDocumentItemProps) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isActive = pathname === `/dashboard/documents/${doc.id}`;

  return (
    <div className="relative group">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl",
          "pl-1 py-1.5 pr-1",
          "transition-all duration-200 ease-out",
          "hover:bg-white/[0.03]",
          isActive && [
            "bg-accent/15",
            "border-l-3 border-l-accent",
            "shadow-[0_0_20px_-5px_rgba(255,184,107,0.12)]",
            "ring-1 ring-accent/20"
          ],
          !isActive && "border-l border-transparent"
        )}
      >
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
          <FileText
            className={cn(
              "flex-shrink-0 w-[18px] h-[18px] transition-colors duration-150",
              isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground/80"
            )}
          />
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "truncate text-[14px] transition-colors duration-150",
                isActive ? "text-foreground font-medium" : "text-muted-foreground font-normal",
                fontClassMap[doc.font ?? 'sans']
              )}
            >
              {doc.title || 'Untitled'}
            </div>
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="w-7 h-7 rounded-lg opacity-30 hover:opacity-100 hover:bg-white/[0.08] transition-all duration-150 ease-out text-muted-foreground/60 hover:text-foreground"
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
  );
}

const SidebarDocumentListMemo = memo(SidebarDocumentList);
SidebarDocumentListMemo.displayName = 'SidebarDocumentList';

export { SidebarDocumentListMemo as SidebarDocumentList };
