import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { createDocument, deleteDocument, getDocument, moveDocument, permanentlyDeleteDocument, restoreDocument } from './documents';
import { resetDB } from './index';

// Note: Tests for document hierarchy/cascade behavior have been removed
// as the nested document feature has been removed from the application.

describe('document basic operations', () => {
  beforeEach(async () => {
    await resetDB();
  });

  it('creates a document', async () => {
    const doc = await createDocument('Test Document');
    expect(doc).toBeDefined();
    expect(doc.title).toBe('Test Document');
  });

  it('deletes a document', async () => {
    const doc = await createDocument('Test Document');
    await deleteDocument(doc.id);
    
    const deleted = await getDocument(doc.id);
    expect(deleted?.isDeleted).toBe(true);
  });

  it('restores a document', async () => {
    const doc = await createDocument('Test Document');
    await deleteDocument(doc.id);
    await restoreDocument(doc.id);
    
    const restored = await getDocument(doc.id);
    expect(restored?.isDeleted).toBe(false);
  });

  it('permanently deletes a document', async () => {
    const doc = await createDocument('Test Document');
    await deleteDocument(doc.id);
    await permanentlyDeleteDocument(doc.id);
    
    const permanent = await getDocument(doc.id);
    expect(permanent).toBeUndefined();
  });

  it('moves a document to a different workspace', async () => {
    const doc = await createDocument('Test Document', 'workspace1');
    await moveDocument(doc.id, 'workspace2');
    
    const moved = await getDocument(doc.id);
    expect(moved?.workspaceId).toBe('workspace2');
  });
});


  it('deletes descendants when parent is trashed', async () => {
    const parent = await createDocument('Parent');
    const child = await createDocument('Child', parent.workspaceId, parent.id);

    const parentOriginal = (await getDocument(parent.id))!;
    const childOriginal = (await getDocument(child.id))!;

    await deleteDocument(parent.id);

    const parentDeleted = (await getDocument(parent.id))!;
    const childDeleted = (await getDocument(child.id))!;

    expect(parentDeleted.isDeleted).toBe(true);
    expect(childDeleted.isDeleted).toBe(true);
    expect(parentDeleted.updatedAt.getTime()).toBe(parentOriginal.updatedAt.getTime());
    expect(childDeleted.updatedAt.getTime()).toBe(childOriginal.updatedAt.getTime());
  });

  it('restores descendants when parent is restored', async () => {
    const parent = await createDocument('Parent');
    const child = await createDocument('Child', parent.workspaceId, parent.id);

    await deleteDocument(parent.id);

    const parentAfterDelete = (await getDocument(parent.id))!;
    const childAfterDelete = (await getDocument(child.id))!;

    await restoreDocument(parent.id);

    const parentRestored = (await getDocument(parent.id))!;
    const childRestored = (await getDocument(child.id))!;

    expect(parentRestored.isDeleted).toBe(false);
    expect(childRestored.isDeleted).toBe(false);
    expect(parentRestored.updatedAt.getTime()).toBe(parentAfterDelete.updatedAt.getTime());
    expect(childRestored.updatedAt.getTime()).toBe(childAfterDelete.updatedAt.getTime());
  });

  it('permanently removes descendants when parent is permanently deleted', async () => {
    const parent = await createDocument('Parent');
    const child = await createDocument('Child', parent.workspaceId, parent.id);

    await deleteDocument(parent.id);
    await permanentlyDeleteDocument(parent.id);

    expect(await getDocument(parent.id)).toBeUndefined();
    expect(await getDocument(child.id)).toBeUndefined();
  });

  it('moves a document to a new parent', async () => {
    const parentA = await createDocument('Parent A');
    const parentB = await createDocument('Parent B');
    const child = await createDocument('Child', parentA.workspaceId, parentA.id);

    await moveDocument(child.id, parentB.id);

    const movedChild = await getDocument(child.id);
    expect(movedChild?.parentId).toBe(parentB.id);
  });

  it('moves a document to the root level', async () => {
    const parent = await createDocument('Parent');
    const child = await createDocument('Child', parent.workspaceId, parent.id);

    await moveDocument(child.id, null);

    const movedChild = await getDocument(child.id);
    expect(movedChild?.parentId).toBeUndefined();
  });

