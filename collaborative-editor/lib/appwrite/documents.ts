import { appwrite, ID, Query } from './config';
import type { Document, DocumentNode } from '../db/types';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'default';
const DOCUMENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_COLLECTION_ID || 'documents';

// Helper function to convert Appwrite document to our Document type
function appwriteDocumentToDocument(appwriteDoc: Record<string, unknown>): Document {
  return {
    id: appwriteDoc.$id,
    title: appwriteDoc.title,
    content: appwriteDoc.content || '',
    workspaceId: appwriteDoc.workspaceId,
    icon: appwriteDoc.icon,
    coverImage: appwriteDoc.coverImage,
    createdAt: new Date(appwriteDoc.$createdAt),
    updatedAt: new Date(appwriteDoc.$updatedAt),
    lastOpenedAt: appwriteDoc.lastOpenedAt ? new Date(appwriteDoc.lastOpenedAt) : undefined,
    isDeleted: appwriteDoc.isDeleted || false,
    isFavorite: appwriteDoc.isFavorite || false,
    parentId: appwriteDoc.parentId,
    font: appwriteDoc.font,
    isPublic: appwriteDoc.isPublic || false,
    ownerId: appwriteDoc.ownerId,
    collaborators: appwriteDoc.collaborators || [],
    permissions: appwriteDoc.permissions || [],
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
    const docData = documentToAppwriteDocument({
      title: title || 'Untitled',
      workspaceId: workspaceId || 'default',
      parentId,
      isDeleted: false,
      isFavorite: false,
    });

    const response = await appwrite.databases.createDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      ID.unique(),
      docData
    );

    return appwriteDocumentToDocument(response);
  } catch (error) {
    console.error('Failed to create document:', error);
    throw new Error('Failed to create document');
  }
}

export async function getDocument(id: string): Promise<Document | undefined> {
  try {
    const response = await appwrite.databases.getDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
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
    const updateData = documentToAppwriteDocument(updates);

    const response = await appwrite.databases.updateDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      id,
      updateData
    );

    return appwriteDocumentToDocument(response);
  } catch (error) {
    console.error('Failed to update document:', error);
    throw new Error('Failed to update document');
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    // Soft delete by marking as deleted
    await appwrite.databases.updateDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      id,
      { isDeleted: true }
    );
  } catch (error) {
    console.error('Failed to delete document:', error);
    throw new Error('Failed to delete document');
  }
}

export async function permanentlyDeleteDocument(id: string): Promise<void> {
  try {
    await appwrite.databases.deleteDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      id
    );
  } catch (error) {
    console.error('Failed to permanently delete document:', error);
    throw new Error('Failed to permanently delete document');
  }
}

export async function restoreDocument(id: string): Promise<void> {
  try {
    await appwrite.databases.updateDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      id,
      { isDeleted: false }
    );
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
    const queries = [
      Query.equal('workspaceId', [workspaceId || 'default']),
    ];

    if (!options?.includeDeleted) {
      queries.push(Query.equal('isDeleted', [false]));
    }

    queries.push(Query.orderDesc('$updatedAt'));

    const response = await appwrite.databases.listDocuments(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      queries
    );

    return response.documents.map(appwriteDocumentToDocument);
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
    const response = await appwrite.databases.listDocuments(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      [
        Query.equal('workspaceId', [workspaceId || 'default']),
        Query.equal('isDeleted', [false]),
        Query.search('title', query),
        Query.orderDesc('$updatedAt'),
      ]
    );

    return response.documents.map(appwriteDocumentToDocument);
  } catch (error) {
    console.error('Failed to search documents:', error);
    return [];
  }
}

export async function getRecentDocuments(workspaceId?: string): Promise<Document[]> {
  try {
    const response = await appwrite.databases.listDocuments(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      [
        Query.equal('workspaceId', [workspaceId || 'default']),
        Query.equal('isDeleted', [false]),
        Query.orderDesc('lastOpenedAt'),
        Query.limit(20),
      ]
    );

    return response.documents
      .map(appwriteDocumentToDocument)
      .filter(doc => doc.lastOpenedAt);
  } catch (error) {
    console.error('Failed to get recent documents:', error);
    return [];
  }
}

export async function getFavoriteDocuments(workspaceId?: string): Promise<Document[]> {
  try {
    const response = await appwrite.databases.listDocuments(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      [
        Query.equal('workspaceId', [workspaceId || 'default']),
        Query.equal('isDeleted', [false]),
        Query.equal('isFavorite', [true]),
        Query.orderDesc('$updatedAt'),
      ]
    );

    return response.documents.map(appwriteDocumentToDocument);
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

    const duplicateData = documentToAppwriteDocument({
      ...originalDoc,
      title: `${originalDoc.title} (Copy)`,
      isDeleted: false,
      isFavorite: false,
    });

    const response = await appwrite.databases.createDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      ID.unique(),
      duplicateData
    );

    return appwriteDocumentToDocument(response);
  } catch (error) {
    console.error('Failed to duplicate document:', error);
    throw new Error('Failed to duplicate document');
  }
}

export async function updateLastOpened(documentId: string): Promise<void> {
  try {
    await appwrite.databases.updateDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      documentId,
      { lastOpenedAt: new Date().toISOString() }
    );
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

    await appwrite.databases.updateDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      documentId,
      { isFavorite: !doc.isFavorite }
    );
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
    const docMap = new Map(nonDeletedDocs.map(doc => [doc.id, { ...doc, children: [] }]));
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
    const response = await appwrite.databases.listDocuments(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      [
        Query.equal('parentId', [parentId]),
        Query.equal('isDeleted', [false]),
        Query.orderAsc('title'),
      ]
    );

    return response.documents.map(appwriteDocumentToDocument);
  } catch (error) {
    console.error('Failed to get children:', error);
    return [];
  }
}

export async function moveDocument(documentId: string, newWorkspaceId: string, newParentId?: string): Promise<Document> {
  try {
    const response = await appwrite.databases.updateDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION_ID,
      documentId,
      {
        workspaceId: newWorkspaceId,
        parentId: newParentId,
      }
    );

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