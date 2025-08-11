/**
 * S3 upload utilities with retry logic and file validation
 * Provides secure file upload functionality with exponential backoff
 */

import * as AWS from "aws-sdk";
import { ExponentialBackoff, RetryConfig } from "./retry";
import { ErrorClassifier, ErrorCategory } from "./error-handler";

export interface S3UploadConfig {
  bucketName: string;
  region: string;
  kmsKeyId?: string;
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  retryConfig?: Partial<RetryConfig>;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  fileInfo?: {
    size: number;
    mimeType: string;
    extension: string;
  };
}

export interface S3UploadRequest {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  userId: string;
  documentType: string;
  metadata?: Record<string, string>;
}

export interface S3UploadResult {
  success: boolean;
  s3Key: string;
  s3Bucket: string;
  uploadId: string;
  fileSize: number;
  etag?: string;
  versionId?: string;
  error?: string;
}

export interface PresignedUrlRequest {
  s3Key: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
  operation: "getObject" | "putObject";
}

export interface PresignedUrlResult {
  success: boolean;
  url?: string;
  expiresAt?: Date;
  error?: string;
}

export class S3UploadError extends Error {
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly s3Key?: string;
  public readonly uploadId?: string;

  constructor(
    message: string,
    category: ErrorCategory,
    retryable: boolean,
    s3Key?: string,
    uploadId?: string
  ) {
    super(message);
    this.name = "S3UploadError";
    this.category = category;
    this.retryable = retryable;
    this.s3Key = s3Key;
    this.uploadId = uploadId;
  }
}

export class S3UploadUtility {
  private s3: AWS.S3;
  private config: S3UploadConfig;
  private retry: ExponentialBackoff;

  constructor(config: S3UploadConfig) {
    this.config = config;
    this.s3 = new AWS.S3({
      region: config.region,
      signatureVersion: "v4",
    });

    // Configure retry with S3-specific settings
    this.retry = new ExponentialBackoff({
      maxRetries: 3,
      baseDelay: 200,
      maxDelay: 10000,
      jitterType: "full",
      retryableErrors: [
        "ServiceUnavailable",
        "SlowDown",
        "RequestTimeout",
        "RequestTimeTooSkewed",
        "InternalError",
        "NetworkingError",
        "ThrottlingException",
        "ProvisionedThroughputExceededException",
      ],
      ...config.retryConfig,
    });
  }

