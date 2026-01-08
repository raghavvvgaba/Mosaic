import { getAppwrite, ID, Query, appwriteConfig, Permission as AppwritePermission, Role } from './config';
import type { Document, DocumentNode, DocumentMetadata, DocumentNodeMetadata, Collaborator, Permission } from '../db/types';

// Import workspace validation
import type { Workspace } from '../db/types';

// Extend Window interface for custom event
declare global {
  interface WindowEventMap {
    userLoggedOut: Event;
  }
}

const getDatabaseId = () => appwriteConfig.databaseId;
const getDocumentsTableId = () => appwriteConfig.documentsTableId;

// User cache to avoid repeated account.get() calls
interface UserCache {
  user: any | null;
  userId: string | null;
}

const userCache: UserCache = {
  user: null,
  userId: null
};

// Clear cache on logout
if (typeof window !== 'undefined') {
  window.addEventListener('userLoggedOut', () => {
    userCache.user = null;
    userCache.userId = null;
  });
}

// Cached user getter with automatic cache invalidation on auth failure
async function getCachedUser() {
  // Return cached user if available
  if (userCache.user && userCache.userId) {
    return { user: userCache.user, userId: userCache.userId };
  }

  // Fetch and cache
  const appwrite = getAppwrite();
  try {
    const user = await appwrite.account.get();
    userCache.user = user;
    userCache.userId = user.$id;
    return { user, userId: user.$id };
  } catch (error: any) {
    // Clear cache on auth failure
    if (error.code === 401 || error.type === 'user_unauthorized') {
      userCache.user = null;
      userCache.userId = null;
    }
    throw error;
  }
}

// Helper function to validate document ownership
async function validateDocumentOwnership(documentId: string): Promise<{ userId: string; valid: boolean; document?: Document }> {
  try {
    const { userId } = await getCachedUser();
    const appwrite = getAppwrite();

    // Get document to check ownership
    const response = await appwrite.tablesDB.getRow(
      getDatabaseId(),
      getDocumentsTableId(),
      documentId
    );

    const document = appwriteDocumentToDocument(response);
    return {
      userId,
      valid: document.ownerId === userId,
      document
    };
  } catch (error: any) {
    // If error is from getCachedUser(), re-throw with proper structure
    if (error.code === 401 || error.type === 'user_unauthorized') {
      return { userId: '', valid: false };
    }
    return { userId: '', valid: false };
  }
}

// Helper function to validate workspace ownership for document operations
async function validateWorkspaceOwnershipForDocuments(workspaceId: string): Promise<{ userId: string; valid: boolean }> {
  try {
    const { userId } = await getCachedUser();
    const appwrite = getAppwrite();

    // Get workspace to check ownership
    const response = await appwrite.tablesDB.getRow(
      appwriteConfig.databaseId,
      appwriteConfig.workspacesTableId,
      workspaceId
    );

    const workspace = response as any;
    return {
      userId,
      valid: workspace.ownerId === userId
    };
  } catch (error: any) {
    // If error is from getCachedUser(), re-throw with proper structure
    if (error.code === 401 || error.type === 'user_unauthorized') {
      return { userId: '', valid: false };
    }
    return { userId: '', valid: false };
  }
}

