import { syncService, SyncStatus } from './sync-service';
import { getAllDocuments, getDocument } from '../db/documents';
import type { User } from '../db/types';

export type SyncStatusLevel = 'synced' | 'syncing' | 'offline' | 'error' | 'pending';

export interface DetailedSyncStatus extends SyncStatus {
  status: SyncStatusLevel;
  message: string;
  lastSuccessfulSync?: Date;
  failedOperations: number;
  documentsNeedingSync: number;
  conflictsCount: number;
}

export interface SyncEvent {
  type: 'sync_start' | 'sync_success' | 'sync_error' | 'conflict_detected' | 'connection_change';
  timestamp: Date;
  data?: any;
  error?: string;
}

export class SyncStatusManager {
  private static instance: SyncStatusManager;
  private subscribers: ((status: DetailedSyncStatus) => void)[] = [];
  private eventSubscribers: ((event: SyncEvent) => void)[] = [];
  private statusHistory: SyncEvent[] = [];
  private maxHistorySize = 100;
  private lastSuccessfulSync?: Date;
  private failedOperations = 0;
  private statusCheckInterval?: NodeJS.Timeout;
  private currentUser: User | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): SyncStatusManager {
    if (!SyncStatusManager.instance) {
      SyncStatusManager.instance = new SyncStatusManager();
    }
    return SyncStatusManager.instance;
  }

  /**
   * Initialize the sync status manager with an authenticated user
   */
  initialize(user: User): void {
    this.currentUser = user;
  }

  /**
   * Update the current user (for sign-in/sign-out scenarios)
   */
  setUser(user: User | null): void {
    this.currentUser = user;
  }

  /**
   * Cleanup when user signs out
   */
  cleanup(): void {
    this.currentUser = null;
    this.failedOperations = 0;
    this.lastSuccessfulSync = undefined;
    this.statusHistory = [];
  }

  private initialize(): void {
    // Subscribe to sync service status changes
    syncService.subscribe((syncStatus) => {
      this.handleSyncStatusChange(syncStatus);
    });

    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.handleConnectionChange(true);
      });

      window.addEventListener('offline', () => {
        this.handleConnectionChange(false);
      });
    }

    // Start periodic status checking
    this.startStatusChecking();

    // Initial status update
    this.updateDetailedStatus();
  }

  // Subscribe to detailed sync status changes
  subscribe(callback: (status: DetailedSyncStatus) => void) {
    this.subscribers.push(callback);
    // Immediately send current status
    this.getCurrentDetailedStatus().then(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  // Subscribe to sync events
  subscribeToEvents(callback: (event: SyncEvent) => void) {
    this.eventSubscribers.push(callback);
    return () => {
      this.eventSubscribers = this.eventSubscribers.filter(sub => sub !== callback);
    };
  }

  // Get current detailed sync status
  async getCurrentDetailedStatus(): Promise<DetailedSyncStatus> {
    const baseStatus = syncService.getSyncStatus();
    const conflictsCount = this.getConflictsCount();
    const documentsNeedingSync = this.getDocumentsNeedingSyncCount();

    // Use stored authentication status
    const isAuthenticated = !!this.currentUser;

    let status: SyncStatusLevel;
    let message: string;

    if (!isAuthenticated) {
      status = 'synced';
      message = 'Local mode - Sign in to enable cloud sync';
    } else if (!baseStatus.isOnline) {
      status = 'offline';
      message = 'Offline - Changes will sync when connection is restored';
    } else if (baseStatus.syncInProgress) {
      status = 'syncing';
      message = 'Syncing changes...';
    } else if (this.failedOperations > 0) {
      status = 'error';
      message = `Sync error - ${this.failedOperations} operation(s) failed`;
    } else if (conflictsCount > 0) {
      status = 'error';
      message = `${conflictsCount} conflict(s) need resolution`;
    } else if (baseStatus.pendingUploads > 0 || baseStatus.pendingDownloads > 0 || documentsNeedingSync > 0) {
      status = 'pending';
      const totalPending = baseStatus.pendingUploads + baseStatus.pendingDownloads + documentsNeedingSync;
      message = `${totalPending} item(s) waiting to sync`;
    } else {
      status = 'synced';
      if (this.lastSuccessfulSync) {
        const timeAgo = this.formatTimeAgo(this.lastSuccessfulSync);
        message = `All synced - ${timeAgo}`;
      } else {
        message = 'All synced';
      }
    }

    return {
      ...baseStatus,
      status,
      message,
      lastSuccessfulSync: this.lastSuccessfulSync,
      failedOperations: this.failedOperations,
      documentsNeedingSync,
      conflictsCount
    };
  }

  /**
   * Get current sync status (non-async version for basic status)
   */
  getCurrentStatus(): SyncStatus {
    return syncService.getSyncStatus();
  }

  // Handle sync status changes from sync service
  private handleSyncStatusChange(syncStatus: SyncStatus): void {
    this.updateDetailedStatus();
  }

  // Handle connection changes
  private handleConnectionChange(isOnline: boolean): void {
    const event: SyncEvent = {
      type: 'connection_change',
      timestamp: new Date(),
      data: { isOnline }
    };

    this.addEvent(event);
    this.eventSubscribers.forEach(callback => callback(event));

    if (isOnline) {
      // Back online - try to sync
      this.attemptSync();
    }

    this.updateDetailedStatus();
  }

  // Handle sync start
  handleSyncStart(): void {
    const event: SyncEvent = {
      type: 'sync_start',
      timestamp: new Date()
    };

    this.addEvent(event);
    this.eventSubscribers.forEach(callback => callback(event));
    this.updateDetailedStatus();
  }

  // Handle sync success
  handleSyncSuccess(): void {
    this.lastSuccessfulSync = new Date();
    this.failedOperations = 0;

    const event: SyncEvent = {
      type: 'sync_success',
      timestamp: new Date(),
      data: { syncTime: this.lastSuccessfulSync }
    };

    this.addEvent(event);
    this.eventSubscribers.forEach(callback => callback(event));
    this.updateDetailedStatus();
  }

  // Handle sync error
  handleSyncError(error: string): void {
    this.failedOperations++;

    const event: SyncEvent = {
      type: 'sync_error',
      timestamp: new Date(),
      error
    };

    this.addEvent(event);
    this.eventSubscribers.forEach(callback => callback(event));
    this.updateDetailedStatus();
  }

  // Handle conflict detection
  handleConflictDetected(conflictsCount: number): void {
    const event: SyncEvent = {
      type: 'conflict_detected',
      timestamp: new Date(),
      data: { conflictsCount }
    };

    this.addEvent(event);
    this.eventSubscribers.forEach(callback => callback(event));
    this.updateDetailedStatus();
  }

  // Update and broadcast detailed status
  private async updateDetailedStatus(): Promise<void> {
    const status = await this.getCurrentDetailedStatus();
    this.subscribers.forEach(callback => callback(status));
  }

  // Add event to history
  private addEvent(event: SyncEvent): void {
    this.statusHistory.unshift(event);
    if (this.statusHistory.length > this.maxHistorySize) {
      this.statusHistory = this.statusHistory.slice(0, this.maxHistorySize);
    }
  }

  // Get count of documents with conflicts
  private getConflictsCount(): number {
    // This is a simplified version - in a real implementation,
    // you'd want to maintain a running count or query efficiently
    try {
      // For now, return 0 - this would be implemented with proper database queries
      return 0;
    } catch {
      return 0;
    }
  }

  // Get count of documents needing sync
  private getDocumentsNeedingSyncCount(): number {
    try {
      // This is a simplified version - in production, you'd optimize this query
      return 0; // Would be implemented with proper database queries
    } catch {
      return 0;
    }
  }

  // Attempt to sync
  private async attemptSync(): Promise<void> {
    try {
      this.handleSyncStart();
      const result = await syncService.syncAll();

      if (result.success) {
        this.handleSyncSuccess();
      } else {
        this.handleSyncError(result.error || 'Unknown sync error');
      }
    } catch (error) {
      this.handleSyncError(error instanceof Error ? error.message : 'Sync failed');
    }
  }

  // Start periodic status checking
  private startStatusChecking(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    // Check status every 30 seconds
    this.statusCheckInterval = setInterval(() => {
      this.updateDetailedStatus();
    }, 30000);
  }

  // Stop periodic status checking
  private stopStatusChecking(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = undefined;
    }
  }

  // Format time ago for display
  private formatTimeAgo(date: Date): string {
    const now = new Date().getTime();
    const time = new Date(date).getTime();
    const diffMs = now - time;

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  // Public methods

  // Force sync now
  async forceSyncNow(): Promise<void> {
    await this.attemptSync();
  }

  // Clear sync errors
  clearErrors(): void {
    this.failedOperations = 0;
    this.updateDetailedStatus();
  }

  // Get sync history
  getSyncHistory(limit?: number): SyncEvent[] {
    return limit ? this.statusHistory.slice(0, limit) : [...this.statusHistory];
  }

  // Get sync statistics
  getSyncStats(): {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageSyncTime?: number;
    lastSyncTime?: Date;
  } {
    const syncEvents = this.statusHistory.filter(e =>
      e.type === 'sync_success' || e.type === 'sync_error'
    );

    const successfulSyncs = this.statusHistory.filter(e => e.type === 'sync_success').length;
    const failedSyncs = this.statusHistory.filter(e => e.type === 'sync_error').length;

    return {
      totalSyncs: syncEvents.length,
      successfulSyncs,
      failedSyncs,
      lastSyncTime: this.lastSuccessfulSync
    };
  }

  // Check if user should be notified about sync status
  async shouldNotifyUser(): Promise<boolean> {
    const status = await this.getCurrentDetailedStatus();
    return status.status === 'error' || status.status === 'pending';
  }

  // Get notification message for user
  async getNotificationMessage(): Promise<string> {
    const status = await this.getCurrentDetailedStatus();
    return status.message;
  }

  // Cleanup
  destroy(): void {
    this.stopStatusChecking();
    this.subscribers = [];
    this.eventSubscribers = [];
    this.statusHistory = [];
  }
}

// Export singleton instance
export const syncStatusManager = SyncStatusManager.getInstance();