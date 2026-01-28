/**
 * SWR Fetchers
 *
 * These fetcher functions wrap the existing Appwrite services
 * to work with SWR's data fetching pattern.
 *
 * Fetchers receive the query key and return the data.
 * SWR automatically handles caching, revalidation, and error states.
 */

import type {
  Document,
  DocumentMetadata,
  Workspace,
  User,
  UserPreferences,
} from '../db/types';

// Import services
import * as documentService from '../appwrite/documents';
import { AuthService } from '../appwrite/auth';
import * as workspaceService from '../appwrite/workspaces';
import { PreferencesService } from '../appwrite/preferences';

// ============================================================================
// DOCUMENT FETCHERS
// ============================================================================

/**
 * Fetcher for all documents
 * @param key - Query key: ['documents', 'list', { workspaceId, includeDeleted }]
 */
export async function fetchDocuments(key: [string, string, { workspaceId?: string; includeDeleted?: boolean }]): Promise<Document[]> {
  const [, , { workspaceId, includeDeleted }] = key;
  return documentService.getAllDocuments(workspaceId, { includeDeleted });
}

/**
 * Fetcher for all documents metadata (without content)
 * This fetcher handles both useDocumentsMetadata and useDocumentsForFiltering
 * by using the same cache key structure.
 *
 * @param key - Query key: ['documents', 'metadata', { workspaceId, includeDeleted }]
 *
 * @example
 * // Non-deleted documents only
 * fetchDocumentsMetadata(['documents', 'metadata', { workspaceId: '123', includeDeleted: false }])
 *
 * // All documents including deleted (for filtering)
 * fetchDocumentsMetadata(['documents', 'metadata', { workspaceId: '123', includeDeleted: true }])
 */
export async function fetchDocumentsMetadata(key: [string, string, { workspaceId?: string; includeDeleted?: boolean }]): Promise<DocumentMetadata[]> {
  const [, , { workspaceId, includeDeleted }] = key;
  return documentService.getAllDocumentsMetadata(workspaceId, { includeDeleted });
}

/**
 * Fetcher for all documents for client-side filtering
 * This is an alias for fetchDocumentsMetadata that always includes deleted documents.
 * Uses the same cache key structure to enable cache sharing.
 *
 * @param key - Query key: ['documents', 'metadata', { workspaceId, includeDeleted: true }]
 *
 * @example
 * fetchDocumentsForFiltering(['documents', 'metadata', { workspaceId: '123', includeDeleted: true }])
 */
export async function fetchDocumentsForFiltering(key: [string, string, { workspaceId?: string; includeDeleted?: boolean }]): Promise<DocumentMetadata[]> {
  const [, , { workspaceId, includeDeleted }] = key;
  // Always include deleted for filtering
  return documentService.getAllDocumentsMetadata(workspaceId, { includeDeleted: includeDeleted ?? true });
}

/**
 * Fetcher for a single document
 * @param key - Query key: ['documents', 'detail', documentId]
 */
export async function fetchDocument(key: [string, string, string]): Promise<Document | undefined> {
  const [, , documentId] = key;
  return documentService.getDocument(documentId);
}

/**
 * Fetcher for recent documents
 * @param key - Query key: ['documents', 'recent', { workspaceId }]
 */
export async function fetchRecentDocuments(key: [string, string, { workspaceId?: string }]): Promise<Document[]> {
  const [, , { workspaceId }] = key;
  return documentService.getRecentDocuments(workspaceId);
}

/**
 * Fetcher for recent documents metadata
 * @param key - Query key: ['documents', 'recent-metadata', { workspaceId }]
 */
export async function fetchRecentDocumentsMetadata(key: [string, string, { workspaceId?: string }]): Promise<DocumentMetadata[]> {
  const [, , { workspaceId }] = key;
  return documentService.getRecentDocumentsMetadata(workspaceId);
}

/**
 * Fetcher for favorite documents
 * @param key - Query key: ['documents', 'favorite', { workspaceId }]
 */