  /**
   * Validate file before upload
   */
  validateFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): FileValidationResult {
    const errors: string[] = [];
    const fileSize = fileBuffer.length;
    const extension = this.getFileExtension(fileName);

    // Check file size
    if (fileSize > this.config.maxFileSize) {
      errors.push(
        `File size ${fileSize} bytes exceeds maximum allowed size of ${this.config.maxFileSize} bytes`
      );
    }

    if (fileSize === 0) {
      errors.push("File is empty");
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(mimeType)) {
      errors.push(
        `MIME type ${mimeType} is not allowed. Allowed types: ${this.config.allowedMimeTypes.join(
          ", "
        )}`
      );
    }

    // Check file extension
    if (!this.config.allowedExtensions.includes(extension.toLowerCase())) {
      errors.push(
        `File extension ${extension} is not allowed. Allowed extensions: ${this.config.allowedExtensions.join(
          ", "
        )}`
      );
    }

    // Basic file header validation for common formats
    const validationErrors = this.validateFileHeader(fileBuffer, mimeType);
    errors.push(...validationErrors);

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo: {
        size: fileSize,
        mimeType,
        extension,
      },
    };
  }

  /**
   * Upload file to S3 with retry logic
   */
  async uploadFile(request: S3UploadRequest): Promise<S3UploadResult> {
    const uploadId = this.generateUploadId();
    const s3Key = this.generateS3Key(
      request.userId,
      request.documentType,
      request.fileName,
      uploadId
    );

    try {
      // Validate file first
      const validation = this.validateFile(
        request.fileBuffer,
        request.fileName,
        request.mimeType
      );

      if (!validation.isValid) {
        throw new S3UploadError(
          `File validation failed: ${validation.errors.join(", ")}`,
          ErrorCategory.VALIDATION,
          false,
          s3Key,
          uploadId
        );
      }

      // Prepare S3 upload parameters
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.config.bucketName,
        Key: s3Key,
        Body: request.fileBuffer,
        ContentType: request.mimeType,
        ContentLength: request.fileBuffer.length,
        ServerSideEncryption: "aws:kms",
        ...(this.config.kmsKeyId && { SSEKMSKeyId: this.config.kmsKeyId }),
        Metadata: {
          "original-filename": request.fileName,
          "user-id": request.userId,
          "document-type": request.documentType,
          "upload-id": uploadId,
          "upload-timestamp": new Date().toISOString(),
          ...request.metadata,
        },
        Tagging: this.buildObjectTags(request.userId, request.documentType),
      };

      // Execute upload with retry logic
      const result = await this.retry.execute(
        () => this.s3.upload(uploadParams).promise(),
        `S3Upload-${uploadId}`
      );

      this.logUploadSuccess(s3Key, uploadId, validation.fileInfo!.size);

      return {
        success: true,
        s3Key,
        s3Bucket: this.config.bucketName,
        uploadId,
        fileSize: validation.fileInfo!.size,
        etag: result.result.ETag,
        versionId: (result.result as any).VersionId,
      };
    } catch (error: any) {
      this.logUploadError(s3Key, uploadId, error);

      if (error instanceof S3UploadError) {
        return {
          success: false,
          s3Key,
          s3Bucket: this.config.bucketName,
          uploadId,
          fileSize: request.fileBuffer.length,
          error: error.message,
        };
      }

      // Classify S3 error
      const errorDetails = this.classifyS3Error(error);
      return {
        success: false,
        s3Key,
        s3Bucket: this.config.bucketName,
        uploadId,
        fileSize: request.fileBuffer.length,
        error: errorDetails.userMessage,
      };
    }
  }

  /**
   * Generate presigned URL for secure file access
   */
  async generatePresignedUrl(
    request: PresignedUrlRequest
  ): Promise<PresignedUrlResult> {
    try {
      const expiresIn = request.expiresIn || 3600; // Default 1 hour
      const operation =
        request.operation === "putObject" ? "putObject" : "getObject";

      const url = await this.s3.getSignedUrlPromise(operation, {
        Bucket: this.config.bucketName,
        Key: request.s3Key,
        Expires: expiresIn,
      });

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      this.logPresignedUrlGeneration(request.s3Key, operation, expiresAt);

      return {
        success: true,
        url,
        expiresAt,
      };
    } catch (error: any) {
      this.logPresignedUrlError(request.s3Key, error);

      const errorDetails = this.classifyS3Error(error);
      return {
        success: false,
        error: errorDetails.userMessage,
      };
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(
    s3Key: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.retry.execute(
        () =>
          this.s3
            .deleteObject({
              Bucket: this.config.bucketName,
              Key: s3Key,
            })
            .promise(),
        `S3Delete-${s3Key}`
      );

      this.logFileDeletion(s3Key);

      return { success: true };
    } catch (error: any) {
      this.logDeletionError(s3Key, error);

      const errorDetails = this.classifyS3Error(error);
      return {
        success: false,
        error: errorDetails.userMessage,
      };
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(s3Key: string): Promise<boolean> {
    try {
      await this.s3
        .headObject({
          Bucket: this.config.bucketName,
          Key: s3Key,
        })
        .promise();
      return true;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Generate unique S3 key for file
   */
  private generateS3Key(
    userId: string,
    documentType: string,
    fileName: string,
    uploadId: string
  ): string {
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const extension = this.getFileExtension(fileName);
    const sanitizedFileName = this.sanitizeFileName(fileName);

    return `kyc-documents/${userId}/${documentType}/${timestamp}/${uploadId}-${sanitizedFileName}${extension}`;
  }

  /**
   * Generate unique upload ID
   */
  private generateUploadId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot !== -1 ? fileName.substring(lastDot) : "";
  }

  /**
   * Sanitize filename for S3 key
   */
  private sanitizeFileName(fileName: string): string {
    // Remove extension and sanitize
    const nameWithoutExt =
      fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
    return nameWithoutExt
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  /**
   * Build object tags for S3 object
   */
  private buildObjectTags(userId: string, documentType: string): string {
    const tags = [
      `user-id=${userId}`,
      `document-type=${documentType}`,
      `upload-date=${new Date().toISOString().split("T")[0]}`,
      "data-classification=sensitive",
      "purpose=kyc-verification",
    ];
    return tags.join("&");
  }

  /**
   * Validate file header for basic format verification
   */
  private validateFileHeader(fileBuffer: Buffer, mimeType: string): string[] {
    const errors: string[] = [];

    if (fileBuffer.length < 4) {
      errors.push("File is too small to validate format");
      return errors;
    }

    const header = fileBuffer.subarray(0, 8);

    switch (mimeType) {
      case "image/jpeg":
        if (header[0] !== 0xff || header[1] !== 0xd8) {
          errors.push("File does not appear to be a valid JPEG image");
        }
        break;

      case "image/png":
        if (
          header[0] !== 0x89 ||
          header[1] !== 0x50 ||
          header[2] !== 0x4e ||
          header[3] !== 0x47
        ) {
          errors.push("File does not appear to be a valid PNG image");
        }
        break;

      case "application/pdf":
        if (
          header[0] !== 0x25 ||
          header[1] !== 0x50 ||
          header[2] !== 0x44 ||
          header[3] !== 0x46
        ) {
          errors.push("File does not appear to be a valid PDF document");
        }
        break;

      // Add more format validations as needed
    }

    return errors;
  }

  /**
   * Classify S3-specific errors
   */
  private classifyS3Error(error: any): {
    category: ErrorCategory;
    retryable: boolean;
    userMessage: string;
    technicalMessage: string;
  } {
    const errorCode = error.code || error.name;
    const statusCode = error.statusCode || error.$metadata?.httpStatusCode;

    switch (errorCode) {
      case "NoSuchBucket":
        return {
          category: ErrorCategory.SYSTEM,
          retryable: false,
          userMessage:
            "Storage service configuration error. Please contact support.",
          technicalMessage: "S3 bucket does not exist",
        };

      case "AccessDenied":
        return {
          category: ErrorCategory.AUTHORIZATION,
          retryable: false,
          userMessage: "You do not have permission to upload files.",
          technicalMessage: "S3 access denied",
        };

      case "EntityTooLarge":
        return {
          category: ErrorCategory.VALIDATION,
          retryable: false,
          userMessage: "File is too large to upload.",
          technicalMessage: "S3 entity too large",
        };

      case "SlowDown":
        return {
          category: ErrorCategory.RATE_LIMIT,
          retryable: true,
          userMessage: "Upload service is busy. Please try again in a moment.",
          technicalMessage: "S3 slow down error",
        };

      case "ServiceUnavailable":
      case "InternalError":
        return {
          category: ErrorCategory.SYSTEM,
          retryable: true,
          userMessage:
            "Upload service is temporarily unavailable. Please try again.",
          technicalMessage: "S3 service unavailable",
        };

      case "RequestTimeout":
        return {
          category: ErrorCategory.TRANSIENT,
          retryable: true,
          userMessage: "Upload timed out. Please try again.",
          technicalMessage: "S3 request timeout",
        };

      default:
        if (statusCode >= 500) {
          return {
            category: ErrorCategory.SYSTEM,
            retryable: true,
            userMessage: "Upload service error. Please try again.",
            technicalMessage: `S3 server error: ${error.message}`,
          };
        } else if (statusCode === 429) {
          return {
            category: ErrorCategory.RATE_LIMIT,
            retryable: true,
            userMessage:
              "Too many upload requests. Please try again in a moment.",
            technicalMessage: "S3 rate limit exceeded",
          };
        } else {
          return {
            category: ErrorCategory.SYSTEM,
            retryable: false,
            userMessage: "Upload failed. Please try again or contact support.",
            technicalMessage: `S3 error: ${error.message}`,
          };
        }
    }
  }

  // Logging methods
  private logUploadSuccess(
    s3Key: string,
    uploadId: string,
    fileSize: number
  ): void {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        service: "S3Upload",
        operation: "uploadFile",
        message: "File uploaded successfully",
        s3Key,
        uploadId,
        fileSize,
        bucket: this.config.bucketName,
      })
    );
  }

  private logUploadError(s3Key: string, uploadId: string, error: any): void {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        service: "S3Upload",
        operation: "uploadFile",
        message: "File upload failed",
        s3Key,
        uploadId,
        bucket: this.config.bucketName,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
      })
    );
  }

  private logPresignedUrlGeneration(
    s3Key: string,
    operation: string,
    expiresAt: Date
  ): void {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        service: "S3Upload",
        operation: "generatePresignedUrl",
        message: "Presigned URL generated",
        s3Key,
        urlOperation: operation,
        expiresAt: expiresAt.toISOString(),
        bucket: this.config.bucketName,
      })
    );
  }

  private logPresignedUrlError(s3Key: string, error: any): void {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        service: "S3Upload",
        operation: "generatePresignedUrl",
        message: "Presigned URL generation failed",
        s3Key,
        bucket: this.config.bucketName,
        error: error.message,
        errorName: error.name,
      })
    );
  }

  private logFileDeletion(s3Key: string): void {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        service: "S3Upload",
        operation: "deleteFile",
        message: "File deleted successfully",
        s3Key,
        bucket: this.config.bucketName,
      })
    );
  }

  private logDeletionError(s3Key: string, error: any): void {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        service: "S3Upload",
        operation: "deleteFile",
        message: "File deletion failed",
        s3Key,
        bucket: this.config.bucketName,
        error: error.message,
        errorName: error.name,
      })
    );
  }
}

/**
 * Default S3 upload configuration for KYC documents
 */
export const createKYCUploadConfig = (
  bucketName: string,
  region: string,
  kmsKeyId?: string
): S3UploadConfig => ({
  bucketName,
  region,
  kmsKeyId,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"],
  retryConfig: {
    maxRetries: 3,
    baseDelay: 200,
    maxDelay: 10000,
    jitterType: "full",
  },
});

/**
 * Factory function to create S3 upload utility for KYC documents
 */
export const createKYCUploadUtility = (
  bucketName: string,
  region: string,
  kmsKeyId?: string
): S3UploadUtility => {
  const config = createKYCUploadConfig(bucketName, region, kmsKeyId);
  return new S3UploadUtility(config);
};
