// Re-export Appwrite workspace functions for backward compatibility
// This maintains the same API while using Appwrite backend

export {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  renameWorkspace,
  updateWorkspaceMetadata,
  deleteWorkspace,
  countDocumentsInWorkspace,
} from '../appwrite/workspaces';

import type { Workspace } from './types';

// Re-export types for convenience
export type { Workspace };