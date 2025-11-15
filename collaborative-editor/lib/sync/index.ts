// Main sync system exports

// Core services
export { syncService, type SyncResult, type SyncStatus, type SyncOperation } from './sync-service';
export { conflictResolver, type ConflictResolution, type ConflictResolutionStrategy } from './conflict-resolver';
export { syncStatusManager, type DetailedSyncStatus, type SyncStatusLevel, type SyncEvent } from './sync-status-manager';
export { backgroundSyncWorker, type SyncWorkerConfig, type SyncSchedule } from './background-sync-worker';

// Integration and error handling
export {
  createDocumentWithSync,
  updateDocumentWithSync,
  syncErrorHandler,
  SyncRecovery,
  initializeSyncSystem,
  cleanupSyncSystem
} from './sync-integration';

// React hooks
export {
  useSyncStatus,
  useSyncEvents,
  useBackgroundSync,
  useDocumentSync,
  useSyncStats
} from './sync-hooks';

// Re-export database types needed for sync
export type { Document, Conflict, Collaborator, Permission } from '../db/types';