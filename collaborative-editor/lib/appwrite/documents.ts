import { getAppwrite, ID, Query, appwriteConfig } from './config';
import type { Document, DocumentNode, Collaborator, Permission } from '../db/types';

const getDatabaseId = () => appwriteConfig.databaseId;
const getDocumentsTableId = () => appwriteConfig.documentsTableId;

// Helper function to convert Appwrite table row to our Document type
function appwriteDocumentToDocument(appwriteDoc: Record<string, unknown>): Document {
  return {
    id: appwriteDoc.$id as string,
    title: appwriteDoc.title as string,
    content: (appwriteDoc.content as string) || '',
    workspaceId: appwriteDoc.workspaceId as string,
    icon: appwriteDoc.icon as string,
    coverImage: appwriteDoc.coverImage as string,
    createdAt: new Date(appwriteDoc.$createdAt as string),
    updatedAt: new Date(appwriteDoc.$updatedAt as string),
    lastOpenedAt: appwriteDoc.lastOpenedAt ? new Date(appwriteDoc.lastOpenedAt as string) : undefined,
    isDeleted: (appwriteDoc.isDeleted as boolean) || false,
    isFavorite: (appwriteDoc.isFavorite as boolean) || false,
    parentId: appwriteDoc.parentId as string,
    font: (appwriteDoc.font as 'sans' | 'serif' | 'mono') || undefined,
    isPublic: (appwriteDoc.isPublic as boolean) || false,
    ownerId: appwriteDoc.ownerId as string,
    collaborators: (appwriteDoc.collaborators as Collaborator[]) || [],
    permissions: (appwriteDoc.permissions as Permission[]) || [],
  };
}

// Helper function to convert Document to Appwrite format
function documentToAppwriteDocument(doc: Partial<Document>) {
  return {
    title: doc.title,
    content: doc.content || '',
    workspaceId: doc.workspaceId,
    icon: doc.icon,
    coverImage: doc.coverImage,
    lastOpenedAt: doc.lastOpenedAt?.toISOString(),
    isDeleted: doc.isDeleted || false,
    isFavorite: doc.isFavorite || false,
    parentId: doc.parentId,
    font: doc.font,
    isPublic: doc.isPublic || false,
    ownerId: doc.ownerId,
    collaborators: doc.collaborators || [],
    permissions: doc.permissions || [],
  };
}

export async function createDocument(
  title?: string,
  workspaceId?: string,
  parentId?: string
): Promise<Document> {
  try {
    const appwrite = getAppwrite();

    // Get current authenticated user
    const user = await appwrite.account.get();
    const userId = user.$id;

    const docData = documentToAppwriteDocument({
      title: title || 'Untitled',
      workspaceId: workspaceId || 'default',
      parentId,
      isDeleted: false,
      isFavorite: false,
      ownerId: userId,
    });

    const response = await appwrite.tablesDB.createRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: ID.unique(),
      data: docData,
      permissions: [
        `read:user:${userId}`,
        `write:user:${userId}`,
        `delete:user:${userId}`
      ]
    });

    return appwriteDocumentToDocument(response);
  } catch (error) {
    console.error('Failed to create document:', error);
    throw new Error('Failed to create document');
  }
}

export async function getDocument(id: string): Promise<Document | undefined> {
  try {
    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.getRow(
      getDatabaseId(),
      getDocumentsTableId(),
      id
    );

    return appwriteDocumentToDocument(response);
  } catch (error) {
    console.error('Failed to get document:', error);
    return undefined;
  }
}

export async function updateDocument(
  id: string,
  updates: Partial<Document>
): Promise<Document> {
  try {
    const appwrite = getAppwrite();

    const updateData = documentToAppwriteDocument(updates);

    const response = await appwrite.tablesDB.updateRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: id,
      data: updateData
    });

    return appwriteDocumentToDocument(response);
  } catch (error) {
    console.error('Failed to update document:', error);
    throw new Error('Failed to update document');
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    const appwrite = getAppwrite();

    // Soft delete by marking as deleted
    await appwrite.tablesDB.updateRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: id,
      data: { isDeleted: true }
    });
  } catch (error) {
    console.error('Failed to delete document:', error);
    throw new Error('Failed to delete document');
  }
}

