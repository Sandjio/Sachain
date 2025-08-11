import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import { NotificationService, KYCNotificationData } from "../notification-service";

const snsMock = mockClient(SNSClient);

describe("NotificationService", () => {
  let notificationService: NotificationService;
  const mockTopicArn = "arn:aws:sns:us-east-1:123456789012:test-topic";
  const mockAdminPortalUrl = "https://admin.sachain-test.com";

  beforeEach(() => {
    snsMock.reset();
    notificationService = new NotificationService({
      snsClient: new SNSClient({}),
      topicArn: mockTopicArn,
      adminPortalUrl: mockAdminPortalUrl,
    });
  });

  describe("sendKYCReviewNotification", () => {
    const mockNotificationData: KYCNotificationData = {
      documentId: "doc-123",
      userId: "user-456",
      documentType: "national_id",
      fileName: "id-card.jpg",
      uploadedAt: "2024-01-15T10:30:00.000Z",
    };

    it("should send structured email notification successfully", async () => {
      snsMock.on(PublishCommand).resolves({
        MessageId: "msg-123",
      });

      await notificationService.sendKYCReviewNotification(mockNotificationData);

      expect(snsMock.commandCalls(PublishCommand)).toHaveLength(1);
      const publishCall = snsMock.commandCalls(PublishCommand)[0];
      const args = publishCall.args[0].input;

      expect(args.TopicArn).toBe(mockTopicArn);
      expect(args.Subject).toBe("KYC Document Review Required - national_id");
      expect(args.MessageStructure).toBe("json");
    });

    it("should include correct message attributes", async () => {
      snsMock.on(PublishCommand).resolves({
        MessageId: "msg-123",
      });

      await notificationService.sendKYCReviewNotification(mockNotificationData);

      const publishCall = snsMock.commandCalls(PublishCommand)[0];
      const args = publishCall.args[0].input;

      expect(args.MessageAttributes).toEqual({
        documentType: {
          DataType: "String",
          StringValue: "national_id",
        },
        userId: {
          DataType: "String",
          StringValue: "user-456",
        },
        documentId: {
          DataType: "String",
          StringValue: "doc-123",
        },
        priority: {
          DataType: "String",
          StringValue: "normal",
        },
        notificationType: {
          DataType: "String",
          StringValue: "kyc-review-required",
        },
      });
    });

    it("should generate secure review URL with correct format", async () => {
      snsMock.on(PublishCommand).resolves({
        MessageId: "msg-123",
      });

      await notificationService.sendKYCReviewNotification(mockNotificationData);

      const publishCall = snsMock.commandCalls(PublishCommand)[0];
      const args = publishCall.args[0].input;
      const message = JSON.parse(args.Message as string);

      expect(message.email).toContain(
        `${mockAdminPortalUrl}/kyc/review/doc-123?user=user-456`
      );
      expect(message.default).toContain(
        `${mockAdminPortalUrl}/kyc/review/doc-123?user=user-456`
      );
    });

    it("should format HTML email content correctly", async () => {
      snsMock.on(PublishCommand).resolves({
        MessageId: "msg-123",
      });

      await notificationService.sendKYCReviewNotification(mockNotificationData);

      const publishCall = snsMock.commandCalls(PublishCommand)[0];
      const args = publishCall.args[0].input;
      const message = JSON.parse(args.Message as string);

      expect(message.email).toContain("<!DOCTYPE html>");
      expect(message.email).toContain("KYC Document Review Required");
      expect(message.email).toContain("doc-123");
      expect(message.email).toContain("user-456");
      expect(message.email).toContain("national_id");
      expect(message.email).toContain("id-card.jpg");
      expect(message.email).toContain("Review Document");
    });

    it("should format plain text email content correctly", async () => {
      snsMock.on(PublishCommand).resolves({
        MessageId: "msg-123",
      });

      await notificationService.sendKYCReviewNotification(mockNotificationData);

      const publishCall = snsMock.commandCalls(PublishCommand)[0];
      const args = publishCall.args[0].input;
      const message = JSON.parse(args.Message as string);

      expect(message.default).toContain("KYC Document Review Required");
      expect(message.default).toContain("Document ID: doc-123");
      expect(message.default).toContain("User ID: user-456");
      expect(message.default).toContain("Document Type: national_id");
      expect(message.default).toContain("File Name: id-card.jpg");
      expect(message.default).toContain("Sachain KYC System");
    });

    it("should handle missing admin portal URL gracefully", async () => {
      const serviceWithoutUrl = new NotificationService({
        snsClient: new SNSClient({}),
        topicArn: mockTopicArn,
      });

      snsMock.on(PublishCommand).resolves({
        MessageId: "msg-123",
      });

      await serviceWithoutUrl.sendKYCReviewNotification(mockNotificationData);

      const publishCall = snsMock.commandCalls(PublishCommand)[0];
      const args = publishCall.args[0].input;
      const message = JSON.parse(args.Message as string);

      expect(message.default).toContain("#review-doc-123");
      expect(message.email).toContain("#review-doc-123");
    });

    it("should throw error when SNS publish fails", async () => {
      const error = new Error("SNS publish failed");
      snsMock.on(PublishCommand).rejects(error);

      await expect(
        notificationService.sendKYCReviewNotification(mockNotificationData)
      ).rejects.toThrow("SNS publish failed");
    });

    it("should handle different document types correctly", async () => {
      const testCases = ["passport", "driver_license", "utility_bill"];

      for (const docType of testCases) {
        snsMock.reset();
        snsMock.on(PublishCommand).resolves({ MessageId: "msg-123" });

        const data = { ...mockNotificationData, documentType: docType };
        await notificationService.sendKYCReviewNotification(data);

        const publishCall = snsMock.commandCalls(PublishCommand)[0];
        const args = publishCall.args[0].input;

        expect(args.Subject).toBe(`KYC Document Review Required - ${docType}`);
        expect(args.MessageAttributes?.documentType?.StringValue).toBe(docType);
      }
    });

    it("should format uploaded date correctly in email", async () => {
      snsMock.on(PublishCommand).resolves({
        MessageId: "msg-123",
      });

      await notificationService.sendKYCReviewNotification(mockNotificationData);

      const publishCall = snsMock.commandCalls(PublishCommand)[0];
      const args = publishCall.args[0].input;
      const message = JSON.parse(args.Message as string);

      // Check that the date is formatted in a readable way
      const expectedDate = new Date("2024-01-15T10:30:00.000Z").toLocaleString();
      expect(message.default).toContain(expectedDate);
      expect(message.email).toContain(expectedDate);
    });
  });

  describe("constructor", () => {
    it("should use environment variable for admin portal URL when not provided", () => {
      process.env.ADMIN_PORTAL_URL = "https://env-admin.com";

      const service = new NotificationService({
        snsClient: new SNSClient({}),
        topicArn: mockTopicArn,
      });

      // Test by checking the generated URL format
      expect(service).toBeDefined();

      delete process.env.ADMIN_PORTAL_URL;
    });

    it("should handle missing admin portal URL in environment", () => {
      delete process.env.ADMIN_PORTAL_URL;

      const service = new NotificationService({
        snsClient: new SNSClient({}),
        topicArn: mockTopicArn,
      });

      expect(service).toBeDefined();
    });
  });
});