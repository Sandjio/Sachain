import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequestEntry,
  PutEventsResponse,
} from "@aws-sdk/client-eventbridge";
import { KYCUploadDetail, ProcessingErrorCategory } from "./types";

/**
 * Configuration for EventPublisher
 */
export interface EventPublisherConfig {
  eventBusName: string;
  region?: string;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Result of event publishing operation
 */
export interface PublishResult {
  success: boolean;
  eventId?: string;
  failureReason?: string;
  retryCount: number;
  duration: number;
}

/**
 * Error thrown when event publishing fails permanently
 */
export class EventPublishError extends Error {
  constructor(
    message: string,
    public readonly category: ProcessingErrorCategory,
    public readonly retryCount: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "EventPublishError";
  }
}

/**
 * Utility class for publishing KYC events to EventBridge with retry logic
 */
export class EventPublisher {
  private readonly client: EventBridgeClient;
  private readonly config: Required<EventPublisherConfig>;

  constructor(config: EventPublisherConfig) {
    this.config = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      timeoutMs: 10000,
      region: process.env.AWS_REGION || "us-east-1",
      ...config,
    };

    this.client = new EventBridgeClient({
      region: this.config.region,
    });
  }

  /**
   * Publishes a KYC document uploaded event to EventBridge
   */
  async publishKYCUploadEvent(detail: KYCUploadDetail): Promise<PublishResult> {
    const startTime = Date.now();
    let retryCount = 0;

    const event: PutEventsRequestEntry = {
      Source: "sachain.kyc",
      DetailType: "KYC Document Uploaded",
      Detail: JSON.stringify(detail),
      EventBusName: this.config.eventBusName,
      Time: new Date(),
    };

    while (retryCount <= this.config.maxRetries) {
      try {
        const response = await this.publishEventWithTimeout(event);

        if (response.FailedEntryCount && response.FailedEntryCount > 0) {
          const failureReason = this.extractFailureReason(response);
          const errorCategory = this.categorizeError(failureReason);

          if (
            errorCategory === ProcessingErrorCategory.TRANSIENT &&
            retryCount < this.config.maxRetries
          ) {
            retryCount++;
            await this.delay(this.calculateDelay(retryCount));
            continue;
          }

          throw new EventPublishError(
            `Event publishing failed: ${failureReason}`,
            errorCategory,
            retryCount
          );
        }

        // Success case
        const eventId = response.Entries?.[0]?.EventId;
        const duration = Date.now() - startTime;
        return {
          success: true,
          eventId,
          retryCount,
          duration,
        };
      } catch (error) {
        const errorCategory = this.categorizeError(error);

        if (
          errorCategory === ProcessingErrorCategory.TRANSIENT &&
          retryCount < this.config.maxRetries
        ) {
          retryCount++;
          await this.delay(this.calculateDelay(retryCount));
          continue;
        }

        // Permanent failure or max retries exceeded
        const duration = Date.now() - startTime;
        throw new EventPublishError(
          `Event publishing failed after ${retryCount} retries: ${
            error instanceof Error ? error.message : String(error)
          }`,
          errorCategory,
          retryCount,
          error instanceof Error ? error : undefined
        );
      }
    }

    // This should never be reached, but TypeScript requires it
    const duration = Date.now() - startTime;
    throw new EventPublishError(
      "Event publishing failed: Maximum retries exceeded",
      ProcessingErrorCategory.PERMANENT,
      retryCount
    );
  }

  /**
   * Publishes multiple KYC events in a batch
   */
  async publishKYCUploadEvents(
    details: KYCUploadDetail[]
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    // Process events in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(details, concurrencyLimit);

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map((detail) => this.publishKYCUploadEvent(detail))
      );

      chunkResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            failureReason:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
            retryCount: 0,
            duration: 0,
          });
        }
      });
    }

    return results;
  }

  /**
   * Validates event detail before publishing
   */
  validateEventDetail(detail: KYCUploadDetail): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!detail.documentId || typeof detail.documentId !== "string") {
      errors.push("documentId is required and must be a string");
    }

    if (!detail.userId || typeof detail.userId !== "string") {
      errors.push("userId is required and must be a string");
    }

    if (!detail.documentType || typeof detail.documentType !== "string") {
      errors.push("documentType is required and must be a string");
    }

    if (!detail.fileName || typeof detail.fileName !== "string") {
      errors.push("fileName is required and must be a string");
    }

    if (typeof detail.fileSize !== "number" || detail.fileSize <= 0) {
      errors.push("fileSize is required and must be a positive number");
    }

    if (!detail.contentType || typeof detail.contentType !== "string") {
      errors.push("contentType is required and must be a string");
    }

    if (!detail.s3Key || typeof detail.s3Key !== "string") {
      errors.push("s3Key is required and must be a string");
    }

    if (!detail.s3Bucket || typeof detail.s3Bucket !== "string") {
      errors.push("s3Bucket is required and must be a string");
    }

    if (!detail.uploadedAt || typeof detail.uploadedAt !== "string") {
      errors.push("uploadedAt is required and must be a string");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Publishes an event with timeout protection
   */
  private async publishEventWithTimeout(
    event: PutEventsRequestEntry
  ): Promise<PutEventsResponse> {
    const command = new PutEventsCommand({
      Entries: [event],
    });

    return Promise.race([
      this.client.send(command),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Event publishing timed out after ${this.config.timeoutMs}ms`
            )
          );
        }, this.config.timeoutMs);
      }),
    ]);
  }

  /**
   * Extracts failure reason from EventBridge response
   */
  private extractFailureReason(response: PutEventsResponse): string {
    if (response.Entries && response.Entries.length > 0) {
      const entry = response.Entries[0];
      // Return ErrorCode first for proper categorization, then ErrorMessage
      return entry.ErrorCode || entry.ErrorMessage || "Unknown error";
    }
    return "Unknown error";
  }

  /**
   * Determines if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (typeof error === "string") {
      const retryableErrors = [
        "ThrottlingException",
        "InternalException",
        "ServiceUnavailable",
        "RequestTimeout",
        "NetworkingError",
        "Rate exceeded", // Add this for EventBridge throttling
        "Throttling",
      ];
      return retryableErrors.some((retryableError) =>
        error.includes(retryableError)
      );
    }

    if (error instanceof Error) {
      const retryableNames = [
        "ThrottlingException",
        "InternalException",
        "ServiceUnavailableException",
        "RequestTimeoutException",
        "NetworkingError",
        "TimeoutError",
      ];
      return (
        retryableNames.includes(error.name) ||
        error.message.includes("Rate exceeded") ||
        error.message.includes("Throttling")
      );
    }

    return false;
  }

  /**
   * Categorizes errors for proper handling
   */
  private categorizeError(error: any): ProcessingErrorCategory {
    if (typeof error === "string") {
      // Check for validation errors first
      if (
        error.includes("ValidationException") ||
        error.includes("InvalidParameter") ||
        error.includes("Invalid event")
      ) {
        return ProcessingErrorCategory.VALIDATION;
      }
      // Check for authorization errors
      if (
        error.includes("AccessDenied") ||
        error.includes("UnauthorizedOperation")
      ) {
        return ProcessingErrorCategory.AUTHORIZATION;
      }
      // Check for transient errors
      if (this.isRetryableError(error)) {
        return ProcessingErrorCategory.TRANSIENT;
      }
      return ProcessingErrorCategory.PERMANENT;
    }

    if (error instanceof Error) {
      // Check for validation errors first
      if (
        error.name.includes("ValidationException") ||
        error.name.includes("InvalidParameter") ||
        error.message.includes("ValidationException") ||
        error.message.includes("Invalid event")
      ) {
        return ProcessingErrorCategory.VALIDATION;
      }
      // Check for authorization errors
      if (
        error.name.includes("AccessDenied") ||
        error.name.includes("UnauthorizedOperation") ||
        error.message.includes("AccessDenied")
      ) {
        return ProcessingErrorCategory.AUTHORIZATION;
      }
      // Check for transient errors
      if (this.isRetryableError(error)) {
        return ProcessingErrorCategory.TRANSIENT;
      }
      return ProcessingErrorCategory.PERMANENT;
    }

    return ProcessingErrorCategory.PERMANENT;
  }

  /**
   * Calculates exponential backoff delay
   */
  private calculateDelay(retryCount: number): number {
    const delay = this.config.baseDelayMs * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, this.config.maxDelayMs);
  }

  /**
   * Delays execution for the specified number of milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Splits an array into chunks of specified size
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Closes the EventBridge client connection
   */
  async close(): Promise<void> {
    // EventBridge client doesn't have an explicit close method
    // This is here for consistency and future-proofing
  }
}

/**
 * Factory function to create EventPublisher with default configuration
 */
export function createEventPublisher(
  eventBusName: string,
  config?: Partial<EventPublisherConfig>
): EventPublisher {
  return new EventPublisher({
    eventBusName,
    ...config,
  });
}

/**
 * Singleton EventPublisher instance for reuse across Lambda invocations
 */
let globalEventPublisher: EventPublisher | null = null;

/**
 * Gets or creates a singleton EventPublisher instance
 */
export function getEventPublisher(
  eventBusName?: string,
  config?: Partial<EventPublisherConfig>
): EventPublisher {
  if (!globalEventPublisher) {
    if (!eventBusName) {
      throw new Error(
        "eventBusName is required when creating the first EventPublisher instance"
      );
    }
    globalEventPublisher = createEventPublisher(eventBusName, config);
  }
  return globalEventPublisher;
}

/**
 * Resets the singleton EventPublisher instance (useful for testing)
 */
export function resetEventPublisher(): void {
  globalEventPublisher = null;
}
