import type { Workspace } from './types';

export const DEFAULT_WORKSPACE_ID = 'default';

export function createDefaultWorkspace(): Workspace {
  const now = new Date();
  return {
    id: DEFAULT_WORKSPACE_ID,
    name: 'Personal Workspace',
    color: '#2563eb',
    icon: '📝',
    createdAt: now,
    updatedAt: now,
    isDefault: true,
    // Cloud synchronization fields with defaults
    cloudSynced: false,
    syncVersion: 0,
  };
}