export async function permanentlyDeleteDocument(id: string): Promise<void> {
  try {
    const appwrite = getAppwrite();
    await appwrite.tablesDB.deleteRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: id
    });
  } catch (error) {
    console.error('Failed to permanently delete document:', error);
    throw new Error('Failed to permanently delete document');
  }
}

export async function restoreDocument(id: string): Promise<void> {
  try {
    const appwrite = getAppwrite();
    await appwrite.tablesDB.updateRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: id,
      data: { isDeleted: false }
    });
  } catch (error) {
    console.error('Failed to restore document:', error);
    throw new Error('Failed to restore document');
  }
}

export async function getAllDocuments(
  workspaceId?: string,
  options?: { includeDeleted?: boolean }
): Promise<Document[]> {
  try {
    const appwrite = getAppwrite();

    const queries = [
      Query.equal('workspaceId', [workspaceId || 'default']),
    ];

    if (!options?.includeDeleted) {
      queries.push(Query.equal('isDeleted', [false]));
    }

    queries.push(Query.orderDesc('$updatedAt'));

    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      queries
    });

    return response.rows.map(appwriteDocumentToDocument);
  } catch (error) {
    console.error('Failed to get all documents:', error);
    return [];
  }
}

export async function getDeletedDocuments(workspaceId?: string): Promise<Document[]> {
  return getAllDocuments(workspaceId, { includeDeleted: true }).then(docs =>
    docs.filter(doc => doc.isDeleted)
  );
}

export async function searchDocuments(
  workspaceId: string | undefined,
  query: string
): Promise<Document[]> {
  try {
    const appwrite = getAppwrite();

    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      queries: [
        Query.equal('workspaceId', [workspaceId || 'default']),
        Query.equal('isDeleted', [false]),
        Query.search('title', query),
        Query.orderDesc('$updatedAt'),
      ]
    });

    return response.rows.map(appwriteDocumentToDocument);
  } catch (error) {
    console.error('Failed to search documents:', error);
    return [];
  }
}

export async function getRecentDocuments(workspaceId?: string): Promise<Document[]> {
  try {
    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      queries: [
        Query.equal('workspaceId', [workspaceId || 'default']),
        Query.equal('isDeleted', [false]),
        Query.orderDesc('lastOpenedAt'),
        Query.limit(20),
      ]
    });

    return response.rows
      .map(appwriteDocumentToDocument)
      .filter(doc => doc.lastOpenedAt);
  } catch (error) {
    console.error('Failed to get recent documents:', error);
    return [];
  }
}

export async function getFavoriteDocuments(workspaceId?: string): Promise<Document[]> {
  try {
    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      queries: [
        Query.equal('workspaceId', [workspaceId || 'default']),
        Query.equal('isDeleted', [false]),
        Query.equal('isFavorite', [true]),
        Query.orderDesc('$updatedAt'),
      ]
    });

    return response.rows.map(appwriteDocumentToDocument);
  } catch (error) {
    console.error('Failed to get favorite documents:', error);
    return [];
  }
}

export async function duplicateDocument(documentId: string): Promise<Document> {
  try {
    const originalDoc = await getDocument(documentId);
    if (!originalDoc) {
      throw new Error('Original document not found');
    }

    // Get current authenticated user
    const appwrite = getAppwrite();
    const user = await appwrite.account.get();
    const userId = user.$id;

    const duplicateData = documentToAppwriteDocument({
      ...originalDoc,
      title: `${originalDoc.title} (Copy)`,
      isDeleted: false,
      isFavorite: false,
      ownerId: userId, // Set current user as owner of duplicate
    });

    const response = await appwrite.tablesDB.createRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: ID.unique(),
      data: duplicateData,
      permissions: [
        `read:user:${userId}`,
        `write:user:${userId}`,
        `delete:user:${userId}`
      ]
    });

    return appwriteDocumentToDocument(response);
  } catch (error) {
    console.error('Failed to duplicate document:', error);
    throw new Error('Failed to duplicate document');
  }
}

