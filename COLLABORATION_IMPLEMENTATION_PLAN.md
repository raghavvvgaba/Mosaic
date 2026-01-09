# Real-time Collaborative Document Editing - Implementation Plan

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Phase 1: Database & Storage Setup](#phase-1-database--storage-setup)
- [Phase 2: Yjs Provider Implementation](#phase-2-yjs-provider-implementation)
- [Phase 3: Backend Services](#phase-3-backend-services)
- [Phase 4: Frontend Components](#phase-4-frontend-components)
- [Phase 5: Document Page Integration](#phase-5-document-page-integration)
- [Phase 6: "Shared with Me" Feature](#phase-6-shared-with-me-feature)
- [Phase 7: Database Types](#phase-7-database-types)
- [Phase 8: Cleanup & Optimization](#phase-8-cleanup--optimization)
- [Phase 9: Testing](#phase-9-testing)
- [Phase 10: Version History (Phase 2)](#phase-10-version-history-phase-2)
- [Future Scope: In-App Notifications](#future-scope-in-app-notifications)

---

## Overview

Implement real-time collaborative document editing using BlockNote + Yjs + Custom Appwrite Realtime provider.

### Core Features (MVP - Phase 1)
- ✅ Real-time document editing with CRDT conflict resolution
- ✅ Public document sharing via document ID (Notion-style)
- ✅ Three permission levels: Viewer, Editor, Owner
- ✅ Real-time cursor tracking and presence indicators
- ✅ Dual storage strategy (Database for state, Storage for updates)
- ✅ "Shared with Me" section for collaborative documents
- ✅ Automatic cleanup of old Yjs updates

### Future Features (Phase 2)
- 📝 Version history with snapshots and restore
- 📝 Comparison view between versions

### Key Technical Decisions
- **No offline support** - Simpler architecture, single source of truth
- **Automatic cleanup** - Keep last 1000 Yjs updates, archive older
- **Snapshots every 100 updates** - For version history
- **Keep last 50 versions** - Auto-cleanup old versions
- **Single URL for everyone** - Use document ID for sharing (Notion-style)
- **No share tokens** - Simpler architecture, document ID is shareable
- **Public = read-only** - Anyone can view, but collaborators get edit access
- **No link expiration** - Links work until revoked (toggle public off)
- **Collaborators added directly** - Add users by email/user ID

---

## Architecture

### Technology Stack
- **BlockNote** - Rich text editor with Yjs collaboration support
- **Yjs** - CRDT for conflict-free real-time collaboration
- **Appwrite Realtime** - WebSocket connection for real-time updates
- **Appwrite TablesDB** - Document metadata and Yjs state storage
- **Appwrite Storage** - Yjs updates and version snapshots

### Document Access Flow

**When user opens** `your-app.com/doc/{documentId}`:

1. **Check if document exists** → 404 if not found

2. **Check access based on user state:**
   - **User is logged in:**
     - Are they owner? → Full edit access
     - Are they in `sharedWith` array? → Check permission (viewer/editor)
     - Neither? → Check if `isPublic = true` → Read-only view
     - No access? → Show "You don't have permission" error

   - **User is NOT logged in:**
     - Is `isPublic = true`? → Read-only view + "Login to edit" prompt
     - Is `isPublic = false`? → Show "Document is private" message

3. **Render appropriate editor:**
   - **Owner:** Full editor + "Share" button + manage collaborators
   - **Editor:** Full editor + view collaborators (read-only list)
   - **Viewer:** Read-only view + "Request edit access" button
   - **Public viewer:** Read-only view + "Login to edit" prompt

### Data Flow
```
User A → Yjs Update → Appwrite Realtime → User B
                ↓
         Appwrite Storage (incremental updates)
                ↓
         Appwrite Database (full state backup)
```

### Storage Strategy
1. **Yjs State (Database)** - Full document state in `documents.yjsState`
   - Quick document load
   - Point-in-time snapshots
2. **Yjs Updates (Storage)** - Incremental updates in `yjs-updates` bucket
   - Efficient sync
   - Conflict resolution
   - Recovery from network issues

---

## Phase 1: Database & Storage Setup

**Estimated Time: 2-3 hours**

### 1.1 Update Appwrite TablesDB Schema

**Manual Setup Required in Appwrite Console**

#### Documents Table - Add Columns
Add the following columns to the existing `documents` table:

| Column Name | Type | Required | Default | Description |
|-------------|------|----------|---------|-------------|
| `yjsState` | String (size: 100,000) | No | null | Binary-encoded Yjs document state (base64) |
| `yjsUpdates` | String (size: 100,000, Array: Yes) | No | [] | Array of Storage file IDs for Yjs updates |
| `isPublic` | Boolean | Yes | false | Is document publicly viewable? |
| `sharedWith` | String (Array: Yes) | Yes | [] | Array of collaborators with permissions (JSON) |
| `lastUpdateCount` | Integer | Yes | 0 | Track update count for version history |

**Note on `sharedWith` array structure:**
```json
[
  {
    "userId": "user-abc123",
    "email": "john@example.com",
    "name": "John Doe",
    "permission": "editor",  // or "viewer"
    "addedAt": "2026-01-08T10:00:00Z",
    "addedBy": "owner-id"
  }
]
```

#### Create Document Versions Table
Create a new table `document_versions`:

| Column Name | Type | Description |
|-------------|------|-------------|
| `id` | string (auto-generated) | Version ID |
| `documentId` | string | Reference to documents table |
| `storageFileId` | string | Reference to Storage snapshot file |
| `createdAt` | datetime | When this version was created |
| `createdBy` | string | User ID who created this version |
| `updateCount` | number | Which Yjs update this snapshot represents |
| `description` | string, nullable | Optional manual label (e.g., "Draft v2") |

### 1.2 Create Storage Buckets

**Manual Setup Required in Appwrite Console**

#### Bucket 1: `yjs-updates`
- **Purpose**: Store incremental Yjs updates
- **Permissions**:
  - Read: `Role.any()` (for document sync)
  - Write: `Role.user(userId)` (authenticated users)
- **File Size Limit**: 1MB per file (updates are small)
- **Max Files**: 10,000 per bucket

#### Bucket 2: `document-snapshots`
- **Purpose**: Store version history snapshots
- **Permissions**:
  - Read: `Role.user(userId)` (authenticated users)
  - Write: `Role.user(userId)` (document owners/editors)
- **File Size Limit**: 10MB per file (snapshots can be large)
- **Max Files**: 1,000 per bucket

### 1.3 Environment Variables

Add to `.env.local`:

```env
# Existing variables...

# Yjs Storage
NEXT_PUBLIC_YJS_UPDATES_BUCKET_ID=yjs-updates
NEXT_PUBLIC_DOCUMENT_SNAPSHOTS_BUCKET_ID=document-snapshots

# Version History
YJS_SNAPSHOT_INTERVAL=100  # Create snapshot every 100 updates
YJS_VERSIONS_TO_KEEP=50     # Keep last 50 versions
YJS_UPDATES_TO_KEEP=1000    # Keep last 1000 updates
```

---

## Phase 2: Yjs Provider Implementation

**Estimated Time: 8-10 hours**

### 2.1 Create Appwrite Yjs Provider

**File: `lib/yjs/AppwriteProvider.ts`** (NEW)

```typescript
import * as Y from 'yjs';
import type { Provider } from 'yjs';

export interface CursorPosition {
  userId: string;
  index: number;
  length: number;
  blockId?: string;
  color: string;
  name: string;
}

export interface PresenceData {
  userId: string;
  userName: string;
  userColor: string;
  isActive: boolean;
  connectedAt: Date;
}

export interface RealtimeCallbacks {
  onRemoteCursor: (cursor: CursorPosition) => void;
  onPresenceChange: (userId: string, presence: PresenceData) => void;
  onUserDisconnected: (userId: string) => void;
}

export class AppwriteProvider implements Provider {
  private doc: Y.Doc;
  private documentId: string;
  private userId: string;
  private userName: string;
  private userColor: string;
  private realtime: any; // Appwrite Realtime client
  private subscription: any;
  private connected: boolean;
  private status: 'connecting' | 'connected' | 'disconnected';
  private callbacks: RealtimeCallbacks;

  private updateQueue: Uint8Array[] = [];
  private saveTimer: NodeJS.Timeout | null = null;
  private lastSaveTime: number = 0;
  private updateCount: number = 0;

  constructor(
    doc: Y.Doc,
    documentId: string,
    userId: string,
    userName: string,
    userColor: string,
    callbacks: RealtimeCallbacks
  ) {
    this.doc = doc;
    this.documentId = documentId;
    this.userId = userId;
    this.userName = userName;
    this.userColor = userColor;
    this.callbacks = callbacks;
    this.connected = false;
    this.status = 'connecting';

    // Listen to Yjs document changes
    this.doc.on('update', this.handleLocalUpdate);
  }

  // Connect to Appwrite Realtime and load document
  async connect(): Promise<void> {
    try {
      this.status = 'connecting';

      // Load initial document state from database
      await this.loadInitialDocument();

      // Connect to Appwrite Realtime
      const appwrite = await getAppwrite();
      this.realtime = appwrite.realtime;

      // Subscribe to document updates
      this.subscription = this.realtime.subscribe(
        [`databases.default.tables.documents.rows.${this.documentId}`],
        (payload: any) => this.handleRealtimeUpdate(payload)
      );

      this.connected = true;
      this.status = 'connected';

      // Broadcast initial presence
      this.broadcastPresence(true);
    } catch (error) {
      console.error('Failed to connect to realtime:', error);
      this.status = 'disconnected';
      throw error;
    }
  }

  disconnect(): void {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
    this.connected = false;
    this.status = 'disconnected';
    this.broadcastPresence(false);
  }

  destroy(): void {
    this.disconnect();
    this.doc.off('update', this.handleLocalUpdate);
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
  }

  getStatus(): 'connecting' | 'connected' | 'disconnected' {
    return this.status;
  }

  // Load initial Yjs state from database
  private async loadInitialDocument(): Promise<void> {
    try {
      const appwrite = await getAppwrite();
      const response = await appwrite.tablesDB.getRow(
        appwriteConfig.databaseId,
        appwriteConfig.documentsTableId,
        this.documentId
      );

      const yjsStateBase64 = response.yjsState;
      if (yjsStateBase64) {
        // Decode base64 to Uint8Array
        const yjsState = Uint8Array.from(atob(yjsStateBase64), c => c.charCodeAt(0));
        Y.applyUpdate(this.doc, yjsState);
      }

      // Load recent Yjs updates from storage
      const updates = await this.loadRecentUpdates();
      for (const update of updates) {
        Y.applyUpdate(this.doc, update);
      }

      this.updateCount = response.lastUpdateCount || 0;
    } catch (error) {
      console.error('Failed to load initial document:', error);
      // Document doesn't exist yet, start with empty state
    }
  }

  // Load recent Yjs updates from storage
  private async loadRecentUpdates(): Promise<Uint8Array[]> {
    try {
      const appwrite = await getAppwrite();
      const response = await appwrite.tablesDB.getRow(
        appwriteConfig.databaseId,
        appwriteConfig.documentsTableId,
        this.documentId
      );

      const updateFileIds = response.yjsUpdates || [];
      const updates: Uint8Array[] = [];

      for (const fileId of updateFileIds) {
        try {
          const file = await appwrite.storage.getFile(
            process.env.NEXT_PUBLIC_YJS_UPDATES_BUCKET_ID!,
            fileId
          );
          const update = await appwrite.storage.getFileView(
            process.env.NEXT_PUBLIC_YJS_UPDATES_BUCKET_ID!,
            fileId
          );
          const buffer = await update.arrayBuffer();
          updates.push(new Uint8Array(buffer));
        } catch (error) {
          console.error('Failed to load update file:', fileId, error);
        }
      }

      return updates;
    } catch (error) {
      console.error('Failed to load recent updates:', error);
      return [];
    }
  }

  // Handle local Yjs document changes
  private handleLocalUpdate = (update: Uint8Array, origin: any): void => {
    if (origin === 'remote') return; // Ignore remote updates

    // Queue update for saving
    this.updateQueue.push(update);

    // Debounce save
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(async () => {
      await this.flushUpdateQueue();
    }, 500); // Save every 500ms
  };

  // Flush queued updates to storage
  private async flushUpdateQueue(): Promise<void> {
    if (this.updateQueue.length === 0) return;

    const updatesToSave = [...this.updateQueue];
    this.updateQueue = [];

    try {
      const appwrite = await getAppwrite();

      // Combine updates
      let combinedUpdate = new Uint8Array(0);
      for (const update of updatesToSave) {
        combinedUpdate = Y.mergeUpdates([combinedUpdate, update]);
      }

      // Save to Storage
      const fileId = ID.unique();
      const file = new File([combinedUpdate], `update-${Date.now()}.bin`, {
        type: 'application/octet-stream',
      });

      await appwrite.storage.createFile(
        process.env.NEXT_PUBLIC_YJS_UPDATES_BUCKET_ID!,
        fileId,
        file
      );

      // Update document with new update file ID
      const doc = await appwrite.tablesDB.getRow(
        appwriteConfig.databaseId,
        appwriteConfig.documentsTableId,
        this.documentId
      );

      const existingUpdates = doc.yjsUpdates || [];
      const updatedUpdates = [...existingUpdates, fileId];

      // Update count for version history
      this.updateCount += updatesToSave.length;

      await appwrite.tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.documentsTableId,
        rowId: this.documentId,
        data: {
          yjsUpdates: updatedUpdates,
          lastUpdateCount: this.updateCount,
        },
      });

      // Save full state to database periodically
      if (this.updateCount % 50 === 0) {
        await this.saveFullState();
      }

      this.lastSaveTime = Date.now();
    } catch (error) {
      console.error('Failed to save updates:', error);
      // Re-queue updates for retry
      this.updateQueue.unshift(...updatesToSave);
    }
  }

  // Save full Yjs state to database
  private async saveFullState(): Promise<void> {
    try {
      const appwrite = await getAppwrite();
      const state = Y.encodeStateAsUpdate(this.doc);

      // Encode to base64 for database storage
      const stateBase64 = btoa(
        String.fromCharCode.apply(null, Array.from(state))
      );

      await appwrite.tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.documentsTableId,
        rowId: this.documentId,
        data: { yjsState: stateBase64 },
      });
    } catch (error) {
      console.error('Failed to save full state:', error);
    }
  }

  // Handle realtime updates from Appwrite
  private handleRealtimeUpdate(payload: any): void {
    const { events, payload: data } = payload;

    // Handle Yjs updates
    if (events.includes('databases.*.tables.*.rows.*.update')) {
      // Remote document update
      if (data.yjsState) {
        const state = Uint8Array.from(atob(data.yjsState), c => c.charCodeAt(0));
        Y.applyUpdate(this.doc, state, 'remote');
      }
    }

    // Handle cursor positions
    if (events.includes('documents.*.cursor')) {
      this.callbacks.onRemoteCursor(data as CursorPosition);
    }

    // Handle presence changes
    if (events.includes('documents.*.presence')) {
      this.callbacks.onPresenceChange(data.userId, data as PresenceData);
    }
  }

  // Broadcast cursor position
  broadcastCursorPosition(position: { index: number; length: number; blockId?: string }): void {
    if (!this.connected) return;

    const cursorData: CursorPosition = {
      userId: this.userId,
      ...position,
      color: this.userColor,
      name: this.userName,
    };

    // This would use Appwrite Realtime's custom message support
    // Implementation depends on Appwrite's exact API
  }

  // Broadcast presence (online/offline)
  broadcastPresence(isActive: boolean): void {
    if (!this.connected) return;

    const presenceData: PresenceData = {
      userId: this.userId,
      userName: this.userName,
      userColor: this.userColor,
      isActive,
      connectedAt: new Date(),
    };

    // This would use Appwrite Realtime's custom message support
  }

  // Create version snapshot (for Phase 2)
  async createSnapshot(description?: string): Promise<string> {
    const state = Y.encodeStateAsUpdate(this.doc);
    const fileId = ID.unique();
    const file = new File([state], `snapshot-${Date.now()}.bin`, {
      type: 'application/octet-stream',
    });

    const appwrite = await getAppwrite();

    // Save to Storage
    await appwrite.storage.createFile(
      process.env.NEXT_PUBLIC_DOCUMENT_SNAPSHOTS_BUCKET_ID!,
      fileId,
      file
    );

    // Create version record
    await appwrite.tablesDB.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: 'document_versions', // Update with actual table ID
      rowId: ID.unique(),
      data: {
        documentId: this.documentId,
        storageFileId: fileId,
        createdAt: new Date().toISOString(),
        createdBy: this.userId,
        updateCount: this.updateCount,
        description,
      },
    });

    return fileId;
  }

  // Implement Provider interface methods
  on(event: string, handler: any): void {
    // Event handling
  }

  off(event: string, handler: any): void {
    // Event handling
  }
}
```

### 2.2 Create Realtime Service

**File: `lib/appwrite/realtime.ts`** (NEW)

```typescript
import { getAppwrite, appwriteConfig } from './config';

export interface CursorData {
  userId: string;
  index: number;
  length: number;
  blockId?: string;
  color: string;
  name: string;
}

export interface PresenceData {
  userId: string;
  userName: string;
  userColor: string;
  isActive: boolean;
  connectedAt: Date;
}

export interface RealtimeCallbacks {
  onCursorUpdate?: (cursor: CursorData) => void;
  onPresenceChange?: (userId: string, presence: PresenceData) => void;
  onUserDisconnect?: (userId: string) => void;
}

export class RealtimeService {
  private static instance: RealtimeService;
  private realtime: any;
  private subscriptions: Map<string, any> = new Map();
  private activeUsers: Map<string, PresenceData> = new Map();

  private constructor() {
    const appwrite = getAppwrite();
    this.realtime = appwrite.realtime;
  }

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  // Subscribe to document events
  subscribeToDocument(
    documentId: string,
    callbacks: RealtimeCallbacks
  ): () => void {
    const channel = `databases.${appwriteConfig.databaseId}.tables.${appwriteConfig.documentsTableId}.rows.${documentId}`;

    const subscription = this.realtime.subscribe([channel], (payload: any) => {
      this.handlePayload(payload, callbacks);
    });

    this.subscriptions.set(documentId, subscription);

    // Return unsubscribe function
    return () => {
      subscription();
      this.subscriptions.delete(documentId);
      this.activeUsers.delete(documentId);
    };
  }

  // Broadcast cursor position
  broadcastCursorPosition(
    documentId: string,
    cursor: CursorData
  ): void {
    // This depends on Appwrite's custom message support
    // Implementation may vary based on API availability
  }

  // Broadcast presence
  broadcastPresence(
    documentId: string,
    presence: PresenceData
  ): void {
    // This depends on Appwrite's custom message support
  }

  private handlePayload(payload: any, callbacks: RealtimeCallbacks): void {
    const { events, payload: data } = payload;

    // Handle cursor updates
    if (events.some(e => e.includes('cursor')) && callbacks.onCursorUpdate) {
      callbacks.onCursorUpdate(data as CursorData);
    }

    // Handle presence changes
    if (events.some(e => e.includes('presence'))) {
      if (data.isActive === false && callbacks.onUserDisconnect) {
        callbacks.onUserDisconnect(data.userId);
        this.activeUsers.delete(data.userId);
      } else if (data.isActive && callbacks.onPresenceChange) {
        this.activeUsers.set(data.userId, data as PresenceData);
        callbacks.onPresenceChange(data.userId, data as PresenceData);
      }
    }
  }

  // Get all active users for a document
  getActiveUsers(documentId: string): PresenceData[] {
    return Array.from(this.activeUsers.values());
  }

  // Cleanup all subscriptions
  destroy(): void {
    this.subscriptions.forEach(subscription => subscription());
    this.subscriptions.clear();
    this.activeUsers.clear();
  }
}

export const realtimeService = RealtimeService.getInstance();
```

---

## Phase 3: Backend Services

**Estimated Time: 5-6 hours**

### 3.1 Collaboration Service

**File: `lib/appwrite/collaboration.ts`** (NEW)

```typescript
import { getAppwrite, appwriteConfig, ID } from './config';
import type { Document } from '../db/types';

export type PermissionLevel = 'viewer' | 'editor' | 'owner';

export interface Collaborator {
  userId: string;
  email: string;
  name: string;
  permission: 'viewer' | 'editor';
  addedAt: string;
  addedBy: string;
}

export interface DocumentAccess {
  hasAccess: boolean;
  permission: 'viewer' | 'editor' | 'owner' | null;
  isPublic: boolean;
}

// Toggle public sharing on/off
export async function togglePublicSharing(
  documentId: string,
  isPublic: boolean
): Promise<void> {
  const appwrite = await getAppwrite();

  await appwrite.tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
    rowId: documentId,
    data: { isPublic },
  });
}

// Check user's access to a document
export async function checkDocumentAccess(
  documentId: string,
  userId?: string
): Promise<DocumentAccess> {
  try {
    const appwrite = await getAppwrite();
    const doc = await appwrite.tablesDB.getRow(
      appwriteConfig.databaseId,
      appwriteConfig.documentsTableId,
      documentId
    );

    // Check if document is public
    if (doc.isPublic) {
      return {
        hasAccess: true,
        permission: 'viewer', // Public = read-only
        isPublic: true,
      };
    }

    // If no user ID provided (not logged in), no access
    if (!userId) {
      return {
        hasAccess: false,
        permission: null,
        isPublic: false,
      };
    }

    // Check if user is owner
    if (doc.ownerId === userId) {
      return {
        hasAccess: true,
        permission: 'owner',
        isPublic: false,
      };
    }

    // Check if user is in sharedWith
    const sharedWith: Collaborator[] = doc.sharedWith || [];
    const collaborator = sharedWith.find(c => c.userId === userId);

    if (collaborator) {
      return {
        hasAccess: true,
        permission: collaborator.permission,
        isPublic: false,
      };
    }

    // No access
    return {
      hasAccess: false,
      permission: null,
      isPublic: false,
    };
  } catch (error) {
    console.error('Failed to check document access:', error);
    return {
      hasAccess: false,
      permission: null,
      isPublic: false,
    };
  }
}

// Add collaborator to document
export async function addCollaborator(
  documentId: string,
  userId: string,
  email: string,
  name: string,
  permission: 'viewer' | 'editor'
): Promise<void> {
  const appwrite = await getAppwrite();
  const { userId: currentUserId } = await getCachedUser();

  const doc = await appwrite.tablesDB.getRow(
    appwriteConfig.databaseId,
    appwriteConfig.documentsTableId,
    documentId
  );

  const sharedWith: Collaborator[] = doc.sharedWith || [];
  const existingCollaborator = sharedWith.find(c => c.userId === userId);

  if (existingCollaborator) {
    throw new Error('User is already a collaborator');
  }

  // Add new collaborator
  sharedWith.push({
    userId,
    email,
    name,
    permission,
    addedAt: new Date().toISOString(),
    addedBy: currentUserId,
  });

  await appwrite.tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
    rowId: documentId,
    data: { sharedWith },
  });
}

// Remove collaborator from document
export async function removeCollaborator(
  documentId: string,
  userId: string
): Promise<void> {
  const appwrite = await getAppwrite();

  const doc = await appwrite.tablesDB.getRow(
    appwriteConfig.databaseId,
    appwriteConfig.documentsTableId,
    documentId
  );

  const sharedWith: Collaborator[] = doc.sharedWith || [];
  const updatedCollaborators = sharedWith.filter(c => c.userId !== userId);

  await appwrite.tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
    rowId: documentId,
    data: { sharedWith: updatedCollaborators },
  });
}

// Update collaborator permission
export async function updateCollaboratorPermission(
  documentId: string,
  userId: string,
  permission: 'viewer' | 'editor'
): Promise<void> {
  const appwrite = await getAppwrite();

  const doc = await appwrite.tablesDB.getRow(
    appwriteConfig.databaseId,
    appwriteConfig.documentsTableId,
    documentId
  );

  const sharedWith: Collaborator[] = doc.sharedWith || [];
  const updatedCollaborators = sharedWith.map(c =>
    c.userId === userId ? { ...c, permission } : c
  );

  await appwrite.tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
    rowId: documentId,
    data: { sharedWith: updatedCollaborators },
  });
}

// Get collaborators for a document
export async function getDocumentCollaborators(
  documentId: string
): Promise<Collaborator[]> {
  try {
    const appwrite = await getAppwrite();
    const doc = await appwrite.tablesDB.getRow(
      appwriteConfig.databaseId,
      appwriteConfig.documentsTableId,
      documentId
    );

    return doc.sharedWith || [];
  } catch (error) {
    console.error('Failed to get collaborators:', error);
    return [];
  }
}

// Get active users for a document
export async function getActiveUsers(documentId: string): Promise<any[]> {
  // This would query Appwrite Realtime for active connections
  // Implementation depends on Appwrite's presence API
  return [];
}

// Get user's permission level on a document
export async function getUserPermission(
  documentId: string,
  userId: string
): Promise<PermissionLevel | null> {
  const doc = await appwrite.tablesDB.getRow(
    appwriteConfig.databaseId,
    appwriteConfig.documentsTableId,
    documentId
  );

  // Owner has admin
  if (doc.ownerId === userId) {
    return 'owner';
  }

  // Check sharedWith
  const sharedWith: Collaborator[] = doc.sharedWith || [];
  const collaborator = sharedWith.find(c => c.userId === userId);

  return collaborator ? collaborator.permission : null;
}

// Leave a shared document (remove self from collaborators)
export async function leaveSharedDocument(documentId: string): Promise<void> {
  const { userId } = await getCachedUser();

  const doc = await appwrite.tablesDB.getRow(
    appwriteConfig.databaseId,
    appwriteConfig.documentsTableId,
    documentId
  );

  if (doc.ownerId === userId) {
    throw new Error('Cannot leave a document you own');
  }

  const sharedWith: Collaborator[] = doc.sharedWith || [];
  const updatedCollaborators = sharedWith.filter(c => c.userId !== userId);

  await appwrite.tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
    rowId: documentId,
    data: { sharedWith: updatedCollaborators },
  });
}
```

### 3.2 Yjs Storage Service

**File: `lib/appwrite/yjs-storage.ts`** (NEW)

```typescript
import { getAppwrite, appwriteConfig, ID } from './config';

// Save full Yjs state to database
export async function saveYjsState(
  documentId: string,
  state: Uint8Array
): Promise<void> {
  const appwrite = await getAppwrite();

  // Encode to base64
  const stateBase64 = btoa(
    String.fromCharCode.apply(null, Array.from(state))
  );

  await appwrite.tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
    rowId: documentId,
    data: { yjsState: stateBase64 },
  });
}

// Load full Yjs state from database
export async function loadYjsState(
  documentId: string
): Promise<Uint8Array | null> {
  try {
    const appwrite = await getAppwrite();
    const response = await appwrite.tablesDB.getRow(
      appwriteConfig.databaseId,
      appwriteConfig.documentsTableId,
      documentId
    );

    const yjsStateBase64 = response.yjsState;
    if (!yjsStateBase64) {
      return null;
    }

    // Decode base64 to Uint8Array
    return Uint8Array.from(atob(yjsStateBase64), c => c.charCodeAt(0));
  } catch (error) {
    console.error('Failed to load Yjs state:', error);
    return null;
  }
}

// Save Yjs update to storage
export async function saveYjsUpdate(
  documentId: string,
  update: Uint8Array
): Promise<string> {
  const appwrite = await getAppwrite();

  const fileId = ID.unique();
  const file = new File([update], `update-${Date.now()}.bin`, {
    type: 'application/octet-stream',
  });

  await appwrite.storage.createFile(
    process.env.NEXT_PUBLIC_YJS_UPDATES_BUCKET_ID!,
    fileId,
    file
  );

  // Update document with new update file ID
  const doc = await appwrite.tablesDB.getRow(
    appwriteConfig.databaseId,
    appwriteConfig.documentsTableId,
    documentId
  );

  const existingUpdates = doc.yjsUpdates || [];
  const updatedUpdates = [...existingUpdates, fileId];

  await appwrite.tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
    rowId: documentId,
    data: { yjsUpdates: updatedUpdates },
  });

  return fileId;
}

// Load Yjs updates from storage
export async function loadYjsUpdates(
  documentId: string,
  afterUpdate?: number
): Promise<Uint8Array[]> {
  try {
    const appwrite = await getAppwrite();
    const response = await appwrite.tablesDB.getRow(
      appwriteConfig.databaseId,
      appwriteConfig.documentsTableId,
      documentId
    );

    const updateFileIds = response.yjsUpdates || [];
    const updates: Uint8Array[] = [];

    for (const fileId of updateFileIds) {
      try {
        const file = await appwrite.storage.getFile(
          process.env.NEXT_PUBLIC_YJS_UPDATES_BUCKET_ID!,
          fileId
        );
        const update = await appwrite.storage.getFileView(
          process.env.NEXT_PUBLIC_YJS_UPDATES_BUCKET_ID!,
          fileId
        );
        const buffer = await update.arrayBuffer();
        updates.push(new Uint8Array(buffer));
      } catch (error) {
        console.error('Failed to load update file:', fileId, error);
      }
    }

    return updates;
  } catch (error) {
    console.error('Failed to load Yjs updates:', error);
    return [];
  }
}

// Cleanup old Yjs updates (keep last N)
export async function cleanupOldUpdates(
  documentId: string,
  keepCount: number = 1000
): Promise<void> {
  try {
    const appwrite = await getAppwrite();
    const response = await appwrite.tablesDB.getRow(
      appwriteConfig.databaseId,
      appwriteConfig.documentsTableId,
      documentId
    );

    const updateFileIds = response.yjsUpdates || [];
    if (updateFileIds.length <= keepCount) {
      return; // No cleanup needed
    }

    // Delete old files
    const filesToDelete = updateFileIds.slice(0, updateFileIds.length - keepCount);
    await Promise.all(
      filesToDelete.map(fileId =>
        appwrite.storage.deleteFile(
          process.env.NEXT_PUBLIC_YJS_UPDATES_BUCKET_ID!,
          fileId
        )
      )
    );

    // Update document
    const updatedUpdates = updateFileIds.slice(-keepCount);
    await appwrite.tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.documentsTableId,
      rowId: documentId,
      data: { yjsUpdates: updatedUpdates },
    });
  } catch (error) {
    console.error('Failed to cleanup old updates:', error);
  }
}
```

---

## Phase 4: Frontend Components

**Estimated Time: 12-14 hours**

### 4.1 Update BlockEditor for Collaboration

**File: `components/editor/BlockEditor.tsx`** (MODIFY)

Add collaboration support:

```typescript
import { AppwriteProvider } from '@/lib/yjs/AppwriteProvider';
import * as Y from 'yjs';

export interface BlockEditorProps {
  // ... existing props
  collaboration?: {
    provider: AppwriteProvider;
    readOnly?: boolean;
    userName: string;
    userColor: string;
  };
}

export const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
  function BlockEditor({ collaboration, ...props }, ref) {
    // ... existing state

    const editor = useCreateBlockNote({
      initialContent: props.initialContent
        ? JSON.parse(props.initialContent)
        : undefined,
      // Add collaboration configuration
      ...(collaboration
        ? {
            collaboration: {
              provider: collaboration.provider,
              fragment: collaboration.provider['yFragment'], // Yjs document fragment
              user: {
                name: collaboration.userName,
                color: collaboration.userColor,
              },
              showCursorLabels: 'activity',
            },
          }
        : {}),
      // ... existing options
    });

    // ... rest of component
  }
);
```

### 4.2 Collaborative Presence Component

**File: `components/collaboration/CollaborativePresence.tsx`** (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { Avatar } from '@/components/auth/UserAvatar';
import type { PresenceData, CursorPosition } from '@/lib/yjs/AppwriteProvider';
import { cn } from '@/lib/utils';

interface CollaborativePresenceProps {
  activeUsers: PresenceData[];
  currentUserColor: string;
  currentUser: { id: string; name: string; avatar?: string };
}

export function CollaborativePresence({
  activeUsers,
  currentUserColor,
  currentUser,
}: CollaborativePresenceProps) {
  const [expanded, setExpanded] = useState(false);

  // Filter out current user
  const otherUsers = activeUsers.filter(u => u.userId !== currentUser.id);

  if (otherUsers.length === 0) {
    return null;
  }

  // Show up to 4 avatars, collapse the rest
  const visibleUsers = otherUsers.slice(0, 4);
  const hiddenCount = Math.max(0, otherUsers.length - 4);

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        {/* Visible user avatars */}
        {visibleUsers.map(user => (
          <div
            key={user.userId}
            className="relative -ml-2 first:ml-0"
            title={user.userName}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium"
              style={{
                backgroundColor: user.userColor,
                color: getContrastColor(user.userColor),
              }}
            >
              {user.userName.charAt(0).toUpperCase()}
            </div>
            {/* Online indicator */}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
          </div>
        ))}

        {/* Hidden count indicator */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="relative -ml-2 w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            +{hiddenCount}
          </button>
        )}

        {/* "Viewing" text */}
        <span className="text-sm text-muted-foreground ml-1">
          {expanded ? 'Active users:' : 'Viewing'}
        </span>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-background border rounded-lg shadow-lg p-2 z-50">
          <div className="text-xs text-muted-foreground mb-2 px-2">
            {otherUsers.length} {otherUsers.length === 1 ? 'person' : 'people'} viewing
          </div>
          {otherUsers.map(user => (
            <div
              key={user.userId}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: user.userColor,
                  color: getContrastColor(user.userColor),
                }}
              >
                {user.userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{user.userName}</div>
                <div className="text-xs text-muted-foreground">
                  {user.isActive ? 'Editing now' : 'Viewing'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to get contrasting text color
function getContrastColor(hexColor: string): string {
  // Simple contrast check (can be improved)
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}
```

### 4.3 Share Dialog Component

**File: `components/collaboration/ShareDialog.tsx`** (NEW)

```typescript
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Globe, Mail, Trash2, UserPlus, Eye, Edit, Link2 } from 'lucide-react';
import { togglePublicSharing, addCollaborator, removeCollaborator } from '@/lib/appwrite/collaboration';
import { toast } from 'sonner';
import { getCachedUser } from '@/lib/appwrite/documents';

interface Collaborator {
  userId: string;
  email: string;
  name: string;
  permission: 'viewer' | 'editor';
  addedAt: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  isPublic: boolean;
  collaborators: Collaborator[];
  onRefresh: () => void;
}

export function ShareDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  isPublic,
  collaborators,
  onRefresh,
}: ShareDialogProps) {
  const [tab, setTab] = useState<'public' | 'collaborators'>('public');
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorPermission, setNewCollaboratorPermission] = useState<
    'viewer' | 'editor'
  >('viewer');
  const [loading, setLoading] = useState(false);

  const { userId } = getCachedUser();

  const shareLink = `${window.location.origin}/doc/${documentId}`;

  const handleTogglePublic = async () => {
    setLoading(true);
    try {
      await togglePublicSharing(documentId, !isPublic);
      toast.success(`Document is now ${!isPublic ? 'public' : 'private'}`);
      onRefresh();
    } catch (error) {
      console.error('Failed to toggle public sharing:', error);
      toast.error('Failed to update sharing settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied to clipboard');
  };

  const handleAddCollaborator = async () => {
    if (!newCollaboratorEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement user lookup by email to get userId and name
      // For now, use email as both userId and name temporarily
      await addCollaborator(
        documentId,
        newCollaboratorEmail, // userId (temporary)
        newCollaboratorEmail, // email
        newCollaboratorEmail.split('@')[0], // name (temporary)
        newCollaboratorPermission
      );
      toast.success('Collaborator added');
      setNewCollaboratorEmail('');
      onRefresh();
    } catch (error: any) {
      console.error('Failed to add collaborator:', error);
      toast.error(error.message || 'Failed to add collaborator');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    setLoading(true);
    try {
      await removeCollaborator(documentId, collaboratorId);
      toast.success('Collaborator removed');
      onRefresh();
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{documentTitle}"</DialogTitle>
          <DialogDescription>
            Manage who can access this document
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('public')}
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              tab === 'public'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Public link
          </button>
          <button
            onClick={() => setTab('collaborators')}
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              tab === 'collaborators'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Collaborators ({collaborators.length})
          </button>
        </div>

        {/* Public Link Tab */}
        {tab === 'public' && (
          <div className="space-y-4 py-4">
            {/* Public Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Public sharing</div>
                  <div className="text-xs text-muted-foreground">
                    {isPublic
                      ? 'Anyone with link can view'
                      : 'Only collaborators can access'}
                  </div>
                </div>
              </div>
              <Button
                variant={isPublic ? 'destructive' : 'default'}
                onClick={handleTogglePublic}
                disabled={loading}
              >
                {isPublic ? 'Make private' : 'Make public'}
              </Button>
            </div>

            {/* Link Display - Always shown with document ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Document link
              </label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? 'Anyone with this link can view the document'
                  : 'Only collaborators can access via this link'}
              </p>
            </div>
          </div>
        )}

        {/* Collaborators Tab */}
        {tab === 'collaborators' && (
          <div className="space-y-4 py-4">
            {/* Add Collaborator */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add collaborator</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newCollaboratorEmail}
                  onChange={e => setNewCollaboratorEmail(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={newCollaboratorPermission}
                  onChange={e => setNewCollaboratorPermission(e.target.value as 'viewer' | 'editor')}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="viewer">Can view</option>
                  <option value="editor">Can edit</option>
                </select>
                <Button onClick={handleAddCollaborator} disabled={loading}>
                  <Mail className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </div>
            </div>

            {/* Collaborators List */}
            {collaborators.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">People with access</label>
                <div className="space-y-2">
                  {/* Owner */}
                  <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {userId.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">You</div>
                        <div className="text-xs text-muted-foreground">Owner</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Owner</Badge>
                  </div>

                  {/* Collaborators */}
                  {collaborators.map(collaborator => (
                    <div key={collaborator.userId} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {collaborator.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{collaborator.name}</div>
                          <div className="text-xs text-muted-foreground">{collaborator.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={collaborator.permission === 'editor' ? 'default' : 'secondary'}>
                          {collaborator.permission === 'editor' ? (
                            <><Edit className="h-3 w-3 mr-1 inline" /> Editor</>
                          ) : (
                            <><Eye className="h-3 w-3 mr-1 inline" /> Viewer</>
                          )}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeCollaborator(collaborator.userId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
                  className="px-3 border rounded-md bg-background"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <Button onClick={handleAddCollaborator} disabled={loading}>
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Collaborator List */}
            <div className="space-y-2">
              {collaborators.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No collaborators yet. Add someone above.
                </div>
              ) : (
                collaborators.map(collaborator => (
                  <div
                    key={collaborator.userId || collaborator.email}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {collaborator.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {collaborator.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {collaborator.email}
                      </div>
                    </div>

                    {/* Permission */}
                    <Badge variant={collaborator.permission === 'owner' ? 'default' : 'secondary'}>
                      {collaborator.permission}
                    </Badge>

                    {/* Actions (not for owner) */}
                    {collaborator.permission !== 'owner' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          // Implement remove collaborator
                          toast.info('Remove collaborator feature coming soon');
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 4.4 Share Button Component

**File: `components/collaboration/ShareButton.tsx`** (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share } from 'lucide-react';
import { ShareDialog } from './ShareDialog';
import type { Collaborator } from '@/lib/db/types';

interface ShareButtonProps {
  documentId: string;
  documentTitle: string;
  isPublic: boolean;
  collaborators?: Collaborator[];
  onRefresh: () => void;
}

export function ShareButton({
  documentId,
  documentTitle,
  isPublic,
  collaborators = [],
  onRefresh,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share className="h-4 w-4 mr-2" />
        Share
        {collaborators.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs">
            {collaborators.length}
          </span>
        )}
      </Button>

      <ShareDialog
        open={open}
        onOpenChange={setOpen}
        documentId={documentId}
        documentTitle={documentTitle}
        isPublic={isPublic}
        collaborators={collaborators}
        onRefresh={onRefresh}
      />
    </>
  );
}
```

---

## Phase 5: Document Page Integration

**Estimated Time: 4-5 hours**

### 5.1 Update Document Page

**File: `app/dashboard/documents/[id]/page.tsx`** (MODIFY)

Add collaboration integration:

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { AppwriteProvider } from '@/lib/yjs/AppwriteProvider';
import { realtimeService } from '@/lib/appwrite/realtime';
import { ShareButton } from '@/components/collaboration/ShareButton';
import { CollaborativePresence } from '@/components/collaboration/CollaborativePresence';
import { useAuthContext } from '@/contexts/AuthContext';
import { checkDocumentAccess } from '@/lib/appwrite/collaboration';

export default function DocumentPage() {
  const { user } = useAuthContext();
  const params = useParams();
  const documentId = params.id as string;

  // ... existing state

  // Collaboration state
  const [provider, setProvider] = useState<AppwriteProvider | null>(null);
  const [activeUsers, setActiveUsers] = useState<PresenceData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [userColor] = useState(() => generateUserColor(user?.id || ''));
  const [userPermission, setUserPermission] = useState<'viewer' | 'editor' | 'owner' | null>(null);
  const [accessCheck, setAccessCheck] = useState<{hasAccess: boolean; isPublic: boolean} | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(true);

  // Check document access on mount
  useEffect(() => {
    async function checkAccess() {
      try {
        const access = await checkDocumentAccess(documentId, user?.id);
        setAccessCheck(access);
        setLoadingAccess(false);
      } catch (error) {
        console.error('Failed to check document access:', error);
        setLoadingAccess(false);
      }
    }

    if (documentId) {
      checkAccess();
    }
  }, [documentId, user]);

  // Show loading state
  if (loadingAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // Show access denied
  if (!accessCheck?.hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            {accessCheck?.isPublic
              ? 'This document is private. Please login or request access from the owner.'
              : 'You don\'t have permission to view this document.'}
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Initialize Yjs provider (only if user has access)
  useEffect(() => {
    if (!user || !document || userPermission === 'viewer' && !accessCheck?.isPublic) return;

    const doc = new Y.Doc();
    const newProvider = new AppwriteProvider(
      doc,
      documentId,
      user.id,
      user.name,
      userColor,
      {
        onRemoteCursor: (cursor) => {
          // Handle remote cursor updates
          console.log('Remote cursor:', cursor);
        },
        onPresenceChange: (userId, presence) => {
          setActiveUsers(prev => {
            const existing = prev.findIndex(u => u.userId === userId);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = presence;
              return updated;
            }
            return [...prev, presence];
          });
        },
        onUserDisconnected: (userId) => {
          setActiveUsers(prev => prev.filter(u => u.userId !== userId));
        },
      }
    );

    newProvider.connect().then(() => {
      setConnectionStatus('connected');
    }).catch(error => {
      console.error('Failed to connect provider:', error);
      setConnectionStatus('disconnected');
    });

    setProvider(newProvider);

    return () => {
      newProvider.destroy();
      setProvider(null);
    };
  }, [user, document, documentId, userPermission, accessCheck]);

  // Load user permission
  useEffect(() => {
    if (!user || !documentId) return;

    import('@/lib/appwrite/collaboration').then(({ getUserPermission }) => {
      getUserPermission(documentId, user.id).then(permission => {
        setUserPermission(permission);
      });
    });
  }, [user, documentId]);

  // Generate consistent user color
  function generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B739', '#52B788'
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  }

  // ... rest of component

  return (
    <div className={`h-full flex flex-col bg-background`}>
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="px-8 py-4 space-y-3">
          {/* ... existing title bar */}

          {/* Add collaboration toolbar */}
          <div className="flex items-center justify-between">
            {/* Left side: Title and actions */}
            <div className="flex items-center gap-4">
              {/* ... existing buttons */}
            </div>

            {/* Right side: Collaboration features */}
            <div className="flex items-center gap-3">
              {/* Connection status */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
                </span>
              </div>

              {/* Active users */}
              <CollaborativePresence
                activeUsers={activeUsers}
                currentUserColor={userColor}
                currentUser={{
                  id: user.id,
                  name: user.name,
                  avatar: user.avatar,
                }}
              />

              {/* Share button */}
              <ShareButton
                documentId={documentId}
                documentTitle={document.title}
                isPublic={document.isPublic || false}
                collaborators={document.sharedWith || []}
                onRefresh={() => mutate()}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ... editor section */}

      <BlockEditor
        ref={editorRef}
        documentId={documentId}
        initialContent={document.content}
        onSave={handleContentSave}
        collaboration={provider ? {
          provider,
          readOnly: userPermission === 'viewer',
          userName: user.name,
          userColor,
        } : undefined}
      />
    </div>
  );
}
```

### 5.2 Document Access Control

**Note:** With the new Notion-style sharing approach, there's no need for a separate `/share/[token]` route. All document access (both private and public) is handled through the unified `/doc/{documentId}` route with proper access control logic.

**The document page (`app/dashboard/documents/[id]/page.tsx`) already includes:**
- Access check on page load (`checkDocumentAccess()`)
- Loading state while checking permissions
- Access denied UI for unauthorized users
- Public read-only view with "Login to edit" prompt
- Different editor states based on permission level (owner/editor/viewer)
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Banner */}
      <div className="bg-primary/10 border-b border-primary/20 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary">
            You're viewing a shared document
            {permission === 'viewer' ? ' (read-only)' : ''}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-2" />
          Copy link
        </Button>
      </div>

      {/* Document */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-8">{document.title}</h1>
          <BlockEditor
            initialContent={document.content}
            onSave={() => {}} // No-op for public access
            collaboration={{
              provider: null, // Will initialize separately
              readOnly: permission === 'viewer',
              userName: 'Guest',
              userColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 6: "Shared with Me" Feature

**Estimated Time: 15-20 hours**

### 6.1 Update Documents Service

**File: `lib/appwrite/documents.ts`** (ADD)

Add these functions:

```typescript
// Get documents shared with current user
export async function getSharedDocuments(
  workspaceId?: string
): Promise<DocumentMetadata[]> {
  try {
    const appwrite = await getAppwrite();
    const { userId } = await getCachedUser();

    // Fetch all documents
    const allDocs = await getAllDocumentsMetadata(workspaceId, { includeDeleted: true });

    // Filter for shared documents
    const sharedDocs = allDocs.filter(
      doc =>
        !doc.isDeleted &&
        doc.ownerId !== userId &&
        doc.sharedWith.some(c => c.userId === userId)
    );

    // Sort by date shared (newest first)
    sharedDocs.sort((a, b) => {
      const aSharedDate = a.sharedWith.find(c => c.userId === userId)?.addedAt || a.createdAt;
      const bSharedDate = b.sharedWith.find(c => c.userId === userId)?.addedAt || b.createdAt;
      return bSharedDate.getTime() - aSharedDate.getTime();
    });

    return sharedDocs;
  } catch (error) {
    console.error('Failed to get shared documents:', error);
    return [];
  }
}

// Get documents owned by current user
export async function getOwnedDocuments(
  workspaceId?: string
): Promise<DocumentMetadata[]> {
  try {
    const { userId } = await getCachedUser();
    const allDocs = await getAllDocumentsMetadata(workspaceId, { includeDeleted: true });

    return allDocs.filter(doc => !doc.isDeleted && doc.ownerId === userId);
  } catch (error) {
    console.error('Failed to get owned documents:', error);
    return [];
  }
}

// Update when user last accessed a shared document
export async function updateLastAccessed(
  documentId: string,
  userId: string
): Promise<void> {
  try {
    const appwrite = await getAppwrite();
    const doc = await getDocument(documentId);

    if (!doc) return;

    // Find and update collaborator's lastAccessAt
    const updatedSharedWith = doc.sharedWith.map(c =>
      c.userId === userId ? { ...c, lastAccessedAt: new Date() } : c
    );

    await appwrite.tablesDB.updateRow({
      databaseId: getDatabaseId(),
      tableId: getDocumentsTableId(),
      rowId: documentId,
      data: { sharedWith: updatedSharedWith },
    });
  } catch (error) {
    console.error('Failed to update last accessed:', error);
  }
}
```

### 6.2 Update Sidebar Navigation

**File: `components/layout/SidebarNav.tsx`** (MODIFY)

Add tab toggle:

```typescript
interface SidebarNavProps {
  mode: 'owned' | 'shared'; // NEW
  onModeChange: (mode: 'owned' | 'shared') => void; // NEW
  // ... existing props
}

export function SidebarNav({ mode, onModeChange, ...props }: SidebarNavProps) {
  return (
    <div className="px-4 py-2">
      {/* Tab toggle */}
      <div className="flex bg-muted/50 rounded-lg p-1">
        <button
          onClick={() => onModeChange('owned')}
          className={cn(
            'flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors',
            mode === 'owned'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          My Documents
        </button>
        <button
          onClick={() => onModeChange('shared')}
          className={cn(
            'flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors',
            mode === 'shared'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Shared with me
        </button>
      </div>
    </div>
  );
}
```

### 6.3 Update Document List

**File: `components/layout/SidebarDocumentList.tsx`** (MODIFY)

Update to support owned/shared modes:

```typescript
interface SidebarDocumentListProps {
  mode: 'owned' | 'shared'; // NEW
  workspaceId?: string;
  // ... existing props
}

export function SidebarDocumentList({ mode, workspaceId, ...props }: SidebarDocumentListProps) {
  // Use appropriate hook based on mode
  const useDocumentsHook = mode === 'shared' ? useSharedDocuments : useDocumentsMetadata;
  const { data: documents, isLoading } = useDocumentsHook({
    workspaceId,
    includeDeleted: false,
  });

  // Update last accessed for shared documents
  useEffect(() => {
    if (mode === 'shared' && documents) {
      documents.forEach(doc => {
        updateLastAccessed(doc.id, getCachedUser().userId).catch(console.error);
      });
    }
  }, [mode, documents]);

  // ... render documents
}
```

### 6.4 Create Shared Documents Page

**File: `app/dashboard/shared/page.tsx`** (NEW)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { FileText, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSharedDocuments } from '@/hooks/swr/useSharedDocuments';
import type { DocumentMetadata } from '@/lib/db/types';
import { leaveSharedDocument } from '@/lib/appwrite/collaboration';
import { ConfirmDialog } from '@/components/AlertDialog';
import { toast } from 'sonner';

export default function SharedDocumentsPage() {
  const { data: documents, isLoading } = useSharedDocuments();
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);

  const handleLeaveDocument = (doc: DocumentMetadata) => {
    setConfirmConfig({
      title: 'Leave document?',
      description: `You will lose access to "${doc.title}" and need to be re-invited to access it again.`,
      action: async () => {
        try {
          await leaveSharedDocument(doc.id);
          toast.success('Left document');
          window.dispatchEvent(new CustomEvent('documentsChanged'));
        } catch (error: any) {
          toast.error(error.message || 'Failed to leave document');
        }
      },
    });
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Shared with me</h1>
          <p className="text-muted-foreground mt-2">
            {documents?.length || 0} document(s) shared with you
          </p>
        </div>

        {/* Document Grid */}
        {!documents || documents.length === 0 ? (
          <div className="text-center py-24">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No shared documents</h3>
            <p className="text-sm text-muted-foreground">
              Documents others share with you will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => {
              const ownerName = 'Document Owner'; // Owner name would come from user lookup

              return (
                <div
                  key={doc.id}
                  className="p-6 rounded-2xl bg-card border hover:border-primary/50 transition-all group"
                >
                  {/* Owner info */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {ownerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-muted-foreground">{ownerName}</span>
                  </div>

                  {/* Document title */}
                  <h3 className="text-lg font-medium mb-2 line-clamp-2">
                    {doc.title || 'Untitled'}
                  </h3>

                  {/* Metadata */}
                  <div className="text-xs text-muted-foreground mb-4">
                    Shared on{' '}
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="flex-1">
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLeaveDocument(doc)}
                      className="text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={!!confirmConfig}
          onOpenChange={(open) => {
            if (!open) setConfirmConfig(null);
          }}
          title={confirmConfig?.title ?? ''}
          description={confirmConfig?.description ?? ''}
          confirmText="Leave"
          variant="destructive"
          onConfirm={async () => {
            if (confirmConfig) await confirmConfig.action();
            setConfirmConfig(null);
          }}
        />
      </div>
    </div>
  );
}
```

### 6.5 Create SWR Hook

**File: `hooks/swr/useSharedDocuments.ts`** (NEW)

```typescript
import useSWR from 'swr';
import { getSharedDocuments } from '@/lib/appwrite/documents';

export function useSharedDocuments(workspaceId?: string) {
  return useSWR(
    `/shared/${workspaceId}`,
    () => getSharedDocuments(workspaceId),
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // Refresh every 30s
    }
  );
}
```

### 6.6 Update Dashboard Layout

**File: `app/dashboard/layout.tsx`** (MODIFY)

Add navigation for shared documents:

```typescript
// In the sidebar navigation
{[
  { href: '/dashboard', label: 'All Documents', icon: FileText },
  { href: '/dashboard/shared', label: 'Shared with me', icon: Users },
  { href: '/dashboard/recent', label: 'Recent', icon: Clock },
  { href: '/dashboard/favorites', label: 'Favorites', icon: Star },
  { href: '/dashboard/trash', label: 'Trash', icon: Trash2 },
]}
```

---

## Phase 7: Database Types

**Estimated Time: 1-2 hours**

**File: `lib/db/types.ts`** (MODIFY)

```typescript
// Update Document interface
export interface Document {
  id: string;
  title: string;
  content: string;
  workspaceId: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  lastChangedAt?: Date;
  isDeleted: boolean;
  isFavorite?: boolean;
  parentId?: string;
  font?: DocumentFont;
  isPublic: boolean;
  ownerId?: string;
  sharedWith: Collaborator[]; // NEW: Changed from `collaborators`
  permissions: Permission[];

  // NEW: Collaboration fields
  yjsState?: string;
  yjsUpdates?: string[];
  lastUpdateCount?: number;
}

// Collaborator interface (stored in `sharedWith` array)
export interface Collaborator {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
  permission: 'viewer' | 'editor';
  addedAt: Date;
  addedBy: string;
  lastAccessedAt?: Date; // NEW
}

// NEW: Version interface (for Phase 2)
export interface Version {
  id: string;
  documentId: string;
  storageFileId: string;
  createdAt: Date;
  createdBy: string;
  createdByUserName: string;
  updateCount: number;
  description?: string;
}

// NEW: Share token interface
export interface ShareToken {
  token: string;
  documentId: string;
  permission: 'viewer' | 'editor';
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
}

// NEW: Collaborative session interface
export interface CollaborativeSession {
  documentId: string;
  userId: string;
  userName: string;
  userColor: string;
  connectedAt: Date;
  lastActivity: Date;
}

// NEW: Cursor position interface
export interface CursorPosition {
  userId: string;
  index: number;
  length: number;
  blockId?: string;
  color: string;
  name: string;
}

// NEW: Presence data interface
export interface PresenceData {
  userId: string;
  userName: string;
  userColor: string;
  isActive: boolean;
  connectedAt: Date;
}
```

---

## Phase 8: Cleanup & Optimization

**Estimated Time: 4-5 hours**

### 8.1 Automatic Cleanup Functions

**File: `lib/appwrite/cleanup.ts`** (NEW)

```typescript
import { cleanupOldUpdates } from './yjs-storage';

// Cleanup old Yjs updates for all documents
export async function cleanupAllDocuments(): Promise<void> {
  try {
    const appwrite = await getAppwrite();
    const { listRows } = await import('./documents');

    // Get all documents
    const response = await listRows(appwriteConfig.documentsTableId);

    // Cleanup updates for each document
    for (const doc of response.rows) {
      try {
        await cleanupOldUpdates(doc.$id, 1000); // Keep last 1000
      } catch (error) {
        console.error(`Failed to cleanup updates for ${doc.$id}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup all documents:', error);
  }
}

// Cleanup old version snapshots (Phase 2)
export async function cleanupOldVersions(documentId: string): Promise<void> {
  // Implementation for Phase 2
}
```

### 8.2 Performance Optimizations

**Debounce Settings:**
- Yjs update saves: 500ms
- Cursor broadcasts: 200ms
- Presence updates: 1s

**Lazy Loading:**
- Version history only when dialog opens
- Shared documents list only when tab is active

**Batch Operations:**
- Batch cursor position updates
- Batch presence notifications

### 8.3 Storage Quota Management

Monitor storage usage and alert when approaching limits:

```typescript
export async function checkStorageQuota(): Promise<{
  used: number;
  limit: number;
  percentage: number;
}> {
  const appwrite = await getAppwrite();
  const buckets = [
    process.env.NEXT_PUBLIC_YJS_UPDATES_BUCKET_ID,
    process.env.NEXT_PUBLIC_DOCUMENT_SNAPSHOTS_BUCKET_ID,
  ];

  let totalUsed = 0;
  for (const bucketId of buckets) {
    const response = await appwrite.storage.listFiles(bucketId);
    totalUsed += response.total;
  }

  // Appwrite free tier: 5GB
  const limit = 5 * 1024 * 1024 * 1024;

  return {
    used: totalUsed,
    limit,
    percentage: (totalUsed / limit) * 100,
  };
}
```

---

## Phase 9: Testing

**Estimated Time: 6-8 hours**

### 9.1 Unit Tests

**File: `lib/appwrite/__tests__/collaboration.test.ts`** (NEW)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateShareToken, validateShareToken, addCollaborator } from '../collaboration';

describe('Collaboration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate valid share token', async () => {
    // Test implementation
  });

  it('should validate share token', async () => {
    // Test implementation
  });

  it('should add collaborator', async () => {
    // Test implementation
  });
});
```

### 9.2 Integration Tests

Test real-time collaboration between multiple users:

1. **Simultaneous Editing:**
   - User A and User B open same document
   - Both edit different paragraphs simultaneously
   - Verify both changes are synced
   - Verify no conflicts

2. **Cursor Sync:**
   - User A moves cursor
   - Verify User B sees cursor movement
   - Verify cursor color and name display

3. **Presence:**
   - User A joins document
   - Verify User B sees "User A is viewing"
   - User A leaves
   - Verify User B sees User A removed from active users

4. **Permission Enforcement:**
   - Viewer tries to edit → Should fail
   - Editor edits → Should succeed
   - Owner performs all actions → Should succeed

5. **Public Sharing:**
   - Owner generates public link
   - Anonymous user accesses via link
   - Verify document loads
   - Verify permission level enforced

### 9.3 Manual Testing Checklist

- [ ] Real-time editing works between multiple users
- [ ] Cursor positions sync correctly
- [ ] Presence indicators show active users
- [ ] Public share links work
- [ ] Permission levels enforced (Viewer/Editor/Owner)
- [ ] "Shared with me" shows correct documents
- [ ] "Leave document" removes user from collaborators
- [ ] Network disconnect handled gracefully
- [ ] Reconnect after disconnect works
- [ ] Yjs updates save to storage
- [ ] Full state saves to database
- [ ] Cleanup of old updates works

---

## Summary of Changes from Original Plan

### Key Simplifications (Notion-style Sharing)

**Before:**
- Separate `sharedLink` token (UUID)
- Public link URL: `/share/{token}`
- Document URL: `/doc/{documentId}`
- `sharedLinkExpiresAt` for expiration
- `sharedLinkPermission` for viewer/editor on public link

**After (Current Plan):**
- Single `isPublic` boolean toggle
- Single URL for everyone: `/doc/{documentId}`
- Public sharing = read-only (no permission selector)
- No expiration (revoke by toggling off)
- Simpler architecture, cleaner UX

### Database Schema Changes

**Removed columns:**
- ❌ `sharedLink` (UUID token)
- ❌ `sharedLinkExpiresAt` (expiration)
- ❌ `sharedLinkPermission` (public permission)

**Added columns:**
- ✅ `isPublic` (Boolean, default: false) - Toggle for public sharing
- ✅ `sharedWith` (String Array) - Collaborators with permissions

### Access Flow

**Document URL:** `/doc/{documentId}`

**Access check logic:**
1. **Logged in:**
   - Owner? → Full access
   - In `sharedWith` array? → Check permission (viewer/editor)
   - Neither but `isPublic = true`? → Read-only
   - No match → Access denied

2. **Not logged in:**
   - `isPublic = true`? → Read-only + "Login to edit" prompt
   - `isPublic = false`? → Show "Document is private" message

### Permissions Summary

| Role | Access Level | Can |
|------|--------------|------|
| **Owner** | Full | Edit, add/remove collaborators, toggle public, delete |
| **Editor** | Edit | Edit, view document, leave document |
| **Viewer** | Read-only | View document, leave document |
| **Public** | Read-only | View document, see "Login to edit" prompt |

---

## Phase 10: Version History (Phase 2)

**Estimated Time: 8-10 hours**

### 10.1 Version History Service

**File: `lib/appwrite/version-history.ts`** (NEW)

```typescript
import { getAppwrite, appwriteConfig, ID } from './config';
import type { Version } from '../db/types';

// Create snapshot
export async function createSnapshot(
  documentId: string,
  description?: string
): Promise<Version> {
  const appwrite = await getAppwrite();
  const { userId } = await getCachedUser();

  // Get current document to get update count
  const doc = await appwrite.tablesDB.getRow(
    appwriteConfig.databaseId,
    appwriteConfig.documentsTableId,
    documentId
  );

  // This would be called from AppwriteProvider
  // The actual Yjs state would be passed in
  throw new Error('Not implemented yet');
}

// Get all versions for a document
export async function getDocumentVersions(
  documentId: string
): Promise<Version[]> {
  try {
    const appwrite = await getAppwrite();

    const response = await appwrite.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'document_versions',
      queries: [
        appwrite.Query.equal('documentId', [documentId]),
        appwrite.Query.orderDesc('createdAt'),
      ],
    });

    return response.rows.map((row: any) => ({
      id: row.$id,
      documentId: row.documentId,
      storageFileId: row.storageFileId,
      createdAt: new Date(row.createdAt),
      createdBy: row.createdBy,
      createdByUserName: '', // Fetch from users table
      updateCount: row.updateCount,
      description: row.description,
    }));
  } catch (error) {
    console.error('Failed to get document versions:', error);
    return [];
  }
}

// Load snapshot version
export async function loadSnapshotVersion(
  documentId: string,
  versionId: string
): Promise<Uint8Array | null> {
  try {
    const appwrite = await getAppwrite();

    // Get version record
    const version = await appwrite.tablesDB.getRow(
      appwriteConfig.databaseId,
      'document_versions',
      versionId
    );

    // Load snapshot from storage
    const file = await appwrite.storage.getFileView(
      process.env.NEXT_PUBLIC_DOCUMENT_SNAPSHOTS_BUCKET_ID!,
      version.storageFileId
    );
    const buffer = await file.arrayBuffer();

    return new Uint8Array(buffer);
  } catch (error) {
    console.error('Failed to load snapshot version:', error);
    return null;
  }
}

// Restore to version
export async function restoreToVersion(
  documentId: string,
  versionId: string
): Promise<void> {
  try {
    const snapshot = await loadSnapshotVersion(documentId, versionId);
    if (!snapshot) {
      throw new Error('Failed to load snapshot');
    }

    // Update document with restored state
    const appwrite = await getAppwrite();
    const stateBase64 = btoa(
      String.fromCharCode.apply(null, Array.from(snapshot))
    );

    await appwrite.tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.documentsTableId,
      rowId: documentId,
      data: { yjsState: stateBase64 },
    });
  } catch (error) {
    console.error('Failed to restore to version:', error);
    throw error;
  }
}

// Delete version
export async function deleteVersion(
  documentId: string,
  versionId: string
): Promise<void> {
  try {
    const appwrite = await getAppwrite();

    // Get version to delete file
    const version = await appwrite.tablesDB.getRow(
      appwriteConfig.databaseId,
      'document_versions',
      versionId
    );

    // Delete storage file
    await appwrite.storage.deleteFile(
      process.env.NEXT_PUBLIC_DOCUMENT_SNAPSHOTS_BUCKET_ID!,
      version.storageFileId
    );

    // Delete version record
    await appwrite.tablesDB.deleteRow({
      databaseId: appwriteConfig.databaseId,
      tableId: 'document_versions',
      rowId: versionId,
    });
  } catch (error) {
    console.error('Failed to delete version:', error);
    throw error;
  }
}

// Cleanup old versions (keep last N)
export async function cleanupOldVersions(
  documentId: string,
  keepCount: number = 50
): Promise<void> {
  try {
    const appwrite = await getAppwrite();

    const response = await appwrite.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'document_versions',
      queries: [
        appwrite.Query.equal('documentId', [documentId]),
        appwrite.Query.orderDesc('createdAt'),
      ],
    });

    const versions = response.rows;
    if (versions.length <= keepCount) {
      return; // No cleanup needed
    }

    // Delete old versions
    const versionsToDelete = versions.slice(keepCount);
    await Promise.all(
      versionsToDelete.map(v => deleteVersion(documentId, v.$id))
    );
  } catch (error) {
    console.error('Failed to cleanup old versions:', error);
  }
}
```

### 10.2 Version History UI Component

**File: `components/collaboration/VersionHistory.tsx`** (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, Eye, RotateCcw, Trash2, Calendar } from 'lucide-react';
import { getDocumentVersions, restoreToVersion, deleteVersion } from '@/lib/appwrite/version-history';
import type { Version } from '@/lib/db/types';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ConfirmDialog } from '@/components/AlertDialog';

interface VersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
}

export function VersionHistory({ open, onOpenChange, documentId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Version | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<Version | null>(null);

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, documentId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await getDocumentVersions(documentId);
      setVersions(data);
    } catch (error) {
      console.error('Failed to load versions:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (version: Version) => {
    setPreviewVersion(version);
  };

  const handleRestore = async (version: Version) => {
    try {
      await restoreToVersion(documentId, version.id);
      toast.success(`Restored to version from ${formatDistanceToNow(new Date(version.createdAt))}`);
      setConfirmRestore(null);
      onOpenChange(false);
      // Reload document
      window.dispatchEvent(new CustomEvent('documentsChanged'));
    } catch (error) {
      console.error('Failed to restore version:', error);
      toast.error('Failed to restore version');
    }
  };

  const handleDelete = async (version: Version) => {
    try {
      await deleteVersion(documentId, version.id);
      toast.success('Version deleted');
      setConfirmDelete(null);
      loadVersions();
    } catch (error) {
      console.error('Failed to delete version:', error);
      toast.error('Failed to delete version');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of this document
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                Loading versions...
              </div>
            ) : versions.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No versions yet
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-all"
                  >
                    {/* Version number */}
                    <div className="w-12 text-center text-sm text-muted-foreground">
                      v{versions.length - index}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="font-medium">
                        {version.description || `Version ${versions.length - index}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {version.createdByUserName} • {formatDistanceToNow(new Date(version.createdAt))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handlePreview(version)}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmRestore(version)}
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmDelete(version)}
                        title="Delete"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      {/* Implementation for preview mode */}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title="Delete version?"
        description="This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (confirmDelete) await handleDelete(confirmDelete);
        }}
      />

      {/* Restore confirm dialog */}
      <ConfirmDialog
        open={!!confirmRestore}
        onOpenChange={(open) => {
          if (!open) setConfirmRestore(null);
        }}
        title="Restore to this version?"
        description="Current changes will be lost. This action cannot be undone."
        confirmText="Restore"
        variant="default"
        onConfirm={async () => {
          if (confirmRestore) await handleRestore(confirmRestore);
        }}
      />
    </>
  );
}
```

---

## Summary & Timeline

### MVP Implementation (Phases 1-7)

| Phase | Description | Hours | Priority |
|-------|-------------|--------|----------|
| 1 | Database & Storage Setup | 2-3h | High |
| 2 | Yjs Provider + Realtime | 8-10h | High |
| 3 | Backend Services | 5-6h | High |
| 4 | Frontend Components | 12-14h | High |
| 5 | Document Page Integration | 4-5h | High |
| 6 | "Shared with Me" Feature | 15-20h | High |
| 7 | Database Types | 1-2h | High |
| 8 | Cleanup & Optimization | 4-5h | Medium |
| 9 | Testing | 6-8h | Medium |

**MVP Total: 57-73 hours (7-9 days)**

### Phase 2 Implementation

| Phase | Description | Hours | Priority |
|-------|-------------|--------|----------|
| 10 | Version History | 8-10h | Low |

**Phase 2 Total: 8-10 hours (1-2 days)**

### Grand Total: 65-83 hours (8-11 days)

---

## Critical Path

**Week 1: Core Infrastructure**
- Day 1-2: Phase 1 (Database setup)
- Day 3-4: Phase 2 (Yjs provider)
- Day 5: Phase 3 (Backend services)

**Week 2: Frontend & Integration**
- Day 1-3: Phase 4 (Frontend components)
- Day 4: Phase 5 (Document integration)
- Day 5: Phase 7 (Types)

**Week 3: Shared Docs & Polish**
- Day 1-3: Phase 6 ("Shared with me")
- Day 4: Phase 8 (Cleanup & optimization)
- Day 5: Phase 9 (Testing)

**Week 4 (Optional): Version History**
- Day 1-2: Phase 10 (Version history)

---

## Next Steps

1. **Setup Appwrite Console** (2-3 hours)
   - Update documents table schema
   - Create document_versions table
   - Create storage buckets

2. **Install Dependencies**
   ```bash
   npm install yjs @blocknote/yjs
   ```

3. **Start Implementation**
   - Begin with Phase 2 (Yjs Provider)
   - Build out to Phase 4 (Frontend)
   - Integrate in Phase 5
   - Add "Shared with me" in Phase 6

4. **Testing**
   - Manual testing during development
   - Integration testing after each phase
   - End-to-end testing before launch

---

## Known Limitations

1. **No Offline Support**
   - Users cannot edit when disconnected
   - Network interruption requires page refresh
   - Workaround: Temporary localStorage buffer

2. **Scalability**
   - Real-time updates may slow with 10+ active users
   - Yjs performance degrades with very large documents
   - Solution: Implement document splitting or pagination

3. **Storage Costs**
   - Yjs updates accumulate over time
   - Automatic cleanup mitigates but doesn't eliminate
   - Monitor storage quota regularly

4. **Real-time Limitations**
   - Cursor position broadcasting every 200ms
   - May feel slightly delayed on slow connections
   - Presence updates may be delayed

---

## Future Enhancements (Beyond Phase 2)

1. **Offline Support**
   - IndexedDB caching
   - Queue updates when offline
   - Sync on reconnection

2. **Document Comments**
   - Inline comments
   - Threaded discussions
   - @mentions and notifications

3. **Comparison View**
   - Visual diff between versions
   - Side-by-side comparison
   - Merge specific changes

4. **Advanced Permissions**
   - Role-based access (admin, contributor, etc.)
   - Time-limited access
   - Password-protected public links

5. **Real-time Notifications**
   - "User X is editing"
   - "User Y joined the document"
   - "Document was shared with you"

6. **Collaboration Analytics**
   - Document activity timeline
   - User contribution metrics
   - Most active documents

---

## Phase 11: Connection & Reconnection Logic (Critical)

**Estimated Time: 6-8 hours**

### 11.1 Reconnection Strategy

Implement exponential backoff reconnection with update queue buffering:

**File: `lib/yjs/ReconnectionManager.ts`** (NEW)

```typescript
export class ReconnectionManager {
  private maxRetries: number = 10;
  private baseDelay: number = 1000; // 1 second
  private maxDelay: number = 30000; // 30 seconds
  private retryCount: number = 0;
  private isReconnecting: boolean = false;

  async reconnectWithBackoff(connectFn: () => Promise<void>): Promise<void> {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.retryCount),
      this.maxDelay
    );

    console.log(`Reconnection attempt ${this.retryCount + 1} in ${delay}ms`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await connectFn();
      this.retryCount = 0;
      this.isReconnecting = false;
    } catch (error) {
      this.retryCount++;
      if (this.retryCount < this.maxRetries) {
        return this.reconnectWithBackoff(connectFn);
      }
      this.isReconnecting = false;
      throw error;
    }
  }

  reset(): void {
    this.retryCount = 0;
    this.isReconnecting = false;
  }
}
```

### 11.2 Update Queue Buffering

Buffer updates while disconnected:

**File: `lib/yjs/UpdateQueue.ts`** (NEW)

```typescript
export class UpdateQueue {
  private queue: Array<{
    update: Uint8Array;
    timestamp: number;
  }> = [];
  private maxQueueSize: number = 100;
  private maxQueueAge: number = 5 * 60 * 1000; // 5 minutes

  push(update: Uint8Array): void {
    // Remove old updates
    const now = Date.now();
    this.queue = this.queue.filter(
      item => now - item.timestamp < this.maxQueueAge
    );

    // Limit queue size
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift(); // Remove oldest
    }

    this.queue.push({ update, timestamp: now });
  }

  getAll(): Uint8Array[] {
    return this.queue.map(item => item.update);
  }

  clear(): void {
    this.queue = [];
  }

  get size(): number {
    return this.queue.length;
  }
}
```

### 11.3 Connection Health Checks

Monitor connection health:

**File: `lib/yjs/ConnectionMonitor.ts`** (NEW)

```typescript
export class ConnectionMonitor {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = Date.now();
  private timeoutThreshold: number = 30000; // 30 seconds

  start(sendHeartbeat: () => void): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      if (now - this.lastHeartbeat > this.timeoutThreshold) {
        console.warn('Connection timeout detected');
        // Trigger reconnection
      }
      sendHeartbeat();
      this.lastHeartbeat = now;
    }, 10000); // Every 10 seconds
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  recordHeartbeat(): void {
    this.lastHeartbeat = Date.now();
  }
}
```

### 11.4 Integrate with AppwriteProvider

Update `lib/yjs/AppwriteProvider.ts` to include reconnection:

```typescript
export class AppwriteProvider implements Provider {
  // ... existing properties
  private reconnectionManager: ReconnectionManager;
  private updateQueue: UpdateQueue;
  private connectionMonitor: ConnectionMonitor;

  constructor(...) {
    // ... existing setup
    this.reconnectionManager = new ReconnectionManager();
    this.updateQueue = new UpdateQueue();
    this.connectionMonitor = new ConnectionMonitor();
  }

  async connect(): Promise<void> {
    try {
      await this.establishConnection();
      this.connectionMonitor.start(() => this.sendHeartbeat());
    } catch (error) {
      console.error('Connection failed, starting reconnection:', error);
      await this.reconnectionManager.reconnectWithBackoff(() => this.connect());
    }
  }

  private async handleLocalUpdate(update: Uint8Array): void {
    if (origin === 'remote') return;

    if (this.status === 'disconnected') {
      this.updateQueue.push(update);
      return;
    }

    // ... existing save logic
  }

  private async flushUpdateQueue(): Promise<void> {
    // Buffer updates on failure
    const updatesToSave = [...this.updateQueue.getAll(), ...this.updateQueue];

    try {
      // ... existing save logic
      this.updateQueue.clear();
    } catch (error) {
      console.error('Failed to save updates, keeping in queue:', error);
      // Updates remain in queue for retry
    }
  }

  sendHeartbeat(): void {
    if (!this.connected) return;
    // Send heartbeat message to maintain connection
    this.connectionMonitor.recordHeartbeat();
  }
}
```

---

## Phase 12: User Lookup Service (Important)

**Estimated Time: 3-4 hours**

### 12.1 User Lookup Implementation

**File: `lib/appwrite/users.ts`** (NEW)

```typescript
import { getAppwrite, appwriteConfig, Query } from './config';

export interface User {
  $id: string;
  email: string;
  name: string;
  avatar?: string;
}

// Find user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const appwrite = await getAppwrite();

    const response = await appwrite.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'users', // Assuming a users table exists
      queries: [Query.equal('email', [email])],
    });

    if (response.rows.length === 0) {
      return null;
    }

    return response.rows[0] as User;
  } catch (error) {
    console.error('Failed to find user by email:', error);
    return null;
  }
}

// Get multiple users by IDs
export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  if (userIds.length === 0) return [];

  try {
    const appwrite = await getAppwrite();

    const response = await appwrite.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'users',
      queries: [Query.equal('$id', userIds)],
    });

    return response.rows as User[];
  } catch (error) {
    console.error('Failed to get users by IDs:', error);
    return [];
  }
}

// Get user profile (from Appwrite Auth)
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const appwrite = await getAppwrite();

    // Use Appwrite Account API for user profile
    const response = await appwrite.account.get();
    if (response.$id === userId) {
      return {
        $id: response.$id,
        email: response.email,
        name: response.name || response.email.split('@')[0],
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}
```

### 12.2 Update Collaboration Service

Update `lib/appwrite/collaboration.ts` to use user lookup:

```typescript
import { getUserByEmail } from './users';

export async function addCollaborator(
  documentId: string,
  email: string,
  permission: PermissionLevel
): Promise<void> {
  const appwrite = await getAppwrite();
  const { userId: currentUserId } = await getCachedUser();

  // Find user by email
  const targetUser = await getUserByEmail(email);
  if (!targetUser) {
    // User not found, add with email only (will be resolved on access)
    console.log('User not found, adding collaborator with email only');
  }

  const doc = await appwrite.tablesDB.getRow(
    appwriteConfig.databaseId,
    appwriteConfig.documentsTableId,
    documentId
  );

  const sharedWith: Collaborator[] = doc.sharedWith || [];
  const existingCollaborator = sharedWith.find(c => c.email === email);

  if (existingCollaborator) {
    throw new Error('User is already a collaborator');
  }

  sharedWith.push({
    userId: targetUser?.$id || '', // Empty if not found
    email,
    name: targetUser?.name || email.split('@')[0],
    avatar: targetUser?.avatar,
    permission,
    addedAt: new Date(),
    addedBy: currentUserId,
  });

  await appwrite.tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
    rowId: documentId,
    data: { sharedWith },
  });
}
```

### 12.3 Resolve User IDs on Document Access

When a user accesses a shared document, resolve their user ID:

```typescript
// In document page load effect
useEffect(() => {
  async function resolveUserId() {
    if (!user || !document) return;

    // Check if current user is in sharedWith with empty userId
    const sharedWith = document.sharedWith || [];
    const myCollaborator = sharedWith.find(c => c.email === user.email && !c.userId);

    if (myCollaborator) {
      // Update collaborator with actual user ID
      const updatedSharedWith = sharedWith.map(c =>
        c.email === user.email && !c.userId
          ? { ...c, userId: user.id, name: user.name, avatar: user.avatar }
          : c
      );

      await appwrite.tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.documentsTableId,
        rowId: document.id,
        data: { sharedWith: updatedSharedWith },
      });
    }
  }

  resolveUserId();
}, [user, document]);
```

---

## Phase 13: Permission Enforcement (Important)

**Estimated Time: 4-5 hours**

### 13.1 Permission Matrix

Define what each permission level can do:

```typescript
// File: lib/collaboration/permissions.ts (NEW)

export const PERMISSION_MATRIX = {
  owner: [
    'edit',
    'delete',
    'share',
    'manage_collaborators',
    'restore_versions',
    'rename',
    'move',
    'duplicate',
    'favorite',
    'leave',
  ],
  editor: [
    'edit',
    'duplicate',
    'favorite',
    'leave',
  ],
  viewer: [
    'duplicate',
    'favorite',
    'leave',
  ],
} as const;

export type Permission = typeof PERMISSION_MATRIX[keyof typeof PERMISSION_MATRIX][number];
```

### 13.2 Permission Helper Functions

```typescript
// File: lib/collaboration/permissions.ts (continued)

export function hasPermission(
  userPermission: PermissionLevel,
  action: Permission
): boolean {
  return PERMISSION_MATRIX[userPermission]?.includes(action) ?? false;
}

export function canUserEditDocument(userPermission: PermissionLevel | null): boolean {
  if (!userPermission) return false;
  return hasPermission(userPermission, 'edit');
}

export function canUserManageDocument(userPermission: PermissionLevel | null): boolean {
  if (!userPermission) return false;
  return userPermission === 'owner';
}

export function canUserShareDocument(userPermission: PermissionLevel | null): boolean {
  if (!userPermission) return false;
  return hasPermission(userPermission, 'share');
}

export function canUserDeleteDocument(userPermission: PermissionLevel | null): boolean {
  if (!userPermission) return false;
  return hasPermission(userPermission, 'delete');
}

export function canUserLeaveDocument(userPermission: PermissionLevel | null): boolean {
  if (!userPermission) return false;
  return userPermission !== 'owner'; // Owners cannot leave their own documents
}
```

### 13.3 Permission-Based UI Restrictions

**File: `components/collaboration/PermissionGuard.tsx`** (NEW)

```typescript
'use client';

import { ReactNode } from 'react';
import { hasPermission, type Permission } from '@/lib/collaboration/permissions';

interface PermissionGuardProps {
  userPermission: PermissionLevel | null;
  requiredPermission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({
  userPermission,
  requiredPermission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  if (!userPermission || !hasPermission(userPermission, requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### 13.4 Update Document Page with Permission Checks

Update document actions based on permissions:

```typescript
// In document page
const canEdit = canUserEditDocument(userPermission);
const canShare = canUserShareDocument(userPermission);
const canDelete = canUserDeleteDocument(userPermission);
const canLeave = canUserLeaveDocument(userPermission);

return (
  <div>
    {/* Title input - read only for viewers */}
    <input
      value={title}
      onChange={e => setTitle(e.target.value)}
      disabled={!canEdit}
    />

    {/* Action buttons */}
    <div className="flex gap-2">
      <PermissionGuard
        userPermission={userPermission}
        requiredPermission="share"
        fallback={null}
      >
        <ShareButton />
      </PermissionGuard>

      <PermissionGuard
        userPermission={userPermission}
        requiredPermission="delete"
        fallback={null}
      >
        <DeleteButton />
      </PermissionGuard>

      <PermissionGuard
        userPermission={userPermission}
        requiredPermission="leave"
        fallback={null}
      >
        <LeaveButton />
      </PermissionGuard>
    </div>

    {/* Editor - read only for viewers */}
    <BlockEditor
      collaboration={provider ? {
        provider,
        readOnly: !canEdit,
        userName: user.name,
        userColor,
      } : undefined}
    />
  </div>
);
```

---

## Phase 14: Error Handling (Important)

**Estimated Time: 4-5 hours**

### 14.1 Error Types and Codes

**File: `lib/collaboration/errors.ts`** (NEW)

```typescript
export enum CollaborationErrorCode {
  // Network errors
  NETWORK_DISCONNECTED = 'NETWORK_DISCONNECTED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  CONNECTION_FAILED = 'CONNECTION_FAILED',

  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',

  // Document errors
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_LOCKED = 'DOCUMENT_LOCKED',
  INVALID_SHARE_TOKEN = 'INVALID_SHARE_TOKEN',
  SHARE_TOKEN_EXPIRED = 'SHARE_TOKEN_EXPIRED',

  // Storage errors
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_DOWNLOAD_FAILED = 'FILE_DOWNLOAD_FAILED',

  // Collaboration errors
  CONCURRENT_EDIT_CONFLICT = 'CONCURRENT_EDIT_CONFLICT',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  COLLABORATOR_ALREADY_EXISTS = 'COLLABORATOR_ALREADY_EXISTS',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class CollaborationError extends Error {
  constructor(
    public code: CollaborationErrorCode,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'CollaborationError';
  }
}
```

### 14.2 Error Messages

**File: `lib/collaboration/error-messages.ts`** (NEW)

```typescript
import { CollaborationErrorCode } from './errors';

export const ERROR_MESSAGES: Record<CollaborationErrorCode, string> = {
  [CollaborationErrorCode.NETWORK_DISCONNECTED]:
    'Network connection lost. Please check your internet connection.',
  [CollaborationErrorCode.NETWORK_TIMEOUT]:
    'Request timed out. Please try again.',
  [CollaborationErrorCode.CONNECTION_FAILED]:
    'Failed to connect to the server. Please try again later.',
  [CollaborationErrorCode.PERMISSION_DENIED]:
    'You do not have permission to perform this action.',
  [CollaborationErrorCode.INSUFFICIENT_PERMISSIONS]:
    'You need higher permissions to perform this action.',
  [CollaborationErrorCode.NOT_AUTHENTICATED]:
    'Please log in to continue.',
  [CollaborationErrorCode.DOCUMENT_NOT_FOUND]:
    'Document not found or has been deleted.',
  [CollaborationErrorCode.DOCUMENT_LOCKED]:
    'This document is currently locked. Please try again later.',
  [CollaborationErrorCode.INVALID_SHARE_TOKEN]:
    'Invalid share link. Please contact the document owner.',
  [CollaborationErrorCode.SHARE_TOKEN_EXPIRED]:
    'This share link has expired. Please request a new one.',
  [CollaborationErrorCode.STORAGE_QUOTA_EXCEEDED]:
    'Storage quota exceeded. Please contact support.',
  [CollaborationErrorCode.FILE_UPLOAD_FAILED]:
    'Failed to upload file. Please try again.',
  [CollaborationErrorCode.FILE_DOWNLOAD_FAILED]:
    'Failed to download file. Please try again.',
  [CollaborationErrorCode.CONCURRENT_EDIT_CONFLICT]:
    'Conflict occurred. Your changes were not saved. Please refresh.',
  [CollaborationErrorCode.USER_NOT_FOUND]:
    'User not found. Please check the email address.',
  [CollaborationErrorCode.COLLABORATOR_ALREADY_EXISTS]:
    'This user is already a collaborator.',
  [CollaborationErrorCode.UNKNOWN_ERROR]:
    'An unexpected error occurred. Please try again.',
};

export function getErrorMessage(code: CollaborationErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[CollaborationErrorCode.UNKNOWN_ERROR];
}
```

### 14.3 Error Boundary Component

**File: `components/collaboration/ErrorBoundary.tsx`** (NEW)

```typescript
'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CollaborationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Collaboration error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-6">
              {this.state.error?.message || 'An error occurred while collaborating.'}
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 14.4 Retry Logic for Transient Failures

**File: `lib/collaboration/retry.ts`** (NEW)

```typescript
import { CollaborationError, CollaborationErrorCode } from './errors';

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    retryableErrors?: CollaborationErrorCode[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    retryableErrors = [
      CollaborationErrorCode.NETWORK_TIMEOUT,
      CollaborationErrorCode.NETWORK_DISCONNECTED,
    ],
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable =
        error instanceof CollaborationError &&
        retryableErrors.includes(error.code);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

---

## Phase 15: Version History Integration (Important)

**Estimated Time: 3-4 hours**

### 15.1 Manual Version Creation Button

Add "Create version" button to document toolbar:

**File: `components/collaboration/CreateVersionButton.tsx`** (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { providerRef } from '@/lib/yjs/AppwriteProvider';

interface CreateVersionButtonProps {
  documentId: string;
  onVersionCreated?: () => void;
}

export function CreateVersionButton({
  documentId,
  onVersionCreated,
}: CreateVersionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [description, setDescription] = useState('');

  const handleCreateVersion = async () => {
    if (!providerRef.current) {
      toast.error('Not connected to document');
      return;
    }

    setLoading(true);
    try {
      await providerRef.current.createSnapshot(description || undefined);
      toast.success('Version created');
      setDescription('');
      setShowInput(false);
      onVersionCreated?.();
    } catch (error) {
      console.error('Failed to create version:', error);
      toast.error('Failed to create version');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {showInput ? (
        <>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Version description (optional)"
            className="px-3 py-1.5 text-sm border rounded-md"
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateVersion();
              if (e.key === 'Escape') setShowInput(false);
            }}
            autoFocus
          />
          <Button size="sm" onClick={handleCreateVersion} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowInput(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowInput(true)}>
          <Save className="h-4 w-4 mr-2" />
          Create version
        </Button>
      )}
    </div>
  );
}
```

### 15.2 Auto-Snapshot Trigger Integration

Integrate auto-snapshot into AppwriteProvider:

```typescript
// In AppwriteProvider
private async flushUpdateQueue(): Promise<void> {
  // ... existing save logic

  // Auto-snapshot every 100 updates
  const snapshotInterval = parseInt(
    process.env.YJS_SNAPSHOT_INTERVAL || '100',
    10
  );

  if (this.updateCount % snapshotInterval === 0 && this.updateCount > 0) {
    try {
      const fileId = await this.createSnapshot(
        `Auto-snapshot at ${this.updateCount} updates`
      );
      console.log('Auto-snapshot created:', fileId);
    } catch (error) {
      console.error('Failed to create auto-snapshot:', error);
    }
  }
}
```

### 15.3 Version History Menu Item

Add version history button to document menu:

```typescript
// In document page toolbar
import { VersionHistory } from '@/components/collaboration/VersionHistory';

const [showVersionHistory, setShowVersionHistory] = useState(false);

// In toolbar
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowVersionHistory(true)}
>
  <History className="h-4 w-4 mr-2" />
  Version history
</Button>

<VersionHistory
  open={showVersionHistory}
  onOpenChange={setShowVersionHistory}
  documentId={documentId}
/>
```

### 15.4 Version Restoration Feedback

Show feedback during and after version restoration:

```typescript
// In VersionHistory component
const [isRestoring, setIsRestoring] = useState(false);
const [restoreProgress, setRestoreProgress] = useState(0);

const handleRestore = async (version: Version) => {
  setIsRestoring(true);
  setRestoreProgress(0);

  try {
    // Simulate progress
    const progressInterval = setInterval(() => {
      setRestoreProgress(prev => Math.min(prev + 20, 90));
    }, 200);

    await restoreToVersion(documentId, version.id);

    clearInterval(progressInterval);
    setRestoreProgress(100);

    toast.success(
      <div>
        <div className="font-medium">Version restored</div>
        <div className="text-sm text-muted-foreground">
          Restored to {formatDistanceToNow(new Date(version.createdAt))}
        </div>
      </div>
    );

    setTimeout(() => {
      setConfirmRestore(null);
      setIsRestoring(false);
      setRestoreProgress(0);
      onOpenChange(false);
      window.dispatchEvent(new CustomEvent('documentsChanged'));
    }, 1000);
  } catch (error) {
    setIsRestoring(false);
    setRestoreProgress(0);
    console.error('Failed to restore version:', error);
    toast.error('Failed to restore version');
  }
};

// In restore confirm dialog
{isRestoring && (
  <div className="mt-4">
    <div className="text-sm mb-2">Restoring...</div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${restoreProgress}%` }}
      />
    </div>
  </div>
)}
```

---

## Phase 16: Performance Specifications (Moderate)

**Estimated Time: 2-3 hours**

### 16.1 Debounce Justification

| Operation | Debounce Time | Justification |
|-----------|---------------|---------------|
| Yjs update saves | 500ms | Balance between responsiveness and server load. Reduces API calls while maintaining near-real-time sync. |
| Cursor broadcasts | 200ms | Smooth cursor movement without overwhelming the network. Updates 5 times/second. |
| Presence updates | 1s | Presence is lower priority. Reduces noise when user frequently connects/disconnects. |
| Auto-save interval | 30s | Fallback save interval for users who stop editing mid-document. |

### 16.2 Performance Benchmarks

**Target Metrics:**
- Document load time: < 2 seconds for documents < 100KB
- Real-time sync latency: < 500ms p99
- Cursor position update: < 100ms p95
- User presence update: < 1s p95
- Save to storage: < 2s p95
- Version creation: < 5s p95

**Monitoring Implementation:**

**File: `lib/monitoring/performance.ts`** (NEW)

```typescript
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private maxSamples: number = 100;

  recordMetric(name: string, value: number): void {
    const samples = this.metrics.get(name) || [];
    samples.push(value);

    if (samples.length > this.maxSamples) {
      samples.shift();
    }

    this.metrics.set(name, samples);
  }

  getMetric(name: string, percentile: number = 95): number | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return null;

    const sorted = [...samples].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  getAverageMetric(name: string): number | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return null;

    const sum = samples.reduce((acc, val) => acc + val, 0);
    return sum / samples.length;
  }
}

export const perfMonitor = new PerformanceMonitor();
```

### 16.3 Large Document Handling Strategy

**Documents > 100KB:**

1. **Lazy Loading:**
   - Load initial state from database (fast)
   - Load updates in batches (100 at a time)
   - Show loading indicator during sync

2. **Update Batching:**
   - Batch updates before sending to storage
   - Combine multiple small updates into larger chunks
   - Reduce network overhead

3. **Memory Management:**
   - Limit Yjs undo history to 50 steps
   - Cleanup unused Yjs fragments
   - Monitor memory usage and warn user

**Implementation:**

```typescript
// In AppwriteProvider
private async loadRecentUpdates(): Promise<Uint8Array[]> {
  const allUpdates: Uint8Array[] = [];
  let offset = 0;
  const batchSize = 100;

  while (offset < totalUpdateCount) {
    const batch = await this.loadUpdateBatch(offset, batchSize);
    allUpdates.push(...batch);
    offset += batchSize;

    // Yield to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return allUpdates;
}

private async loadUpdateBatch(offset: number, limit: number): Promise<Uint8Array[]> {
  // Load updates in batches from storage
  // Implementation depends on storage API
}
```

---

## Phase 17: Testing Coverage (Moderate)

**Estimated Time: 8-10 hours**

### 17.1 Specific Test Scenarios

**Unit Tests:**

```typescript
// File: lib/yjs/__tests__/AppwriteProvider.test.ts

describe('AppwriteProvider', () => {
  describe('Connection Management', () => {
    it('should connect to realtime service', async () => {
      const provider = new AppwriteProvider(/* ... */);
      await provider.connect();
      expect(provider.getStatus()).toBe('connected');
    });

    it('should disconnect gracefully', async () => {
      const provider = new AppwriteProvider(/* ... */);
      await provider.connect();
      provider.disconnect();
      expect(provider.getStatus()).toBe('disconnected');
    });

    it('should reconnect on disconnect', async () => {
      const provider = new AppwriteProvider(/* ... */);
      await provider.connect();

      // Simulate disconnect
      simulateNetworkDisconnect();

      // Should auto-reconnect
      await waitFor(() => provider.getStatus() === 'connected');
    });
  });

  describe('Update Queue', () => {
    it('should buffer updates when disconnected', () => {
      const provider = new AppwriteProvider(/* ... */);
      provider.disconnect();

      const update = new Uint8Array([1, 2, 3]);
      provider['handleLocalUpdate'](update, 'local');

      expect(provider['updateQueue'].size).toBeGreaterThan(0);
    });

    it('should flush buffered updates on reconnect', async () => {
      const provider = new AppwriteProvider(/* ... */);
      provider.disconnect();

      const update = new Uint8Array([1, 2, 3]);
      provider['handleLocalUpdate'](update, 'local');

      await provider.connect();

      // Queue should be empty after reconnect and flush
      expect(provider['updateQueue'].size).toBe(0);
    });
  });

  describe('Cursor Broadcasting', () => {
    it('should broadcast cursor position', () => {
      const provider = new AppwriteProvider(/* ... */);
      const onRemoteCursor = vi.fn();

      provider['callbacks'].onRemoteCursor = onRemoteCursor;

      provider.broadcastCursorPosition({ index: 10, length: 5 });

      expect(onRemoteCursor).toHaveBeenCalledWith(
        expect.objectContaining({ index: 10, length: 5 })
      );
    });
  });
});
```

**Integration Tests:**

```typescript
// File: e2e/collaboration.spec.ts

describe('Collaboration E2E', () => {
  it('should sync edits between multiple users', async () => {
    // User A creates document
    const { page: pageA } = await setupBrowser('userA');
    await pageA.goto('/dashboard/documents/new');

    // User B opens same document
    const { page: pageB } = await setupBrowser('userB');
    await pageB.goto(pageA.url());

    // User A types
    await pageA.keyboard.type('Hello from User A');

    // User B should see the text
    await expect(pageB.locator('text=Hello from User A')).toBeVisible();
  });

  it('should show cursor positions', async () => {
    // Setup both users
    const { page: pageA } = await setupBrowser('userA');
    const { page: pageB } = await setupBrowser('userB');

    await pageA.goto('/documents/test-doc');
    await pageB.goto('/documents/test-doc');

    // User A moves cursor
    await pageA.keyboard.press('ArrowRight');

    // User B should see cursor indicator
    const cursor = pageB.locator('[data-cursor-user="userA"]');
    await expect(cursor).toBeVisible();
  });

  it('should enforce viewer permissions', async () => {
    const { page: viewerPage } = await setupBrowser('viewer');

    await viewerPage.goto('/documents/test-doc');

    // Editor should be disabled
    const editor = viewerPage.locator('[contenteditable]');
    expect(await editor.isEditable()).toBe(false);
  });
});
```

### 17.2 Test Data Setup

**File: tests/fixtures/collaboration-fixtures.ts**

```typescript
export const createTestDocument = async (overrides = {}) => {
  return {
    id: 'test-doc-id',
    title: 'Test Document',
    content: JSON.stringify([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test content' }],
      },
    ]),
    yjsState: null,
    yjsUpdates: [],
    sharedWith: [], // Changed from `collaborators`
    isPublic: false, // NEW
    lastUpdateCount: 0,
    ...overrides,
  };
};

export const createTestCollaborator = (overrides = {}) => {
  return {
    userId: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    permission: 'viewer' as const,
    addedAt: new Date(),
    addedBy: 'owner-id',
    ...overrides,
  };
};

export const mockRealtimeCallbacks = () => ({
  onRemoteCursor: vi.fn(),
  onPresenceChange: vi.fn(),
  onUserDisconnected: vi.fn(),
});
```

### 17.3 Mock Services for Testing

**File: tests/mocks/appwrite-mock.ts**

```typescript
import { vi } from 'vitest';

export const mockAppwriteClient = {
  realtime: {
    subscribe: vi.fn(() => vi.fn()),
    unsubscribe: vi.fn(),
  },
  tablesDB: {
    getRow: vi.fn(),
    createRow: vi.fn(),
    updateRow: vi.fn(),
    deleteRow: vi.fn(),
    listRows: vi.fn(),
  },
  storage: {
    createFile: vi.fn(),
    getFile: vi.fn(),
    getFileView: vi.fn(),
    deleteFile: vi.fn(),
    listFiles: vi.fn(),
  },
};

export const setupAppwriteMock = () => {
  vi.mock('@/lib/appwrite/config', () => ({
    getAppwrite: () => mockAppwriteClient,
    appwriteConfig: {
      databaseId: 'test-db',
      documentsTableId: 'test-docs-table',
    },
  }));
};
```

### 17.4 CI/CD Integration

**File: .github/workflows/test.yml**

```yaml
name: Test Collaboration Features

on:
  push:
    paths:
      - 'lib/yjs/**'
      - 'lib/appwrite/collaboration.ts'
      - 'components/collaboration/**'
  pull_request:
    paths:
      - 'lib/yjs/**'
      - 'lib/appwrite/collaboration.ts'
      - 'components/collaboration/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      appwrite:
        image: appwrite/appwrite:latest
        ports:
          - 80:80
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:e2e
```

---

## Phase 18: Migration & Data Seeding (Important)

**Estimated Time: 4-5 hours**

### 18.1 Migration Script

**File: scripts/migrate-collaboration.ts**

```typescript
import { getAppwrite, appwriteConfig } from '../lib/appwrite/config';

async function migrateExistingDocuments() {
  const appwrite = await getAppwrite();
  console.log('Starting migration...');

  // Get all existing documents
  const response = await appwrite.tablesDB.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
  });

  console.log(`Found ${response.rows.length} documents to migrate`);

  for (const doc of response.rows) {
    try {
      // Skip already migrated documents
      if (doc.yjsState) {
        console.log(`Skipping ${doc.$id} - already migrated`);
        continue;
      }

      console.log(`Migrating ${doc.$id} (${doc.title})`);

      // Initialize empty Yjs state
      const Y = (await import('yjs')).Y;
      const newDoc = new Y.Doc();

      // Get document content
      let content;
      try {
        content = JSON.parse(doc.content);
      } catch (e) {
        content = [];
      }

      // Convert content to Yjs format
      const yText = newDoc.getText('content');
      // Convert and apply content to yText...

      // Encode state
      const state = Y.encodeStateAsUpdate(newDoc);
      const stateBase64 = btoa(
        String.fromCharCode.apply(null, Array.from(state))
      );

      // Update document
      await appwrite.tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.documentsTableId,
        rowId: doc.$id,
        data: {
          yjsState: stateBase64,
          yjsUpdates: [],
          collaborators: [],
          sharedLink: null,
          sharedLinkExpiresAt: null,
          sharedLinkPermission: null,
          lastUpdateCount: 0,
        },
      });

      console.log(`✓ Migrated ${doc.$id}`);
    } catch (error) {
      console.error(`✗ Failed to migrate ${doc.$id}:`, error);
    }
  }

  console.log('Migration complete!');
}

async function validateMigration() {
  const appwrite = await getAppwrite();
  const response = await appwrite.tablesDB.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
  });

  const migrated = response.rows.filter(doc => doc.yjsState);
  const failed = response.rows.filter(doc => !doc.yjsState);

  console.log(`\nMigration Summary:`);
  console.log(`  Migrated: ${migrated.length}`);
  console.log(`  Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log(`\nFailed documents:`);
    failed.forEach(doc => {
      console.log(`  - ${doc.$id} (${doc.title})`);
    });
  }

  if (migrated.length > 0) {
    console.log(`\nValidating migrated documents...`);
    for (const doc of migrated) {
      try {
        const state = Uint8Array.from(atob(doc.yjsState), c => c.charCodeAt(0));
        console.log(`  ✓ ${doc.$id} - valid state`);
      } catch (error) {
        console.log(`  ✗ ${doc.$id} - invalid state`);
      }
    }
  }
}

async function rollbackMigration() {
  const appwrite = await getAppwrite();
  console.log('Starting rollback...');

  const response = await appwrite.tablesDB.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
  });

  for (const doc of response.rows) {
    try {
        await appwrite.tablesDB.updateRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.documentsTableId,
          rowId: doc.$id,
          data: {
            yjsState: encodedState,
            yjsUpdates: doc.yjsUpdates,
            sharedWith: doc.collaborators || [], // Migrate to new schema
            isPublic: false, // NEW: Set default
            lastUpdateCount: 0,
          },
        });

      console.log(`✓ Rolled back ${doc.$id}`);
    } catch (error) {
      console.error(`✗ Failed to rollback ${doc.$id}:`, error);
    }
  }

  console.log('Rollback complete!');
}

// Run migration
const command = process.argv[2];
switch (command) {
  case 'migrate':
    migrateExistingDocuments().then(validateMigration);
    break;
  case 'validate':
    validateMigration();
    break;
  case 'rollback':
    rollbackMigration();
    break;
  default:
    console.log('Usage: npm run migrate:collaboration [migrate|validate|rollback]');
}
```

### 18.2 Zero-Downtime Migration Strategy

1. **Blue-Green Deployment:**
   - Deploy new version with migration code
   - Old version continues serving
   - New version handles migrations lazily on document access
   - Switch traffic after validation

2. **Lazy Migration:**
   ```typescript
   // In document load
   async function loadDocument(documentId: string) {
     const doc = await getDocument(documentId);

     // Migrate on first access if not already migrated
     if (!doc.yjsState) {
       console.log('Migrating document:', documentId);
       await migrateDocument(documentId);
     }

     return doc;
   }
   ```

3. **Migration Health Check:**
   ```typescript
   // API endpoint to check migration status
   export async function GET() {
     const total = await getTotalDocuments();
     const migrated = await getMigratedDocuments();

     return Response.json({
       total,
       migrated,
       failed: total - migrated,
       percentage: (migrated / total) * 100,
     });
   }
   ```

### 18.3 User Communication

**Migration Announcement Email Template:**

```
Subject: 📝 New: Real-time Collaboration is Here!

Hi [User Name],

Exciting news! We've just rolled out real-time collaborative editing for your documents.

✨ What's New:
- Edit documents together with teammates in real-time
- See cursor positions and presence of other users
- Share documents via public links
- Version history to track and restore changes

📋 What This Means:
- Your existing documents will be automatically upgraded
- No action required on your part
- All your data remains intact and secure

🚀 Get Started:
Simply open any document and click "Share" to start collaborating!

If you have any questions, reply to this email or check our help center.

Best,
The Team
```

---

## Phase 19: Real-time API Research (Critical)

**Estimated Time: 6-8 hours**

### 19.1 Appwrite Realtime API Capabilities

**Current Understanding:**

✅ **Supported:**
- Channel subscriptions
- Event-based updates (databases.*.tables.*.rows.*)
- Auto-reconnection

❌ **Potential Limitations:**
- Custom message support (unclear)
- Presence API (unclear)
- Broadcast-to-all pattern (unclear)

**Research Tasks:**

1. **Document Appwrite Realtime API:**
   - Read official docs: https://appwrite.io/docs/references/cloud/client-web/realtime
   - Test custom message broadcasting
   - Test presence pattern implementation

2. **Create Proof of Concept:**

   **File: scripts/realtime-poc.ts**

   ```typescript
   import { Client } from 'appwrite';

   const client = new Client()
     .setEndpoint('https://cloud.appwrite.io/v1')
     .setProject('YOUR_PROJECT_ID');

   const realtime = client.realtime;

   // Test 1: Basic subscription
   const sub1 = realtime.subscribe(['databases.*.tables.*.rows.*'], (payload) => {
     console.log('Subscription 1 received:', payload);
   });

   // Test 2: Custom messages (if supported)
   try {
     realtime.send({
       channel: 'custom-channel',
       message: { type: 'cursor', data: { userId: 'test', index: 10 } }
     });
     console.log('✓ Custom messages supported');
   } catch (error) {
     console.log('✗ Custom messages not supported:', error.message);
   }

   // Test 3: Presence pattern
   const presenceChannel = 'documents.test-presence';
   const sub2 = realtime.subscribe([presenceChannel], (payload) => {
     console.log('Presence update:', payload);
   });

   // Simulate joining
   realtime.send({
     channel: presenceChannel,
     message: { type: 'presence', action: 'join', userId: 'test' }
   });

   // Cleanup after 10 seconds
   setTimeout(() => {
     sub1();
     sub2();
   }, 10000);
   ```

### 19.2 Fallback Strategies

**If custom messages are NOT supported:**

**Strategy 1: Database-based messaging**

```typescript
// Create messages table
export async function broadcastMessage(
  documentId: string,
  type: 'cursor' | 'presence',
  data: any
) {
  const appwrite = await getAppwrite();

  await appwrite.tablesDB.createRow({
    databaseId: appwriteConfig.databaseId,
    tableId: 'messages', // NEW TABLE
    rowId: ID.unique(),
    data: {
      documentId,
      type,
      data: JSON.stringify(data),
      senderId: getUserId(),
      createdAt: new Date().toISOString(),
    },
  });
}

// Subscribe to message updates
realtime.subscribe(
  ['databases.default.tables.messages.rows.*'],
  (payload) => {
    if (payload.events.includes('databases.*.tables.*.rows.*.create')) {
      const message = payload.payload;
      if (message.documentId === currentDocumentId) {
        handleMessage(message.type, JSON.parse(message.data));
      }
    }
  }
);
```

**Strategy 2: Firebase/Fallback provider**

```typescript
// Use Firebase Realtime Database as fallback for presence/cursors
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

const firebaseApp = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase(firebaseApp);

// Broadcast cursor
export function broadcastCursor(documentId: string, cursor: CursorPosition) {
  set(ref(db, `documents/${documentId}/cursors/${cursor.userId}`), {
    ...cursor,
    timestamp: Date.now(),
  });
}

// Listen for cursor updates
export function subscribeToCursors(documentId: string, callback: (cursors: CursorPosition[]) => void) {
  const cursorRef = ref(db, `documents/${documentId}/cursors`);

  onValue(cursorRef, (snapshot) => {
    const cursors = snapshot.val() || {};
    callback(Object.values(cursors));
  });
}
```

### 19.3 WebSocket Message Format Specification

If custom messages ARE supported:

```typescript
// Standard message format
interface RealtimeMessage {
  documentId: string;
  type: 'cursor' | 'presence' | 'ping';
  timestamp: number;
  payload: any;
}

// Cursor message
interface CursorMessage extends RealtimeMessage {
  type: 'cursor';
  payload: {
    userId: string;
    index: number;
    length: number;
    blockId?: string;
    color: string;
    name: string;
  };
}

// Presence message
interface PresenceMessage extends RealtimeMessage {
  type: 'presence';
  payload: {
    userId: string;
    userName: string;
    userColor: string;
    isActive: boolean;
    connectedAt: Date;
  };
}

// Ping message (for keepalive)
interface PingMessage extends RealtimeMessage {
  type: 'ping';
  payload: {
    userId: string;
  };
}
```

### 19.4 API Uncertainties Checklist

- [ ] Can Appwrite Realtime send custom messages?
- [ ] Is there a built-in presence API?
- [ ] What's the maximum message size?
- [ ] What's the message rate limit?
- [ ] Can we broadcast to all subscribers?
- [ ] How are message ordering guarantees?
- [ ] What happens on network partition?
- [ ] Is there a way to query active connections?

---

## Phase 20: UI/UX Details (Moderate)

**Estimated Time: 5-6 hours**

### 20.1 Remote Cursor Visual Design

**Cursor Component:**

**File: `components/collaboration/RemoteCursor.tsx`** (NEW)

```typescript
'use client';

interface RemoteCursorProps {
  userId: string;
  userName: string;
  color: string;
  position: { top: number; left: number; height: number };
}

export function RemoteCursor({
  userId,
  userName,
  color,
  position,
}: RemoteCursorProps) {
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        top: position.top,
        left: position.left,
        height: position.height,
      }}
    >
      {/* Cursor line */}
      <div
        className="w-0.5 absolute top-0 left-0"
        style={{
          height: position.height,
          backgroundColor: color,
        }}
      />

      {/* Cursor head */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        className="absolute -top-0.5 -left-1.5"
        fill={color}
      >
        <path d="M6 2L6 14L9 11L12 16L14 15L11 10L15 10L6 2Z" />
      </svg>

      {/* Name label */}
      <div
        className="absolute -top-6 left-2 px-2 py-0.5 rounded text-xs font-medium"
        style={{
          backgroundColor: color,
          color: getContrastColor(color),
        }}
      >
        {userName}
      </div>
    </div>
  );
}
```

### 20.2 Conflict Resolution UI

**File: `components/collaboration/ConflictResolution.tsx`** (NEW)

```typescript
'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ConflictResolution({
  onResolve,
  onDiscard,
}: {
  onResolve: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="fixed top-4 right-4 max-w-sm bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            Merge conflict detected
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            Another user has made changes that conflict with yours. How would you like to proceed?
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onDiscard}>
              Discard my changes
            </Button>
            <Button size="sm" onClick={onResolve}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload & merge
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 20.3 Permission Change Notification

```typescript
// Toast notification when permission changes
export function showPermissionChangeNotification(
  oldPermission: PermissionLevel,
  newPermission: PermissionLevel
) {
  const isUpgrade = getPermissionRank(newPermission) > getPermissionRank(oldPermission);

  toast({
    title: isUpgrade ? 'Permission upgraded' : 'Permission changed',
    description: `Your access level has changed from ${oldPermission} to ${newPermission}`,
    variant: isUpgrade ? 'default' : 'warning',
  });
}

function getPermissionRank(perm: PermissionLevel): number {
  return { viewer: 1, editor: 2, owner: 3 }[perm];
}
```

### 20.4 Enhanced "You're Viewing a Shared Document" Banner

```typescript
// In public document page
<div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-blue-500/20 px-8 py-3 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <div className="relative">
      <Lock className="h-4 w-4 text-blue-600" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
    </div>
    <div>
      <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
        You're viewing a shared document
      </div>
      {permission === 'viewer' && (
        <div className="text-xs text-blue-600/80">
          Read-only mode. Request edit access to make changes.
        )}
      </div>
    </div>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="sm" onClick={handleCopyLink}>
      <Copy className="h-4 w-4 mr-2" />
      Copy link
    </Button>
    {permission === 'viewer' && (
      <Button size="sm" onClick={handleRequestEditAccess}>
        Request edit access
      </Button>
    )}
  </div>
</div>
```

---

## Phase 21: Monitoring & Observability (Moderate)

**Estimated Time: 4-5 hours**

### 21.1 Error Tracking Setup

**File: lib/monitoring/error-tracking.ts** (NEW)

```typescript
import * as Sentry from '@sentry/nextjs';

export function initErrorTracking() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Filter out expected errors
      if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
        return null;
      }
      return event;
    },
  });
}

export function trackCollaborationError(error: Error, context?: any) {
  Sentry.withScope((scope) => {
    scope.setTag('feature', 'collaboration');
    scope.setExtra('context', context);
    Sentry.captureException(error);
  });
}
```

### 21.2 Performance Monitoring

```typescript
// File: lib/monitoring/metrics.ts

export const CollaborationMetrics = {
  trackConnectionLatency: (latency: number) => {
    window.gtag?.('event', 'collaboration_connection_latency', {
      value: latency,
      event_category: 'performance',
    });
  },

  trackSyncLatency: (latency: number) => {
    window.gtag?.('event', 'collaboration_sync_latency', {
      value: latency,
      event_category: 'performance',
    });
  },

  trackDocumentLoadTime: (documentSize: number, loadTime: number) => {
    window.gtag?.('event', 'document_load_time', {
      value: loadTime,
      event_category: 'performance',
      custom_map: { document_size: documentSize },
    });
  },
};
```

### 21.3 Key Metrics to Track

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| Connection success rate | Counter | < 95% |
| Sync latency | Gauge | > 2s p95 |
| Error rate | Counter | > 5% |
| Active users per document | Gauge | > 50 |
| Storage usage | Gauge | > 80% of quota |
| Document load time | Histogram | > 5s p95 |

### 21.4 Dashboard Configuration

**Grafana Dashboard JSON:**

```json
{
  "dashboard": {
    "title": "Collaboration Features",
    "panels": [
      {
        "title": "Connection Success Rate",
        "targets": [
          {
            "expr": "rate(collaboration_connection_success_total[5m])"
          }
        ]
      },
      {
        "title": "Sync Latency (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, collaboration_sync_latency_seconds)"
          }
        ]
      },
      {
        "title": "Active Users per Document",
        "targets": [
          {
            "expr": "topk(10, collaboration_active_users)"
          }
        ]
      }
    ]
  }
}
```

---

## Phase 22: Backup & Recovery (Low Priority)

**Estimated Time: 3-4 hours**

### 22.1 Database Backup Strategy

**File: scripts/backup-documents.ts**

```typescript
import { getAppwrite, appwriteConfig } from '../lib/appwrite/config';
import * as fs from 'fs';

export async function backupAllDocuments() {
  const appwrite = await getAppwrite();
  const backupDir = `./backups/${Date.now()}`;

  fs.mkdirSync(backupDir, { recursive: true });

  const response = await appwrite.tablesDB.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.documentsTableId,
  });

  for (const doc of response.rows) {
    const backupPath = `${backupDir}/${doc.$id}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(doc, null, 2));
    console.log(`Backed up ${doc.$id}`);
  }

  console.log(`Backup complete: ${backupDir}`);
}

export async function restoreFromBackup(backupDir: string) {
  const files = fs.readdirSync(backupDir);
  const appwrite = await getAppwrite();

  for (const file of files) {
    const doc = JSON.parse(fs.readFileSync(`${backupDir}/${file}`, 'utf-8'));

    await appwrite.tablesDB.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.documentsTableId,
      rowId: doc.$id,
      data: doc,
    });

    console.log(`Restored ${doc.$id}`);
  }

  console.log('Restore complete!');
}
```

### 22.2 Storage File Backup

```typescript
export async function backupStorageFiles(bucketId: string) {
  const appwrite = await getAppwrite();
  const backupDir = `./backups/storage/${bucketId}/${Date.now()}`;

  fs.mkdirSync(backupDir, { recursive: true });

  const response = await appwrite.storage.listFiles(bucketId);

  for (const file of response.files) {
    const fileContent = await appwrite.storage.getFileView(bucketId, file.$id);
    const buffer = await fileContent.arrayBuffer();

    fs.writeFileSync(
      `${backupDir}/${file.$id}.bin`,
      Buffer.from(buffer)
    );

    console.log(`Backed up ${file.$id}`);
  }
}
```

### 22.3 Disaster Recovery Plan

**Recovery Steps:**

1. **Assess damage:**
   ```bash
   npm run backup:verify
   ```

2. **Stop writes:**
   - Enable maintenance mode
   - Scale down application

3. **Restore database:**
   ```bash
   npm run backup:restore -- --dir=YYYYMMDD-HHMMSS
   ```

4. **Restore storage:**
   ```bash
   npm run backup:restore-storage -- --bucket=yjs-updates
   ```

5. **Verify data integrity:**
   ```bash
   npm run backup:validate
   ```

6. **Resume operations:**
   - Disable maintenance mode
   - Scale up application

---

## Phase 23: Database Schema Refinements (Minor)

**Estimated Time: 1-2 hours**

### 23.1 Missing Environment Variables

Add to `.env.local`:

```env
# Version History Table
NEXT_PUBLIC_DOCUMENT_VERSIONS_TABLE_ID=document_versions

# Users Table (for user lookup)
NEXT_PUBLIC_USERS_TABLE_ID=users

# Messages Table (for fallback realtime)
NEXT_PUBLIC_MESSAGES_TABLE_ID=messages
```

### 23.2 Documents Table - Additional Columns

If not already added:

| Column Name | Type | Description |
|-------------|------|-------------|
| `isPublic` | boolean | Whether document is publicly shared (for filtering) |

**Migration SQL:**

```sql
ALTER TABLE documents
ADD COLUMN isPublic BOOLEAN DEFAULT FALSE;
```

### 23.3 Messages Table Schema

For database-based messaging fallback:

**File: Create messages table in Appwrite Console**

| Column Name | Type | Description |
|-------------|------|-------------|
| `id` | string (auto-generated) | Message ID |
| `documentId` | string | Reference to documents table |
| `type` | string | Message type (cursor, presence, ping) |
| `data` | string (JSON) | Message payload |
| `senderId` | string | User ID who sent the message |
| `createdAt` | datetime | When message was sent |

---

## Phase 24: Type Safety Improvements (Minor)

**Estimated Time: 2-3 hours**

### 24.1 Appwrite Realtime Types

**File: `types/appwrite-realtime.d.ts`** (NEW)

```typescript
declare module '@appwrite.io/types' {
  export interface Realtime {
    subscribe(channels: string[], callback: (payload: RealtimePayload) => void): () => void;
    unsubscribe(): void;
  }

  export interface RealtimePayload {
    events: string[];
    channels: string[];
    timestamp: number;
    payload: any;
  }
}

// Usage
import type { Realtime, RealtimePayload } from '@appwrite.io/types';

export class AppwriteProvider {
  private realtime: Realtime;
  private subscription: (() => void) | null;

  async connect(): Promise<void> {
    this.subscription = this.realtime.subscribe(
      [`databases.${appwriteConfig.databaseId}.tables.documents.rows.${this.documentId}`],
      (payload: RealtimePayload) => this.handleRealtimeUpdate(payload)
    );
  }

  private handleRealtimeUpdate(payload: RealtimePayload): void {
    const { events, payload: data } = payload;

    if (events.includes('databases.*.tables.*.rows.*.update')) {
      // Handle update
    }
  }
}
```

### 24.2 Strict Type Checking

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 24.3 Replace `any` Types

**Before:**
```typescript
private realtime: any;
private subscription: any;
handleRealtimeUpdate(payload: any): void
```

**After:**
```typescript
private realtime: Realtime;
private subscription: (() => void) | null;
handleRealtimeUpdate(payload: RealtimePayload): void
```

---

## Updated Environment Variables

Add all missing environment variables to `.env.local`:

```env
# Collaboration Tables
NEXT_PUBLIC_DOCUMENT_VERSIONS_TABLE_ID=document_versions
NEXT_PUBLIC_USERS_TABLE_ID=users
NEXT_PUBLIC_MESSAGES_TABLE_ID=messages

# Yjs Storage
NEXT_PUBLIC_YJS_UPDATES_BUCKET_ID=yjs-updates
NEXT_PUBLIC_DOCUMENT_SNAPSHOTS_BUCKET_ID=document-snapshots

# Version History
YJS_SNAPSHOT_INTERVAL=100
YJS_VERSIONS_TO_KEEP=50
YJS_UPDATES_TO_KEEP=1000

# Monitoring (Optional)
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=

# Backup (Optional)
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
```

---

## Implementation Priority Summary

### Critical (Must address before implementation)
1. **Phase 11: Connection & Reconnection Logic** - Resilience foundation
2. **Phase 19: Real-time API Research** - Verify technical feasibility

### High Priority (Address in first iteration)
3. **Phase 12: User Lookup Service** - Essential for collaboration
4. **Phase 13: Permission Enforcement** - Security requirement
5. **Phase 14: Error Handling** - User experience
6. **Phase 15: Version History Integration** - Core feature
7. **Phase 18: Migration & Data Seeding** - Data integrity

### Medium Priority (Add after MVP)
8. **Phase 16: Performance Specifications** - Optimization
9. **Phase 17: Testing Coverage** - Quality assurance
10. **Phase 20: UI/UX Details** - Polish
11. **Phase 21: Monitoring & Observability** - Operations

### Low Priority (Nice to have)
12. **Phase 22: Backup & Recovery** - Disaster preparedness
13. **Phase 23: Database Schema Refinements** - Minor improvements
14. **Phase 24: Type Safety Improvements** - Code quality

---

## Future Scope: In-App Notifications

**Planned for post-MVP implementation**

### Overview
Add notification system to inform users when documents are shared with them, with real-time updates.

### Features
- ✅ Real-time notification when document is shared with user
- ✅ Notification bell in header with unread count badge
- ✅ Notification dropdown showing list of notifications
- ✅ Mark as read / Mark all as read
- ✅ Delete individual / Delete all notifications
- ✅ Click notification → navigate to shared document
- ✅ Real-time updates via Appwrite Realtime (or 60s polling)

### Database Schema

**Create `notifications` table:**

| Column Name | Type | Description |
|-------------|------|-------------|
| `id` | string (auto-generated) | Notification ID |
| `userId` | string | Recipient user ID |
| `type` | enum: `"document_shared"`, `"document_updated"`, etc. | Notification type |
| `documentId` | string, nullable | Related document ID |
| `fromUserId` | string, nullable | User who triggered notification |
| `permission` | enum: `"viewer"`, `"editor"`, nullable | Permission level (for shared documents) |
| `isRead` | boolean, default: false | Has user read this? |
| `createdAt` | datetime | When notification was created |

### Backend Services

**File: `lib/appwrite/notifications.ts`** (NEW)

```typescript
import { getAppwrite, appwriteConfig, ID } from './config';

export type NotificationType = 'document_shared' | 'document_updated' | 'comment_added';
export type PermissionLevel = 'viewer' | 'editor';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  documentId?: string;
  fromUserId?: string;
  permission?: PermissionLevel;
  isRead: boolean;
  createdAt: Date;
}

// Create notification (called when adding collaborator)
export async function createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<void> {
  const appwrite = await getAppwrite();

  await appwrite.tablesDB.createRow({
    databaseId: appwriteConfig.databaseId,
    tableId: 'notifications',
    rowId: ID.unique(),
    data: {
      ...data,
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  });
}

// Get user's notifications (with pagination)
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Notification[]> {
  try {
    const appwrite = await getAppwrite();
    const response = await appwrite.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'notifications',
      queries: [
        appwrite.Query.equal('userId', [userId]),
        appwrite.Query.orderDesc('createdAt'),
        appwrite.Query.limit(limit),
        appwrite.Query.offset(offset),
      ],
    });

    return response.rows.map((row: any) => ({
      id: row.$id,
      userId: row.userId,
      type: row.type,
      documentId: row.documentId,
      fromUserId: row.fromUserId,
      permission: row.permission,
      isRead: row.isRead,
      createdAt: new Date(row.createdAt),
    }));
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }
}

// Get unread count
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const appwrite = await getAppwrite();
    const response = await appwrite.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'notifications',
      queries: [
        appwrite.Query.equal('userId', [userId]),
        appwrite.Query.equal('isRead', [false]),
      ],
    });

    return response.rows.length;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}

// Mark notification as read
export async function markAsRead(notificationId: string): Promise<void> {
  const appwrite = await getAppwrite();

  await appwrite.tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId,
    tableId: 'notifications',
    rowId: notificationId,
    data: { isRead: true },
  });
}

