/**
 * Recharge Notification Handler Lambda
 * Event-driven handler that processes recharge events and sends notifications to users
 */

import { EventBridgeEvent, Context } from "aws-lambda";
import { SNSClient } from "@aws-sdk/client-sns";
import { SESv2Client } from "@aws-sdk/client-sesv2";
import { StructuredLogger } from "../../utils/structured-logger";
import {
  RechargeNotificationService,
  RechargeNotificationContext,
  RechargeNotificationPreferences,
} from "../../utils/recharge-notification-service";
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
const notificationService = new RechargeNotificationService({
  snsClient: new SNSClient({ region: process.env.AWS_REGION }),
  sesClient: new SESv2Client({ region: process.env.AWS_REGION }),
  topicArn: process.env.SNS_TOPIC_ARN || "",
  fromEmail: process.env.FROM_EMAIL || "noreply@sachain.com",
  replyToEmail: process.env.REPLY_TO_EMAIL,
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
    const context = await getUserNotificationContext(event.userId);
    const preferences = await getUserNotificationPreferences(event.userId);

    const results =
      await notificationService.sendConversionCompletedNotification(
        context,
        event,
        preferences
      );

    logger.info("Conversion completed notification sent", {
      operation: "ConversionCompletedNotification",
      transactionId: event.transactionId,
      userId: event.userId,
      emailSuccess: results.email?.success,
      smsSuccess: results.sms?.success,
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
    const context = await getUserNotificationContext(event.userId);
    const preferences = await getUserNotificationPreferences(event.userId);

    const results = await notificationService.sendConversionFailedNotification(
      context,
      event,
      preferences
    );

    // Send admin alert for non-retryable failures
    if (!event.retryable && process.env.ADMIN_EMAIL) {
      await notificationService.sendAdminAlert(event, process.env.ADMIN_EMAIL);
    }

    logger.info("Conversion failed notification sent", {
      operation: "ConversionFailedNotification",
      transactionId: event.transactionId,
      userId: event.userId,
      retryable: event.retryable,
      emailSuccess: results.email?.success,
      smsSuccess: results.sms?.success,
    });
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
    const context = await getUserNotificationContext(event.userId);
    const preferences = await getUserNotificationPreferences(event.userId);

    const results = await notificationService.sendRechargeCompletedNotification(
      context,
      event,
      preferences
    );

    logger.info("Recharge completed notification sent", {
      operation: "RechargeCompletedNotification",
      transactionId: event.transactionId,
      userId: event.userId,
      emailSuccess: results.email?.success,
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
    const context = await getUserNotificationContext(event.userId);
    const preferences = await getUserNotificationPreferences(event.userId);

    const results = await notificationService.sendRechargeFailedNotification(
      context,
      event,
      preferences
    );

    // Send admin alert for critical failures
    if (process.env.ADMIN_EMAIL) {
      await notificationService.sendAdminAlert(event, process.env.ADMIN_EMAIL);
    }

    logger.info("Recharge failed notification sent", {
      operation: "RechargeFailedNotification",
      transactionId: event.transactionId,
      userId: event.userId,
      failureStage: event.failureStage,
      emailSuccess: results.email?.success,
      smsSuccess: results.sms?.success,
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
 * Get user notification context (email, phone, preferences)
 */
async function getUserNotificationContext(
  userId: string
): Promise<RechargeNotificationContext> {
  // TODO: Replace with actual user repository query
  // This would typically query the user database to get real contact information
  return {
    userId,
    userEmail: `user-${userId}@example.com`, // Placeholder
    userPhone: `+237${userId.slice(-8)}`, // Placeholder
    userLanguage: "en",
    userTimezone: "Africa/Douala",
  };
}

/**
 * Get user notification preferences
 */
async function getUserNotificationPreferences(
  userId: string
): Promise<RechargeNotificationPreferences> {
  // TODO: Replace with actual user preferences query
  // This would typically query the user preferences from the database
  return {
    emailEnabled: true,
    smsEnabled: true,
    criticalOnly: false,
  };
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

/**
 * Manual notification trigger for testing and admin use
 */
export const sendManualNotification = async (event: {
  userId: string;
  type: "test" | "recharge-initiated";
  data?: Record<string, any>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const context = await getUserNotificationContext(event.userId);

    if (event.type === "test") {
      const result = await notificationService.sendEmail({
        to: context.userEmail || "test@example.com",
        subject: "Test Notification",
        template: "recharge-success",
        data: {
          transactionId: "TEST-" + Date.now(),
          xafAmount: 1000,
          hbarAmount: 10,
          exchangeRate: 100,
          hederaTransactionId: "0.0.123456@1234567890.123456789",
          userHederaAccountId: "0.0.123456",
          timestamp: new Date().toISOString(),
          actualCost: "0.001",
        },
      });

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error?.message,
      };
    }

    if (event.type === "recharge-initiated" && event.data) {
      const result =
        await notificationService.sendRechargeInitiatedNotification(
          context,
          event.data
        );

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error?.message,
      };
    }

    return {
      success: false,
      error: "Unknown notification type or missing data",
    };
  } catch (error) {
    logger.error("Manual notification failed", {}, error as Error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};
