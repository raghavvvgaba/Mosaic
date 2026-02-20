'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService } from '@/lib/appwrite/auth';
import { PreferencesService } from '@/lib/appwrite/preferences';
import { StorageService } from '@/lib/appwrite/storage';
import { createWorkspace, getWorkspaces } from '@/lib/appwrite/workspaces';
import type { User, UserPreferences } from '@/lib/db/types';

type AppwriteUser = {
  $id: string;
  email: string;
  name: string;
  emailVerification?: boolean;
  $createdAt: string;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) {
    return err.message || fallback;
  }
  if (typeof err === 'string') {
    return err || fallback;
  }
  return fallback;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthContextProvider');
  }
  return context;
};

interface AuthContextProviderProps {
  children: ReactNode;
}

export const AuthContextProvider: React.FC<AuthContextProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const DEFAULT_WORKSPACE_NAME = 'Default';

  // Convert Appwrite user to our User type
  const convertAppwriteUser = async (appwriteUser: AppwriteUser): Promise<User> => {
    // Fetch preferences from Appwrite (now includes avatarId)
    const preferences = await PreferencesService.getPreferences();

    // Get avatar URL from avatarId in preferences
    const avatarId = preferences.avatarId;
    const avatar = avatarId ? StorageService.getAvatarPreviewUrl(avatarId) : undefined;

    return {
      id: appwriteUser.$id,
      email: appwriteUser.email,
      name: appwriteUser.name,
      avatar,
      avatarId, // Store the ID so we can delete old avatars when uploading new ones
      emailVerification: appwriteUser.emailVerification,
      preferences,
      createdAt: new Date(appwriteUser.$createdAt),
      lastLoginAt: appwriteUser.emailVerification ? new Date() : undefined,
    };
  };

  const ensureDefaultWorkspace = async (userId: string) => {
    const existingWorkspaces = await getWorkspaces();
    if (existingWorkspaces.length > 0) {
      return;
    }

    await createWorkspace(DEFAULT_WORKSPACE_NAME, userId, { isDefault: true });
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const isAuthenticated = await AuthService.isAuthenticated();
        if (isAuthenticated) {
          const appwriteUser = await AuthService.getCurrentUser();
          const user = await convertAppwriteUser(appwriteUser);
          setUser(user);

          try {
            await ensureDefaultWorkspace(user.id);
          } catch (workspaceError) {
            console.error('Failed to ensure default workspace:', workspaceError);
            setError('Signed in successfully, but default workspace setup failed. You may need to create a workspace manually.');
          }
        }
      } catch (err) {
        console.error('Auth status check failed:', err);
        setError('Failed to check authentication status');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { user: appwriteUser } = await AuthService.signIn(email, password);
      const user = await convertAppwriteUser(appwriteUser);
      setUser(user);

      try {
        await ensureDefaultWorkspace(user.id);
      } catch (workspaceError) {
        console.error('Failed to ensure default workspace:', workspaceError);
        setError('Signed in successfully, but default workspace setup failed. You may need to create a workspace manually.');
      }
    } catch (err: unknown) {
      console.error('Sign in failed:', err);
      const errorMessage = getErrorMessage(err, 'Invalid email or password');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await AuthService.signInWithGoogle();
    } catch (err: unknown) {
      console.error('Google sign in failed:', err);
      const errorMessage = getErrorMessage(err, 'Failed to continue with Google');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { user: appwriteUser } = await AuthService.signUp(name, email, password);
      const user = await convertAppwriteUser(appwriteUser);
      setUser(user);

      // Create default workspace for new users.
      try {
        await ensureDefaultWorkspace(user.id);
      } catch (workspaceError) {
        console.error('Failed to create default workspace:', workspaceError);
        // Don't fail signup if workspace creation fails, but notify user
        setError('Account created successfully, but default workspace creation failed. You may need to create a workspace manually.');
        // Still allow signup to complete since user account was created
      }
    } catch (err: unknown) {
      console.error('Sign up failed:', err);
      const errorMessage = getErrorMessage(err, 'Failed to create account');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      await AuthService.signOut();
      setUser(null);
    } catch (err: unknown) {
      console.error('Sign out failed:', err);
      const errorMessage = getErrorMessage(err, 'Failed to sign out');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (name: string) => {
    try {
      setError(null);

      await AuthService.updateName(name);

      // Update local user state
      if (user) {
        const updatedUser = { ...user, name };
        setUser(updatedUser);
      }
    } catch (err: unknown) {
      console.error('Profile update failed:', err);
      const errorMessage = getErrorMessage(err, 'Failed to update profile');
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      setError(null);

      // Update preferences on Appwrite
      const newPreferences = await PreferencesService.updatePreferences(updates);

      // Update local user state
      if (user) {
        const updatedUser = {
          ...user,
          preferences: newPreferences,
        };
        setUser(updatedUser);
      }
    } catch (err: unknown) {
      console.error('Preferences update failed:', err);
      const errorMessage = getErrorMessage(err, 'Failed to update preferences');
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateAvatar = async (file: File) => {
    try {
      setError(null);

      // Get old avatar ID from user for deletion
      const oldAvatarId = user?.avatarId;

      // Upload avatar via AuthService (deletes old one automatically)
      const result = await AuthService.updateAvatar(file, oldAvatarId);

      // Update local user state with new avatar URL and ID
      if (user) {
        const updatedUser = {
          ...user,
          avatar: result.url,
          avatarId: result.fileId,
        };
        setUser(updatedUser);
      }
    } catch (err: unknown) {
      console.error('Avatar update failed:', err);
      const errorMessage = getErrorMessage(err, 'Failed to update avatar');
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteAvatar = async () => {
    try {
      setError(null);

      // Get avatar ID before deleting
      const avatarId = user?.avatarId;
      if (!avatarId) {
        throw new Error('No avatar to delete');
      }

      // Delete avatar via AuthService
      await AuthService.deleteAvatar(avatarId);

      // Update local user state to remove avatar
      if (user) {
        const updatedUser = {
          ...user,
          avatar: undefined,
          avatarId: undefined,
        };
        setUser(updatedUser);
      }
    } catch (err: unknown) {
      console.error('Avatar deletion failed:', err);
      const errorMessage = getErrorMessage(err, 'Failed to delete avatar');
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const sendEmailVerification = async () => {
    try {
      setError(null);
      await AuthService.sendEmailVerification();
    } catch (err: unknown) {
      console.error('Email verification failed:', err);
      const errorMessage = getErrorMessage(err, 'Failed to send verification email');
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
    updatePreferences,
    updateAvatar,
    deleteAvatar,
    sendEmailVerification,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