// Mark all as read
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const appwrite = await getAppwrite();
    const response = await appwrite.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'notifications',
      queries: [
        appwrite.Query.equal('userId', [userId]),
        appwrite.Query.equal('isRead', [false]),
      ],
    });

    await Promise.all(
      response.rows.map((row: any) =>
        appwrite.tablesDB.updateRow({
          databaseId: appwriteConfig.databaseId,
          tableId: 'notifications',
          rowId: row.$id,
          data: { isRead: true },
        })
      )
    );
  } catch (error) {
    console.error('Failed to mark all as read:', error);
  }
}

// Delete notification
export async function deleteNotification(notificationId: string): Promise<void> {
  const appwrite = await getAppwrite();

  await appwrite.tablesDB.deleteRow({
    databaseId: appwriteConfig.databaseId,
    tableId: 'notifications',
    rowId: notificationId,
  });
}

// Delete all notifications for user
export async function deleteAllNotifications(userId: string): Promise<void> {
  try {
    const appwrite = await getAppwrite();
    const response = await appwrite.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: 'notifications',
      queries: [
        appwrite.Query.equal('userId', [userId]),
      ],
    });

    await Promise.all(
      response.rows.map((row: any) =>
        appwrite.tablesDB.deleteRow({
          databaseId: appwriteConfig.databaseId,
          tableId: 'notifications',
          rowId: row.$id,
        })
      )
    );
  } catch (error) {
    console.error('Failed to delete all notifications:', error);
  }
}

