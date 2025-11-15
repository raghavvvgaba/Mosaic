import type { Document } from '../db/types';

export interface Conflict {
  id: string;
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  localTimestamp: Date;
  remoteTimestamp: Date;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge' | 'manual';
}
import { updateDocument } from '../db/documents';

export type ConflictResolution = 'local' | 'remote' | 'merge' | 'manual';

export interface ResolvedConflict {
  id: string;
  field: string;
  resolution: ConflictResolution;
  resolvedValue?: unknown;
}

export interface ConflictResolutionStrategy {
  field: string;
  strategy: 'latest' | 'manual' | 'merge' | 'local-priority' | 'remote-priority';
  mergeFunction?: (localValue: unknown, remoteValue: unknown) => unknown;
}

export class ConflictResolver {
  private static instance: ConflictResolver;

  // Default resolution strategies for different fields
  private defaultStrategies: ConflictResolutionStrategy[] = [
    {
      field: 'title',
      strategy: 'latest', // Use most recently modified
    },
    {
      field: 'content',
      strategy: 'manual', // Always require manual intervention for content
    },
    {
      field: 'font',
      strategy: 'latest',
    },
    {
      field: 'icon',
      strategy: 'latest',
    },
    {
      field: 'coverImage',
      strategy: 'latest',
    },
    {
      field: 'isFavorite',
      strategy: 'merge', // Merge boolean values (true if either is true)
    },
    {
      field: 'lastOpenedAt',
      strategy: 'latest',
    },
  ];

  private constructor() {}

  static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  // Resolve all conflicts for a document using default strategies
  async resolveConflicts(
    documentId: string,
    conflicts: Conflict[],
    customResolutions?: ResolvedConflict[]
  ): Promise<void> {
    const resolvedConflicts: ResolvedConflict[] = [];

    for (const conflict of conflicts) {
      const customResolution = customResolutions?.find(r => r.id === conflict.id);

      if (customResolution) {
        // Use provided resolution
        resolvedConflicts.push(customResolution);
      } else {
        // Use default strategy
        const resolution = await this.resolveConflictWithStrategy(conflict);
        resolvedConflicts.push(resolution);
      }
    }

    // Apply resolutions to document
    await this.applyResolutions(documentId, resolvedConflicts);
  }

  // Resolve a single conflict using default strategy
  private async resolveConflictWithStrategy(conflict: Conflict): Promise<ResolvedConflict> {
    const strategy = this.defaultStrategies.find(s => s.field === conflict.field)?.strategy || 'manual';

    switch (strategy) {
      case 'latest':
        return this.resolveWithLatest(conflict);

      case 'merge':
        return this.resolveWithMerge(conflict);

      case 'local-priority':
        return {
          id: conflict.id,
          field: conflict.field,
          resolution: 'local',
          resolvedValue: conflict.localValue
        };

      case 'remote-priority':
        return {
          id: conflict.id,
          field: conflict.field,
          resolution: 'remote',
          resolvedValue: conflict.remoteValue
        };

      case 'manual':
      default:
        // Manual resolution requires user input
        return {
          id: conflict.id,
          field: conflict.field,
          resolution: 'manual',
          resolvedValue: conflict.localValue // Keep local value as default
        };
    }
  }

  // Resolve conflict by choosing the most recently modified version
  private resolveWithLatest(conflict: Conflict): ResolvedConflict {
    const localTime = new Date(conflict.localTimestamp).getTime();
    const remoteTime = new Date(conflict.remoteTimestamp).getTime();

    const isLocalNewer = localTime > remoteTime;

    return {
      id: conflict.id,
      field: conflict.field,
      resolution: isLocalNewer ? 'local' : 'remote',
      resolvedValue: isLocalNewer ? conflict.localValue : conflict.remoteValue
    };
  }

  // Resolve conflict by merging values
  private resolveWithMerge(conflict: Conflict): ResolvedConflict {
    const mergedValue = this.mergeValues(conflict.field, conflict.localValue, conflict.remoteValue);

    return {
      id: conflict.id,
      field: conflict.field,
      resolution: 'merge',
      resolvedValue: mergedValue
    };
  }

  // Merge two values based on field type
  private mergeValues(field: string, localValue: unknown, remoteValue: unknown): unknown {
    switch (field) {
      case 'isFavorite':
        // If either version is favorited, keep it favorited
        return Boolean(localValue) || Boolean(remoteValue);

      case 'title':
        // For titles, try to concatenate if different
        const localStr = String(localValue || '');
        const remoteStr = String(remoteValue || '');

        if (localStr === remoteStr) {
          return localStr;
        }

        // If they're different, use the longer one (likely more descriptive)
        return localStr.length > remoteStr.length ? localStr : remoteStr;

      case 'content':
        // For content, we can't safely merge without user intervention
        // Return the more recently modified version
        return localValue; // This should be handled by 'latest' strategy instead

      default:
        // For other fields, prefer the non-null/non-undefined value
        return localValue != null ? localValue : remoteValue;
    }
  }