// Helper function to convert Appwrite table row to our Document type
function appwriteDocumentToDocument(appwriteDoc: Record<string, unknown>): Document {
  return {
    id: appwriteDoc.$id as string,
    title: appwriteDoc.title as string,
    content: (appwriteDoc.content as string) || '',
    workspaceId: appwriteDoc.workspaceId as string,
    icon: appwriteDoc.icon as string,
    createdAt: new Date(appwriteDoc.$createdAt as string),
    updatedAt: new Date(appwriteDoc.$updatedAt as string),
    lastChangedAt: appwriteDoc.lastChangedAt ? new Date(appwriteDoc.lastChangedAt as string) : undefined,
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

// Helper function to convert Appwrite table row to DocumentMetadata (without content)
function appwriteDocumentToDocumentMetadata(appwriteDoc: Record<string, unknown>): DocumentMetadata {
  return {
    id: appwriteDoc.$id as string,
    title: appwriteDoc.title as string,
    workspaceId: appwriteDoc.workspaceId as string,
    icon: appwriteDoc.icon as string,
    createdAt: new Date(appwriteDoc.$createdAt as string),
    updatedAt: new Date(appwriteDoc.$updatedAt as string),
    lastChangedAt: appwriteDoc.lastChangedAt ? new Date(appwriteDoc.lastChangedAt as string) : undefined,
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
  const result: any = {};

  if (doc.title !== undefined) result.title = doc.title;
  if (doc.content !== undefined) result.content = doc.content;
  if (doc.workspaceId !== undefined) result.workspaceId = doc.workspaceId;
  if (doc.icon !== undefined) result.icon = doc.icon;
  if (doc.lastChangedAt !== undefined) result.lastChangedAt = doc.lastChangedAt?.toISOString();
  if (doc.isDeleted !== undefined) result.isDeleted = doc.isDeleted;
  if (doc.isFavorite !== undefined) result.isFavorite = doc.isFavorite;
  if (doc.parentId !== undefined) result.parentId = doc.parentId;
  if (doc.font !== undefined) result.font = doc.font;
  if (doc.isPublic !== undefined) result.isPublic = doc.isPublic;
  if (doc.ownerId !== undefined) result.ownerId = doc.ownerId;
  if (doc.collaborators !== undefined) result.collaborators = doc.collaborators || [];
  if (doc.permissions !== undefined) result.permissions = doc.permissions || [];

  return result;
}

export async function createDocument(
  title?: string,
  workspaceId?: string,
  parentId?: string
): Promise<Document> {
  try {
    const appwrite = getAppwrite();

    // Get current authenticated user from cache
    const { userId } = await getCachedUser();

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
        AppwritePermission.read(Role.user(userId)),
        AppwritePermission.write(Role.user(userId)),
        AppwritePermission.delete(Role.user(userId))
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
    // Validate ownership first
    const ownership = await validateDocumentOwnership(id);
    if (!ownership.valid) {
      return undefined;
    }

    // We already have the document from validation
    return ownership.document;
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
    // Validate ownership first
    const ownership = await validateDocumentOwnership(id);
    if (!ownership.valid) {
      throw new Error('Document not found or access denied');
    }

    const appwrite = getAppwrite();

    // Set lastChangedAt when title or content changes
    const shouldUpdateLastChangedAt = updates.title !== undefined || updates.content !== undefined;
    const updateData = documentToAppwriteDocument({
      ...updates,
      ...(shouldUpdateLastChangedAt ? { lastChangedAt: new Date() } : {})
    });

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
    // Validate ownership first
    const ownership = await validateDocumentOwnership(id);
    if (!ownership.valid) {
      throw new Error('Document not found or access denied');
    }

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

    // Validate workspace ownership first
    if (workspaceId) {
      const ownership = await validateWorkspaceOwnershipForDocuments(workspaceId);
      if (!ownership.valid) {
        throw new Error('Workspace not found or access denied');
      }
    }

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

// Get deleted documents metadata without content - for trash view
// This is more efficient than getDeletedDocuments() as it doesn't fetch content
export async function getDeletedDocumentsMetadata(workspaceId?: string): Promise<DocumentMetadata[]> {
  try {
    const appwrite = getAppwrite();

    // Validate workspace ownership first
    if (workspaceId) {
      const ownership = await validateWorkspaceOwnershipForDocuments(workspaceId);
      if (!ownership.valid) {
        throw new Error('Workspace not found or access denied');
      }
    }

    // Select only metadata fields, exclude content
    const queries = [
      Query.equal('workspaceId', [workspaceId || 'default']),
      Query.equal('isDeleted', [true]),
      Query.select([
        '$id', 'title', 'workspaceId', 'icon', '$createdAt', '$updatedAt',
        'lastChangedAt', 'isDeleted', 'isFavorite', 'parentId', 'font', 'isPublic',
        'ownerId', 'collaborators', 'permissions'
      ]),
      Query.orderDesc('$updatedAt'),
    ];

    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      queries
    });

    return response.rows.map(appwriteDocumentToDocumentMetadata);
  } catch (error) {
    console.error('Failed to get deleted documents metadata:', error);
    return [];
  }
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
        Query.orderDesc('lastChangedAt'),
        Query.limit(20),
      ]
    });

    return response.rows
      .map(appwriteDocumentToDocument)
      .filter(doc => doc.lastChangedAt);
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

    // Get current authenticated user from cache
    const { userId } = await getCachedUser();

    const duplicateData = documentToAppwriteDocument({
      ...originalDoc,
      title: `${originalDoc.title} (Copy)`,
      isDeleted: false,
      isFavorite: false,
      ownerId: userId, // Set current user as owner of duplicate
    });

    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.createRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: ID.unique(),
      data: duplicateData,
      permissions: [
        AppwritePermission.read(Role.user(userId)),
        AppwritePermission.write(Role.user(userId)),
        AppwritePermission.delete(Role.user(userId))
      ]
    });

    return appwriteDocumentToDocument(response);
  } catch (error) {
    console.error('Failed to duplicate document:', error);
    throw new Error('Failed to duplicate document');
  }
}

