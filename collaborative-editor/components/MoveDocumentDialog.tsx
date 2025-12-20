'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderPlus, CornerUpLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { DocumentNodeMetadata, DocumentMetadata } from '@/lib/db/types';
import { getDescendantsMetadata, getDocumentTreeMetadata, moveDocument } from '@/lib/db/documents';

const ROOT_VALUE = '__ROOT__';

interface MoveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  currentParentId?: string;
  workspaceId: string;
  onMoved?: (newParentId: string | null) => void;
}

export function MoveDocumentDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  currentParentId,
  workspaceId,
  onMoved,
}: MoveDocumentDialogProps) {
  const [tree, setTree] = useState<DocumentNodeMetadata[]>([]);
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  const [value, setValue] = useState<string>(currentParentId ?? ROOT_VALUE);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [treeData, descendants] = await Promise.all([
          getDocumentTreeMetadata(workspaceId),
          getDescendantsMetadata(documentId),
        ]);

        if (!mounted) return;

        const invalid = new Set<string>([documentId, ...descendants.map((doc) => doc.id)]);
        setTree(treeData);
        setInvalidIds(invalid);
        setValue(currentParentId ?? ROOT_VALUE);
      } catch (error) {
        console.error('Failed to load move dialog data:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [open, workspaceId, documentId, currentParentId]);

  useEffect(() => {
    if (!open) {
      setTree([]);
      setInvalidIds(new Set());
      setSubmitting(false);
    }
  }, [open]);

  const isSelectionUnchanged = useMemo(() => {
    const selectedParent = value === ROOT_VALUE ? null : value;
    const current = currentParentId ?? null;
    return selectedParent === current;
  }, [value, currentParentId]);

  const handleSubmit = useCallback(async () => {
    const targetParentId = value === ROOT_VALUE ? null : value;

    if (isSelectionUnchanged) {
      onOpenChange(false);
      return;
    }

    setSubmitting(true);
    try {
      await moveDocument(documentId, workspaceId, targetParentId || undefined);
      onMoved?.(targetParentId);
      window.dispatchEvent(new CustomEvent('documentsChanged', { detail: { workspaceId } }));
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to move document:', error);
      alert('Failed to move document');
    } finally {
      setSubmitting(false);
    }
  }, [documentId, isSelectionUnchanged, onMoved, onOpenChange, value, workspaceId]);

  const renderOptions = useCallback(
    (nodes: DocumentNodeMetadata[], depth = 0) => {
      return nodes.map((node) => {
        const isInvalid = invalidIds.has(node.id);
        const updatedLabel = formatDistanceToNow(new Date(node.updatedAt), { addSuffix: true });

        return (
          <div key={node.id} className="space-y-2">
            <label
              className={cn(
                'flex items-start gap-3 rounded-xl p-4 transition-all cursor-pointer',
                isInvalid
                  ? 'neu-card opacity-40 cursor-not-allowed'
                  : 'neu-card hover:transform hover:-translate-y-1'
              )}
              style={{ paddingLeft: depth * 20 + 16 }}
            >
              <RadioGroupItem value={node.id} id={`move-${node.id}`} disabled={isInvalid} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {node.title || 'Untitled'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Updated {updatedLabel}
                </span>
                {isInvalid && (
                  <span className="text-[11px] text-muted-foreground/80 mt-1">
                    Cannot move into this page.
                  </span>
                )}
              </div>
            </label>
            {node.children.length > 0 && (
              <div className="space-y-2">
                {renderOptions(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      });
    },
    [invalidIds]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className="glass w-10 h-10 rounded-xl flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-primary" />
            </div>
            Move "{documentTitle || 'Untitled'}"
          </DialogTitle>
          <DialogDescription className="text-base">
            Select a new parent page. You can move this note under any other note in the workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Destination</Label>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="w-8 h-8 mx-auto mb-3 opacity-50 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <p className="text-sm">Loading pages…</p>
            </div>
          ) : (
            <RadioGroup value={value} onValueChange={setValue}>
              <div className="space-y-2">
                <label className="flex items-center gap-3 neu-card p-4 hover:transform hover:-translate-y-1 transition-all cursor-pointer rounded-xl">
                  <RadioGroupItem value={ROOT_VALUE} id="move-root" />
                  <div className="flex items-center gap-3 text-sm">
                    <CornerUpLeft className="w-4 h-4 text-primary" />
                    <span className="font-medium">Move to top level</span>
                  </div>
                </label>
              </div>

              <ScrollArea className="max-h-80 mt-3">
                <div className="space-y-2 pr-2">
                  {renderOptions(tree, 0)}
                </div>
              </ScrollArea>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="glass" onClick={() => onOpenChange(false)} disabled={submitting} className="h-10">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || submitting || isSelectionUnchanged} className="h-10">
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
