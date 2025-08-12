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
      category: "transient",
      errorCode: "ValidationError",
      httpStatusCode: 400,
      userMessage: "Invalid request",
      technicalMessage: "Technical error details",
      retryable: false,
    }),
  },
}));
jest.mock("../../../utils/eventbridge-service", () => ({
  createEventBridgeService: () => ({
    publishKYCStatusChangeEvent: jest.fn().mockResolvedValue({}),
    publishKYCReviewCompletedEvent: jest.fn().mockResolvedValue({}),
  }),
}));

// Mock environment variables
process.env.TABLE_NAME = "test-table";
process.env.EVENT_BUS_NAME = "test-event-bus";
process.env.ENVIRONMENT = "test";
process.env.AWS_REGION = "us-east-1";

describe("Admin Review Lambda - Audit Logging", () => {
  let mockContext: Context;
  let mockKYCRepo: any;
  let mockUserRepo: any;
  let mockAuditRepo: any;
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
      getUserProfile: jest.fn(),
    };

    mockAuditRepo = {
      createAuditLog: jest.fn().mockResolvedValue({}),
      logKYCReview: jest.fn().mockResolvedValue({}),
    };

    mockCloudWatchClient = {
      send: jest.fn().mockResolvedValue({}),
    };

    // Mock the constructors to return our mock instances
    (KYCDocumentRepository as jest.Mock).mockImplementation(() => mockKYCRepo);
    (UserRepository as jest.Mock).mockImplementation(() => mockUserRepo);
    (AuditLogRepository as jest.Mock).mockImplementation(() => mockAuditRepo);
    (CloudWatchClient as jest.Mock).mockImplementation(
      () => mockCloudWatchClient
    );
  });

  describe("Admin Access Audit Logging", () => {
    it("should log admin access attempt for valid endpoints", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {
          Authorization: "Bearer test-token",
          "User-Agent": "Test-Agent/1.0",
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

      await handler(event, mockContext, jest.fn());

      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "admin-user-placeholder",
        action: "admin_access",
        resource: "admin_endpoint:/approve",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        details: {
          httpMethod: "POST",
          path: "/approve",
          requestId: "test-request-id",
        },
      });
    });

    it("should log admin access attempt for unknown endpoints", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/unknown-endpoint",
        body: "{}",
        headers: {
          "User-Agent": "Test-Agent/1.0",
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "system-admin",
        action: "admin_access",
        resource: "admin_endpoint:/unknown-endpoint",
        result: "failure",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        errorMessage: "Endpoint not found",
        details: {
          httpMethod: "POST",
          path: "/unknown-endpoint",
          requestId: "test-request-id",
        },
      });
    });

    it("should continue processing even if admin access audit log fails", async () => {
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

      // Mock audit log failure
      mockAuditRepo.createAuditLog.mockRejectedValueOnce(
        new Error("Audit log failed")
      );

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

      // Should still process the request despite audit log failure
      expect(result.statusCode).toBe(200);
    });
  });

  describe("KYC Approval Audit Logging", () => {
    it("should log approval attempt before processing", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Document looks good",
        }),
        headers: {
          "User-Agent": "Test-Agent/1.0",
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
        originalFileName: "id-card.jpg",
      });

      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "user-123",
        userType: "entrepreneur",
      });

      await handler(event, mockContext, jest.fn());

      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "system-admin",
        action: "kyc_approve_attempt",
        resource: "kyc_document:doc-456",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        details: {
          requestId: "test-request-id",
          targetUserId: "user-123",
          documentId: "doc-456",
          hasComments: true,
        },
      });
    });

    it("should log successful approval with comprehensive details", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Document approved",
        }),
        headers: {
          "User-Agent": "Test-Agent/1.0",
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
        originalFileName: "id-card.jpg",
      });

      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "user-123",
        userType: "entrepreneur",
      });

      await handler(event, mockContext, jest.fn());

      // Check for successful approval audit log
      const successfulApprovalCall =
        mockAuditRepo.createAuditLog.mock.calls.find(
          (call: any) =>
            call[0].action === "kyc_approve" && call[0].result === "success"
        );

      expect(successfulApprovalCall).toBeDefined();
      expect(successfulApprovalCall[0]).toMatchObject({
        userId: "system-admin",
        action: "kyc_approve",
        resource: "kyc_document:doc-456",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        details: expect.objectContaining({
          requestId: "test-request-id",
          targetUserId: "user-123",
          documentId: "doc-456",
          comments: "Document approved",
          documentType: "national_id",
          originalFileName: "id-card.jpg",
          processingTimeMs: expect.any(Number),
        }),
      });
    });

    it("should log validation errors with details", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          documentId: "doc-456",
          // Missing userId
        }),
        headers: {
          "User-Agent": "Test-Agent/1.0",
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "system-admin",
        action: "kyc_approve",
        resource: "kyc_document:doc-456",
        result: "failure",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        errorMessage: "Invalid user ID",
        details: {
          requestId: "test-request-id",
          validationError: "Invalid user ID",
        },
      });
    });

    it("should log document not found errors", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "non-existent-doc",
        }),
        headers: {
          "User-Agent": "Test-Agent/1.0",
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue(null);

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "system-admin",
        action: "kyc_approve",
        resource: "kyc_document:non-existent-doc",
        result: "failure",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        errorMessage: "Document not found",
        details: {
          requestId: "test-request-id",
          targetUserId: "user-123",
          documentId: "non-existent-doc",
        },
      });
    });

    it("should log critical errors when document is approved but user status update fails", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {
          "User-Agent": "Test-Agent/1.0",
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

      // Mock user profile update failure
      mockUserRepo.updateUserProfile.mockRejectedValue(
        new Error("Database connection failed")
      );

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      // Check for critical error audit log
      const criticalErrorCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call: any) =>
          call[0].action === "kyc_approve" &&
          call[0].result === "failure" &&
          call[0].details?.criticalError === true
      );

      expect(criticalErrorCall).toBeDefined();
      expect(criticalErrorCall[0].errorMessage).toContain("CRITICAL:");
      expect(criticalErrorCall[0].details.step).toBe("update_user_status");
    });
  });

  describe("KYC Rejection Audit Logging", () => {
    it("should log rejection attempt with comments length", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/reject",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Document quality is poor and needs to be resubmitted",
        }),
        headers: {
          "User-Agent": "Test-Agent/1.0",
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
        originalFileName: "id-card.jpg",
      });

      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "user-123",
        userType: "investor",
      });

      await handler(event, mockContext, jest.fn());

      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "system-admin",
        action: "kyc_reject_attempt",
        resource: "kyc_document:doc-456",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        details: {
          requestId: "test-request-id",
          targetUserId: "user-123",
          documentId: "doc-456",
          commentsLength: 54,
        },
      });
    });

    it("should log missing comments error", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/reject",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          // Missing comments
        }),
        headers: {
          "User-Agent": "Test-Agent/1.0",
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "system-admin",
        action: "kyc_reject",
        resource: "kyc_document:doc-456",
        result: "failure",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        errorMessage: "Comments are required for rejection",
        details: {
          requestId: "test-request-id",
          targetUserId: "user-123",
          documentId: "doc-456",
          missingComments: true,
        },
      });
    });

    it("should log successful rejection with comprehensive details", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/reject",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Document is blurry and unreadable",
        }),
        headers: {
          "User-Agent": "Test-Agent/1.0",
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
        originalFileName: "id-card.jpg",
      });

      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "user-123",
        userType: "entrepreneur",
      });

      await handler(event, mockContext, jest.fn());

      // Check for successful rejection audit log
      const successfulRejectionCall =
        mockAuditRepo.createAuditLog.mock.calls.find(
          (call: any) =>
            call[0].action === "kyc_reject" && call[0].result === "success"
        );

      expect(successfulRejectionCall).toBeDefined();
      expect(successfulRejectionCall[0]).toMatchObject({
        userId: "system-admin",
        action: "kyc_reject",
        resource: "kyc_document:doc-456",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        details: expect.objectContaining({
          requestId: "test-request-id",
          targetUserId: "user-123",
          documentId: "doc-456",
          comments: "Document is blurry and unreadable",
          documentType: "national_id",
          originalFileName: "id-card.jpg",
          processingTimeMs: expect.any(Number),
        }),
      });
    });
  });

  describe("Get Documents Audit Logging", () => {
    it("should log document access attempt with parameters", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "GET",
        path: "/documents",
        body: null,
        headers: {
          "User-Agent": "Test-Agent/1.0",
        },
        queryStringParameters: {
          status: "approved",
          limit: "25",
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      mockKYCRepo.getDocumentsByStatus.mockResolvedValue({
        items: [],
        count: 0,
      });

      await handler(event, mockContext, jest.fn());

      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "system-admin",
        action: "get_documents_attempt",
        resource: "kyc_documents",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        details: {
          requestId: "test-request-id",
          status: "approved",
          limit: 25,
        },
      });
    });

    it("should log successful document retrieval with count", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "GET",
        path: "/documents",
        body: null,
        headers: {
          "User-Agent": "Test-Agent/1.0",
        },
        queryStringParameters: null,
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      const mockDocuments = [
        { documentId: "doc-1", status: "pending" },
        { documentId: "doc-2", status: "pending" },
      ];

      mockKYCRepo.getPendingDocuments.mockResolvedValue({
        items: mockDocuments,
        count: 2,
      });

      await handler(event, mockContext, jest.fn());

      // Check for successful retrieval audit log
      const successfulRetrievalCall =
        mockAuditRepo.createAuditLog.mock.calls.find(
          (call: any) =>
            call[0].action === "get_documents" && call[0].result === "success"
        );

      expect(successfulRetrievalCall).toBeDefined();
      expect(successfulRetrievalCall[0]).toMatchObject({
        userId: "system-admin",
        action: "get_documents",
        resource: "kyc_documents",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        details: expect.objectContaining({
          requestId: "test-request-id",
          status: "all_pending",
          limit: 50,
          documentsReturned: 2,
          processingTimeMs: expect.any(Number),
        }),
      });
    });

    it("should log invalid limit parameter error", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "GET",
        path: "/documents",
        body: null,
        headers: {
          "User-Agent": "Test-Agent/1.0",
        },
        queryStringParameters: {
          limit: "150", // Invalid - exceeds maximum
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "system-admin",
        action: "get_documents",
        resource: "kyc_documents",
        result: "failure",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        errorMessage: "Invalid limit parameter",
        details: {
          requestId: "test-request-id",
          requestedLimit: 150,
          validRange: "1-100",
        },
      });
    });
  });

  describe("Error Handling and Audit Logging", () => {
    it("should log database errors with error classification", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {
          "User-Agent": "Test-Agent/1.0",
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      const dbError = new Error("Database connection failed");
      mockKYCRepo.getKYCDocument.mockRejectedValue(dbError);

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      // Check for database error audit log
      const dbErrorCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call: any) =>
          call[0].action === "kyc_approve" &&
          call[0].result === "failure" &&
          call[0].errorMessage?.includes("Failed to retrieve document")
      );

      expect(dbErrorCall).toBeDefined();
      expect(dbErrorCall[0].details.errorCategory).toBe("transient");
    });

    it("should log JSON parsing errors", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: "invalid-json{",
        headers: {
          "User-Agent": "Test-Agent/1.0",
        },
        requestContext: {
          requestId: "test-request-id",
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
      } as any;

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "system-admin",
        action: "kyc_approve",
        resource: "kyc_document:unknown",
        result: "failure",
        ipAddress: "192.168.1.1",
        userAgent: "Test-Agent/1.0",
        errorMessage: "Invalid JSON in request body",
        details: {
          requestId: "test-request-id",
          parseError: expect.any(String),
        },
      });
    });

    it("should continue processing even when audit logging fails", async () => {
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

      // Mock audit log failure for some calls but not all
      mockAuditRepo.createAuditLog
        .mockRejectedValueOnce(new Error("Audit log failed"))
        .mockResolvedValue({});

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

      // Should still process successfully despite audit log failures
      expect(result.statusCode).toBe(200);
    });
  });

  describe("CloudWatch Metrics", () => {
    it("should publish metrics for successful operations", async () => {
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

      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "user-123",
        userType: "entrepreneur",
      });

      await handler(event, mockContext, jest.fn());

      expect(mockCloudWatchClient.send).toHaveBeenCalled();
    });

    it("should publish error metrics for failed operations", async () => {
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

      mockKYCRepo.getKYCDocument.mockRejectedValue(new Error("Database error"));

      await handler(event, mockContext, jest.fn());

      expect(mockCloudWatchClient.send).toHaveBeenCalled();
    });

    it("should publish critical error metrics for retryable errors", async () => {
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

      // Mock error classifier to return retryable error
      const { ErrorClassifier } = require("../../../utils/error-handler");
      ErrorClassifier.classify.mockReturnValue({
        category: "transient",
        errorCode: "ThrottlingException",
        httpStatusCode: 429,
        userMessage: "Service temporarily unavailable",
        technicalMessage: "DynamoDB throttling",
        retryable: true,
      });

      mockKYCRepo.getKYCDocument.mockRejectedValue(
        new Error("Throttling error")
      );

      await handler(event, mockContext, jest.fn());

      expect(mockCloudWatchClient.send).toHaveBeenCalled();
    });
  });
});
