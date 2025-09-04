/**
 * Recharge Notification Handler Lambda
 * Event-driven handler that processes recharge events and sends notifications to users
 */

import { EventBridgeEvent, Context } from "aws-lambda";
import { StructuredLogger } from "../../utils/structured-logger";
import { NotificationService } from "../../utils/notification-service";
import {
  RechargeEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
  RechargeCompletedEvent,
  RechargeFailedEvent,
} from "../../utils/recharge-event-schemas";

// Initialize logger
const logger = StructuredLogger.getInstance("RechargeNotificationHandler");

// Initialize notification service
const notificationService = new NotificationService({
  region: process.env.AWS_REGION,
});

/**
 * Lambda handler for processing recharge events and sending notifications
 */
export const handler = async (
  event: EventBridgeEvent<string, RechargeEvent>,
  context: Context
): Promise<void> => {
  const requestId = context.awsRequestId;

  logger.info("Processing recharge notification event", {
    operation: "ProcessNotificationEvent",
    requestId,
    eventSource: event.source,
    eventType: event["detail-type"],
    eventId: event.detail.eventId,
    transactionId: event.detail.transactionId,
  });

  try {
    // Route to appropriate notification handler based on event type
    switch (event.detail.eventType) {
      case "HBAR_CONVERSION_COMPLETED":
        await handleConversionCompleted(
          event.detail as ConversionCompletedEvent
        );
        break;

      case "HBAR_CONVERSION_FAILED":
        await handleConversionFailed(event.detail as ConversionFailedEvent);
        break;

      case "RECHARGE_COMPLETED":
        await handleRechargeCompleted(event.detail as RechargeCompletedEvent);
        break;

      case "RECHARGE_FAILED":
        await handleRechargeFailed(event.detail as RechargeFailedEvent);
        break;

      default:
        logger.warn("Unhandled event type for notifications", {
          operation: "ProcessNotificationEvent",
          requestId,
          eventType: event.detail.eventType,
          transactionId: event.detail.transactionId,
        });
    }

    logger.info("Notification event processed successfully", {
      operation: "ProcessNotificationEvent",
      requestId,
      eventType: event.detail.eventType,
      transactionId: event.detail.transactionId,
    });
  } catch (error) {
    logger.error(
      "Failed to process notification event",
      {
        operation: "ProcessNotificationEvent",
        requestId,
        eventType: event.detail.eventType,
        transactionId: event.detail.transactionId,
      },
      error as Error
    );

    // Don't re-throw - we don't want notification failures to cause retries
    // Log the error and continue
  }
};

/**
 * Handles HBAR conversion completed events
 */
async function handleConversionCompleted(
  event: ConversionCompletedEvent
): Promise<void> {
  logger.info("Sending conversion completed notification", {
    operation: "ConversionCompletedNotification",
    transactionId: event.transactionId,
    userId: event.userId,
    hbarAmount: event.hbarAmount,
  });

  try {
    await notificationService.sendEmail({
      to: await getUserEmail(event.userId),
      subject: "HBAR Recharge Successful",
      template: "recharge-success",
      data: {
        transactionId: event.transactionId,
        xafAmount: event.xafAmount,
        hbarAmount: event.hbarAmount,
        exchangeRate: event.exchangeRate,
        hederaTransactionId: event.hederaTransactionId,
        userHederaAccountId: event.userHederaAccountId,
        timestamp: event.timestamp,
      },
    });

    // Also send SMS for successful recharges
    await notificationService.sendSMS({
      to: await getUserPhoneNumber(event.userId),
      message: `Your HBAR recharge is complete! You received ${event.hbarAmount} HBAR. Transaction ID: ${event.transactionId}`,
    });
  } catch (error) {
    logger.error(
      "Failed to send conversion completed notification",
      {
        operation: "ConversionCompletedNotification",
        transactionId: event.transactionId,
        userId: event.userId,
      },
      error as Error
    );
  }
}

/**
 * Handles HBAR conversion failed events
 */
