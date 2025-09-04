/**
 * HBAR Recharge Event Publisher
 * Handles EventBridge event publishing for recharge system
 */

import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { v4 as uuidv4 } from "uuid";
import { ExponentialBackoff } from "../../utils/retry";
import { StructuredLogger } from "../../utils/structured-logger";
import {
  RechargeEventDetail,
  EventPublishResult,
  RechargeEventPublisher as IRechargeEventPublisher,
} from "./types";
import {
  PaymentSuccessEvent,
  HBARConversionStartedEvent,
  HBARConversionCompletedEvent,
  HBARConversionFailedEvent,
} from "../../types/hbar-recharge";

export interface RechargeEventPublisherConfig {
  eventBusName: string;
  region?: string;
  maxRetries?: number;
}

export class RechargeEventPublisher implements IRechargeEventPublisher {
  private readonly client: EventBridgeClient;
  private readonly eventBusName: string;
  private readonly retry: ExponentialBackoff;
  private readonly logger: StructuredLogger;

  constructor(config: RechargeEventPublisherConfig) {
    this.client = new EventBridgeClient({ region: config.region });
    this.eventBusName = config.eventBusName;
    this.logger = new StructuredLogger("RechargeEventPublisher");

    this.retry = new ExponentialBackoff({
      maxRetries: config.maxRetries || 3,
      baseDelay: 200,
      maxDelay: 5000,
      jitterType: "full",
      retryableErrors: [
        "NetworkError",
        "TimeoutError",
        "ServiceUnavailable",
        "ThrottlingException",
      ],
    });
  }

  /**
   * Publishes payment initiated event
   */
  async publishPaymentInitiated(
    detail: RechargeEventDetail
  ): Promise<EventPublishResult> {
    const event = {
      eventId: uuidv4(),
      eventType: "PAYMENT_INITIATED" as const,
      source: "sachain.recharge" as const,
      version: "1.0",
      timestamp: detail.timestamp,
      detail,
    };

    return await this.publishEvent(event, "HBAR Recharge Payment Initiated");
  }

  /**
   * Publishes payment confirmed event (Orange Money payment success)
   */
  async publishPaymentConfirmed(
    detail: RechargeEventDetail & { orangeMoneyTransactionId: string }
  ): Promise<EventPublishResult> {
    const event: PaymentSuccessEvent = {
      eventId: uuidv4(),
      eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
      source: "sachain.payments",
      version: "1.0",
      timestamp: detail.timestamp,
      detail: {
        transactionId: detail.transactionId,
        userId: detail.userId,
        xafAmount: detail.xafAmount,
        orangeMoneyTransactionId: detail.orangeMoneyTransactionId,
        userHederaAccountId: detail.userHederaAccountId,
        fees: detail.fees,
      },
    };

    return await this.publishEvent(event, "Orange Money Payment Success");
  }

