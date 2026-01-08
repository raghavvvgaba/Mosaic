'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronsUpDown, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
// System workspace constants removed - no more shared workspaces
import { ConfirmDialog } from '@/components/AlertDialog';

export function WorkspaceSwitcher() {
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const [managerOpen, setManagerOpen] = useState(false);

  const activeLabel = useMemo(() => {
    if (!activeWorkspace) return 'Loading workspaces...';
    return activeWorkspace.name;
  }, [activeWorkspace]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="neu-inset w-full h-14 flex items-center justify-center p-2 cursor-pointer">
            <span className="truncate text-center font-medium text-sm">{activeLabel}</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[280px] neu-card border-0 p-3">
          {/* Workspace list with neumorphic styling */}
          <div className="space-y-2">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspace?.id;
              return (
                <div
                  key={workspace.id}
                  onClick={() => setActiveWorkspace(workspace.id)}
                  className={cn(
                    'relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300',
                    isActive
                      ? 'neu-card border border-primary/30 shadow-[inset_0_0_0_1px_rgba(255,184,107,0.2)]'
                      : 'neu-card-hover'
                  )}
                >
                  {/* Active indicator dot */}
                  <div className={cn(
                    'w-2.5 h-2.5 rounded-full transition-all duration-300',
                    isActive
                      ? 'bg-primary shadow-[0_0_10px_rgba(255,184,107,0.5)]'
                      : 'neu-inset'
                  )} />

                  {/* Workspace name */}
                  <span className={cn(
                    'flex-1 truncate text-sm transition-colors',
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-foreground font-medium'
                  )}>
                    {workspace.name}
                  </span>

                  {/* Active workspace indicator */}
                  {isActive && (
                    <div className="w-5 h-5 rounded-full neu-inset flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Neumorphic divider */}
          <div className="my-4">
            <div className="neu-inset h-1 rounded-full" />
          </div>

          {/* Manage workspaces with neumorphic styling */}
          <div
            onClick={() => setManagerOpen(true)}
            className="neu-card-hover p-2 rounded-xl cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 neu-inset rounded-lg flex items-center justify-center group-hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.02)] transition-shadow">
                <Pencil className="h-4 w-4 text-muted-foreground/80" />
              </div>
              <span className="flex-1 text-foreground font-medium">Manage Workspaces</span>
              <div className="w-5 h-5 neu-inset rounded-full flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <WorkspaceManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}

function WorkspaceManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
  } = useWorkspace();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    action: () => Promise<void> | void;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setRenamingId(null);
      setRenameValue('');
      setNewWorkspaceName('');
      setCreating(false);
      setRenaming(false);
      setDeletingId(null);
      setConfirmConfig(null);
    }
  }, [open]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmConfig) return;
    try {
      await confirmConfig.action();
    } finally {
      setConfirmConfig(null);
    }
  }, [confirmConfig]);

  const handleCreateWorkspace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name) return;

    try {
      setCreating(true);
      await createWorkspace(name);
      setNewWorkspaceName('');
    } catch (error) {
      console.error(error);
      alert('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const startRenaming = (workspaceId: string, currentName: string) => {
    setRenamingId(workspaceId);
    setRenameValue(currentName);
  };

  const handleRenameWorkspace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renamingId) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      setRenaming(true);
      await renameWorkspace(renamingId, name);
      setRenamingId(null);
      setRenameValue('');
    } catch (error) {
      console.error(error);
      alert('Failed to rename workspace');
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    // System workspace protection removed - users can now manage their own workspaces
    const target = workspaces.find((workspace) => workspace.id === workspaceId);
    setConfirmConfig({
      title: 'Delete Workspace',
      description: `Delete "${target?.name ?? 'this workspace'}"? Documents must be moved or deleted before removal.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      action: async () => {
        try {
          setDeletingId(workspaceId);
          await deleteWorkspace(workspaceId);
        } catch (error) {
          console.error(error);
          alert((error as Error).message || 'Failed to delete workspace');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Workspaces</DialogTitle>
          <DialogDescription>
            Create, rename, or delete workspaces. Each workspace keeps its own documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <form onSubmit={handleCreateWorkspace} className="flex items-center gap-2">
            <Input
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              placeholder="Workspace name"
              required
            />
            <Button type="submit" size="sm" disabled={creating} className="glass">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </form>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspaceId;
              const isRenaming = renamingId === workspace.id;

              return (
                <div
                  key={workspace.id}
                  className="neu-card px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span>{workspace.name}</span>
                        {workspace.isDefault && (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">Personal</span>
                        )}
                      </div>
                      {isActive && (
                        <div className="text-xs text-primary font-medium">Active workspace</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-accent/20"
                        onClick={() => setActiveWorkspace(workspace.id)}
                        title="Set active"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-accent/20"
                        onClick={() => startRenaming(workspace.id, workspace.name)}
                        title="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteWorkspace(workspace.id)}
                          title="Delete"
                          disabled={deletingId === workspace.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>

                  {isRenaming && (
                    <form onSubmit={handleRenameWorkspace} className="mt-3 flex items-center gap-2">
                      <Input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        required
                        autoFocus
                      />
                      <Button type="submit" size="sm" disabled={renaming} className="glass">
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRenamingId(null);
                          setRenameValue('');
                        }}
                        className="hover:bg-accent/20"
                      >
                        Cancel
                      </Button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <ConfirmDialog
          open={!!confirmConfig}
          onOpenChange={(dialogOpen) => {
            if (!dialogOpen) setConfirmConfig(null);
          }}
          title={confirmConfig?.title ?? ''}
          description={confirmConfig?.description ?? ''}
          confirmText={confirmConfig?.confirmText}
          cancelText={confirmConfig?.cancelText}
          variant={confirmConfig?.variant ?? 'default'}
          onConfirm={handleConfirmAction}
        />
      </DialogContent>
    </Dialog>
  );
}
