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
}