async function handleConversionFailed(
  event: ConversionFailedEvent
): Promise<void> {
  logger.info("Sending conversion failed notification", {
    operation: "ConversionFailedNotification",
    transactionId: event.transactionId,
    userId: event.userId,
    errorCode: event.errorCode,
    retryable: event.retryable,
  });

  try {
    const message = event.retryable
      ? "Your HBAR recharge is being retried. We'll notify you once it's complete."
      : "Your HBAR recharge failed. Please contact support for assistance.";

    await notificationService.sendEmail({
      to: await getUserEmail(event.userId),
      subject: event.retryable ? "HBAR Recharge Retry" : "HBAR Recharge Failed",
      template: event.retryable ? "recharge-retry" : "recharge-failed",
      data: {
        transactionId: event.transactionId,
        xafAmount: event.xafAmount,
        errorMessage: event.errorMessage,
        retryable: event.retryable,
        retryCount: event.retryCount,
        timestamp: event.timestamp,
      },
    });

    // Send SMS for non-retryable failures
    if (!event.retryable) {
      await notificationService.sendSMS({
        to: await getUserPhoneNumber(event.userId),
        message: `Your HBAR recharge failed. Transaction ID: ${event.transactionId}. Please contact support.`,
      });
    }
  } catch (error) {
    logger.error(
      "Failed to send conversion failed notification",
      {
        operation: "ConversionFailedNotification",
        transactionId: event.transactionId,
        userId: event.userId,
      },
      error as Error
    );
  }
}

/**
 * Handles recharge completed events
 */
async function handleRechargeCompleted(
  event: RechargeCompletedEvent
): Promise<void> {
  logger.info("Sending recharge completed notification", {
    operation: "RechargeCompletedNotification",
    transactionId: event.transactionId,
    userId: event.userId,
    hbarAmount: event.hbarAmount,
    processingTimeMs: event.processingTimeMs,
  });

  try {
    await notificationService.sendEmail({
      to: await getUserEmail(event.userId),
      subject: "HBAR Recharge Complete",
      template: "recharge-complete",
      data: {
        transactionId: event.transactionId,
        xafAmount: event.xafAmount,
        hbarAmount: event.hbarAmount,
        exchangeRate: event.exchangeRate,
        totalFees: event.totalFees,
        processingTimeMs: event.processingTimeMs,
        userHederaAccountId: event.userHederaAccountId,
        timestamp: event.timestamp,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to send recharge completed notification",
      {
        operation: "RechargeCompletedNotification",
        transactionId: event.transactionId,
        userId: event.userId,
      },
      error as Error
    );
  }
}

/**
 * Handles recharge failed events
 */
async function handleRechargeFailed(event: RechargeFailedEvent): Promise<void> {
  logger.info("Sending recharge failed notification", {
    operation: "RechargeFailedNotification",
    transactionId: event.transactionId,
    userId: event.userId,
    errorCode: event.errorCode,
    failureStage: event.failureStage,
  });

  try {
    const stageMessages = {
      payment: "during payment processing",
      conversion: "during currency conversion",
      transfer: "during HBAR transfer",
    };

    await notificationService.sendEmail({
      to: await getUserEmail(event.userId),
      subject: "HBAR Recharge Failed",
      template: "recharge-failed",
      data: {
        transactionId: event.transactionId,
        xafAmount: event.xafAmount,
        errorMessage: event.errorMessage,
        failureStage: event.failureStage,
        stageMessage: stageMessages[event.failureStage],
        retryable: event.retryable,
        timestamp: event.timestamp,
      },
    });

    // Send SMS for critical failures
    await notificationService.sendSMS({
      to: await getUserPhoneNumber(event.userId),
      message: `Your HBAR recharge failed ${
        stageMessages[event.failureStage]
      }. Transaction ID: ${event.transactionId}. Please contact support.`,
    });
  } catch (error) {
    logger.error(
      "Failed to send recharge failed notification",
      {
        operation: "RechargeFailedNotification",
        transactionId: event.transactionId,
        userId: event.userId,
      },
      error as Error
    );
  }
}

/**
 * Helper function to get user email (placeholder implementation)
 */
async function getUserEmail(userId: string): Promise<string> {
  // This would typically query the user database
  // For now, return a placeholder
  return `user-${userId}@example.com`;
}

/**
 * Helper function to get user phone number (placeholder implementation)
 */
async function getUserPhoneNumber(userId: string): Promise<string> {
  // This would typically query the user database
  // For now, return a placeholder
  return `+237${userId.slice(-8)}`;
}

/**
 * Health check handler
 */
export const healthCheck = async (): Promise<{
  status: string;
  timestamp: string;
  dependencies: Record<string, boolean>;
}> => {
  try {
    // Check notification service health
    const notificationHealthy = await notificationService.healthCheck();

    return {
      status: notificationHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      dependencies: {
        notificationService: notificationHealthy,
      },
    };
  } catch (error) {
    logger.error("Health check failed", {}, error as Error);

    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      dependencies: {
        notificationService: false,
      },
    };
  }
};
