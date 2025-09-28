/**
 * Integration tests for HBAR Recharge EventBridge integration
 */

import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { mockClient } from "aws-sdk-client-mock";
import {
  RechargeEventBridgeService,
  createRechargeEventBridgeService,
} from "../../utils/recharge-eventbridge-service";
import {
  PaymentSuccessEvent,
  ConversionStartedEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
  RechargeCompletedEvent,
  RechargeFailedEvent,
} from "../../utils/recharge-event-schemas";

// Mock EventBridge client
const eventBridgeMock = mockClient(EventBridgeClient);

describe("Recharge EventBridge Integration", () => {
  let eventBridgeService: RechargeEventBridgeService;

  beforeEach(() => {
    eventBridgeMock.reset();
    eventBridgeService = createRechargeEventBridgeService({
      eventBusName: "test-recharge-bus",
      region: "us-east-1",
      maxRetries: 2,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Payment Success Event Publishing", () => {
    it("should publish payment success event successfully", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const paymentData = {
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
      const result = await eventBridgeService.publishPaymentSuccessEvent(
        paymentData
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(eventBridgeMock.calls()).toHaveLength(1);

      const putEventsCall = eventBridgeMock.calls()[0];
      const putEventsInput = putEventsCall.args[0].input as any;

      expect(putEventsInput.Entries).toHaveLength(1);
      expect(putEventsInput.Entries[0].Source).toBe("sachain.recharge");
      expect(putEventsInput.Entries[0].DetailType).toBe(
        "Orange Money Payment Success"
      );

      const eventDetail = JSON.parse(putEventsInput.Entries[0].Detail);
      expect(eventDetail.eventType).toBe("ORANGE_MONEY_PAYMENT_SUCCESS");
      expect(eventDetail.transactionId).toBe("txn-123");
      expect(eventDetail.userId).toBe("user-456");
    });

    it("should handle EventBridge publishing failures", async () => {
      // Arrange
      eventBridgeMock
        .on(PutEventsCommand)
        .rejects(new Error("EventBridge unavailable"));

      const paymentData = {
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
      const result = await eventBridgeService.publishPaymentSuccessEvent(
        paymentData
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("EVENT_PUBLISH_FAILED");
    });
  });

  describe("Conversion Event Publishing", () => {
    it("should publish conversion started event", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const conversionData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        estimatedHBARAmount: 25.5,
        exchangeRate: 392.16,
      };

      // Act
      const result = await eventBridgeService.publishConversionStartedEvent(
        conversionData
      );

      // Assert
      expect(result.success).toBe(true);
      expect(eventBridgeMock.calls()).toHaveLength(1);

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

      const completionData = {
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
      const result = await eventBridgeService.publishConversionCompletedEvent(
        completionData
      );

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

      const failureData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        errorCode: "HEDERA_NETWORK_ERROR",
        errorMessage: "Network timeout during transfer",
        retryCount: 2,
        retryable: true,
      };

      // Act
      const result = await eventBridgeService.publishConversionFailedEvent(
        failureData
      );

      // Assert
      expect(result.success).toBe(true);

      const eventDetail = JSON.parse(
        (eventBridgeMock.calls()[0].args[0].input as any).Entries[0].Detail
      );
      expect(eventDetail.eventType).toBe("HBAR_CONVERSION_FAILED");
      expect(eventDetail.retryable).toBe(true);
    });
  });

  describe("Recharge Completion Events", () => {
    it("should publish recharge completed event", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const completionData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        hbarAmount: 25.3,
        exchangeRate: 395.26,
        totalFees: 750,
        processingTimeMs: 15000,
        userHederaAccountId: "0.0.123456",
      };

      // Act
      const result = await eventBridgeService.publishRechargeCompletedEvent(
        completionData
      );

      // Assert
      expect(result.success).toBe(true);

      const eventDetail = JSON.parse(
        (eventBridgeMock.calls()[0].args[0].input as any).Entries[0].Detail
      );
      expect(eventDetail.eventType).toBe("RECHARGE_COMPLETED");
      expect(eventDetail.processingTimeMs).toBe(15000);
    });

    it("should publish recharge failed event", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      const failureData = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        errorCode: "PAYMENT_FAILED",
        errorMessage: "Orange Money payment was declined",
        failureStage: "payment" as const,
        retryable: false,
      };

      // Act
      const result = await eventBridgeService.publishRechargeFailedEvent(
        failureData
      );

      // Assert
      expect(result.success).toBe(true);

      const eventDetail = JSON.parse(
        (eventBridgeMock.calls()[0].args[0].input as any).Entries[0].Detail
      );
      expect(eventDetail.eventType).toBe("RECHARGE_FAILED");
      expect(eventDetail.failureStage).toBe("payment");
    });
  });

  describe("Event Schema Validation", () => {
    it("should validate event schemas correctly", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "test-event-id" }],
      });

      // Act & Assert - Valid event should succeed
      const validResult = await eventBridgeService.publishPaymentSuccessEvent({
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
      });

      expect(validResult.success).toBe(true);
    });

    it("should get event schema information", () => {
      // Act
      const schema = eventBridgeService.getEventSchema(
        "ORANGE_MONEY_PAYMENT_SUCCESS"
      );
      const allSchemas = eventBridgeService.getAllEventSchemas();

      // Assert
      expect(schema).toBeDefined();
      expect(schema?.version).toBe("1.0");
      expect(schema?.requiredFields).toContain("transactionId");
      expect(Object.keys(allSchemas)).toContain("ORANGE_MONEY_PAYMENT_SUCCESS");
    });
  });

  describe("Batch Event Publishing", () => {
    it("should publish multiple events in batch", async () => {
      // Arrange
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: "event-1" }, { EventId: "event-2" }],
      });

      const events = [
        {
          event: {
            eventId: "evt-1",
            eventType: "HBAR_CONVERSION_STARTED",
            source: "sachain.recharge",
            version: "1.0",
            timestamp: new Date().toISOString(),
            transactionId: "txn-1",
            userId: "user-1",
            xafAmount: 5000,
            estimatedHBARAmount: 12.5,
            exchangeRate: 400,
          } as ConversionStartedEvent,
          detailType: "HBAR Conversion Started",
        },
        {
          event: {
            eventId: "evt-2",
            eventType: "HBAR_CONVERSION_STARTED",
            source: "sachain.recharge",
            version: "1.0",
            timestamp: new Date().toISOString(),
            transactionId: "txn-2",
            userId: "user-2",
            xafAmount: 7500,
            estimatedHBARAmount: 18.75,
            exchangeRate: 400,
          } as ConversionStartedEvent,
          detailType: "HBAR Conversion Started",
        },
      ];

      // Act
      const results = await eventBridgeService.publishBatchEvents(events);

      // Assert
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
      expect(eventBridgeMock.calls()).toHaveLength(2);
    });
  });

  describe("Health Check", () => {
    it("should perform health check successfully", async () => {
      // Act
      const healthResult = await eventBridgeService.healthCheck();

      // Assert
      expect(healthResult.healthy).toBe(true);
      expect(healthResult.latency).toBeDefined();
      expect(typeof healthResult.latency).toBe("number");
    });

    it("should detect health check failures", async () => {
      // Arrange - Create service with invalid configuration
      const invalidService = createRechargeEventBridgeService({
        eventBusName: "",
        region: "invalid-region",
      });

      // Act
      const healthResult = await invalidService.healthCheck();

      // Assert
      expect(healthResult.healthy).toBe(false);
      expect(healthResult.error).toBeDefined();
    });
  });

  describe("Event Routing Patterns", () => {
    it("should validate event routing patterns", () => {
      // This test ensures our event patterns are correctly defined
      const {
        EVENT_ROUTING_PATTERNS,
      } = require("../../utils/recharge-event-schemas");

      expect(EVENT_ROUTING_PATTERNS.ALL_RECHARGE_EVENTS.source).toContain(
        "sachain.recharge"
      );
      expect(
        EVENT_ROUTING_PATTERNS.PAYMENT_SUCCESS_FOR_CONVERSION["detail-type"]
      ).toContain("Orange Money Payment Success");
      expect(
        EVENT_ROUTING_PATTERNS.CONVERSION_EVENTS_FOR_NOTIFICATIONS[
          "detail-type"
        ]
      ).toContain("HBAR Conversion Completed");
    });
  });

  describe("Error Handling and Retries", () => {
    it("should retry on transient failures", async () => {
      // Arrange
      eventBridgeMock
        .on(PutEventsCommand)
        .rejectsOnce(new Error("Temporary failure"))
        .resolves({
          FailedEntryCount: 0,
          Entries: [{ EventId: "test-event-id" }],
        });

      const paymentData = {
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
      const result = await eventBridgeService.publishPaymentSuccessEvent(
        paymentData
      );

      // Assert
      expect(result.success).toBe(true);
      expect(eventBridgeMock.calls()).toHaveLength(2); // Initial call + 1 retry
    });

    it("should fail after max retries", async () => {
      // Arrange
      eventBridgeMock
        .on(PutEventsCommand)
        .rejects(new Error("Persistent failure"));

      const paymentData = {
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
      const result = await eventBridgeService.publishPaymentSuccessEvent(
        paymentData
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EVENT_PUBLISH_FAILED");
      expect(eventBridgeMock.calls().length).toBeGreaterThan(1); // Should have retried
    });
  });
});
