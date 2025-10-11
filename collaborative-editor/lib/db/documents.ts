import { nanoid } from 'nanoid';
import { getDB } from './index';
import type { Document, DocumentNode } from './types';

export async function createDocument(
  title: string = 'Untitled'
): Promise<Document> {
  const db = await getDB();
  
  const doc: Document = {
    id: nanoid(),
    title,
    content: JSON.stringify([{ type: 'paragraph', content: '' }]),
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };

  await db.add('documents', doc);
  return doc;
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const db = await getDB();
  return db.get('documents', id);
}

export async function updateDocument(
  id: string,
  updates: Partial<Document>
): Promise<void> {
  const db = await getDB();
  const doc = await db.get('documents', id);
  
  if (!doc) throw new Error('Document not found');

  const updated = {
    ...doc,
    ...updates,
    updatedAt: new Date(),
  };

  await db.put('documents', updated);
}

export async function deleteDocument(id: string): Promise<void> {
  await updateDocument(id, { isDeleted: true });
}

export async function permanentlyDeleteDocument(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('documents', id);
}

export async function getAllDocuments(): Promise<Document[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('documents', 'by-updated');
  return all.filter(doc => !doc.isDeleted).reverse();
}

export async function getDeletedDocuments(): Promise<Document[]> {
  const db = await getDB();
  const all = await db.getAll('documents');
  return all.filter(doc => doc.isDeleted);
}

export async function restoreDocument(id: string): Promise<void> {
  await updateDocument(id, { isDeleted: false });
}

export async function searchDocuments(query: string): Promise<Document[]> {
  const all = await getAllDocuments();
  const lowerQuery = query.toLowerCase();
  
  return all.filter(doc => 
    doc.title.toLowerCase().includes(lowerQuery) ||
    doc.content.toLowerCase().includes(lowerQuery)
  );
}

export async function getDocumentTree(): Promise<DocumentNode[]> {
  const all = await getAllDocuments();
  const rootDocs = all.filter(doc => !doc.parentId);
  
  return rootDocs.map(doc => buildTree(doc, all));
}

function buildTree(doc: Document, allDocs: Document[]): DocumentNode {
  const children = allDocs
    .filter(d => d.parentId === doc.id)
    .map(child => buildTree(child, allDocs));

  return {
    ...doc,
    children,
  };
}

export async function getDocumentPath(documentId: string): Promise<Document[]> {
  const doc = await getDocument(documentId);
  if (!doc) return [];

  const path: Document[] = [doc];
  let currentDoc = doc;

  while (currentDoc.parentId) {
    const parent = await getDocument(currentDoc.parentId);
    if (!parent) break;
    path.unshift(parent);
    currentDoc = parent;
  }

  return path;
}

export async function getDescendants(documentId: string): Promise<Document[]> {
  const all = await getAllDocuments();
  const descendants: Document[] = [];

  function collectDescendants(parentId: string) {
    const children = all.filter(doc => doc.parentId === parentId);
    children.forEach(child => {
      descendants.push(child);
      collectDescendants(child.id);
    });
  }

  collectDescendants(documentId);
  return descendants;
}

export async function canMoveDocument(
  documentId: string,
  newParentId: string | null
): Promise<boolean> {
  // Can't move to itself
  if (documentId === newParentId) return false;

  // If no parent, it's moving to root - always allowed
  if (!newParentId) return true;

  // Check if newParent would create a circular reference
  // by seeing if documentId is an ancestor of newParentId
  const descendants = await getDescendants(documentId);
  const descendantIds = descendants.map(d => d.id);

  return !descendantIds.includes(newParentId);
}

export async function moveDocument(
  documentId: string,
  newParentId: string | null
): Promise<void> {
  const canMove = await canMoveDocument(documentId, newParentId);
  if (!canMove) {
    throw new Error('Cannot move document: would create circular reference');
  }

  await updateDocument(documentId, {
    parentId: newParentId || undefined,
  });
}

export async function getChildren(parentId: string): Promise<Document[]> {
  const all = await getAllDocuments();
  return all.filter(doc => doc.parentId === parentId);
}

export async function updateLastOpened(documentId: string): Promise<void> {
  await updateDocument(documentId, {
    lastOpenedAt: new Date(),
  });
}

export async function getRecentDocuments(limit: number = 10): Promise<Document[]> {
  const all = await getAllDocuments();
  
  // Filter documents that have been opened
  const opened = all.filter(doc => doc.lastOpenedAt);
  
  // Sort by lastOpenedAt descending
  opened.sort((a, b) => {
    const dateA = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
    const dateB = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
    return dateB - dateA;
  });
  
  return opened.slice(0, limit);
}

export async function duplicateDocument(documentId: string): Promise<Document> {
  const original = await getDocument(documentId);
  if (!original) throw new Error('Document not found');

  const db = await getDB();
  
  const duplicate: Document = {
    id: nanoid(),
    title: `${original.title} (Copy)`,
    content: original.content,
    icon: original.icon,
    coverImage: original.coverImage,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    parentId: original.parentId,
  };

  await db.add('documents', duplicate);
  return duplicate;
}

export async function toggleFavorite(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error('Document not found');
  
  await updateDocument(documentId, {
    isFavorite: !doc.isFavorite,
  });
}

export async function getFavoriteDocuments(): Promise<Document[]> {
  const all = await getAllDocuments();
  return all.filter(doc => doc.isFavorite);
}
