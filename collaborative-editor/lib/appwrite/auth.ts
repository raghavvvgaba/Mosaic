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

      // Create user profile data
      const user: User = {
        id: account.$id,
        email: account.email,
        name: account.name || '',
        preferences: this.getDefaultPreferences(),
        createdAt: new Date(account.$createdAt),
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
      autoSync: true,
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
      await appwrite.tablesDB.upsertRow({
        databaseId,
        tableId: usersTableId,
        rowId: user.id,
        data: {
          email: user.email,
          name: user.name,
          preferences: user.preferences,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to create user profile:', error);
      // Don't throw - user can still use app locally
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
      return userDoc.data?.preferences || this.getDefaultPreferences();
    } catch {
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