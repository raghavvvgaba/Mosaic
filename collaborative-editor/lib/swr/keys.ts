/**
 * SWR Query Key Generators
 *
 * Centralized query key management for SWR cache.
 * This ensures consistent cache keys across the application and enables
 * features like cache invalidation, revalidation, and optimistic updates.
 *
 * Best practices:
 * - Query keys should be arrays (descriptive and serializable)
 * - Include all parameters that affect the fetch result
 * - Order matters: [entity, action, params...]
 * - Use these keys with mutate() for cache updates
 */

// ============================================================================
// DOCUMENT KEYS
// ============================================================================

/**
 * Base key for all document queries
 */
export const DOCUMENT_KEY = 'documents';

/**
 * Key for fetching all documents
 * @param workspaceId - Optional workspace filter
 * @param includeDeleted - Whether to include deleted documents
 */
export const documentsKey = (workspaceId?: string, includeDeleted?: boolean) =>
  workspaceId
    ? [DOCUMENT_KEY, 'list', { workspaceId, includeDeleted }]
    : [DOCUMENT_KEY, 'list', { includeDeleted }];

/**
 * Key for fetching all documents metadata (without content)
 * This is the primary cache key for all documents metadata.
 * Both useDocumentsMetadata and useDocumentsForFiltering use this key
 * to ensure cache sharing and single API request.
 *
 * @param workspaceId - Optional workspace filter
 * @param includeDeleted - Whether to include deleted documents (defaults to false)
 *
 * @example
 * // All non-deleted documents
 * documentsMetadataKey('workspace123')
 * // => ['documents', 'metadata', { workspaceId: 'workspace123', includeDeleted: false }]
 *
 * // All documents including deleted (for filtering)
 * documentsMetadataKey('workspace123', true)
 * // => ['documents', 'metadata', { workspaceId: 'workspace123', includeDeleted: true }]
 */
export const documentsMetadataKey = (workspaceId?: string, includeDeleted: boolean = false) =>
  [DOCUMENT_KEY, 'metadata', { workspaceId, includeDeleted }];

/**
 * Key for fetching all documents for client-side filtering
 * This is an alias for documentsMetadataKey with includeDeleted=true
 * to ensure cache sharing with useDocumentsMetadata.
 *
 * @param workspaceId - Optional workspace filter
 *
 * @example
 * // Returns same key structure as documentsMetadataKey(workspaceId, true)
 * documentsForFilteringKey('workspace123')
 * // => ['documents', 'metadata', { workspaceId: 'workspace123', includeDeleted: true }]
 */
export const documentsForFilteringKey = (workspaceId?: string) =>
  [DOCUMENT_KEY, 'metadata', { workspaceId, includeDeleted: true }];

/**
 * Key for fetching a single document
 * @param documentId - Document ID
 */
export const documentKey = (documentId: string) =>
  [DOCUMENT_KEY, 'detail', documentId];

/**
 * Key for fetching document tree structure
 */
export const documentTreeKey = (workspaceId?: string) =>
  [DOCUMENT_KEY, 'tree', { workspaceId }];

/**
 * Key for fetching document tree metadata (without content)
 */
export const documentTreeMetadataKey = (workspaceId?: string) =>
  [DOCUMENT_KEY, 'tree-metadata', { workspaceId }];

/**
 * Key for fetching recent documents
 */
export const recentDocumentsKey = (workspaceId?: string) =>
  [DOCUMENT_KEY, 'recent', { workspaceId }];

/**
 * Key for fetching recent documents metadata
 */
export const recentDocumentsMetadataKey = (workspaceId?: string) =>
  [DOCUMENT_KEY, 'recent-metadata', { workspaceId }];

/**
 * Key for fetching favorite documents
 */
export const favoriteDocumentsKey = (workspaceId?: string) =>
  [DOCUMENT_KEY, 'favorite', { workspaceId }];

/**
 * Key for fetching favorite documents metadata
 */
export const favoriteDocumentsMetadataKey = (workspaceId?: string) =>
  [DOCUMENT_KEY, 'favorite-metadata', { workspaceId }];

/**
 * Key for fetching deleted documents
 */
export const deletedDocumentsKey = (workspaceId?: string) =>
  [DOCUMENT_KEY, 'deleted', { workspaceId }];

/**
 * Key for fetching deleted documents metadata
 */
export const deletedDocumentsMetadataKey = (workspaceId?: string) =>
  [DOCUMENT_KEY, 'deleted-metadata', { workspaceId }];

/**
 * Key for searching documents
 */
export const searchDocumentsKey = (query: string, workspaceId?: string) =>
  [DOCUMENT_KEY, 'search', { query, workspaceId }];

/**
 * Key for fetching document path (breadcrumbs)
 */
export const documentPathKey = (documentId: string) =>
  [DOCUMENT_KEY, 'path', documentId];

/**
 * Key for fetching document children
 */
export const documentChildrenKey = (parentId: string) =>
  [DOCUMENT_KEY, 'children', parentId];

/**
 * Key for fetching document descendants
 */
export const documentDescendantsKey = (documentId: string) =>
  [DOCUMENT_KEY, 'descendants', documentId];

// ============================================================================
// USER KEYS
// ============================================================================

/**
 * Base key for all user queries
 */
export const USER_KEY = 'user';

/**
 * Key for fetching current user
 */
export const currentUserKey = () => [USER_KEY, 'current'];

/**
 * Key for fetching user by ID
 */
export const userKey = (userId: string) => [USER_KEY, 'detail', userId];

// ============================================================================
// WORKSPACE KEYS
// ============================================================================

/**
 * Base key for all workspace queries
 */
export const WORKSPACE_KEY = 'workspaces';

/**
 * Key for fetching all workspaces
 */
export const workspacesKey = () => [WORKSPACE_KEY, 'list'];

/**
 * Key for fetching a single workspace
 */
export const workspaceKey = (workspaceId: string) =>
  [WORKSPACE_KEY, 'detail', workspaceId];

// ============================================================================
// SETTINGS/PREFERENCES KEYS
// ============================================================================

/**
 * Base key for all settings queries
 */
export const SETTINGS_KEY = 'settings';

/**
 * Key for fetching user preferences
 */
export const preferencesKey = () => [SETTINGS_KEY, 'preferences'];

// ============================================================================
// INVALIDATION HELPERS
// ============================================================================

/**
 * Invalidate all document-related caches
 */
export function invalidateAllDocuments() {
  return { populateCache: false };
}

/**
 * Invalidate all workspace-related caches
 */
export function invalidateAllWorkspaces() {
  return { populateCache: false };
}

/**
 * Invalidate user-related caches
 */
export function invalidateUser() {
  return { populateCache: false };
}
