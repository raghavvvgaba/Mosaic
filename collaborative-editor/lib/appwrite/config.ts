import { Client, Account, Databases, TablesDB, Storage, ID, Query } from 'appwrite';

// Environment variable validation
function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'NEXT_PUBLIC_APPWRITE_DOCUMENTS_TABLE_ID',
    'NEXT_PUBLIC_APPWRITE_WORKSPACES_TABLE_ID',
    'NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID',
    'NEXT_PUBLIC_APPWRITE_DEFAULT_WORKSPACE_ID'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    console.error('Please check your .env.local file configuration');

    // In development, we can continue with warnings
    if (process.env.NODE_ENV === 'development') {
      console.warn('Running in development mode with missing environment variables');
    } else {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

export class AppwriteConfig {
  private static instance: AppwriteConfig;
  public client: Client;
  public account: Account;
  public databases: Databases;
  public tablesDB: TablesDB;
  public storage: Storage;
  // Realtime will be added when needed for Phase 2C

  private constructor() {
    // Validate environment variables first
    validateEnvironment();

    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT || '');

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
      // Try to get the default workspace to test database connectivity
      const { ensureDefaultWorkspace } = await import('./workspaces');
      await ensureDefaultWorkspace();
      return true;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }
}

// Export singleton instance and utilities
export const appwrite = AppwriteConfig.getInstance();
export { ID, Query } from 'appwrite';