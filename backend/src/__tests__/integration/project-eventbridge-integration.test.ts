import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { mockClient } from "aws-sdk-client-mock";
import {
  ProjectEventPublisher,
  createProjectEventPublisher,
} from "../../utils/project-event-publisher";

// Mock EventBridge client
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock structured logger
jest.mock("../../utils/structured-logger", () => ({
  createProjectLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  }),
}));

// Mock retry utility
jest.mock("../../utils/retry", () => ({
  ExponentialBackoff: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockImplementation((fn) => fn()),
  })),
}));

describe("Project EventBridge Integration", () => {
  let publisher: ProjectEventPublisher;
  const mockConfig = {
    eventBusName: "sachain-event-bus",
    region: "us-east-1",
    maxRetries: 3,
  };

  beforeEach(() => {
    eventBridgeMock.reset();
    publisher = createProjectEventPublisher(mockConfig);
  });

  describe("Complete Project Lifecycle Events", () => {
    it("should publish all project lifecycle events successfully", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const projectData = {
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

      // 1. Project Created
      await publisher.publishProjectCreatedEvent(projectData);

      // 2. Project Updated
      await publisher.publishProjectUpdatedEvent({
        projectId: projectData.projectId,
        entrepreneurId: projectData.entrepreneurId,
        changes: {
          description: { from: "Old desc", to: "New desc" },
        },
        updatedAt: "2024-01-01T01:00:00.000Z",
      });

      // 3. Project Status Changed
      await publisher.publishProjectStatusChangedEvent({
        projectId: projectData.projectId,
        entrepreneurId: projectData.entrepreneurId,
        previousStatus: "draft",
        newStatus: "minting",
        changedAt: "2024-01-01T02:00:00.000Z",
      });

      // 4. Stock Minting Started
      await publisher.publishStockMintingStartedEvent({
        projectId: projectData.projectId,
        entrepreneurId: projectData.entrepreneurId,
        stockSupply: projectData.stockSupply,
        walletAddress: "0x123...abc",
        startedAt: "2024-01-01T02:30:00.000Z",
      });

      // 5. Stock Minting Progress
      await publisher.publishStockMintingProgressEvent({
        projectId: projectData.projectId,
        entrepreneurId: projectData.entrepreneurId,
        progress: {
          completed: 500,
          total: 1000,
          percentage: 50,
          status: "in_progress",
          currentBatch: 5,
          totalBatches: 10,
        },
      });

      // 6. Stock Minting Completed
      await publisher.publishStockMintingCompletedEvent({
        projectId: projectData.projectId,
        entrepreneurId: projectData.entrepreneurId,
        tokenId: "0.0.123456",
        totalMinted: 1000,
        totalBatches: 10,
        transactionIds: ["tx-1", "tx-2", "tx-3"],
        completedAt: "2024-01-01T03:00:00.000Z",
      });

      // 7. Final Status Change
      await publisher.publishProjectStatusChangedEvent({
        projectId: projectData.projectId,
        entrepreneurId: projectData.entrepreneurId,
        previousStatus: "minting",
        newStatus: "active",
        changedAt: "2024-01-01T03:00:00.000Z",
      });

      // Verify all events were published
      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(7);

      // Verify event sources and types
      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      const eventTypes = calls.map(call => {
        const eventDetail = JSON.parse(call.args[0].input.Entries![0].Detail!);
        return eventDetail.eventType;
      });

      expect(eventTypes).toEqual([
        "PROJECT_CREATED",
        "PROJECT_UPDATED",
        "PROJECT_STATUS_CHANGED",
        "STOCK_MINTING_STARTED",
        "STOCK_MINTING_PROGRESS",
        "STOCK_MINTING_COMPLETED",
        "PROJECT_STATUS_CHANGED",
      ]);
    });

    it("should handle event publishing failures gracefully", async () => {
      // Mock first call to fail, second to succeed
      eventBridgeMock
        .on(PutEventsCommand)
        .rejectsOnce(new Error("EventBridge temporarily unavailable"))
        .resolvesOnce({});

      const projectData = {
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        projectName: "Test Project",
        category: "Technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      // First event should fail
      await expect(
        publisher.publishProjectCreatedEvent(projectData)
      ).rejects.toThrow("EventBridge temporarily unavailable");

      // Second event should succeed
      await expect(
        publisher.publishProjectUpdatedEvent({
          projectId: projectData.projectId,
          entrepreneurId: projectData.entrepreneurId,
          changes: { name: { from: "Old", to: "New" } },
          updatedAt: "2024-01-01T01:00:00.000Z",
        })
      ).resolves.not.toThrow();

      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(2);
    });
  });

  describe("Event Schema Validation", () => {
    it("should validate event schemas for all project events", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      // Test each event type with complete data
      const baseData = {
        projectId: "proj-123",
        entrepreneurId: "ent-456",
      };

      // PROJECT_CREATED
      await publisher.publishProjectCreatedEvent({
        ...baseData,
        projectName: "Test Project",
        category: "Technology",
        stockSupply: 1000,
        targetFundingGoal: 50000,
        pricePerStock: 50,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
      });

      // PROJECT_DELETED
      await publisher.publishProjectDeletedEvent({
        ...baseData,
        projectName: "Test Project",
        deletedAt: "2024-01-01T00:00:00.000Z",
      });

      // STOCK_MINTING_FAILED
      await publisher.publishStockMintingFailedEvent({
        ...baseData,
        error: "Insufficient balance",
        partialMinting: {
          completed: 500,
          total: 1000,
          transactionIds: ["tx-1"],
        },
        failedAt: "2024-01-01T00:00:00.000Z",
      });

      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(3);

      // Verify all events have proper structure
      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      calls.forEach(call => {
        const entry = call.args[0].input.Entries![0];
        const eventDetail = JSON.parse(entry.Detail!);

        // All events should have these base fields
        expect(eventDetail).toHaveProperty("eventId");
        expect(eventDetail).toHaveProperty("eventType");
        expect(eventDetail).toHaveProperty("source");
        expect(eventDetail).toHaveProperty("version", "1.0");
        expect(eventDetail).toHaveProperty("timestamp");
        expect(eventDetail).toHaveProperty("projectId", baseData.projectId);
        expect(eventDetail).toHaveProperty("entrepreneurId", baseData.entrepreneurId);

        // Verify EventBridge entry structure
        expect(entry).toHaveProperty("Source");
        expect(entry).toHaveProperty("DetailType");
        expect(entry).toHaveProperty("Detail");
        expect(entry).toHaveProperty("EventBusName", mockConfig.eventBusName);
        expect(entry).toHaveProperty("Time");
      });
    });

    it("should reject events with missing required fields", async () => {
      const incompleteData = {
        projectId: "proj-123",
        // Missing entrepreneurId and other required fields
      } as any;

      await expect(
        publisher.publishProjectCreatedEvent(incompleteData)
      ).rejects.toThrow("Missing required field");
    });

    it("should reject events with invalid sources", async () => {
      // This test verifies that the validation catches invalid sources
      // by accessing the private validation method
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
  });

  describe("Event Bus Configuration", () => {
    it("should use correct event bus name and region", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      await publisher.publishProjectCreatedEvent({
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        projectName: "Test Project",
        category: "Technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
      });

      const call = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const entry = call.args[0].input.Entries![0];

      expect(entry.EventBusName).toBe(mockConfig.eventBusName);
      expect(entry.Source).toBe("sachain.projects");
    });

    it("should handle different event sources correctly", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      // Project event (sachain.projects source)
      await publisher.publishProjectCreatedEvent({
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        projectName: "Test Project",
        category: "Technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
      });

      // Stock minting event (sachain.stock-minting source)
      await publisher.publishStockMintingStartedEvent({
        projectId: "proj-123",
        entrepreneurId: "ent-456",
        stockSupply: 1000,
        walletAddress: "0x123...abc",
        startedAt: "2024-01-01T00:00:00.000Z",
      });

      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      expect(calls[0].args[0].input.Entries![0].Source).toBe("sachain.projects");
      expect(calls[1].args[0].input.Entries![0].Source).toBe("sachain.stock-minting");
    });
  });
});