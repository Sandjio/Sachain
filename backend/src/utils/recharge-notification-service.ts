/**
 * Recharge-specific notification service
 * Extends the base notification service with recharge-specific templates and logic
 */

import {
  NotificationService,
  NotificationServiceConfig,
  NotificationResult,
} from "./notification-service";
import { StructuredLogger } from "./structured-logger";
import {
  ConversionCompletedEvent,
  ConversionFailedEvent,
  RechargeCompletedEvent,
  RechargeFailedEvent,
} from "./recharge-event-schemas";

export interface RechargeNotificationContext {
  userId: string;
  userEmail?: string;
  userPhone?: string;
  userLanguage?: string;
  userTimezone?: string;
}

export interface RechargeNotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  criticalOnly: boolean;
}

export class RechargeNotificationService extends NotificationService {
  private logger: StructuredLogger;

  constructor(config: NotificationServiceConfig) {
    super(config);
    this.logger = StructuredLogger.getInstance("RechargeNotificationService");
  }

  /**
   * Send recharge initiation notification
   */
  async sendRechargeInitiatedNotification(
    context: RechargeNotificationContext,
    data: {
      transactionId: string;
      xafAmount: number;
      estimatedHBARAmount: number;
      exchangeRate: number;
      fees: {
        orangeMoneyFee: number;
        platformFee: number;
        totalFees: number;
      };
    }
  ): Promise<NotificationResult> {
    this.logger.info("Sending recharge initiated notification", {
      operation: "SendRechargeInitiated",
      userId: context.userId,
      transactionId: data.transactionId,
    });

    if (!context.userEmail) {
      this.logger.warn("No email address for recharge initiated notification", {
        operation: "SendRechargeInitiated",
        userId: context.userId,
        transactionId: data.transactionId,
      });
      return {
        success: false,
        error: { code: "NO_EMAIL", message: "No email address provided" },
      };
    }

    return this.sendEmail({
      to: context.userEmail,
      subject: "HBAR Recharge Initiated",
      template: "recharge-initiated",
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        userLanguage: context.userLanguage || "en",
      },
    });
  }

  /**
   * Send conversion completed notification
   */
  async sendConversionCompletedNotification(
    context: RechargeNotificationContext,
    event: ConversionCompletedEvent,
    preferences?: RechargeNotificationPreferences
  ): Promise<{ email?: NotificationResult; sms?: NotificationResult }> {
    this.logger.info("Sending conversion completed notification", {
      operation: "SendConversionCompleted",
      userId: context.userId,
      transactionId: event.transactionId,
    });

    const results: { email?: NotificationResult; sms?: NotificationResult } =
      {};

    // Send email notification
    if (context.userEmail && (!preferences || preferences.emailEnabled)) {
      results.email = await this.sendEmail({
        to: context.userEmail,
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
          actualCost: event.actualCost,
        },
      });
    }

    // Send SMS notification for successful recharges
    if (context.userPhone && (!preferences || preferences.smsEnabled)) {
      const smsMessage = this.formatRechargeSuccessSMS(event);
      results.sms = await this.sendSMS({
        to: context.userPhone,
        message: smsMessage,
      });
    }

    return results;
  }

  /**
   * Send conversion failed notification
   */
  async sendConversionFailedNotification(
    context: RechargeNotificationContext,
    event: ConversionFailedEvent,
    preferences?: RechargeNotificationPreferences
  ): Promise<{ email?: NotificationResult; sms?: NotificationResult }> {
    this.logger.info("Sending conversion failed notification", {
      operation: "SendConversionFailed",
      userId: context.userId,
      transactionId: event.transactionId,
      retryable: event.retryable,
    });

    const results: { email?: NotificationResult; sms?: NotificationResult } =
      {};

    // Send email notification
    if (context.userEmail && (!preferences || preferences.emailEnabled)) {
      const template = event.retryable ? "recharge-retry" : "recharge-failed";
      const subject = event.retryable
        ? "HBAR Recharge Retry"
        : "HBAR Recharge Failed";

      results.email = await this.sendEmail({
        to: context.userEmail,
        subject,
        template,
        data: {
          transactionId: event.transactionId,
          xafAmount: event.xafAmount,
          errorMessage: event.errorMessage,
          retryable: event.retryable,
          retryCount: event.retryCount,
          timestamp: event.timestamp,
        },
      });
    }

    // Send SMS for critical failures (non-retryable)
    if (
      context.userPhone &&
      !event.retryable &&
      (!preferences || preferences.smsEnabled || preferences.criticalOnly)
    ) {
      const smsMessage = this.formatRechargeFailedSMS(event);
      results.sms = await this.sendSMS({
        to: context.userPhone,
        message: smsMessage,
      });
    }

    return results;
  }

  /**
   * Send recharge completed notification
   */
  async sendRechargeCompletedNotification(
    context: RechargeNotificationContext,
    event: RechargeCompletedEvent,
    preferences?: RechargeNotificationPreferences
  ): Promise<{ email?: NotificationResult; sms?: NotificationResult }> {
    this.logger.info("Sending recharge completed notification", {
      operation: "SendRechargeCompleted",
      userId: context.userId,
      transactionId: event.transactionId,
    });

    const results: { email?: NotificationResult; sms?: NotificationResult } =
      {};

    // Send email notification
    if (context.userEmail && (!preferences || preferences.emailEnabled)) {
      results.email = await this.sendEmail({
        to: context.userEmail,
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
    }

    return results;
  }

  /**
   * Send recharge failed notification
   */
  async sendRechargeFailedNotification(
    context: RechargeNotificationContext,
    event: RechargeFailedEvent,
    preferences?: RechargeNotificationPreferences
  ): Promise<{ email?: NotificationResult; sms?: NotificationResult }> {
    this.logger.info("Sending recharge failed notification", {
      operation: "SendRechargeFailed",
      userId: context.userId,
      transactionId: event.transactionId,
      failureStage: event.failureStage,
    });

    const results: { email?: NotificationResult; sms?: NotificationResult } =
      {};

    // Send email notification
    if (context.userEmail && (!preferences || preferences.emailEnabled)) {
      results.email = await this.sendEmail({
        to: context.userEmail,
        subject: "HBAR Recharge Failed",
        template: "recharge-failed",
        data: {
          transactionId: event.transactionId,
          xafAmount: event.xafAmount,
          errorMessage: event.errorMessage,
          failureStage: event.failureStage,
          stageMessage: this.getStageMessage(event.failureStage),
          retryable: event.retryable,
          timestamp: event.timestamp,
        },
      });
    }

    // Send SMS for critical failures
    if (
      context.userPhone &&
      (!preferences || preferences.smsEnabled || preferences.criticalOnly)
    ) {
      const smsMessage = this.formatRechargeFailedStageSMS(event);
      results.sms = await this.sendSMS({
        to: context.userPhone,
        message: smsMessage,
      });
    }

    return results;
  }

  /**
   * Send admin alert for failed transactions
   */
  async sendAdminAlert(
    event: ConversionFailedEvent | RechargeFailedEvent,
    adminEmail: string
  ): Promise<NotificationResult> {
    this.logger.info("Sending admin alert", {
      operation: "SendAdminAlert",
      transactionId: event.transactionId,
      eventType: event.eventType,
    });

    const subject = `URGENT: Recharge Failure - ${event.transactionId}`;
    const isConversionFailure = event.eventType === "HBAR_CONVERSION_FAILED";

    return this.sendEmail({
      to: adminEmail,
      subject,
      template: "admin-alert",
      data: {
        eventType: event.eventType,
        transactionId: event.transactionId,
        userId: event.userId,
        xafAmount: event.xafAmount,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
        retryable: event.retryable,
        timestamp: event.timestamp,
        failureStage: isConversionFailure
          ? "conversion"
          : (event as RechargeFailedEvent).failureStage,
        retryCount: isConversionFailure
          ? (event as ConversionFailedEvent).retryCount
          : 0,
      },
    });
  }

  /**
   * Format SMS message for successful recharge
   */
  private formatRechargeSuccessSMS(event: ConversionCompletedEvent): string {
    return `Sachain: Your HBAR recharge is complete! You received ${event.hbarAmount} HBAR for ${event.xafAmount} XAF. Transaction: ${event.transactionId}`;
  }

  /**
   * Format SMS message for failed recharge
   */
  private formatRechargeFailedSMS(event: ConversionFailedEvent): string {
    return `Sachain: Your HBAR recharge failed. Transaction: ${event.transactionId}. Please contact support for assistance.`;
  }

  /**
   * Format SMS message for recharge failed at specific stage
   */
  private formatRechargeFailedStageSMS(event: RechargeFailedEvent): string {
    const stageMessage = this.getStageMessage(event.failureStage);
    return `Sachain: Your HBAR recharge failed ${stageMessage}. Transaction: ${event.transactionId}. Please contact support.`;
  }

  /**
   * Get human-readable stage message
   */
  private getStageMessage(
    stage: "payment" | "conversion" | "transfer"
  ): string {
    const stageMessages = {
      payment: "during payment processing",
      conversion: "during currency conversion",
      transfer: "during HBAR transfer",
    };
    return stageMessages[stage];
  }

  /**
   * Batch send notifications to multiple users
   */
  async sendBatchNotifications(
    notifications: Array<{
      context: RechargeNotificationContext;
      type: "success" | "failed" | "retry" | "complete";
      data: any;
      preferences?: RechargeNotificationPreferences;
    }>
  ): Promise<Array<{ userId: string; results: any; error?: string }>> {
    this.logger.info("Sending batch notifications", {
      operation: "SendBatchNotifications",
      count: notifications.length,
    });

    const results = await Promise.allSettled(
      notifications.map(async (notification) => {
        try {
          let results;
          switch (notification.type) {
            case "success":
              results = await this.sendConversionCompletedNotification(
                notification.context,
                notification.data,
                notification.preferences
              );
              break;
            case "failed":
              results = await this.sendConversionFailedNotification(
                notification.context,
                notification.data,
                notification.preferences
              );
              break;
            case "complete":
              results = await this.sendRechargeCompletedNotification(
                notification.context,
                notification.data,
                notification.preferences
              );
              break;
            default:
              throw new Error(
                `Unknown notification type: ${notification.type}`
              );
          }
          return { userId: notification.context.userId, results };
        } catch (error) {
          return {
            userId: notification.context.userId,
            results: null,
            error: (error as Error).message,
          };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          userId: notifications[index].context.userId,
          results: null,
          error: result.reason.message,
        };
      }
    });
  }
}
