/**
 * API Endpoints Tests for HBAR Recharge System
 * Tests API Gateway integration, request validation, authentication, and CORS
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from "../index";
import { SecureHBARRechargeService } from "../secure-recharge-service";

// Mock the secure recharge service
jest.mock("../secure-recharge-service");
const mockRechargeService = SecureHBARRechargeService as jest.MockedClass<
  typeof SecureHBARRechargeService
>;

// Mock JWT utils
jest.mock("../../../utils/jwt-utils", () => ({
  extractUserIdFromToken: jest.fn(),
}));

// Mock structured logger
jest.mock("../../../utils/structured-logger", () => ({
  StructuredLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

import { extractUserIdFromToken } from "../../../utils/jwt-utils";
import { TokenExtractionResult } from "../../../utils/jwt-utils";

const mockExtractUserIdFromToken =
  extractUserIdFromToken as jest.MockedFunction<typeof extractUserIdFromToken>;

describe("HBAR Recharge API Endpoints", () => {
  let mockService: jest.Mocked<SecureHBARRechargeService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock service instance
    mockService = {
      initiateSecureRecharge: jest.fn(),
      getSecureTransactionStatus: jest.fn(),
      listUserTransactions: jest.fn(),
      retryTransaction: jest.fn(),
      checkAdminAccess: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    // Mock the constructor to return our mock instance
    mockRechargeService.mockImplementation(() => mockService);
  });

  describe("CORS Handling", () => {
    it("should handle OPTIONS preflight requests correctly", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "OPTIONS",
        path: "/hbar-recharge",
        headers: {},
        body: null,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
        "Access-Control-Max-Age": "86400",
      });
      expect(result.body).toBe("");
    });

    it("should include CORS headers in all responses", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "GET",
        path: "/hbar-recharge",
        headers: {},
        body: null,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.headers).toMatchObject({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
      });
    });
  });

  describe("Authentication and Authorization", () => {
    it("should return 401 for missing authentication token", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Missing Authorization header",
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {},
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_USER");
    });

    it("should return 401 for invalid authentication token", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer invalid-token",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_USER");
    });

    it("should return 403 for retry operations without admin access", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });
      mockService.checkAdminAccess.mockResolvedValue(false);

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge/txn123/retry",
        pathParameters: { transactionId: "txn123" },
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: null,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INSUFFICIENT_PRIVILEGES");
    });
  });

  describe("Request Validation", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });
    });

    it("should validate missing request body", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: null,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_REQUEST");
      expect(body.error.message).toBe("Request body is required");
    });

    it("should validate invalid JSON in request body", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: "invalid-json",
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_JSON");
    });

    it("should validate missing xafAmount", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toContain("xafAmount is required");
    });

    it("should validate minimum xafAmount", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: 500, // Below minimum
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toContain("must be at least 1000 XAF");
    });

    it("should validate maximum xafAmount", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: 2000000, // Above maximum
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toContain("cannot exceed 1,000,000 XAF");
    });

    it("should validate Hedera account ID format", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "invalid-account-id",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toContain("must be in format 0.0.XXXXXX");
    });

    it("should validate PIN format", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "12", // Too short
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toContain("must be 4-6 digits");
    });
  });

  describe("POST /hbar-recharge - Initiate Recharge", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });
    });

    it("should successfully initiate recharge request", async () => {
      const mockResponse = {
        transactionId: "txn123",
        xafAmount: 10000,
        estimatedHBARAmount: 25.5,
        conversionRate: 0.00255,
        fees: {
          orangeMoneyFee: 100,
          platformFee: 50,
          totalFees: 150,
        },
        status: "payment_initiated",
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockService.initiateSecureRecharge.mockResolvedValue(mockResponse);

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockResponse);
      expect(mockService.initiateSecureRecharge).toHaveBeenCalledWith({
        userId: "user123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
        requestId: expect.any(String),
      });
    });

    it("should handle service errors with appropriate status codes", async () => {
      const serviceError = new Error("Insufficient Orange Money balance");
      (serviceError as any).code = "INSUFFICIENT_BALANCE";
      mockService.initiateSecureRecharge.mockRejectedValue(serviceError);

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(402);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INSUFFICIENT_BALANCE");
    });
  });

  describe("GET /hbar-recharge - List Transactions", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });
    });

    it("should successfully list user transactions", async () => {
      const mockResponse = {
        success: true,
        data: {
          transactions: [
            {
              transactionId: "txn123",
              xafAmount: 10000,
              hbarAmount: 25.5,
              status: "completed",
              createdAt: "2024-01-01T00:00:00Z",
              completedAt: "2024-01-01T00:05:00Z",
            },
          ],
          pagination: {
            limit: 20,
            hasMore: false,
          },
        },
      };

      mockService.listUserTransactions.mockResolvedValue(mockResponse);

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "GET",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        queryStringParameters: {
          limit: "20",
          status: "completed",
        },
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockResponse);
      expect(mockService.listUserTransactions).toHaveBeenCalledWith("user123", {
        limit: 20,
        status: "completed",
        exclusiveStartKey: undefined,
      });
    });

    it("should cap limit at 100", async () => {
      mockService.listUserTransactions.mockResolvedValue({
        success: true,
        data: {
          transactions: [],
          pagination: { limit: 100, hasMore: false },
        },
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "GET",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        queryStringParameters: {
          limit: "500", // Above maximum
        },
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockService.listUserTransactions).toHaveBeenCalledWith("user123", {
        limit: 100, // Capped at 100
        status: undefined,
        exclusiveStartKey: undefined,
      });
    });
  });

  describe("GET /hbar-recharge/{transactionId} - Get Transaction Status", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });
    });

    it("should successfully get transaction details", async () => {
      const mockTransaction = {
        transactionId: "txn123",
        userId: "user123",
        userHederaAccountId: "0.0.123456",
        xafAmount: 10000,
        hbarAmount: 25.5,
        exchangeRate: 0.00255,
        fees: {
          orangeMoneyFee: 100,
          platformFee: 50,
          totalFees: 150,
        },
        status: "completed",
        orangeMoneyTransactionId: "om123",
        hederaTransactionId: "0.0.123456@1234567890.123456789",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:05:00Z",
        completedAt: "2024-01-01T00:05:00Z",
      };

      mockService.getSecureTransactionStatus.mockResolvedValue(mockTransaction);

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "GET",
        path: "/hbar-recharge/txn123",
        pathParameters: {
          transactionId: "txn123",
        },
        headers: {
          Authorization: "Bearer valid-token",
        },
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockTransaction);
      expect(mockService.getSecureTransactionStatus).toHaveBeenCalledWith(
        "user123",
        "txn123"
      );
    });

    it("should return 404 for non-existent transaction", async () => {
      mockService.getSecureTransactionStatus.mockResolvedValue(null);

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "GET",
        path: "/hbar-recharge/nonexistent",
        pathParameters: {
          transactionId: "nonexistent",
        },
        headers: {
          Authorization: "Bearer valid-token",
        },
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("TRANSACTION_NOT_FOUND");
    });
  });

  describe("POST /hbar-recharge/{transactionId}/retry - Retry Transaction", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "admin123",
      });
      mockService.checkAdminAccess.mockResolvedValue(true);
    });

    it("should successfully retry failed transaction", async () => {
      const mockResponse = {
        success: true,
        data: {
          transactionId: "txn123",
          status: "processing",
          retryCount: 1,
          updatedAt: "2024-01-01T01:00:00Z",
        },
      };

      mockService.retryTransaction.mockResolvedValue(mockResponse);

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge/txn123/retry",
        pathParameters: {
          transactionId: "txn123",
        },
        headers: {
          Authorization: "Bearer admin-token",
        },
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockResponse);
      expect(mockService.retryTransaction).toHaveBeenCalledWith(
        "txn123",
        "admin123"
      );
    });

    it("should validate transaction ID parameter", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge//retry",
        pathParameters: {},
        headers: {
          Authorization: "Bearer admin-token",
        },
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_REQUEST");
      expect(body.error.message).toBe("Transaction ID is required");
    });
  });

  describe("Error Handling", () => {
    it("should return 405 for unsupported HTTP methods", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "DELETE",
        path: "/hbar-recharge",
        headers: {},
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(405);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
    });

    it("should return 404 for unknown endpoints", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/unknown-endpoint",
        headers: {},
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("should handle unexpected errors gracefully", async () => {
      mockExtractUserIdFromToken.mockImplementation(() => {
        throw new Error("Unexpected JWT error");
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("Rate Limiting and Throttling", () => {
    it("should handle rate limit exceeded errors", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      (rateLimitError as any).code = "RATE_LIMIT_EXCEEDED";
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });
      mockService.initiateSecureRecharge.mockRejectedValue(rateLimitError);

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(429);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });
});
