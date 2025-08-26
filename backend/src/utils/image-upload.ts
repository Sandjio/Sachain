/**
 * Image upload service for project cover images
 * Handles direct S3 upload, validation, and thumbnail generation
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

export interface ImageUploadConfig {
  bucketName: string;
  region: string;
  maxFileSize: number; // in bytes (5MB for cover images)
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  minWidth: number;
  minHeight: number;
  thumbnailSizes: Array<{ width: number; height: number; suffix: string }>;
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  imageInfo?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export interface ImageUploadRequest {
  imageBuffer: Buffer;
  fileName: string;
  mimeType: string;
  projectId: string;
  userId: string;
}

export interface ImageUploadResult {
  success: boolean;
  originalImageUrl?: string;
  thumbnails?: Array<{
    size: string;
    url: string;
    width: number;
    height: number;
  }>;
  error?: string;
}

export class ImageUploadError extends Error {
  constructor(message: string, public code: string, public statusCode: number) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export class ImageUploadService {
  private s3Client: S3Client;
  private config: ImageUploadConfig;

  constructor(config: ImageUploadConfig) {
    this.config = config;
    this.s3Client = new S3Client({
      region: config.region,
    });
  }

  /**
   * Validate image file before processing
   */
  async validateImage(
    imageBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<ImageValidationResult> {
    const errors: string[] = [];

    try {
      // Basic file validation
      if (imageBuffer.length === 0) {
        errors.push("Image file is empty");
        return { isValid: false, errors };
      }

      if (imageBuffer.length > this.config.maxFileSize) {
        const maxSizeMB = Math.round(this.config.maxFileSize / (1024 * 1024));
        const actualSizeMB =
          Math.round((imageBuffer.length / (1024 * 1024)) * 100) / 100;
        errors.push(
          `Image size ${actualSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`
        );
      }

      // Validate MIME type
      if (!this.config.allowedMimeTypes.includes(mimeType)) {
        errors.push(
          `Invalid image type. Allowed types: ${this.config.allowedMimeTypes.join(
            ", "
          )}`
        );
      }

      // Validate file extension
      const extension = this.getFileExtension(fileName);
      if (!this.config.allowedExtensions.includes(extension.toLowerCase())) {
        errors.push(
          `Invalid file extension. Allowed extensions: ${this.config.allowedExtensions.join(
            ", "
          )}`
        );
      }

      // Use Sharp to validate and get image metadata
      const metadata = await sharp(imageBuffer).metadata();

      if (!metadata.width || !metadata.height) {
        errors.push("Unable to read image dimensions");
        return { isValid: false, errors };
      }

      // Validate dimensions
      if (
        metadata.width < this.config.minWidth ||
        metadata.height < this.config.minHeight
      ) {
        errors.push(
          `Image dimensions ${metadata.width}x${metadata.height} are too small. Minimum required: ${this.config.minWidth}x${this.config.minHeight}`
        );
      }

      // Validate format matches MIME type
      const expectedFormat = this.mimeTypeToFormat(mimeType);
      if (metadata.format !== expectedFormat) {
        errors.push(
          `Image format ${metadata.format} does not match declared type ${mimeType}`
        );
      }

      const imageInfo = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || "unknown",
        size: imageBuffer.length,
      };

      return {
        isValid: errors.length === 0,
        errors,
        imageInfo,
      };
    } catch (error: any) {
      errors.push(`Failed to process image: ${error.message}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Upload image with thumbnail generation
   */
  async uploadImage(request: ImageUploadRequest): Promise<ImageUploadResult> {
    try {
      // Validate image first
      const validation = await this.validateImage(
        request.imageBuffer,
        request.fileName,
        request.mimeType
      );

      if (!validation.isValid) {
        throw new ImageUploadError(
          `Image validation failed: ${validation.errors.join(", ")}`,
          "VALIDATION_ERROR",
          400
        );
      }

      const uploadId = uuidv4();
      const baseKey = this.generateImageKey(
        request.projectId,
        request.userId,
        uploadId
      );

      // Upload original image
      const originalKey = `${baseKey}/original${this.getFileExtension(
        request.fileName
      )}`;
      await this.uploadToS3(originalKey, request.imageBuffer, request.mimeType);

      const originalImageUrl = this.getImageUrl(originalKey);

      // Generate and upload thumbnails
      const thumbnails = await this.generateAndUploadThumbnails(
        request.imageBuffer,
        baseKey
      );

      this.logImageUploadSuccess(
        request.projectId,
        originalKey,
        validation.imageInfo!
      );

      return {
        success: true,
        originalImageUrl,
        thumbnails,
      };
    } catch (error: any) {
      this.logImageUploadError(request.projectId, error);

      if (error instanceof ImageUploadError) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Failed to upload image. Please try again.",
      };
    }
  }

  /**
   * Delete image and all its thumbnails
   */
  async deleteImage(
    imageUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const key = this.extractKeyFromUrl(imageUrl);
      if (!key) {
        throw new ImageUploadError("Invalid image URL", "INVALID_URL", 400);
      }

      // Extract base key (remove /original.ext part)
      const baseKey = key.substring(0, key.lastIndexOf("/"));

      // Delete original image
      await this.deleteFromS3(key);

      // Delete all thumbnails
      for (const thumbnailConfig of this.config.thumbnailSizes) {
        const thumbnailKey = `${baseKey}/thumbnail_${thumbnailConfig.suffix}.jpg`;
        await this.deleteFromS3(thumbnailKey);
      }

      this.logImageDeletion(key);

      return { success: true };
    } catch (error: any) {
      this.logImageDeletionError(imageUrl, error);

      return {
        success: false,
        error:
          error instanceof ImageUploadError
            ? error.message
            : "Failed to delete image",
      };
    }
  }

  /**
   * Generate and upload thumbnails
   */
  private async generateAndUploadThumbnails(
    originalBuffer: Buffer,
    baseKey: string
  ): Promise<
    Array<{ size: string; url: string; width: number; height: number }>
  > {
    const thumbnails = [];

    for (const thumbnailConfig of this.config.thumbnailSizes) {
      try {
        // Generate thumbnail using Sharp
        const thumbnailBuffer = await sharp(originalBuffer)
          .resize(thumbnailConfig.width, thumbnailConfig.height, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        // Upload thumbnail
        const thumbnailKey = `${baseKey}/thumbnail_${thumbnailConfig.suffix}.jpg`;
        await this.uploadToS3(thumbnailKey, thumbnailBuffer, "image/jpeg");

        thumbnails.push({
          size: thumbnailConfig.suffix,
          url: this.getImageUrl(thumbnailKey),
          width: thumbnailConfig.width,
          height: thumbnailConfig.height,
        });
      } catch (error: any) {
        console.error(
          `Failed to generate thumbnail ${thumbnailConfig.suffix}:`,
          error
        );
        // Continue with other thumbnails even if one fails
      }
    }

    return thumbnails;
  }

  /**
   * Upload buffer to S3
   */
  private async uploadToS3(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
      Metadata: {
        "upload-timestamp": new Date().toISOString(),
        "content-length": buffer.length.toString(),
      },
    });

    await this.s3Client.send(command);
  }

  /**
   * Delete object from S3
   */
  private async deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Generate S3 key for image
   */
  private generateImageKey(
    projectId: string,
    userId: string,
    uploadId: string
  ): string {
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `project-images/${projectId}/${userId}/${timestamp}/${uploadId}`;
  }

  /**
   * Get public URL for image
   */
  private getImageUrl(key: string): string {
    return `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  /**
   * Extract S3 key from URL
   */
  private extractKeyFromUrl(url: string): string | null {
    const match = url.match(
      /https:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/(.+)/
    );
    return match ? match[1] : null;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot !== -1 ? fileName.substring(lastDot) : "";
  }

  /**
   * Convert MIME type to Sharp format
   */
  private mimeTypeToFormat(mimeType: string): string {
    switch (mimeType) {
      case "image/jpeg":
        return "jpeg";
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      default:
        return "unknown";
    }
  }

  // Logging methods
  private logImageUploadSuccess(
    projectId: string,
    s3Key: string,
    imageInfo: { width: number; height: number; format: string; size: number }
  ): void {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        service: "ImageUpload",
        operation: "uploadImage",
        message: "Image uploaded successfully",
        projectId,
        s3Key,
        imageInfo,
        bucket: this.config.bucketName,
      })
    );
  }

  private logImageUploadError(projectId: string, error: any): void {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        service: "ImageUpload",
        operation: "uploadImage",
        message: "Image upload failed",
        projectId,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
      })
    );
  }

  private logImageDeletion(s3Key: string): void {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        service: "ImageUpload",
        operation: "deleteImage",
        message: "Image deleted successfully",
        s3Key,
        bucket: this.config.bucketName,
      })
    );
  }

  private logImageDeletionError(imageUrl: string, error: any): void {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        service: "ImageUpload",
        operation: "deleteImage",
        message: "Image deletion failed",
        imageUrl,
        error: error.message,
        errorName: error.name,
      })
    );
  }
}

/**
 * Default configuration for project cover images
 */
export const createProjectImageConfig = (
  bucketName: string,
  region: string
): ImageUploadConfig => ({
  bucketName,
  region,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ["image/jpeg", "image/png"],
  allowedExtensions: [".jpg", ".jpeg", ".png"],
  minWidth: 400,
  minHeight: 300,
  thumbnailSizes: [
    { width: 150, height: 150, suffix: "small" },
    { width: 300, height: 225, suffix: "medium" },
    { width: 600, height: 450, suffix: "large" },
  ],
});

/**
 * Factory function to create image upload service for project cover images
 */
export const createProjectImageUploadService = (
  bucketName: string,
  region: string
): ImageUploadService => {
  const config = createProjectImageConfig(bucketName, region);
  return new ImageUploadService(config);
};