export async function toggleFavorite(documentId: string, currentStatus: boolean): Promise<void> {
  try {
    console.log('toggleFavorite service called with:', documentId, currentStatus);
    console.log('Service types:', typeof documentId, typeof currentStatus);
    const appwrite = getAppwrite();
    await appwrite.tablesDB.updateRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: documentId,
      data: { isFavorite: !currentStatus }
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
    // Validate document ownership first
    const docOwnership = await validateDocumentOwnership(documentId);
    if (!docOwnership.valid) {
      throw new Error('Document not found or access denied');
    }

    // Validate target workspace ownership
    const wsOwnership = await validateWorkspaceOwnershipForDocuments(newWorkspaceId);
    if (!wsOwnership.valid) {
      throw new Error('Target workspace not found or access denied');
    }

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

// ===== METADATA-ONLY FUNCTIONS FOR PERFORMANCE =====

// Get all documents metadata without content - for sidebar and lists
export async function getAllDocumentsMetadata(
  workspaceId?: string,
  options?: { includeDeleted?: boolean }
): Promise<DocumentMetadata[]> {
  try {
    const appwrite = getAppwrite();

    // Validate workspace ownership first
    if (workspaceId) {
      const ownership = await validateWorkspaceOwnershipForDocuments(workspaceId);
      if (!ownership.valid) {
        throw new Error('Workspace not found or access denied');
      }
    }

    // Select only metadata fields, exclude content
    const queries = [
      Query.equal('workspaceId', [workspaceId || 'default']),
      Query.select([
        '$id', 'title', 'workspaceId', 'icon', '$createdAt', '$updatedAt',
        'lastChangedAt', 'isDeleted', 'isFavorite', 'parentId', 'font', 'isPublic',
        'ownerId', 'collaborators', 'permissions'
      ])
    ];

    if (!options?.includeDeleted) {
      queries.push(Query.equal('isDeleted', [false]));
    }

    queries.push(Query.orderDesc('lastChangedAt'));

    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      queries
    });

    return response.rows.map(appwriteDocumentToDocumentMetadata);
  } catch (error) {
    console.error('Failed to get all documents metadata:', error);
    return [];
  }
}

// Get recent documents metadata without content
export async function getRecentDocumentsMetadata(workspaceId?: string): Promise<DocumentMetadata[]> {
  try {
    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      queries: [
        Query.equal('workspaceId', [workspaceId || 'default']),
        Query.equal('isDeleted', [false]),
        Query.select([
          '$id', 'title', 'workspaceId', 'icon', '$createdAt', '$updatedAt',
          'lastChangedAt', 'isDeleted', 'isFavorite', 'parentId', 'font', 'isPublic',
          'ownerId', 'collaborators', 'permissions'
        ]),
        Query.orderDesc('lastChangedAt'),
        Query.limit(20),
      ]
    });

    return response.rows
      .map(appwriteDocumentToDocumentMetadata)
      .filter(doc => doc.lastChangedAt);
  } catch (error) {
    console.error('Failed to get recent documents metadata:', error);
    return [];
  }
}

// Get favorite documents metadata without content
export async function getFavoriteDocumentsMetadata(workspaceId?: string): Promise<DocumentMetadata[]> {
  try {
    const appwrite = getAppwrite();
    const response = await appwrite.tablesDB.listRows({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      queries: [
        Query.equal('workspaceId', [workspaceId || 'default']),
        Query.equal('isDeleted', [false]),
        Query.equal('isFavorite', [true]),
        Query.select([
          '$id', 'title', 'workspaceId', 'icon', '$createdAt', '$updatedAt',
          'lastChangedAt', 'isDeleted', 'isFavorite', 'parentId', 'font', 'isPublic',
          'ownerId', 'collaborators', 'permissions'
        ]),
        Query.orderDesc('$updatedAt'),
      ]
    });

    return response.rows.map(appwriteDocumentToDocumentMetadata);
  } catch (error) {
    console.error('Failed to get favorite documents metadata:', error);
    return [];
  }
}

