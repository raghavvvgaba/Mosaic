import { getAppwrite } from './config';
import type { UserPreferences } from '@/lib/db/types';

/**
 * Preferences Service
 * Handles user preferences stored in Appwrite Account preferences
 * Note: updatePrefs REPLACES the entire object, not merges
 * Max size: 64kB
 */

export class PreferencesService {
  /**
   * Get all user preferences from Appwrite
   */
  static async getPreferences(): Promise<UserPreferences> {
    const { account } = getAppwrite();

    try {
      const prefs = await account.getPrefs();

      // Appwrite returns the raw prefs object, we need to validate/merge with defaults
      return this.mergeWithDefaults(prefs);
    } catch (error) {
      console.error('Failed to get preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Update specific preferences (merges with existing to avoid data loss)
   */
  static async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const { account } = getAppwrite();

    try {
      // Get current preferences first to merge
      const currentPrefs = await this.getPreferences();

      // Merge updates with current preferences
      const newPrefs = this.deepMerge(currentPrefs, updates);

      // Update on Appwrite (replaces entire object)
      await account.updatePrefs({ prefs: newPrefs });

      return newPrefs;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Reset all preferences to defaults
   */
  static async resetPreferences(): Promise<UserPreferences> {
    const { account } = getAppwrite();

    const defaults = this.getDefaultPreferences();
    await account.updatePrefs({ prefs: defaults });

    return defaults;
  }

  /**
   * Get default preferences
   */
  private static getDefaultPreferences(): UserPreferences {
    return {
      theme: 'dark',
      font: 'sans',
      fontSize: 16,
      avatarId: undefined,
    };
  }

  /**
   * Merge fetched preferences with defaults (handles missing keys)
   */
  private static mergeWithDefaults(fetchedPrefs: any): UserPreferences {
    const defaults = this.getDefaultPreferences();

    return {
      theme: fetchedPrefs.theme ?? defaults.theme,
      font: fetchedPrefs.font ?? defaults.font,
      fontSize: fetchedPrefs.fontSize ?? defaults.fontSize,
      avatarId: fetchedPrefs.avatarId ?? defaults.avatarId,
    };
  }

  /**
   * Deep merge objects to avoid losing nested data
   */
  private static deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] instanceof Object && key in target && !(source[key] instanceof Array)) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}
