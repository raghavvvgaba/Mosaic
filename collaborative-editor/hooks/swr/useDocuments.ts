/**
 * useDocuments Hook
 *
 * Comprehensive SWR hooks for document data fetching and management.
 * Provides hooks for:
 * - Document lists and metadata
 * - Single document fetching
 * - Document tree structure
 * - Recent, favorite, and deleted documents
 * - Search and filtering
 * - Mutations (create, update, delete, etc.)
 * - Optimistic updates
 *
 * @example
 * const { data: documents, error, isLoading } = useDocuments();
 * const { updateDocument, deleteDocument } = useDocumentMutations();
 */

import useSWR, { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';

// Types
import type {
  Document,
  DocumentMetadata,
  DocumentNode,
  DocumentNodeMetadata,
} from '../../lib/db/types';

// Import query keys and fetchers
import * as keys from '../../lib/swr/keys';
import * as fetchers from '../../lib/swr/fetchers';

// Import service functions for mutations
import * as documentService from '../../lib/appwrite/documents';

// ============================================================================
// HOOK OPTIONS
// ============================================================================

/**
 * Options for useDocuments hook
 */
export interface UseDocumentsOptions {
  /**
   * Workspace ID to filter documents
   */
  workspaceId?: string;

  /**
   * Whether to include deleted documents
   */
  includeDeleted?: boolean;

  /**
   * SWR configuration options
   */
  swrOptions?: Parameters<typeof useSWR<Document[]>>[2];
}

/**
 * Options for useDocumentsMetadata hook
 */
export interface UseDocumentsMetadataOptions {
  /**
   * Workspace ID to filter documents
   */
  workspaceId?: string;

  /**
   * Whether to include deleted documents
   */
  includeDeleted?: boolean;

  /**
   * SWR configuration options
   */
  swrOptions?: Parameters<typeof useSWR<DocumentMetadata[]>>[2];
}

// ============================================================================
// DOCUMENT LIST HOOKS
// ============================================================================

/**
 * Hook for fetching all documents (with content)
 *
 * @example
 * const { data: documents, error, isLoading } = useDocuments({ workspaceId: 'workspace123' });
 */
export function useDocuments(options: UseDocumentsOptions = {}) {
  const { workspaceId, includeDeleted, swrOptions } = options;
  const key = keys.documentsKey(workspaceId, includeDeleted);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<Document[]>(
    key,
    fetchers.fetchDocuments,
    {
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching all documents metadata (without content)
 * Use this for lists and sidebars where you don't need the document content.
 *
 * @example
 * const { data: documents, error, isLoading } = useDocumentsMetadata({ workspaceId: 'workspace123' });
 */
export function useDocumentsMetadata(options: UseDocumentsMetadataOptions = {}) {
  const { workspaceId, includeDeleted, swrOptions } = options;
  const key = keys.documentsMetadataKey(workspaceId, includeDeleted);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DocumentMetadata[]>(
    key,
    fetchers.fetchDocumentsMetadata,
    {
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching all documents for client-side filtering
 * This is the most efficient way to filter documents by multiple criteria.
 *
 * @example
 * const { data: allDocs } = useDocumentsForFiltering({ workspaceId: 'workspace123' });
 *
 * // Filter client-side
 * const recent = allDocs?.filter(doc => doc.lastChangedAt && !doc.isDeleted);
 * const favorites = allDocs?.filter(doc => doc.isFavorite && !doc.isDeleted);
 * const deleted = allDocs?.filter(doc => doc.isDeleted);
 */
export function useDocumentsForFiltering(options: { workspaceId?: string } = {}) {
  const { workspaceId } = options;
  const key = keys.documentsForFilteringKey(workspaceId);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DocumentMetadata[]>(
    key,
    fetchers.fetchDocumentsForFiltering,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Longer deduping for filtering data
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

// ============================================================================
// SINGLE DOCUMENT HOOKS
// ============================================================================

/**
 * Hook for fetching a single document by ID
 *
 * @example
 * const { data: document, error, isLoading } = useDocument('doc123');
 */
export function useDocument(documentId: string | undefined, options: { swrOptions?: Parameters<typeof useSWR<Document | undefined>>[2] } = {}) {
  const key = documentId ? keys.documentKey(documentId) : null;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<Document | undefined>(
    key,
    fetchers.fetchDocument,
    {
      revalidateOnFocus: false,
      ...options.swrOptions,
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

// ============================================================================
// DOCUMENT TREE HOOKS
// ============================================================================

/**
 * Hook for fetching document tree structure (with content)
 *
 * @example
 * const { data: tree, error, isLoading } = useDocumentTree({ workspaceId: 'workspace123' });
 */
export function useDocumentTree(options: { workspaceId?: string } = {}) {
  const { workspaceId } = options;
  const key = keys.documentTreeKey(workspaceId);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DocumentNode[]>(
    key,
    fetchers.fetchDocumentTree,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching document tree metadata (without content)
 * Use this for sidebars and navigation where you don't need content.
 *
 * @example
 * const { data: tree, error, isLoading } = useDocumentTreeMetadata({ workspaceId: 'workspace123' });
 */
export function useDocumentTreeMetadata(options: { workspaceId?: string } = {}) {
  const { workspaceId } = options;
  const key = keys.documentTreeMetadataKey(workspaceId);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DocumentNodeMetadata[]>(
    key,
    fetchers.fetchDocumentTreeMetadata,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

// ============================================================================
// RECENT DOCUMENTS HOOKS
// ============================================================================

/**
 * Hook for fetching recent documents (with content)
 *
 * @example
 * const { data: recentDocs, error, isLoading } = useRecentDocuments({ workspaceId: 'workspace123' });
 */
export function useRecentDocuments(options: { workspaceId?: string } = {}) {
  const { workspaceId } = options;
  const key = keys.recentDocumentsKey(workspaceId);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<Document[]>(
    key,
    fetchers.fetchRecentDocuments,
    {
      revalidateOnFocus: true, // Revalidate recent docs on focus
      refreshInterval: 60000, // Refresh every minute
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Hook for fetching recent documents metadata (without content)
 *
 * @example
 * const { data: recentDocs, error, isLoading } = useRecentDocumentsMetadata({ workspaceId: 'workspace123' });
 */
export function useRecentDocumentsMetadata(options: { workspaceId?: string } = {}) {
  const { workspaceId } = options;
  const key = keys.recentDocumentsMetadataKey(workspaceId);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<DocumentMetadata[]>(
    key,
    fetchers.fetchRecentDocumentsMetadata,
    {
      revalidateOnFocus: true,
      refreshInterval: 60000,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

// ============================================================================
// FAVORITE DOCUMENTS HOOKS
// ============================================================================

/**
 * Hook for fetching favorite documents (with content)
 *
 * @example
 * const { data: favorites, error, isLoading } = useFavoriteDocuments({ workspaceId: 'workspace123' });
 */
export function useFavoriteDocuments(options: { workspaceId?: string } = {}) {
  const { workspaceId } = options;
  const key = keys.favoriteDocumentsKey(workspaceId);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<Document[]>(
    key,
    fetchers.fetchFavoriteDocuments,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Hook for fetching favorite documents metadata (without content)
 *
 * @example
 * const { data: favorites, error, isLoading } = useFavoriteDocumentsMetadata({ workspaceId: 'workspace123' });
 */
export function useFavoriteDocumentsMetadata(options: { workspaceId?: string } = {}) {
  const { workspaceId } = options;
  const key = keys.favoriteDocumentsMetadataKey(workspaceId);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<DocumentMetadata[]>(
    key,
    fetchers.fetchFavoriteDocumentsMetadata,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

// ============================================================================
// DELETED DOCUMENTS HOOKS
// ============================================================================

/**
 * Hook for fetching deleted documents (with content)
 *
 * @example
 * const { data: deleted, error, isLoading } = useDeletedDocuments({ workspaceId: 'workspace123' });
 */
export function useDeletedDocuments(options: { workspaceId?: string } = {}) {
  const { workspaceId } = options;
  const key = keys.deletedDocumentsKey(workspaceId);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<Document[]>(
    key,
    fetchers.fetchDeletedDocuments,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Hook for fetching deleted documents metadata (without content)
 *
 * @example
 * const { data: deleted, error, isLoading } = useDeletedDocumentsMetadata({ workspaceId: 'workspace123' });
 */
export function useDeletedDocumentsMetadata(options: { workspaceId?: string } = {}) {
  const { workspaceId } = options;
  const key = keys.deletedDocumentsMetadataKey(workspaceId);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<DocumentMetadata[]>(
    key,
    fetchers.fetchDeletedDocumentsMetadata,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

// ============================================================================
// SEARCH HOOKS
// ============================================================================

/**
 * Hook for searching documents
 * Only fetches when query is provided
 *
 * @example
 * const { data: results, error, isLoading } = useDocumentSearch('my query', { workspaceId: 'workspace123' });
 */
export function useDocumentSearch(query: string | undefined, options: { workspaceId?: string } = {}) {
  const { workspaceId } = options;
  const key = query ? keys.searchDocumentsKey(query, workspaceId) : null;

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<Document[]>(
    key,
    fetchers.searchDocuments,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

// ============================================================================
// DOCUMENT PATH & CHILDREN HOOKS
// ============================================================================

/**
 * Hook for fetching document path (breadcrumbs)
 *
 * @example
 * const { data: path, error, isLoading } = useDocumentPath('doc123');
 */
export function useDocumentPath(documentId: string | undefined) {
  const key = documentId ? keys.documentPathKey(documentId) : null;

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<Document[]>(
    key,
    fetchers.fetchDocumentPath
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Hook for fetching document children
 *
 * @example
 * const { data: children, error, isLoading } = useDocumentChildren('parent123');
 */
export function useDocumentChildren(parentId: string | undefined) {
  const key = parentId ? keys.documentChildrenKey(parentId) : null;

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<Document[]>(
    key,
    fetchers.fetchDocumentChildren
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Hook for fetching document descendants (all nested children)
 *
 * @example
 * const { data: descendants, error, isLoading } = useDocumentDescendants('doc123');
 */
export function useDocumentDescendants(documentId: string | undefined) {
  const key = documentId ? keys.documentDescendantsKey(documentId) : null;

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<Document[]>(
    key,
    fetchers.fetchDocumentDescendants
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook for document mutations (create, update, delete, etc.)
 * Provides mutation functions with optimistic updates and automatic cache invalidation.
 *
 * @example
 * const { createDocument, updateDocument, deleteDocument } = useDocumentMutations();
 *
 * // Create a document
 * const newDoc = await createDocument({ title: 'My Document', workspaceId: 'workspace123' });
 *
 * // Update a document
 * await updateDocument('doc123', { title: 'Updated Title' });
 *
 * // Delete a document
 * await deleteDocument('doc123');
 */
export function useDocumentMutations() {
  const { mutate } = useSWRConfig();

  // Helper to invalidate all document caches (non-debounced for immediate operations)
  const invalidateDocumentsImmediate = useCallback(() => {
    mutate((key) => Array.isArray(key) && key[0] === 'documents', undefined, { revalidate: true });
  }, [mutate]);

  // Debounced version to prevent excessive re-fetches during rapid updates (e.g., title changes)
  const invalidateDocumentsDebounced = useDebouncedCallback(() => {
    mutate((key) => Array.isArray(key) && key[0] === 'documents', undefined, { revalidate: true });
  }, 1000); // 1 second debounce - balances responsiveness with performance

  // By default, use debounced invalidation to reduce unnecessary re-fetches
  const invalidateDocuments = invalidateDocumentsDebounced;

  /**
   * Create a new document
   */
  const { trigger: createDocumentTrigger, isMutating: isCreating } = useSWRMutation<
    Document,
    Error,
    ReturnType<typeof keys.documentsKey>,
    { title?: string; workspaceId?: string; parentId?: string }
  >(
    keys.documentsKey(),
    async (_key: unknown, { arg }: { arg: { title?: string; workspaceId?: string; parentId?: string } }) => {
      const result = await documentService.createDocument(arg.title, arg.workspaceId, arg.parentId);

      // Immediate invalidation for create - user expects to see new doc right away
      invalidateDocumentsImmediate();

      return result;
    }
  );

  // Wrapper for createDocument that matches the service signature
  const createDocument = useCallback(async (
    title?: string,
    workspaceId?: string,
    parentId?: string
  ) => {
    return createDocumentTrigger({ title, workspaceId, parentId });
  }, [createDocumentTrigger]);

  /**
   * Update a document
   */
  const { trigger: updateDocumentTrigger, isMutating: isUpdating } = useSWRMutation<
    Document,
    Error,
    ReturnType<typeof keys.documentsKey>,
    { documentId: string; updates: Partial<Document> }
  >(
    keys.documentsKey(),
    async (_key: unknown, { arg }: { arg: { documentId: string; updates: Partial<Document> } }) => {
      const result = await documentService.updateDocument(arg.documentId, arg.updates);

      // Optimistically update the specific document cache
      mutate(keys.documentKey(arg.documentId), result, { revalidate: false });

      // Invalidate all document caches to reflect changes
      invalidateDocuments();

      return result;
    }
  );

  // Wrapper for updateDocument that matches the service signature
  const updateDocument = useCallback(async (documentId: string, updates: Partial<Document>) => {
    return updateDocumentTrigger({ documentId, updates });
  }, [updateDocumentTrigger]);

  /**
   * Update document title only - optimized for title changes
   * This function skips global cache invalidation to prevent UI freezing during typing
   * Only updates the specific document cache and metadata caches efficiently
   */
  const updateDocumentTitleOnly = useCallback(async (documentId: string, title: string) => {
    const result = await documentService.updateDocument(documentId, { title });

    // Optimistically update the specific document cache
    mutate(keys.documentKey(documentId), result, { revalidate: false });

    // Update metadata caches locally without triggering full revalidation
    // This is a lightweight update that only touches the title field
    mutate(
      (key) => {
        // Only update metadata keys, not full document lists
        if (!Array.isArray(key) || key[0] !== 'documents') return false;
        if (key[1] !== 'metadata') return false;
        return true;
      },
      (currentData: DocumentMetadata[] | undefined) => {
        if (!currentData) return currentData;
        return currentData.map(doc =>
          doc.id === documentId ? { ...doc, title } : doc
        );
      },
      { revalidate: false }
    );

    return result;
  }, [mutate]);

  /**
   * Delete a document (soft delete)
   */
  const { trigger: deleteDocumentTrigger, isMutating: isDeleting } = useSWRMutation<
    void,
    Error,
    ReturnType<typeof keys.documentsKey>,
    string
  >(
    keys.documentsKey(),
    async (_key: unknown, { arg }: { arg: string }) => {
      const documentId = arg;
      await documentService.deleteDocument(documentId);

      // Immediate invalidation for delete - user expects to see doc removed right away
      invalidateDocumentsImmediate();
    }
  );

  // Wrapper for deleteDocument that matches the service signature
  const deleteDocument = useCallback(async (documentId: string) => {
    return deleteDocumentTrigger(documentId);
  }, [deleteDocumentTrigger]);

  /**
   * Permanently delete a document
   */
  const { trigger: permanentlyDeleteDocument, isMutating: isPermanentlyDeleting } = useSWRMutation<
    void,
    Error,
    ReturnType<typeof keys.documentsKey>,
    string
  >(
    keys.documentsKey(),
    async (_key: unknown, { arg }: { arg: string }) => {
      const documentId = arg;
      await documentService.permanentlyDeleteDocument(documentId);

      // Immediate invalidation for permanent delete
      invalidateDocumentsImmediate();
    }
  );

  /**
   * Restore a deleted document
   */
  const { trigger: restoreDocument, isMutating: isRestoring } = useSWRMutation<
    void,
    Error,
    ReturnType<typeof keys.documentsKey>,
    string
  >(
    keys.documentsKey(),
    async (_key: unknown, { arg }: { arg: string }) => {
      const documentId = arg;
      await documentService.restoreDocument(documentId);

      // Immediate invalidation for restore - user expects to see doc reappear right away
      invalidateDocumentsImmediate();
    }
  );

  /**
   * Helper to update favorite status across all document caches
   * Used for optimistic updates
   */
  const updateFavoriteInAllCaches = useCallback((
    documentId: string,
    newFavoriteStatus: boolean,
    workspaceId?: string
  ) => {
    // Helper to update document arrays
    const updateDocArray = (docs: DocumentMetadata[] | Document[] | undefined) => {
      if (!docs) return docs;
      return docs.map(doc =>
        doc.id === documentId ? { ...doc, isFavorite: newFavoriteStatus } : doc
      );
    };

    // Update individual document cache
    mutate(
      keys.documentKey(documentId),
      (currentDoc: Document | undefined) => currentDoc ? { ...currentDoc, isFavorite: newFavoriteStatus } : currentDoc,
      { revalidate: false }
    );

    // Update all metadata caches (both includeDeleted: false and true)
    if (workspaceId) {
      mutate(
        keys.documentsMetadataKey(workspaceId, false),
        updateDocArray,
        { revalidate: false }
      );
      mutate(
        keys.documentsMetadataKey(workspaceId, true),
        updateDocArray,
        { revalidate: false }
      );

      // Update favorites caches (only when unfavoriting - we can't add optimistically without full doc data)
      if (!newFavoriteStatus) {
        const removeFromFavorites = (docs: DocumentMetadata[] | Document[] | undefined) => {
          if (!docs) return docs;
          return docs.filter(doc => doc.id !== documentId);
        };

        mutate(
          keys.favoriteDocumentsMetadataKey(workspaceId),
          removeFromFavorites,
          { revalidate: false }
        );

        mutate(
          keys.favoriteDocumentsKey(workspaceId),
          removeFromFavorites,
          { revalidate: false }
        );
      }
    }

    // Update all document caches using the filter-based approach
    mutate(
      (key) => Array.isArray(key) && key[0] === 'documents' && key[1] === 'metadata',
      updateDocArray,
      { revalidate: false }
    );
  }, [mutate]);

  /**
   * Toggle favorite status of a document
   */
  const { trigger: toggleFavoriteTrigger, isMutating: isTogglingFavorite } = useSWRMutation<
    { success: boolean; newStatus: boolean },
    Error,
    ReturnType<typeof keys.documentsKey>,
    { documentId: string; currentStatus: boolean; workspaceId?: string }
  >(
    keys.documentsKey(),
    async (_key: unknown, { arg }: { arg: { documentId: string; currentStatus: boolean; workspaceId?: string } }) => {
      const { documentId, currentStatus, workspaceId } = arg;
      const newFavoriteStatus = !currentStatus;

      try {
        // Optimistic update - update all caches immediately
        updateFavoriteInAllCaches(documentId, newFavoriteStatus, workspaceId);

        // API call
        await documentService.toggleFavorite(documentId, currentStatus);

        // Success - selectively revalidate to ensure consistency
        if (workspaceId) {
          await Promise.all([
            mutate(keys.documentsMetadataKey(workspaceId, false)),
            mutate(keys.documentsMetadataKey(workspaceId, true)),
          ]);
        }

        return { success: true, newStatus: newFavoriteStatus };
      } catch (error) {
        // Error - rollback by revalidating all document caches
        mutate(
          (key) => Array.isArray(key) && key[0] === 'documents',
          undefined,
          { revalidate: true }
        );
        throw error;
      }
    }
  );

  // Wrapper for toggleFavorite that matches the service signature
  const toggleFavorite = useCallback(async (
    documentId: string,
    currentStatus: boolean,
    workspaceId?: string
  ) => {
    return toggleFavoriteTrigger({ documentId, currentStatus, workspaceId });
  }, [toggleFavoriteTrigger]);

  /**
   * Duplicate a document
   */
  const { trigger: duplicateDocument, isMutating: isDuplicating } = useSWRMutation<
    Document,
    Error,
    ReturnType<typeof keys.documentsKey>,
    string
  >(
    keys.documentsKey(),
    async (_key: unknown, { arg }: { arg: string }) => {
      const documentId = arg;
      const result = await documentService.duplicateDocument(documentId);

      // Immediate invalidation for duplicate - user expects to see new copy right away
      invalidateDocumentsImmediate();

      return result;
    }
  );

  /**
   * Move a document to a different workspace or parent
   */
  const { trigger: moveDocumentTrigger, isMutating: isMoving } = useSWRMutation<
    Document,
    Error,
    ReturnType<typeof keys.documentsKey>,
    { documentId: string; newWorkspaceId: string; newParentId?: string }
  >(
    keys.documentsKey(),
    async (_key: unknown, { arg }: { arg: { documentId: string; newWorkspaceId: string; newParentId?: string } }) => {
      const result = await documentService.moveDocument(arg.documentId, arg.newWorkspaceId, arg.newParentId);

      // Immediate invalidation for move - user expects to see doc moved right away
      invalidateDocumentsImmediate();

      return result;
    }
  );

  // Wrapper for moveDocument that matches the service signature
  const moveDocument = useCallback(async (
    documentId: string,
    newWorkspaceId: string,
    newParentId?: string
  ) => {
    return moveDocumentTrigger({ documentId, newWorkspaceId, newParentId });
  }, [moveDocumentTrigger]);

  return {
    // Mutations
    createDocument,
    updateDocument,
    updateDocumentTitleOnly,
    deleteDocument,
    permanentlyDeleteDocument,
    restoreDocument,
    toggleFavorite,
    duplicateDocument,
    moveDocument,

    // Loading states
    isCreating,
    isUpdating,
    isDeleting,
    isPermanentlyDeleting,
    isRestoring,
    isTogglingFavorite,
    isDuplicating,
    isMoving,

    // Utility
    invalidateDocuments,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Export all hooks as a grouped object for cleaner imports
 *
 * @example
 * import { documentHooks } from '@/hooks/swr/useDocuments';
 * const { useDocuments: useDocs, useDocument, useDocumentMutations } = documentHooks;
 */
export const documentHooks = {
  // List hooks
  useDocuments,
  useDocumentsMetadata,
  useDocumentsForFiltering,

  // Single document hooks
  useDocument,

  // Tree hooks
  useDocumentTree,
  useDocumentTreeMetadata,

  // Filtered list hooks
  useRecentDocuments,
  useRecentDocumentsMetadata,
  useFavoriteDocuments,
  useFavoriteDocumentsMetadata,
  useDeletedDocuments,
  useDeletedDocumentsMetadata,

  // Search hook
  useDocumentSearch,

  // Relationship hooks
  useDocumentPath,
  useDocumentChildren,
  useDocumentDescendants,

  // Mutations
  useDocumentMutations,
};
