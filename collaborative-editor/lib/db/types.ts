export interface Document {
  id: string;
  title: string;
  content: string; // JSON string of BlockNote content
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
  value: any;
}
