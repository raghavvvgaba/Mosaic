import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Document, Settings, Workspace } from './types';
import { createDefaultWorkspace } from './constants';

interface EditorDB extends DBSchema {
  documents: {
    key: string;
    value: Document;
    indexes: { 'by-updated': Date; 'by-created': Date; 'by-workspace': string };
  };
  settings: {
    key: string;
    value: Settings;
  };
  workspaces: {
    key: string;
    value: Workspace;
    indexes: { 'by-updated': Date };
  };
}

let dbInstance: IDBPDatabase<EditorDB> | null = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<EditorDB>('editor-db', 2, {
    async upgrade(db, oldVersion, _newVersion, transaction) {
      let docStore: IDBObjectStore | undefined;

      if (oldVersion < 1) {
        docStore = db.createObjectStore('documents', {
          keyPath: 'id',
        });
        docStore.createIndex('by-updated', 'updatedAt');
        docStore.createIndex('by-created', 'createdAt');
        docStore.createIndex('by-workspace', 'workspaceId');
        db.createObjectStore('settings', { keyPath: 'key' });
      } else {
        docStore = transaction.objectStore('documents');
        if (!docStore.indexNames.contains('by-workspace')) {
          docStore.createIndex('by-workspace', 'workspaceId');
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('workspaces')) {
          const workspaceStore = db.createObjectStore('workspaces', { keyPath: 'id' });
          workspaceStore.createIndex('by-updated', 'updatedAt');
        }

        const workspaceStore = transaction.objectStore('workspaces');
        const defaultWorkspace = createDefaultWorkspace();

        await workspaceStore.put(defaultWorkspace);

        const documentsStore = docStore ?? transaction.objectStore('documents');
        let cursor = await documentsStore.openCursor();
        while (cursor) {
          const value = cursor.value as Document & { workspaceId?: string };
          if (!value.workspaceId) {
            const updated = { ...value, workspaceId: defaultWorkspace.id } as Document;
            await cursor.update(updated);
          }
          cursor = await cursor.continue();
        }
      }
    },
  });

  return dbInstance;
}

export async function resetDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('editor-db');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete database'));
    request.onblocked = () => resolve();
  });
}
