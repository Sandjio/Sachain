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
const mockRetryExecute = jest.fn();
jest.mock("../../../utils/retry", () => ({
  ExponentialBackoff: jest.fn().mockImplementation(() => ({
    execute: mockRetryExecute,
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

const mockErrorClassifier = {
  classify: jest.fn(),
};
jest.mock("../../../utils/error-handler", () => ({
  ErrorClassifier: mockErrorClassifier,
}));

const mockEventBridgeService = {
  publishKYCStatusChangeEvent: jest.fn(),
  publishKYCReviewCompletedEvent: jest.fn(),
};
jest.mock("../../../utils/eventbridge-service", () => ({
  createEventBridgeService: () => mockEventBridgeService,
}));

// Mock environment variables
process.env.TABLE_NAME = "test-table";
process.env.EVENT_BUS_NAME = "test-event-bus";
process.env.ENVIRONMENT = "test";
process.env.AWS_REGION = "us-east-1";

describe("Admin Review Lambda - Enhanced Audit Logging and Error Handling", () => {
  let mockContext: Context;
  let mockKYCRepo: any;
  let mockUserRepo: any;
  let mockAuditRepo: any;
  let mockCloudWatchClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRetryExecute.mockImplementation((fn) => fn());

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

    // Default error classification
    mockErrorClassifier.classify.mockReturnValue({
      category: "transient",
      errorCode: "ServiceError",
      httpStatusCode: 500,
      userMessage: "Service temporarily unavailable",
      technicalMessage: "Internal service error",
      retryable: true,
    });

    // Reset EventBridge mocks
    mockEventBridgeService.publishKYCStatusChangeEvent.mockResolvedValue({});
    mockEventBridgeService.publishKYCReviewCompletedEvent.mockResolvedValue({});
  });

  describe("Enhanced Audit Logging for Admin Operations", () => {
    it("should create comprehensive audit logs for successful approval with all details", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Document approved after thorough review",
        }),
        headers: {
          Authorization: "Bearer admin-token",
          "User-Agent": "AdminPortal/2.0",
        },
        requestContext: {
          requestId: "req-789",
          identity: {
            sourceIp: "10.0.1.100",
          },
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
        originalFileName: "passport.jpg",
        fileSize: 2048000,
        uploadedAt: "2024-01-15T10:30:00Z",
      });

      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "user-123",
        userType: "entrepreneur",
        email: "user@example.com",
      });

      await handler(event, mockContext, jest.fn());

      // Verify comprehensive audit log for successful approval
      const successAuditCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call: any) =>
          call[0].action === "kyc_approve" && call[0].result === "success"
      );

      expect(successAuditCall).toBeDefined();
      expect(successAuditCall[0]).toMatchObject({
        userId: "admin-user-placeholder",
        action: "kyc_approve",
        resource: "kyc_document:doc-456",
        result: "success",
        ipAddress: "10.0.1.100",
        userAgent: "AdminPortal/2.0",
        details: expect.objectContaining({
          requestId: "req-789",
          targetUserId: "user-123",
          documentId: "doc-456",
          comments: "Document approved after thorough review",
          documentType: "national_id",
          originalFileName: "passport.jpg",
          processingTimeMs: expect.any(Number),
        }),
      });
    });

    it("should create detailed audit logs for rejection with comments validation", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/reject",
        body: JSON.stringify({
          userId: "user-456",
          documentId: "doc-789",
          comments:
            "Document is blurry and text is not clearly visible. Please resubmit with better quality.",
        }),
        headers: {
          Authorization: "Bearer admin-token",
          "User-Agent": "AdminPortal/2.0",
        },
        requestContext: {
          requestId: "req-abc",
          identity: {
            sourceIp: "10.0.1.101",
          },
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-789",
        userId: "user-456",
        status: "pending",
        documentType: "national_id",
        originalFileName: "id-card.png",
        fileSize: 1024000,
        uploadedAt: "2024-01-15T11:00:00Z",
      });

      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "user-456",
        userType: "investor",
        email: "investor@example.com",
      });

      await handler(event, mockContext, jest.fn());

      // Verify rejection attempt audit log
      const attemptAuditCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call: any) => call[0].action === "kyc_reject_attempt"
      );

      expect(attemptAuditCall).toBeDefined();
      expect(attemptAuditCall[0]).toMatchObject({
        userId: "system-admin",
        action: "kyc_reject_attempt",
        resource: "kyc_document:doc-789",
        result: "success",
        details: expect.objectContaining({
          commentsLength: 85, // Length of the comments string
        }),
      });

      // Verify successful rejection audit log
      const successAuditCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call: any) =>
          call[0].action === "kyc_reject" && call[0].result === "success"
      );

      expect(successAuditCall).toBeDefined();
      expect(successAuditCall[0].details).toMatchObject({
        requestId: "req-abc",
        targetUserId: "user-456",
        documentId: "doc-789",
        comments:
          "Document is blurry and text is not clearly visible. Please resubmit with better quality.",
        documentType: "national_id",
        originalFileName: "id-card.png",
        processingTimeMs: expect.any(Number),
      });
    });

    it("should log detailed error information for database failures", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {
          "User-Agent": "AdminPortal/2.0",
        },
        requestContext: {
          requestId: "req-error",
          identity: {
            sourceIp: "10.0.1.102",
          },
        } as any,
      } as any;

      const dbError = new Error(
        "ProvisionedThroughputExceededException: Rate exceeded"
      );
      dbError.name = "ProvisionedThroughputExceededException";

      mockErrorClassifier.classify.mockReturnValue({
        category: "rate_limit",
        errorCode: "ProvisionedThroughputExceededException",
        httpStatusCode: 429,
        userMessage: "Service is temporarily busy. Please try again.",
        technicalMessage: "DynamoDB provisioned throughput exceeded",
        retryable: true,
      });

      mockRetryExecute.mockRejectedValue(dbError);
      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw dbError;
      });

      await handler(event, mockContext, jest.fn());

      // Verify detailed error audit log
      const errorAuditCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call: any) =>
          call[0].action === "kyc_approve" &&
          call[0].result === "failure" &&
          call[0].errorMessage?.includes("Failed to retrieve document")
      );

      expect(errorAuditCall).toBeDefined();
      expect(errorAuditCall[0]).toMatchObject({
        userId: "system-admin",
        action: "kyc_approve",
        resource: "kyc_document:doc-456",
        result: "failure",
        ipAddress: "10.0.1.102",
        userAgent: "AdminPortal/2.0",
        errorMessage:
          "Failed to retrieve document: DynamoDB provisioned throughput exceeded",
        details: expect.objectContaining({
          requestId: "req-error",
          targetUserId: "user-123",
          documentId: "doc-456",
          errorCategory: "rate_limit",
        }),
      });
    });

    it("should create audit logs for document access with query parameters", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "GET",
        path: "/documents",
        body: null,
        headers: {
          Authorization: "Bearer admin-token",
          "User-Agent": "AdminPortal/2.0",
        },
        queryStringParameters: {
          status: "pending",
          limit: "20",
        },
        requestContext: {
          requestId: "req-get-docs",
          identity: {
            sourceIp: "10.0.1.103",
          },
        } as any,
      } as any;

      const mockDocuments = [
        { documentId: "doc-1", status: "pending", userId: "user-1" },
        { documentId: "doc-2", status: "pending", userId: "user-2" },
      ];

      mockKYCRepo.getDocumentsByStatus.mockResolvedValue({
        items: mockDocuments,
        count: 2,
        lastEvaluatedKey: null,
      });

      await handler(event, mockContext, jest.fn());

      // Verify document access attempt audit log
      const attemptAuditCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call: any) => call[0].action === "get_documents_attempt"
      );

      expect(attemptAuditCall).toBeDefined();
      expect(attemptAuditCall[0]).toMatchObject({
        userId: "admin-user-placeholder",
        action: "get_documents_attempt",
        resource: "kyc_documents",
        result: "success",
        details: {
          requestId: "req-get-docs",
          status: "pending",
          limit: 20,
        },
      });

      // Verify successful retrieval audit log
      const successAuditCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call: any) =>
          call[0].action === "get_documents" && call[0].result === "success"
      );

      expect(successAuditCall).toBeDefined();
      expect(successAuditCall[0].details).toMatchObject({
        requestId: "req-get-docs",
        status: "pending",
        limit: 20,
        documentsReturned: 2,
        processingTimeMs: expect.any(Number),
      });
    });
  });

  describe("Enhanced Error Handling and CloudWatch Metrics", () => {
    it("should publish specific CloudWatch metrics for approval database errors", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {},
        requestContext: {
          requestId: "req-db-error",
          identity: {},
        } as any,
      } as any;

      const dbError = new Error("ConditionalCheckFailedException");
      dbError.name = "ConditionalCheckFailedException";

      mockErrorClassifier.classify.mockReturnValue({
        category: "validation",
        errorCode: "ConditionalCheckFailedException",
        httpStatusCode: 400,
        userMessage: "Document status has changed",
        technicalMessage: "DynamoDB conditional check failed",
        retryable: false,
      });

      mockRetryExecute.mockRejectedValue(dbError);
      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw dbError;
      });

      await handler(event, mockContext, jest.fn());

      // Verify CloudWatch metrics were published
      expect(mockCloudWatchClient.send).toHaveBeenCalled();

      // Check for specific metric calls
      const metricCalls = mockCloudWatchClient.send.mock.calls;
      const approvalDbErrorMetric = metricCalls.find((call: any) => {
        const command = call[0];
        return (
          command.input?.MetricData?.[0]?.MetricName ===
          "KYCApprovalDatabaseError"
        );
      });

      expect(approvalDbErrorMetric).toBeDefined();
    });

    it("should publish critical error metrics for data consistency issues", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {},
        requestContext: {
          requestId: "req-critical",
          identity: {},
        } as any,
      } as any;

      // Mock successful document retrieval and approval
      mockRetryExecute
        .mockResolvedValueOnce({
          documentId: "doc-456",
          userId: "user-123",
          status: "pending",
          documentType: "national_id",
        })
        .mockResolvedValueOnce({}) // Successful document approval
        .mockRejectedValueOnce(new Error("User status update failed")); // Failed user status update

      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      });

      await handler(event, mockContext, jest.fn());

      // Verify critical error metrics were published
      const metricCalls = mockCloudWatchClient.send.mock.calls;
      const criticalErrorMetric = metricCalls.find((call: any) => {
        const command = call[0];
        return (
          command.input?.MetricData?.[0]?.MetricName ===
          "KYCApprovalCriticalError"
        );
      });

      expect(criticalErrorMetric).toBeDefined();

      // Verify critical error audit log
      const criticalAuditCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call: any) =>
          call[0].errorMessage?.includes("CRITICAL:") &&
          call[0].details?.criticalError === true
      );

      expect(criticalAuditCall).toBeDefined();
      expect(criticalAuditCall[0].details.step).toBe("update_user_status");
    });

    it("should publish retryable error metrics for system issues", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/reject",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Rejected due to quality issues",
        }),
        headers: {},
        requestContext: {
          requestId: "req-retryable",
          identity: {},
        } as any,
      } as any;

      const retryableError = new Error("ThrottlingException");
      retryableError.name = "ThrottlingException";

      mockErrorClassifier.classify.mockReturnValue({
        category: "rate_limit",
        errorCode: "ThrottlingException",
        httpStatusCode: 429,
        userMessage: "Too many requests",
        technicalMessage: "DynamoDB throttling",
        retryable: true,
      });

      mockRetryExecute.mockRejectedValue(retryableError);
      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw retryableError;
      });

      await handler(event, mockContext, jest.fn());

      // Verify retryable error metrics were published
      const metricCalls = mockCloudWatchClient.send.mock.calls;
      const retryableErrorMetric = metricCalls.find((call: any) => {
        const command = call[0];
        return (
          command.input?.MetricData?.[0]?.MetricName ===
          "KYCRejectionRetryableError"
        );
      });

      expect(retryableErrorMetric).toBeDefined();
    });

    it("should handle EventBridge failures gracefully and publish metrics", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {},
        requestContext: {
          requestId: "req-eventbridge-fail",
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

      // Mock EventBridge failure
      mockEventBridgeService.publishKYCStatusChangeEvent.mockRejectedValue(
        new Error("EventBridge service unavailable")
      );
      mockEventBridgeService.publishKYCReviewCompletedEvent.mockRejectedValue(
        new Error("EventBridge service unavailable")
      );

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      // Should still succeed despite EventBridge failure
      expect(result.statusCode).toBe(200);

      // Verify EventBridge error metrics were published
      const metricCalls = mockCloudWatchClient.send.mock.calls;
      const eventBridgeErrorMetric = metricCalls.find((call: any) => {
        const command = call[0];
        return (
          command.input?.MetricData?.[0]?.MetricName ===
          "KYCApprovalEventBridgeError"
        );
      });

      expect(eventBridgeErrorMetric).toBeDefined();
    });

    it("should continue processing when CloudWatch metrics publishing fails", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {},
        requestContext: {
          requestId: "req-cloudwatch-fail",
          identity: {},
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      });

      // Mock CloudWatch failure
      mockCloudWatchClient.send.mockRejectedValue(
        new Error("CloudWatch service unavailable")
      );

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      // Should still succeed despite CloudWatch failure
      expect(result.statusCode).toBe(200);
      expect(mockCloudWatchClient.send).toHaveBeenCalled();
    });
  });

  describe("Audit Log Resilience", () => {
    it("should continue processing when audit logging fails", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
        }),
        headers: {},
        requestContext: {
          requestId: "req-audit-fail",
          identity: {},
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
      });

      // Mock audit log failures
      mockAuditRepo.createAuditLog.mockRejectedValue(
        new Error("Audit service unavailable")
      );

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      // Should still succeed despite audit log failures
      expect(result.statusCode).toBe(200);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalled();
    });

    it("should attempt audit logging multiple times during operation", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/approve",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Approved",
        }),
        headers: {
          "User-Agent": "AdminPortal/2.0",
        },
        requestContext: {
          requestId: "req-multi-audit",
          identity: {
            sourceIp: "10.0.1.104",
          },
        } as any,
      } as any;

      mockKYCRepo.getKYCDocument.mockResolvedValue({
        documentId: "doc-456",
        userId: "user-123",
        status: "pending",
        documentType: "national_id",
        originalFileName: "id.jpg",
      });

      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "user-123",
        userType: "entrepreneur",
      });

      await handler(event, mockContext, jest.fn());

      // Verify multiple audit log calls were made
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledTimes(3);

      // Verify the types of audit logs created
      const auditCalls = mockAuditRepo.createAuditLog.mock.calls;
      const actions = auditCalls.map((call: any) => call[0].action);

      expect(actions).toContain("admin_access");
      expect(actions).toContain("kyc_approve_attempt");
      expect(actions).toContain("kyc_approve");
    });
  });

  describe("Error Classification and Response", () => {
    it("should classify and handle different error types appropriately", async () => {
      const testCases = [
        {
          error: new Error("ValidationException"),
          errorName: "ValidationException",
          expectedClassification: {
            category: "validation",
            errorCode: "ValidationException",
            httpStatusCode: 400,
            userMessage: "Invalid input provided",
            technicalMessage: "DynamoDB validation error",
            retryable: false,
          },
        },
        {
          error: new Error("ResourceNotFoundException"),
          errorName: "ResourceNotFoundException",
          expectedClassification: {
            category: "resource_not_found",
            errorCode: "ResourceNotFoundException",
            httpStatusCode: 404,
            userMessage: "Resource not found",
            technicalMessage: "DynamoDB resource not found",
            retryable: false,
          },
        },
        {
          error: new Error("ServiceUnavailableException"),
          errorName: "ServiceUnavailableException",
          expectedClassification: {
            category: "transient",
            errorCode: "ServiceUnavailableException",
            httpStatusCode: 503,
            userMessage: "Service temporarily unavailable",
            technicalMessage: "DynamoDB service unavailable",
            retryable: true,
          },
        },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        testCase.error.name = testCase.errorName;

        mockErrorClassifier.classify.mockReturnValue(
          testCase.expectedClassification
        );

        mockRetryExecute.mockRejectedValue(testCase.error);
        mockKYCRepo.getKYCDocument.mockImplementation(() => {
          throw testCase.error;
        });

        const event: APIGatewayProxyEvent = {
          httpMethod: "POST",
          path: "/approve",
          body: JSON.stringify({
            userId: "user-123",
            documentId: "doc-456",
          }),
          headers: {},
          requestContext: {
            requestId: `req-${testCase.errorName}`,
            identity: {},
          } as any,
        } as any;

        const result = (await handler(
          event,
          mockContext,
          jest.fn()
        )) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(
          testCase.expectedClassification.httpStatusCode
        );

        // Verify error audit log contains classification details
        const errorAuditCall = mockAuditRepo.createAuditLog.mock.calls.find(
          (call: any) =>
            call[0].action === "kyc_approve" && call[0].result === "failure"
        );

        expect(errorAuditCall).toBeDefined();
        expect(errorAuditCall[0].details.errorCategory).toBe(
          testCase.expectedClassification.category
        );
        expect(errorAuditCall[0].details.retryable).toBe(
          testCase.expectedClassification.retryable
        );
      }
    });
  });
});
