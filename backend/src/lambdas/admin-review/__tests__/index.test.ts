import { handler } from "../index";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { KYCDocumentRepository } from "../../../repositories/kyc-document-repository";
import { UserRepository } from "../../../repositories/user-repository";
import { AuditLogRepository } from "../../../repositories/audit-log-repository";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";

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

const mockKYCRepo = KYCDocumentRepository as jest.MockedClass<typeof KYCDocumentRepository>;
const mockUserRepo = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockAuditRepo = AuditLogRepository as jest.MockedClass<typeof AuditLogRepository>;
const mockEventBridgeClient = EventBridgeClient as jest.MockedClass<typeof EventBridgeClient>;
const mockCloudWatchClient = CloudWatchClient as jest.MockedClass<typeof CloudWatchClient>;

// Mock environment variables
process.env.TABLE_NAME = "test-table";
process.env.EVENT_BUS_NAME = "test-event-bus";
process.env.ENVIRONMENT = "test";
process.env.AWS_REGION = "us-east-1";

describe("Admin Review Lambda", () => {
  let mockContext: Context;
  let mockKYCRepoInstance: jest.Mocked<KYCDocumentRepository>;
  let mockUserRepoInstance: jest.Mocked<UserRepository>;
  let mockAuditRepoInstance: jest.Mocked<AuditLogRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "test-function",
      functionVersion: "1",
      invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test-function",
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
    mockKYCRepoInstance = {
      getKYCDocument: jest.fn(),
      approveDocument: jest.fn(),
      rejectDocument: jest.fn(),
      getPendingDocuments: jest.fn(),
      getDocumentsByStatus: jest.fn(),
    } as any;

    mockUserRepoInstance = {
      updateUserProfile: jest.fn(),
    } as any;

    mockAuditRepoInstance = {
      logKYCReview: jest.fn(),
    } as any;

    mockKYCRepo.mockImplementation(() => mockKYCRepoInstance);
    mockUserRepo.mockImplementation(() => mockUserRepoInstance);
    mockAuditRepo.mockImplementation(() => mockAuditRepoInstance);

    // Mock EventBridge and CloudWatch clients
    mockEventBridgeClient.prototype.send = jest.fn().mockResolvedValue({});
    mockCloudWatchClient.prototype.send = jest.fn().mockResolvedValue({});
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
      mockKYCRepoInstance.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      } as any);

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(mockKYCRepoInstance.approveDocument).toHaveBeenCalledWith(
        "user-123",
        "doc-456",
        "admin-user-placeholder",
        "Document looks good"
      );
      expect(mockUserRepoInstance.updateUserProfile).toHaveBeenCalledWith({
        userId: "user-123",
        kycStatus: "approved",
      });
      expect(mockAuditRepoInstance.logKYCReview).toHaveBeenCalled();

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

      mockKYCRepoInstance.getKYCDocument.mockResolvedValue(null);

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

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

      mockKYCRepoInstance.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "approved",
        documentType: "national_id",
      } as any);

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

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

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

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

      mockKYCRepoInstance.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      } as any);

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(mockKYCRepoInstance.rejectDocument).toHaveBeenCalledWith(
        "user-123",
        "doc-456",
        "admin-user-placeholder",
        "Document quality is poor"
      );
      expect(mockUserRepoInstance.updateUserProfile).toHaveBeenCalledWith({
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

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

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

      mockKYCRepoInstance.getPendingDocuments.mockResolvedValue({
        items: mockDocuments,
        count: 2,
      });

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(mockKYCRepoInstance.getPendingDocuments).toHaveBeenCalledWith({ limit: 50 });

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

      mockKYCRepoInstance.getDocumentsByStatus.mockResolvedValue({
        items: mockDocuments,
        count: 1,
      });

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(mockKYCRepoInstance.getDocumentsByStatus).toHaveBeenCalledWith("approved", { limit: 25 });

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

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

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

      mockKYCRepoInstance.getKYCDocument.mockRejectedValue(new Error("Database connection failed"));

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

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

      mockKYCRepoInstance.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      } as any);

      await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

      expect(mockEventBridgeClient.prototype.send).toHaveBeenCalled();
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

      mockKYCRepoInstance.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      } as any);

      // Mock EventBridge failure
      (mockEventBridgeClient.prototype.send as jest.Mock).mockRejectedValue(new Error("EventBridge failed"));

      const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

      // Should still succeed despite EventBridge failure
      expect(result.statusCode).toBe(200);
    });
  });
});