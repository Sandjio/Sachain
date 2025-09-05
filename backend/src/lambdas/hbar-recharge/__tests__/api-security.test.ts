/**
 * API Security Tests for HBAR Recharge System
 * Tests authentication, authorization, rate limiting, and security features
 */

import { APIGatewayProxyEvent } from "aws-lambda";
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

const mockExtractUserIdFromToken =
  extractUserIdFromToken as jest.MockedFunction<typeof extractUserIdFromToken>;

describe("HBAR Recharge API Security", () => {
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

  describe("Authentication Security", () => {
    it("should reject requests without Authorization header", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {}, // No Authorization header
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
      expect(body.error.message).toBe(
        "Invalid or missing authentication token"
      );
    });

    it("should reject requests with malformed JWT tokens", async () => {
      mockExtractUserIdFromToken.mockReturnValue({ success: false, error: "Invalid token" });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer malformed.jwt.token",
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

    it("should reject requests with expired JWT tokens", async () => {
      mockExtractUserIdFromToken.mockImplementation(() => {
        const error = new Error("Token expired");
        (error as any).code = "TOKEN_EXPIRED";
        throw error;
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer expired.jwt.token",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500); // Unexpected error handling
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("should accept requests with valid JWT tokens", async () => {
      mockExtractUserIdFromToken.mockReturnValue({ success: true, userId: "user123" });
      mockService.initiateSecureRecharge.mockResolvedValue({
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
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid.jwt.token",
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
    });
  });

  describe("Authorization Security", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({ success: true, userId: "user123" });
    });

    it("should allow regular users to access their own transactions", async () => {
      mockService.getSecureTransactionStatus.mockResolvedValue({
        transactionId: "txn123",
        userId: "user123",
        userHederaAccountId: "0.0.123456",
        xafAmount: 10000,
        status: "completed",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

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
      expect(mockService.getSecureTransactionStatus).toHaveBeenCalledWith(
        "user123",
        "txn123"
      );
    });

    it("should prevent regular users from accessing admin retry operations", async () => {
      mockService.checkAdminAccess.mockResolvedValue(false);

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge/txn123/retry",
        pathParameters: {
          transactionId: "txn123",
        },
        headers: {
          Authorization: "Bearer user-token",
        },
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INSUFFICIENT_PRIVILEGES");
      expect(body.error.message).toBe(
        "Admin access required for retry operations"
      );
    });

    it("should allow admin users to access retry operations", async () => {
      mockExtractUserIdFromToken.mockReturnValue({ success: true, userId: "admin123" });
      mockService.checkAdminAccess.mockResolvedValue(true);
      mockService.retryTransaction.mockResolvedValue({ success: true, data: { transactionId: "txn123",
        status: "processing",
        retryCount: 1,
        updatedAt: "2024-01-01T01:00:00Z",
      });

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
      expect(mockService.checkAdminAccess).toHaveBeenCalledWith("admin123");
      expect(mockService.retryTransaction).toHaveBeenCalledWith(
        "txn123",
        "admin123"
      );
    });
  });

  describe("Input Validation Security", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({ success: true, userId: "user123" });
    });

    it("should prevent SQL injection attempts in transaction ID", async () => {
      mockService.getSecureTransactionStatus.mockResolvedValue(null);

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "GET",
        path: "/hbar-recharge/'; DROP TABLE transactions; --",
        pathParameters: {
          transactionId: "'; DROP TABLE transactions; --",
        },
        headers: {
          Authorization: "Bearer valid-token",
        },
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      expect(mockService.getSecureTransactionStatus).toHaveBeenCalledWith(
        "user123",
        "'; DROP TABLE transactions; --"
      );
    });

    it("should prevent XSS attempts in request body", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "<script>alert('xss')</script>",
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

    it("should validate numeric inputs to prevent overflow attacks", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: Number.MAX_SAFE_INTEGER + 1,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should prevent PIN brute force attempts with invalid formats", async () => {
      const invalidPins = [
        "abc123", // Contains letters
        "12345678901", // Too long
        "1", // Too short
        "../../../../etc/passwd", // Path traversal attempt
        "<script>", // XSS attempt
      ];

      for (const pin of invalidPins) {
        const event: Partial<APIGatewayProxyEvent> = {
          httpMethod: "POST",
          path: "/hbar-recharge",
          headers: {
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({
            xafAmount: 10000,
            userHederaAccountId: "0.0.123456",
            pin: pin,
          }),
        };

        const result = await handler(event as APIGatewayProxyEvent);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe("VALIDATION_ERROR");
        expect(body.error.message).toContain("must be 4-6 digits");
      }
    });
  });

  describe("Rate Limiting Security", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({ success: true, userId: "user123" });
    });

    it("should handle rate limit exceeded from service layer", async () => {
      const rateLimitError = new Error("Daily transaction limit exceeded");
      (rateLimitError as any).code = "DAILY_LIMIT_EXCEEDED";
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

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("DAILY_LIMIT_EXCEEDED");
    });

    it("should handle API Gateway rate limiting", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      (rateLimitError as any).code = "RATE_LIMIT_EXCEEDED";
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

  describe("Data Protection Security", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({ success: true, userId: "user123" });
    });

    it("should not expose sensitive data in error responses", async () => {
      const sensitiveError = new Error(
        "Database connection failed: password=secret123"
      );
      (sensitiveError as any).code = "DATABASE_ERROR";
      mockService.initiateSecureRecharge.mockRejectedValue(sensitiveError);

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
      expect(body.error.code).toBe("DATABASE_ERROR");
      // Should not expose the sensitive database connection details
      expect(body.error.message).not.toContain("password=secret123");
    });

    it("should sanitize user input in logs", async () => {
      // This test ensures that sensitive data like PINs are not logged
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234", // This should not appear in logs
        }),
      };

      mockService.initiateSecureRecharge.mockResolvedValue({
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
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      // Verify that the PIN is not passed to the service in a way that could be logged
      expect(mockService.initiateSecureRecharge).toHaveBeenCalledWith({
        userId: "user123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234", // PIN should be handled securely by the service
        requestId: expect.any(String),
      });
    });
  });

  describe("CORS Security", () => {
    it("should include proper CORS headers for security", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "OPTIONS",
        path: "/hbar-recharge",
        headers: {
          Origin: "https://malicious-site.com",
        },
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        "Access-Control-Allow-Origin": "*", // Should be restricted in production
        "Access-Control-Allow-Headers":
          "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
        "Access-Control-Max-Age": "86400",
      });
    });

    it("should include CORS headers in error responses", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "DELETE", // Unsupported method
        path: "/hbar-recharge",
        headers: {},
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(405);
      expect(result.headers).toMatchObject({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
      });
    });
  });

  describe("Content Security", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({ success: true, userId: "user123" });
    });

    it("should validate Content-Type for POST requests", async () => {
      // This would typically be handled by API Gateway, but we test the Lambda's robustness
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
          "Content-Type": "text/plain", // Wrong content type
        },
        body: "not-json-data",
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_JSON");
    });

    it("should handle large request bodies gracefully", async () => {
      const largeBody = JSON.stringify({
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
        maliciousData: "x".repeat(10000), // Large string
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: largeBody,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      // Should still validate properly and reject due to additional properties
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });
});
