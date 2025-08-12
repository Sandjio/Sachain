// Mock environment variables before importing the handler
process.env.TABLE_NAME = "test-table";
process.env.ENVIRONMENT = "test";
process.env.FRONTEND_URL = "https://app.sachain-test.com";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_ACCOUNT_ID = "123456789012";

import { handler } from "../index";
import { EventBridgeEvent, Context } from "aws-lambda";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";

// Mock AWS SDK clients
const dynamoMock = mockClient(DynamoDBDocumentClient);
const snsMock = mockClient(SNSClient);

describe("User Notification Lambda", () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "test-function",
    functionVersion: "1",
    invokedFunctionArn:
      "arn:aws:lambda:us-east-1:123456789012:function:test-function",
    memoryLimitInMB: "256",
    awsRequestId: "test-request-id",
    logGroupName: "/aws/lambda/test-function",
    logStreamName: "2023/01/01/[$LATEST]test-stream",
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
  };

  const mockUserProfile = {
    PK: "USER#test-user-123",
    SK: "PROFILE",
    userId: "test-user-123",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    userType: "entrepreneur" as const,
    kycStatus: "pending",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    emailVerified: true,
    notificationPreferences: {
      email: true,
      sms: false,
      push: true,
      kycUpdates: true,
      marketingEmails: false,
    },
  };

  beforeEach(() => {
    dynamoMock.reset();
    snsMock.reset();
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe("KYC Approval Events", () => {
    const approvalEvent: EventBridgeEvent<"KYC Status Changed", any> = {
      version: "0",
      id: "test-event-id",
      "detail-type": "KYC Status Changed",
      source: "sachain.kyc",
      account: "123456789012",
      time: "2023-01-01T00:00:00Z",
      region: "us-east-1",
      resources: [],
      detail: {
        eventType: "KYC_STATUS_CHANGED",
        userId: "test-user-123",
        documentId: "doc-123",
        newStatus: "approved",
        oldStatus: "pending",
        reviewedBy: "admin@sachain.com",
        timestamp: "2023-01-01T00:00:00Z",
      },
    };

    test("should send approval notification successfully", async () => {
      // Mock DynamoDB response
      dynamoMock.on(GetCommand).resolves({
        Item: mockUserProfile,
      });

      // Mock SNS response
      snsMock.on(PublishCommand).resolves({
        MessageId: "test-message-id",
      });

      await handler(approvalEvent, mockContext);

      // Verify DynamoDB was called correctly
      expect(dynamoMock.commandCalls(GetCommand)).toHaveLength(1);
      expect(dynamoMock.commandCalls(GetCommand)[0].args[0].input).toEqual({
        TableName: "test-table",
        Key: {
          PK: "USER#test-user-123",
          SK: "PROFILE",
        },
      });

      // Verify SNS was called correctly
      expect(snsMock.commandCalls(PublishCommand)).toHaveLength(1);
      const snsCall = snsMock.commandCalls(PublishCommand)[0].args[0].input;
      expect(snsCall.Subject).toBe(
        "KYC Verification Approved - Welcome to Sachain!"
      );
      expect(snsCall.TopicArn).toBe(
        "arn:aws:sns:us-east-1:123456789012:sachain-kyc-user-notifications-test"
      );

      const messageData = JSON.parse(snsCall.Message!);
      expect(messageData.email).toBe("test@example.com");
      expect(messageData.subject).toBe(
        "KYC Verification Approved - Welcome to Sachain!"
      );
      expect(messageData.message).toContain(
        "Congratulations! Your KYC verification has been approved"
      );
      expect(messageData.message).toContain("John Doe");
      expect(messageData.message).toContain(
        "Create and manage fundraising campaigns"
      );
    });

    test("should handle user not found", async () => {
      // Mock DynamoDB response with no item
      dynamoMock.on(GetCommand).resolves({});

      await handler(approvalEvent, mockContext);

      // Verify DynamoDB was called
      expect(dynamoMock.commandCalls(GetCommand)).toHaveLength(1);

      // Verify SNS was not called
      expect(snsMock.commandCalls(PublishCommand)).toHaveLength(0);

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        "User profile not found for userId: test-user-123"
      );
    });

    test("should respect email notification preferences", async () => {
      const userWithEmailDisabled = {
        ...mockUserProfile,
        notificationPreferences: {
          ...mockUserProfile.notificationPreferences,
          email: false,
        },
      };

      dynamoMock.on(GetCommand).resolves({
        Item: userWithEmailDisabled,
      });

      await handler(approvalEvent, mockContext);

      // Verify SNS was not called
      expect(snsMock.commandCalls(PublishCommand)).toHaveLength(0);

      // Verify log message
      expect(console.log).toHaveBeenCalledWith(
        "Email notifications disabled for user: test-user-123"
      );
    });
  });

  describe("KYC Rejection Events", () => {
    const rejectionEvent: EventBridgeEvent<"KYC Status Changed", any> = {
      version: "0",
      id: "test-event-id",
      "detail-type": "KYC Status Changed",
      source: "sachain.kyc",
      account: "123456789012",
      time: "2023-01-01T00:00:00Z",
      region: "us-east-1",
      resources: [],
      detail: {
        eventType: "KYC_STATUS_CHANGED",
        userId: "test-user-123",
        documentId: "doc-123",
        newStatus: "rejected",
        oldStatus: "pending",
        reviewedBy: "admin@sachain.com",
        reviewComments:
          "Document is not clear. Please upload a higher quality image.",
        timestamp: "2023-01-01T00:00:00Z",
      },
    };

    test("should send rejection notification with comments", async () => {
      dynamoMock.on(GetCommand).resolves({
        Item: mockUserProfile,
      });

      snsMock.on(PublishCommand).resolves({
        MessageId: "test-message-id",
      });

      await handler(rejectionEvent, mockContext);

      // Verify SNS was called correctly
      expect(snsMock.commandCalls(PublishCommand)).toHaveLength(1);
      const snsCall = snsMock.commandCalls(PublishCommand)[0].args[0].input;
      expect(snsCall.Subject).toBe("KYC Verification Update Required");

      const messageData = JSON.parse(snsCall.Message!);
      expect(messageData.message).toContain("We need additional information");
      expect(messageData.message).toContain(
        "Document is not clear. Please upload a higher quality image."
      );
      expect(messageData.message).toContain("John Doe");
    });

    test("should send rejection notification without comments", async () => {
      const rejectionEventNoComments = {
        ...rejectionEvent,
        detail: {
          ...rejectionEvent.detail,
          reviewComments: undefined,
        },
      };

      dynamoMock.on(GetCommand).resolves({
        Item: mockUserProfile,
      });

      snsMock.on(PublishCommand).resolves({
        MessageId: "test-message-id",
      });

      await handler(rejectionEventNoComments, mockContext);

      // Verify SNS was called correctly
      expect(snsMock.commandCalls(PublishCommand)).toHaveLength(1);
      const snsCall = snsMock.commandCalls(PublishCommand)[0].args[0].input;

      const messageData = JSON.parse(snsCall.Message!);
      expect(messageData.message).toContain("We need additional information");
      expect(messageData.message).not.toContain("Review Comments:");
    });
  });

  describe("Error Handling", () => {
    const testEvent: EventBridgeEvent<"KYC Status Changed", any> = {
      version: "0",
      id: "test-event-id",
      "detail-type": "KYC Status Changed",
      source: "sachain.kyc",
      account: "123456789012",
      time: "2023-01-01T00:00:00Z",
      region: "us-east-1",
      resources: [],
      detail: {
        eventType: "KYC_STATUS_CHANGED",
        userId: "test-user-123",
        documentId: "doc-123",
        newStatus: "approved",
        reviewedBy: "admin@sachain.com",
        timestamp: "2023-01-01T00:00:00Z",
      },
    };

    test("should handle DynamoDB errors", async () => {
      const dynamoError = new Error("DynamoDB connection failed");
      dynamoMock.on(GetCommand).rejects(dynamoError);

      await expect(handler(testEvent, mockContext)).rejects.toThrow(
        "DynamoDB connection failed"
      );

      expect(console.error).toHaveBeenCalledWith(
        "Error processing KYC status change event:",
        dynamoError
      );
    });

    test("should handle SNS errors", async () => {
      dynamoMock.on(GetCommand).resolves({
        Item: mockUserProfile,
      });

      const snsError = new Error("SNS publish failed");
      snsMock.on(PublishCommand).rejects(snsError);

      await expect(handler(testEvent, mockContext)).rejects.toThrow(
        "SNS publish failed"
      );

      expect(console.error).toHaveBeenCalledWith(
        "Error processing KYC status change event:",
        snsError
      );
    });
  });

  describe("Email Content Generation", () => {
    test("should generate appropriate content for entrepreneurs", async () => {
      const entrepreneurProfile = {
        ...mockUserProfile,
        userType: "entrepreneur" as const,
      };

      dynamoMock.on(GetCommand).resolves({
        Item: entrepreneurProfile,
      });

      snsMock.on(PublishCommand).resolves({
        MessageId: "test-message-id",
      });

      const approvalEvent: EventBridgeEvent<"KYC Status Changed", any> = {
        version: "0",
        id: "test-event-id",
        "detail-type": "KYC Status Changed",
        source: "sachain.kyc",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventType: "KYC_STATUS_CHANGED",
          userId: "test-user-123",
          documentId: "doc-123",
          newStatus: "approved",
          timestamp: "2023-01-01T00:00:00Z",
        },
      };

      await handler(approvalEvent, mockContext);

      const snsCall = snsMock.commandCalls(PublishCommand)[0].args[0].input;
      const messageData = JSON.parse(snsCall.Message!);

      expect(messageData.message).toContain(
        "Create and manage fundraising campaigns"
      );
      expect(messageData.message).toContain("Tokenize your project shares");
      expect(messageData.message).toContain("Access investor analytics");
    });

    test("should generate appropriate content for investors", async () => {
      const investorProfile = {
        ...mockUserProfile,
        userType: "investor" as const,
      };

      dynamoMock.on(GetCommand).resolves({
        Item: investorProfile,
      });

      snsMock.on(PublishCommand).resolves({
        MessageId: "test-message-id",
      });

      const approvalEvent: EventBridgeEvent<"KYC Status Changed", any> = {
        version: "0",
        id: "test-event-id",
        "detail-type": "KYC Status Changed",
        source: "sachain.kyc",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventType: "KYC_STATUS_CHANGED",
          userId: "test-user-123",
          documentId: "doc-123",
          newStatus: "approved",
          timestamp: "2023-01-01T00:00:00Z",
        },
      };

      await handler(approvalEvent, mockContext);

      const snsCall = snsMock.commandCalls(PublishCommand)[0].args[0].input;
      const messageData = JSON.parse(snsCall.Message!);

      expect(messageData.message).toContain(
        "Browse and invest in tokenized projects"
      );
      expect(messageData.message).toContain("Manage your investment portfolio");
      expect(messageData.message).toContain("Participate in governance voting");
    });

    test("should handle users without names", async () => {
      const userWithoutName = {
        ...mockUserProfile,
        firstName: undefined,
        lastName: undefined,
      };

      dynamoMock.on(GetCommand).resolves({
        Item: userWithoutName,
      });

      snsMock.on(PublishCommand).resolves({
        MessageId: "test-message-id",
      });

      const approvalEvent: EventBridgeEvent<"KYC Status Changed", any> = {
        version: "0",
        id: "test-event-id",
        "detail-type": "KYC Status Changed",
        source: "sachain.kyc",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventType: "KYC_STATUS_CHANGED",
          userId: "test-user-123",
          documentId: "doc-123",
          newStatus: "approved",
          timestamp: "2023-01-01T00:00:00Z",
        },
      };

      await handler(approvalEvent, mockContext);

      const snsCall = snsMock.commandCalls(PublishCommand)[0].args[0].input;
      const messageData = JSON.parse(snsCall.Message!);

      expect(messageData.message).toContain("Dear User,");
    });
  });

  describe("Notification Preferences", () => {
    test("should default to email enabled when preferences are undefined", async () => {
      const userWithoutPreferences = {
        ...mockUserProfile,
        notificationPreferences: undefined,
      };

      dynamoMock.on(GetCommand).resolves({
        Item: userWithoutPreferences,
      });

      snsMock.on(PublishCommand).resolves({
        MessageId: "test-message-id",
      });

      const approvalEvent: EventBridgeEvent<"KYC Status Changed", any> = {
        version: "0",
        id: "test-event-id",
        "detail-type": "KYC Status Changed",
        source: "sachain.kyc",
        account: "123456789012",
        time: "2023-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventType: "KYC_STATUS_CHANGED",
          userId: "test-user-123",
          documentId: "doc-123",
          newStatus: "approved",
          timestamp: "2023-01-01T00:00:00Z",
        },
      };

      await handler(approvalEvent, mockContext);

      // Should send notification since email is enabled by default
      expect(snsMock.commandCalls(PublishCommand)).toHaveLength(1);
    });
  });
});
