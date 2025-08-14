import { EventBridgeHandler } from "aws-lambda";
import {
  KYCUploadDetail,
  EventValidator,
  ProcessingResult,
  ProcessingErrorCategory,
} from "./types";
import { createKYCLogger } from "../../utils/structured-logger";
import { CloudWatchMetrics } from "../../utils/cloudwatch-metrics";
import { KYCDocumentRepository } from "../../repositories/kyc-document-repository";
import {
  NotificationService,
  KYCNotificationData,
} from "../../utils/notification-service";
import { SNSClient } from "@aws-sdk/client-sns";
import { ExponentialBackoff } from "../../utils/retry";

const logger = createKYCLogger();
const metrics = CloudWatchMetrics.getInstance("Sachain/KYCProcessing");

// Initialize KYC Document Repository
const kycRepository = new KYCDocumentRepository({
  tableName: process.env.TABLE_NAME || "sachain-kyc-table",
  region: process.env.AWS_REGION || "us-east-1",
});

// Initialize Notification Service
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const notificationService = new NotificationService({
  snsClient,
  topicArn: process.env.SNS_TOPIC_ARN || "",
  adminPortalUrl: process.env.ADMIN_PORTAL_URL,
});

// Initialize retry utility for processing operations
const processingRetry = new ExponentialBackoff({
  maxRetries: 3,
  baseDelay: 200,
  maxDelay: 10000,
  jitterType: "full",
  retryableErrors: [
    "ProvisionedThroughputExceededException",
    "ThrottlingException",
    "ServiceUnavailable",
    "InternalServerError",
    "RequestTimeout",
    "NetworkingError",
    "UnknownError",
    "Throttling",
    "TooManyRequestsException",
  ],
});

/**
 * KYC Processing Lambda Handler
 *
 * Handles EventBridge events for KYC document uploads and performs post-upload processing:
 * - Validates incoming events from trusted sources
 * - Updates document status to "pending_review"
 * - Sends admin notifications
 * - Logs processing activities with structured logging
 * - Emits CloudWatch metrics for monitoring
 */
export const handler: EventBridgeHandler<
  "KYC Document Uploaded",
  KYCUploadDetail,
  void
> = async (event) => {
  const startTime = Date.now();
  const { documentId, userId, documentType, fileName } = event.detail;

  logger.info("KYC processing started", {
    requestId: event.id,
    documentId,
    userId,
    documentType,
    fileName,
    operation: "kyc_processing",
    eventSource: event.source,
    eventTime: event.time,
  });

  try {
    // Validate event structure and source
    const validationResult = EventValidator.validateCompleteEvent(
      event,
      ["sachain.kyc"], // trusted sources
      60 // max age in minutes
    );

    if (!validationResult.isValid) {
      const errorMessage = `Event validation failed: ${validationResult.errors.join(
        ", "
      )}`;
      logger.error("Event validation failed", {
        requestId: event.id,
        documentId,
        userId,
        operation: "kyc_processing",
        validationErrors: validationResult.errors,
      });

      // Emit validation error metric
      await metrics.recordError(
        "EventValidationError",
        "validation",
        "KYCProcessing",
        "validateEvent"
      );

      throw new Error(errorMessage);
    }

    logger.info("Event validation successful", {
      requestId: event.id,
      documentId,
      userId,
      operation: "kyc_processing",
    });

    // Update document status to pending (subtask 3.2)
    await updateDocumentStatus(userId, documentId);

    // Send admin notification (subtask 3.3)
    const notificationSent = await sendAdminNotification({
      documentId,
      userId,
      documentType,
      fileName,
      uploadedAt: event.detail.uploadedAt,
    });

    const processingDuration = Date.now() - startTime;

    // Create processing result
    const result: ProcessingResult = {
      documentId,
      status: "pending_review",
      processedAt: new Date().toISOString(),
      notificationSent,
      processingDuration,
    };

    logger.info("KYC document processing completed", {
      requestId: event.id,
      documentId,
      userId,
      status: result.status,
      operation: "kyc_processing",
      processingDuration,
      notificationSent: result.notificationSent,
    });

    // Emit success metrics
    await metrics.publishMetrics([
      {
        MetricName: "ProcessingSuccess",
        Value: 1,
        Unit: "Count",
        Dimensions: [
          { Name: "DocumentType", Value: documentType },
          { Name: "Operation", Value: "kyc_processing" },
        ],
      },
      {
        MetricName: "ProcessingDuration",
        Value: processingDuration,
        Unit: "Milliseconds",
        Dimensions: [
          { Name: "DocumentType", Value: documentType },
          { Name: "Operation", Value: "kyc_processing" },
        ],
      },
    ]);
  } catch (error) {
    const processingDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      "KYC document processing failed",
      {
        requestId: event.id,
        documentId,
        userId,
        operation: "kyc_processing",
        processingDuration,
        errorMessage,
      },
      error as Error
    );

    // Emit error metrics
    await metrics.publishMetrics([
      {
        MetricName: "ProcessingError",
        Value: 1,
        Unit: "Count",
        Dimensions: [
          { Name: "DocumentType", Value: documentType },
          { Name: "Operation", Value: "kyc_processing" },
          { Name: "ErrorCategory", Value: categorizeError(error) },
        ],
      },
      {
        MetricName: "ProcessingDuration",
        Value: processingDuration,
        Unit: "Milliseconds",
        Dimensions: [
          { Name: "DocumentType", Value: documentType },
          { Name: "Operation", Value: "kyc_processing" },
          { Name: "Status", Value: "failed" },
        ],
      },
    ]);

    // Re-throw to let EventBridge handle retries for transient errors
    throw error;
  }
};

