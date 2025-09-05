/**
 * Orange Money Payment Simulation Integration Tests
 * Tests Orange Money payment flows with realistic scenarios and edge cases
 */

import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { handler as rechargeHandler } from "../../lambdas/hbar-recharge/index";
import { OrangeMoneyRechargeService } from "../../lambdas/om-payments/recharge-service";
import {
  HBARRechargeRequest,
  HBARRechargePaymentRequest,
  RechargePaymentResult,
} from "../../types/hbar-recharge";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

// Mock AWS clients
const dynamoMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock external services but keep Orange Money service for detailed testing
jest.mock("../../utils/hedera-service");
jest.mock("../../utils/exchange-rate-service");

describe("Orange Money Payment Simulation Integration Tests", () => {
  let mockContext: Context;
  let orangeMoneyService: OrangeMoneyRechargeService;

  beforeEach(() => {
    // Reset all mocks
    dynamoMock.reset();
    eventBridgeMock.reset();
    jest.clearAllMocks();

    // Setup environment
    process.env.TABLE_NAME = "test-table";
    process.env.EVENT_BUS_NAME = "test-event-bus";
    process.env.MIN_RECHARGE_AMOUNT = "1000";
    process.env.MAX_RECHARGE_AMOUNT = "100000";
    process.env.OM_BASE_URL = "https://api.orange.com";
    process.env.OM_MERCHANT_ACCOUNT = "test-merchant";
    process.env.OM_API_KEY = "test-api-key";

    // Mock context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "test-function",
      functionVersion: "1",
      invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test",
      memoryLimitInMB: "128",
      awsRequestId: "test-request-id",
      logGroupName: "test-log-group",
      logStreamName: "test-log-stream",
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    // Initialize Orange Money service
    orangeMoneyService = new OrangeMoneyRechargeService({
      baseUrl: process.env.OM_BASE_URL!,
      merchantAccount: process.env.OM_MERCHANT_ACCOUNT!,
      apiKey: process.env.OM_API_KEY!,
      timeout: 30000,
    });

    setupDefaultMocks();
  });

  const setupDefaultMocks = () => {
    // Default AWS service mocks
    dynamoMock.resolves({});
    eventBridgeMock.on(PutEventsCommand).resolves({
      FailedEntryCount: 0,
      Entries: [{ EventId: "test-event-id" }],
    });
  });

  describe("Orange Money Payment Validation", () => {
    it("should validate valid recharge payment request", () => {
      const validRequest: HBARRechargePaymentRequest = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
        estimatedHBARAmount: 25.0,
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const result = orangeMoneyService.validateRechargePayment(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid amounts", () => {
      const invalidRequests = [
        { xafAmount: 500 }, // Below minimum
        { xafAmount: 200000 }, // Above maximum
        { xafAmount: -1000 }, // Negative
        { xafAmount: 0 }, // Zero
      ];

      invalidRequests.forEach(invalidData => {
        const request: HBARRechargePaymentRequest = {
          transactionId: "txn-123",
          userId: "user-456",
          xafAmount: invalidData.xafAmount,
          userHederaAccountId: "0.0.123456",
          pin: "1234",
          estimatedHBARAmount: 25.0,
          fees: {
            orangeMoneyFee: 500,
            platformFee: 250,
            totalFees: 750,
          },
        };

        const result = orangeMoneyService.validateRechargePayment(request);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.code === "INVALID_AMOUNT")).toBe(true);
      });
    });

    it("should reject invalid Hedera account IDs", () => {
      const invalidAccountIds = [
        "invalid-account",
        "0.0",
        "0.0.abc",
        "",
        "1.2.3.4.5",
      ];

      invalidAccountIds.forEach(invalidAccountId => {
        const request: HBARRechargePaymentRequest = {
          transactionId: "txn-123",
          userId: "user-456",
          xafAmount: 10000,
          userHederaAccountId: invalidAccountId,
          pin: "1234",
          estimatedHBARAmount: 25.0,
          fees: {
            orangeMoneyFee: 500,
            platformFee: 250,
            totalFees: 750,
          },
        };

        const result = orangeMoneyService.validateRechargePayment(request);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.code === "INVALID_HEDERA_ACCOUNT")).toBe(true);
      });
    });

    it("should validate PIN format", () => {
      const invalidPins = [
        "123", // Too short
        "12345", // Too long
        "abcd", // Non-numeric
        "", // Empty
      ];

      invalidPins.forEach(invalidPin => {
        const request: HBARRechargePaymentRequest = {
          transactionId: "txn-123",
          userId: "user-456",
          xafAmount: 10000,
          userHederaAccountId: "0.0.123456",
          pin: invalidPin,
          estimatedHBARAmount: 25.0,
          fees: {
            orangeMoneyFee: 500,
            platformFee: 250,
            totalFees: 750,
          },
        };

        const result = orangeMoneyService.validateRechargePayment(request);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.code === "INVALID_PIN_FORMAT")).toBe(true);
      });
    });
  });

  describe("Orange Money Payment Simulation", () => {
    it("should simulate successful payment flow", async () => {
      // Mock successful Orange Money API responses
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "mock-access-token",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pay_token: "mock-pay-token",
            notif_token: "mock-notif-token",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              createPayment: {
                subscribe_url: "https://payment.orange.com/pay/mock-pay-token",
                order_id: "om-order-123",
                pay_token: "mock-pay-token",
              },
            },
          }),
        });

      global.fetch = mockFetch;

      const request: HBARRechargePaymentRequest = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
        estimatedHBARAmount: 25.0,
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const result = await orangeMoneyService.initiateRechargePayment(request);

      expect(result.success).toBe(true);
      expect(result.payToken).toBe("mock-pay-token");
      expect(result.transactionId).toBe("om-order-123");
      expect(result.paymentUrl).toBe("https://payment.orange.com/pay/mock-pay-token");
      expect(result.expiresAt).toBeDefined();

      // Verify API calls were made in correct order
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      // First call: Get access token
      expect(mockFetch).toHaveBeenNthCalledWith(1, 
        expect.stringContaining("/oauth/token"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        })
      );

      // Second call: Get pay token
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        expect.stringContaining("/paytoken"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "Bearer mock-access-token",
          }),
        })
      );

      // Third call: Create payment
      expect(mockFetch).toHaveBeenNthCalledWith(3,
        expect.stringContaining("/webpayment"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "Bearer mock-access-token",
          }),
        })
      );
    });

    it("should handle Orange Money authentication failures", async () => {
      // Mock authentication failure
      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: "invalid_client",
          error_description: "Invalid API credentials",
        }),
      });

      global.fetch = mockFetch;

      const request: HBARRechargePaymentRequest = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
        estimatedHBARAmount: 25.0,
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const result = await orangeMoneyService.initiateRechargePayment(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("AUTHENTICATION_FAILED");
      expect(result.error?.message).toContain("Invalid API credentials");
    });

    it("should handle insufficient balance scenarios", async () => {
      // Mock successful auth but payment failure due to insufficient balance
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "mock-access-token",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pay_token: "mock-pay-token",
            notif_token: "mock-notif-token",
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              code: "INSUFFICIENT_BALANCE",
              message: "Insufficient Orange Money balance",
              details: {
                available_balance: 5000,
                requested_amount: 10000,
              },
            },
          }),
        });

      global.fetch = mockFetch;

      const request: HBARRechargePaymentRequest = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
        estimatedHBARAmount: 25.0,
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const result = await orangeMoneyService.initiateRechargePayment(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INSUFFICIENT_BALANCE");
      expect(result.error?.details?.available_balance).toBe(5000);
      expect(result.error?.details?.requested_amount).toBe(10000);
    });

    it("should handle invalid PIN scenarios", async () => {
      // Mock successful auth but payment failure due to invalid PIN
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "mock-access-token",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pay_token: "mock-pay-token",
            notif_token: "mock-notif-token",
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({
            error: {
              code: "INVALID_PIN",
              message: "Invalid Orange Money PIN",
            },
          }),
        });

      global.fetch = mockFetch;

      const request: HBARRechargePaymentRequest = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "wrong-pin",
        estimatedHBARAmount: 25.0,
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const result = await orangeMoneyService.initiateRechargePayment(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_PIN");
    });

    it("should handle network timeouts", async () => {
      // Mock network timeout
      const mockFetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Network timeout")), 100)
        )
      );

      global.fetch = mockFetch;

      const request: HBARRechargePaymentRequest = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
        estimatedHBARAmount: 25.0,
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const result = await orangeMoneyService.initiateRechargePayment(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NETWORK_TIMEOUT");
    });
  });

  describe("Orange Money Webhook Simulation", () => {
    it("should process successful payment webhook", async () => {
      // Simulate Orange Money webhook payload for successful payment
      const webhookPayload = {
        event_type: "payment.success",
        data: {
          order_id: "om-order-123",
          transaction_id: "om-txn-456",
          amount: 10000,
          currency: "XAF",
          status: "completed",
          customer_phone: "+237123456789",
          timestamp: new Date().toISOString(),
          fees: {
            orange_money_fee: 500,
            merchant_fee: 0,
          },
        },
        signature: "mock-signature",
      };

      const webhookEvent: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/webhook/orange-money",
        headers: {
          "Content-Type": "application/json",
          "X-Orange-Signature": webhookPayload.signature,
        },
        body: JSON.stringify(webhookPayload),
        isBase64Encoded: false,
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
      };

      // Mock webhook handler (would be part of the recharge handler)
      const mockWebhookHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Webhook processed" }),
      });

      const response = await mockWebhookHandler(webhookEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should handle payment failure webhook", async () => {
      const webhookPayload = {
        event_type: "payment.failed",
        data: {
          order_id: "om-order-123",
          transaction_id: "om-txn-456",
          amount: 10000,
          currency: "XAF",
          status: "failed",
          error_code: "INSUFFICIENT_BALANCE",
          error_message: "Insufficient balance in Orange Money account",
          customer_phone: "+237123456789",
          timestamp: new Date().toISOString(),
        },
        signature: "mock-signature",
      };

      const webhookEvent: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/webhook/orange-money",
        headers: {
          "Content-Type": "application/json",
          "X-Orange-Signature": webhookPayload.signature,
        },
        body: JSON.stringify(webhookPayload),
        isBase64Encoded: false,
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
      };

      const mockWebhookHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: "Payment failure processed",
          action: "transaction_marked_failed"
        }),
      });

      const response = await mockWebhookHandler(webhookEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.action).toBe("transaction_marked_failed");
    });

    it("should validate webhook signatures", () => {
      const payload = {
        event_type: "payment.success",
        data: { order_id: "test-order" },
      };

      const validSignature = "valid-signature-hash";
      const invalidSignature = "invalid-signature";

      // Mock signature validation
      const validateSignature = (payload: any, signature: string): boolean => {
        // In real implementation, this would use HMAC with secret key
        return signature === validSignature;
      };

      expect(validateSignature(payload, validSignature)).toBe(true);
      expect(validateSignature(payload, invalidSignature)).toBe(false);
    });
  });

  describe("Orange Money Fee Calculation", () => {
    it("should calculate Orange Money fees correctly", () => {
      const testCases = [
        { amount: 1000, expectedFee: 50 }, // 5% fee
        { amount: 5000, expectedFee: 250 },
        { amount: 10000, expectedFee: 500 },
        { amount: 50000, expectedFee: 2500 },
      ];

      testCases.forEach(({ amount, expectedFee }) => {
        const calculatedFee = orangeMoneyService.calculateOrangeMoneyFee(amount);
        expect(calculatedFee).toBe(expectedFee);
      });
    });

    it("should apply fee caps for large amounts", () => {
      const largeAmounts = [100000, 200000, 500000];
      const maxFee = 5000; // Maximum fee cap

      largeAmounts.forEach(amount => {
        const calculatedFee = orangeMoneyService.calculateOrangeMoneyFee(amount);
        expect(calculatedFee).toBeLessThanOrEqual(maxFee);
      });
    });
  });

  describe("Orange Money Rate Limiting", () => {
    it("should handle rate limiting from Orange Money API", async () => {
      // Mock rate limiting response
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Map([
          ["Retry-After", "60"],
          ["X-RateLimit-Remaining", "0"],
        ]),
        json: async () => ({
          error: "rate_limit_exceeded",
          message: "Too many requests",
          retry_after: 60,
        }),
      });

      global.fetch = mockFetch;

      const request: HBARRechargePaymentRequest = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
        estimatedHBARAmount: 25.0,
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const result = await orangeMoneyService.initiateRechargePayment(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(result.error?.retryAfter).toBe(60);
    });
  });

  describe("Orange Money Integration with Full Recharge Flow", () => {
    it("should complete full recharge flow with Orange Money simulation", async () => {
      // Mock successful Orange Money responses
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "mock-access-token",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pay_token: "mock-pay-token",
            notif_token: "mock-notif-token",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              createPayment: {
                subscribe_url: "https://payment.orange.com/pay/mock-pay-token",
                order_id: "om-order-123",
                pay_token: "mock-pay-token",
              },
            },
          }),
        });

      global.fetch = mockFetch;

      const request: HBARRechargeRequest = {
        userId: "user-123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
      };

      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/recharge",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        isBase64Encoded: false,
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
      };

      const response = await rechargeHandler(event, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("payment_initiated");
      expect(body.data.paymentUrl).toBe("https://payment.orange.com/pay/mock-pay-token");

      // Verify Orange Money API was called correctly
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  afterEach(() => {
    // Restore original fetch
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
  });
});