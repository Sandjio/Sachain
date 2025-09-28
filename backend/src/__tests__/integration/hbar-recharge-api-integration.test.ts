/**
 * HBAR Recharge API Integration Tests
 * Tests complete API Gateway integration including validation, throttling, and CORS
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from "../../lambdas/hbar-recharge/index";

// Mock AWS SDK and services
jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/lib-dynamodb");
jest.mock("@aws-sdk/client-eventbridge");
jest.mock("@aws-sdk/client-secretsmanager");

// Mock structured logger
jest.mock("../../utils/structured-logger", () => ({
  StructuredLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

// Mock JWT utils
jest.mock("../../utils/jwt-utils", () => ({
  extractUserIdFromToken: jest.fn(),
}));

// Mock secure recharge service
jest.mock("../../lambdas/hbar-recharge/secure-recharge-service");

import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { SecureHBARRechargeService } from "../../lambdas/hbar-recharge/secure-recharge-service";

const mockExtractUserIdFromToken =
  extractUserIdFromToken as jest.MockedFunction<typeof extractUserIdFromToken>;
const mockRechargeService = SecureHBARRechargeService as jest.MockedClass<
  typeof SecureHBARRechargeService
>;

describe("HBAR Recharge API Integration", () => {
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

  describe("API Gateway Request Validation Integration", () => {
    it("should validate request schema as API Gateway would", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      // Test request that would pass API Gateway validation
      const validEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          httpMethod: "POST",
          path: "/hbar-recharge",
          protocol: "HTTP/1.1",
          resourcePath: "/hbar-recharge",
          accountId: "123456789012",
          apiId: "test-api-id",
          identity: {
            sourceIp: "127.0.0.1",
            userAgent: "test-agent",
          },
        } as any,
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

      const result = await handler(validEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.transactionId).toBe("txn123");
    });

    it("should handle API Gateway path parameters correctly", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });
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
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          httpMethod: "GET",
          path: "/hbar-recharge/txn123",
          protocol: "HTTP/1.1",
          resourcePath: "/hbar-recharge/{transactionId}",
          accountId: "123456789012",
          apiId: "test-api-id",
          identity: {
            sourceIp: "127.0.0.1",
            userAgent: "test-agent",
          },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockService.getSecureTransactionStatus).toHaveBeenCalledWith(
        "user123",
        "txn123"
      );
    });

    it("should handle API Gateway query parameters correctly", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });
      mockService.listUserTransactions.mockResolvedValue({
        success: true,
        data: {
          transactions: [],
          pagination: {
            limit: 10,
            hasMore: false,
          },
        },
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "GET",
        path: "/hbar-recharge",
        queryStringParameters: {
          limit: "10",
          status: "completed",
          exclusiveStartKey: "key123",
        },
        headers: {
          Authorization: "Bearer valid-token",
        },
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          httpMethod: "GET",
          path: "/hbar-recharge",
          protocol: "HTTP/1.1",
          resourcePath: "/hbar-recharge",
          accountId: "123456789012",
          apiId: "test-api-id",
          identity: {
            sourceIp: "127.0.0.1",
            userAgent: "test-agent",
          },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockService.listUserTransactions).toHaveBeenCalledWith("user123", {
        limit: 10,
        status: "completed",
        exclusiveStartKey: "key123",
      });
    });
  });

  describe("API Gateway Error Response Integration", () => {
    it("should format error responses for API Gateway", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      const serviceError = new Error("Orange Money service unavailable");
      (serviceError as any).code = "ORANGE_MONEY_FAILED";
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
      expect(result.headers).toMatchObject({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("ORANGE_MONEY_FAILED");
      expect(body.error.message).toBe("Orange Money service unavailable");
    });

    it("should handle validation errors with proper status codes", async () => {
      const validationErrors = [
        {
          body: { xafAmount: 500 }, // Too low
          expectedCode: "VALIDATION_ERROR",
          expectedMessage: "must be at least 1000 XAF",
        },
        {
          body: { xafAmount: 2000000 }, // Too high
          expectedCode: "VALIDATION_ERROR",
          expectedMessage: "cannot exceed 1,000,000 XAF",
        },
        {
          body: { xafAmount: 10000, userHederaAccountId: "invalid" }, // Invalid format
          expectedCode: "VALIDATION_ERROR",
          expectedMessage: "must be in format 0.0.XXXXXX",
        },
        {
          body: {
            xafAmount: 10000,
            userHederaAccountId: "0.0.123456",
            pin: "12",
          }, // PIN too short
          expectedCode: "VALIDATION_ERROR",
          expectedMessage: "must be 4-6 digits",
        },
      ];

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      for (const testCase of validationErrors) {
        const event: Partial<APIGatewayProxyEvent> = {
          httpMethod: "POST",
          path: "/hbar-recharge",
          headers: {
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify(testCase.body),
        };

        const result = await handler(event as APIGatewayProxyEvent);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe(testCase.expectedCode);
        expect(body.error.message).toContain(testCase.expectedMessage);
      }
    });
  });

  describe("API Gateway CORS Integration", () => {
    it("should handle preflight OPTIONS requests", async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: "OPTIONS",
        path: "/hbar-recharge",
        headers: {
          Origin: "https://app.sachain.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type,Authorization",
        },
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          httpMethod: "OPTIONS",
          path: "/hbar-recharge",
          protocol: "HTTP/1.1",
          resourcePath: "/hbar-recharge",
          accountId: "123456789012",
          apiId: "test-api-id",
          identity: {
            sourceIp: "127.0.0.1",
            userAgent: "Mozilla/5.0",
          },
        } as any,
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
      const methods = ["POST", "GET"];
      const paths = ["/hbar-recharge", "/hbar-recharge/txn123"];

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });
      mockService.initiateSecureRecharge.mockResolvedValue({
        transactionId: "txn123",
        xafAmount: 10000,
        estimatedHBARAmount: 25.5,
        conversionRate: 0.00255,
        fees: { orangeMoneyFee: 100, platformFee: 50, totalFees: 150 },
        status: "payment_initiated",
        createdAt: "2024-01-01T00:00:00Z",
      });
      mockService.getSecureTransactionStatus.mockResolvedValue({
        transactionId: "txn123",
        userId: "user123",
        userHederaAccountId: "0.0.123456",
        xafAmount: 10000,
        status: "completed",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      for (const method of methods) {
        for (const path of paths) {
          const event: Partial<APIGatewayProxyEvent> = {
            httpMethod: method,
            path: path,
            headers: {
              Authorization: "Bearer valid-token",
            },
            body:
              method === "POST"
                ? JSON.stringify({
                    xafAmount: 10000,
                    userHederaAccountId: "0.0.123456",
                    pin: "1234",
                  })
                : null,
            pathParameters: path.includes("txn123")
              ? { transactionId: "txn123" }
              : null,
          };

          const result = await handler(event as APIGatewayProxyEvent);

          expect(result.headers).toMatchObject({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
          });
        }
      }
    });
  });

  describe("API Gateway Rate Limiting Integration", () => {
    it("should handle rate limiting errors appropriately", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      const rateLimitError = new Error("Too many requests");
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
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          httpMethod: "POST",
          path: "/hbar-recharge",
          protocol: "HTTP/1.1",
          resourcePath: "/hbar-recharge",
          accountId: "123456789012",
          apiId: "test-api-id",
          identity: {
            sourceIp: "127.0.0.1",
            userAgent: "test-agent",
          },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(429);
      expect(result.headers).toMatchObject({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("API Gateway Authentication Integration", () => {
    it("should handle Cognito JWT token validation", async () => {
      // Test with valid token
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });
      mockService.initiateSecureRecharge.mockResolvedValue({
        transactionId: "txn123",
        xafAmount: 10000,
        estimatedHBARAmount: 25.5,
        conversionRate: 0.00255,
        fees: { orangeMoneyFee: 100, platformFee: 50, totalFees: 150 },
        status: "payment_initiated",
        createdAt: "2024-01-01T00:00:00Z",
      });

      const validTokenEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...", // Mock JWT
        },
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user123",
              "cognito:username": "testuser",
              email: "test@example.com",
            },
          },
        } as any,
      };

      const result = await handler(validTokenEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockExtractUserIdFromToken).toHaveBeenCalledWith(
        "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
      );
    });

    it("should handle missing authorization header", async () => {
      const noAuthEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        path: "/hbar-recharge",
        headers: {}, // No Authorization header
        body: JSON.stringify({
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      };

      const result = await handler(noAuthEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_USER");
    });
  });

  describe("End-to-End API Flow Integration", () => {
    it("should handle complete recharge flow", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      // Step 1: Initiate recharge
      mockService.initiateSecureRecharge.mockResolvedValue({
        transactionId: "txn123",
        xafAmount: 10000,
        estimatedHBARAmount: 25.5,
        conversionRate: 0.00255,
        fees: { orangeMoneyFee: 100, platformFee: 50, totalFees: 150 },
        status: "payment_initiated",
        createdAt: "2024-01-01T00:00:00Z",
      });

      const initiateEvent: Partial<APIGatewayProxyEvent> = {
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

      const initiateResult = await handler(
        initiateEvent as APIGatewayProxyEvent
      );
      expect(initiateResult.statusCode).toBe(200);

      const initiateBody = JSON.parse(initiateResult.body);
      const transactionId = initiateBody.data.transactionId;

      // Step 2: Check transaction status
      mockService.getSecureTransactionStatus.mockResolvedValue({
        transactionId: transactionId,
        userId: "user123",
        userHederaAccountId: "0.0.123456",
        xafAmount: 10000,
        hbarAmount: 25.5,
        status: "completed",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:05:00Z",
        completedAt: "2024-01-01T00:05:00Z",
      });

      const statusEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: "GET",
        path: `/hbar-recharge/${transactionId}`,
        pathParameters: {
          transactionId: transactionId,
        },
        headers: {
          Authorization: "Bearer valid-token",
        },
      };

      const statusResult = await handler(statusEvent as APIGatewayProxyEvent);
      expect(statusResult.statusCode).toBe(200);

      const statusBody = JSON.parse(statusResult.body);
      expect(statusBody.data.status).toBe("completed");
      expect(statusBody.data.hbarAmount).toBe(25.5);

      // Step 3: List user transactions
      mockService.listUserTransactions.mockResolvedValue({
        success: true,
        data: {
          transactions: [
            {
              transactionId: transactionId,
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
      });

      const listEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: "GET",
        path: "/hbar-recharge",
        headers: {
          Authorization: "Bearer valid-token",
        },
      };

      const listResult = await handler(listEvent as APIGatewayProxyEvent);
      expect(listResult.statusCode).toBe(200);

      const listBody = JSON.parse(listResult.body);
      expect(listBody.data.transactions).toHaveLength(1);
      expect(listBody.data.transactions[0].transactionId).toBe(transactionId);
    });
  });
});
