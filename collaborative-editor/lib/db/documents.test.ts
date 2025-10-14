import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { createDocument, deleteDocument, getDocument, permanentlyDeleteDocument, restoreDocument } from './documents';
import { resetDB } from './index';

describe('document cascade behaviour', () => {
  beforeEach(async () => {
    await resetDB();
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
});