// Get document tree metadata without content - for sidebar hierarchy
export async function getDocumentTreeMetadata(workspaceId?: string): Promise<DocumentNodeMetadata[]> {
  try {
    const documents = await getAllDocumentsMetadata(workspaceId);

    // Filter non-deleted documents and build tree structure
    const nonDeletedDocs = documents.filter(doc => !doc.isDeleted);
    const docMap = new Map<string, DocumentNodeMetadata>(nonDeletedDocs.map(doc => [doc.id, { ...doc, children: [] }]));
    const roots: DocumentNodeMetadata[] = [];

    for (const doc of nonDeletedDocs) {
      const node = docMap.get(doc.id)!;

      if (doc.parentId && docMap.has(doc.parentId)) {
        docMap.get(doc.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort alphabetically at each level
    const sortTree = (nodes: DocumentNodeMetadata[]): DocumentNodeMetadata[] => {
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
    console.error('Failed to get document tree metadata:', error);
    return [];
  }
}

// Get descendants metadata without content - for move operations
export async function getDescendantsMetadata(documentId: string): Promise<DocumentMetadata[]> {
  try {
    const allDocs = await getAllDocumentsMetadata(); // Get all metadata to search through
    const descendants: DocumentMetadata[] = [];

    function collectDescendants(parentId: string) {
      const children = allDocs.filter(doc => doc.parentId === parentId);
      descendants.push(...children);
      children.forEach(child => collectDescendants(child.id));
    }

    collectDescendants(documentId);
    return descendants;
  } catch (error) {
    console.error('Failed to get descendants metadata:', error);
    return [];
  }
}

// ===== CLIENT-SIDE FILTERING HELPERS FOR PERFORMANCE =====
// These functions allow fetching all metadata once and filtering client-side,
// reducing multiple API calls to a single call.

// Get all documents metadata (including deleted) for client-side filtering
// This replaces the need for multiple specialized queries in the sidebar
export async function getAllDocumentsMetadataForFiltering(
  workspaceId?: string
): Promise<DocumentMetadata[]> {
  return getAllDocumentsMetadata(workspaceId, { includeDeleted: true });
}

// Filter documents by recent activity (has lastChangedAt, sorted by most recent)
export function filterRecentDocuments(
  documents: DocumentMetadata[],
  limit: number = 20
): DocumentMetadata[] {
  return documents
    .filter(doc => doc.lastChangedAt && !doc.isDeleted)
    .sort((a, b) => b.lastChangedAt!.getTime() - a.lastChangedAt!.getTime())
    .slice(0, limit);
}

// Filter documents by favorite status
export function filterFavoriteDocuments(
  documents: DocumentMetadata[]
): DocumentMetadata[] {
  return documents.filter(doc => doc.isFavorite === true && !doc.isDeleted);
}

// Filter documents by deleted status
export function filterDeletedDocuments(
  documents: DocumentMetadata[]
): DocumentMetadata[] {
  return documents.filter(doc => doc.isDeleted === true);
}

// Filter documents by non-deleted status
export function filterNonDeletedDocuments(
  documents: DocumentMetadata[]
): DocumentMetadata[] {
  return documents.filter(doc => doc.isDeleted === false);
}

// Build document tree from metadata (extracted from getDocumentTreeMetadata)
// This is a pure function that builds the tree structure locally without API calls
export function buildDocumentTreeFromMetadata(
  documents: DocumentMetadata[]
): DocumentNodeMetadata[] {
  const nonDeletedDocs = documents.filter(doc => !doc.isDeleted);
  const docMap = new Map<string, DocumentNodeMetadata>(
    nonDeletedDocs.map(doc => [doc.id, { ...doc, children: [] }])
  );
  const roots: DocumentNodeMetadata[] = [];

  for (const doc of nonDeletedDocs) {
    const node = docMap.get(doc.id)!;

    if (doc.parentId && docMap.has(doc.parentId)) {
      docMap.get(doc.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort alphabetically at each level
  const sortTree = (nodes: DocumentNodeMetadata[]): DocumentNodeMetadata[] => {
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
}