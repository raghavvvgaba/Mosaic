/**
 * SWR Hooks - Barrel Export
 *
 * Centralized export point for all SWR hooks in the application.
 * Import hooks from here to keep imports clean and organized.
 *
 * @example
 * import { useDocuments, useUser, useWorkspaces } from '@/hooks/swr';
 */

// Document hooks
export {
  useDocuments,
  useDocumentsMetadata,
  useDocumentsForFiltering,
  useDocument,
  useDocumentTree,
  useDocumentTreeMetadata,
  useRecentDocuments,
  useRecentDocumentsMetadata,
  useFavoriteDocuments,
  useFavoriteDocumentsMetadata,
  useDeletedDocuments,
  useDeletedDocumentsMetadata,
  useDocumentSearch,
  useDocumentPath,
  useDocumentChildren,
  useDocumentDescendants,
  useDocumentMutations,
} from './useDocuments';

export type {
  UseDocumentsOptions,
  UseDocumentsMetadataOptions,
} from './useDocuments';

// More hooks will be added here as we implement them:
// export { useUser } from './useUser';
// export { useWorkspaces } from './useWorkspaces';
// export { useSettings } from './useSettings';
