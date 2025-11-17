import { useState, useEffect, useCallback } from 'react';
import { authService } from '../lib/appwrite/auth';
import type { User } from '../lib/db/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication check failed');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      setError(null);
      const newUser = await authService.signUp(email, password, name);
      setUser(newUser);
      return newUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      const loggedInUser = await authService.signIn(email, password);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      setUser(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
      throw err;
    }
  }, []);

  const updateProfile = useCallback(async (updates: { name?: string; preferences?: Partial<import('../lib/db/types').UserPreferences> }) => {
    try {
      setError(null);
      if (!user) {
        throw new Error('No authenticated user');
      }
      const updatedUser = await authService.updateProfile(updates);
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Profile update failed';
      setError(errorMessage);
      throw err;
    }
  }, [user]);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const isAuthenticated = !!user;

  return {
    user,
    loading,
    error,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    updateProfile,
    checkAuth,
  };
}