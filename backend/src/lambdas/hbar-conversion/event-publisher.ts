/**
 * Conversion Event Publisher
 * Publishes events related to HBAR conversion process
 */

import { EventBridge } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import {
  HBARConversionStartedEvent,
  HBARConversionCompletedEvent,
  HBARConversionFailedEvent,
  FeeBreakdown,
} from "../../types/hbar-recharge";

export interface ConversionEventPublisherConfig {
  eventBusName: string;
  region?: string;
}

export interface EventPublishResult {
  success: boolean;
  eventId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface ConversionStartedDetail {
  transactionId: string;
  userId: string;
  xafAmount: number;
  exchangeRate: number;
  estimatedHBARAmount: number;
}

export interface ConversionCompletedDetail {
  transactionId: string;
  userId: string;
  xafAmount: number;
  hbarAmount: number;
  exchangeRate: number;
  hederaTransactionId: string;
  fees: FeeBreakdown;
}

export interface ConversionFailedDetail {
  transactionId: string;
  userId: string;
  xafAmount: number;
  errorMessage: string;
  retryCount: number;
  willRetry: boolean;
}

export class ConversionEventPublisher {
  private readonly eventBridge: EventBridge;
  private readonly config: ConversionEventPublisherConfig;

  constructor(config: ConversionEventPublisherConfig) {
    this.config = config;
    this.eventBridge = new EventBridge({
      region: config.region || process.env.AWS_REGION,
    });
  }

