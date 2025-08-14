/**
 * Simplified S3 upload utility for direct KYC document uploads
 * Focuses only on direct upload operations, removing presigned URL functionality
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ExponentialBackoff } from "./retry";
import { ErrorClassifier, ErrorCategory } from "./error-handler";

export interface S3DirectUploadConfig {
  bucketName: string;
  region: string;
  kmsKeyId?: string;
}

export interface DirectUploadRequest {
  fileBuffer: Buffer;
  fileName: string;
  contentType: string;
  userId: string;
  documentType: string;
  documentId: string;
  metadata?: Record<string, string>;
}

export interface DirectUploadResult {
  success: boolean;
  s3Key: string;
  s3Bucket: string;
  fileSize: number;
  etag?: string;
  versionId?: string;
  error?: string;
}

export class S3DirectUploadError extends Error {
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly s3Key?: string;

  constructor(
    message: string,
    category: ErrorCategory,
    retryable: boolean,
    s3Key?: string
  ) {
    super(message);
    this.name = "S3DirectUploadError";
    this.category = category;
    this.retryable = retryable;
    this.s3Key = s3Key;
  }
}

export class S3DirectUploadUtility {
  private s3Client: S3Client;
  private config: S3DirectUploadConfig;
  private retry: ExponentialBackoff;

  constructor(config: S3DirectUploadConfig) {
    this.config = config;
    this.s3Client = new S3Client({
      region: config.region,
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
    });
  }

  /**
   * Upload file directly to S3 with retry logic
   */
  async uploadFile(request: DirectUploadRequest): Promise<DirectUploadResult> {
    const s3Key = this.generateS3Key(
      request.userId,
      request.documentType,
      request.documentId,
      request.fileName
    );

    try {
      // Prepare S3 upload parameters
      const uploadParams = {
        Bucket: this.config.bucketName,
        Key: s3Key,
        Body: request.fileBuffer,
        ContentType: request.contentType,
        ContentLength: request.fileBuffer.length,
        ServerSideEncryption: "aws:kms" as const,
        ...(this.config.kmsKeyId && { SSEKMSKeyId: this.config.kmsKeyId }),
        Metadata: {
          "original-filename": request.fileName,
          "user-id": request.userId,
          "document-type": request.documentType,
          "document-id": request.documentId,
          "upload-timestamp": new Date().toISOString(),
          ...request.metadata,
        },
        Tagging: this.buildObjectTags(request.userId, request.documentType),
      };

      // Execute upload with retry logic
      const result = await this.retry.execute(
        () => this.s3Client.send(new PutObjectCommand(uploadParams)),
        `S3DirectUpload-${request.documentId}`
      );

      this.logUploadSuccess(
        s3Key,
        request.documentId,
        request.fileBuffer.length
      );

      return {
        success: true,
        s3Key,
        s3Bucket: this.config.bucketName,
        fileSize: request.fileBuffer.length,
        etag: result.result.ETag,
        versionId: result.result.VersionId,
      };
    } catch (error: any) {
      this.logUploadError(s3Key, request.documentId, error);

      if (error instanceof S3DirectUploadError) {
        return {
          success: false,
          s3Key,
          s3Bucket: this.config.bucketName,
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
        fileSize: request.fileBuffer.length,
        error: errorDetails.userMessage,
      };
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(s3Key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.config.bucketName,
          Key: s3Key,
        })
      );
      return true;
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Generate S3 key for KYC document
   */
  private generateS3Key(
    userId: string,
    documentType: string,
    documentId: string,
    fileName: string
  ): string {
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const sanitizedFileName = this.sanitizeFileName(fileName);

    return `kyc-documents/${userId}/${documentType}/${timestamp}/${documentId}-${sanitizedFileName}`;
  }

  /**
   * Sanitize filename for S3 key
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, "-")
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
    documentId: string,
    fileSize: number
  ): void {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        service: "S3DirectUpload",
        operation: "uploadFile",
        message: "File uploaded successfully",
        s3Key,
        documentId,
        fileSize,
        bucket: this.config.bucketName,
      })
    );
  }

  private logUploadError(s3Key: string, documentId: string, error: any): void {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        service: "S3DirectUpload",
        operation: "uploadFile",
        message: "File upload failed",
        s3Key,
        documentId,
        bucket: this.config.bucketName,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
      })
    );
  }
}

/**
 * Factory function to create S3 direct upload utility for KYC documents
 */
export const createKYCDirectUploadUtility = (
  bucketName: string,
  region: string,
  kmsKeyId?: string
): S3DirectUploadUtility => {
  const config: S3DirectUploadConfig = {
    bucketName,
    region,
    kmsKeyId,
  };
  return new S3DirectUploadUtility(config);
};
