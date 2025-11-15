import { useState, useEffect, useCallback } from 'react';
import { syncService, SyncStatus, SyncResult } from './sync-service';
import { syncStatusManager, DetailedSyncStatus, SyncEvent } from './sync-status-manager';
import { backgroundSyncWorker, SyncWorkerConfig } from './background-sync-worker';
import { conflictResolver, type Conflict } from './conflict-resolver';

// Hook for sync status
export function useSyncStatus() {
  const [status, setStatus] = useState<DetailedSyncStatus | null>(null);

  useEffect(() => {
    const unsubscribe = syncStatusManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    // Get initial status
    syncStatusManager.getCurrentDetailedStatus().then(setStatus);

    return unsubscribe;
  }, []);

  const forceSync = useCallback(async (): Promise<SyncResult> => {
    return await backgroundSyncWorker.forceSyncNow();
  }, []);

  const clearErrors = useCallback(() => {
    syncStatusManager.clearErrors();
  }, []);

  return {
    status,
    forceSync,
    clearErrors,
    isOnline: status?.isOnline ?? false,
    isSyncing: status?.syncInProgress ?? false,
    hasErrors: (status?.failedOperations ?? 0) > 0,
    hasConflicts: (status?.conflictsCount ?? 0) > 0
  };
}

// Hook for sync events
export function useSyncEvents() {
  const [events, setEvents] = useState<SyncEvent[]>([]);

  useEffect(() => {
    const unsubscribe = syncStatusManager.subscribeToEvents((event) => {
      setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
    });

    return unsubscribe;
  }, []);

  return events;
}

// Hook for background sync worker
export function useBackgroundSync() {
  const [workerStatus, setWorkerStatus] = useState(backgroundSyncWorker.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setWorkerStatus(backgroundSyncWorker.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateConfig = useCallback((config: Partial<SyncWorkerConfig>) => {
    backgroundSyncWorker.updateConfig(config);
  }, []);

  const queueDocumentSync = useCallback((documentId: string) => {
    backgroundSyncWorker.queueDocumentSync(documentId);
  }, []);

  const forceSync = useCallback(async () => {
    return await backgroundSyncWorker.forceSyncNow();
  }, []);

  return {
    status: workerStatus,
    config: backgroundSyncWorker.getConfig(),
    updateConfig,
    queueDocumentSync,
    forceSync,
    start: useCallback(() => backgroundSyncWorker.start(), []),
    stop: useCallback(() => backgroundSyncWorker.stop(), []),
    clearQueue: useCallback(() => backgroundSyncWorker.clearDocumentQueue(), [])
  };
}

// Hook for document sync
export function useDocumentSync(documentId: string) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | undefined>();
  const [syncError, setSyncError] = useState<string | undefined>();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const syncDocument = useCallback(async () => {
    if (!documentId) return;

    setIsSyncing(true);
    setSyncError(undefined);

    try {
      const result = await syncService.syncDocument(documentId);

      if (result.success) {
        setLastSync(new Date());
        if (result.conflicts) {
          setConflicts(result.conflicts);
        }
      } else {
        setSyncError(result.error);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [documentId]);

  const resolveConflicts = useCallback(async (resolutions: any[]) => {
    if (!documentId) return;

    try {
      await conflictResolver.resolveConflicts(documentId, conflicts, resolutions);
      setConflicts([]);
      setSyncError(undefined);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Conflict resolution failed');
    }
  }, [documentId, conflicts]);

  // Queue document for background sync when it changes
  const queueSync = useCallback(() => {
    if (documentId) {
      backgroundSyncWorker.queueDocumentSync(documentId);
    }
  }, [documentId]);

  return {
    isSyncing,
    lastSync,
    syncError,
    conflicts,
    syncDocument,
    resolveConflicts,
    queueSync,
    hasConflicts: conflicts.length > 0
  };
}

// Hook for sync statistics
export function useSyncStats() {
  const [stats, setStats] = useState(() => syncStatusManager.getSyncStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(syncStatusManager.getSyncStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}