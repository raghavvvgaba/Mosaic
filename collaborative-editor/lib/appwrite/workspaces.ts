import { appwrite, ID, Query } from './config';
import type { Workspace } from '../db/types';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'default';
const WORKSPACES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID || 'workspaces';
const DEFAULT_WORKSPACE_ID = process.env.NEXT_PUBLIC_APPWRITE_DEFAULT_WORKSPACE_ID || 'default';

// Helper function to convert Appwrite workspace to our Workspace type
function appwriteWorkspaceToWorkspace(appwriteWorkspace: Record<string, unknown>): Workspace {
  return {
    id: appwriteWorkspace.$id,
    name: appwriteWorkspace.name,
    color: appwriteWorkspace.color,
    icon: appwriteWorkspace.icon,
    createdAt: new Date(appwriteWorkspace.$createdAt),
    updatedAt: new Date(appwriteWorkspace.$updatedAt),
    isDefault: appwriteWorkspace.isDefault || false,
    ownerId: appwriteWorkspace.ownerId,
  };
}

// Helper function to convert Workspace to Appwrite format
function workspaceToAppwriteWorkspace(workspace: Partial<Workspace>) {
  return {
    name: workspace.name,
    color: workspace.color,
    icon: workspace.icon,
    isDefault: workspace.isDefault || false,
    ownerId: workspace.ownerId,
  };
}

export async function createWorkspace(name: string, userId?: string): Promise<Workspace> {
  try {
    const workspaceData = workspaceToAppwriteWorkspace({
      name,
      ownerId: userId,
      isDefault: false,
    });

    const response = await appwrite.databases.createDocument(
      DATABASE_ID,
      WORKSPACES_COLLECTION_ID,
      ID.unique(),
      workspaceData
    );

    return appwriteWorkspaceToWorkspace(response);
  } catch (error) {
    console.error('Failed to create workspace:', error);
    throw new Error('Failed to create workspace');
  }
}

export async function getWorkspaces(): Promise<Workspace[]> {
  try {
    const response = await appwrite.databases.listDocuments(
      DATABASE_ID,
      WORKSPACES_COLLECTION_ID,
      [Query.orderDesc('$updatedAt')]
    );

    return response.documents.map(appwriteWorkspaceToWorkspace);
  } catch (error) {
    console.error('Failed to get workspaces:', error);
    return [];
  }
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  try {
    const response = await appwrite.databases.getDocument(
      DATABASE_ID,
      WORKSPACES_COLLECTION_ID,
      id
    );

    return appwriteWorkspaceToWorkspace(response);
  } catch (error) {
    console.error('Failed to get workspace:', error);
    return undefined;
  }
}

export async function renameWorkspace(id: string, name: string): Promise<Workspace> {
  try {
    const response = await appwrite.databases.updateDocument(
      DATABASE_ID,
      WORKSPACES_COLLECTION_ID,
      id,
      { name }
    );

    return appwriteWorkspaceToWorkspace(response);
  } catch (error) {
    console.error('Failed to rename workspace:', error);
    throw new Error('Failed to rename workspace');
  }
}

export async function updateWorkspaceMetadata(
  id: string,
  updates: { color?: string; icon?: string }
): Promise<Workspace> {
  try {
    const updateData: Record<string, unknown> = {};
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.icon !== undefined) updateData.icon = updates.icon;

    const response = await appwrite.databases.updateDocument(
      DATABASE_ID,
      WORKSPACES_COLLECTION_ID,
      id,
      updateData
    );

    return appwriteWorkspaceToWorkspace(response);
  } catch (error) {
    console.error('Failed to update workspace metadata:', error);
    throw new Error('Failed to update workspace metadata');
  }
}

export async function deleteWorkspace(id: string): Promise<void> {
  try {
    // Check if this is the default workspace
    const workspace = await getWorkspace(id);
    if (workspace?.isDefault) {
      throw new Error('Cannot delete the default workspace');
    }

    await appwrite.databases.deleteDocument(
      DATABASE_ID,
      WORKSPACES_COLLECTION_ID,
      id
    );
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    throw new Error('Failed to delete workspace');
  }
}

export async function ensureDefaultWorkspace(): Promise<Workspace> {
  try {
    // Try to get the default workspace
    const defaultWorkspace = await getWorkspace(DEFAULT_WORKSPACE_ID);
    if (defaultWorkspace) {
      return defaultWorkspace;
    }

    // Create default workspace if it doesn't exist
    const workspaceData = workspaceToAppwriteWorkspace({
      name: 'My Workspace',
      isDefault: true,
    });

    const response = await appwrite.databases.createDocument(
      DATABASE_ID,
      WORKSPACES_COLLECTION_ID,
      DEFAULT_WORKSPACE_ID,
      workspaceData
    );

    return appwriteWorkspaceToWorkspace(response);
  } catch (error) {
    console.error('Failed to ensure default workspace:', error);
    throw new Error('Failed to create default workspace');
  }
}

export async function countDocumentsInWorkspace(id: string): Promise<number> {
  try {
    // We would need to query the documents collection with workspaceId filter
    // This is a simplified implementation
    const response = await appwrite.databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'default',
      process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_COLLECTION_ID || 'documents',
      [
        Query.equal('workspaceId', [id]),
        Query.equal('isDeleted', [false]),
        Query.limit(1), // We only need the count
      ]
    );

    return response.total;
  } catch (error) {
    console.error('Failed to count documents in workspace:', error);
    return 0;
  }
}