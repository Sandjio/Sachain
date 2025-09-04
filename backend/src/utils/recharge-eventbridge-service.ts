/**
 * EventBridge service specifically for HBAR Recharge System
 */

import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { v4 as uuidv4 } from "uuid";
import { ExponentialBackoff } from "./retry";
import { StructuredLogger, createProjectLogger } from "./structured-logger";
import {
  RechargeEvent,
  PaymentSuccessEvent,
  ConversionStartedEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
  RechargeCompletedEvent,
  RechargeFailedEvent,
  RECHARGE_EVENT_SCHEMAS,
  EVENT_DETAIL_TYPES,
  EventSchema,
} from "./recharge-event-schemas";

export interface RechargeEventBridgeConfig {
  eventBusName: string;
  region?: string;
  maxRetries?: number;
}

export interface EventPublishResult {
  success: boolean;
  eventId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export class RechargeEventBridgeService {
  private client: EventBridgeClient;
  private eventBusName: string;
  private retry: ExponentialBackoff;
  private logger: StructuredLogger;

  constructor(config: RechargeEventBridgeConfig) {
    this.client = new EventBridgeClient({ region: config.region });
    this.eventBusName = config.eventBusName;
    this.logger = createProjectLogger();

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
        "InternalServerError",
        "Error", // Allow retrying generic errors for testing
      ],
    });
  }

  /**
   * Publishes Orange Money payment success event
   */
  async publishPaymentSuccessEvent(data: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    orangeMoneyTransactionId: string;
    userHederaAccountId: string;
    fees: {
      orangeMoneyFee: number;
      platformFee: number;
      totalFees: number;
    };
  }): Promise<EventPublishResult> {
    const event: PaymentSuccessEvent = {
      eventId: uuidv4(),
      eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    return this.publishEvent(
      event,
      EVENT_DETAIL_TYPES.ORANGE_MONEY_PAYMENT_SUCCESS
    );
  }

  /**
   * Publishes HBAR conversion started event
   */
  async publishConversionStartedEvent(data: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    estimatedHBARAmount: number;
    exchangeRate: number;
  }): Promise<EventPublishResult> {
    const event: ConversionStartedEvent = {
      eventId: uuidv4(),
      eventType: "HBAR_CONVERSION_STARTED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    return this.publishEvent(event, EVENT_DETAIL_TYPES.HBAR_CONVERSION_STARTED);
  }

  /**
   * Publishes HBAR conversion completed event
   */
  async publishConversionCompletedEvent(data: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    hbarAmount: number;
    exchangeRate: number;
    hederaTransactionId: string;
    actualCost: string;
    userHederaAccountId: string;
  }): Promise<EventPublishResult> {
    const event: ConversionCompletedEvent = {
      eventId: uuidv4(),
      eventType: "HBAR_CONVERSION_COMPLETED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    return this.publishEvent(
      event,
      EVENT_DETAIL_TYPES.HBAR_CONVERSION_COMPLETED
    );
  }

  /**
   * Publishes HBAR conversion failed event
   */
  async publishConversionFailedEvent(data: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    errorCode: string;
    errorMessage: string;
    retryCount: number;
    retryable: boolean;
  }): Promise<EventPublishResult> {
    const event: ConversionFailedEvent = {
      eventId: uuidv4(),
      eventType: "HBAR_CONVERSION_FAILED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    return this.publishEvent(event, EVENT_DETAIL_TYPES.HBAR_CONVERSION_FAILED);
  }

  /**
   * Publishes recharge completed event
   */
  async publishRechargeCompletedEvent(data: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    hbarAmount: number;
    exchangeRate: number;
    totalFees: number;
    processingTimeMs: number;
    userHederaAccountId: string;
  }): Promise<EventPublishResult> {
    const event: RechargeCompletedEvent = {
      eventId: uuidv4(),
      eventType: "RECHARGE_COMPLETED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    return this.publishEvent(event, EVENT_DETAIL_TYPES.RECHARGE_COMPLETED);
  }

  /**
   * Publishes recharge failed event
   */
  async publishRechargeFailedEvent(data: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    errorCode: string;
    errorMessage: string;
    failureStage: "payment" | "conversion" | "transfer";
    retryable: boolean;
  }): Promise<EventPublishResult> {
    const event: RechargeFailedEvent = {
      eventId: uuidv4(),
      eventType: "RECHARGE_FAILED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    return this.publishEvent(event, EVENT_DETAIL_TYPES.RECHARGE_FAILED);
  }

  /**
   * Generic method to publish any recharge event
   */
  private async publishEvent(
    event: RechargeEvent,
    detailType: string
  ): Promise<EventPublishResult> {
    try {
      // Validate event schema
      this.validateEventSchema(event);

      // Publish event with retry logic
      await this.retry.execute(
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
        `RechargeEventBridge-${event.eventType}-${event.transactionId}`
      );

      this.logger.info("Recharge event published successfully", {
        operation: "RechargeEventBridgePublish",
        eventType: event.eventType,
        eventId: event.eventId,
        transactionId: event.transactionId,
        userId: event.userId,
        detailType,
      });

      return {
        success: true,
        eventId: event.eventId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.logger.error(
        "Failed to publish recharge event",
        {
          operation: "RechargeEventBridgePublish",
          eventType: event.eventType,
          eventId: event.eventId,
          transactionId: event.transactionId,
          userId: event.userId,
          detailType,
        },
        error as Error
      );

      return {
        success: false,
        error: {
          code: "EVENT_PUBLISH_FAILED",
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Validates event against its schema
   */
  private validateEventSchema(event: RechargeEvent): void {
    const schema = RECHARGE_EVENT_SCHEMAS[event.eventType];
    if (!schema) {
      throw new Error(`Unknown event type: ${event.eventType}`);
    }

    // Check required fields
    for (const field of schema.requiredFields) {
      if (
        !(field in event) ||
        (event as any)[field] === undefined ||
        (event as any)[field] === null
      ) {
        throw new Error(
          `Missing required field: ${field} for event type: ${event.eventType}`
        );
      }
    }

    // Validate version
    if (event.version !== schema.version) {
      throw new Error(
        `Invalid version: ${event.version}, expected: ${schema.version}`
      );
    }

    // Validate source
    if (event.source !== "sachain.recharge") {
      throw new Error(
        `Invalid source: ${event.source}, expected: sachain.recharge`
      );
    }

    // Validate timestamp format
    if (!this.isValidISOTimestamp(event.timestamp)) {
      throw new Error(`Invalid timestamp format: ${event.timestamp}`);
    }

    this.logger.debug("Recharge event schema validation passed", {
      operation: "RechargeEventSchemaValidation",
      eventType: event.eventType,
      eventId: event.eventId,
    });
  }

  /**
   * Validates ISO timestamp format
   */
  private isValidISOTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    return date.toISOString() === timestamp;
  }

  /**
   * Gets event schema for a specific event type
   */
  public getEventSchema(eventType: string): EventSchema | undefined {
    return RECHARGE_EVENT_SCHEMAS[eventType];
  }

  /**
   * Lists all available recharge event schemas
   */
  public getAllEventSchemas(): Record<string, EventSchema> {
    return RECHARGE_EVENT_SCHEMAS;
  }

  /**
   * Batch publish multiple events
   */
  async publishBatchEvents(
    events: Array<{
      event: RechargeEvent;
      detailType: string;
    }>
  ): Promise<Array<EventPublishResult>> {
    const results: EventPublishResult[] = [];

    for (const { event, detailType } of events) {
      const result = await this.publishEvent(event, detailType);
      results.push(result);
    }

    return results;
  }

  /**
   * Health check for EventBridge service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Check if EventBridge client is properly configured
      if (!this.client || !this.eventBusName) {
        throw new Error("EventBridge client not properly configured");
      }

      // Check if event bus name is valid
      if (this.eventBusName.trim() === "") {
        throw new Error("Invalid event bus name");
      }

      // Try to publish a test event (without actually sending it)
      const testEvent: PaymentSuccessEvent = {
        eventId: uuidv4(),
        eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: new Date().toISOString(),
        transactionId: "health-check",
        userId: "health-check",
        xafAmount: 1000,
        orangeMoneyTransactionId: "health-check",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 50,
          platformFee: 25,
          totalFees: 75,
        },
      };

      // Validate schema (without publishing)
      this.validateEventSchema(testEvent);

      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        healthy: false,
        latency,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Factory function to create RechargeEventBridgeService instance
export function createRechargeEventBridgeService(
  config: RechargeEventBridgeConfig
): RechargeEventBridgeService {
  return new RechargeEventBridgeService(config);
}
