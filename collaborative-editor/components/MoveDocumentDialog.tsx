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
import type { DocumentNode } from '@/lib/db/types';
import { getDescendants, getDocumentTree, moveDocument } from '@/lib/db/documents';

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
  const [tree, setTree] = useState<DocumentNode[]>([]);
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
          getDocumentTree(workspaceId),
          getDescendants(documentId),
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
      await moveDocument(documentId, targetParentId);
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
    (nodes: DocumentNode[], depth = 0) => {
      return nodes.map((node) => {
        const isInvalid = invalidIds.has(node.id);
        const updatedLabel = formatDistanceToNow(new Date(node.updatedAt), { addSuffix: true });

        return (
          <div key={node.id} className="space-y-1">
            <label
              className={cn(
                'flex items-start gap-2 rounded-lg border p-2 transition-colors cursor-pointer',
                isInvalid
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-accent'
              )}
              style={{ paddingLeft: depth * 16 + 12 }}
            >
              <RadioGroupItem value={node.id} id={`move-${node.id}`} disabled={isInvalid} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {node.title || 'Untitled'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Updated {updatedLabel}
                </span>
                {isInvalid && (
                  <span className="text-[11px] text-muted-foreground/80">
                    Cannot move into this page.
                  </span>
                )}
              </div>
            </label>
            {node.children.length > 0 && (
              <div className="space-y-1">
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
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Move “{documentTitle || 'Untitled'}”
          </DialogTitle>
          <DialogDescription>
            Select a new parent page. You can move this note under any other note in the workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Destination</Label>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Loading pages…
            </div>
          ) : (
            <RadioGroup value={value} onValueChange={setValue}>
              <div className="space-y-1">
                <label
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 hover:bg-accent cursor-pointer'
                  )}
                >
                  <RadioGroupItem value={ROOT_VALUE} id="move-root" />
                  <div className="flex items-center gap-2 text-sm">
                    <CornerUpLeft className="w-4 h-4" />
                    <span>Move to top level</span>
                  </div>
                </label>
              </div>

              <ScrollArea className="max-h-72 mt-3">
                <div className="space-y-2 pr-2">
                  {renderOptions(tree, 0)}
                </div>
              </ScrollArea>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || submitting || isSelectionUnchanged}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