// Real-time subscription for new notifications
export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notification: Notification) => void
): () => void {
  const appwrite = getAppwrite();
  const channel = `databases.${appwriteConfig.databaseId}.tables.notifications.rows`;

  const subscription = appwrite.realtime.subscribe([channel], (payload: any) => {
    const { events, payload } = payload;
    if (events.includes('databases.*.tables.*.rows.*.create') {
      const notification = payload as Notification;
      if (notification.userId === userId) {
        onNewNotification(notification);
      }
    }
  });

  return () => subscription();
}
```

### Frontend Components

**File: `components/notifications/NotificationBell.tsx`** (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationDropdown } from './NotificationDropdown';
import { getUnreadCount, subscribeToNotifications } from '@/lib/appwrite/notifications';
import { useAuthContext } from '@/contexts/AuthContext';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { user } = useAuthContext();

  useEffect(() => {
    if (!user) return;

    // Load initial count
    getUnreadCount(user.id).then(setUnreadCount);

    // Subscribe to new notifications
    const unsubscribe = subscribeToNotifications(user.id, (notification) => {
      setUnreadCount(prev => prev + 1);
      // Optional: Show toast for new notification
    });

    return unsubscribe;
  }, [user]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && <NotificationDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
```

**File: `components/notifications/NotificationDropdown.tsx`** (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { getUserNotifications, markAsRead, markAllAsRead, deleteNotification } from '@/lib/appwrite/notifications';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/lib/appwrite/notifications';

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthContext();

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    getUserNotifications(user.id, 20).then(data => {
      setNotifications(data);
      setLoading(false);
    });
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(user!.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'document_shared':
        return `shared "${notification.documentId}" with you as ${notification.permission}`;
      default:
        return 'New notification';
    }
  };

  return (
    <DropdownMenu open onOpenChange={onClose}>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2 border-b flex items-center justify-between">
          <span className="text-sm font-medium">Notifications</span>
          {notifications.some(n => !n.isRead) && (
            <Button size="sm" variant="ghost" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={cn(
                  'p-3 border-b hover:bg-muted/50 cursor-pointer',
                  !notification.isRead && 'bg-muted/30'
                )}
                onClick={() => {
                  if (!notification.isRead) {
                    handleMarkAsRead(notification.id);
                  }
                  // Navigate to document if available
                  if (notification.documentId) {
                    window.location.href = `/doc/${notification.documentId}`;
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className={cn('text-sm', !notification.isRead && 'font-medium')}>
                      {getNotificationMessage(notification)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Integration Points

**Update collaboration service to create notification:**

In `lib/appwrite/collaboration.ts`, modify `addCollaborator()`:

```typescript
// After adding to sharedWith array, create notification
await appwrite.tablesDB.updateRow({
  databaseId: appwriteConfig.databaseId,
  tableId: appwriteConfig.documentsTableId,
  rowId: documentId,
  data: { sharedWith },
});

// NEW: Create notification for collaborator
await createNotification({
  userId: userId, // The collaborator's user ID
  type: 'document_shared',
  documentId: documentId,
  fromUserId: currentUserId, // The owner
  permission: permission,
});
```

### Technical Considerations

1. **Polling fallback:** If Appwrite Realtime doesn't support custom events, implement 60s polling
2. **Batch operations:** `markAllAsRead` should batch multiple updates
3. **Cleanup:** Auto-delete notifications older than 30 days
4. **Pagination:** Support infinite scroll for large notification lists
5. **Throttling:** Debounce rapid notification creation to prevent spam
6. **Performance:** Create index on `(userId, createdAt)` for fast queries

### Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_NOTIFICATIONS_TABLE_ID=notifications
```

---

**End of Implementation Plan**
