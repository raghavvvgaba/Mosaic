// Re-export Appwrite database functions for backward compatibility
// This maintains the same API while using Appwrite backend

export {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  permanentlyDeleteDocument,
  restoreDocument,
  getAllDocuments,
  getDeletedDocuments,
  getDeletedDocumentsMetadata,
  searchDocuments,
  moveDocument,
  getRecentDocuments,
  duplicateDocument,
  getFavoriteDocuments,
  toggleFavorite,
  getAllDocumentsMetadata,
  getRecentDocumentsMetadata,
  getFavoriteDocumentsMetadata,
  filterFavoriteDocuments,
  filterDeletedDocuments,
} from '../appwrite/documents';

import type { Document, DocumentMetadata } from './types';

// Helper function to check if a document can be moved
export async function canMoveDocument(
  documentId: string,
  targetWorkspaceId: string
): Promise<{ canMove: boolean; reason?: string }> {
  void documentId;
  void targetWorkspaceId;
  // Other validation logic can be added here
  return { canMove: true };
}

// Re-export types for convenience
export type { Document, DocumentMetadata };