export async function fetchFavoriteDocuments(key: [string, string, { workspaceId?: string }]): Promise<Document[]> {
  const [, , { workspaceId }] = key;
  return documentService.getFavoriteDocuments(workspaceId);
}

/**
 * Fetcher for favorite documents metadata
 * @param key - Query key: ['documents', 'favorite-metadata', { workspaceId }]
 */
export async function fetchFavoriteDocumentsMetadata(key: [string, string, { workspaceId?: string }]): Promise<DocumentMetadata[]> {
  const [, , { workspaceId }] = key;
  return documentService.getFavoriteDocumentsMetadata(workspaceId);
}

/**
 * Fetcher for deleted documents
 * @param key - Query key: ['documents', 'deleted', { workspaceId }]
 */
export async function fetchDeletedDocuments(key: [string, string, { workspaceId?: string }]): Promise<Document[]> {
  const [, , { workspaceId }] = key;
  return documentService.getDeletedDocuments(workspaceId);
}

/**
 * Fetcher for deleted documents metadata
 * @param key - Query key: ['documents', 'deleted-metadata', { workspaceId }]
 */
export async function fetchDeletedDocumentsMetadata(key: [string, string, { workspaceId?: string }]): Promise<DocumentMetadata[]> {
  const [, , { workspaceId }] = key;
  return documentService.getDeletedDocumentsMetadata(workspaceId);
}

/**
 * Fetcher for searching documents
 * @param key - Query key: ['documents', 'search', { query, workspaceId }]
 */
export async function searchDocuments(key: [string, string, { query: string; workspaceId?: string }]): Promise<Document[]> {
  const [, , { query, workspaceId }] = key;
  return documentService.searchDocuments(workspaceId, query);
}

// ============================================================================
// USER FETCHERS
// ============================================================================

/**
 * Fetcher for current user
 */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const appwriteUser = await AuthService.getCurrentUser();
    const preferences = await (await import('../appwrite/preferences')).PreferencesService.getPreferences();

    // Map Appwrite user to our custom User type
    return {
      id: appwriteUser.$id,
      email: appwriteUser.email,
      name: appwriteUser.name,
      avatar: preferences.avatarId ? (await import('../appwrite/storage')).StorageService.getAvatarPreviewUrl(preferences.avatarId) : undefined,
      avatarId: preferences.avatarId,
      preferences: preferences as UserPreferences,
      emailVerification: appwriteUser.emailVerification,
      createdAt: new Date(appwriteUser.$createdAt),
      lastLoginAt: appwriteUser.$updatedAt ? new Date(appwriteUser.$updatedAt) : undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Fetcher for user by ID
 * Note: Not implemented in AuthService yet
 * @param key - Query key: ['user', 'detail', userId]
 */
export async function fetchUser(key: [string, string, string]): Promise<User | null> {
  const [, , userId] = key;
  try {
    // TODO: Implement getUserById in AuthService
    throw new Error('getUserById not implemented');
  } catch (error) {
    return null;
  }
}

// ============================================================================
// WORKSPACE FETCHERS
// ============================================================================

/**
 * Fetcher for all workspaces
 */
export async function fetchWorkspaces(): Promise<Workspace[]> {
  return workspaceService.getWorkspaces();
}

/**
 * Fetcher for a single workspace
 * @param key - Query key: ['workspaces', 'detail', workspaceId]
 */
export async function fetchWorkspace(key: [string, string, string]): Promise<Workspace | undefined> {
  const [, , workspaceId] = key;
  return workspaceService.getWorkspace(workspaceId);
}

// ============================================================================
// SETTINGS/PREFERENCES FETCHERS
// ============================================================================

/**
 * Fetcher for user preferences
 */
export async function fetchPreferences(): Promise<UserPreferences> {
  return PreferencesService.getPreferences();
}

// ============================================================================
// GENERIC FETCHER HELPER
// ============================================================================

/**
 * Generic fetcher that accepts any async function
 * Useful for one-off fetches or custom fetcher functions
 */
export function createFetcher<T>(fn: () => Promise<T>) {
  return fn;
}
