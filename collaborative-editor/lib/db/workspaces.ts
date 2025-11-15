import { nanoid } from 'nanoid';
import { getDB } from './index';
import { DEFAULT_WORKSPACE_ID, createDefaultWorkspace } from './constants';
import type { Workspace } from './types';

export async function ensureDefaultWorkspace(): Promise<Workspace> {
  const db = await getDB();
  const existing = await db.get('workspaces', DEFAULT_WORKSPACE_ID);
  if (existing) {
    return existing;
  }

  const workspace = createDefaultWorkspace();
  await db.put('workspaces', workspace);
  return workspace;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const db = await getDB();
  const workspaces = await db.getAllFromIndex('workspaces', 'by-updated');
  return workspaces.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  const db = await getDB();
  return db.get('workspaces', id);
}

export async function createWorkspace(
  name: string,
  options: { color?: string; icon?: string } = {}
): Promise<Workspace> {
  const db = await getDB();
  const now = new Date();
  const workspace: Workspace = {
    id: nanoid(),
    name,
    color: options.color,
    icon: options.icon,
    createdAt: now,
    updatedAt: now,
    // Cloud synchronization fields with defaults
    cloudSynced: false,
    syncVersion: 0,
  };

  await db.add('workspaces', workspace);
  return workspace;
}

export async function renameWorkspace(id: string, name: string): Promise<Workspace> {
  const db = await getDB();
  const workspace = await db.get('workspaces', id);
  if (!workspace) {
    throw new Error('Workspace not found');
  }

  const updated: Workspace = {
    ...workspace,
    name,
    updatedAt: new Date(),
  };

  await db.put('workspaces', updated);
  return updated;
}

export async function updateWorkspaceMetadata(
  id: string,
  updates: Partial<Pick<Workspace, 'color' | 'icon'>>
): Promise<Workspace> {
  const db = await getDB();
  const workspace = await db.get('workspaces', id);
  if (!workspace) {
    throw new Error('Workspace not found');
  }

  const updated: Workspace = {
    ...workspace,
    ...updates,
    updatedAt: new Date(),
  };

  await db.put('workspaces', updated);
  return updated;
}

export async function deleteWorkspace(id: string): Promise<void> {
  if (id === DEFAULT_WORKSPACE_ID) {
    throw new Error('Cannot delete the default workspace');
  }

  const db = await getDB();
  const workspace = await db.get('workspaces', id);
  if (!workspace) return;

  const docs = await db.getAllFromIndex('documents', 'by-workspace', id);
  if (docs.length > 0) {
    throw new Error('Workspace must be empty before deletion');
  }

  await db.delete('workspaces', id);
}

export async function countDocumentsInWorkspace(id: string): Promise<number> {
  const db = await getDB();
  const docs = await db.getAllFromIndex('documents', 'by-workspace', id);
  return docs.length;
}

export async function canCreateGuestWorkspace(): Promise<boolean> {
  const workspaces = await getWorkspaces();
  const guestWorkspaces = workspaces.filter((ws) => !ws.cloudSynced);
  return guestWorkspaces.length < 2;
}

export async function getGuestWorkspaceCount(): Promise<number> {
  const workspaces = await getWorkspaces();
  return workspaces.filter((ws) => !ws.cloudSynced).length;
}