export async function updateLastOpened(documentId: string): Promise<void> {
  try {
    const appwrite = getAppwrite();
    await appwrite.tablesDB.updateRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: documentId,
      data: { lastOpenedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Failed to update last opened:', error);
    // Don't throw error for non-critical operation
  }
}

export async function toggleFavorite(documentId: string): Promise<void> {
  try {
    const doc = await getDocument(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const appwrite = getAppwrite();
    await appwrite.tablesDB.updateRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: documentId,
      data: { isFavorite: !doc.isFavorite }
    });
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    throw new Error('Failed to toggle favorite');
  }
}

// Document tree and hierarchy functions
export async function getDocumentTree(workspaceId?: string): Promise<DocumentNode[]> {
  try {
    const documents = await getAllDocuments(workspaceId);

    // Filter non-deleted documents and build tree structure
    const nonDeletedDocs = documents.filter(doc => !doc.isDeleted);
    const docMap = new Map<string, DocumentNode>(nonDeletedDocs.map(doc => [doc.id, { ...doc, children: [] }]));
    const roots: DocumentNode[] = [];

    for (const doc of nonDeletedDocs) {
      const node = docMap.get(doc.id)!;

      if (doc.parentId && docMap.has(doc.parentId)) {
        docMap.get(doc.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort alphabetically at each level
    const sortTree = (nodes: DocumentNode[]): DocumentNode[] => {
      return nodes.sort((a, b) => {
        const titleA = (a.title || 'Untitled').toLowerCase();
        const titleB = (b.title || 'Untitled').toLowerCase();
        return titleA.localeCompare(titleB);
      }).map(node => ({
        ...node,
        children: sortTree(node.children)
      }));
    };

    return sortTree(roots);
  } catch (error) {
    console.error('Failed to get document tree:', error);
    return [];
  }
}

export async function getDocumentPath(documentId: string): Promise<Document[]> {
  try {
    const path: Document[] = [];
    let currentDoc = await getDocument(documentId);

    while (currentDoc && currentDoc.parentId) {
      const parent = await getDocument(currentDoc.parentId);
      if (!parent || parent.workspaceId !== currentDoc.workspaceId) break;
      path.unshift(parent);
      currentDoc = parent;
    }

    return path;
  } catch (error) {
    console.error('Failed to get document path:', error);
    return [];
  }
}

export async function getChildren(parentId: string): Promise<Document[]> {
  try {
    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      queries: [
        Query.equal('parentId', [parentId]),
        Query.equal('isDeleted', [false]),
        Query.orderAsc('title'),
      ]
    });

    return response.rows.map(appwriteDocumentToDocument);
  } catch (error) {
    console.error('Failed to get children:', error);
    return [];
  }
}

export async function moveDocument(documentId: string, newWorkspaceId: string, newParentId?: string): Promise<Document> {
  try {
    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.updateRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: documentId,
      data: {
        workspaceId: newWorkspaceId,
        parentId: newParentId,
      }
    });

    return appwriteDocumentToDocument(response);
  } catch (error) {
    console.error('Failed to move document:', error);
    throw new Error('Failed to move document');
  }
}

export async function getDescendants(documentId: string): Promise<Document[]> {
  try {
    const allDocs = await getAllDocuments(); // Get all documents to search through
    const descendants: Document[] = [];

    function collectDescendants(parentId: string) {
      const children = allDocs.filter(doc => doc.parentId === parentId);
      descendants.push(...children);
      children.forEach(child => collectDescendants(child.id));
    }

    collectDescendants(documentId);
    return descendants;
  } catch (error) {
    console.error('Failed to get descendants:', error);
    return [];
  }
}