import { handler as postAuthHandler } from "../../lambdas/post-auth/index";
import { handler as kycUploadHandler } from "../../lambdas/kyc-upload/index";
import { handler as adminReviewHandler } from "../../lambdas/admin-review/index";
import { handler as userNotificationHandler } from "../../lambdas/user-notification/index";
import { PostAuthEvent } from "../../lambdas/post-auth/types";
import { KYCUploadEvent } from "../../lambdas/kyc-upload/types";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

// Mock AWS SDK clients
const dynamoMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);
const snsMock = mockClient(SNSClient);
const cloudWatchMock = mockClient(CloudWatchClient);
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock getSignedUrl
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://mock-presigned-url.com"),
}));

// Mock uuid
jest.mock("uuid", () => ({
  v4: jest.fn().mockReturnValue("test-document-id-123"),
}));

// Mock console methods to avoid test output noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe("KYC Workflow Integration Tests", () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "test-function",
    functionVersion: "1",
    invokedFunctionArn:
      "arn:aws:lambda:us-east-1:123456789012:function:test-function",
    memoryLimitInMB: "512",
    awsRequestId: "test-request-id",
    logGroupName: "/aws/lambda/test-function",
    logStreamName: "test-stream",
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
  };

  beforeEach(() => {
    // Reset all mocks
    dynamoMock.reset();
    s3Mock.reset();
    snsMock.reset();
    cloudWatchMock.reset();
    eventBridgeMock.reset();

    // Set environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.BUCKET_NAME = "test-bucket";
    process.env.SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:test-topic";
    process.env.EVENT_BUS_NAME = "test-event-bus";
    process.env.ENVIRONMENT = "test";
    process.env.AWS_REGION = "us-east-1";
    process.env.ADMIN_PORTAL_URL = "https://admin.sachain.com";

    // Setup default mocks
    dynamoMock.on(PutCommand).resolves({});
    dynamoMock.on(GetCommand).resolves({ Item: undefined });
    dynamoMock.on(UpdateCommand).resolves({});
    dynamoMock.on(QueryCommand).resolves({ Items: [], Count: 0 });
    s3Mock.on(PutObjectCommand).resolves({ ETag: "mock-etag" });
    snsMock.on(PublishCommand).resolves({ MessageId: "mock-message-id" });
    cloudWatchMock.on(PutMetricDataCommand).resolves({});
    eventBridgeMock
      .on(PutEventsCommand)
      .resolves({ Entries: [{ EventId: "test-event-id" }] });
  });

  describe("Complete User Registration and Authentication Flow", () => {
    it("should handle complete user registration flow", async () => {
      // Step 1: User completes authentication (post-auth trigger)
      const postAuthEvent: PostAuthEvent = {
        version: "1",
        region: "us-east-1",
        userPoolId: "us-east-1_test123",
        userName: "test-user-123",
        callerContext: {
          awsSdkVersion: "2.0.0",
          clientId: "test-client-id",
        },
        triggerSource: "PostAuthentication_Authentication",
        request: {
          userAttributes: {
            email: "test@example.com",
            email_verified: "true",
            given_name: "John",
            family_name: "Doe",
            "custom:user_type": "entrepreneur",
          },
        },
        response: {},
      };

      // Execute post-authentication Lambda
      const postAuthResult = await postAuthHandler(postAuthEvent);

      // Verify user profile was created
      expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(1);
      const putCall = dynamoMock.commandCalls(PutCommand)[0];
      const userProfile = putCall.args[0].input.Item;

      expect(userProfile).toMatchObject({
        PK: "USER#test-user-123",
        SK: "PROFILE",
        userId: "test-user-123",
        email: "test@example.com",
        kycStatus: "not_started",
        userType: "entrepreneur",
        emailVerified: true,
        firstName: "John",
        lastName: "Doe",
      });

      // Verify CloudWatch metrics were sent
      expect(
        cloudWatchMock.commandCalls(PutMetricDataCommand).length
      ).toBeGreaterThan(0);

      // Verify the event is returned unchanged (required for Cognito)
      expect(postAuthResult).toEqual(postAuthEvent);
    });

    it("should handle user authentication with minimal attributes", async () => {
      const postAuthEvent: PostAuthEvent = {
        version: "1",
        region: "us-east-1",
        userPoolId: "us-east-1_test123",
        userName: "minimal-user-456",
        callerContext: {
          awsSdkVersion: "2.0.0",
          clientId: "test-client-id",
        },
        triggerSource: "PostAuthentication_Authentication",
        request: {
          userAttributes: {
            email: "minimal@example.com",
            email_verified: "false",
          },
        },
        response: {},
      };

      const result = await postAuthHandler(postAuthEvent);

      expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(1);
      const putCall = dynamoMock.commandCalls(PutCommand)[0];
      const userProfile = putCall.args[0].input.Item;

      expect(userProfile).toMatchObject({
        PK: "USER#minimal-user-456",
        SK: "PROFILE",
        userId: "minimal-user-456",
        email: "minimal@example.com",
        kycStatus: "not_started",
        userType: "entrepreneur", // default value
        emailVerified: false,
      });

      expect(result).toEqual(postAuthEvent);
    });
  });

  describe("KYC Upload and Approval Process", () => {
    it("should handle complete KYC upload and approval workflow", async () => {
      // Step 1: Generate presigned URL for upload
      const presignedUrlEvent: KYCUploadEvent = {
        path: "/presigned-url",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {
          requestId: "test-request-id",
        } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify({
          documentType: "national_id",
          fileName: "national_id.jpg",
          contentType: "image/jpeg",
          userId: "user123",
        }),
      };

      const presignedUrlResult = (await kycUploadHandler(
        presignedUrlEvent,
        mockContext,
        jest.fn()
      )) as any;

      expect(presignedUrlResult.statusCode).toBe(200);
      const presignedUrlBody = JSON.parse(presignedUrlResult.body);
      expect(presignedUrlBody.documentId).toBe("test-document-id-123");
      expect(presignedUrlBody.uploadUrl).toBe("https://mock-presigned-url.com");

      // Verify document record was created in DynamoDB
      expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(1);
      const documentPutCall = dynamoMock.commandCalls(PutCommand)[0];
      const documentRecord = documentPutCall.args[0].input.Item;

      expect(documentRecord).toMatchObject({
        PK: "USER#user123",
        SK: "KYC#test-document-id-123",
        documentId: "test-document-id-123",
        userId: "user123",
        documentType: "national_id",
        status: "uploaded",
      });

      // Step 2: Process upload completion
      dynamoMock.on(GetCommand).resolves({
        Item: {
          documentId: "test-document-id-123",
          userId: "user123",
          documentType: "national_id",
          originalFileName: "national_id.jpg",
          status: "uploaded",
          uploadedAt: "2024-01-01T00:00:00.000Z",
        },
      });

      const uploadProcessingEvent: KYCUploadEvent = {
        path: "/process-upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {
          requestId: "test-request-id-2",
        } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify({
          documentId: "test-document-id-123",
          userId: "user123",
          s3Key: "kyc-documents/user123/national_id/2024-01-01/doc.jpg",
          fileSize: 1024,
        }),
      };

      const uploadProcessingResult = (await kycUploadHandler(
        uploadProcessingEvent,
        mockContext,
        jest.fn()
      )) as any;

      expect(uploadProcessingResult.statusCode).toBe(200);
      const uploadProcessingBody = JSON.parse(uploadProcessingResult.body);
      expect(uploadProcessingBody.message).toBe(
        "Upload processed successfully"
      );
      expect(uploadProcessingBody.status).toBe("pending_review");

      // Verify admin notification was sent
      expect(snsMock.commandCalls(PublishCommand).length).toBeGreaterThan(0);

      // Step 3: Admin approves the document
      // Mock the document exists and is pending
      dynamoMock.on(GetCommand).resolves({
        Item: {
          documentId: "test-document-id-123",
          userId: "user123",
          status: "pending",
          documentType: "national_id",
        },
      });

      const adminApprovalEvent: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user123",
          documentId: "test-document-id-123",
          comments: "Document looks good",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        requestContext: {
          requestId: "test-request-id-3",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      const adminApprovalResult = (await adminReviewHandler(
        adminApprovalEvent,
        mockContext,
        jest.fn()
      )) as any;

      expect(adminApprovalResult.statusCode).toBe(200);
      const adminApprovalBody = JSON.parse(adminApprovalResult.body);
      expect(adminApprovalBody.message).toBe("Document approved successfully");
      expect(adminApprovalBody.status).toBe("approved");

      // Verify EventBridge event was published
      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(1);
      const eventCall = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const eventEntry = eventCall.args[0].input.Entries?.[0];
      expect(eventEntry?.Source).toBe("sachain.kyc");
      expect(eventEntry?.DetailType).toBe("KYC Status Changed");

      // Step 4: User receives notification
      const userNotificationEvent = {
        version: "0",
        id: "test-event-id",
        "detail-type": "KYC Status Changed" as const,
        source: "sachain.kyc",
        account: "123456789012",
        time: "2024-01-01T00:00:00Z",
        region: "us-east-1",
        resources: [],
        detail: {
          eventType: "KYC_STATUS_CHANGED",
          userId: "user123",
          documentId: "test-document-id-123",
          oldStatus: "pending",
          newStatus: "approved" as const,
          reviewedBy: "admin-user",
          reviewComments: "Document looks good",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      // Mock user profile for notification
      dynamoMock.on(GetCommand).resolves({
        Item: {
          PK: "USER#user123",
          SK: "PROFILE",
          userId: "user123",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
          userType: "entrepreneur",
          emailNotifications: true,
        },
      });

      const notificationResult = await userNotificationHandler(
        userNotificationEvent,
        mockContext
      );

      // Verify user notification was sent
      expect(snsMock.commandCalls(PublishCommand).length).toBeGreaterThan(1); // Admin + User notifications
    });

    it("should handle KYC rejection workflow", async () => {
      // Mock the document exists and is pending
      dynamoMock.on(GetCommand).resolves({
        Item: {
          documentId: "test-document-id-456",
          userId: "user456",
          status: "pending",
          documentType: "national_id",
        },
      });

      const adminRejectionEvent: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/reject",
        body: JSON.stringify({
          userId: "user456",
          documentId: "test-document-id-456",
          comments: "Document quality is poor, please resubmit",
        }),
        headers: {
          Authorization: "Bearer test-token",
        },
        requestContext: {
          requestId: "test-request-id-4",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      const adminRejectionResult = (await adminReviewHandler(
        adminRejectionEvent,
        mockContext,
        jest.fn()
      )) as any;

      expect(adminRejectionResult.statusCode).toBe(200);
      const adminRejectionBody = JSON.parse(adminRejectionResult.body);
      expect(adminRejectionBody.message).toBe("Document rejected successfully");
      expect(adminRejectionBody.status).toBe("rejected");
      expect(adminRejectionBody.comments).toBe(
        "Document quality is poor, please resubmit"
      );

      // Verify EventBridge event was published for rejection
      expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(1);
      const eventCall = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const eventEntry = eventCall.args[0].input.Entries?.[0];
      expect(eventEntry?.Source).toBe("sachain.kyc");
      expect(eventEntry?.DetailType).toBe("KYC Status Changed");
    });
  });

  describe("Error Scenarios and Edge Cases", () => {
    it("should handle post-auth Lambda errors gracefully", async () => {
      // Mock DynamoDB error
      dynamoMock
        .on(PutCommand)
        .rejects(new Error("DynamoDB connection failed"));

      const postAuthEvent: PostAuthEvent = {
        version: "1",
        region: "us-east-1",
        userPoolId: "us-east-1_test123",
        userName: "error-user-123",
        callerContext: {
          awsSdkVersion: "2.0.0",
          clientId: "test-client-id",
        },
        triggerSource: "PostAuthentication_Authentication",
        request: {
          userAttributes: {
            email: "error@example.com",
            email_verified: "true",
          },
        },
        response: {},
      };

      // Should not throw error and return original event (to not block authentication)
      const result = await postAuthHandler(postAuthEvent);
      expect(result).toEqual(postAuthEvent);

      // Verify error metrics were sent
      expect(
        cloudWatchMock.commandCalls(PutMetricDataCommand).length
      ).toBeGreaterThan(0);
    });

    it("should handle KYC upload with invalid document type", async () => {
      const invalidUploadEvent: KYCUploadEvent = {
        path: "/presigned-url",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {
          requestId: "test-request-id-5",
        } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify({
          documentType: "invalid_type",
          fileName: "document.jpg",
          contentType: "image/jpeg",
          userId: "user123",
        }),
      };

      const result = (await kycUploadHandler(
        invalidUploadEvent,
        mockContext,
        jest.fn()
      )) as any;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Invalid document type");

      // Verify no DynamoDB calls were made
      expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(0);
    });

    it("should handle admin review of non-existent document", async () => {
      // Mock document not found
      dynamoMock.on(GetCommand).resolves({ Item: undefined });

      const adminReviewEvent: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user123",
          documentId: "non-existent-doc",
        }),
        headers: {},
        requestContext: {
          requestId: "test-request-id-6",
          identity: {},
        } as any,
      } as any;

      const result = (await adminReviewHandler(
        adminReviewEvent,
        mockContext,
        jest.fn()
      )) as any;

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Document not found");
    });

    it("should handle EventBridge failures gracefully", async () => {
      // Mock EventBridge failure
      eventBridgeMock
        .on(PutEventsCommand)
        .rejects(new Error("EventBridge service unavailable"));

      // Mock the document exists and is pending
      dynamoMock.on(GetCommand).resolves({
        Item: {
          documentId: "test-document-id-789",
          userId: "user789",
          status: "pending",
          documentType: "national_id",
        },
      });

      const adminApprovalEvent: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user789",
          documentId: "test-document-id-789",
        }),
        headers: {},
        requestContext: {
          requestId: "test-request-id-7",
          identity: {},
        } as any,
      } as any;

      // Should still succeed despite EventBridge failure
      const result = (await adminReviewHandler(
        adminApprovalEvent,
        mockContext,
        jest.fn()
      )) as any;
      expect(result.statusCode).toBe(200);
    });
  });

  describe("Performance Validation", () => {
    it("should handle concurrent user registrations", async () => {
      const concurrentUsers = 5;
      const postAuthPromises = [];

      for (let i = 0; i < concurrentUsers; i++) {
        const postAuthEvent: PostAuthEvent = {
          version: "1",
          region: "us-east-1",
          userPoolId: "us-east-1_test123",
          userName: `concurrent-user-${i}`,
          callerContext: {
            awsSdkVersion: "2.0.0",
            clientId: "test-client-id",
          },
          triggerSource: "PostAuthentication_Authentication",
          request: {
            userAttributes: {
              email: `user${i}@example.com`,
              email_verified: "true",
              "custom:user_type": "entrepreneur",
            },
          },
          response: {},
        };

        postAuthPromises.push(postAuthHandler(postAuthEvent));
      }

      const results = await Promise.all(postAuthPromises);

      // All should succeed
      expect(results).toHaveLength(concurrentUsers);
      results.forEach((result, index) => {
        expect(result.userName).toBe(`concurrent-user-${index}`);
      });

      // Verify all user profiles were created
      expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(concurrentUsers);
    });

    it("should handle multiple KYC uploads efficiently", async () => {
      const concurrentUploads = 3;
      const uploadPromises = [];

      for (let i = 0; i < concurrentUploads; i++) {
        const uploadEvent: KYCUploadEvent = {
          path: "/presigned-url",
          httpMethod: "POST",
          headers: {},
          multiValueHeaders: {},
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          pathParameters: null,
          stageVariables: null,
          requestContext: {
            requestId: `test-request-id-${i}`,
          } as any,
          resource: "",
          isBase64Encoded: false,
          body: JSON.stringify({
            documentType: "national_id",
            fileName: `document${i}.jpg`,
            contentType: "image/jpeg",
            userId: `user${i}`,
          }),
        };

        uploadPromises.push(
          kycUploadHandler(uploadEvent, mockContext, jest.fn())
        );
      }

      const results = await Promise.all(uploadPromises);

      // All should succeed
      expect(results).toHaveLength(concurrentUploads);
      results.forEach((result: any) => {
        expect(result.statusCode).toBe(200);
      });

      // Verify all document records were created
      expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(
        concurrentUploads
      );
    });
  });
});
