import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { v4 as uuidv4 } from "uuid";
import { ExponentialBackoff } from "./retry";
import { StructuredLogger, createProjectLogger } from "./structured-logger";

export interface EventPublisherConfig {
  eventBusName: string;
  region?: string;
  maxRetries?: number;
}

export interface BaseEvent {
  eventId: string;
  eventType: string;
  source: string;
  version: string;
  timestamp: string;
  [key: string]: any;
}

export class EventPublisher {
  private client: EventBridgeClient;
  private eventBusName: string;
  private retry: ExponentialBackoff;
  private logger: StructuredLogger;

  constructor(config: EventPublisherConfig) {
    this.client = new EventBridgeClient({ region: config.region });
    this.eventBusName = config.eventBusName;
    this.logger = createProjectLogger();

    this.retry = new ExponentialBackoff({
      maxRetries: config.maxRetries || 3,
      baseDelay: 200,
      maxDelay: 5000,
      jitterType: "full",
    });
  }

  /**
   * Publishes a generic event to EventBridge
   */
  async publishEvent(
    source: string,
    eventDetail: any,
    detailType: string,
    eventType?: string
  ): Promise<void> {
    try {
      const event: BaseEvent = {
        eventId: uuidv4(),
        eventType: eventType || detailType,
        source,
        version: "1.0",
        timestamp: new Date().toISOString(),
        ...eventDetail,
      };

      // Publish event with retry logic
      await this.retry.execute(
        () =>
          this.client.send(
            new PutEventsCommand({
              Entries: [
                {
                  Source: source,
                  DetailType: detailType,
                  Detail: JSON.stringify(event),
                  EventBusName: this.eventBusName,
                  Time: new Date(event.timestamp),
                },
              ],
            })
          ),
        `EventBridge-${event.eventType}-${event.eventId}`
      );

      this.logger.info("Event published successfully", {
        operation: "EventBridgePublish",
        eventType: event.eventType,
        eventId: event.eventId,
        source,
        detailType,
      });
    } catch (error) {
      this.logger.error(
        "Failed to publish event",
        {
          operation: "EventBridgePublish",
          eventType: eventType || detailType,
          source,
          detailType,
        },
        error as Error
      );

      throw error;
    }
  }

  /**
   * Publishes a project creation event
   */
  async publishProjectCreatedEvent(data: {
    projectId: string;
    entrepreneurId: string;
    projectName: string;
    category: string;
    stockSupply: number;
    status: string;
    createdAt: string;
  }): Promise<void> {
    await this.publishEvent(
      "sachain.projects",
      {
        eventType: "PROJECT_CREATED",
        ...data,
      },
      "Project Created",
      "PROJECT_CREATED"
    );
  }

  /**
   * Publishes a project updated event
   */
  async publishProjectUpdatedEvent(data: {
    projectId: string;
    entrepreneurId: string;
    changes: Record<string, any>;
    updatedAt: string;
  }): Promise<void> {
    await this.publishEvent(
      "sachain.projects",
      {
        eventType: "PROJECT_UPDATED",
        ...data,
      },
      "Project Updated",
      "PROJECT_UPDATED"
    );
  }

  /**
   * Publishes a project status changed event
   */
  async publishProjectStatusChangedEvent(data: {
    projectId: string;
    entrepreneurId: string;
    previousStatus: string;
    newStatus: string;
    changedAt: string;
  }): Promise<void> {
    await this.publishEvent(
      "sachain.projects",
      {
        eventType: "PROJECT_STATUS_CHANGED",
        ...data,
      },
      "Project Status Changed",
      "PROJECT_STATUS_CHANGED"
    );
  }
}

// Factory function to create EventPublisher instance
export function createEventPublisher(
  config: EventPublisherConfig
): EventPublisher {
  return new EventPublisher(config);
}
