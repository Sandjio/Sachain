import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { v4 as uuidv4 } from "uuid";
import { ExponentialBackoff } from "./retry";
import { StructuredLogger, createProjectLogger } from "./structured-logger";

// Project Event Types
export interface BaseProjectEvent {
  eventId: string;
  eventType: string;
  source: string;
  version: string;
  timestamp: string;
  projectId: string;
  entrepreneurId: string;
}

export interface ProjectCreatedEvent extends BaseProjectEvent {
  eventType: "PROJECT_CREATED";
  projectName: string;
  category: string;
  stockSupply: number;
  targetFundingGoal?: number;
  pricePerStock?: number;
  status: string;
  createdAt: string;
}

export interface ProjectUpdatedEvent extends BaseProjectEvent {
  eventType: "PROJECT_UPDATED";
  changes: Record<string, { from: any; to: any }>;
  updatedAt: string;
}

export interface ProjectStatusChangedEvent extends BaseProjectEvent {
  eventType: "PROJECT_STATUS_CHANGED";
  previousStatus: string;
  newStatus: string;
  changedAt: string;
  reason?: string;
}

export interface ProjectDeletedEvent extends BaseProjectEvent {
  eventType: "PROJECT_DELETED";
  projectName: string;
  deletedAt: string;
  reason?: string;
}

export interface StockMintingStartedEvent extends BaseProjectEvent {
  eventType: "STOCK_MINTING_STARTED";
  tokenId?: string;
  stockSupply: number;
  walletAddress: string;
  startedAt: string;
}

export interface StockMintingProgressEvent extends BaseProjectEvent {
  eventType: "STOCK_MINTING_PROGRESS";
  progress: {
    completed: number;
    total: number;
    percentage: number;
    status: "in_progress" | "completed" | "failed";
    currentBatch?: number;
    totalBatches?: number;
  };
  timestamp: string;
}

export interface StockMintingCompletedEvent extends BaseProjectEvent {
  eventType: "STOCK_MINTING_COMPLETED";
  tokenId: string;
  totalMinted: number;
  totalBatches: number;
  transactionIds: string[];
  completedAt: string;
}

export interface StockMintingFailedEvent extends BaseProjectEvent {
  eventType: "STOCK_MINTING_FAILED";
  error: string;
  partialMinting?: {
    completed: number;
    total: number;
    transactionIds: string[];
  };
  failedAt: string;
}

export type ProjectEvent =
  | ProjectCreatedEvent
  | ProjectUpdatedEvent
  | ProjectStatusChangedEvent
  | ProjectDeletedEvent
  | StockMintingStartedEvent
  | StockMintingProgressEvent
  | StockMintingCompletedEvent
  | StockMintingFailedEvent;

// Event Schemas
export interface EventSchema {
  version: string;
  requiredFields: string[];
  description: string;
}

export const PROJECT_EVENT_SCHEMAS: Record<string, EventSchema> = {
  PROJECT_CREATED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "projectId",
      "entrepreneurId",
      "projectName",
      "category",
      "stockSupply",
      "status",
      "createdAt",
    ],
    description: "Published when a new project is created",
  },
  PROJECT_UPDATED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "projectId",
      "entrepreneurId",
      "changes",
      "updatedAt",
    ],
    description: "Published when a project is updated",
  },
  PROJECT_STATUS_CHANGED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "projectId",
      "entrepreneurId",
      "previousStatus",
      "newStatus",
      "changedAt",
    ],
    description: "Published when a project status changes",
  },
  PROJECT_DELETED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "projectId",
      "entrepreneurId",
      "projectName",
      "deletedAt",
    ],
    description: "Published when a project is deleted",
  },
  STOCK_MINTING_STARTED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "projectId",
      "entrepreneurId",
      "stockSupply",
      "walletAddress",
      "startedAt",
    ],
    description: "Published when stock minting begins",
  },
  STOCK_MINTING_PROGRESS: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "projectId",
      "entrepreneurId",
      "progress",
    ],
    description: "Published during stock minting progress updates",
  },
  STOCK_MINTING_COMPLETED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "projectId",
      "entrepreneurId",
      "tokenId",
      "totalMinted",
      "totalBatches",
      "transactionIds",
      "completedAt",
    ],
    description: "Published when stock minting completes successfully",
  },
  STOCK_MINTING_FAILED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "projectId",
      "entrepreneurId",
      "error",
      "failedAt",
    ],
    description: "Published when stock minting fails",
  },
};

export interface ProjectEventPublisherConfig {
  eventBusName: string;
  region?: string;
  maxRetries?: number;
}

export class ProjectEventPublisher {
  private client: EventBridgeClient;
  private eventBusName: string;
  private retry: ExponentialBackoff;
  private logger: StructuredLogger;

