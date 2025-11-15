import { syncService, SyncResult, SyncStatus } from './sync-service';
import { syncStatusManager } from './sync-status-manager';
import { backgroundSyncWorker } from './background-sync-worker';
import { createDocument, updateDocument } from '../db/documents';
import type { Document, User } from '../db/types';

/**
 * Sync Facade - Single entry point for all sync operations.
 *
 * This facade follows the parameter injection pattern where authentication
 * state is passed as a parameter rather than being fetched internally.
 * This ensures:
 * 1. Single source of truth for authentication (AuthContext)
 * 2. No continuous auth checking for guest users
 * 3. Clear dependencies and easy testing
 * 4. Clean separation between React and non-React concerns
 */

export class SyncFacade {
  private static instance: SyncFacade;

  private constructor() {}

  static getInstance(): SyncFacade {
    if (!SyncFacade.instance) {
      SyncFacade.instance = new SyncFacade();
    }
    return SyncFacade.instance;
  }

  /**
   * Initialize the sync system for an authenticated user
   * Only call this when a user is authenticated
   */
  async initializeForUser(user: User): Promise<void> {
    if (!user) {
      throw new Error('Cannot initialize sync for unauthenticated user');
    }

    try {
      // Initialize background sync with authenticated user
      await backgroundSyncWorker.initialize(user);

      // Initialize sync status with user context
      syncStatusManager.initialize(user);

      console.log('Sync system initialized for user:', user.id);
    } catch (error) {
      console.error('Failed to initialize sync system:', error);
      throw error;
    }
  }

  /**
   * Cleanup sync system when user signs out
   */
  async cleanup(): Promise<void> {
    try {
      await backgroundSyncWorker.stop();
      syncStatusManager.cleanup();
      console.log('Sync system cleaned up');
    } catch (error) {
      console.error('Failed to cleanup sync system:', error);
    }
  }

  /**
   * Create a document with sync integration
   * Only queues for sync if user is authenticated
   */
  async createDocumentWithSync(
    title: string = 'Untitled',
    workspaceId: string,
    parentId?: string,
    user?: User | null
  ): Promise<Document> {
    try {
      // Create document locally first
      const document = await createDocument(title, workspaceId, parentId);

      // Queue for sync only if user is authenticated
      if (user) {
        backgroundSyncWorker.queueDocumentSync(document.id);
      }

      return document;
    } catch (error) {
      console.error('Failed to create document:', error);
      const errorMessage = `Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`;
      syncStatusManager.handleSyncError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update a document with sync integration
   * Only queues for sync if user is authenticated
   */
  async updateDocumentWithSync(
    id: string,
    updates: Partial<Document>,
    user?: User | null
  ): Promise<Document> {
    try {
      // Update document locally first
      const document = await updateDocument(id, updates);

      // Queue for sync only if user is authenticated
      if (user) {
        backgroundSyncWorker.queueDocumentSync(id);
      }

      return document;
    } catch (error) {
      console.error('Failed to update document:', error);
      const errorMessage = `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`;
      syncStatusManager.handleSyncError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Perform manual sync for authenticated user
   */
  async forceSyncNow(user: User): Promise<void> {
    if (!user) {
      throw new Error('Cannot sync for unauthenticated user');
    }

    try {
      await backgroundSyncWorker.forceSyncNow();
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Get current sync status
   * Returns appropriate status for both authenticated and guest users
   */
  getSyncStatus(user?: User | null): SyncStatus {
    if (!user) {
      // Guest users have no sync functionality
      return {
        isOnline: false,
        pendingUploads: 0,
        pendingDownloads: 0,
        syncInProgress: false
      };
    }

    return syncStatusManager.getCurrentStatus();
  }

  /**
   * Get detailed sync status for authenticated users
   */
  getDetailedSyncStatus(user: User) {
    if (!user) {
      throw new Error('Cannot get detailed sync status for unauthenticated user');
    }

    return syncStatusManager.getCurrentDetailedStatus();
  }

  /**
   * Subscribe to sync status changes
   * Returns unsubscribe function
   */
  subscribeToSyncStatus(
    callback: (status: SyncStatus) => void,
    user?: User | null
  ): () => void {
    if (!user) {
      // For guest users, return a no-op subscription
      return () => {};
    }

    return syncStatusManager.subscribe(callback);
  }

  /**
   * Check sync health for authenticated user
   */
  async checkSyncHealth(user: User): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    if (!user) {
      throw new Error('Cannot check sync health for unauthenticated user');
    }

    try {
      return await syncStatusManager.checkSyncHealth();
    } catch (error) {
      console.error('Sync health check failed:', error);
      return {
        isHealthy: false,
        issues: ['Sync health check failed'],
        recommendations: ['Check network connection and try again']
      };
    }
  }

  /**
   * Get sync statistics for authenticated user
   */
  getSyncStats(user?: User | null): {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncAt?: Date;
    averageSyncTime: number;
  } {
    if (!user) {
      // Guest users have no sync statistics
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageSyncTime: 0
      };
    }

    return syncStatusManager.getSyncStats();
  }

  /**
   * Trigger migration for guest user data
   * Called when a guest user authenticates for the first time
   */
  async triggerGuestMigration(user: User): Promise<void> {
    if (!user) {
      throw new Error('Cannot trigger migration for unauthenticated user');
    }

    try {
      // Initialize sync for the newly authenticated user
      await this.initializeForUser(user);

      // Trigger a full sync to migrate local data
      await this.forceSyncNow(user);

      console.log('Guest migration completed for user:', user.id);
    } catch (error) {
      console.error('Guest migration failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const syncFacade = SyncFacade.getInstance();