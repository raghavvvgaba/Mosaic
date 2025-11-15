import { syncService, SyncResult } from './sync-service';
import { syncStatusManager } from './sync-status-manager';
import { getAllDocuments } from '../db/documents';
import type { User } from '../db/types';

export interface SyncSchedule {
  immediate: boolean;
  interval: boolean;
  userActivity: boolean;
  networkChange: boolean;
  documentChange: boolean;
}

export interface SyncWorkerConfig {
  enabled: boolean;
  immediateSync: boolean;
  syncInterval: number; // Default 5 minutes
  maxRetries: number;
  retryDelay: number;
  syncOnUserActivity: boolean;
  syncOnNetworkChange: boolean;
  syncOnDocumentChange: boolean;
  userActivityThreshold: number; // milliseconds
  maxBatchSize: number;
}

export class BackgroundSyncWorker {
  private static instance: BackgroundSyncWorker;
  private config: SyncWorkerConfig;
  private isRunning = false;
  private syncInterval?: NodeJS.Timeout;
  private userActivityTimeout?: NodeJS.Timeout;
  private lastUserActivity = Date.now();
  private lastSyncTime?: Date;
  private retryCount = 0;
  private isUserActive = true;
  private documentChangeQueue: string[] = []; // Document IDs that need syncing
  private networkWasOnline = navigator.onLine;
  private currentUser: User | null = null;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): BackgroundSyncWorker {
    if (!BackgroundSyncWorker.instance) {
      BackgroundSyncWorker.instance = new BackgroundSyncWorker();
    }
    return BackgroundSyncWorker.instance;
  }

  /**
   * Initialize the sync worker with an authenticated user
   */
  async initialize(user: User): Promise<void> {
    this.currentUser = user;
    this.initialize();
  }

  /**
   * Update the current user (for sign-in/sign-out scenarios)
   */
  setUser(user: User | null): void {
    this.currentUser = user;
    if (!user) {
      this.stop(); // Stop sync if user is not authenticated
    } else if (!this.isRunning) {
      this.initialize(); // Start sync if user becomes authenticated
    }
  }

  private getDefaultConfig(): SyncWorkerConfig {
    return {
      enabled: true,
      immediateSync: true,
      syncInterval: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      syncOnUserActivity: true,
      syncOnNetworkChange: true,
      syncOnDocumentChange: true,
      userActivityThreshold: 30 * 1000, // 30 seconds
      maxBatchSize: 10
    };
  }

  private initialize(): void {
    // Set up event listeners
    this.setupEventListeners();

    // Start sync schedule if enabled and user is authenticated
    if (this.config.enabled && this.currentUser) {
      this.start();
    }
  }

  // Set up event listeners
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // User activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.handleUserActivity();
      }, { passive: true });
    });

    // Network status events
    window.addEventListener('online', () => {
      this.handleNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleNetworkChange(false);
    });

    // Page visibility events
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Window focus/blur events
    window.addEventListener('focus', () => {
      this.handleWindowFocus();
    });

    window.addEventListener('blur', () => {
      this.handleWindowBlur();
    });
  }

  // Handle user activity
  private handleUserActivity(): void {
    this.lastUserActivity = Date.now();
    this.isUserActive = true;

    // Clear existing timeout
    if (this.userActivityTimeout) {
      clearTimeout(this.userActivityTimeout);
    }

    // Set user as inactive after threshold
    this.userActivityTimeout = setTimeout(() => {
      this.isUserActive = false;
    }, this.config.userActivityThreshold);

    // Trigger sync on user activity if configured
    if (this.config.syncOnUserActivity && this.config.enabled) {
      this.scheduleSync({ immediate: true, userActivity: true });
    }
  }

  // Handle network status change
  private handleNetworkChange(isOnline: boolean): void {
    if (this.config.syncOnNetworkChange && this.config.enabled) {
      if (isOnline && !this.networkWasOnline) {
        // Back online - sync immediately
        this.scheduleSync({ immediate: true, networkChange: true });
      }
    }
    this.networkWasOnline = isOnline;
  }

  // Handle page visibility change
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && this.config.enabled) {
      // Page became visible - sync if it's been a while
      const timeSinceLastSync = this.lastSyncTime
        ? Date.now() - this.lastSyncTime.getTime()
        : Infinity;

      if (timeSinceLastSync > this.config.syncInterval) {
        this.scheduleSync({ immediate: true, userActivity: true });
      }
    }
  }

  // Handle window focus
  private handleWindowFocus(): void {
    if (this.config.enabled) {
      this.scheduleSync({ immediate: true, userActivity: true });
    }
  }

  // Handle window blur
  private handleWindowBlur(): void {
    this.isUserActive = false;
  }

  // Start the background sync worker
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.schedulePeriodicSync();

    // Immediate sync if configured
    if (this.config.immediateSync) {
      this.scheduleSync({ immediate: true });
    }
  }

  // Stop the background sync worker
  stop(): void {
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    if (this.userActivityTimeout) {
      clearTimeout(this.userActivityTimeout);
      this.userActivityTimeout = undefined;
    }
  }

  // Schedule periodic sync
  private schedulePeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.config.enabled && this.shouldSync()) {
        this.scheduleSync({ interval: true });
      }
    }, this.config.syncInterval);
  }

  // Check if sync should run
  private shouldSync(): boolean {
    // Must be online
    if (!navigator.onLine) return false;

    // User must be active or configured to sync when inactive
    if (!this.isUserActive && !this.config.syncOnUserActivity) return false;

    // Page must be visible or configured to sync when hidden
    if (document.visibilityState === 'hidden') return false;

    return true;
  }

  // Schedule a sync operation
  private scheduleSync(options: Partial<SyncSchedule> = {}): void {
    const schedule: SyncSchedule = {
      immediate: false,
      interval: false,
      userActivity: false,
      networkChange: false,
      documentChange: false,
      ...options
    };

    if (schedule.immediate) {
      // Sync immediately
      setTimeout(() => this.performSync(schedule), 100);
    } else {
      // Sync with small delay to batch operations
      setTimeout(() => this.performSync(schedule), 1000);
    }
  }

  // Perform the actual sync operation
  private async performSync(schedule: SyncSchedule): Promise<void> {
    if (!this.config.enabled || !this.shouldSync() || !this.currentUser) return;

    try {
      syncStatusManager.handleSyncStart();

      // Determine what to sync
      let result: SyncResult;

      if (this.documentChangeQueue.length > 0) {
        // Sync specific documents
        result = await this.syncDocumentBatch();
      } else {
        // Sync all data
        result = await this.syncAll();
      }

      if (result.success) {
        this.lastSyncTime = new Date();
        this.retryCount = 0;
        syncStatusManager.handleSyncSuccess();
      } else {
        this.handleSyncError(result.error || 'Unknown sync error', schedule);
      }

    } catch (error) {
      this.handleSyncError(error instanceof Error ? error.message : 'Sync failed', schedule);
    }
  }

  // Sync a batch of documents
  private async syncDocumentBatch(): Promise<SyncResult> {
    const batch = this.documentChangeQueue.splice(0, this.config.maxBatchSize);
    let errors: string[] = [];

    for (const documentId of batch) {
      try {
        const result = await syncService.syncDocument(documentId);
        if (!result.success) {
          errors.push(`Document ${documentId}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  // Sync all data
  private async syncAll(): Promise<SyncResult> {
    return await syncService.syncAll();
  }

  // Handle sync errors
  private handleSyncError(error: string, schedule: SyncSchedule): void {
    syncStatusManager.handleSyncError(error);

    // Retry logic
    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;

      // Exponential backoff
      const delay = this.config.retryDelay * Math.pow(2, this.retryCount - 1);

      setTimeout(() => {
        this.performSync(schedule);
      }, delay);
    }
  }

  // Queue document for sync
  queueDocumentSync(documentId: string): void {
    if (!this.documentChangeQueue.includes(documentId)) {
      this.documentChangeQueue.push(documentId);
    }

    if (this.config.syncOnDocumentChange) {
      this.scheduleSync({ documentChange: true });
    }
  }

  // Configuration methods

  // Update configuration
  updateConfig(updates: Partial<SyncWorkerConfig>): void {
    this.config = { ...this.config, ...updates };

    if (!this.config.enabled) {
      this.stop();
    } else if (!this.isRunning) {
      this.start();
    }

    // Restart periodic sync if interval changed
    if (updates.syncInterval && this.isRunning) {
      this.schedulePeriodicSync();
    }
  }

  // Get current configuration
  getConfig(): SyncWorkerConfig {
    return { ...this.config };
  }

  // Get worker status
  getStatus(): {
    isRunning: boolean;
    isUserActive: boolean;
    lastSyncTime?: Date;
    retryCount: number;
    queuedDocuments: number;
    networkOnline: boolean;
    pageVisible: boolean;
  } {
    return {
      isRunning: this.isRunning,
      isUserActive: this.isUserActive,
      lastSyncTime: this.lastSyncTime,
      retryCount: this.retryCount,
      queuedDocuments: this.documentChangeQueue.length,
      networkOnline: navigator.onLine,
      pageVisible: document.visibilityState === 'visible'
    };
  }

  // Force sync now
  async forceSyncNow(): Promise<SyncResult> {
    try {
      // Check if user is authenticated
      if (!this.currentUser) {
        return { success: false, error: 'User not authenticated' };
      }

      syncStatusManager.handleSyncStart();
      const result = await this.syncAll();

      if (result.success) {
        this.lastSyncTime = new Date();
        this.retryCount = 0;
        syncStatusManager.handleSyncSuccess();
      } else {
        syncStatusManager.handleSyncError(result.error || 'Force sync failed');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Force sync failed';
      syncStatusManager.handleSyncError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Clear document queue
  clearDocumentQueue(): void {
    this.documentChangeQueue = [];
  }

  // Reset retry count
  resetRetries(): void {
    this.retryCount = 0;
  }

  // Cleanup
  destroy(): void {
    this.stop();
    this.clearDocumentQueue();
  }
}

// Export singleton instance
export const backgroundSyncWorker = BackgroundSyncWorker.getInstance();