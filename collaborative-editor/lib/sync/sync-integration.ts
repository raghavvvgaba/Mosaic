import { updateDocument, createDocument } from '../db/documents';
import { syncService } from './sync-service';
import { syncStatusManager } from './sync-status-manager';
import { backgroundSyncWorker } from './background-sync-worker';
import type { Document, User } from '../db/types';

// Enhanced document operations with sync integration

export async function createDocumentWithSync(
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
    syncStatusManager.handleSyncError(
      `Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}

export async function updateDocumentWithSync(
  id: string,
  updates: Partial<Document>,
  options: { touchUpdatedAt?: boolean } = {},
  user?: User | null
): Promise<void> {
  try {
    // Update local document
    await updateDocument(id, updates, options);

    // Queue for sync only if user is authenticated
    if (user) {
      backgroundSyncWorker.queueDocumentSync(id);
    }
  } catch (error) {
    console.error('Failed to update document:', error);
    syncStatusManager.handleSyncError(
      `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}

// Sync error handling and recovery

export class SyncErrorHandler {
  private static instance: SyncErrorHandler;
  private errorCounts = new Map<string, number>();
  private lastErrors = new Map<string, Date>();
  private maxRetries = 3;
  private retryDelayMs = 5000;
  private blacklistDurationMs = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SyncErrorHandler {
    if (!SyncErrorHandler.instance) {
      SyncErrorHandler.instance = new SyncErrorHandler();
    }
    return SyncErrorHandler.instance;
  }

  // Handle sync error with intelligent retry logic
  async handleSyncError(
    operation: string,
    documentId: string,
    error: Error,
    retryCallback?: () => Promise<void>
  ): Promise<void> {
    const errorKey = `${operation}:${documentId}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    const lastError = this.lastErrors.get(errorKey);

    // Check if we should retry
    const shouldRetry = this.shouldRetry(currentCount, lastError, error);

    if (shouldRetry && retryCallback) {
      // Increment error count
      this.errorCounts.set(errorKey, currentCount + 1);
      this.lastErrors.set(errorKey, new Date());

      // Schedule retry with exponential backoff
      const delay = this.retryDelayMs * Math.pow(2, currentCount);
      setTimeout(async () => {
        try {
          await retryCallback();
          // Success - clear error count
          this.errorCounts.delete(errorKey);
          this.lastErrors.delete(errorKey);
        } catch (retryError) {
          // Retry failed - handle recursively
          await this.handleSyncError(operation, documentId, retryError as Error, retryCallback);
        }
      }, delay);

    } else {
      // Max retries reached or non-retryable error
      this.errorCounts.set(errorKey, currentCount + 1);
      this.lastErrors.set(errorKey, new Date());

      // Log error for user intervention
      await this.logPersistentError(operation, documentId, error);
    }
  }

  // Determine if we should retry the operation
  private shouldRetry(currentCount: number, lastError?: Date, error?: Error): boolean {
    // Max retries check
    if (currentCount >= this.maxRetries) {
      return false;
    }

    // Blacklist duration check
    if (lastError) {
      const timeSinceLastError = Date.now() - lastError.getTime();
      if (timeSinceLastError < this.blacklistDurationMs) {
        return false;
      }
    }

    // Error type check
    if (error) {
      // Don't retry certain types of errors
      const nonRetryableErrors = [
        'Permission denied',
        'Document not found',
        'Invalid credentials',
        'Quota exceeded'
      ];

      const errorMessage = error.message.toLowerCase();
      if (nonRetryableErrors.some(nonRetryable =>
        errorMessage.includes(nonRetryable.toLowerCase())
      )) {
        return false;
      }

      // Always retry network errors
      const networkErrors = [
        'network',
        'connection',
        'timeout',
        'offline'
      ];

      if (networkErrors.some(networkError =>
        errorMessage.includes(networkError)
      )) {
        return true;
      }
    }

    return true;
  }

  // Log persistent error for user intervention
  private async logPersistentError(
    operation: string,
    documentId: string,
    error: Error
  ): Promise<void> {
    try {
      // Update document with sync error
      await updateDocument(documentId, {
        syncError: `${operation}: ${error.message}`,
        lastSyncAt: new Date()
      });

      // Notify sync status manager
      syncStatusManager.handleSyncError(
        `Sync failed for ${operation}: ${error.message}`
      );

    } catch (logError) {
      console.error('Failed to log persistent error:', logError);
    }
  }

  // Clear error history for a document
  clearErrors(documentId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.errorCounts.keys()) {
      if (key.endsWith(`:${documentId}`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.errorCounts.delete(key);
      this.lastErrors.delete(key);
    });
  }

  // Clear all errors
  clearAllErrors(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  // Get error statistics
  getErrorStats(): {
    totalErrors: number;
    documentsWithErrors: number;
    mostCommonErrors: Array<{ error: string; count: number }>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const documentsWithErrors = this.errorCounts.size;

    // Aggregate errors by operation type
    const errorByOperation = new Map<string, number>();
    for (const [key, count] of this.errorCounts.entries()) {
      const operation = key.split(':')[0];
      errorByOperation.set(operation, (errorByOperation.get(operation) || 0) + count);
    }

    const mostCommonErrors = Array.from(errorByOperation.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors,
      documentsWithErrors,
      mostCommonErrors
    };
  }
}

// Export singleton instance
export const syncErrorHandler = SyncErrorHandler.getInstance();

// Sync recovery utilities

export class SyncRecovery {
  // Attempt to recover failed sync operations
  static async attemptRecovery(documentId?: string): Promise<void> {
    try {
      if (documentId) {
        // Recover specific document
        await syncService.syncDocument(documentId);
        syncErrorHandler.clearErrors(documentId);
      } else {
        // Recover all pending operations
        await syncService.forceSyncNow();
        // Clear all error counts
        syncErrorHandler.clearAllErrors(); // Clear all error counts instead of resetting
      }

      syncStatusManager.handleSyncSuccess();
    } catch (error) {
      syncStatusManager.handleSyncError(
        `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  // Check sync health
  static async checkSyncHealth(user?: User | null): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check network connectivity
    if (!navigator.onLine) {
      issues.push('Device is offline');
      recommendations.push('Check internet connection');
    }

    // Check authentication
    if (!user) {
      issues.push('User not authenticated');
      recommendations.push('Sign in to enable sync');
    }

    // Check sync service status
    const syncStatus = await syncStatusManager.getCurrentDetailedStatus();
    if (syncStatus.failedOperations > 0) {
      issues.push(`${syncStatus.failedOperations} failed operations`);
      recommendations.push('Retry sync or check error details');
    }

    if (syncStatus.conflictsCount > 0) {
      issues.push(`${syncStatus.conflictsCount} conflicts need resolution`);
      recommendations.push('Resolve conflicts manually');
    }

    // Check error stats
    const errorStats = syncErrorHandler.getErrorStats();
    if (errorStats.totalErrors > 10) {
      issues.push('High number of sync errors');
      recommendations.push('Check network stability and app configuration');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}

// Initialize sync system
export function initializeSyncSystem(): void {
  // Start background sync worker
  backgroundSyncWorker.start();

  // Set up global error handlers
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      SyncRecovery.attemptRecovery().catch(console.error);
    });
  }

  console.log('Sync system initialized');
}

// Cleanup sync system
export function cleanupSyncSystem(): void {
  backgroundSyncWorker.destroy();
  syncStatusManager.destroy();
  console.log('Sync system cleaned up');
}