  /**
   * Publish HBAR conversion started event
   */
  async publishConversionStarted(
    detail: ConversionStartedDetail
  ): Promise<EventPublishResult> {
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();

    const event: HBARConversionStartedEvent = {
      eventId,
      eventType: "HBAR_CONVERSION_STARTED",
      source: "sachain.recharge",
      timestamp,
      version: "1.0",
      detail,
    };

    try {
      const params: EventBridge.PutEventsRequest = {
        Entries: [
          {
            Source: event.source,
            DetailType: "HBAR Conversion Started",
            Detail: JSON.stringify(event),
            EventBusName: this.config.eventBusName,
            Time: new Date(timestamp),
          },
        ],
      };

      const result = await this.eventBridge.putEvents(params).promise();

      if (result.FailedEntryCount && result.FailedEntryCount > 0) {
        const failedEntry = result.Entries?.[0];
        throw new Error(
          `Failed to publish event: ${failedEntry?.ErrorCode} - ${failedEntry?.ErrorMessage}`
        );
      }

      console.log("Published HBAR conversion started event", {
        eventId,
        transactionId: detail.transactionId,
        userId: detail.userId,
      });

      return {
        success: true,
        eventId,
      };
    } catch (error) {
      console.error("Failed to publish conversion started event:", error);
      return {
        success: false,
        error: {
          code: "EVENT_PUBLISH_FAILED",
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Publish HBAR conversion completed event
   */
  async publishConversionCompleted(
    detail: ConversionCompletedDetail
  ): Promise<EventPublishResult> {
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();

    const event: HBARConversionCompletedEvent = {
      eventId,
      eventType: "HBAR_CONVERSION_COMPLETED",
      source: "sachain.recharge",
      timestamp,
      version: "1.0",
      detail,
    };

    try {
      const params: EventBridge.PutEventsRequest = {
        Entries: [
          {
            Source: event.source,
            DetailType: "HBAR Conversion Completed",
            Detail: JSON.stringify(event),
            EventBusName: this.config.eventBusName,
            Time: new Date(timestamp),
          },
        ],
      };

      const result = await this.eventBridge.putEvents(params).promise();

      if (result.FailedEntryCount && result.FailedEntryCount > 0) {
        const failedEntry = result.Entries?.[0];
        throw new Error(
          `Failed to publish event: ${failedEntry?.ErrorCode} - ${failedEntry?.ErrorMessage}`
        );
      }

      console.log("Published HBAR conversion completed event", {
        eventId,
        transactionId: detail.transactionId,
        userId: detail.userId,
        hbarAmount: detail.hbarAmount,
        hederaTransactionId: detail.hederaTransactionId,
      });

      return {
        success: true,
        eventId,
      };
    } catch (error) {
      console.error("Failed to publish conversion completed event:", error);
      return {
        success: false,
        error: {
          code: "EVENT_PUBLISH_FAILED",
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Publish HBAR conversion failed event
   */
  async publishConversionFailed(
    detail: ConversionFailedDetail
  ): Promise<EventPublishResult> {
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();

    const event: HBARConversionFailedEvent = {
      eventId,
      eventType: "HBAR_CONVERSION_FAILED",
      source: "sachain.recharge",
      timestamp,
      version: "1.0",
      detail,
    };

    try {
      const params: EventBridge.PutEventsRequest = {
        Entries: [
          {
            Source: event.source,
            DetailType: "HBAR Conversion Failed",
            Detail: JSON.stringify(event),
            EventBusName: this.config.eventBusName,
            Time: new Date(timestamp),
          },
        ],
      };

      const result = await this.eventBridge.putEvents(params).promise();

      if (result.FailedEntryCount && result.FailedEntryCount > 0) {
        const failedEntry = result.Entries?.[0];
        throw new Error(
          `Failed to publish event: ${failedEntry?.ErrorCode} - ${failedEntry?.ErrorMessage}`
        );
      }

      console.log("Published HBAR conversion failed event", {
        eventId,
        transactionId: detail.transactionId,
        userId: detail.userId,
        errorMessage: detail.errorMessage,
        retryCount: detail.retryCount,
        willRetry: detail.willRetry,
      });

      return {
        success: true,
        eventId,
      };
    } catch (error) {
      console.error("Failed to publish conversion failed event:", error);
      return {
        success: false,
        error: {
          code: "EVENT_PUBLISH_FAILED",
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Health check for EventBridge connectivity
   */
  async healthCheck(): Promise<void> {
    try {
      // Try to list rules to check EventBridge connectivity
      await this.eventBridge
        .listRules({
          EventBusName: this.config.eventBusName,
          Limit: 1,
        })
        .promise();
    } catch (error) {
      console.error("EventBridge health check failed:", error);
      throw new Error("EventBridge health check failed");
    }
  }

  /**
   * Publish a batch of events (for bulk operations)
   */
  async publishBatch(
    events: Array<{
      source: string;
      detailType: string;
      detail: any;
    }>
  ): Promise<{
    successCount: number;
    failedCount: number;
    errors: string[];
  }> {
    if (events.length === 0) {
      return { successCount: 0, failedCount: 0, errors: [] };
    }

    // EventBridge supports up to 10 events per batch
    const batchSize = 10;
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      try {
        const entries: EventBridge.PutEventsRequestEntry[] = batch.map(
          (event) => ({
            Source: event.source,
            DetailType: event.detailType,
            Detail: JSON.stringify(event.detail),
            EventBusName: this.config.eventBusName,
            Time: new Date(),
          })
        );

        const result = await this.eventBridge
          .putEvents({ Entries: entries })
          .promise();

        if (result.FailedEntryCount && result.FailedEntryCount > 0) {
          failedCount += result.FailedEntryCount;
          successCount += batch.length - result.FailedEntryCount;

          result.Entries?.forEach((entry, index) => {
            if (entry.ErrorCode) {
              errors.push(
                `Event ${i + index}: ${entry.ErrorCode} - ${entry.ErrorMessage}`
              );
            }
          });
        } else {
          successCount += batch.length;
        }
      } catch (error) {
        failedCount += batch.length;
        errors.push(
          `Batch ${i}-${i + batch.length - 1}: ${(error as Error).message}`
        );
      }
    }

    return { successCount, failedCount, errors };
  }
}
