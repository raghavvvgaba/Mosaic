import { useState, useEffect, useCallback } from 'react';
import { authService } from '../lib/appwrite/auth';
import { syncFacade } from '../lib/sync/sync-facade';
import { hasGuestData, migrateGuestData } from '../lib/migration/guest-migration';
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

  const triggerMigrationIfNeeded = useCallback(async (newUser: User) => {
    try {
      // Check if user has guest data that needs migration
      const hasGuest = await hasGuestData();
      if (hasGuest) {
        console.log('Guest data detected, starting migration...');
        const migrationResult = await migrateGuestData(newUser.id);

        if (migrationResult.success) {
          console.log(`Migration completed: ${migrationResult.documentsMigrated} documents, ${migrationResult.workspacesMigrated} workspaces`);

          // Trigger sync facade to handle post-migration sync
          await syncFacade.triggerGuestMigration(newUser);
        } else {
          console.error('Migration failed:', migrationResult.errors);
        }
      } else {
        // No guest data, just initialize sync normally
        await syncFacade.initializeForUser(newUser);
      }
    } catch (error) {
      console.error('Migration/init sync failed:', error);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      const newUser = await authService.signUp(email, password, name);
      setUser(newUser);

      // Trigger migration after successful signup
      await triggerMigrationIfNeeded(newUser);

      return newUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [triggerMigrationIfNeeded]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const loggedInUser = await authService.signIn(email, password);
      setUser(loggedInUser);

      // Trigger migration after successful signin
      await triggerMigrationIfNeeded(loggedInUser);

      return loggedInUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [triggerMigrationIfNeeded]);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      setUser(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    }
  }, []);

  const updateProfile = useCallback(async (updates: { name?: string; preferences?: Partial<import('../lib/db/types').UserPreferences> }) => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await authService.updateProfile(updates);
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []); // Run only once on mount

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    checkAuth,
    isAuthenticated: !!user
  };
}