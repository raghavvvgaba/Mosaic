import { getAppwrite, ID } from './config';

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
    return await account.deleteSession('current');
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
    return await account.deleteSessions();
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
}