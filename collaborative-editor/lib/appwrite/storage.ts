import { getAppwrite, ID, Permission, Role, appwriteConfig } from './config';

/**
 * Storage Service
 * Handles avatar file uploads and management
 */

const AVATARS_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_AVATARS_BUCKET_ID || 'avatars';
const DOCUMENT_IMAGES_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_DOCUMENT_IMAGES_BUCKET_ID || 'document-images';

// Supported image formats (shared across avatars and document images)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Max file sizes
const AVATARS_MAX_SIZE = 5 * 1024 * 1024; // 5MB for avatars
const DOCUMENT_IMAGES_MAX_SIZE = 15 * 1024 * 1024; // 15MB for document images

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'string') {
    return error || fallback;
  }
  return fallback;
};

export interface AvatarUploadResult {
  fileId: string;
  url: string;
}

export interface DocumentImageUploadResult {
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
    if (file.size > AVATARS_MAX_SIZE) {
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
    } catch (error: unknown) {
      console.error('Avatar upload failed:', error);
      throw new Error(getErrorMessage(error, 'Failed to upload avatar'));
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
    } catch (error: unknown) {
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
    const endpoint = appwriteConfig.endpoint;

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
    const endpoint = appwriteConfig.endpoint;
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

    if (file.size > AVATARS_MAX_SIZE) {
      return 'File size exceeds 5MB limit. Please choose a smaller image.';
    }

    return null;
  }

  // ========== DOCUMENT IMAGE METHODS ==========

  /**
   * Upload a new document image
   * @param file - The image file to upload
   * @param userId - Current user ID (for permissions, optional)
   * @returns The view URL (original quality, no transformations, faster loading)
   */
  static async uploadDocumentImage(file: File, userId?: string): Promise<string> {
    const { storage } = getAppwrite();

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(
        'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
      );
    }

    // Validate file size
    if (file.size > DOCUMENT_IMAGES_MAX_SIZE) {
      throw new Error('File size exceeds 15MB limit. Please choose a smaller image.');
    }

    try {
      // Create a unique file ID
      const fileId = ID.unique();

      // Build permissions array
      const permissions = [
        Permission.read(Role.any()), // Public read access - allows images to display in <img> tags
      ];

      // Add write permissions if user is authenticated
      if (userId) {
        permissions.push(
          Permission.update(Role.user(userId)), // Only the user can update
          Permission.delete(Role.user(userId)) // Only the user can delete
        );
      }

      // Upload the file
      const result = await storage.createFile({
        bucketId: DOCUMENT_IMAGES_BUCKET_ID,
        fileId: fileId,
        file: file,
        permissions,
      });

      // Get the view URL (original quality, no transformations, faster loading)
      const url = this.getDocumentImageViewUrl(result.$id);

      return url;
    } catch (error: unknown) {
      console.error('Document image upload failed:', error);
      throw new Error(getErrorMessage(error, 'Failed to upload image'));
    }
  }

  /**
   * Delete a document image file
   * @param fileId - The file ID to delete
   */
  static async deleteDocumentImage(fileId: string): Promise<void> {
    const { storage } = getAppwrite();

    try {
      await storage.deleteFile({
        bucketId: DOCUMENT_IMAGES_BUCKET_ID,
        fileId: fileId,
      });
    } catch (error: unknown) {
      console.error('Document image deletion failed:', error);
      // Don't throw - image deletion shouldn't block other operations
      console.warn('Failed to delete document image file:', fileId);
    }
  }

  /**
   * Get the URL for a document image file
   * @param fileId - The file ID
   * @returns The view URL (original quality, no transformations, faster loading)
   */
  static getDocumentImageUrl(fileId: string): string {
    // For document images, use view endpoint (original quality, no processing, faster)
    return this.getDocumentImageViewUrl(fileId);
  }

  /**
   * Get file view URL for full-size document image
   * Uses /view endpoint: original quality, no transformations, fast loading, CDN cached
   * @param fileId - The file ID
   * @returns The view URL
   */
  static getDocumentImageViewUrl(fileId: string): string {
    const endpoint = appwriteConfig.endpoint;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

    return `${endpoint}/storage/buckets/${DOCUMENT_IMAGES_BUCKET_ID}/files/${fileId}/view?project=${projectId}`;
  }

  /**
   * Validate a document image file before upload
   * @param file - The file to validate
   * @returns An error message if invalid, null if valid
   */
  static validateDocumentImageFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.';
    }

    if (file.size > DOCUMENT_IMAGES_MAX_SIZE) {
      return 'File size exceeds 15MB limit. Please choose a smaller image.';
    }

    return null;
  }
}
