import { appwrite, ID } from './config';
import type { User, UserPreferences } from '../db/types';

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async signUp(email: string, password: string, name: string): Promise<User> {
    try {
      // Create user account
      const account = await appwrite.account.create(
        ID.unique(),
        email,
        password,
        name
      );

      console.log('Account created successfully, establishing session...');

      // Create session to authenticate the user
      await appwrite.account.createEmailPasswordSession(email, password);

      console.log('Session established successfully after signup');

      // Get the authenticated account to ensure session is valid
      const authenticatedAccount = await appwrite.account.get();

      // Create user profile data
      const user: User = {
        id: authenticatedAccount.$id,
        email: authenticatedAccount.email,
        name: authenticatedAccount.name || '',
        preferences: this.getDefaultPreferences(),
        createdAt: new Date(authenticatedAccount.$createdAt),
        lastLoginAt: new Date()
      };

      // Store user preferences in database
      await this.createUserProfile(user);

      return user;
    } catch (error) {
      console.error('Sign up failed:', error);
      throw new Error(`Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      // Create session
      await appwrite.account.createEmailPasswordSession(email, password);

      // Get user account
      const account = await appwrite.account.get();

      const user: User = {
        id: account.$id,
        email: account.email,
        name: account.name || '',
        preferences: await this.getUserPreferences(account.$id),
        createdAt: new Date(account.$createdAt),
        lastLoginAt: new Date()
      };

      await this.updateLastLogin(account.$id);
      return user;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw new Error(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async signOut(): Promise<void> {
    try {
      await appwrite.account.deleteSession('current');
    } catch (error) {
      console.error('Sign out error:', error);
      // Don't throw error for sign out - user can still use app locally
    }
  }

  /**
   * Validate that the current user session is properly established
   * Used to ensure authentication is ready before starting migration
   */
  async validateSession(): Promise<{ valid: boolean; user?: User | null; error?: string }> {
    try {
      // Check if user is currently authenticated
      const account = await appwrite.account.get();

      if (!account) {
        return { valid: false, error: 'No active session found' };
      }

      // Verify user has required session data
      if (!account.$id || !account.email) {
        return { valid: false, error: 'Invalid session data' };
      }

      const user: User = {
        id: account.$id,
        email: account.email,
        name: account.name || '',
        preferences: await this.getUserPreferences(account.$id),
        createdAt: new Date(account.$createdAt),
        lastLoginAt: new Date()
      };

      return { valid: true, user };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Session validation failed';
      console.error('Session validation error:', error);
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Wait for session to be properly established after signup/signin
   * Uses exponential backoff retry strategy
   */
  async waitForSessionEstablishment(maxAttempts: number = 3): Promise<{ valid: boolean; user?: User | null; error?: string }> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const validation = await this.validateSession();

      if (validation.valid) {
        return validation;
      }

      // If this is not the last attempt, wait before retrying
      if (attempt < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
        console.log(`Session validation attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { valid: false, error: 'Session could not be established after multiple attempts' };
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const account = await appwrite.account.get();

      return {
        id: account.$id,
        email: account.email,
        name: account.name || '',
        preferences: await this.getUserPreferences(account.$id),
        createdAt: new Date(account.$createdAt),
        lastLoginAt: new Date()
      };
    } catch (error) {
      // User is not logged in
      return null;
    }
  }

  async updateProfile(updates: { name?: string; preferences?: Partial<UserPreferences> }): Promise<User> {
    try {
      const account = await appwrite.account.get();

      // Update account name if provided
      if (updates.name) {
        await appwrite.account.updateName(updates.name);
      }

      // Update preferences if provided
      if (updates.preferences) {
        const currentPrefs = await this.getUserPreferences(account.$id);
        const newPrefs = { ...currentPrefs, ...updates.preferences };
        await this.saveUserPreferences(account.$id, newPrefs);
      }

      // Return updated user data
      const updatedUser = await this.getCurrentUser();
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user data');
      }
      return updatedUser;
    } catch (error) {
      throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'system',
      font: 'sans',
      notifications: {
        email: true,
        push: true,
        mentions: true,
        comments: true,
        shares: true
      }
    };
  }

  private async createUserProfile(user: User): Promise<void> {
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    if (!databaseId) {
      console.warn('Database ID not configured, skipping user profile creation');
      return;
    }

    try {
      const usersTableId = process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID || 'users';

      // Only include basic fields that exist in the users table schema
      // Preferences will be handled locally for now to avoid schema mismatches
      await appwrite.tablesDB.upsertRow({
        databaseId,
        tableId: usersTableId,
        rowId: user.id,
        data: {
          email: user.email,
          name: user.name,
          lastLoginAt: user.lastLoginAt?.toISOString()
          // Note: Appwrite system fields like $id, $createdAt, $updatedAt are managed automatically
          // We only provide custom fields specific to our application
        }
      });

      console.log('✅ User profile created successfully in Appwrite');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to create user profile:', errorMsg);
      console.error('🔍 Debug info:', {
        databaseId,
        tableId: usersTableId,
        userId: user.id,
        userData: {
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString()
        }
      });
      // Don't throw - user can still use app locally
      console.warn('⚠️ User can continue using the app, but cloud features may be limited');
    }
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    if (!databaseId) {
      return this.getDefaultPreferences();
    }

    try {
      const usersTableId = process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID || 'users';
      const userDoc = await appwrite.tablesDB.getRow(databaseId, usersTableId, userId);

      // If preferences field doesn't exist in schema, use defaults
      // In the future, preferences can be stored in a separate table or as JSON metadata
      return this.getDefaultPreferences();
    } catch (error) {
      // User profile might not exist yet (common during signup)
      // or preferences field is not accessible
      console.log(`ℹ️ User preferences not found in database, using defaults for user ${userId}`);
      return this.getDefaultPreferences();
    }
  }

  private async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    if (!databaseId) {
      console.warn('Database ID not configured, skipping preferences save');
      return;
    }

    try {
      const usersTableId = process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID || 'users';
      await appwrite.tablesDB.upsertRow({
        databaseId,
        tableId: usersTableId,
        rowId: userId,
        data: {
          preferences
        }
      });
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      // Don't throw - preferences will be cached locally
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    if (!databaseId) {
      return;
    }

    try {
      const usersTableId = process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID || 'users';
      await appwrite.tablesDB.upsertRow({
        databaseId,
        tableId: usersTableId,
        rowId: userId,
        data: {
          lastLoginAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to update last login:', error);
      // Don't throw - login is still successful
    }
  }
}

export const authService = AuthService.getInstance();