/**
 * Supported document types for KYC verification
 */
export const DOCUMENT_TYPES = [
  "passport",
  "driver_license",
  "national_id",
  "utility_bill",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * Supported content types for uploaded documents
 */
export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

/**
 * EventBridge event detail for KYC document uploads
 */
export interface KYCUploadDetail {
  documentId: string;
  userId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  contentType: AllowedContentType;
  s3Key: string;
  s3Bucket: string;
  uploadedAt: string;
  metadata?: Record<string, any>;
}

/**
 * Complete EventBridge event structure for KYC document uploads
 */
export interface KYCDocumentUploadedEvent {
  version: "0";
  id: string;
  "detail-type": "KYC Document Uploaded";
  source: "sachain.kyc";
  account: string;
  time: string;
  region: string;
  detail: KYCUploadDetail;
}

/**
 * Generic EventBridge event structure for type safety
 */
export interface EventBridgeEvent<TDetailType extends string, TDetail> {
  version: "0";
  id: string;
  "detail-type": TDetailType;
  source: string;
  account: string;
  time: string;
  region: string;
  detail: TDetail;
}

/**
 * Result of KYC document processing
 */
export interface ProcessingResult {
  documentId: string;
  status: "pending_review" | "processing_failed";
  processedAt: string;
  notificationSent: boolean;
  processingDuration?: number;
  errorMessage?: string;
}

/**
 * Admin notification payload
 */
export interface AdminNotificationPayload {
  documentId: string;
  userId: string;
  documentType: string;
  fileName: string;
  uploadedAt: string;
  reviewUrl?: string;
}

/**
 * Processing error categories for error handling
 */
export enum ProcessingErrorCategory {
  TRANSIENT = "TRANSIENT",
  PERMANENT = "PERMANENT",
  VALIDATION = "VALIDATION",
  AUTHORIZATION = "AUTHORIZATION",
}

/**
 * Processing error details
 */
export interface ProcessingError {
  category: ProcessingErrorCategory;
  errorCode: string;
  message: string;
  retryable: boolean;
}

/**
 * Metrics data for CloudWatch
 */
export interface ProcessingMetrics {
  documentType: string;
  processingDuration: number;
  success: boolean;
  errorCategory?: ProcessingErrorCategory;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Event validation utilities
 */
export class EventValidator {
  /**
   * Validates a KYC document uploaded event structure
   */
  static validateKYCUploadEvent(event: any): ValidationResult {
    const errors: string[] = [];

    // Validate top-level event structure
    if (!event || typeof event !== "object") {
      errors.push("Event must be a valid object");
      return { isValid: false, errors };
    }

    // Validate required EventBridge fields
    if (event.version !== "0") {
      errors.push('Event version must be "0"');
    }

    if (!event.id || typeof event.id !== "string") {
      errors.push("Event id must be a non-empty string");
    }

    if (event["detail-type"] !== "KYC Document Uploaded") {
      errors.push('Event detail-type must be "KYC Document Uploaded"');
    }

    if (event.source !== "sachain.kyc") {
      errors.push('Event source must be "sachain.kyc"');
    }

    if (!event.account || typeof event.account !== "string") {
      errors.push("Event account must be a non-empty string");
    }

    if (!event.time || typeof event.time !== "string") {
      errors.push("Event time must be a valid ISO string");
    } else {
      // Validate ISO date format
      const date = new Date(event.time);
      if (isNaN(date.getTime())) {
        errors.push("Event time must be a valid ISO date string");
      }
    }

    if (!event.region || typeof event.region !== "string") {
      errors.push("Event region must be a non-empty string");
    }

    // Validate event detail
    const detailValidation = this.validateKYCUploadDetail(event.detail);
    if (!detailValidation.isValid) {
      errors.push(
        ...detailValidation.errors.map((error) => `Detail: ${error}`)
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates the detail section of a KYC upload event
   */
  static validateKYCUploadDetail(detail: any): ValidationResult {
    const errors: string[] = [];

    if (!detail || typeof detail !== "object") {
      errors.push("Event detail must be a valid object");
      return { isValid: false, errors };
    }

    // Validate documentId
    if (!detail.documentId || typeof detail.documentId !== "string") {
      errors.push("documentId must be a non-empty string");
    } else if (!/^[a-zA-Z0-9-_]+$/.test(detail.documentId)) {
      errors.push(
        "documentId must contain only alphanumeric characters, hyphens, and underscores"
      );
    }

    // Validate userId
    if (!detail.userId || typeof detail.userId !== "string") {
      errors.push("userId must be a non-empty string");
    } else if (!/^[a-zA-Z0-9-_]+$/.test(detail.userId)) {
      errors.push(
        "userId must contain only alphanumeric characters, hyphens, and underscores"
      );
    }

    // Validate documentType
    if (!detail.documentType || typeof detail.documentType !== "string") {
      errors.push("documentType must be a non-empty string");
    } else if (!DOCUMENT_TYPES.includes(detail.documentType as DocumentType)) {
      errors.push(`documentType must be one of: ${DOCUMENT_TYPES.join(", ")}`);
    }

    // Validate fileName
    if (!detail.fileName || typeof detail.fileName !== "string") {
      errors.push("fileName must be a non-empty string");
    } else if (
      !/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|pdf)$/i.test(detail.fileName)
    ) {
      errors.push(
        "fileName must have a valid format with allowed extensions (jpg, jpeg, png, pdf)"
      );
    }

    // Validate fileSize
    if (typeof detail.fileSize !== "number" || detail.fileSize <= 0) {
      errors.push("fileSize must be a positive number");
    } else if (detail.fileSize > 10 * 1024 * 1024) {
      // 10MB limit
      errors.push("fileSize must not exceed 10MB");
    }

    // Validate contentType
    if (!detail.contentType || typeof detail.contentType !== "string") {
      errors.push("contentType must be a non-empty string");
    } else if (
      !ALLOWED_CONTENT_TYPES.includes(detail.contentType as AllowedContentType)
    ) {
      errors.push(
        `contentType must be one of: ${ALLOWED_CONTENT_TYPES.join(", ")}`
      );
    }

    // Validate s3Key
    if (!detail.s3Key || typeof detail.s3Key !== "string") {
      errors.push("s3Key must be a non-empty string");
    } else if (!/^[a-zA-Z0-9\/._-]+$/.test(detail.s3Key)) {
      errors.push("s3Key must contain only valid S3 key characters");
    }

    // Validate s3Bucket
    if (!detail.s3Bucket || typeof detail.s3Bucket !== "string") {
      errors.push("s3Bucket must be a non-empty string");
    } else if (!/^[a-z0-9.-]+$/.test(detail.s3Bucket)) {
      errors.push("s3Bucket must be a valid S3 bucket name");
    }

    // Validate uploadedAt
    if (!detail.uploadedAt || typeof detail.uploadedAt !== "string") {
      errors.push("uploadedAt must be a non-empty string");
    } else {
      const date = new Date(detail.uploadedAt);
      if (isNaN(date.getTime())) {
        errors.push("uploadedAt must be a valid ISO date string");
      }
    }

    // Validate optional metadata
    if (detail.metadata !== undefined) {
      if (
        typeof detail.metadata !== "object" ||
        detail.metadata === null ||
        Array.isArray(detail.metadata)
      ) {
        errors.push("metadata must be a valid object if provided");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that an event comes from a trusted source
   */
  static validateEventSource(
    event: KYCDocumentUploadedEvent,
    trustedSources: string[] = ["sachain.kyc"]
  ): ValidationResult {
    const errors: string[] = [];

    if (!trustedSources.includes(event.source)) {
      errors.push(
        `Event source "${
          event.source
        }" is not in the list of trusted sources: ${trustedSources.join(", ")}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates event timing to ensure it's not too old or from the future
   */
  static validateEventTiming(
    event: KYCDocumentUploadedEvent,
    maxAgeMinutes: number = 60
  ): ValidationResult {
    const errors: string[] = [];
    const now = new Date();
    const eventTime = new Date(event.time);
    const uploadTime = new Date(event.detail.uploadedAt);

    // Check if event is too old
    const ageMinutes = (now.getTime() - eventTime.getTime()) / (1000 * 60);
    if (ageMinutes > maxAgeMinutes) {
      errors.push(
        `Event is too old: ${ageMinutes.toFixed(
          1
        )} minutes (max: ${maxAgeMinutes})`
      );
    }

    // Check if event is from the future (allow 5 minutes clock skew)
    if (eventTime.getTime() > now.getTime() + 5 * 60 * 1000) {
      errors.push("Event time is too far in the future");
    }

    // Check if upload time is consistent with event time
    const timeDiff = Math.abs(eventTime.getTime() - uploadTime.getTime());
    if (timeDiff > 5 * 60 * 1000) {
      // 5 minutes tolerance
      errors.push("Event time and upload time are inconsistent");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Comprehensive validation that combines all validation checks
   */
  static validateCompleteEvent(
    event: any,
    trustedSources?: string[],
    maxAgeMinutes?: number
  ): ValidationResult {
    const errors: string[] = [];

    // Basic structure validation
    const structureValidation = this.validateKYCUploadEvent(event);
    if (!structureValidation.isValid) {
      errors.push(...structureValidation.errors);
      return { isValid: false, errors }; // Don't continue if basic structure is invalid
    }

    // Source validation
    const sourceValidation = this.validateEventSource(event, trustedSources);
    if (!sourceValidation.isValid) {
      errors.push(...sourceValidation.errors);
    }

    // Timing validation
    const timingValidation = this.validateEventTiming(event, maxAgeMinutes);
    if (!timingValidation.isValid) {
      errors.push(...timingValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
