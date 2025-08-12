import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
} from "@aws-sdk/client-eventbridge";
import { mockClient } from "aws-sdk-client-mock";
import {
  EventBridgeService,
  createEventBridgeService,
} from "../eventbridge-service";

// Mock the EventBridge client
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock UUID to return predictable values
jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-event-id-123"),
}));

// Mock the logger
jest.mock("../structured-logger", () => ({
  createKYCLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe("EventBridgeService", () => {
  let eventBridgeService: EventBridgeService;
  const mockEventBusName = "test-event-bus";
  const mockRegion = "us-east-1";

  beforeEach(() => {
    eventBridgeMock.reset();
    eventBridgeService = createEventBridgeService({
      eventBusName: mockEventBusName,
      region: mockRegion,
      maxRetries: 1, // Reduce retries for faster tests
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("publishKYCStatusChangeEvent", () => {
    it("should publish KYC status change event successfully", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const eventData = {
        userId: "user-123",
        documentId: "doc-456",
        previousStatus: "pending" as const,
        newStatus: "approved" as const,
        reviewedBy: "admin-789",
        reviewComments: "Document looks good",
        documentType: "national_id" as const,
        userType: "entrepreneur" as const,
      };

      // Act
      await eventBridgeService.publishKYCStatusChangeEvent(eventData);

      // Assert
      expect(eventBridgeMock.calls()).toHaveLength(1);
      const call = eventBridgeMock.call(0);
      const input = call.args[0].input as PutEventsCommandInput;

      expect(input).toMatchObject({
        Entries: [
          {
            Source: "sachain.kyc",
            DetailType: "KYC Status Changed",
            EventBusName: mockEventBusName,
            Detail: expect.stringContaining('"eventType":"KYC_STATUS_CHANGED"'),
          },
        ],
      });

      // Verify event structure
      const detail = JSON.parse(input.Entries![0].Detail!);
      expect(detail).toMatchObject({
        eventId: "test-event-id-123",
        eventType: "KYC_STATUS_CHANGED",
        source: "sachain.kyc",
        version: "1.0",
        userId: "user-123",
        documentId: "doc-456",
        previousStatus: "pending",
        newStatus: "approved",
        reviewedBy: "admin-789",
        reviewComments: "Document looks good",
        documentType: "national_id",
        userType: "entrepreneur",
      });
      expect(detail.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("should handle EventBridge publish failure", async () => {
      // Arrange
      const error = new Error("EventBridge service unavailable");
      eventBridgeMock.on(PutEventsCommand).rejects(error);

      const eventData = {
        userId: "user-123",
        documentId: "doc-456",
        previousStatus: "pending" as const,
        newStatus: "approved" as const,
        reviewedBy: "admin-789",
        documentType: "national_id" as const,
        userType: "entrepreneur" as const,
      };

      // Act & Assert
      await expect(
        eventBridgeService.publishKYCStatusChangeEvent(eventData)
      ).rejects.toThrow("failed after");
    });
  });

  describe("publishKYCDocumentUploadedEvent", () => {
    it("should publish KYC document uploaded event successfully", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const eventData = {
        userId: "user-123",
        documentId: "doc-456",
        documentType: "national_id" as const,
        fileSize: 1024000,
        mimeType: "image/jpeg",
        s3Key: "kyc-documents/user-123/doc-456.jpg",
        userType: "investor" as const,
      };

      // Act
      await eventBridgeService.publishKYCDocumentUploadedEvent(eventData);

      // Assert
      expect(eventBridgeMock.calls()).toHaveLength(1);
      const call = eventBridgeMock.call(0);
      const input = call.args[0].input as PutEventsCommandInput;

      expect(input).toMatchObject({
        Entries: [
          {
            Source: "sachain.kyc",
            DetailType: "KYC Document Uploaded",
            EventBusName: mockEventBusName,
          },
        ],
      });

      const detail = JSON.parse(input.Entries![0].Detail!);
      expect(detail).toMatchObject({
        eventType: "KYC_DOCUMENT_UPLOADED",
        userId: "user-123",
        documentId: "doc-456",
        documentType: "national_id",
        fileSize: 1024000,
        mimeType: "image/jpeg",
        s3Key: "kyc-documents/user-123/doc-456.jpg",
        userType: "investor",
      });
    });
  });

  describe("publishKYCReviewStartedEvent", () => {
    it("should publish KYC review started event successfully", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const eventData = {
        userId: "user-123",
        documentId: "doc-456",
        reviewedBy: "admin-789",
        documentType: "national_id" as const,
      };

      // Act
      await eventBridgeService.publishKYCReviewStartedEvent(eventData);

      // Assert
      expect(eventBridgeMock.calls()).toHaveLength(1);
      const call = eventBridgeMock.call(0);
      const input = call.args[0].input as PutEventsCommandInput;

      const detail = JSON.parse(input.Entries![0].Detail!);
      expect(detail).toMatchObject({
        eventType: "KYC_REVIEW_STARTED",
        userId: "user-123",
        documentId: "doc-456",
        reviewedBy: "admin-789",
        documentType: "national_id",
      });
    });
  });

  describe("publishKYCReviewCompletedEvent", () => {
    it("should publish KYC review completed event successfully", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const eventData = {
        userId: "user-123",
        documentId: "doc-456",
        reviewedBy: "admin-789",
        reviewResult: "approved" as const,
        reviewComments: "All documents verified",
        documentType: "national_id" as const,
        processingTimeMs: 5000,
      };

      // Act
      await eventBridgeService.publishKYCReviewCompletedEvent(eventData);

      // Assert
      expect(eventBridgeMock.calls()).toHaveLength(1);
      const call = eventBridgeMock.call(0);
      const input = call.args[0].input as PutEventsCommandInput;

      const detail = JSON.parse(input.Entries![0].Detail!);
      expect(detail).toMatchObject({
        eventType: "KYC_REVIEW_COMPLETED",
        userId: "user-123",
        documentId: "doc-456",
        reviewedBy: "admin-789",
        reviewResult: "approved",
        reviewComments: "All documents verified",
        documentType: "national_id",
        processingTimeMs: 5000,
      });
    });
  });

  describe("Event Schema Validation", () => {
    it("should validate required fields for KYC status change event", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const invalidEventData = {
        userId: "user-123",
        // Missing documentId
        previousStatus: "pending" as const,
        newStatus: "approved" as const,
        reviewedBy: "admin-789",
        documentType: "national_id" as const,
        userType: "entrepreneur" as const,
      };

      // Act & Assert
      await expect(
        eventBridgeService.publishKYCStatusChangeEvent(invalidEventData as any)
      ).rejects.toThrow("Missing required field: documentId");
    });

    it("should validate event source", async () => {
      // This test verifies that the service always sets the correct source
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const eventData = {
        userId: "user-123",
        documentId: "doc-456",
        previousStatus: "pending" as const,
        newStatus: "approved" as const,
        reviewedBy: "admin-789",
        documentType: "national_id" as const,
        userType: "entrepreneur" as const,
      };

      await eventBridgeService.publishKYCStatusChangeEvent(eventData);

      const call = eventBridgeMock.call(0);
      const input = call.args[0].input as PutEventsCommandInput;
      const detail = JSON.parse(input.Entries![0].Detail!);
      expect(detail.source).toBe("sachain.kyc");
    });

    it("should validate timestamp format", async () => {
      // This test verifies that timestamps are in ISO format
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const eventData = {
        userId: "user-123",
        documentId: "doc-456",
        previousStatus: "pending" as const,
        newStatus: "approved" as const,
        reviewedBy: "admin-789",
        documentType: "national_id" as const,
        userType: "entrepreneur" as const,
      };

      await eventBridgeService.publishKYCStatusChangeEvent(eventData);

      const call = eventBridgeMock.call(0);
      const input = call.args[0].input as PutEventsCommandInput;
      const detail = JSON.parse(input.Entries![0].Detail!);

      // Verify timestamp is valid ISO string
      expect(() => new Date(detail.timestamp).toISOString()).not.toThrow();
      expect(detail.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe("Event Schema Management", () => {
    it("should return event schema for valid event type", () => {
      const schema = eventBridgeService.getEventSchema("KYC_STATUS_CHANGED");

      expect(schema).toBeDefined();
      expect(schema?.eventType).toBe("KYC_STATUS_CHANGED");
      expect(schema?.version).toBe("1.0");
      expect(schema?.requiredFields).toContain("userId");
      expect(schema?.requiredFields).toContain("documentId");
    });

    it("should return undefined for invalid event type", () => {
      const schema = eventBridgeService.getEventSchema("INVALID_EVENT_TYPE");
      expect(schema).toBeUndefined();
    });

    it("should return all event schemas", () => {
      const schemas = eventBridgeService.getAllEventSchemas();

      expect(schemas).toBeDefined();
      expect(schemas["KYC_STATUS_CHANGED"]).toBeDefined();
      expect(schemas["KYC_DOCUMENT_UPLOADED"]).toBeDefined();
      expect(schemas["KYC_REVIEW_STARTED"]).toBeDefined();
      expect(schemas["KYC_REVIEW_COMPLETED"]).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle EventBridge service errors gracefully", async () => {
      // Arrange
      const error = new Error("EventBridge service temporarily unavailable");
      eventBridgeMock.on(PutEventsCommand).rejects(error);

      const eventData = {
        userId: "user-123",
        documentId: "doc-456",
        previousStatus: "pending" as const,
        newStatus: "approved" as const,
        reviewedBy: "admin-789",
        documentType: "national_id" as const,
        userType: "entrepreneur" as const,
      };

      // Act & Assert
      await expect(
        eventBridgeService.publishKYCStatusChangeEvent(eventData)
      ).rejects.toThrow();

      // Verify the service attempted to publish
      expect(eventBridgeMock.calls()).toHaveLength(1);
    });
  });
});
