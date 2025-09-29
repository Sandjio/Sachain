/**
 * Tests for RechargeNotificationService
 */

import { SNSClient } from "@aws-sdk/client-sns";
import { SESClient } from "@aws-sdk/client-ses";
import { RechargeNotificationService } from "../recharge-notification-service";
import { StructuredLogger } from "../structured-logger";
import {
  ConversionCompletedEvent,
  ConversionFailedEvent,
  RechargeCompletedEvent,
  RechargeFailedEvent,
} from "../recharge-event-schemas";

// Mock AWS SDK clients and dependencies
jest.mock("@aws-sdk/client-sns");
jest.mock("@aws-sdk/client-ses");
jest.mock("../structured-logger");

const mockSNSClient = {
  send: jest.fn(),
} as unknown as SNSClient;

const mockSESClient = {
  send: jest.fn(),
} as unknown as SESClient;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as StructuredLogger;

describe("RechargeNotificationService", () => {
  let rechargeNotificationService: RechargeNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    (StructuredLogger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    rechargeNotificationService = new RechargeNotificationService({
      snsClient: mockSNSClient,
      sesClient: mockSESClient,
      topicArn: "arn:aws:sns:us-east-1:123456789012:test-topic",
      fromEmail: "noreply@sachain.com",
      replyToEmail: "support@sachain.com",
      region: "us-east-1",
    });
  });

  const mockContext = {
    userId: "user-123",
    userEmail: "user@example.com",
    userPhone: "+237123456789",
    userLanguage: "en",
    userTimezone: "Africa/Douala",
  };

  const mockPreferences = {
    emailEnabled: true,
    smsEnabled: true,
    criticalOnly: false,
  };

  describe("sendRechargeInitiatedNotification", () => {
    it("should send recharge initiated notification", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "initiated-message-id",
      });

      const result =
        await rechargeNotificationService.sendRechargeInitiatedNotification(
          mockContext,
          {
            transactionId: "TXN-123",
            xafAmount: 1000,
            estimatedHBARAmount: 10.5,
            exchangeRate: 95.24,
            fees: {
              orangeMoneyFee: 50,
              platformFee: 25,
              totalFees: 75,
            },
          }
        );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("initiated-message-id");
      expect(mockSESClient.send).toHaveBeenCalled();
    });

    it("should handle missing email address", async () => {
      const contextWithoutEmail = { ...mockContext, userEmail: undefined };

      const result =
        await rechargeNotificationService.sendRechargeInitiatedNotification(
          contextWithoutEmail,
          {
            transactionId: "TXN-123",
            xafAmount: 1000,
            estimatedHBARAmount: 10.5,
            exchangeRate: 95.24,
            fees: {
              orangeMoneyFee: 50,
              platformFee: 25,
              totalFees: 75,
            },
          }
        );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NO_EMAIL");
      expect(mockSESClient.send).not.toHaveBeenCalled();
    });
  });

  describe("sendConversionCompletedNotification", () => {
    const mockConversionCompletedEvent: ConversionCompletedEvent = {
      eventId: "event-123",
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
    };

    it("should send both email and SMS notifications", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "email-message-id",
      });
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: "sms-message-id",
      });

      const results =
        await rechargeNotificationService.sendConversionCompletedNotification(
          mockContext,
          mockConversionCompletedEvent,
          mockPreferences
        );

      expect(results.email?.success).toBe(true);
      expect(results.sms?.success).toBe(true);
      expect(mockSESClient.send).toHaveBeenCalled();
      expect(mockSNSClient.send).toHaveBeenCalled();
    });

    it("should respect user preferences for email only", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "email-message-id",
      });

      const emailOnlyPreferences = {
        ...mockPreferences,
        smsEnabled: false,
      };

      const results =
        await rechargeNotificationService.sendConversionCompletedNotification(
          mockContext,
          mockConversionCompletedEvent,
          emailOnlyPreferences
        );

      expect(results.email?.success).toBe(true);
      expect(results.sms).toBeUndefined();
      expect(mockSESClient.send).toHaveBeenCalled();
      expect(mockSNSClient.send).not.toHaveBeenCalled();
    });

    it("should handle missing contact information gracefully", async () => {
      const contextWithoutContacts = {
        ...mockContext,
        userEmail: undefined,
        userPhone: undefined,
      };

      const results =
        await rechargeNotificationService.sendConversionCompletedNotification(
          contextWithoutContacts,
          mockConversionCompletedEvent,
          mockPreferences
        );

      expect(results.email).toBeUndefined();
      expect(results.sms).toBeUndefined();
      expect(mockSESClient.send).not.toHaveBeenCalled();
      expect(mockSNSClient.send).not.toHaveBeenCalled();
    });
  });

  describe("sendConversionFailedNotification", () => {
    const mockConversionFailedEvent: ConversionFailedEvent = {
      eventId: "event-456",
      eventType: "HBAR_CONVERSION_FAILED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: "2023-01-01T00:00:00Z",
      transactionId: "TXN-456",
      userId: "user-123",
      xafAmount: 1000,
      errorCode: "HEDERA_NETWORK_ERROR",
      errorMessage: "Network timeout",
      retryCount: 2,
      retryable: true,
    };

    it("should send retry notification for retryable failures", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "retry-email-id",
      });

      const results =
        await rechargeNotificationService.sendConversionFailedNotification(
          mockContext,
          mockConversionFailedEvent,
          mockPreferences
        );

      expect(results.email?.success).toBe(true);
      expect(results.sms).toBeUndefined(); // No SMS for retryable failures
      expect(mockSESClient.send).toHaveBeenCalled();
      expect(mockSNSClient.send).not.toHaveBeenCalled();
    });

    it("should send SMS for non-retryable failures", async () => {
      const nonRetryableEvent = {
        ...mockConversionFailedEvent,
        retryable: false,
      };

      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "failed-email-id",
      });
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: "failed-sms-id",
      });

      const results =
        await rechargeNotificationService.sendConversionFailedNotification(
          mockContext,
          nonRetryableEvent,
          mockPreferences
        );

      expect(results.email?.success).toBe(true);
      expect(results.sms?.success).toBe(true);
      expect(mockSESClient.send).toHaveBeenCalled();
      expect(mockSNSClient.send).toHaveBeenCalled();
    });

    it("should send SMS for critical-only preferences on non-retryable failures", async () => {
      const criticalOnlyPreferences = {
        emailEnabled: false,
        smsEnabled: false,
        criticalOnly: true,
      };

      const nonRetryableEvent = {
        ...mockConversionFailedEvent,
        retryable: false,
      };

      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: "critical-sms-id",
      });

      const results =
        await rechargeNotificationService.sendConversionFailedNotification(
          mockContext,
          nonRetryableEvent,
          criticalOnlyPreferences
        );

      expect(results.email).toBeUndefined();
      expect(results.sms?.success).toBe(true);
      expect(mockSESClient.send).not.toHaveBeenCalled();
      expect(mockSNSClient.send).toHaveBeenCalled();
    });
  });

  describe("sendRechargeCompletedNotification", () => {
    const mockRechargeCompletedEvent: RechargeCompletedEvent = {
      eventId: "event-789",
      eventType: "RECHARGE_COMPLETED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: "2023-01-01T00:00:00Z",
      transactionId: "TXN-789",
      userId: "user-123",
      xafAmount: 1000,
      hbarAmount: 10.5,
      exchangeRate: 95.24,
      totalFees: 75,
      processingTimeMs: 5000,
      userHederaAccountId: "0.0.123456",
    };

    it("should send recharge completed notification", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "completed-email-id",
      });

      const results =
        await rechargeNotificationService.sendRechargeCompletedNotification(
          mockContext,
          mockRechargeCompletedEvent,
          mockPreferences
        );

      expect(results.email?.success).toBe(true);
      expect(mockSESClient.send).toHaveBeenCalled();
    });
  });

  describe("sendRechargeFailedNotification", () => {
    const mockRechargeFailedEvent: RechargeFailedEvent = {
      eventId: "event-999",
      eventType: "RECHARGE_FAILED",
      source: "sachain.recharge",
      version: "1.0",
      timestamp: "2023-01-01T00:00:00Z",
      transactionId: "TXN-999",
      userId: "user-123",
      xafAmount: 1000,
      errorCode: "PAYMENT_FAILED",
      errorMessage: "Insufficient balance",
      failureStage: "payment",
      retryable: false,
    };

    it("should send recharge failed notification with stage information", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "failed-email-id",
      });
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: "failed-sms-id",
      });

      const results =
        await rechargeNotificationService.sendRechargeFailedNotification(
          mockContext,
          mockRechargeFailedEvent,
          mockPreferences
        );

      expect(results.email?.success).toBe(true);
      expect(results.sms?.success).toBe(true);
      expect(mockSESClient.send).toHaveBeenCalled();
      expect(mockSNSClient.send).toHaveBeenCalled();
    });
  });

  describe("sendAdminAlert", () => {
    it("should send admin alert for conversion failures", async () => {
      const mockConversionFailedEvent: ConversionFailedEvent = {
        eventId: "event-alert",
        eventType: "HBAR_CONVERSION_FAILED",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: "2023-01-01T00:00:00Z",
        transactionId: "TXN-ALERT",
        userId: "user-123",
        xafAmount: 1000,
        errorCode: "CRITICAL_ERROR",
        errorMessage: "System failure",
        retryCount: 3,
        retryable: false,
      };

      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "admin-alert-id",
      });

      const result = await rechargeNotificationService.sendAdminAlert(
        mockConversionFailedEvent,
        "admin@sachain.com"
      );

      expect(result.success).toBe(true);
      expect(mockSESClient.send).toHaveBeenCalled();
    });

    it("should send admin alert for recharge failures", async () => {
      const mockRechargeFailedEvent: RechargeFailedEvent = {
        eventId: "event-alert-2",
        eventType: "RECHARGE_FAILED",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: "2023-01-01T00:00:00Z",
        transactionId: "TXN-ALERT-2",
        userId: "user-123",
        xafAmount: 1000,
        errorCode: "SYSTEM_ERROR",
        errorMessage: "Database connection failed",
        failureStage: "transfer",
        retryable: false,
      };

      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "admin-alert-2-id",
      });

      const result = await rechargeNotificationService.sendAdminAlert(
        mockRechargeFailedEvent,
        "admin@sachain.com"
      );

      expect(result.success).toBe(true);
      expect(mockSESClient.send).toHaveBeenCalled();
    });
  });

  describe("sendBatchNotifications", () => {
    it("should send multiple notifications in batch", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "batch-email-id",
      });
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: "batch-sms-id",
      });

      const notifications = [
        {
          context: mockContext,
          type: "success" as const,
          data: {
            eventId: "event-1",
            eventType: "HBAR_CONVERSION_COMPLETED",
            source: "sachain.recharge",
            version: "1.0",
            timestamp: "2023-01-01T00:00:00Z",
            transactionId: "TXN-1",
            userId: "user-123",
            xafAmount: 1000,
            hbarAmount: 10.5,
            exchangeRate: 95.24,
            hederaTransactionId: "0.0.123456@1234567890.123456789",
            actualCost: "0.001",
            userHederaAccountId: "0.0.123456",
          },
          preferences: mockPreferences,
        },
        {
          context: { ...mockContext, userId: "user-456" },
          type: "complete" as const,
          data: {
            eventId: "event-2",
            eventType: "RECHARGE_COMPLETED",
            source: "sachain.recharge",
            version: "1.0",
            timestamp: "2023-01-01T00:00:00Z",
            transactionId: "TXN-2",
            userId: "user-456",
            xafAmount: 2000,
            hbarAmount: 21,
            exchangeRate: 95.24,
            totalFees: 150,
            processingTimeMs: 3000,
            userHederaAccountId: "0.0.654321",
          },
          preferences: mockPreferences,
        },
      ];

      const results = await rechargeNotificationService.sendBatchNotifications(
        notifications
      );

      expect(results).toHaveLength(2);
      expect(results[0].userId).toBe("user-123");
      expect(results[1].userId).toBe("user-456");
      expect(results[0].error).toBeUndefined();
      expect(results[1].error).toBeUndefined();
    });

    it("should handle batch notification failures gracefully", async () => {
      (mockSESClient.send as jest.Mock)
        .mockResolvedValueOnce({ MessageId: "success-id" })
        .mockRejectedValueOnce(new Error("Email failed"));

      const notifications = [
        {
          context: mockContext,
          type: "success" as const,
          data: {} as any,
          preferences: mockPreferences,
        },
        {
          context: { ...mockContext, userId: "user-456" },
          type: "success" as const,
          data: {} as any,
          preferences: mockPreferences,
        },
      ];

      const results = await rechargeNotificationService.sendBatchNotifications(
        notifications
      );

      expect(results).toHaveLength(2);
      expect(results[0].error).toBeUndefined();
      expect(results[1].error).toBeDefined();
    });
  });

  describe("SMS message formatting", () => {
    it("should format success SMS correctly", async () => {
      const mockEvent: ConversionCompletedEvent = {
        eventId: "event-sms",
        eventType: "HBAR_CONVERSION_COMPLETED",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: "2023-01-01T00:00:00Z",
        transactionId: "TXN-SMS",
        userId: "user-123",
        xafAmount: 1000,
        hbarAmount: 10.5,
        exchangeRate: 95.24,
        hederaTransactionId: "0.0.123456@1234567890.123456789",
        actualCost: "0.001",
        userHederaAccountId: "0.0.123456",
      };

      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: "sms-format-id",
      });

      await rechargeNotificationService.sendConversionCompletedNotification(
        mockContext,
        mockEvent,
        mockPreferences
      );

      const smsCall = (mockSNSClient.send as jest.Mock).mock.calls[0][0];
      expect(smsCall.input.Message).toContain("Sachain:");
      expect(smsCall.input.Message).toContain("10.5 HBAR");
      expect(smsCall.input.Message).toContain("1000 XAF");
      expect(smsCall.input.Message).toContain("TXN-SMS");
    });
  });
});
