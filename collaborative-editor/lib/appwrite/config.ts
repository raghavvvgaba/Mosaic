import { Client, Account, Databases, TablesDB, Storage, ID, Query } from 'appwrite';

export const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  project: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'main',
  documentsTableId: process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_TABLE_ID || 'documents',
  workspacesTableId: process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_TABLE_ID || 'workspaces',
  projectName: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_NAME,
};

export class AppwriteConfig {
  private static instance: AppwriteConfig;
  public client!: Client;
  public account!: Account;
  public databases!: Databases;
  public tablesDB!: TablesDB;
  public storage!: Storage;
  // Realtime will be added when needed for Phase 2C

  private constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    // Validate required environment variables
    if (!appwriteConfig.project) {
      throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID is required but not found in environment variables');
    }

    // Initialize Appwrite client with environment variables
    this.client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.project);

    // Initialize Appwrite services
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    this.tablesDB = new TablesDB(this.client);
    this.storage = new Storage(this.client);
  }

  static getInstance(): AppwriteConfig {
    if (!AppwriteConfig.instance) {
      AppwriteConfig.instance = new AppwriteConfig();
    }
    return AppwriteConfig.instance;
  }

  // Utility methods for common operations
  static get Query() {
    return Query;
  }

  static get ID() {
    return ID;
  }

  // Database connection health check
  static async checkConnection(): Promise<boolean> {
    try {
      // Trigger getInstance to ensure config is initialized
      AppwriteConfig.getInstance();

      // Test database connectivity by trying to access workspaces
      const { getWorkspaces } = await import('./workspaces');
      await getWorkspaces();
      return true;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }
}

// Lazy initialization function to avoid premature environment validation
export const getAppwrite = () => AppwriteConfig.getInstance();

// Utility exports
export { ID, Query } from 'appwrite';