// This file previously contained IndexedDB setup, but has been replaced with Appwrite
// All database operations are now handled through the Appwrite SDK
// This file remains for backward compatibility during the transition

// Re-export types for convenience
export type { Document, Workspace, Settings, User, UserPreferences } from './types';

// Legacy function stubs - these now no-ops since we don't use IndexedDB
export async function getDB() {
  // No longer needed - using Appwrite instead
  return null;
}

export async function resetDB() {
  // No longer needed - Appwrite handles data persistence
  console.log('DB reset is no longer needed - using Appwrite cloud storage');
}