/**
 * Unit tests for HBAR Recharge Handler Lambda
 */

import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler, healthCheck } from "../index";
import { HBARRechargeService } from "../recharge-service";
import { extractUserIdFromToken } from "../../../utils/jwt-utils";

// Mock dependencies
jest.mock("../recharge-service");
jest.mock("../../../utils/jwt-utils");

const mockRechargeService = HBARRechargeService as jest.MockedClass<
  typeof HBARRechargeService
>;
const mockExtractUserIdFromToken =
  extractUserIdFromToken as jest.MockedFunction<typeof extractUserIdFromToken>;

describe("HBAR Recharge Handler", () => {
  let mockService: jest.Mocked<HBARRechargeService>;
  let mockContext: Context;

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      initiateRecharge: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    mockRechargeService.mockImplementation(() => mockService);

    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "test-function",
      functionVersion: "1",
      invokedFunctionArn:
        "arn:aws:lambda:us-east-1:123456789012:function:test-function",
      memoryLimitInMB: "128",
      awsRequestId: "test-request-id",
      logGroupName: "/aws/lambda/test-function",
      logStreamName: "test-stream",
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };
  });

  describe("Main Handler", () => {
    const createMockEvent = (
      overrides: Partial<APIGatewayProxyEvent> = {}
    ): APIGatewayProxyEvent => ({
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/recharge",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: "123456789012",
        apiId: "test-api",
        authorizer: {},
        httpMethod: "POST",
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: "127.0.0.1",
          user: null,
          userAgent: "test-agent",
          userArn: null,
        },
        path: "/recharge",
        protocol: "HTTP/1.1",
        requestId: "test-request-id",
        requestTime: "01/Jan/2023:00:00:00 +0000",
        requestTimeEpoch: 1672531200000,
        resourceId: "test-resource",
        resourcePath: "/recharge",
        stage: "test",
      },
      resource: "/recharge",
      ...overrides,
    });

    it("should return 405 for non-POST requests", async () => {
      const event = createMockEvent({ httpMethod: "GET" });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Method not allowed",
        },
      });
    });

    it("should return 401 when authentication fails", async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          userId: "user123",
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      });

      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid token",
        },
      });
    });

    it("should return 400 when request body is missing", async () => {
      const event = createMockEvent({ body: null });

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          code: "MISSING_BODY",
          message: "Request body is required",
        },
      });
    });

    it("should return 400 when request body is invalid JSON", async () => {
      const event = createMockEvent({ body: "invalid json" });

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Invalid JSON in request body",
        },
      });
    });

    it("should return 403 when user ID mismatch occurs", async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          userId: "user456",
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      });

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "User ID mismatch",
        },
      });
    });

    it("should successfully process valid recharge request", async () => {
      const requestBody = {
        userId: "user123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
      };

      const event = createMockEvent({
        body: JSON.stringify(requestBody),
      });

      const mockRechargeResult = {
        success: true,
        data: {
          transactionId: "txn_123",
          xafAmount: 10000,
          estimatedHBARAmount: 0.5,
          conversionRate: 0.00005,
          fees: {
            platformFee: 250,
            orangeMoneyFee: 150,
            totalFees: 400,
          },
          status: "payment_initiated" as const,
          orangeMoneyTransactionId: "om_456",
        },
      };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      mockService.initiateRecharge.mockResolvedValue(mockRechargeResult);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockRechargeResult.data,
      });

      expect(mockService.initiateRecharge).toHaveBeenCalledWith(requestBody);
    });

    it("should handle recharge service failures", async () => {
      const requestBody = {
        userId: "user123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
      };

      const event = createMockEvent({
        body: JSON.stringify(requestBody),
      });

      const mockRechargeResult = {
        success: false,
        error: {
          code: "INVALID_AMOUNT",
          message: "Amount is too low",
        },
      };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      mockService.initiateRecharge.mockResolvedValue(mockRechargeResult);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          code: "INVALID_AMOUNT",
          message: "Amount is too low",
        },
      });
    });

    it("should handle unexpected errors", async () => {
      const requestBody = {
        userId: "user123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
      };

      const event = createMockEvent({
        body: JSON.stringify(requestBody),
      });

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      mockService.initiateRecharge.mockRejectedValue(
        new Error("Unexpected error")
      );

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    });

    it("should include CORS headers in response", async () => {
      const event = createMockEvent({ httpMethod: "GET" });

      const result = await handler(event, mockContext);

      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      });
    });
  });

  describe("Health Check Handler", () => {
    it("should return healthy status when all checks pass", async () => {
      const mockHealthStatus = {
        database: true,
        eventBridge: true,
        exchangeRate: true,
        orangeMoney: true,
        timestamp: "2023-01-01T00:00:00.000Z",
      };

      mockService.healthCheck.mockResolvedValue(mockHealthStatus);

      const result = await healthCheck();

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe("healthy");
      expect(body.service).toBe("hbar-recharge");
      expect(body.checks).toEqual(mockHealthStatus);
    });

    it("should return unhealthy status when health check fails", async () => {
      mockService.healthCheck.mockRejectedValue(
        new Error("Service unavailable")
      );

      const result = await healthCheck();

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.status).toBe("unhealthy");
      expect(body.service).toBe("hbar-recharge");
      expect(body.error).toBe("Service unavailable");
    });
  });

  describe("Error Code Mapping", () => {
    const testCases = [
      { errorCode: "INVALID_AMOUNT", expectedStatus: 400 },
      { errorCode: "AMOUNT_TOO_LOW", expectedStatus: 400 },
      { errorCode: "AMOUNT_TOO_HIGH", expectedStatus: 400 },
      { errorCode: "INVALID_HEDERA_ACCOUNT", expectedStatus: 400 },
      { errorCode: "INVALID_USER", expectedStatus: 401 },
      { errorCode: "INSUFFICIENT_KYC", expectedStatus: 403 },
      { errorCode: "DAILY_LIMIT_EXCEEDED", expectedStatus: 403 },
      { errorCode: "ORANGE_MONEY_FAILED", expectedStatus: 402 },
      { errorCode: "INSUFFICIENT_BALANCE", expectedStatus: 402 },
      { errorCode: "INVALID_PIN", expectedStatus: 402 },
      { errorCode: "EXCHANGE_RATE_UNAVAILABLE", expectedStatus: 503 },
      { errorCode: "HEDERA_NETWORK_ERROR", expectedStatus: 503 },
      { errorCode: "DATABASE_ERROR", expectedStatus: 500 },
      { errorCode: "UNKNOWN_ERROR", expectedStatus: 500 },
    ];

    testCases.forEach(({ errorCode, expectedStatus }) => {
      it(`should map ${errorCode} to status ${expectedStatus}`, async () => {
        const requestBody = {
          userId: "user123",
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        };

        const event = createMockEvent({
          body: JSON.stringify(requestBody),
        });

        mockExtractUserIdFromToken.mockReturnValue({
          success: true,
          userId: "user123",
        });

        mockService.initiateRecharge.mockResolvedValue({
          success: false,
          error: {
            code: errorCode,
            message: `Test error for ${errorCode}`,
          },
        });

        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(expectedStatus);
      });
    });
  });

  describe("Request Validation", () => {
    it("should validate required fields in request body", async () => {
      const incompleteRequestBody = {
        userId: "user123",
        // Missing xafAmount, userHederaAccountId, pin
      };

      const event = createMockEvent({
        body: JSON.stringify(incompleteRequestBody),
      });

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user123",
      });

      mockService.initiateRecharge.mockResolvedValue({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Missing required fields",
        },
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      expect(mockService.initiateRecharge).toHaveBeenCalledWith(
        incompleteRequestBody
      );
    });
  });

  describe("Authentication Edge Cases", () => {
    it("should handle missing Authorization header", async () => {
      const event = createMockEvent({
        headers: {}, // No Authorization header
        body: JSON.stringify({
          userId: "user123",
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      });

      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Missing Authorization header",
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error.message).toBe(
        "Missing Authorization header"
      );
    });

    it("should handle malformed Authorization header", async () => {
      const event = createMockEvent({
        headers: {
          Authorization: "InvalidFormat token123",
        },
        body: JSON.stringify({
          userId: "user123",
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
        }),
      });

      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid Authorization header format",
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error.message).toBe(
        "Invalid Authorization header format"
      );
    });
  });
});
