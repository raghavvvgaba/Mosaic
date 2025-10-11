'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { FileText, MoreHorizontal, Edit2, Trash2, ExternalLink } from 'lucide-react';
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
import { updateDocument, deleteDocument } from '@/lib/db/documents';
import { useTabs } from '@/contexts/TabsContext';
import type { Document } from '@/lib/db/types';
import { formatDistanceToNow } from 'date-fns';

interface SidebarDocumentListProps {
  documents: Document[];
}

export function SidebarDocumentList({ documents }: SidebarDocumentListProps) {
  const pathname = usePathname();
  const { openDocument, openTab } = useTabs();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const handleRename = async (newTitle: string) => {
    if (!selectedDoc) return;
    await updateDocument(selectedDoc.id, { title: newTitle });
    window.dispatchEvent(new Event('documentsChanged'));
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    await deleteDocument(selectedDoc.id);
    window.dispatchEvent(new Event('documentsChanged'));
    setDeleteDialogOpen(false);
  };

  const handleOpenInNewTab = (doc: Document) => {
    openTab(doc.id, doc.title);
  };

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
        <div className="p-2 space-y-0.5">
          {documents.map((doc) => {
            const isActive = pathname === `/documents/${doc.id}`;
            
            return (
              <div
                key={doc.id}
                className={`group flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-secondary text-secondary-foreground font-medium'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                <button
                  onClick={() => openDocument(doc.id, doc.title)}
                  className="flex items-start gap-2 flex-1 min-w-0 text-left"
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
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
            );
          })}
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
