import { handler } from "../index";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

// Mock AWS SDK clients
jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/lib-dynamodb");
jest.mock("@aws-sdk/client-eventbridge");
jest.mock("@aws-sdk/client-cloudwatch");

// Mock repositories
jest.mock("../../../repositories/kyc-document-repository");
jest.mock("../../../repositories/user-repository");
jest.mock("../../../repositories/audit-log-repository");

// Mock utilities
jest.mock("../../../utils/retry", () => ({
  ExponentialBackoff: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockImplementation((fn) => fn()),
  })),
}));
jest.mock("../../../utils/structured-logger", () => ({
  createKYCLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logMetricPublication: jest.fn(),
  }),
}));
jest.mock("../../../utils/error-handler", () => ({
  ErrorClassifier: {
    classify: jest.fn().mockReturnValue({
      category: "ClientError",
      errorCode: "ValidationError",
      httpStatusCode: 400,
      userMessage: "Invalid request",
    }),
  },
}));

// Mock environment variables
process.env.TABLE_NAME = "test-table";
process.env.EVENT_BUS_NAME = "test-event-bus";
process.env.ENVIRONMENT = "test";
process.env.AWS_REGION = "us-east-1";

describe("Admin Review Lambda", () => {
  let mockContext: Context;
  let mockKYCRepo: any;
  let mockUserRepo: any;
  let mockAuditRepo: any;
  let mockEventBridgeClient: any;
  let mockCloudWatchClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
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

    // Setup repository mocks
    const {
      KYCDocumentRepository,
    } = require("../../../repositories/kyc-document-repository");
    const { UserRepository } = require("../../../repositories/user-repository");
    const {
      AuditLogRepository,
    } = require("../../../repositories/audit-log-repository");
    const { EventBridgeClient } = require("@aws-sdk/client-eventbridge");
    const { CloudWatchClient } = require("@aws-sdk/client-cloudwatch");

    mockKYCRepo = {
      getKYCDocument: jest.fn(),
      approveDocument: jest.fn(),
      rejectDocument: jest.fn(),
      getPendingDocuments: jest.fn(),
      getDocumentsByStatus: jest.fn(),
    };

    mockUserRepo = {
      updateUserProfile: jest.fn(),
    };

    mockAuditRepo = {
      logKYCReview: jest.fn(),
    };

    mockEventBridgeClient = {
      send: jest.fn().mockResolvedValue({}),
    };

    mockCloudWatchClient = {
      send: jest.fn().mockResolvedValue({}),
    };

    // Mock the constructors to return our mock instances
    (KYCDocumentRepository as jest.Mock).mockImplementation(() => mockKYCRepo);
    (UserRepository as jest.Mock).mockImplementation(() => mockUserRepo);
    (AuditLogRepository as jest.Mock).mockImplementation(() => mockAuditRepo);
    (EventBridgeClient as jest.Mock).mockImplementation(
      () => mockEventBridgeClient
    );
    (CloudWatchClient as jest.Mock).mockImplementation(
      () => mockCloudWatchClient
    );
  });

  describe("Document Approval", () => {
    it("should approve a pending document successfully", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Document looks good",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      // Mock document exists and is pending
      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(mockKYCRepo.approveDocument).toHaveBeenCalledWith(
        "user-123",
        "doc-456",
        "admin-user-placeholder",
        "Document looks good"
      );
      expect(mockUserRepo.updateUserProfile).toHaveBeenCalledWith({
        userId: "user-123",
        kycStatus: "approved",
      });
      expect(mockAuditRepo.logKYCReview).toHaveBeenCalled();

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Document approved successfully");
      expect(responseBody.status).toBe("approved");
    });

    it("should return 404 when document not found", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "non-existent-doc",
        }),
        headers: {},
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue(null);

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Document not found");
    });

    it("should return 400 when document is not pending", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {},
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "approved",
        documentType: "national_id",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Document is not in pending status");
    });

    it("should validate request parameters", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          documentId: "doc-456",
          // Missing userId
        }),
        headers: {},
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Invalid user ID");
    });
  });

  describe("Document Rejection", () => {
    it("should reject a pending document successfully", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/reject",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Document quality is poor",
        }),
        headers: {
          Authorization: "Bearer test-token",
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(mockKYCRepo.rejectDocument).toHaveBeenCalledWith(
        "user-123",
        "doc-456",
        "admin-user-placeholder",
        "Document quality is poor"
      );
      expect(mockUserRepo.updateUserProfile).toHaveBeenCalledWith({
        userId: "user-123",
        kycStatus: "rejected",
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Document rejected successfully");
      expect(responseBody.status).toBe("rejected");
      expect(responseBody.comments).toBe("Document quality is poor");
    });

    it("should require comments for rejection", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/reject",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          // Missing comments
        }),
        headers: {},
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Comments are required for rejection");
    });
  });

  describe("Get Documents", () => {
    it("should retrieve pending documents by default", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "GET",
        path: "/documents",
        body: null,
        headers: {},
        queryStringParameters: null,
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      const mockDocuments = [
        {
          PK: "USER#user-1",
          SK: "KYC#doc-1",
          documentId: "doc-1",
          userId: "user-1",
          status: "pending" as const,
          documentType: "national_id" as const,
          s3Bucket: "test-bucket",
          s3Key: "test-key-1",
          originalFileName: "doc1.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          uploadedAt: "2023-01-01T00:00:00Z",
          GSI2PK: "DOCUMENT_STATUS#pending",
          GSI2SK: "2023-01-01T00:00:00Z",
        },
        {
          PK: "USER#user-2",
          SK: "KYC#doc-2",
          documentId: "doc-2",
          userId: "user-2",
          status: "pending" as const,
          documentType: "national_id" as const,
          s3Bucket: "test-bucket",
          s3Key: "test-key-2",
          originalFileName: "doc2.pdf",
          fileSize: 2048,
          mimeType: "application/pdf",
          uploadedAt: "2023-01-01T00:00:00Z",
          GSI2PK: "DOCUMENT_STATUS#pending",
          GSI2SK: "2023-01-01T00:00:00Z",
        },
      ];

      mockKYCRepo.getPendingDocuments.mockResolvedValue({
        items: mockDocuments,
        count: 2,
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(mockKYCRepo.getPendingDocuments).toHaveBeenCalledWith({
        limit: 50,
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody.documents).toEqual(mockDocuments);
      expect(responseBody.count).toBe(2);
    });

    it("should retrieve documents by status when specified", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "GET",
        path: "/documents",
        body: null,
        headers: {},
        queryStringParameters: {
          status: "approved",
          limit: "25",
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      const mockDocuments = [
        {
          PK: "USER#user-1",
          SK: "KYC#doc-1",
          documentId: "doc-1",
          userId: "user-1",
          status: "approved" as const,
          documentType: "national_id" as const,
          s3Bucket: "test-bucket",
          s3Key: "test-key-1",
          originalFileName: "doc1.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          uploadedAt: "2023-01-01T00:00:00Z",
          GSI2PK: "DOCUMENT_STATUS#approved",
          GSI2SK: "2023-01-01T00:00:00Z",
        },
      ];

      mockKYCRepo.getDocumentsByStatus.mockResolvedValue({
        items: mockDocuments,
        count: 1,
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(mockKYCRepo.getDocumentsByStatus).toHaveBeenCalledWith(
        "approved",
        { limit: 25 }
      );

      const responseBody = JSON.parse(result.body);
      expect(responseBody.documents).toEqual(mockDocuments);
      expect(responseBody.count).toBe(1);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown endpoints", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/unknown-endpoint",
        body: "{}",
        headers: {},
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Endpoint not found");
    });

    it("should handle database errors gracefully", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {},
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockRejectedValue(
        new Error("Database connection failed")
      );

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.requestId).toBe("test-request-id");
    });
  });

  describe("EventBridge Integration", () => {
    it("should publish KYC status change events on approval", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Approved",
        }),
        headers: {},
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      });

      (await handler(event, mockContext, jest.fn())) as APIGatewayProxyResult;

      expect(mockEventBridgeClient.send).toHaveBeenCalled();
    });

    it("should continue processing even if EventBridge fails", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {},
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      });

      // Mock EventBridge failure
      mockEventBridgeClient.send.mockRejectedValue(
        new Error("EventBridge failed")
      );

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      // Should still succeed despite EventBridge failure
      expect(result.statusCode).toBe(200);
    });
  });
});
