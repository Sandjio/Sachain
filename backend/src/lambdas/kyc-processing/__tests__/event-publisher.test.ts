import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsResponse,
} from "@aws-sdk/client-eventbridge";
import {
  EventPublisher,
  EventPublisherConfig,
  EventPublishError,
  createEventPublisher,
  getEventPublisher,
  resetEventPublisher,
} from "../event-publisher";
import { KYCUploadDetail, ProcessingErrorCategory } from "../types";

// Mock AWS SDK
jest.mock("@aws-sdk/client-eventbridge");

const mockEventBridgeClient = EventBridgeClient as jest.MockedClass<
  typeof EventBridgeClient
>;
const mockSend = jest.fn();

describe("EventPublisher", () => {
  let eventPublisher: EventPublisher;
  let mockClient: jest.Mocked<EventBridgeClient>;

  const validEventDetail: KYCUploadDetail = {
    documentId: "doc-123",
    userId: "user-456",
    documentType: "national_id",
    fileName: "id-card.jpg",
    fileSize: 1024000,
    contentType: "image/jpeg",
    s3Key: "kyc-documents/user-456/doc-123/id-card.jpg",
    s3Bucket: "sachain-kyc-documents",
    uploadedAt: "2024-01-15T10:30:00.000Z",
    metadata: { source: "mobile-app" },
  };

  const config: EventPublisherConfig = {
    eventBusName: "test-event-bus",
    region: "us-east-1",
    maxRetries: 2,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    timeoutMs: 5000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetEventPublisher();

    mockClient = {
      send: mockSend,
    } as any;

    mockEventBridgeClient.mockImplementation(() => mockClient);
    eventPublisher = new EventPublisher(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create EventPublisher with default config", () => {
      const publisher = new EventPublisher({ eventBusName: "test-bus" });
      expect(publisher).toBeInstanceOf(EventPublisher);
    });

    it("should create EventPublisher with custom config", () => {
      const customConfig: EventPublisherConfig = {
        eventBusName: "custom-bus",
        maxRetries: 5,
        baseDelayMs: 2000,
      };
      const publisher = new EventPublisher(customConfig);
      expect(publisher).toBeInstanceOf(EventPublisher);
    });
  });

  describe("publishKYCUploadEvent", () => {
    it("should successfully publish event on first attempt", async () => {
      const mockResponse: PutEventsResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };
      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await eventPublisher.publishKYCUploadEvent(
        validEventDetail
      );

      expect(result.success).toBe(true);
      expect(result.eventId).toBe("event-123");
      expect(result.retryCount).toBe(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutEventsCommand));
    });

    it("should retry on transient errors and eventually succeed", async () => {
      const failureResponse: PutEventsResponse = {
        FailedEntryCount: 1,
        Entries: [
          { ErrorCode: "ThrottlingException", ErrorMessage: "Rate exceeded" },
        ],
      };
      const successResponse: PutEventsResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-456" }],
      };

      mockSend
        .mockResolvedValueOnce(failureResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await eventPublisher.publishKYCUploadEvent(
        validEventDetail
      );

      expect(result.success).toBe(true);
      expect(result.eventId).toBe("event-456");
      expect(result.retryCount).toBe(1);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries on transient errors", async () => {
      const failureResponse: PutEventsResponse = {
        FailedEntryCount: 1,
        Entries: [
          { ErrorCode: "ThrottlingException", ErrorMessage: "Rate exceeded" },
        ],
      };

      mockSend
        .mockResolvedValueOnce(failureResponse)
        .mockResolvedValueOnce(failureResponse)
        .mockResolvedValueOnce(failureResponse);

      await expect(
        eventPublisher.publishKYCUploadEvent(validEventDetail)
      ).rejects.toThrow(EventPublishError);

      expect(mockSend).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should fail immediately on permanent errors", async () => {
      const failureResponse: PutEventsResponse = {
        FailedEntryCount: 1,
        Entries: [
          { ErrorCode: "ValidationException", ErrorMessage: "Invalid event" },
        ],
      };

      mockSend.mockResolvedValueOnce(failureResponse);

      await expect(
        eventPublisher.publishKYCUploadEvent(validEventDetail)
      ).rejects.toThrow(EventPublishError);

      expect(mockSend).toHaveBeenCalledTimes(1); // No retries for permanent errors
    });

    it("should handle network errors with retries", async () => {
      const networkError = new Error("Network error");
      networkError.name = "NetworkingError";

      const successResponse: PutEventsResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-789" }],
      };

      mockSend
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const result = await eventPublisher.publishKYCUploadEvent(
        validEventDetail
      );

      expect(result.success).toBe(true);
      expect(result.eventId).toBe("event-789");
      expect(result.retryCount).toBe(1);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("should handle timeout errors", async () => {
      // Create a publisher with very short timeout for testing
      const shortTimeoutPublisher = new EventPublisher({
        ...config,
        timeoutMs: 1, // 1ms timeout
      });

      mockSend.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      await expect(
        shortTimeoutPublisher.publishKYCUploadEvent(validEventDetail)
      ).rejects.toThrow(EventPublishError);
    });

    it("should throw EventPublishError with correct properties", async () => {
      const failureResponse: PutEventsResponse = {
        FailedEntryCount: 1,
        Entries: [
          { ErrorCode: "ValidationException", ErrorMessage: "Invalid event" },
        ],
      };

      mockSend.mockResolvedValueOnce(failureResponse);

      try {
        await eventPublisher.publishKYCUploadEvent(validEventDetail);
        fail("Expected EventPublishError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(EventPublishError);
        const publishError = error as EventPublishError;
        expect(publishError.category).toBe(ProcessingErrorCategory.VALIDATION);
        expect(publishError.retryCount).toBe(0);
        expect(publishError.message).toContain("ValidationException");
      }
    });
  });

  describe("publishKYCUploadEvents", () => {
    it("should publish multiple events successfully", async () => {
      const events = [
        validEventDetail,
        { ...validEventDetail, documentId: "doc-456" },
      ];
      const mockResponse: PutEventsResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };

      mockSend.mockResolvedValue(mockResponse);

      const results = await eventPublisher.publishKYCUploadEvents(events);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("should handle mixed success and failure results", async () => {
      const events = [
        validEventDetail,
        { ...validEventDetail, documentId: "doc-456" },
      ];
      const successResponse: PutEventsResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };
      const failureResponse: PutEventsResponse = {
        FailedEntryCount: 1,
        Entries: [
          { ErrorCode: "ValidationException", ErrorMessage: "Invalid event" },
        ],
      };

      mockSend
        .mockResolvedValueOnce(successResponse)
        .mockResolvedValueOnce(failureResponse);

      const results = await eventPublisher.publishKYCUploadEvents(events);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it("should handle empty event array", async () => {
      const results = await eventPublisher.publishKYCUploadEvents([]);
      expect(results).toHaveLength(0);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("validateEventDetail", () => {
    it("should validate correct event detail", () => {
      const result = eventPublisher.validateEventDetail(validEventDetail);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject event detail with missing required fields", () => {
      const invalidDetail = { ...validEventDetail };
      delete (invalidDetail as any).documentId;
      delete (invalidDetail as any).userId;

      const result = eventPublisher.validateEventDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "documentId is required and must be a string"
      );
      expect(result.errors).toContain(
        "userId is required and must be a string"
      );
    });

    it("should reject event detail with invalid field types", () => {
      const invalidDetail = {
        ...validEventDetail,
        fileSize: "invalid" as any,
        documentId: 123 as any,
      };

      const result = eventPublisher.validateEventDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "fileSize is required and must be a positive number"
      );
      expect(result.errors).toContain(
        "documentId is required and must be a string"
      );
    });

    it("should reject event detail with zero or negative file size", () => {
      const invalidDetail = { ...validEventDetail, fileSize: 0 };
      const result = eventPublisher.validateEventDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "fileSize is required and must be a positive number"
      );
    });
  });

  describe("error categorization", () => {
    it("should categorize validation errors correctly", async () => {
      const failureResponse: PutEventsResponse = {
        FailedEntryCount: 1,
        Entries: [
          {
            ErrorCode: "ValidationException",
            ErrorMessage: "Invalid parameter",
          },
        ],
      };

      mockSend.mockResolvedValueOnce(failureResponse);

      try {
        await eventPublisher.publishKYCUploadEvent(validEventDetail);
      } catch (error) {
        expect(error).toBeInstanceOf(EventPublishError);
        expect((error as EventPublishError).category).toBe(
          ProcessingErrorCategory.VALIDATION
        );
      }
    });

    it("should categorize authorization errors correctly", async () => {
      const authError = new Error("Access denied");
      authError.name = "AccessDenied";

      mockSend.mockRejectedValueOnce(authError);

      try {
        await eventPublisher.publishKYCUploadEvent(validEventDetail);
      } catch (error) {
        expect(error).toBeInstanceOf(EventPublishError);
        expect((error as EventPublishError).category).toBe(
          ProcessingErrorCategory.AUTHORIZATION
        );
      }
    });

    it("should categorize transient errors correctly", async () => {
      const throttleError = new Error("Rate exceeded");
      throttleError.name = "ThrottlingException";

      mockSend.mockRejectedValue(throttleError);

      try {
        await eventPublisher.publishKYCUploadEvent(validEventDetail);
      } catch (error) {
        expect(error).toBeInstanceOf(EventPublishError);
        expect((error as EventPublishError).category).toBe(
          ProcessingErrorCategory.TRANSIENT
        );
      }
    });
  });

  describe("retry logic", () => {
    it("should use exponential backoff with jitter", async () => {
      const failureResponse: PutEventsResponse = {
        FailedEntryCount: 1,
        Entries: [
          { ErrorCode: "ThrottlingException", ErrorMessage: "Rate exceeded" },
        ],
      };

      mockSend
        .mockResolvedValueOnce(failureResponse)
        .mockResolvedValueOnce(failureResponse)
        .mockResolvedValueOnce(failureResponse);

      const startTime = Date.now();
      try {
        await eventPublisher.publishKYCUploadEvent(validEventDetail);
      } catch (error) {
        const duration = Date.now() - startTime;
        // Should have waited for retries (at least base delay * 2 attempts)
        expect(duration).toBeGreaterThan(200); // 100ms base + 200ms second retry + processing time
      }
    });

    it("should respect max delay configuration", async () => {
      const shortMaxDelayPublisher = new EventPublisher({
        ...config,
        maxDelayMs: 50, // Very short max delay
        baseDelayMs: 1000, // High base delay that would exceed max
      });

      const failureResponse: PutEventsResponse = {
        FailedEntryCount: 1,
        Entries: [
          { ErrorCode: "ThrottlingException", ErrorMessage: "Rate exceeded" },
        ],
      };

      mockSend.mockResolvedValue(failureResponse);

      const startTime = Date.now();
      try {
        await shortMaxDelayPublisher.publishKYCUploadEvent(validEventDetail);
      } catch (error) {
        const duration = Date.now() - startTime;
        // Should not exceed max delay significantly
        expect(duration).toBeLessThan(500); // Much less than what base delay would cause
      }
    });
  });

  describe("factory functions", () => {
    it("should create EventPublisher with factory function", () => {
      const publisher = createEventPublisher("test-bus", { maxRetries: 5 });
      expect(publisher).toBeInstanceOf(EventPublisher);
    });

    it("should get singleton EventPublisher instance", () => {
      const publisher1 = getEventPublisher("test-bus");
      const publisher2 = getEventPublisher();
      expect(publisher1).toBe(publisher2);
    });

    it("should throw error when getting singleton without initial eventBusName", () => {
      expect(() => getEventPublisher()).toThrow("eventBusName is required");
    });

    it("should reset singleton EventPublisher", () => {
      const publisher1 = getEventPublisher("test-bus");
      resetEventPublisher();
      const publisher2 = getEventPublisher("test-bus-2");
      expect(publisher1).not.toBe(publisher2);
    });
  });

  describe("edge cases", () => {
    it("should handle EventBridge response without entries", async () => {
      const emptyResponse: PutEventsResponse = {
        FailedEntryCount: 0,
        Entries: [],
      };

      mockSend.mockResolvedValueOnce(emptyResponse);

      const result = await eventPublisher.publishKYCUploadEvent(
        validEventDetail
      );
      expect(result.success).toBe(true);
      expect(result.eventId).toBeUndefined();
    });

    it("should handle EventBridge response with undefined entries", async () => {
      const undefinedEntriesResponse: PutEventsResponse = {
        FailedEntryCount: 0,
      };

      mockSend.mockResolvedValueOnce(undefinedEntriesResponse);

      const result = await eventPublisher.publishKYCUploadEvent(
        validEventDetail
      );
      expect(result.success).toBe(true);
      expect(result.eventId).toBeUndefined();
    });

    it("should handle non-Error exceptions", async () => {
      mockSend.mockRejectedValueOnce("String error");

      try {
        await eventPublisher.publishKYCUploadEvent(validEventDetail);
      } catch (error) {
        expect(error).toBeInstanceOf(EventPublishError);
        expect((error as EventPublishError).originalError).toBeUndefined();
      }
    });

    it("should handle events with undefined metadata", async () => {
      const eventWithoutMetadata = { ...validEventDetail };
      delete eventWithoutMetadata.metadata;

      const mockResponse: PutEventsResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };
      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await eventPublisher.publishKYCUploadEvent(
        eventWithoutMetadata
      );
      expect(result.success).toBe(true);
    });
  });

  describe("performance and concurrency", () => {
    it("should handle large batch of events with concurrency limit", async () => {
      const events = Array.from({ length: 12 }, (_, i) => ({
        ...validEventDetail,
        documentId: `doc-${i}`,
      }));

      const mockResponse: PutEventsResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };

      mockSend.mockResolvedValue(mockResponse);

      const results = await eventPublisher.publishKYCUploadEvents(events);

      expect(results).toHaveLength(12);
      expect(results.every((r) => r.success)).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(12);
    });

    it("should measure execution duration accurately", async () => {
      const mockResponse: PutEventsResponse = {
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-123" }],
      };

      // Add artificial delay to test duration measurement
      mockSend.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockResponse), 50))
      );

      const result = await eventPublisher.publishKYCUploadEvent(
        validEventDetail
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(40); // Should be at least 50ms minus some tolerance
    });
  });
});
