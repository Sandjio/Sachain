/**
 * Tests for Recharge Notifications Lambda Handler
 */

import { EventBridgeEvent, Context } from "aws-lambda";
import { handler, healthCheck, sendManualNotification } from "../index";
import { RechargeNotificationService } from "../../../utils/recharge-notification-service";
import { StructuredLogger } from "../../../utils/structured-logger";
import {
  ConversionCompletedEvent,
  ConversionFailedEvent,
  RechargeCompletedEvent,
  RechargeFailedEvent,
} from "../../../utils/recharge-event-schemas";

// Mock dependencies
jest.mock("../../../utils/recharge-notification-service");
jest.mock("../../../utils/structured-logger");
jest.mock("@aws-sdk/client-sns");
jest.mock("@aws-sdk/client-ses");

const mockRechargeNotificationService = {
  sendConversionCompletedNotification: jest.fn(),
  sendConversionFailedNotification: jest.fn(),
  sendRechargeCompletedNotification: jest.fn(),
  sendRechargeFailedNotification: jest.fn(),
  sendAdminAlert: jest.fn(),
  sendRechargeInitiatedNotification: jest.fn(),
  sendEmail: jest.fn(),
  healthCheck: jest.fn(),
} as unknown as RechargeNotificationService;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as StructuredLogger;

// Mock the constructor
(RechargeNotificationService as jest.Mock).mockImplementation(
  () => mockRechargeNotificationService
);
(StructuredLogger.getInstance as jest.Mock).mockReturnValue(mockLogger);