  constructor(config: ProjectEventPublisherConfig) {
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
   * Publishes a project created event
   */
  async publishProjectCreatedEvent(data: {
    projectId: string;
    entrepreneurId: string;
    projectName: string;
    category: string;
    stockSupply: number;
    targetFundingGoal?: number;
    pricePerStock?: number;
    status: string;
    createdAt: string;
  }): Promise<void> {
    const event: ProjectCreatedEvent = {
      eventId: uuidv4(),
      eventType: "PROJECT_CREATED",
      source: "sachain.projects",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "Project Created");
  }

  /**
   * Publishes a project updated event
   */
  async publishProjectUpdatedEvent(data: {
    projectId: string;
    entrepreneurId: string;
    changes: Record<string, { from: any; to: any }>;
    updatedAt: string;
  }): Promise<void> {
    const event: ProjectUpdatedEvent = {
      eventId: uuidv4(),
      eventType: "PROJECT_UPDATED",
      source: "sachain.projects",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "Project Updated");
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
    reason?: string;
  }): Promise<void> {
    const event: ProjectStatusChangedEvent = {
      eventId: uuidv4(),
      eventType: "PROJECT_STATUS_CHANGED",
      source: "sachain.projects",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "Project Status Changed");
  }

  /**
   * Publishes a project deleted event
   */
  async publishProjectDeletedEvent(data: {
    projectId: string;
    entrepreneurId: string;
    projectName: string;
    deletedAt: string;
    reason?: string;
  }): Promise<void> {
    const event: ProjectDeletedEvent = {
      eventId: uuidv4(),
      eventType: "PROJECT_DELETED",
      source: "sachain.projects",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "Project Deleted");
  }

  /**
   * Publishes a stock minting started event
   */
  async publishStockMintingStartedEvent(data: {
    projectId: string;
    entrepreneurId: string;
    tokenId?: string;
    stockSupply: number;
    walletAddress: string;
    startedAt: string;
  }): Promise<void> {
    const event: StockMintingStartedEvent = {
      eventId: uuidv4(),
      eventType: "STOCK_MINTING_STARTED",
      source: "sachain.stock-minting",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "Stock Minting Started");
  }

  /**
   * Publishes a stock minting progress event
   */
  async publishStockMintingProgressEvent(data: {
    projectId: string;
    entrepreneurId: string;
    progress: {
      completed: number;
      total: number;
      percentage: number;
      status: "in_progress" | "completed" | "failed";
      currentBatch?: number;
      totalBatches?: number;
    };
  }): Promise<void> {
    const event: StockMintingProgressEvent = {
      eventId: uuidv4(),
      eventType: "STOCK_MINTING_PROGRESS",
      source: "sachain.stock-minting",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "Stock Minting Progress");
  }

  /**
   * Publishes a stock minting completed event
   */
  async publishStockMintingCompletedEvent(data: {
    projectId: string;
    entrepreneurId: string;
    tokenId: string;
    totalMinted: number;
    totalBatches: number;
    transactionIds: string[];
    completedAt: string;
  }): Promise<void> {
    const event: StockMintingCompletedEvent = {
      eventId: uuidv4(),
      eventType: "STOCK_MINTING_COMPLETED",
      source: "sachain.stock-minting",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "Stock Minting Completed");
  }

  /**
   * Publishes a stock minting failed event
   */
  async publishStockMintingFailedEvent(data: {
    projectId: string;
    entrepreneurId: string;
    error: string;
    partialMinting?: {
      completed: number;
      total: number;
      transactionIds: string[];
    };
    failedAt: string;
  }): Promise<void> {
    const event: StockMintingFailedEvent = {
      eventId: uuidv4(),
      eventType: "STOCK_MINTING_FAILED",
      source: "sachain.stock-minting",
      version: "1.0",
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.publishEvent(event, "Stock Minting Failed");
  }

  /**
   * Generic method to publish any project event
   */
  private async publishEvent(
    event: ProjectEvent,
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
        `EventBridge-${event.eventType}-${event.projectId}`
      );

      this.logger.info("Project event published successfully", {
        operation: "ProjectEventPublish",
        eventType: event.eventType,
        eventId: event.eventId,
        projectId: event.projectId,
        entrepreneurId: event.entrepreneurId,
        detailType,
      });
    } catch (error) {
      this.logger.error(
        "Failed to publish project event",
        {
          operation: "ProjectEventPublish",
          eventType: event.eventType,
          eventId: event.eventId,
          projectId: event.projectId,
          entrepreneurId: event.entrepreneurId,
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
  private validateEventSchema(event: ProjectEvent): void {
    const schema = PROJECT_EVENT_SCHEMAS[event.eventType];
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
    const validSources = ["sachain.projects", "sachain.stock-minting"];
    if (!validSources.includes(event.source)) {
      throw new Error(
        `Invalid source: ${event.source}, expected one of: ${validSources.join(", ")}`
      );
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
    try {
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) && date.toISOString() === timestamp;
    } catch {
      return false;
    }
  }

  /**
   * Gets event schema for a specific event type
   */
  public getEventSchema(eventType: string): EventSchema | undefined {
    return PROJECT_EVENT_SCHEMAS[eventType];
  }

  /**
   * Lists all available event schemas
   */
  public getAllEventSchemas(): Record<string, EventSchema> {
    return PROJECT_EVENT_SCHEMAS;
  }
}

// Factory function to create ProjectEventPublisher instance
export function createProjectEventPublisher(
  config: ProjectEventPublisherConfig
): ProjectEventPublisher {
  return new ProjectEventPublisher(config);
}