  /**
   * Publishes HBAR conversion started event
   */
  async publishConversionStarted(detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    exchangeRate: number;
    estimatedHBARAmount: number;
  }): Promise<EventPublishResult> {
    const event: HBARConversionStartedEvent = {
      eventId: uuidv4(),
      eventType: "HBAR_CONVERSION_STARTED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: new Date().toISOString(),
      detail,
    };

    return await this.publishEvent(event, "HBAR Conversion Started");
  }

  /**
   * Publishes HBAR conversion completed event
   */
  async publishConversionCompleted(detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    hbarAmount: number;
    exchangeRate: number;
    hederaTransactionId: string;
    fees: {
      orangeMoneyFee: number;
      platformFee: number;
      totalFees: number;
    };
  }): Promise<EventPublishResult> {
    const event: HBARConversionCompletedEvent = {
      eventId: uuidv4(),
      eventType: "HBAR_CONVERSION_COMPLETED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: new Date().toISOString(),
      detail,
    };

    return await this.publishEvent(event, "HBAR Conversion Completed");
  }

  /**
   * Publishes HBAR conversion failed event
   */
  async publishConversionFailed(detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    errorMessage: string;
    retryCount: number;
    willRetry: boolean;
  }): Promise<EventPublishResult> {
    const event: HBARConversionFailedEvent = {
      eventId: uuidv4(),
      eventType: "HBAR_CONVERSION_FAILED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: new Date().toISOString(),
      detail,
    };

    return await this.publishEvent(event, "HBAR Conversion Failed");
  }

  /**
   * Generic method to publish any event
   */
  private async publishEvent(
    event: any,
    detailType: string
  ): Promise<EventPublishResult> {
    try {
      // Validate event structure
      this.validateEvent(event);

      // Publish event with retry logic
      const result = await this.retry.execute(
        () =>
          this.client.send(
            new PutEventsCommand({
              Entries: [
                {
                  Source: event.source,
                  DetailType: detailType,
                  Detail: JSON.stringify(event),
                  EventBusName: this.eventBusName,
                  Time: new Date(event.timestamp),
                },
              ],
            })
          ),
        `EventBridge-${event.eventType}-${
          event.detail?.transactionId || event.eventId
        }`
      );

      this.logger.info("Event published successfully", {
        operation: "PublishEvent",
        eventType: event.eventType,
        eventId: event.eventId,
        transactionId: event.detail?.transactionId,
        detailType,
        attempts: result.attempts,
      });

      return {
        success: true,
        eventId: event.eventId,
      };
    } catch (error) {
      this.logger.error(
        "Failed to publish event",
        {
          operation: "PublishEvent",
          eventType: event.eventType,
          eventId: event.eventId,
          transactionId: event.detail?.transactionId,
          detailType,
        },
        error as Error
      );

      return {
        success: false,
        error: {
          code: "EVENT_PUBLISHING_FAILED",
          message: `Failed to publish ${event.eventType} event: ${
            (error as Error).message
          }`,
        },
      };
    }
  }

  /**
   * Validates event structure
   */
  private validateEvent(event: any): void {
    const requiredFields = ["eventId", "eventType", "source", "timestamp"];

    for (const field of requiredFields) {
      if (!event[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate timestamp format
    if (!this.isValidISOTimestamp(event.timestamp)) {
      throw new Error(`Invalid timestamp format: ${event.timestamp}`);
    }

    // Validate event ID format (should be UUID)
    if (!this.isValidUUID(event.eventId)) {
      throw new Error(`Invalid event ID format: ${event.eventId}`);
    }

    // Validate source format
    if (!event.source.startsWith("sachain.")) {
      throw new Error(`Invalid source format: ${event.source}`);
    }
  }

  /**
   * Validates ISO timestamp format
   */
  private isValidISOTimestamp(timestamp: string): boolean {
    try {
      const date = new Date(timestamp);
      return date.toISOString() === timestamp;
    } catch {
      return false;
    }
  }

  /**
   * Validates UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Health check for EventBridge connectivity
   */
  async healthCheck(): Promise<void> {
    try {
      // Try to publish a test event (this won't actually be sent)
      const testEvent = {
        eventId: uuidv4(),
        eventType: "HEALTH_CHECK",
        source: "sachain.recharge",
        timestamp: new Date().toISOString(),
        detail: { test: true },
      };

      // Just validate the event structure without actually sending
      this.validateEvent(testEvent);

      // Test EventBridge client connectivity with a dry run
      // Note: EventBridge doesn't have a direct health check API,
      // so we'll just ensure the client is properly configured
      if (!this.client || !this.eventBusName) {
        throw new Error("EventBridge client not properly configured");
      }
    } catch (error) {
      throw new Error(
        `EventBridge health check failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Gets event publishing statistics (for monitoring)
   */
  async getPublishingStats(): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    lastEventTime?: string;
  }> {
    // This would typically be implemented with CloudWatch metrics
    // For now, return placeholder data
    return {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
    };
  }

  /**
   * Batch publish multiple events
   */
  async batchPublishEvents(
    events: Array<{
      event: any;
      detailType: string;
    }>
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ index: number; error: string }>,
    };

    // EventBridge supports up to 10 events per batch
    const batches = this.chunkArray(events, 10);

    for (const batch of batches) {
      try {
        const entries = batch.map(({ event, detailType }) => ({
          Source: event.source,
          DetailType: detailType,
          Detail: JSON.stringify(event),
          EventBusName: this.eventBusName,
          Time: new Date(event.timestamp),
        }));

        await this.retry.execute(
          () => this.client.send(new PutEventsCommand({ Entries: entries })),
          `BatchPublishEvents-${batch.length}`
        );

        results.successful += batch.length;
      } catch (error) {
        results.failed += batch.length;
        batch.forEach((_, index) => {
          results.errors.push({
            index: results.successful + results.failed - batch.length + index,
            error: (error as Error).message,
          });
        });
      }
    }

    return results;
  }

  /**
   * Utility method to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