describe("Recharge Notifications Lambda Handler", () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "recharge-notifications",
    functionVersion: "1",
    invokedFunctionArn:
      "arn:aws:lambda:us-east-1:123456789012:function:recharge-notifications",
    memoryLimitInMB: "128",
    awsRequestId: "test-request-id",
    logGroupName: "/aws/lambda/recharge-notifications",
    logStreamName: "2023/01/01/[$LATEST]test-stream",
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_EMAIL = "admin@sachain.com";
  });

  describe("handler", () => {
    it("should handle HBAR_CONVERSION_COMPLETED events", async () => {
      const mockEvent: EventBridgeEvent<string, ConversionCompletedEvent> = {
        version: "0",
        id: "event-id",
        "detail-type": "HBAR Conversion Completed",
        source: "sachain.recharge",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventId: "conversion-completed-1",
          eventType: "HBAR_CONVERSION_COMPLETED",
          source: "sachain.recharge",
          version: "1.0",
          timestamp: "2023-01-01T00:00:00Z",
          transactionId: "TXN-123",
          userId: "user-123",
          xafAmount: 1000,
          hbarAmount: 10.5,
          exchangeRate: 95.24,
          hederaTransactionId: "0.0.123456@1234567890.123456789",
          actualCost: "0.001",
          userHederaAccountId: "0.0.123456",
        },
      };

      (
        mockRechargeNotificationService.sendConversionCompletedNotification as jest.Mock
      ).mockResolvedValue({
        email: { success: true, messageId: "email-123" },
        sms: { success: true, messageId: "sms-123" },
      });

      await handler(mockEvent, mockContext);

      expect(
        mockRechargeNotificationService.sendConversionCompletedNotification
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          userEmail: "user-user-123@example.com",
          userPhone: "+237ser-123",
        }),
        mockEvent.detail,
        expect.objectContaining({
          emailEnabled: true,
          smsEnabled: true,
          criticalOnly: false,
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Processing recharge notification event",
        expect.objectContaining({
          operation: "ProcessNotificationEvent",
          eventType: "HBAR_CONVERSION_COMPLETED",
          transactionId: "TXN-123",
        })
      );
    });

    it("should handle HBAR_CONVERSION_FAILED events", async () => {
      const mockEvent: EventBridgeEvent<string, ConversionFailedEvent> = {
        version: "0",
        id: "event-id",
        "detail-type": "HBAR Conversion Failed",
        source: "sachain.recharge",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventId: "conversion-failed-1",
          eventType: "HBAR_CONVERSION_FAILED",
          source: "sachain.recharge",
          version: "1.0",
          timestamp: "2023-01-01T00:00:00Z",
          transactionId: "TXN-456",
          userId: "user-456",
          xafAmount: 1000,
          errorCode: "HEDERA_NETWORK_ERROR",
          errorMessage: "Network timeout",
          retryCount: 2,
          retryable: false,
        },
      };

      (
        mockRechargeNotificationService.sendConversionFailedNotification as jest.Mock
      ).mockResolvedValue({
        email: { success: true, messageId: "email-456" },
        sms: { success: true, messageId: "sms-456" },
      });

      (
        mockRechargeNotificationService.sendAdminAlert as jest.Mock
      ).mockResolvedValue({ success: true, messageId: "admin-456" });

      await handler(mockEvent, mockContext);

      expect(
        mockRechargeNotificationService.sendConversionFailedNotification
      ).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-456" }),
        mockEvent.detail,
        expect.any(Object)
      );

      expect(
        mockRechargeNotificationService.sendAdminAlert
      ).toHaveBeenCalledWith(mockEvent.detail, "admin@sachain.com");
    });

    it("should handle RECHARGE_COMPLETED events", async () => {
      const mockEvent: EventBridgeEvent<string, RechargeCompletedEvent> = {
        version: "0",
        id: "event-id",
        "detail-type": "Recharge Completed",
        source: "sachain.recharge",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventId: "recharge-completed-1",
          eventType: "RECHARGE_COMPLETED",
          source: "sachain.recharge",
          version: "1.0",
          timestamp: "2023-01-01T00:00:00Z",
          transactionId: "TXN-789",
          userId: "user-789",
          xafAmount: 2000,
          hbarAmount: 21,
          exchangeRate: 95.24,
          totalFees: 150,
          processingTimeMs: 5000,
          userHederaAccountId: "0.0.789123",
        },
      };

      (
        mockRechargeNotificationService.sendRechargeCompletedNotification as jest.Mock
      ).mockResolvedValue({
        email: { success: true, messageId: "email-789" },
      });

      await handler(mockEvent, mockContext);

      expect(
        mockRechargeNotificationService.sendRechargeCompletedNotification
      ).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-789" }),
        mockEvent.detail,
        expect.any(Object)
      );
    });

    it("should handle RECHARGE_FAILED events", async () => {
      const mockEvent: EventBridgeEvent<string, RechargeFailedEvent> = {
        version: "0",
        id: "event-id",
        "detail-type": "Recharge Failed",
        source: "sachain.recharge",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventId: "recharge-failed-1",
          eventType: "RECHARGE_FAILED",
          source: "sachain.recharge",
          version: "1.0",
          timestamp: "2023-01-01T00:00:00Z",
          transactionId: "TXN-999",
          userId: "user-999",
          xafAmount: 1000,
          errorCode: "PAYMENT_FAILED",
          errorMessage: "Insufficient balance",
          failureStage: "payment",
          retryable: false,
        },
      };

      (
        mockRechargeNotificationService.sendRechargeFailedNotification as jest.Mock
      ).mockResolvedValue({
        email: { success: true, messageId: "email-999" },
        sms: { success: true, messageId: "sms-999" },
      });

      (
        mockRechargeNotificationService.sendAdminAlert as jest.Mock
      ).mockResolvedValue({ success: true, messageId: "admin-999" });

      await handler(mockEvent, mockContext);

      expect(
        mockRechargeNotificationService.sendRechargeFailedNotification
      ).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-999" }),
        mockEvent.detail,
        expect.any(Object)
      );

      expect(
        mockRechargeNotificationService.sendAdminAlert
      ).toHaveBeenCalledWith(mockEvent.detail, "admin@sachain.com");
    });

    it("should handle unknown event types gracefully", async () => {
      const mockEvent: EventBridgeEvent<string, any> = {
        version: "0",
        id: "event-id",
        "detail-type": "Unknown Event",
        source: "sachain.recharge",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventId: "unknown-1",
          eventType: "UNKNOWN_EVENT",
          source: "sachain.recharge",
          version: "1.0",
          timestamp: "2023-01-01T00:00:00Z",
          transactionId: "TXN-UNKNOWN",
        },
      };

      await handler(mockEvent, mockContext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Unhandled event type for notifications",
        expect.objectContaining({
          eventType: "UNKNOWN_EVENT",
          transactionId: "TXN-UNKNOWN",
        })
      );
    });

    it("should handle notification failures gracefully", async () => {
      const mockEvent: EventBridgeEvent<string, ConversionCompletedEvent> = {
        version: "0",
        id: "event-id",
        "detail-type": "HBAR Conversion Completed",
        source: "sachain.recharge",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventId: "conversion-error-1",
          eventType: "HBAR_CONVERSION_COMPLETED",
          source: "sachain.recharge",
          version: "1.0",
          timestamp: "2023-01-01T00:00:00Z",
          transactionId: "TXN-ERROR",
          userId: "user-error",
          xafAmount: 1000,
          hbarAmount: 10.5,
          exchangeRate: 95.24,
          hederaTransactionId: "0.0.123456@1234567890.123456789",
          actualCost: "0.001",
          userHederaAccountId: "0.0.123456",
        },
      };

      const error = new Error("Notification service error");
      (
        mockRechargeNotificationService.sendConversionCompletedNotification as jest.Mock
      ).mockRejectedValue(error);

      // Should not throw - errors should be caught and logged
      await expect(handler(mockEvent, mockContext)).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to process notification event",
        expect.objectContaining({
          eventType: "HBAR_CONVERSION_COMPLETED",
          transactionId: "TXN-ERROR",
        }),
        error
      );
    });
  });

  describe("healthCheck", () => {
    it("should return healthy status when service is healthy", async () => {
      (
        mockRechargeNotificationService.healthCheck as jest.Mock
      ).mockResolvedValue(true);

      const result = await healthCheck();

      expect(result.status).toBe("healthy");
      expect(result.dependencies.notificationService).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it("should return degraded status when service is unhealthy", async () => {
      (
        mockRechargeNotificationService.healthCheck as jest.Mock
      ).mockResolvedValue(false);

      const result = await healthCheck();

      expect(result.status).toBe("degraded");
      expect(result.dependencies.notificationService).toBe(false);
    });

    it("should return unhealthy status when health check throws", async () => {
      (
        mockRechargeNotificationService.healthCheck as jest.Mock
      ).mockRejectedValue(new Error("Health check failed"));

      const result = await healthCheck();

      expect(result.status).toBe("unhealthy");
      expect(result.dependencies.notificationService).toBe(false);
    });
  });

  describe("sendManualNotification", () => {
    it("should send test notification", async () => {
      (
        mockRechargeNotificationService.sendEmail as jest.Mock
      ).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      });

      const result = await sendManualNotification({
        userId: "test-user",
        type: "test",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("test-message-id");
      expect(mockRechargeNotificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Test Notification",
          template: "recharge-success",
        })
      );
    });

    it("should send recharge initiated notification", async () => {
      (
        mockRechargeNotificationService.sendRechargeInitiatedNotification as jest.Mock
      ).mockResolvedValue({
        success: true,
        messageId: "initiated-message-id",
      });

      const testData = {
        transactionId: "TXN-MANUAL",
        xafAmount: 1000,
        estimatedHBARAmount: 10.5,
        exchangeRate: 95.24,
        fees: {
          orangeMoneyFee: 50,
          platformFee: 25,
          totalFees: 75,
        },
      };

      const result = await sendManualNotification({
        userId: "manual-user",
        type: "recharge-initiated",
        data: testData,
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("initiated-message-id");
      expect(
        mockRechargeNotificationService.sendRechargeInitiatedNotification
      ).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "manual-user" }),
        testData
      );
    });

    it("should handle unknown notification type", async () => {
      const result = await sendManualNotification({
        userId: "test-user",
        type: "unknown" as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown notification type or missing data");
    });

    it("should handle notification failures", async () => {
      const error = new Error("Manual notification failed");
      (
        mockRechargeNotificationService.sendEmail as jest.Mock
      ).mockRejectedValue(error);

      const result = await sendManualNotification({
        userId: "error-user",
        type: "test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Manual notification failed");
    });
  });

  describe("environment configuration", () => {
    it("should not send admin alerts when ADMIN_EMAIL is not set", async () => {
      delete process.env.ADMIN_EMAIL;

      const mockEvent: EventBridgeEvent<string, ConversionFailedEvent> = {
        version: "0",
        id: "event-id",
        "detail-type": "HBAR Conversion Failed",
        source: "sachain.recharge",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventId: "no-admin-1",
          eventType: "HBAR_CONVERSION_FAILED",
          source: "sachain.recharge",
          version: "1.0",
          timestamp: "2023-01-01T00:00:00Z",
          transactionId: "TXN-NO-ADMIN",
          userId: "user-no-admin",
          xafAmount: 1000,
          errorCode: "ERROR",
          errorMessage: "Error message",
          retryCount: 0,
          retryable: false,
        },
      };

      (
        mockRechargeNotificationService.sendConversionFailedNotification as jest.Mock
      ).mockResolvedValue({
        email: { success: true, messageId: "email-no-admin" },
      });

      await handler(mockEvent, mockContext);

      expect(
        mockRechargeNotificationService.sendConversionFailedNotification
      ).toHaveBeenCalled();
      expect(
        mockRechargeNotificationService.sendAdminAlert
      ).not.toHaveBeenCalled();
    });
  });
});
