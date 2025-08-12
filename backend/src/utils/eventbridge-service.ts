import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { v4 as uuidv4 } from "uuid";
import { ExponentialBackoff } from "./retry";
import { StructuredLogger, createKYCLogger } from "./structured-logger";
import {
  KYCEvent,
  KYC_EVENT_SCHEMAS,
  EventSchema,
  KYCStatusChangeEvent,
  KYCDocumentUploadedEvent,
  KYCReviewStartedEvent,
  KYCReviewCompletedEvent,
} from "../lambdas/admin-review/types";

export interface EventBridgeServiceConfig {
  eventBusName: string;
  region?: string;
  maxRetries?: number;
}

export class EventBridgeService {
  private client: EventBridgeClient;
  private eventBusName: string;
  private retry: ExponentialBackoff;
  private logger: StructuredLogger;

  constructor(config: EventBridgeServiceConfig) {
    this.client = new EventBridgeClient({ region: config.region });
    this.eventBusName = config.eventBusName;
    this.logger = createKYCLogger();

    this.retry = new ExponentialBackoff({
      maxRetries: config.maxRetries || 3,
      baseDelay: 200,
      maxDelay: 5000,
      jitterType: "full",
    });
  }

  /**
   * Publishes a KYC status change event
   */
  async publishKYCStatusChangeEvent(data: {
    userId: string;
    documentId: string;
    previousStatus: "not_started" | "pending" | "approved" | "rejected";
    newStatus: "not_started" | "pending" | "approved" | "rejected";
    reviewedBy: string;
    reviewComments?: string;
    documentType: "national_id";
    userType: "entrepreneur" | "investor";
  }): Promise<void> {
    const event: KYCStatusChangeEvent = {
      eventId: uuidv4(),
      eventType: "KYC_STATUS_CHANGED",
      source: "sachain.kyc",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "KYC Status Changed");
  }

  /**
   * Publishes a KYC document uploaded event
   */
  async publishKYCDocumentUploadedEvent(data: {
    userId: string;
    documentId: string;
    documentType: "national_id";
    fileSize: number;
    mimeType: string;
    s3Key: string;
    userType: "entrepreneur" | "investor";
  }): Promise<void> {
    const event: KYCDocumentUploadedEvent = {
      eventId: uuidv4(),
      eventType: "KYC_DOCUMENT_UPLOADED",
      source: "sachain.kyc",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "KYC Document Uploaded");
  }

  /**
   * Publishes a KYC review started event
   */
  async publishKYCReviewStartedEvent(data: {
    userId: string;
    documentId: string;
    reviewedBy: string;
    documentType: "national_id";
  }): Promise<void> {
    const event: KYCReviewStartedEvent = {
      eventId: uuidv4(),
      eventType: "KYC_REVIEW_STARTED",
      source: "sachain.kyc",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "KYC Review Started");
  }

  /**
   * Publishes a KYC review completed event
   */
  async publishKYCReviewCompletedEvent(data: {
    userId: string;
    documentId: string;
    reviewedBy: string;
    reviewResult: "approved" | "rejected";
    reviewComments?: string;
    documentType: "national_id";
    processingTimeMs: number;
  }): Promise<void> {
    const event: KYCReviewCompletedEvent = {
      eventId: uuidv4(),
      eventType: "KYC_REVIEW_COMPLETED",
      source: "sachain.kyc",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "KYC Review Completed");
  }

  /**
   * Generic method to publish any KYC event
   */
  private async publishEvent(
    event: KYCEvent,
    detailType: string
  ): Promise<void> {
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
        `EventBridge-${event.eventType}-${event.documentId}`
      );

      this.logger.info("Event published successfully", {
        operation: "EventBridgePublish",
        eventType: event.eventType,
        eventId: event.eventId,
        userId: event.userId,
        documentId: event.documentId,
        detailType,
      });
    } catch (error) {
      this.logger.error(
        "Failed to publish event",
        {
          operation: "EventBridgePublish",
          eventType: event.eventType,
          eventId: event.eventId,
          userId: event.userId,
          documentId: event.documentId,
          detailType,
        },
        error as Error
      );

      throw error;
    }
  }

  /**
   * Validates event against its schema
   */
  private validateEventSchema(event: KYCEvent): void {
    const schema = KYC_EVENT_SCHEMAS[event.eventType];
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
    if (event.source !== "sachain.kyc") {
      throw new Error(`Invalid source: ${event.source}, expected: sachain.kyc`);
    }

    // Validate timestamp format
    if (!this.isValidISOTimestamp(event.timestamp)) {
      throw new Error(`Invalid timestamp format: ${event.timestamp}`);
    }

    this.logger.debug("Event schema validation passed", {
      operation: "EventSchemaValidation",
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
    return KYC_EVENT_SCHEMAS[eventType];
  }

  /**
   * Lists all available event schemas
   */
  public getAllEventSchemas(): Record<string, EventSchema> {
    return KYC_EVENT_SCHEMAS;
  }
}

// Factory function to create EventBridge service instance
export function createEventBridgeService(
  config: EventBridgeServiceConfig
): EventBridgeService {
  return new EventBridgeService(config);
}
