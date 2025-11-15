export type DocumentFont = 'sans' | 'serif' | 'mono';

export interface Document {
  id: string;
  title: string;
  content: string; // JSON string of BlockNote content
  workspaceId: string;
  icon?: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt?: Date;
  isDeleted: boolean;
  isFavorite?: boolean;
  parentId?: string;
  font?: DocumentFont;

  // Cloud synchronization fields
  cloudId?: string;               // Appwrite document ID
  cloudSynced: boolean;           // Sync status with cloud
  cloudUpdatedAt?: Date;          // Last cloud modification
  syncVersion: number;            // Version for conflict resolution
  isPublic: boolean;              // Public sharing status
  ownerId?: string;               // Document owner ID
  collaborators: Collaborator[];  // List of collaborators
  permissions: Permission[];      // Document permissions
  yjsState?: string;             // Base64 encoded Yjs state
  lastSyncAt?: Date;             // Last successful sync timestamp
  syncError?: string;            // Last sync error message
  conflicts: Conflict[];         // Pending conflicts
}

export interface DocumentNode extends Document {
  children: DocumentNode[];
}

export interface Settings {
  key: string;
  value: unknown;
}

export interface Workspace {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;

  // Cloud synchronization fields
  cloudId?: string;               // Appwrite workspace ID
  cloudSynced: boolean;           // Sync status with cloud
  cloudUpdatedAt?: Date;          // Last cloud modification
  syncVersion: number;            // Version for conflict resolution
  ownerId?: string;               // Workspace owner ID
  lastSyncAt?: Date;             // Last successful sync timestamp
  syncError?: string;            // Last sync error message
}

// New Phase 2 types for cloud integration
export interface Collaborator {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
  permission: 'viewer' | 'editor' | 'owner';
  addedAt: Date;
  addedBy: string;
  lastAccessAt?: Date;
}

export interface Permission {
  userId: string;
  permission: 'read' | 'write' | 'admin';
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
}

export interface Conflict {
  id: string;
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  localTimestamp: Date;
  remoteTimestamp: Date;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge';
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  font: DocumentFont;
  autoSync: boolean;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  mentions: boolean;
  comments: boolean;
  shares: boolean;
}
