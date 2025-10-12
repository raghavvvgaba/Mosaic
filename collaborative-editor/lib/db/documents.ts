import { nanoid } from 'nanoid';
import { getDB } from './index';
import { DEFAULT_WORKSPACE_ID } from './constants';
import type { Document, DocumentNode } from './types';

type DocumentQueryOptions = {
  includeDeleted?: boolean;
};

const DEFAULT_QUERY_OPTIONS: DocumentQueryOptions = {
  includeDeleted: false,
};

function sortByUpdatedDescending(documents: Document[]): Document[] {
  return [...documents].sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}

function resolveWorkspaceId(workspaceId?: string): string {
  return workspaceId ?? DEFAULT_WORKSPACE_ID;
}

export async function createDocument(
  title: string = 'Untitled',
  workspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<Document> {
  const db = await getDB();

  const doc: Document = {
    id: nanoid(),
    title,
    content: JSON.stringify([{ type: 'paragraph', content: '' }]),
    workspaceId,
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

  const updated: Document = {
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

export async function restoreDocument(id: string): Promise<void> {
  await updateDocument(id, { isDeleted: false });
}

export async function getAllDocuments(
  workspaceId?: string,
  options: DocumentQueryOptions = DEFAULT_QUERY_OPTIONS
): Promise<Document[]> {
  const db = await getDB();
  const id = resolveWorkspaceId(workspaceId);
  const documents = await db.getAllFromIndex('documents', 'by-workspace', id);
  const filtered = options.includeDeleted ? documents : documents.filter((doc) => !doc.isDeleted);
  return sortByUpdatedDescending(filtered);
}

export async function getDeletedDocuments(workspaceId?: string): Promise<Document[]> {
  const all = await getAllDocuments(workspaceId, { includeDeleted: true });
  return all.filter((doc) => doc.isDeleted);
}

export async function searchDocuments(workspaceId: string | undefined, query: string): Promise<Document[]> {
  const all = await getAllDocuments(workspaceId);
  const lowerQuery = query.toLowerCase();

  return all.filter((doc) =>
    doc.title.toLowerCase().includes(lowerQuery) ||
    doc.content.toLowerCase().includes(lowerQuery)
  );
}

export async function getDocumentTree(workspaceId?: string): Promise<DocumentNode[]> {
  const all = await getAllDocuments(workspaceId);
  const rootDocs = all.filter((doc) => !doc.parentId);

  return rootDocs.map((doc) => buildTree(doc, all));
}

function buildTree(doc: Document, allDocs: Document[]): DocumentNode {
  const children = allDocs
    .filter((d) => d.parentId === doc.id)
    .map((child) => buildTree(child, allDocs));

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
    if (!parent || parent.workspaceId !== doc.workspaceId) break;
    path.unshift(parent);
    currentDoc = parent;
  }

  return path;
}

export async function getDescendants(documentId: string): Promise<Document[]> {
  const doc = await getDocument(documentId);
  if (!doc) return [];

  const all = await getAllDocuments(doc.workspaceId, { includeDeleted: true });
  const descendants: Document[] = [];

  function collectDescendants(parentId: string) {
    const children = all.filter((child) => child.parentId === parentId);
    children.forEach((child) => {
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
  if (documentId === newParentId) return false;

  const doc = await getDocument(documentId);
  if (!doc) return false;

  if (!newParentId) return true;

  const parent = await getDocument(newParentId);
  if (!parent) return false;
  if (parent.workspaceId !== doc.workspaceId) return false;

  const descendants = await getDescendants(documentId);
  const descendantIds = descendants.map((d) => d.id);

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
  const parent = await getDocument(parentId);
  if (!parent) return [];
  const all = await getAllDocuments(parent.workspaceId);
  return all.filter((doc) => doc.parentId === parentId);
}

export async function updateLastOpened(documentId: string): Promise<void> {
  await updateDocument(documentId, {
    lastOpenedAt: new Date(),
  });
}

export async function getRecentDocuments(
  workspaceId?: string,
  limit: number = 10
): Promise<Document[]> {
  const all = await getAllDocuments(workspaceId);

  const opened = all.filter((doc) => doc.lastOpenedAt);

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
    workspaceId: original.workspaceId,
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

export async function getFavoriteDocuments(workspaceId?: string): Promise<Document[]> {
  const all = await getAllDocuments(workspaceId);
  return all.filter((doc) => doc.isFavorite);
}
