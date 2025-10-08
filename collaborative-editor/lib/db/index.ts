import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Document, Settings } from './types';

interface EditorDB extends DBSchema {
  documents: {
    key: string;
    value: Document;
    indexes: { 'by-updated': Date; 'by-created': Date };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

let dbInstance: IDBPDatabase<EditorDB> | null = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<EditorDB>('editor-db', 1, {
    upgrade(db) {
      // Documents store
      const docStore = db.createObjectStore('documents', { 
        keyPath: 'id' 
      });
      docStore.createIndex('by-updated', 'updatedAt');
      docStore.createIndex('by-created', 'createdAt');

      // Settings store
      db.createObjectStore('settings', { keyPath: 'key' });
    },
  });

  return dbInstance;
}
