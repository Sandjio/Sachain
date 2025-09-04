/**
 * Unit tests for Conversion Event Publisher
 */

import { EventBridge } from "aws-sdk";
import { ConversionEventPublisher } from "../event-publisher";
import {
  ConversionStartedDetail,
  ConversionCompletedDetail,
  ConversionFailedDetail,
} from "../event-publisher";

// Mock AWS SDK
jest.mock("aws-sdk");

const MockEventBridge = EventBridge as jest.MockedClass<typeof EventBridge>;

describe("ConversionEventPublisher", () => {
  let eventPublisher: ConversionEventPublisher;
  let mockEventBridge: jest.Mocked<EventBridge>;

  const mockConfig = {
    eventBusName: "test-event-bus",
    region: "us-east-1",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock EventBridge instance
    mockEventBridge = {
      putEvents: jest.fn().mockReturnThis(),
      listRules: jest.fn().mockReturnThis(),
      promise: jest.fn(),
    } as any;

    // Mock EventBridge constructor
    MockEventBridge.mockImplementation(() => mockEventBridge);

    eventPublisher = new ConversionEventPublisher(mockConfig);
  });

  describe("publishConversionStarted", () => {
    const mockDetail: ConversionStartedDetail = {
      transactionId: "test-tx-123",
      userId: "user-123",
      xafAmount: 10000,
      exchangeRate: 0.00005,
      estimatedHBARAmount: 0.5,
    };

    it("should successfully publish conversion started event", async () => {
      const mockResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };

      mockEventBridge.putEvents().promise.mockResolvedValue(mockResponse);

      const result = await eventPublisher.publishConversionStarted(mockDetail);

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();

      expect(mockEventBridge.putEvents).toHaveBeenCalledWith({
        Entries: [
          {
            Source: "sachain.recharge",
            DetailType: "HBAR Conversion Started",
            Detail: expect.stringContaining('"transactionId":"test-tx-123"'),
            EventBusName: "test-event-bus",
            Time: expect.any(Date),
          },
        ],
      });
    });

    it("should handle EventBridge failures", async () => {
      const mockResponse = {
        FailedEntryCount: 1,
        Entries: [
          {
            ErrorCode: "InternalException",
            ErrorMessage: "Internal service error",
          },
        ],
      };

      mockEventBridge.putEvents().promise.mockResolvedValue(mockResponse);

      const result = await eventPublisher.publishConversionStarted(mockDetail);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EVENT_PUBLISH_FAILED");
      expect(result.error?.message).toContain("InternalException");
    });

    it("should handle network errors", async () => {
      mockEventBridge
        .putEvents()
        .promise.mockRejectedValue(new Error("Network connection failed"));

      const result = await eventPublisher.publishConversionStarted(mockDetail);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EVENT_PUBLISH_FAILED");
      expect(result.error?.message).toBe("Network connection failed");
    });
  });

  describe("publishConversionCompleted", () => {
    const mockDetail: ConversionCompletedDetail = {
      transactionId: "test-tx-123",
      userId: "user-123",
      xafAmount: 10000,
      hbarAmount: 0.5,
      exchangeRate: 0.00005,
      hederaTransactionId: "hedera-tx-456",
      fees: {
        orangeMoneyFee: 150,
        platformFee: 250,
        totalFees: 400,
      },
    };

    it("should successfully publish conversion completed event", async () => {
      const mockResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };

      mockEventBridge.putEvents().promise.mockResolvedValue(mockResponse);

      const result = await eventPublisher.publishConversionCompleted(
        mockDetail
      );

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();

      expect(mockEventBridge.putEvents).toHaveBeenCalledWith({
        Entries: [
          {
            Source: "sachain.recharge",
            DetailType: "HBAR Conversion Completed",
            Detail: expect.stringContaining(
              '"hederaTransactionId":"hedera-tx-456"'
            ),
            EventBusName: "test-event-bus",
            Time: expect.any(Date),
          },
        ],
      });
    });

    it("should include all required fields in the event", async () => {
      const mockResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };

      mockEventBridge.putEvents().promise.mockResolvedValue(mockResponse);

      await eventPublisher.publishConversionCompleted(mockDetail);

      const callArgs = mockEventBridge.putEvents.mock.calls[0][0];
      const eventDetail = JSON.parse(callArgs.Entries[0].Detail);

      expect(eventDetail.eventType).toBe("HBAR_CONVERSION_COMPLETED");
      expect(eventDetail.source).toBe("sachain.recharge");
      expect(eventDetail.detail.transactionId).toBe("test-tx-123");
      expect(eventDetail.detail.hbarAmount).toBe(0.5);
      expect(eventDetail.detail.hederaTransactionId).toBe("hedera-tx-456");
    });
  });

  describe("publishConversionFailed", () => {
    const mockDetail: ConversionFailedDetail = {
      transactionId: "test-tx-123",
      userId: "user-123",
      xafAmount: 10000,
      errorMessage: "Hedera network error",
      retryCount: 2,
      willRetry: true,
    };

    it("should successfully publish conversion failed event", async () => {
      const mockResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };

      mockEventBridge.putEvents().promise.mockResolvedValue(mockResponse);

      const result = await eventPublisher.publishConversionFailed(mockDetail);

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();

      expect(mockEventBridge.putEvents).toHaveBeenCalledWith({
        Entries: [
          {
            Source: "sachain.recharge",
            DetailType: "HBAR Conversion Failed",
            Detail: expect.stringContaining(
              '"errorMessage":"Hedera network error"'
            ),
            EventBusName: "test-event-bus",
            Time: expect.any(Date),
          },
        ],
      });
    });

    it("should include retry information in the event", async () => {
      const mockResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };

      mockEventBridge.putEvents().promise.mockResolvedValue(mockResponse);

      await eventPublisher.publishConversionFailed(mockDetail);

      const callArgs = mockEventBridge.putEvents.mock.calls[0][0];
      const eventDetail = JSON.parse(callArgs.Entries[0].Detail);

      expect(eventDetail.detail.retryCount).toBe(2);
      expect(eventDetail.detail.willRetry).toBe(true);
    });
  });

  describe("healthCheck", () => {
    it("should pass when EventBridge is accessible", async () => {
      mockEventBridge.listRules().promise.mockResolvedValue({
        Rules: [],
      });

      await expect(eventPublisher.healthCheck()).resolves.not.toThrow();

      expect(mockEventBridge.listRules).toHaveBeenCalledWith({
        EventBusName: "test-event-bus",
        Limit: 1,
      });
    });

    it("should fail when EventBridge is not accessible", async () => {
      mockEventBridge
        .listRules()
        .promise.mockRejectedValue(new Error("Access denied"));

      await expect(eventPublisher.healthCheck()).rejects.toThrow(
        "EventBridge health check failed"
      );
    });
  });

  describe("publishBatch", () => {
    const mockEvents = [
      {
        source: "sachain.recharge",
        detailType: "Test Event 1",
        detail: { id: 1 },
      },
      {
        source: "sachain.recharge",
        detailType: "Test Event 2",
        detail: { id: 2 },
      },
    ];

    it("should successfully publish batch of events", async () => {
      const mockResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-1" }, { EventId: "event-2" }],
      };

      mockEventBridge.putEvents().promise.mockResolvedValue(mockResponse);

      const result = await eventPublisher.publishBatch(mockEvents);

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle partial failures in batch", async () => {
      const mockResponse = {
        FailedEntryCount: 1,
        Entries: [
          { EventId: "event-1" },
          {
            ErrorCode: "ValidationException",
            ErrorMessage: "Invalid event format",
          },
        ],
      };

      mockEventBridge.putEvents().promise.mockResolvedValue(mockResponse);

      const result = await eventPublisher.publishBatch(mockEvents);

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("ValidationException");
    });

    it("should handle empty batch", async () => {
      const result = await eventPublisher.publishBatch([]);

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      expect(mockEventBridge.putEvents).not.toHaveBeenCalled();
    });

    it("should handle large batches by splitting them", async () => {
      // Create 15 events (should be split into 2 batches of 10 and 5)
      const largeEventBatch = Array(15)
        .fill(null)
        .map((_, i) => ({
          source: "sachain.recharge",
          detailType: `Test Event ${i}`,
          detail: { id: i },
        }));

      const mockResponse = {
        FailedEntryCount: 0,
        Entries: Array(10).fill({ EventId: "event-id" }),
      };

      mockEventBridge.putEvents().promise.mockResolvedValue(mockResponse);

      const result = await eventPublisher.publishBatch(largeEventBatch);

      expect(result.successCount).toBe(15);
      expect(result.failedCount).toBe(0);
      expect(mockEventBridge.putEvents).toHaveBeenCalledTimes(2); // Two batches
    });

    it("should handle network errors in batch processing", async () => {
      mockEventBridge
        .putEvents()
        .promise.mockRejectedValue(new Error("Network timeout"));

      const result = await eventPublisher.publishBatch(mockEvents);

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Network timeout");
    });
  });
});
