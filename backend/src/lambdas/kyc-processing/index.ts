import { EventBridgeHandler } from "aws-lambda";
import { KYCUploadDetail } from "./types";
import { createKYCLogger } from "../../utils/structured-logger";

const logger = createKYCLogger();

/**
 * KYC Processing Lambda Handler
 *
 * Handles EventBridge events for KYC document uploads and performs post-upload processing:
 * - Updates document status to "pending_review"
 * - Sends admin notifications
 * - Logs processing activities
 */
export const handler: EventBridgeHandler<
  "KYC Document Uploaded",
  KYCUploadDetail,
  void
> = async (event) => {
  const { documentId, userId, documentType, fileName } = event.detail;

  logger.info("KYC processing started", {
    requestId: event.id,
    documentId,
    userId,
    operation: "kyc_processing",
  });

  try {
    // TODO: Implement processing logic in subsequent tasks
    // - Update document status to pending_review
    // - Send admin notification
    // - Emit success metrics

    logger.info("KYC document processing completed", {
      requestId: event.id,
      documentId,
      userId,
      status: "pending_review",
      operation: "kyc_processing",
    });
  } catch (error) {
    logger.error(
      "KYC document processing failed",
      {
        requestId: event.id,
        documentId,
        userId,
        operation: "kyc_processing",
      },
      error as Error
    );

    // Re-throw to let EventBridge handle retries
    throw error;
  }
};
