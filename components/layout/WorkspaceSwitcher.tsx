import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronsUpDown, Plus, Pencil, Trash2, Check, Briefcase, Settings2 } from 'lucide-react';
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
import { cn, getInitials, getWorkspaceColor } from '@/lib/utils';
import { ConfirmDialog } from '@/components/AlertDialog';

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const [managerOpen, setManagerOpen] = useState(false);

  const activeLabel = useMemo(() => {
    if (!activeWorkspace) return 'Loading...';
    return activeWorkspace.name;
  }, [activeWorkspace]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {collapsed ? (
             <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm transition-transform active:scale-95",
                  activeWorkspace ? getWorkspaceColor(activeWorkspace.id) : "bg-muted"
                )}>
                  {activeWorkspace ? getInitials(activeWorkspace.name) : <Briefcase className="h-3.5 w-3.5" />}
                </div>
             </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-between h-12 px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group rounded-xl transition-all"
            >
              <div className="flex items-center gap-3 truncate">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shadow-sm group-hover:shadow transition-all",
                  activeWorkspace ? getWorkspaceColor(activeWorkspace.id) : "bg-primary/10 text-primary"
                )}>
                  {activeWorkspace ? getInitials(activeWorkspace.name) : <Briefcase className="w-4 h-4" />}
                </div>
                <div className="flex flex-col items-start text-left truncate">
                   <span className="truncate text-sm font-semibold tracking-tight">{activeLabel}</span>
                   <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider opacity-70">Workspace</span>
                </div>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          side={collapsed ? "right" : "bottom"}
          className="w-[260px] p-1.5 rounded-xl shadow-xl border-border/50 backdrop-blur-xl bg-background/95"
        >
          <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] px-3 py-2.5">
            Switch Workspace
          </DropdownMenuLabel>
          <div className="space-y-0.5">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspace?.id;
              return (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => setActiveWorkspace(workspace.id)}
                  className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-lg focus:bg-sidebar-accent focus:text-sidebar-accent-foreground group"
                >
                  <div className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm group-focus:shadow-none transition-all",
                    getWorkspaceColor(workspace.id)
                  )}>
                    {getInitials(workspace.name)}
                  </div>
                  <span className={cn("flex-1 truncate text-sm", isActive ? "font-semibold" : "font-medium text-muted-foreground group-focus:text-foreground")}>
                    {workspace.name}
                  </span>
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator className="my-1.5 mx-1 opacity-50" />

          <DropdownMenuItem
            onClick={() => setManagerOpen(true)}
            className="cursor-pointer py-2.5 px-3 rounded-lg text-muted-foreground focus:text-foreground focus:bg-sidebar-accent group"
          >
            <Settings2 className="h-4 w-4 mr-3 opacity-70 group-focus:opacity-100 transition-opacity" />
            <span className="text-sm font-medium">Manage Workspaces</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WorkspaceManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}

export function WorkspaceManagerDialog({
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
            Create, rename, or delete workspaces.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <form onSubmit={handleCreateWorkspace} className="flex items-center gap-2">
            <Input
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              placeholder="New workspace name"
              required
            />
            <Button type="submit" size="sm" disabled={creating}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </form>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspaceId;
              const isRenaming = renamingId === workspace.id;

              return (
                <div
                  key={workspace.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    {isRenaming ? (
                       <form onSubmit={handleRenameWorkspace} className="flex items-center gap-2">
                          <Input
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            required
                            autoFocus
                            className="h-8"
                          />
                          <Button type="submit" size="sm" disabled={renaming}>Save</Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setRenamingId(null)}>Cancel</Button>
                       </form>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{workspace.name}</span>
                        {isActive && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Active</span>}
                        {workspace.isDefault && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Personal</span>}
                      </div>
                    )}
                  </div>

                  {!isRenaming && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setActiveWorkspace(workspace.id)}
                        title="Switch to"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
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
