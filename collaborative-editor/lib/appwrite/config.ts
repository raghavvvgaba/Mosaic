import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

export class AppwriteConfig {
  private static instance: AppwriteConfig;
  public client: Client;
  public account: Account;
  public databases: Databases;
  public storage: Storage;
  // Realtime will be added when needed for Phase 2C

  private constructor() {
    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT || '');

    // Initialize Appwrite services
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
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
}

// Export singleton instance and utilities
export const appwrite = AppwriteConfig.getInstance();
export { ID, Query } from 'appwrite';