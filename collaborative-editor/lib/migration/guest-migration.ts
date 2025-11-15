import { nanoid } from 'nanoid';
import { appwrite } from '../appwrite/config';
import { ID } from 'appwrite';
import { getDB } from '../db/index';
import type { Document, Workspace, User } from '../db/types';

interface MigrationResult {
  success: boolean;
  documentsMigrated: number;
  workspacesMigrated: number;
  errors: string[];
}

export async function hasGuestData(): Promise<boolean> {
  const db = await getDB();
  const docs = await db.getAllFromIndex('documents', 'by-updated');
  const workspaces = await db.getAllFromIndex('workspaces', 'by-updated');

  const guestDocs = docs.filter((doc: any) => !doc.cloudSynced);
  const guestWorkspaces = workspaces.filter((ws: any) => !ws.cloudSynced);

  return guestDocs.length > 0 || guestWorkspaces.length > 0;
}

export async function getGuestDataSummary(): Promise<{
  documentCount: number;
  workspaceCount: number;
}> {
  const db = await getDB();
  const docs = await db.getAllFromIndex('documents', 'by-updated');
  const workspaces = await db.getAllFromIndex('workspaces', 'by-updated');

  const guestDocs = docs.filter((doc: any) => !doc.cloudSynced);
  const guestWorkspaces = workspaces.filter((ws: any) => !ws.cloudSynced);

  return {
    documentCount: guestDocs.length,
    workspaceCount: guestWorkspaces.length
  };
}

export async function migrateGuestData(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    documentsMigrated: 0,
    workspacesMigrated: 0,
    errors: []
  };

  try {
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'main';
    const tablesDB = appwrite.tablesDB;

    // Step 1: Get all guest data
    const db = await getDB();
    const allDocs = await db.getAllFromIndex('documents', 'by-updated');
    const allWorkspaces = await db.getAllFromIndex('workspaces', 'by-updated');

    const guestDocs = allDocs.filter((doc: any) => !doc.cloudSynced);
    const guestWorkspaces = allWorkspaces.filter((ws: any) => !ws.cloudSynced);

    if (guestDocs.length === 0 && guestWorkspaces.length === 0) {
      return result;
    }

    // Step 2: Migrate workspaces first (they're smaller)
    const workspaceIdMap = new Map<string, string>();

    for (const workspace of guestWorkspaces) {
      try {
        const workspacesTableId = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_TABLE_ID || 'workspaces';
        const existingWorkspaces = await tablesDB.listRows(databaseId, workspacesTableId);
        const titleExists = existingWorkspaces.rows.some(
          (row: any) => row.name === workspace.name && row.ownerId === userId
        );

        const finalName = titleExists ? `${workspace.name} (Local)` : workspace.name;

        const cloudWorkspace = await tablesDB.upsertRow({
          databaseId,
          tableId: workspacesTableId,
          rowId: nanoid(),
          data: {
            name: finalName,
            color: workspace.color,
            icon: workspace.icon,
            isDefault: workspace.isDefault,
            ownerId: userId,
            createdAt: workspace.createdAt,
            updatedAt: new Date(),
            cloudSynced: true
          }
        });

        workspaceIdMap.set(workspace.id, cloudWorkspace.$id);
        result.workspacesMigrated++;

        // Update local workspace to mark as cloudSynced
        await db.put('workspaces', {
          ...workspace,
          cloudId: cloudWorkspace.$id,
          cloudSynced: true,
          syncVersion: workspace.syncVersion + 1,
          lastSyncAt: new Date(),
          updatedAt: new Date()
        });

      } catch (error) {
        console.error(`Failed to migrate workspace ${workspace.id}:`, error);
        result.errors.push(`Workspace migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Step 3: Migrate documents
    for (const doc of guestDocs) {
      try {
        const cloudWorkspaceId = workspaceIdMap.get(doc.workspaceId);

        // Check if document with same title exists in cloud
        const documentsTableId = process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_TABLE_ID || 'documents';
        const existingDocs = await tablesDB.listRows(
          databaseId,
          documentsTableId,
          [
            `query("title", "${doc.title.replace(/"/g, '\\"')}")`,
            `query("ownerId", "${userId}")`
          ]
        );

        const titleExists = existingDocs.rows.length > 0;
        const finalTitle = titleExists ? `${doc.title} (Local)` : doc.title;

        const cloudDocument = await tablesDB.upsertRow({
          databaseId,
          tableId: documentsTableId,
          rowId: nanoid(),
          data: {
            title: finalTitle,
            content: doc.content,
            workspaceId: cloudWorkspaceId || doc.workspaceId,
            icon: doc.icon,
            coverImage: doc.coverImage,
            isDeleted: doc.isDeleted,
            isFavorite: doc.isFavorite,
            isPublic: doc.isPublic,
            parentId: doc.parentId,
            font: doc.font,
            cloudSynced: true,
            ownerId: userId,
            syncVersion: 1,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            lastOpenedAt: doc.lastOpenedAt
          }
        });

        result.documentsMigrated++;

        // Update local document to mark as cloudSynced
        await db.put('documents', {
          ...doc,
          cloudId: cloudDocument.$id,
          cloudSynced: true,
          syncVersion: 1,
          updatedAt: new Date()
        });

      } catch (error) {
        console.error(`Failed to migrate document ${doc.id}:`, error);
        result.errors.push(`Document migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;

  } catch (error) {
    console.error('Migration failed:', error);
    result.success = false;
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

export async function isUserFullyMigrated(userId: string): Promise<boolean> {
  const db = await getDB();
  const allDocs = await db.getAllFromIndex('documents', 'by-updated');
  const allWorkspaces = await db.getAllFromIndex('workspaces', 'by-updated');

  const unmigratedDocs = allDocs.filter((doc: any) => !doc.cloudSynced);
  const unmigratedWorkspaces = allWorkspaces.filter((ws: any) => !ws.cloudSynced);

  return unmigratedDocs.length === 0 && unmigratedWorkspaces.length === 0;
}