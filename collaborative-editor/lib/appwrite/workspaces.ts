import { getAppwrite, ID, Query, appwriteConfig, Permission as AppwritePermission, Role } from './config';
import type { Workspace } from '../db/types';

const getDatabaseId = () => appwriteConfig.databaseId;
const getWorkspacesTableId = () => appwriteConfig.workspacesTableId;

// Helper function to validate workspace ownership
async function validateWorkspaceOwnership(workspaceId: string): Promise<{ userId: string; valid: boolean }> {
  try {
    const appwrite = getAppwrite();
    const user = await appwrite.account.get();

    // Get workspace to check ownership
    const response = await appwrite.tablesDB.getRow(
      getDatabaseId(),
      getWorkspacesTableId(),
      workspaceId
    );

    const workspace = response as any;
    return {
      userId: user.$id,
      valid: workspace.ownerId === user.$id
    };
  } catch (error) {
    return { userId: '', valid: false };
  }
}

// Helper function to check if environment is properly configured for database operations
function isEnvironmentReady(): boolean {
  const config = {
    databaseId: getDatabaseId(),
    workspacesTableId: getWorkspacesTableId(),
  };

  const isReady = !!(
    config.databaseId &&
    config.workspacesTableId
  );

  if (!isReady) {
    console.warn('⚠️  Environment not ready for database operations:', config);
  }

  return isReady;
}

// Helper function to convert Appwrite workspace to our Workspace type
function appwriteWorkspaceToWorkspace(appwriteWorkspace: Record<string, unknown>): Workspace {
  return {
    id: appwriteWorkspace.$id as string,
    name: appwriteWorkspace.name as string,
    color: appwriteWorkspace.color as string,
    icon: appwriteWorkspace.icon as string,
    createdAt: new Date(appwriteWorkspace.$createdAt as string),
    updatedAt: new Date(appwriteWorkspace.$updatedAt as string),
    isDefault: (appwriteWorkspace.isDefault as boolean) || false,
    ownerId: appwriteWorkspace.ownerId as string,
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
    const appwrite = getAppwrite();

    // If no userId provided, get current authenticated user
    if (!userId) {
      const user = await appwrite.account.get();
      userId = user.$id;
    }

    const workspaceData = workspaceToAppwriteWorkspace({
      name,
      ownerId: userId,
      isDefault: false,
    });

    const response = await appwrite.tablesDB.createRow({
      databaseId: getDatabaseId(),
      tableId: getWorkspacesTableId(),
      rowId: ID.unique(),
      data: workspaceData,
      permissions: [
        AppwritePermission.read(Role.user(userId)),
        AppwritePermission.write(Role.user(userId)),
        AppwritePermission.delete(Role.user(userId))
      ]
    });

    return appwriteWorkspaceToWorkspace(response);
  } catch (error) {
    console.error('Failed to create workspace:', error);
    throw new Error('Failed to create workspace');
  }
}

export async function getWorkspaces(): Promise<Workspace[]> {
  try {
    // Check if environment is ready before attempting database operations
    if (!isEnvironmentReady()) {
      console.warn('⚠️  Environment not ready, returning empty workspaces list');
      return [];
    }

    const appwrite = getAppwrite();

    // Get current authenticated user
    const user = await appwrite.account.get();
    const userId = user.$id;

    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: getWorkspacesTableId(),
      queries: [
        Query.equal('ownerId', [userId]),  // Only return user's own workspaces
        Query.orderDesc('$updatedAt')
      ]
    });

    return response.rows.map(appwriteWorkspaceToWorkspace);
  } catch (error) {
    console.error('Failed to get workspaces:', error);
    return [];
  }
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  try {
    // Validate ownership first
    const ownership = await validateWorkspaceOwnership(id);
    if (!ownership.valid) {
      return undefined;
    }

    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.getRow(
      getDatabaseId(),
      getWorkspacesTableId(),
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
    // Validate ownership first
    const ownership = await validateWorkspaceOwnership(id);
    if (!ownership.valid) {
      throw new Error('Workspace not found or access denied');
    }

    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.updateRow({
      databaseId: getDatabaseId(),
      tableId: getWorkspacesTableId(),
      rowId: id,
      data: { name }
    });

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
    if (!isEnvironmentReady()) {
      throw new Error('Environment not ready for database operations');
    }

    // Validate ownership first
    const ownership = await validateWorkspaceOwnership(id);
    if (!ownership.valid) {
      throw new Error('Workspace not found or access denied');
    }

    const updateData: Record<string, unknown> = {};
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.icon !== undefined) updateData.icon = updates.icon;

    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.updateRow({
      databaseId: getDatabaseId(),
      tableId: getWorkspacesTableId(),
      rowId: id,
      data: updateData
    });

    return appwriteWorkspaceToWorkspace(response);
  } catch (error) {
    console.error('Failed to update workspace metadata:', error);
    throw new Error('Failed to update workspace metadata');
  }
}

export async function deleteWorkspace(id: string): Promise<void> {
  try {
    // Validate ownership first
    const ownership = await validateWorkspaceOwnership(id);
    if (!ownership.valid) {
      throw new Error('Workspace not found or access denied');
    }

    // Check if this is the default workspace
    const appwrite = getAppwrite();
    const workspace = await getWorkspace(id);
    if (workspace?.isDefault) {
      throw new Error('Cannot delete the default workspace');
    }

    await appwrite.tablesDB.deleteRow({
      databaseId: getDatabaseId(),
      tableId: getWorkspacesTableId(),
      rowId: id
    });
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    throw new Error('Failed to delete workspace');
  }
}

// System workspace functionality removed - users now get personal workspaces only

export async function countDocumentsInWorkspace(id: string): Promise<number> {
  try {
    // Validate workspace ownership first
    const ownership = await validateWorkspaceOwnership(id);
    if (!ownership.valid) {
      throw new Error('Workspace not found or access denied');
    }

    // We would need to query the documents collection with workspaceId filter
    // This is a simplified implementation
    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: appwriteConfig.documentsTableId,
      queries: [
        Query.equal('workspaceId', [id]),
        Query.equal('isDeleted', [false]),
        Query.limit(1), // We only need the count
      ]
    });

    return response.total;
  } catch (error) {
    console.error('Failed to count documents in workspace:', error);
    return 0;
  }
}