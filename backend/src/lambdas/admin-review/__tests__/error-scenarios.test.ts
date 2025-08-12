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

// Mock utilities with retry logic
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

describe("Admin Review Lambda - Error Scenarios", () => {
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
  });

  describe("DynamoDB Error Handling", () => {
    it("should handle ProvisionedThroughputExceededException with retry", async () => {
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

      const throughputError = new Error(
        "ProvisionedThroughputExceededException"
      );
      throughputError.name = "ProvisionedThroughputExceededException";

      mockErrorClassifier.classify.mockReturnValue({
        category: "rate_limit",
        errorCode: "ProvisionedThroughputExceededException",
        httpStatusCode: 429,
        userMessage:
          "Service is temporarily busy. Please try again in a moment.",
        technicalMessage: "DynamoDB provisioned throughput exceeded",
        retryable: true,
      });

      // Mock retry logic to eventually succeed
      mockRetryExecute
        .mockRejectedValueOnce(throughputError)
        .mockRejectedValueOnce(throughputError)
        .mockResolvedValueOnce({
          documentId: "doc-456",
          userId: "user-123",
          status: "pending",
          documentType: "national_id",
        });

      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw throughputError;
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(429);
      expect(mockRetryExecute).toHaveBeenCalled();
    });

    it("should handle ConditionalCheckFailedException as permanent error", async () => {
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

      const conditionalError = new Error("ConditionalCheckFailedException");
      conditionalError.name = "ConditionalCheckFailedException";

      mockErrorClassifier.classify.mockReturnValue({
        category: "validation",
        errorCode: "ConditionalCheckFailedException",
        httpStatusCode: 400,
        userMessage: "The operation could not be completed due to a conflict.",
        technicalMessage: "DynamoDB conditional check failed",
        retryable: false,
      });

      mockRetryExecute.mockRejectedValue(conditionalError);
      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw conditionalError;
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(mockRetryExecute).toHaveBeenCalled();
    });

    it("should handle ResourceNotFoundException", async () => {
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

      const resourceError = new Error("ResourceNotFoundException");
      resourceError.name = "ResourceNotFoundException";

      mockErrorClassifier.classify.mockReturnValue({
        category: "resource_not_found",
        errorCode: "ResourceNotFoundException",
        httpStatusCode: 404,
        userMessage: "The requested resource was not found.",
        technicalMessage: "DynamoDB resource not found",
        retryable: false,
      });

      mockRetryExecute.mockRejectedValue(resourceError);
      mockKYCRepo.getPendingDocuments.mockImplementation(() => {
        throw resourceError;
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);
    });

    it("should handle ValidationException with detailed error message", async () => {
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

      const validationError = new Error("ValidationException: Invalid key");
      validationError.name = "ValidationException";

      mockErrorClassifier.classify.mockReturnValue({
        category: "validation",
        errorCode: "ValidationException",
        httpStatusCode: 400,
        userMessage:
          "Invalid input provided. Please check your data and try again.",
        technicalMessage: "DynamoDB validation error: Invalid key",
        retryable: false,
      });

      mockRetryExecute.mockRejectedValue(validationError);
      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw validationError;
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toBe(
        "Invalid input provided. Please check your data and try again."
      );
    });
  });

  describe("Network and Timeout Errors", () => {
    it("should handle network timeout errors with retry", async () => {
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

      const timeoutError = new Error("RequestTimeout");
      timeoutError.name = "RequestTimeout";

      mockErrorClassifier.classify.mockReturnValue({
        category: "transient",
        errorCode: "RequestTimeout",
        httpStatusCode: 408,
        userMessage: "Request timed out. Please try again.",
        technicalMessage: "DynamoDB request timeout",
        retryable: true,
      });

      mockRetryExecute.mockRejectedValue(timeoutError);
      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw timeoutError;
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(408);
      expect(mockRetryExecute).toHaveBeenCalled();
    });

    it("should handle connection errors", async () => {
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

      const connectionError = new Error("NetworkingError");
      connectionError.name = "NetworkingError";

      mockErrorClassifier.classify.mockReturnValue({
        category: "transient",
        errorCode: "NetworkingError",
        httpStatusCode: 503,
        userMessage:
          "Network connection error. Please check your connection and try again.",
        technicalMessage: "DynamoDB networking error",
        retryable: true,
      });

      mockRetryExecute.mockRejectedValue(connectionError);
      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw connectionError;
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(503);
    });
  });

  describe("Critical Error Scenarios", () => {
    it("should handle document approval success but user status update failure", async () => {
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

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);

      // Verify critical error audit log was created
      const criticalErrorCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call) =>
          call[0].errorMessage?.includes("CRITICAL:") &&
          call[0].details?.criticalError === true
      );

      expect(criticalErrorCall).toBeDefined();
    });

    it("should handle document rejection success but user status update failure", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/reject",
        body: JSON.stringify({
          userId: "user-123",
          documentId: "doc-456",
          comments: "Document rejected",
        }),
        headers: {},
        requestContext: {
          requestId: "test-request-id",
          identity: {},
        } as any,
      } as any;

      // Mock successful document retrieval and rejection
      mockRetryExecute
        .mockResolvedValueOnce({
          documentId: "doc-456",
          userId: "user-123",
          status: "pending",
          documentType: "national_id",
        })
        .mockResolvedValueOnce({}) // Successful document rejection
        .mockRejectedValueOnce(new Error("User status update failed")); // Failed user status update

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

      expect(result.statusCode).toBe(500);

      // Verify critical error audit log was created
      const criticalErrorCall = mockAuditRepo.createAuditLog.mock.calls.find(
        (call) =>
          call[0].errorMessage?.includes("CRITICAL:") &&
          call[0].details?.criticalError === true
      );

      expect(criticalErrorCall).toBeDefined();
    });
  });

  describe("EventBridge Error Handling", () => {
    it("should continue processing when EventBridge fails", async () => {
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

      // Mock EventBridge service failure
      const {
        createEventBridgeService,
      } = require("../../../utils/eventbridge-service");
      const mockEventBridgeService = createEventBridgeService();
      mockEventBridgeService.publishKYCStatusChangeEvent.mockRejectedValue(
        new Error("EventBridge failed")
      );
      mockEventBridgeService.publishKYCReviewCompletedEvent.mockRejectedValue(
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

  describe("CloudWatch Metrics Error Handling", () => {
    it("should continue processing when CloudWatch metrics fail", async () => {
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

      // Mock CloudWatch failure
      mockCloudWatchClient.send.mockRejectedValue(
        new Error("CloudWatch failed")
      );

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      // Should still succeed despite CloudWatch failure
      expect(result.statusCode).toBe(200);
    });
  });

  describe("Retry Logic Testing", () => {
    it("should retry transient errors up to maximum attempts", async () => {
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

      const transientError = new Error("ThrottlingException");
      transientError.name = "ThrottlingException";

      mockErrorClassifier.classify.mockReturnValue({
        category: "rate_limit",
        errorCode: "ThrottlingException",
        httpStatusCode: 429,
        userMessage: "Too many requests. Please try again in a moment.",
        technicalMessage: "DynamoDB throttling exception",
        retryable: true,
      });

      // Mock retry to fail all attempts
      mockRetryExecute.mockRejectedValue(transientError);
      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw transientError;
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(429);
      expect(mockRetryExecute).toHaveBeenCalled();
    });

    it("should not retry permanent errors", async () => {
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

      const permanentError = new Error("ValidationException");
      permanentError.name = "ValidationException";

      mockErrorClassifier.classify.mockReturnValue({
        category: "validation",
        errorCode: "ValidationException",
        httpStatusCode: 400,
        userMessage: "Invalid input provided.",
        technicalMessage: "DynamoDB validation error",
        retryable: false,
      });

      mockRetryExecute.mockRejectedValue(permanentError);
      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw permanentError;
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(mockRetryExecute).toHaveBeenCalled();
    });

    it("should succeed after retries when error is resolved", async () => {
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

      const transientError = new Error("ServiceUnavailable");
      transientError.name = "ServiceUnavailable";

      // Mock retry to succeed on second attempt
      mockRetryExecute
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce({
          documentId: "doc-456",
          userId: "user-123",
          status: "pending",
          documentType: "national_id",
        })
        .mockResolvedValueOnce({}) // Successful approval
        .mockResolvedValueOnce({}); // Successful user status update

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
      expect(mockRetryExecute).toHaveBeenCalledTimes(3);
    });
  });

  describe("Error Response Format", () => {
    it("should return consistent error response format", async () => {
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

      const error = new Error("Test error");
      mockRetryExecute.mockRejectedValue(error);
      mockKYCRepo.getKYCDocument.mockImplementation(() => {
        throw error;
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);
      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toHaveProperty("message");
      expect(responseBody).toHaveProperty("requestId", "test-request-id");
    });

    it("should include appropriate error details in response", async () => {
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
      expect(responseBody.requestId).toBe("test-request-id");
    });
  });
});