/**
 * Updates document status from "uploaded" to "pending" for admin review
 * Uses atomic update operations to prevent race conditions
 * Implements retry logic with exponential backoff for transient failures
 */
async function updateDocumentStatus(
  userId: string,
  documentId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info("Updating document status", {
      operation: "updateDocumentStatus",
      userId,
      documentId,
      targetStatus: "pending",
    });

    // Use retry logic for transient failures
    const retryResult = await processingRetry.execute(async () => {
      return await kycRepository.updateKYCDocument({
        userId,
        documentId,
        status: "pending",
      });
    }, "updateDocumentStatus");

    const duration = Date.now() - startTime;

    logger.info("Document status updated successfully", {
      operation: "updateDocumentStatus",
      userId,
      documentId,
      status: "pending",
      duration,
      attempts: retryResult.attempts,
      totalRetryDelay: retryResult.totalDelay,
    });

    // Emit status update metrics
    await metrics.publishMetrics([
      {
        MetricName: "DocumentStatusUpdate",
        Value: 1,
        Unit: "Count",
        Dimensions: [
          { Name: "Operation", Value: "updateDocumentStatus" },
          { Name: "Status", Value: "pending" },
        ],
      },
      {
        MetricName: "StatusUpdateDuration",
        Value: duration,
        Unit: "Milliseconds",
        Dimensions: [{ Name: "Operation", Value: "updateDocumentStatus" }],
      },
      {
        MetricName: "StatusUpdateAttempts",
        Value: retryResult.attempts,
        Unit: "Count",
        Dimensions: [{ Name: "Operation", Value: "updateDocumentStatus" }],
      },
    ]);

    // Log retry information if retries were needed
    if (retryResult.attempts > 1) {
      logger.info("Document status update required retries", {
        operation: "updateDocumentStatus",
        userId,
        documentId,
        attempts: retryResult.attempts,
        totalRetryDelay: retryResult.totalDelay,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCategory = categorizeError(error);

    logger.error(
      "Failed to update document status after retries",
      {
        operation: "updateDocumentStatus",
        userId,
        documentId,
        targetStatus: "pending",
        duration,
        errorMessage,
        errorCategory,
        attempts:
          error instanceof Error && "attempts" in error
            ? (error as any).attempts
            : "unknown",
      },
      error as Error
    );

    // Emit error metrics with detailed categorization
    await metrics.publishMetrics([
      {
        MetricName: "DocumentStatusUpdateError",
        Value: 1,
        Unit: "Count",
        Dimensions: [
          { Name: "Operation", Value: "updateDocumentStatus" },
          { Name: "ErrorCategory", Value: errorCategory },
        ],
      },
      {
        MetricName: "StatusUpdateFailureDuration",
        Value: duration,
        Unit: "Milliseconds",
        Dimensions: [
          { Name: "Operation", Value: "updateDocumentStatus" },
          { Name: "ErrorCategory", Value: errorCategory },
        ],
      },
    ]);

    // Re-throw to let the main handler handle the error
    throw new Error(`Failed to update document status: ${errorMessage}`);
  }
}

/**
 * Sends admin notification for KYC document review
 * Includes secure document access links in notifications
 * Implements retry logic with exponential backoff for transient failures
 */
async function sendAdminNotification(
  notificationData: KYCNotificationData
): Promise<boolean> {
  const startTime = Date.now();

  try {
    logger.info("Sending admin notification", {
      operation: "sendAdminNotification",
      documentId: notificationData.documentId,
      userId: notificationData.userId,
      documentType: notificationData.documentType,
    });

    // Use retry logic for transient failures
    const retryResult = await processingRetry.execute(async () => {
      return await notificationService.sendKYCReviewNotification(
        notificationData
      );
    }, "sendAdminNotification");

    const duration = Date.now() - startTime;

    logger.info("Admin notification sent successfully", {
      operation: "sendAdminNotification",
      documentId: notificationData.documentId,
      userId: notificationData.userId,
      documentType: notificationData.documentType,
      duration,
      attempts: retryResult.attempts,
      totalRetryDelay: retryResult.totalDelay,
    });

    // Emit notification success metrics
    await metrics.publishMetrics([
      {
        MetricName: "AdminNotificationSent",
        Value: 1,
        Unit: "Count",
        Dimensions: [
          { Name: "Operation", Value: "sendAdminNotification" },
          { Name: "DocumentType", Value: notificationData.documentType },
        ],
      },
      {
        MetricName: "NotificationDuration",
        Value: duration,
        Unit: "Milliseconds",
        Dimensions: [{ Name: "Operation", Value: "sendAdminNotification" }],
      },
      {
        MetricName: "NotificationAttempts",
        Value: retryResult.attempts,
        Unit: "Count",
        Dimensions: [{ Name: "Operation", Value: "sendAdminNotification" }],
      },
    ]);

    // Log retry information if retries were needed
    if (retryResult.attempts > 1) {
      logger.info("Admin notification required retries", {
        operation: "sendAdminNotification",
        documentId: notificationData.documentId,
        userId: notificationData.userId,
        attempts: retryResult.attempts,
        totalRetryDelay: retryResult.totalDelay,
      });
    }

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCategory = categorizeError(error);

    logger.error(
      "Failed to send admin notification after retries",
      {
        operation: "sendAdminNotification",
        documentId: notificationData.documentId,
        userId: notificationData.userId,
        documentType: notificationData.documentType,
        duration,
        errorMessage,
        errorCategory,
        attempts:
          error instanceof Error && "attempts" in error
            ? (error as any).attempts
            : "unknown",
      },
      error as Error
    );

    // Emit notification error metrics with detailed categorization
    await metrics.publishMetrics([
      {
        MetricName: "AdminNotificationError",
        Value: 1,
        Unit: "Count",
        Dimensions: [
          { Name: "Operation", Value: "sendAdminNotification" },
          { Name: "ErrorCategory", Value: errorCategory },
          { Name: "DocumentType", Value: notificationData.documentType },
        ],
      },
      {
        MetricName: "NotificationFailureDuration",
        Value: duration,
        Unit: "Milliseconds",
        Dimensions: [
          { Name: "Operation", Value: "sendAdminNotification" },
          { Name: "ErrorCategory", Value: errorCategory },
        ],
      },
    ]);

    // Log error but don't fail the entire processing
    // Notification failure should not prevent document status update
    logger.warn("Continuing processing despite notification failure", {
      operation: "sendAdminNotification",
      documentId: notificationData.documentId,
      userId: notificationData.userId,
      errorCategory,
    });

    return false;
  }
}

/**
 * Categorizes errors for proper handling and metrics
 */
function categorizeError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Validation errors
    if (message.includes("validation") || message.includes("invalid")) {
      return ProcessingErrorCategory.VALIDATION;
    }

    // Authorization errors
    if (message.includes("access") || message.includes("unauthorized")) {
      return ProcessingErrorCategory.AUTHORIZATION;
    }

    // Transient errors (network, throttling, etc.)
    if (
      message.includes("throttl") ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("unavailable")
    ) {
      return ProcessingErrorCategory.TRANSIENT;
    }
  }

  return ProcessingErrorCategory.PERMANENT;
}
