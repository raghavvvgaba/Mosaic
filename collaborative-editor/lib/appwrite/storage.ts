import { getAppwrite, ID, Permission, Role } from './config';
import type { Models } from 'appwrite';

/**
 * Storage Service
 * Handles avatar file uploads and management
 */

const AVATARS_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_AVATARS_BUCKET_ID || 'avatars';

// Supported image formats for avatars
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Max file size: 5MB (Appwrite limit is higher but reasonable for avatars)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface AvatarUploadResult {
  fileId: string;
  url: string;
}

export class StorageService {
  /**
   * Upload a new avatar for the current user
   * @param file - The image file to upload
   * @param userId - Current user ID (for naming)
   * @returns The file ID and preview URL
   */
  static async uploadAvatar(file: File, userId: string): Promise<AvatarUploadResult> {
    const { storage } = getAppwrite();

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(
        'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit. Please choose a smaller image.');
    }

    try {
      // Create a unique file ID based on user ID and timestamp
      const fileId = ID.unique();

      // Upload the file
      const result = await storage.createFile({
        bucketId: AVATARS_BUCKET_ID,
        fileId: fileId,
        file: file,
        // Allow anyone to read (view) the avatar, but only the user can modify/delete
        permissions: [
          Permission.read(Role.any()), // Public read access - allows avatars to display in <img> tags
          Permission.update(Role.user(userId)), // Only the user can update
          Permission.delete(Role.user(userId)), // Only the user can delete
        ],
      });

      // Get the preview URL
      const url = this.getAvatarPreviewUrl(result.$id);

      return {
        fileId: result.$id,
        url,
      };
    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      throw new Error(error.message || 'Failed to upload avatar');
    }
  }

  /**
   * Delete an avatar file
   * @param fileId - The file ID to delete
   */
  static async deleteAvatar(fileId: string): Promise<void> {
    const { storage } = getAppwrite();

    try {
      await storage.deleteFile({
        bucketId: AVATARS_BUCKET_ID,
        fileId: fileId,
      });
    } catch (error: any) {
      console.error('Avatar deletion failed:', error);
      // Don't throw - avatar deletion shouldn't block other operations
      console.warn('Failed to delete old avatar file:', fileId);
    }
  }

  /**
   * Get the preview URL for an avatar file
   * @param fileId - The file ID
   * @param width - Optional width for resizing (default: 200)
   * @param height - Optional height for resizing (default: 200)
   * @returns The preview URL
   */
  static getAvatarPreviewUrl(
    fileId: string,
    width: number = 200,
    height: number = 200
  ): string {
    const { endpoint } = getAppwrite().client;
    const { config } = getAppwrite();

    // Get the project ID from the config
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

    // Construct the preview URL manually
    // Format: https://[endpoint]/v1/storage/buckets/[bucketId]/files/[fileId]/preview?project=[projectId]&width=[width]&height=[height]
    return `${endpoint}/storage/buckets/${AVATARS_BUCKET_ID}/files/${fileId}/preview?project=${projectId}&width=${width}&height=${height}&gravity=center&quality=80`;
  }

  /**
   * Get file view URL (for downloading)
   */
  static getAvatarViewUrl(fileId: string): string {
    const { endpoint } = getAppwrite().client;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

    return `${endpoint}/storage/buckets/${AVATARS_BUCKET_ID}/files/${fileId}/view?project=${projectId}`;
  }

  /**
   * Replace an avatar with a new one (uploads new, deletes old)
   * @param file - The new image file
   * @param userId - Current user ID
   * @param oldFileId - The old avatar file ID to delete (optional)
   * @returns The new file ID and preview URL
   */
  static async replaceAvatar(
    file: File,
    userId: string,
    oldFileId?: string
  ): Promise<AvatarUploadResult> {
    // Upload the new avatar first
    const result = await this.uploadAvatar(file, userId);

    // Delete the old avatar if it exists
    if (oldFileId) {
      await this.deleteAvatar(oldFileId);
    }

    return result;
  }

  /**
   * Validate an avatar file before upload
   * @param file - The file to validate
   * @returns An error message if invalid, null if valid
   */
  static validateAvatarFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 5MB limit. Please choose a smaller image.';
    }

    return null;
  }
}
