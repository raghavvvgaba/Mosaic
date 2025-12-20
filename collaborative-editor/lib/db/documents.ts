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
  searchDocuments,
  getDocumentTree,
  getDocumentPath,
  getDescendants,
    moveDocument,
  getChildren,
  getRecentDocuments,
  duplicateDocument,
  getFavoriteDocuments,
  updateLastOpened,
  toggleFavorite,
  getAllDocumentsMetadata,
  getRecentDocumentsMetadata,
  getFavoriteDocumentsMetadata,
  getDocumentTreeMetadata,
  getDescendantsMetadata,
} from '../appwrite/documents';

import type { Document, DocumentNode, DocumentMetadata, DocumentNodeMetadata } from './types';
import { getDescendants } from '../appwrite/documents';

// Helper function to check if a document can be moved
export async function canMoveDocument(
  documentId: string,
  targetWorkspaceId: string,
  targetParentId?: string
): Promise<{ canMove: boolean; reason?: string }> {
  // Prevent moving a document to be its own descendant
  if (targetParentId) {
    const descendants = await getDescendants(documentId);
    if (descendants.some(doc => doc.id === targetParentId)) {
      return { canMove: false, reason: 'Cannot move a document to be its own descendant' };
    }
  }

  // Other validation logic can be added here
  return { canMove: true };
}

// Re-export types for convenience
export type { Document, DocumentNode, DocumentMetadata, DocumentNodeMetadata };