'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { DEFAULT_WORKSPACE_ID } from '@/lib/db/constants';

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
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-between"
            disabled={!activeWorkspace}
          >
            <span className="truncate text-left">{activeLabel}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[240px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => setActiveWorkspace(workspace.id)}
              className="flex items-center gap-2"
            >
              <span className="flex-1 truncate">{workspace.name}</span>
              {workspace.id === activeWorkspace?.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setManagerOpen(true)} className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Manage Workspaces…
          </DropdownMenuItem>
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

  useEffect(() => {
    if (!open) {
      setRenamingId(null);
      setRenameValue('');
      setNewWorkspaceName('');
      setCreating(false);
      setRenaming(false);
      setDeletingId(null);
    }
  }, [open]);

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

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (workspaceId === DEFAULT_WORKSPACE_ID) {
      alert('The default workspace cannot be deleted');
      return;
    }
    if (!window.confirm('Delete this workspace? Documents must be moved or deleted before removal.')) {
      return;
    }
    try {
      setDeletingId(workspaceId);
      await deleteWorkspace(workspaceId);
    } catch (error) {
      console.error(error);
      alert((error as Error).message || 'Failed to delete workspace');
    } finally {
      setDeletingId(null);
    }
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
            <Button type="submit" size="sm" disabled={creating}>
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
                  className="rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span>{workspace.name}</span>
                        {workspace.isDefault && (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Default</span>
                        )}
                      </div>
                      {isActive && (
                        <div className="text-xs text-primary">Active workspace</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setActiveWorkspace(workspace.id)}
                        title="Set active"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startRenaming(workspace.id, workspace.name)}
                        title="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!workspace.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteWorkspace(workspace.id)}
                          title="Delete"
                          disabled={deletingId === workspace.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isRenaming && (
                    <form onSubmit={handleRenameWorkspace} className="mt-2 flex items-center gap-2">
                      <Input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        required
                        autoFocus
                      />
                      <Button type="submit" size="sm" disabled={renaming}>
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
      </DialogContent>
    </Dialog>
  );
}
