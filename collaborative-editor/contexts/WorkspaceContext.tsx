'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Workspace } from '@/lib/db/types';
import { DEFAULT_WORKSPACE_ID } from '@/lib/db/constants';
import {
  ensureDefaultWorkspace,
  getWorkspaces,
  createWorkspace as createWorkspaceRecord,
  renameWorkspace as renameWorkspaceRecord,
  deleteWorkspace as deleteWorkspaceRecord,
  updateWorkspaceMetadata as updateWorkspaceMetadataRecord,
} from '@/lib/db/workspaces';
import { useAuthContext } from '@/contexts/AuthContext';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  loading: boolean;
  setActiveWorkspace: (id: string, options?: { navigate?: boolean }) => void;
  createWorkspace: (name: string, options?: { color?: string; icon?: string }) => Promise<Workspace>;
  renameWorkspace: (id: string, name: string) => Promise<Workspace>;
  updateWorkspaceMetadata: (id: string, updates: { color?: string; icon?: string }) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

const ACTIVE_WORKSPACE_STORAGE_KEY = 'activeWorkspaceId';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuthContext();

  const loadWorkspaces = useCallback(async () => {
    await ensureDefaultWorkspace();
    const list = await getWorkspaces();
    setWorkspaces(list);
    return list;
  }, []);

  const setActiveWorkspace = useCallback((id: string, options: { navigate?: boolean } = {}) => {
    setActiveWorkspaceId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, id);
      window.dispatchEvent(new CustomEvent('activeWorkspaceChanged', { detail: { workspaceId: id } }));
    }
    if (options.navigate !== false) {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const list = await loadWorkspaces();
      if (!mounted) return;

      const storedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) : null;
      const fallbackId = storedId && list.some((workspace) => workspace.id === storedId)
        ? storedId
        : list[0]?.id ?? DEFAULT_WORKSPACE_ID;

      setActiveWorkspace(fallbackId, { navigate: false });
      setLoading(false);
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadWorkspaces, setActiveWorkspace]);

  const createWorkspace = useCallback(
    async (name: string, options: { color?: string; icon?: string } = {}) => {
      const workspace = await createWorkspaceRecord(name, user?.id);
      await loadWorkspaces();
      setActiveWorkspace(workspace.id);
      window.dispatchEvent(new CustomEvent('workspacesChanged', { detail: { type: 'created', workspaceId: workspace.id } }));
      return workspace;
    },
    [loadWorkspaces, setActiveWorkspace, user]
  );

  const renameWorkspace = useCallback(
    async (id: string, name: string) => {
      const workspace = await renameWorkspaceRecord(id, name);
      await loadWorkspaces();
      window.dispatchEvent(new CustomEvent('workspacesChanged', { detail: { type: 'updated', workspaceId: id } }));
      return workspace;
    },
    [loadWorkspaces]
  );

  const updateWorkspaceMetadata = useCallback(
    async (id: string, updates: { color?: string; icon?: string }) => {
      const workspace = await updateWorkspaceMetadataRecord(id, updates);
      await loadWorkspaces();
      window.dispatchEvent(new CustomEvent('workspacesChanged', { detail: { type: 'updated', workspaceId: id } }));
      return workspace;
    },
    [loadWorkspaces]
  );

  const deleteWorkspace = useCallback(
    async (id: string) => {
      await deleteWorkspaceRecord(id);
      const updated = await loadWorkspaces();

      if (activeWorkspaceId === id) {
        const fallbackId = updated[0]?.id ?? DEFAULT_WORKSPACE_ID;
        setActiveWorkspace(fallbackId);
      }

      window.dispatchEvent(new CustomEvent('workspacesChanged', { detail: { type: 'deleted', workspaceId: id } }));
    },
    [activeWorkspaceId, loadWorkspaces, setActiveWorkspace]
  );

  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  const activeWorkspace = activeWorkspaceId
    ? workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null
    : null;

  const value: WorkspaceContextValue = {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    loading,
    setActiveWorkspace,
    createWorkspace,
    renameWorkspace,
    updateWorkspaceMetadata,
    deleteWorkspace,
    refreshWorkspaces,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
