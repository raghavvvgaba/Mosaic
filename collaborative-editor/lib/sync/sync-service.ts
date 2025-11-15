import { appwrite, ID, Query } from '../appwrite/config';
import { getDocument, updateDocument, getAllDocuments } from '../db/documents';
import { getWorkspace } from '../db/workspaces';
import type { Document, Conflict, User } from '../db/types';

export interface SyncResult {
  success: boolean;
  conflicts?: Conflict[];
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt?: Date;
  pendingUploads: number;
  pendingDownloads: number;
  syncInProgress: boolean;
}

export interface SyncOperation {
  type: 'upload' | 'download';
  entityType: 'document' | 'workspace';
  entityId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

export class SyncService {
  private static instance: SyncService;
  private operationsQueue: SyncOperation[] = [];
  private isProcessing = false;
  private retryDelay = 1000; // Start with 1 second
  private maxRetries = 3;
  private subscribers: ((status: SyncStatus) => void)[] = [];

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // Subscribe to sync status changes
  subscribe(callback: (status: SyncStatus) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers(status: SyncStatus) {
    this.subscribers.forEach(callback => callback(status));
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    const pendingUploads = this.operationsQueue.filter(op => op.type === 'upload').length;
    const pendingDownloads = this.operationsQueue.filter(op => op.type === 'download').length;

    return {
      isOnline: navigator.onLine,
      lastSyncAt: undefined, // TODO: Store last successful sync timestamp
      pendingUploads,
      pendingDownloads,
      syncInProgress: this.isProcessing
    };
  }

  // Queue a sync operation
  private queueOperation(operation: Omit<SyncOperation, 'timestamp' | 'retryCount'>) {
    const fullOperation: SyncOperation = {
      ...operation,
      timestamp: new Date(),
      retryCount: 0
    };

    this.operationsQueue.push(fullOperation);
    this.processQueue();
  }

  // Process the queue of sync operations
  private async processQueue() {
    if (this.isProcessing || this.operationsQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.notifySubscribers(this.getSyncStatus());

    while (this.operationsQueue.length > 0) {
      const operation = this.operationsQueue[0];

      try {
        await this.processOperation(operation);
        this.operationsQueue.shift(); // Remove successful operation
        this.retryDelay = 1000; // Reset retry delay
      } catch (error) {
        console.error('Sync operation failed:', error);

        if (operation.retryCount < this.maxRetries) {
          // Retry with exponential backoff
          operation.retryCount++;
          await this.delay(this.retryDelay * Math.pow(2, operation.retryCount - 1));
        } else {
          // Max retries reached, remove operation and log error
          console.error(`Max retries reached for operation:`, operation);
          this.operationsQueue.shift();

          // TODO: Store error in document for user to see
        }
      }
    }

    this.isProcessing = false;
    this.notifySubscribers(this.getSyncStatus());
  }

  // Process individual sync operation
  private async processOperation(operation: SyncOperation): Promise<void> {
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    if (!databaseId) {
      throw new Error('Database ID not configured');
    }

    switch (operation.type) {
      case 'upload':
        await this.uploadOperation(operation, databaseId);
        break;
      case 'download':
        await this.downloadOperation(operation, databaseId);
        break;
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  }

  // Upload local changes to cloud
  private async uploadOperation(operation: SyncOperation, databaseId: string): Promise<void> {
    switch (operation.entityType) {
      case 'document':
        await this.uploadDocument(operation.data, databaseId);
        break;
      case 'workspace':
        await this.uploadWorkspace(operation.data, databaseId);
        break;
      default:
        throw new Error(`Unknown entity type for upload: ${operation.entityType}`);
    }
  }

  // Download cloud changes to local
  private async downloadOperation(operation: SyncOperation, databaseId: string): Promise<void> {
    switch (operation.entityType) {
      case 'document':
        await this.downloadDocument(operation.entityId, databaseId);
        break;
      case 'workspace':
        await this.downloadWorkspace(operation.entityId, databaseId);
        break;
      default:
        throw new Error(`Unknown entity type for download: ${operation.entityType}`);
    }
  }

  // Upload document to cloud
  private async uploadDocument(document: Document, databaseId: string): Promise<void> {
    try {
      const documentData = {
        title: document.title,
        content: document.content,
        workspaceId: document.workspaceId,
        icon: document.icon || '',
        coverImage: document.coverImage || '',
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        lastOpenedAt: document.lastOpenedAt?.toISOString() || '',
        isDeleted: document.isDeleted,
        isFavorite: document.isFavorite || false,
        parentId: document.parentId || '',
        font: document.font || 'sans',
        cloudSynced: true,
        syncVersion: document.syncVersion + 1,
        isPublic: document.isPublic,
        ownerId: document.ownerId,
        collaborators: document.collaborators,
        permissions: document.permissions,
        yjsState: document.yjsState || '',
        lastSyncAt: new Date().toISOString(),
        syncError: null,
        conflicts: []
      };

      if (document.cloudId) {
        // Update existing document
        const documentsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_COLLECTION_ID || 'documents';
        await appwrite.databases.updateDocument(
          databaseId,
          documentsCollectionId,
          document.cloudId,
          documentData
        );
      } else {
        // Create new document
        const cloudDoc = await appwrite.databases.createDocument(
          databaseId,
          'documents',
          ID.unique(),
          {
            ...documentData,
            localId: document.id // Keep reference to local ID
          }
        );

        // Update local document with cloud ID
        await updateDocument(document.id, {
          cloudId: cloudDoc.$id,
          cloudSynced: true,
          lastSyncAt: new Date()
        });
      }

      // Update local document sync status
      await updateDocument(document.id, {
        cloudSynced: true,
        syncVersion: document.syncVersion + 1,
        lastSyncAt: new Date(),
        syncError: undefined
      });

    } catch (error) {
      // Update local document with error
      await updateDocument(document.id, {
        syncError: error instanceof Error ? error.message : 'Unknown sync error'
      });
      throw error;
    }
  }

  // Upload workspace to cloud
  private async uploadWorkspace(workspace: any, databaseId: string): Promise<void> {
    // TODO: Implement workspace upload similar to document upload
    console.log('Workspace upload not yet implemented:', workspace);
  }

  // Download document from cloud
  private async downloadDocument(documentId: string, databaseId: string): Promise<void> {
    try {
      const documentsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_COLLECTION_ID || 'documents';
      const cloudDoc = await appwrite.databases.getDocument(
        databaseId,
        documentsCollectionId,
        documentId
      );

      const localDoc = await getDocument(cloudDoc.localId || documentId);

      if (!localDoc) {
        // Document doesn't exist locally, create it
        // TODO: Handle creating new local document from cloud
        console.log('Creating local document from cloud not yet implemented');
        return;
      }

      // Check versions to detect conflicts
      if (cloudDoc.syncVersion > localDoc.syncVersion) {
        // Cloud version is newer, check for conflicts
        const conflicts = await this.detectConflicts(localDoc, cloudDoc);

        if (conflicts.length > 0) {
          // Handle conflicts
          await this.handleConflicts(localDoc, cloudDoc, conflicts);
        } else {
          // No conflicts, safe to merge
          await this.mergeDocument(localDoc, cloudDoc);
        }
      }

    } catch (error) {
      console.error('Failed to download document:', error);
      throw error;
    }
  }

  // Download workspace from cloud
  private async downloadWorkspace(workspaceId: string, databaseId: string): Promise<void> {
    // TODO: Implement workspace download similar to document download
    console.log('Workspace download not yet implemented:', workspaceId);
  }

  // Detect conflicts between local and cloud versions
  private async detectConflicts(localDoc: Document, cloudDoc: any): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Compare modified times
    const localModified = new Date(localDoc.updatedAt).getTime();
    const cloudModified = new Date(cloudDoc.updatedAt).getTime();
    const lastSync = localDoc.lastSyncAt ? new Date(localDoc.lastSyncAt).getTime() : 0;

    // If both were modified after last sync, we have potential conflicts
    const localModifiedAfterSync = localModified > lastSync;
    const cloudModifiedAfterSync = cloudModified > lastSync;

    if (localModifiedAfterSync && cloudModifiedAfterSync) {
      // Check specific fields for conflicts
      if (localDoc.title !== cloudDoc.title) {
        conflicts.push({
          id: `title_${Date.now()}`,
          field: 'title',
          localValue: localDoc.title,
          remoteValue: cloudDoc.title,
          localTimestamp: localDoc.updatedAt,
          remoteTimestamp: new Date(cloudDoc.updatedAt),
          resolved: false
        });
      }

      if (localDoc.content !== cloudDoc.content) {
        conflicts.push({
          id: `content_${Date.now()}`,
          field: 'content',
          localValue: localDoc.content,
          remoteValue: cloudDoc.content,
          localTimestamp: localDoc.updatedAt,
          remoteTimestamp: new Date(cloudDoc.updatedAt),
          resolved: false
        });
      }
    }

    return conflicts;
  }

  // Handle conflicts between local and cloud versions
  private async handleConflicts(localDoc: Document, cloudDoc: any, conflicts: Conflict[]): Promise<void> {
    // Store conflicts in local document for user to resolve
    await updateDocument(localDoc.id, {
      conflicts,
      syncError: 'Conflicts detected - manual resolution required'
    });

    // TODO: Show conflict resolution UI to user
    console.log('Conflicts detected, user intervention required:', conflicts);
  }

  // Merge cloud document into local document
  private async mergeDocument(localDoc: Document, cloudDoc: any): Promise<void> {
    const mergedUpdates: Partial<Document> = {
      title: cloudDoc.title,
      content: cloudDoc.content,
      updatedAt: new Date(cloudDoc.updatedAt),
      cloudSynced: true,
      syncVersion: cloudDoc.syncVersion,
      lastSyncAt: new Date(),
      syncError: undefined,
      conflicts: []
    };

    await updateDocument(localDoc.id, mergedUpdates);
  }

  // Public methods to trigger sync

  // Sync a specific document
  async syncDocument(documentId: string, user?: User | null): Promise<SyncResult> {
    try {
      // Check if user is authenticated
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const document = await getDocument(documentId);
      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      // Check if document needs upload
      if (!document.cloudSynced || this.documentNeedsUpload(document)) {
        this.queueOperation({
          type: 'upload',
          entityType: 'document',
          entityId: documentId,
          data: document
        });
      }

      // Also download latest from cloud
      if (document.cloudId) {
        this.queueOperation({
          type: 'download',
          entityType: 'document',
          entityId: document.cloudId,
          data: null
        });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error'
      };
    }
  }

  // Sync all documents for a workspace
  async syncWorkspace(workspaceId: string): Promise<SyncResult> {
    try {
      const documents = await getAllDocuments(workspaceId);

      for (const document of documents) {
        await this.syncDocument(document.id);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error'
      };
    }
  }

  // Sync all user data
  async syncAll(user?: User | null): Promise<SyncResult> {
    try {
      // Check if user is authenticated
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const documents = await getAllDocuments();

      for (const document of documents) {
        if (document.cloudSynced || this.documentNeedsUpload(document)) {
          await this.syncDocument(document.id, user);
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error'
      };
    }
  }

  // Check if document needs to be uploaded
  private documentNeedsUpload(document: Document): boolean {
    if (!document.cloudSynced) return true;

    const lastSync = document.lastSyncAt ? new Date(document.lastSyncAt).getTime() : 0;
    const lastModified = new Date(document.updatedAt).getTime();

    return lastModified > lastSync;
  }

  // Force immediate sync
  async forceSyncNow(): Promise<SyncResult> {
    // Clear queue and process immediately
    const currentQueue = [...this.operationsQueue];
    this.operationsQueue = [];

    // Process all operations immediately
    for (const operation of currentQueue) {
      try {
        await this.processOperation(operation);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Force sync failed'
        };
      }
    }

    return { success: true };
  }

  // Clear all pending operations
  clearQueue(): void {
    this.operationsQueue = [];
    this.notifySubscribers(this.getSyncStatus());
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Handle online/offline events
  handleOnlineStatusChange(isOnline: boolean): void {
    this.notifySubscribers(this.getSyncStatus());

    if (isOnline && this.operationsQueue.length > 0) {
      // Back online, resume sync
      this.processQueue();
    }
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncService.handleOnlineStatusChange(true);
  });

  window.addEventListener('offline', () => {
    syncService.handleOnlineStatusChange(false);
  });
}