  // Apply resolved conflicts to document
  private async applyResolutions(documentId: string, resolutions: ResolvedConflict[]): Promise<void> {
    const updates: Partial<Document> = {
      conflicts: [] // Clear conflicts after resolution
    };

    // Apply each resolved conflict
    for (const resolution of resolutions) {
      if (resolution.resolvedValue !== undefined) {
        (updates as any)[resolution.field] = resolution.resolvedValue;
      }
    }

    // Mark as synced
    updates.cloudSynced = true;
    updates.lastSyncAt = new Date();
    updates.syncError = undefined;

    // Increment sync version
    const currentDoc = await this.getDocument(documentId);
    if (currentDoc) {
      updates.syncVersion = currentDoc.syncVersion + 1;
    }

    await updateDocument(documentId, updates);
  }

  // Helper to get document (avoid circular dependency)
  private async getDocument(documentId: string): Promise<Document | undefined> {
    // Import here to avoid circular dependency
    const { getDocument } = await import('../db/documents');
    return getDocument(documentId);
  }

  // Get human-readable conflict description
  getConflictDescription(conflict: Conflict): string {
    const fieldName = this.getFieldDisplayName(conflict.field);
    const strategy = this.defaultStrategies.find(s => s.field === conflict.field)?.strategy || 'manual';

    switch (strategy) {
      case 'latest':
        return `${fieldName}: Modified locally ${this.formatTimeAgo(conflict.localTimestamp)} and remotely ${this.formatTimeAgo(conflict.remoteTimestamp)}`;

      case 'merge':
        return `${fieldName}: Different values locally and remotely`;

      case 'manual':
      default:
        return `${fieldName}: Manual resolution required - Local: "${this.formatValue(conflict.localValue)}", Remote: "${this.formatValue(conflict.remoteValue)}"`;
    }
  }

  // Get display name for field
  private getFieldDisplayName(field: string): string {
    const displayNames: Record<string, string> = {
      title: 'Title',
      content: 'Content',
      font: 'Font',
      icon: 'Icon',
      coverImage: 'Cover Image',
      isFavorite: 'Favorite Status',
      lastOpenedAt: 'Last Opened'
    };

    return displayNames[field] || field;
  }

  // Format time ago for display
  private formatTimeAgo(timestamp: Date): string {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diffMs = now - time;

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  // Format value for display
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return 'empty';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') {
      if (value.length > 50) return value.substring(0, 50) + '...';
      return value;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).substring(0, 50) + '...';
      } catch {
        return 'object';
      }
    }
    return String(value);
  }

  // Detect conflicts between two documents
  detectConflicts(localDoc: Document, remoteDoc: any): Conflict[] {
    const conflicts: Conflict[] = [];
    const lastSync = localDoc.lastSyncAt ? new Date(localDoc.lastSyncAt).getTime() : 0;

    // Check each field for conflicts
    const fieldsToCheck: (keyof Document)[] = [
      'title', 'content', 'font', 'icon', 'coverImage', 'isFavorite', 'lastOpenedAt'
    ];

    for (const field of fieldsToCheck) {
      const localValue = localDoc[field];
      const remoteValue = remoteDoc[field];

      // Skip if values are the same
      if (JSON.stringify(localValue) === JSON.stringify(remoteValue)) {
        continue;
      }

      // Check if both were modified after last sync
      const localModified = new Date(localDoc.updatedAt).getTime();
      const remoteModified = new Date(remoteDoc.updatedAt).getTime();

      const localModifiedAfterSync = localModified > lastSync;
      const remoteModifiedAfterSync = remoteModified > lastSync;

      if (localModifiedAfterSync && remoteModifiedAfterSync) {
        // Both modified after last sync - this is a conflict
        conflicts.push({
          id: `${field}_${Date.now()}_${Math.random()}`,
          field,
          localValue,
          remoteValue,
          localTimestamp: localDoc.updatedAt,
          remoteTimestamp: new Date(remoteDoc.updatedAt),
          resolved: false
        });
      }
    }

    return conflicts;
  }

  // Auto-resolve conflicts that don't need user intervention
  async autoResolveConflicts(documentId: string, conflicts: Conflict[]): Promise<{
    resolved: Conflict[];
    remaining: Conflict[];
  }> {
    const resolved: Conflict[] = [];
    const remaining: Conflict[] = [];

    for (const conflict of conflicts) {
      const strategy = this.defaultStrategies.find(s => s.field === conflict.field)?.strategy;

      if (strategy && strategy !== 'manual') {
        try {
          const resolution = await this.resolveConflictWithStrategy(conflict);
          await this.applyResolutions(documentId, [resolution]);

          // Mark conflict as resolved
          resolved.push({
            ...conflict,
            resolved: true,
            resolution: resolution.resolution
          });
        } catch (error) {
          console.error('Failed to auto-resolve conflict:', conflict, error);
          remaining.push(conflict);
        }
      } else {
        remaining.push(conflict);
      }
    }

    return { resolved, remaining };
  }
}

// Export singleton instance
export const conflictResolver = ConflictResolver.getInstance();