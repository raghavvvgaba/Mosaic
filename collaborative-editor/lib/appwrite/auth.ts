import { getAppwrite, ID } from './config';
import { StorageService } from './storage';
import { PreferencesService } from './preferences';

export class AuthService {
  /**
   * Sign up a new user
   */
  static async signUp(name: string, email: string, password: string) {
    const { account } = getAppwrite();

    // Create user account
    const user = await account.create(ID.unique(), email, password, name);

    // Create session for the new user
    const session = await account.createEmailPasswordSession(email, password);

    return { user, session };
  }

  /**
   * Sign in existing user
   */
  static async signIn(email: string, password: string) {
    const { account } = getAppwrite();

    // Create session
    const session = await account.createEmailPasswordSession(email, password);

    // Get user data
    const user = await account.get();

    return { user, session };
  }

  /**
   * Get current user
   */
  static async getCurrentUser() {
    const { account } = getAppwrite();
    return await account.get();
  }

  /**
   * Sign out user (current session)
   */
  static async signOut() {
    const { account } = getAppwrite();
    const result = await account.deleteSession('current');

    // Clear user cache in documents module
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('userLoggedOut'));
    }

    return result;
  }

  /**
   * Update user name
   */
  static async updateName(name: string) {
    const { account } = getAppwrite();
    return await account.updateName(name);
  }

  /**
   * Update user email
   */
  static async updateEmail(email: string, password: string) {
    const { account } = getAppwrite();
    return await account.updateEmail(email, password);
  }

  /**
   * Update user password
   */
  static async updatePassword(newPassword: string, oldPassword: string) {
    const { account } = getAppwrite();
    return await account.updatePassword(newPassword, oldPassword);
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification() {
    const { account } = getAppwrite();
    // createEmailVerification requires a redirect URL parameter
    // Use the current origin as the redirect URL
    const redirectUrl = `${window.location.origin}/auth/verify-email`;
    return await account.createEmailVerification(redirectUrl);
  }

  /**
   * Send password recovery email
   */
  static async sendPasswordRecovery(email: string, redirectUrl: string) {
    const { account } = getAppwrite();
    return await account.createRecovery(email, redirectUrl);
  }

  /**
   * Complete password reset
   */
  static async resetPassword(userId: string, secret: string, newPassword: string) {
    const { account } = getAppwrite();
    return await account.updateRecovery(userId, secret, newPassword);
  }

  /**
   * Get all active sessions
   */
  static async getSessions() {
    const { account } = getAppwrite();
    return await account.listSessions();
  }

  /**
   * Sign out from all sessions
   */
  static async signOutAll() {
    const { account } = getAppwrite();
    const result = await account.deleteSessions();

    // Clear user cache in documents module
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('userLoggedOut'));
    }

    return result;
  }

  /**
   * Delete a specific session
   */
  static async deleteSession(sessionId: string) {
    const { account } = getAppwrite();
    return await account.deleteSession(sessionId);
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated() {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  }

  /**
   * Update user avatar
   * Uploads the new avatar file, deletes the old one, and updates preferences
   */
  static async updateAvatar(file: File, oldAvatarId?: string) {
    const { account } = getAppwrite();

    // Get current user
    const user = await this.getCurrentUser();
    const userId = user.$id;

    // Upload new avatar and delete old one
    const result = await StorageService.replaceAvatar(file, userId, oldAvatarId);

    // Update avatarId in preferences using PreferencesService
    const currentPrefs = await PreferencesService.getPreferences();
    const newPrefs = {
      ...currentPrefs,
      avatarId: result.fileId,
    };

    // Update user prefs with the new avatar ID
    await account.updatePrefs({ prefs: newPrefs });

    return { fileId: result.fileId, url: result.url };
  }

  /**
   * Delete user avatar
   */
  static async deleteAvatar(avatarId: string) {
    const { account } = getAppwrite();

    // Delete the file from storage
    await StorageService.deleteAvatar(avatarId);

    // Remove avatar ID from preferences using PreferencesService
    const currentPrefs = await PreferencesService.getPreferences();
    const newPrefs = { ...currentPrefs };
    delete newPrefs.avatarId;

    await account.updatePrefs({ prefs: newPrefs });

    return { success: true };
  }

  /**
   * Get current user with avatar URL
   */
  static async getUserWithAvatar() {
    const user = await this.getCurrentUser();
    const preferences = await PreferencesService.getPreferences();
    const avatarId = preferences.avatarId;

    return {
      ...user,
      avatarUrl: avatarId ? StorageService.getAvatarPreviewUrl(avatarId) : undefined,
    };
  }
}