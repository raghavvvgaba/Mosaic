'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService } from '@/lib/appwrite/auth';
import { createWorkspace } from '@/lib/appwrite/workspaces';
import type { User } from '@/lib/db/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
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

  // Convert Appwrite user to our User type
  const convertAppwriteUser = (appwriteUser: any): User => {
    return {
      id: appwriteUser.$id,
      email: appwriteUser.email,
      name: appwriteUser.name,
      avatar: appwriteUser.avatar || undefined,
      preferences: {
        theme: 'system',
        font: 'sans',
        notifications: {
          email: true,
          push: true,
          mentions: true,
          comments: true,
          shares: true,
        },
      },
      createdAt: new Date(appwriteUser.$createdAt),
      lastLoginAt: appwriteUser.emailVerification ? new Date() : undefined,
    };
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
          const user = convertAppwriteUser(appwriteUser);
          setUser(user);
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
      const user = convertAppwriteUser(appwriteUser);
      setUser(user);
    } catch (err: any) {
      console.error('Sign in failed:', err);
      const errorMessage = err.message || 'Invalid email or password';
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
      const user = convertAppwriteUser(appwriteUser);
      setUser(user);

      // Create personal workspace for the new user
      try {
        await createWorkspace(`${name}'s Workspace`, user.id);
        console.log('Personal workspace created successfully');
      } catch (workspaceError) {
        console.error('Failed to create personal workspace:', workspaceError);
        // Don't fail signup if workspace creation fails, but notify user
        setError('Account created successfully, but workspace creation failed. You may need to create a workspace manually.');
        // Still allow signup to complete since user account was created
      }
    } catch (err: any) {
      console.error('Sign up failed:', err);
      const errorMessage = err.message || 'Failed to create account';
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
    } catch (err: any) {
      console.error('Sign out failed:', err);
      const errorMessage = err.message || 'Failed to sign out';
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
    } catch (err: any) {
      console.error('Profile update failed:', err);
      const errorMessage = err.message || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const sendEmailVerification = async () => {
    try {
      setError(null);
      await AuthService.sendEmailVerification();
    } catch (err: any) {
      console.error('Email verification failed:', err);
      const errorMessage = err.message || 'Failed to send verification email';
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
    signUp,
    signOut,
    updateProfile,
    sendEmailVerification,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};