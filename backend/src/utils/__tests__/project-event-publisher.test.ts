import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { mockClient } from "aws-sdk-client-mock";
import {
  ProjectEventPublisher,
  createProjectEventPublisher,
  PROJECT_EVENT_SCHEMAS,
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectStatusChangedEvent,
  StockMintingCompletedEvent,
} from "../project-event-publisher";

// Mock EventBridge client
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock structured logger
jest.mock("../structured-logger", () => ({
  createProjectLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  }),
}));

// Mock retry utility
jest.mock("../retry", () => ({
  ExponentialBackoff: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockImplementation((fn) => fn()),
  })),
}));

describe("ProjectEventPublisher", () => {
  let publisher: ProjectEventPublisher;
  const mockConfig = {
    eventBusName: "test-event-bus",
    region: "us-east-1",
    maxRetries: 3,
  };

  beforeEach(() => {
    eventBridgeMock.reset();
    publisher = new ProjectEventPublisher(mockConfig);
  });

  describe("Factory Function", () => {
    it("should create ProjectEventPublisher instance", () => {
      const instance = createProjectEventPublisher(mockConfig);
      expect(instance).toBeInstanceOf(ProjectEventPublisher);
    });
  });

  describe("Event Schema Management", () => {
    it("should return correct event schema", () => {
      const schema = publisher.getEventSchema("PROJECT_CREATED");
      expect(schema).toEqual(PROJECT_EVENT_SCHEMAS.PROJECT_CREATED);
    });

    it("should return undefined for unknown event type", () => {
      const schema = publisher.getEventSchema("UNKNOWN_EVENT");
      expect(schema).toBeUndefined();
    });

    it("should return all event schemas", () => {
      const schemas = publisher.getAllEventSchemas();
      expect(schemas).toEqual(PROJECT_EVENT_SCHEMAS);
    });
  });

  describe("Project Created Event", () => {
    const mockProjectData = {
      projectId: "proj-123",
      entrepreneurId: "ent-456",
      projectName: "Test Project",
      category: "Technology",
      stockSupply: 1000,
      targetFundingGoal: 50000,
      pricePerStock: 50,
      status: "draft",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    it("should publish project created event successfully", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      await publisher.publishProjectCreatedEvent(mockProjectData);

      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(1);
      const call = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const entry = call.args[0].input.Entries![0];

      expect(entry.Source).toBe("sachain.projects");
      expect(entry.DetailType).toBe("Project Created");
      expect(entry.EventBusName).toBe("test-event-bus");

      const eventDetail = JSON.parse(entry.Detail!);
      expect(eventDetail.eventType).toBe("PROJECT_CREATED");
      expect(eventDetail.projectId).toBe(mockProjectData.projectId);
      expect(eventDetail.entrepreneurId).toBe(mockProjectData.entrepreneurId);
      expect(eventDetail.projectName).toBe(mockProjectData.projectName);
    });

    it("should include all required fields in project created event", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      await publisher.publishProjectCreatedEvent(mockProjectData);

      const call = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const eventDetail = JSON.parse(call.args[0].input.Entries![0].Detail!);

      const requiredFields = PROJECT_EVENT_SCHEMAS.PROJECT_CREATED.requiredFields;
      for (const field of requiredFields) {
        expect(eventDetail).toHaveProperty(field);
        expect(eventDetail[field]).toBeDefined();
      }
    });
  });

  describe("Project Updated Event", () => {
    const mockUpdateData = {
      projectId: "proj-123",
      entrepreneurId: "ent-456",
      changes: {
        name: { from: "Old Name", to: "New Name" },
        description: { from: "Old Description", to: "New Description" },
      },
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    it("should publish project updated event successfully", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      await publisher.publishProjectUpdatedEvent(mockUpdateData);

      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(1);
      const call = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const entry = call.args[0].input.Entries![0];

      expect(entry.Source).toBe("sachain.projects");
      expect(entry.DetailType).toBe("Project Updated");

      const eventDetail = JSON.parse(entry.Detail!);
      expect(eventDetail.eventType).toBe("PROJECT_UPDATED");
      expect(eventDetail.changes).toEqual(mockUpdateData.changes);
    });
  });

  describe("Project Status Changed Event", () => {
    const mockStatusData = {
      projectId: "proj-123",
      entrepreneurId: "ent-456",
      previousStatus: "draft",
      newStatus: "minting",
      changedAt: "2024-01-01T00:00:00.000Z",
      reason: "User initiated minting",
    };

    it("should publish project status changed event successfully", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      await publisher.publishProjectStatusChangedEvent(mockStatusData);

      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(1);
      const call = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const entry = call.args[0].input.Entries![0];

      expect(entry.Source).toBe("sachain.projects");
      expect(entry.DetailType).toBe("Project Status Changed");

      const eventDetail = JSON.parse(entry.Detail!);
      expect(eventDetail.eventType).toBe("PROJECT_STATUS_CHANGED");
      expect(eventDetail.previousStatus).toBe(mockStatusData.previousStatus);
      expect(eventDetail.newStatus).toBe(mockStatusData.newStatus);
    });
  });

  describe("Stock Minting Events", () => {
    const mockMintingData = {
      projectId: "proj-123",
      entrepreneurId: "ent-456",
      stockSupply: 1000,
      walletAddress: "0x123...abc",
      startedAt: "2024-01-01T00:00:00.000Z",
    };

    it("should publish stock minting started event successfully", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      await publisher.publishStockMintingStartedEvent(mockMintingData);

      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(1);
      const call = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const entry = call.args[0].input.Entries![0];

      expect(entry.Source).toBe("sachain.stock-minting");
      expect(entry.DetailType).toBe("Stock Minting Started");

      const eventDetail = JSON.parse(entry.Detail!);
      expect(eventDetail.eventType).toBe("STOCK_MINTING_STARTED");
      expect(eventDetail.stockSupply).toBe(mockMintingData.stockSupply);
    });

    it("should publish stock minting progress event successfully", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const progressData = {
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        progress: {
          completed: 500,
          total: 1000,
          percentage: 50,
          status: "in_progress" as const,
          currentBatch: 5,
          totalBatches: 10,
        },
      };

      await publisher.publishStockMintingProgressEvent(progressData);

      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(1);
      const call = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const eventDetail = JSON.parse(call.args[0].input.Entries![0].Detail!);

      expect(eventDetail.eventType).toBe("STOCK_MINTING_PROGRESS");
      expect(eventDetail.progress).toEqual(progressData.progress);
    });

    it("should publish stock minting completed event successfully", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const completedData = {
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        tokenId: "0.0.123456",
        totalMinted: 1000,
        totalBatches: 10,
        transactionIds: ["tx-1", "tx-2", "tx-3"],
        completedAt: "2024-01-01T00:00:00.000Z",
      };

      await publisher.publishStockMintingCompletedEvent(completedData);

      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(1);
      const call = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const eventDetail = JSON.parse(call.args[0].input.Entries![0].Detail!);

      expect(eventDetail.eventType).toBe("STOCK_MINTING_COMPLETED");
      expect(eventDetail.tokenId).toBe(completedData.tokenId);
      expect(eventDetail.totalMinted).toBe(completedData.totalMinted);
    });

    it("should publish stock minting failed event successfully", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const failedData = {
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        error: "Insufficient balance",
        partialMinting: {
          completed: 500,
          total: 1000,
          transactionIds: ["tx-1", "tx-2"],
        },
        failedAt: "2024-01-01T00:00:00.000Z",
      };

      await publisher.publishStockMintingFailedEvent(failedData);

      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(1);
      const call = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const eventDetail = JSON.parse(call.args[0].input.Entries![0].Detail!);

      expect(eventDetail.eventType).toBe("STOCK_MINTING_FAILED");
      expect(eventDetail.error).toBe(failedData.error);
      expect(eventDetail.partialMinting).toEqual(failedData.partialMinting);
    });
  });

  describe("Event Validation", () => {
    it("should throw error for missing required fields", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const invalidData = {
        projectId: "proj-123",
        // Missing required fields
      } as any;

      await expect(
        publisher.publishProjectCreatedEvent(invalidData)
      ).rejects.toThrow("Missing required field");
    });

    it("should throw error for invalid timestamp format", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      // Mock the private method to test validation
      const mockEvent = {
        eventId: "test-id",
        eventType: "PROJECT_CREATED",
        source: "sachain.projects",
        version: "1.0",
        timestamp: "invalid-timestamp",
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        projectName: "Test",
        category: "Tech",
        stockSupply: 100,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      // Access private method for testing
      const validateMethod = (publisher as any).validateEventSchema.bind(publisher);
      expect(() => validateMethod(mockEvent)).toThrow("Invalid timestamp format");
    });

    it("should throw error for invalid source", async () => {
      const mockEvent = {
        eventId: "test-id",
        eventType: "PROJECT_CREATED",
        source: "invalid.source",
        version: "1.0",
        timestamp: "2024-01-01T00:00:00.000Z",
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        projectName: "Test",
        category: "Tech",
        stockSupply: 100,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const validateMethod = (publisher as any).validateEventSchema.bind(publisher);
      expect(() => validateMethod(mockEvent)).toThrow("Invalid source");
    });

    it("should throw error for unknown event type", async () => {
      const mockEvent = {
        eventId: "test-id",
        eventType: "UNKNOWN_EVENT",
        source: "sachain.projects",
        version: "1.0",
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      const validateMethod = (publisher as any).validateEventSchema.bind(publisher);
      expect(() => validateMethod(mockEvent)).toThrow("Unknown event type");
    });
  });

  describe("Error Handling", () => {
    it("should handle EventBridge API errors", async () => {
      const error = new Error("EventBridge API Error");
      eventBridgeMock.on(PutEventsCommand).rejects(error);

      const mockData = {
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        projectName: "Test Project",
        category: "Technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      await expect(
        publisher.publishProjectCreatedEvent(mockData)
      ).rejects.toThrow("EventBridge API Error");
    });

    it("should handle retry logic on failures", async () => {
      // Mock retry to actually execute the function multiple times
      const mockRetry = {
        execute: jest.fn().mockImplementation(async (fn) => {
          // Simulate retry attempts
          try {
            return await fn();
          } catch (error) {
            // Retry once more
            return await fn();
          }
        }),
      };

      (publisher as any).retry = mockRetry;

      eventBridgeMock.on(PutEventsCommand).rejectsOnce(new Error("Temporary failure")).resolvesOnce({});

      const mockData = {
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        projectName: "Test Project",
        category: "Technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      await publisher.publishProjectCreatedEvent(mockData);

      expect(mockRetry.execute).toHaveBeenCalled();
    });
  });

  describe("Event Structure Validation", () => {
    it("should validate PROJECT_CREATED event structure", () => {
      const schema = PROJECT_EVENT_SCHEMAS.PROJECT_CREATED;
      expect(schema.version).toBe("1.0");
      expect(schema.requiredFields).toContain("projectId");
      expect(schema.requiredFields).toContain("entrepreneurId");
      expect(schema.requiredFields).toContain("projectName");
      expect(schema.description).toBeDefined();
    });

    it("should validate STOCK_MINTING_COMPLETED event structure", () => {
      const schema = PROJECT_EVENT_SCHEMAS.STOCK_MINTING_COMPLETED;
      expect(schema.version).toBe("1.0");
      expect(schema.requiredFields).toContain("tokenId");
      expect(schema.requiredFields).toContain("totalMinted");
      expect(schema.requiredFields).toContain("transactionIds");
    });

    it("should have schemas for all event types", () => {
      const expectedEventTypes = [
        "PROJECT_CREATED",
        "PROJECT_UPDATED",
        "PROJECT_STATUS_CHANGED",
        "PROJECT_DELETED",
        "STOCK_MINTING_STARTED",
        "STOCK_MINTING_PROGRESS",
        "STOCK_MINTING_COMPLETED",
        "STOCK_MINTING_FAILED",
      ];

      for (const eventType of expectedEventTypes) {
        expect(PROJECT_EVENT_SCHEMAS).toHaveProperty(eventType);
        expect(PROJECT_EVENT_SCHEMAS[eventType].version).toBe("1.0");
        expect(PROJECT_EVENT_SCHEMAS[eventType].requiredFields).toBeDefined();
        expect(PROJECT_EVENT_SCHEMAS[eventType].description).toBeDefined();
      }
    });
  });
});