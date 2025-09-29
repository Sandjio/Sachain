/**
 * Unit tests for Recharge EventBridge Service
 */

import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { mockClient } from "aws-sdk-client-mock";
import {
  RechargeEventBridgeService,
  createRechargeEventBridgeService,
} from "../recharge-eventbridge-service";
import {
  RECHARGE_EVENT_SCHEMAS,
  EVENT_DETAIL_TYPES,
} from "../recharge-event-schemas";

// Mock EventBridge client
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock logger
jest.mock("../structured-logger", () => ({
  createProjectLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock retry utility
jest.mock("../retry", () => ({
  ExponentialBackoff: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockImplementation((fn) => fn()),
  })),
}));

describe("RechargeEventBridgeService", () => {
  let service: RechargeEventBridgeService;

  beforeEach(() => {
    eventBridgeMock.reset();
    service = createRechargeEventBridgeService({
      eventBusName: "test-recharge-bus",
      region: "us-east-1",
      maxRetries: 3,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Service Creation", () => {
    it("should create service with factory function", () => {
      const testService = createRechargeEventBridgeService({
        eventBusName: "test-bus",
        region: "us-west-2",
      });

      expect(testService).toBeInstanceOf(RechargeEventBridgeService);
    });

    it("should use default configuration values", () => {
      const testService = createRechargeEventBridgeService({
        eventBusName: "test-bus",
      });

      expect(testService).toBeInstanceOf(RechargeEventBridgeService);
    });
  });

  describe("Payment Success Event Publishing", () => {
    it("should publish payment success event with correct structure", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const eventData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-789",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      // Act
      const result = await service.publishPaymentSuccessEvent(eventData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(eventBridgeMock.calls()).toHaveLength(1);

      const putEventsCall = eventBridgeMock.calls()[0];
      const entry = (putEventsCall.args[0].input as any).Entries[0];

      expect(entry.Source).toBe("sachain.recharge");
      expect(entry.DetailType).toBe("Orange Money Payment Success");
      expect(entry.EventBusName).toBe("test-recharge-bus");

      const eventDetail = JSON.parse(entry.Detail);
      expect(eventDetail.eventType).toBe("ORANGE_MONEY_PAYMENT_SUCCESS");
      expect(eventDetail.source).toBe("sachain.recharge");
      expect(eventDetail.version).toBe("1.0");
      expect(eventDetail.transactionId).toBe("txn-123");
    });

    it("should generate unique event IDs", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const eventData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-789",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      // Act
      const result1 = await service.publishPaymentSuccessEvent(eventData);
      const result2 = await service.publishPaymentSuccessEvent(eventData);

      // Assert
      expect(result1.eventId).not.toBe(result2.eventId);
    });
  });

  describe("Conversion Event Publishing", () => {
    it("should publish conversion started event", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const eventData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        estimatedHBARAmount: 25.5,
        exchangeRate: 392.16,
      };

      // Act
      const result = await service.publishConversionStartedEvent(eventData);

      // Assert
      expect(result.success).toBe(true);

      const eventDetail = JSON.parse(
        (eventBridgeMock.calls()[0].args[0].input as any).Entries[0].Detail
      );
      expect(eventDetail.eventType).toBe("HBAR_CONVERSION_STARTED");
      expect(eventDetail.estimatedHBARAmount).toBe(25.5);
    });

    it("should publish conversion completed event", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const eventData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        hbarAmount: 25.3,
        exchangeRate: 395.26,
        hederaTransactionId: "0.0.123456@1234567890.123456789",
        actualCost: "0.001",
        userHederaAccountId: "0.0.123456",
      };

      // Act
      const result = await service.publishConversionCompletedEvent(eventData);

      // Assert
      expect(result.success).toBe(true);

      const eventDetail = JSON.parse(
        (eventBridgeMock.calls()[0].args[0].input as any).Entries[0].Detail
      );
      expect(eventDetail.eventType).toBe("HBAR_CONVERSION_COMPLETED");
      expect(eventDetail.hederaTransactionId).toBe(
        "0.0.123456@1234567890.123456789"
      );
    });

    it("should publish conversion failed event", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const eventData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        errorCode: "HEDERA_NETWORK_ERROR",
        errorMessage: "Network timeout",
        retryCount: 2,
        retryable: true,
      };

      // Act
      const result = await service.publishConversionFailedEvent(eventData);

      // Assert
      expect(result.success).toBe(true);

      const eventDetail = JSON.parse(
        (eventBridgeMock.calls()[0].args[0].input as any).Entries[0].Detail
      );
      expect(eventDetail.eventType).toBe("HBAR_CONVERSION_FAILED");
      expect(eventDetail.retryable).toBe(true);
    });
  });

  describe("Event Schema Validation", () => {
    it("should validate required fields", async () => {
      // Arrange
      eventBridgeMock
        .on(PutEventsCommand)
        .rejects(new Error("Should not be called"));

      // Act & Assert - Missing required field should cause validation error
      await expect(
        service.publishPaymentSuccessEvent({
          transactionId: "txn-123",
          userId: "user-456",
          // Missing xafAmount
          orangeMoneyTransactionId: "om-789",
          userHederaAccountId: "0.0.123456",
          fees: {
            orangeMoneyFee: 500,
            platformFee: 250,
            totalFees: 750,
          },
        } as any)
      ).resolves.toMatchObject({
        success: false,
        error: {
          code: "EVENT_PUBLISH_FAILED",
        },
      });
    });

    it("should validate event source", async () => {
      // This test verifies that events have the correct source
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const eventData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-789",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      await service.publishPaymentSuccessEvent(eventData);

      const eventDetail = JSON.parse(
        (eventBridgeMock.calls()[0].args[0].input as any).Entries[0].Detail
      );
      expect(eventDetail.source).toBe("sachain.recharge");
    });

    it("should validate timestamp format", async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const eventData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-789",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      await service.publishPaymentSuccessEvent(eventData);

      const eventDetail = JSON.parse(
        (eventBridgeMock.calls()[0].args[0].input as any).Entries[0].Detail
      );

      // Validate ISO timestamp format
      expect(new Date(eventDetail.timestamp).toISOString()).toBe(
        eventDetail.timestamp
      );
    });
  });

  describe("Schema Information Methods", () => {
    it("should return event schema for valid event type", () => {
      const schema = service.getEventSchema("ORANGE_MONEY_PAYMENT_SUCCESS");

      expect(schema).toBeDefined();
      expect(schema?.version).toBe("1.0");
      expect(schema?.requiredFields).toContain("transactionId");
      expect(schema?.description).toContain("Orange Money payment");
    });

    it("should return undefined for invalid event type", () => {
      const schema = service.getEventSchema("INVALID_EVENT_TYPE");

      expect(schema).toBeUndefined();
    });

    it("should return all event schemas", () => {
      const allSchemas = service.getAllEventSchemas();

      expect(Object.keys(allSchemas)).toContain("ORANGE_MONEY_PAYMENT_SUCCESS");
      expect(Object.keys(allSchemas)).toContain("HBAR_CONVERSION_STARTED");
      expect(Object.keys(allSchemas)).toContain("HBAR_CONVERSION_COMPLETED");
      expect(Object.keys(allSchemas)).toContain("RECHARGE_COMPLETED");
    });
  });

  describe("Batch Event Publishing", () => {
    it("should publish multiple events", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-1" }, { EventId: "event-2" }],
      });

      const events = [
        {
          event: {
            eventId: "evt-1",
            eventType: "HBAR_CONVERSION_STARTED" as const,
            source: "sachain.recharge" as const,
            version: "1.0",
            timestamp: new Date().toISOString(),
            transactionId: "txn-1",
            userId: "user-1",
            xafAmount: 5000,
            estimatedHBARAmount: 12.5,
            exchangeRate: 400,
          },
          detailType: "HBAR Conversion Started",
        },
        {
          event: {
            eventId: "evt-2",
            eventType: "HBAR_CONVERSION_STARTED" as const,
            source: "sachain.recharge" as const,
            version: "1.0",
            timestamp: new Date().toISOString(),
            transactionId: "txn-2",
            userId: "user-2",
            xafAmount: 7500,
            estimatedHBARAmount: 18.75,
            exchangeRate: 400,
          },
          detailType: "HBAR Conversion Started",
        },
      ];

      // Act
      const results = await service.publishBatchEvents(events);

      // Assert
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("should handle batch publishing failures", async () => {
      // Arrange
      eventBridgeMock
        .on(PutEventsCommand)
        .rejects(new Error("Batch publish failed"));

      const events = [
        {
          event: {
            eventId: "evt-1",
            eventType: "HBAR_CONVERSION_STARTED" as const,
            source: "sachain.recharge" as const,
            version: "1.0",
            timestamp: new Date().toISOString(),
            transactionId: "txn-1",
            userId: "user-1",
            xafAmount: 5000,
            estimatedHBARAmount: 12.5,
            exchangeRate: 400,
          },
          detailType: "HBAR Conversion Started",
        },
      ];

      // Act
      const results = await service.publishBatchEvents(events);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe("Health Check", () => {
    it("should return healthy status for valid configuration", async () => {
      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeDefined();
      expect(typeof result.latency).toBe("number");
    });

    it("should measure latency during health check", async () => {
      const startTime = Date.now();
      const result = await service.healthCheck();
      const endTime = Date.now();

      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.latency).toBeLessThanOrEqual(endTime - startTime + 10); // Allow small margin
    });
  });

  describe("Error Handling", () => {
    it("should handle EventBridge service errors gracefully", async () => {
      // Arrange
      eventBridgeMock
        .on(PutEventsCommand)
        .rejects(new Error("Service unavailable"));

      const eventData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-789",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      // Act
      const result = await service.publishPaymentSuccessEvent(eventData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("EVENT_PUBLISH_FAILED");
      expect(result.error?.message).toContain("Service unavailable");
    });

    it("should handle validation errors", async () => {
      // Arrange - Don't mock EventBridge since validation should fail first
      const invalidEventData = {
        // Missing required fields
        transactionId: "txn-123",
      };

      // Act
      const result = await service.publishPaymentSuccessEvent(
        invalidEventData as any
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EVENT_PUBLISH_FAILED");
    });
  });

  describe("Event Detail Types", () => {
    it("should use correct detail types for each event", () => {
      expect(EVENT_DETAIL_TYPES.ORANGE_MONEY_PAYMENT_SUCCESS).toBe(
        "Orange Money Payment Success"
      );
      expect(EVENT_DETAIL_TYPES.HBAR_CONVERSION_STARTED).toBe(
        "HBAR Conversion Started"
      );
      expect(EVENT_DETAIL_TYPES.HBAR_CONVERSION_COMPLETED).toBe(
        "HBAR Conversion Completed"
      );
      expect(EVENT_DETAIL_TYPES.HBAR_CONVERSION_FAILED).toBe(
        "HBAR Conversion Failed"
      );
      expect(EVENT_DETAIL_TYPES.RECHARGE_COMPLETED).toBe("Recharge Completed");
      expect(EVENT_DETAIL_TYPES.RECHARGE_FAILED).toBe("Recharge Failed");
    });
  });

  describe("Event Schemas", () => {
    it("should have valid schemas for all event types", () => {
      const eventTypes = [
        "ORANGE_MONEY_PAYMENT_SUCCESS",
        "HBAR_CONVERSION_STARTED",
        "HBAR_CONVERSION_COMPLETED",
        "HBAR_CONVERSION_FAILED",
        "RECHARGE_COMPLETED",
        "RECHARGE_FAILED",
      ];

      eventTypes.forEach((eventType) => {
        const schema = RECHARGE_EVENT_SCHEMAS[eventType];
        expect(schema).toBeDefined();
        expect(schema.version).toBe("1.0");
        expect(Array.isArray(schema.requiredFields)).toBe(true);
        expect(Array.isArray(schema.optionalFields)).toBe(true);
        expect(typeof schema.description).toBe("string");
      });
    });

    it("should have consistent base fields across all schemas", () => {
      const baseFields = [
        "eventId",
        "eventType",
        "source",
        "version",
        "timestamp",
      ];

      Object.values(RECHARGE_EVENT_SCHEMAS).forEach((schema) => {
        baseFields.forEach((field) => {
          expect(schema.requiredFields).toContain(field);
        });
      });
    });
  });
});
