/**
 * Tests for NotificationService
 */

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { NotificationService } from "../notification-service";
import { StructuredLogger } from "../structured-logger";

// Mock AWS SDK clients
jest.mock("@aws-sdk/client-sns");
jest.mock("@aws-sdk/client-sesv2");
jest.mock("../structured-logger");

const mockSNSClient = {
  send: jest.fn(),
} as unknown as SNSClient;

const mockSESClient = {
  send: jest.fn(),
} as unknown as SESv2Client;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as StructuredLogger;

describe("NotificationService", () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    (StructuredLogger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    notificationService = new NotificationService({
      snsClient: mockSNSClient,
      sesClient: mockSESClient,
      topicArn: "arn:aws:sns:us-east-1:123456789012:test-topic",
      fromEmail: "test@sachain.com",
      replyToEmail: "support@sachain.com",
      region: "us-east-1",
    });
  });

  describe("sendEmail", () => {
    it("should send email successfully", async () => {
      const mockMessageId = "test-message-id";
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: mockMessageId,
      });

      const result = await notificationService.sendEmail({
        to: "user@example.com",
        subject: "Test Subject",
        template: "recharge-success",
        data: {
          transactionId: "test-123",
          xafAmount: 1000,
          hbarAmount: 10,
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(mockMessageId);
      expect(mockSESClient.send).toHaveBeenCalledWith(
        expect.any(SendEmailCommand)
      );
    });

    it("should handle email sending failure with retry", async () => {
      const error = new Error("SES Error");
      (mockSESClient.send as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ MessageId: "success-id" });

      const result = await notificationService.sendEmail({
        to: "user@example.com",
        subject: "Test Subject",
        template: "recharge-success",
        data: { transactionId: "test-123" },
      });

      expect(result.success).toBe(true);
      expect(mockSESClient.send).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retry attempts", async () => {
      const error = new Error("Persistent SES Error");
      (mockSESClient.send as jest.Mock).mockRejectedValue(error);

      const result = await notificationService.sendEmail({
        to: "user@example.com",
        subject: "Test Subject",
        template: "recharge-success",
        data: { transactionId: "test-123" },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOTIFICATION_FAILED");
      expect(mockSESClient.send).toHaveBeenCalledTimes(3); // Max retry attempts
    });

    it("should render email template correctly", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "test-id",
      });

      await notificationService.sendEmail({
        to: "user@example.com",
        subject: "Test Subject",
        template: "recharge-success",
        data: {
          transactionId: "TXN-123",
          xafAmount: 1000,
          hbarAmount: 10.5,
          exchangeRate: 95.24,
        },
      });

      const sendCall = (mockSESClient.send as jest.Mock).mock.calls[0][0];
      const emailCommand = sendCall as SendEmailCommand;
      const htmlBody = emailCommand.input.Message?.Body?.Html?.Data;
      const textBody = emailCommand.input.Message?.Body?.Text?.Data;

      expect(htmlBody).toContain("TXN-123");
      expect(htmlBody).toContain("1000");
      expect(htmlBody).toContain("10.5");
      expect(textBody).toContain("TXN-123");
      expect(textBody).toContain("1000");
    });
  });

  describe("sendSMS", () => {
    it("should send SMS successfully", async () => {
      const mockMessageId = "sms-message-id";
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: mockMessageId,
      });

      const result = await notificationService.sendSMS({
        to: "+237123456789",
        message: "Your HBAR recharge is complete!",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(mockMessageId);
      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.any(PublishCommand)
      );
    });

    it("should handle SMS sending failure", async () => {
      const error = new Error("SNS Error");
      (mockSNSClient.send as jest.Mock).mockRejectedValue(error);

      const result = await notificationService.sendSMS({
        to: "+237123456789",
        message: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOTIFICATION_FAILED");
    });
  });

  describe("sendKYCReviewNotification", () => {
    it("should send KYC review notification", async () => {
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: "kyc-message-id",
      });

      await notificationService.sendKYCReviewNotification({
        documentId: "doc-123",
        userId: "user-456",
        documentType: "passport",
        fileName: "passport.jpg",
        uploadedAt: "2023-01-01T00:00:00Z",
      });

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TopicArn: "arn:aws:sns:us-east-1:123456789012:test-topic",
          Subject: "KYC Document Review Required - passport",
        })
      );
    });
  });

  describe("healthCheck", () => {
    it("should return true for healthy service", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({});

      const result = await notificationService.healthCheck();

      expect(result).toBe(true);
    });

    it("should return false for unhealthy service", async () => {
      (mockSESClient.send as jest.Mock).mockRejectedValue(
        new Error("Health check failed")
      );

      const result = await notificationService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("template rendering", () => {
    it("should handle conditional blocks in templates", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "test-id",
      });

      await notificationService.sendEmail({
        to: "user@example.com",
        subject: "Test Subject",
        template: "recharge-failed",
        data: {
          transactionId: "TXN-123",
          retryable: true,
        },
      });

      const sendCall = (mockSESClient.send as jest.Mock).mock.calls[0][0];
      const emailCommand = sendCall as SendEmailCommand;
      const htmlBody = emailCommand.input.Message?.Body?.Html?.Data;

      expect(htmlBody).toContain("automatically retrying");
    });

    it("should handle missing template gracefully", async () => {
      (mockSESClient.send as jest.Mock).mockResolvedValue({
        MessageId: "test-id",
      });

      await notificationService.sendEmail({
        to: "user@example.com",
        subject: "Test Subject",
        template: "non-existent-template",
        data: { test: "data" },
      });

      const sendCall = (mockSESClient.send as jest.Mock).mock.calls[0][0];
      const emailCommand = sendCall as SendEmailCommand;
      const htmlBody = emailCommand.input.Message?.Body?.Html?.Data;

      expect(htmlBody).toContain("Sachain Notification");
      expect(htmlBody).toContain('"test": "data"');
    });
  });

  describe("error handling and retry logic", () => {
    it("should implement exponential backoff", async () => {
      const error = new Error("Temporary failure");
      (mockSESClient.send as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ MessageId: "success" });

      const startTime = Date.now();

      const result = await notificationService.sendEmail({
        to: "user@example.com",
        subject: "Test",
        template: "recharge-success",
        data: {},
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThan(1000); // Should have some delay from retries
      expect(mockSESClient.send).toHaveBeenCalledTimes(3);
    });
  });
});
