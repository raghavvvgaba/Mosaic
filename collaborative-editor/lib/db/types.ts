export type DocumentFont = 'sans' | 'serif' | 'mono';

export interface Document {
  id: string;                     // Maps to Appwrite's $id
  title: string;
  content: string; // JSON string of BlockNote content
  workspaceId: string;
  icon?: string;
  createdAt: Date;                // Maps to Appwrite's $createdAt
  updatedAt: Date;                // Maps to Appwrite's $updatedAt
  lastChangedAt?: Date;
  isDeleted: boolean;
  isFavorite?: boolean;
  parentId?: string;
  font?: DocumentFont;
  isPublic: boolean;              // Public sharing status
  ownerId?: string;               // Document owner ID
  collaborators: Collaborator[];  // List of collaborators
  permissions: Permission[];      // Document permissions
}

// Document metadata without content - for faster loading in sidebar and lists
export interface DocumentMetadata {
  id: string;                     // Maps to Appwrite's $id
  title: string;
  workspaceId: string;
  icon?: string;
  createdAt: Date;                // Maps to Appwrite's $createdAt
  updatedAt: Date;                // Maps to Appwrite's $updatedAt
  lastChangedAt?: Date;
  isDeleted: boolean;
  isFavorite?: boolean;
  parentId?: string;
  font?: DocumentFont;
  isPublic: boolean;              // Public sharing status
  ownerId?: string;               // Document owner ID
  collaborators: Collaborator[];  // List of collaborators
  permissions: Permission[];      // Document permissions
}

export interface DocumentNode extends Document {
  children: DocumentNode[];
}

// Node version with metadata only
export interface DocumentNodeMetadata extends DocumentMetadata {
  children: DocumentNodeMetadata[];
}

export interface Settings {
  key: string;
  value: unknown;
}

export interface Workspace {
  id: string;                     // Maps to Appwrite's $id
  name: string;
  color?: string;
  icon?: string;
  createdAt: Date;                // Maps to Appwrite's $createdAt
  updatedAt: Date;                // Maps to Appwrite's $updatedAt
  isDefault?: boolean;
  ownerId?: string;               // Workspace owner ID
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


export interface User {
  id: string;                     // Maps to Appwrite's $id
  email: string;
  name: string;
  avatar?: string;                // Avatar URL (for display)
  avatarId?: string;              // Avatar file ID in Storage (for deletion)
  preferences: UserPreferences;
  emailVerification?: boolean;    // Email verification status from Appwrite
  createdAt: Date;                // Maps to Appwrite's $createdAt
  lastLoginAt?: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  font: DocumentFont;
  fontSize?: number;              // Base font size (12-20px)
}
