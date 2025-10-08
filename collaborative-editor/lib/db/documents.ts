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
