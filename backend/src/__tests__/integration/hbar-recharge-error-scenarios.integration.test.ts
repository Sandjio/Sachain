/**
 * Error Scenario Integration Tests for HBAR Recharge System
 * Tests various failure modes, recovery mechanisms, and error handling
 */

import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { handler as rechargeHandler } from "../../lambdas/hbar-recharge/index";
import { handler as conversionHandler } from "../../lambdas/hbar-conversion/index";
import { RechargeRepository } from "../../repositories/recharge-repository";
import { HederaService } from "../../utils/hedera-service";
import { ExchangeRateService } from "../../utils/exchange-rate-service";
import { OrangeMoneyRechargeService } from "../../lambdas/om-payments/recharge-service";
import {
  HBARRechargeRequest,
  PaymentSuccessEvent,
  RECHARGE_ERROR_CODES,
} from "../../types/hbar-recharge";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

// Mock AWS clients
const dynamoMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock external services
jest.mock("../../utils/hedera-service");
jest.mock("../../utils/exchange-rate-service");
jest.mock("../../lambdas/om-payments/recharge-service");

const mockHederaService = HederaService as jest.MockedClass<
  typeof HederaService
>;
const mockExchangeRateService = ExchangeRateService as jest.MockedClass<
  typeof ExchangeRateService
>;
const mockOrangeMoneyService = OrangeMoneyRechargeService as jest.MockedClass<
  typeof OrangeMoneyRechargeService
>;

describe("HBAR Recharge Error Scenarios Integration Tests", () => {
  let mockContext: Context;
  let rechargeRepo: RechargeRepository;

  beforeEach(() => {
    // Reset all mocks
    dynamoMock.reset();
    eventBridgeMock.reset();
    jest.clearAllMocks();

    // Setup environment
    process.env.TABLE_NAME = "test-table";
    process.env.EVENT_BUS_NAME = "test-event-bus";
    process.env.HEDERA_TREASURY_ACCOUNT_ID = "0.0.999999";
    process.env.MIN_RECHARGE_AMOUNT = "1000";
    process.env.MAX_RECHARGE_AMOUNT = "100000";

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

    // Setup repository
    rechargeRepo = new RechargeRepository({
      tableName: "test-table",
      region: "us-east-1",
    });

    setupDefaultMocks();
  });

  const setupDefaultMocks = () => {
    // Default successful mocks
    dynamoMock.resolves({});
    eventBridgeMock.on(PutEventsCommand).resolves({
      FailedEntryCount: 0,
      Entries: [{ EventId: "test-event-id" }],
    });

    mockHederaService.prototype.validateHederaAccount = jest
      .fn()
      .mockResolvedValue(true);
    mockHederaService.prototype.getAccountBalance = jest
      .fn()
      .mockResolvedValue(1000);
    mockExchangeRateService.prototype.getCurrentRate = jest
      .fn()
      .mockResolvedValue({
        xafToHbar: 400,
        lastUpdated: new Date().toISOString(),
        source: "coingecko",
        confidence: "high",
      });
    mockOrangeMoneyService.prototype.validateRechargePayment = jest
      .fn()
      .mockReturnValue({
        isValid: true,
        errors: [],
      });
  };

  describe("Orange Money Payment Failures", () => {
    it("should handle insufficient balance error", async () => {
      // Mock Orange Money insufficient balance
      mockOrangeMoneyService.prototype.initiateRechargePayment = jest
        .fn()
        .mockResolvedValue({
          success: false,
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: "Insufficient Orange Money balance",
            details: {
              availableBalance: 5000,
              requestedAmount: 10000,
            },
          },
        });

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

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(RECHARGE_ERROR_CODES.PAYMENT_FAILED);
      expect(body.error.details.originalError.code).toBe(
        "INSUFFICIENT_BALANCE"
      );
    });

    it("should handle invalid PIN error", async () => {
      mockOrangeMoneyService.prototype.initiateRechargePayment = jest
        .fn()
        .mockResolvedValue({
          success: false,
          error: {
            code: "INVALID_PIN",
            message: "Invalid Orange Money PIN",
          },
        });

      const request: HBARRechargeRequest = {
        userId: "user-123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "wrong-pin",
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

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(RECHARGE_ERROR_CODES.AUTHENTICATION_FAILED);
    });

    it("should handle Orange Money service timeout", async () => {
      mockOrangeMoneyService.prototype.initiateRechargePayment = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Request timeout")), 100)
            )
        );

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

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(RECHARGE_ERROR_CODES.SERVICE_UNAVAILABLE);
    });
  });

  describe("Hedera Network Failures", () => {
    it("should retry on transient Hedera network errors", async () => {
      // Mock successful Orange Money payment
      mockOrangeMoneyService.prototype.initiateRechargePayment = jest
        .fn()
        .mockResolvedValue({
          success: true,
          payToken: "test-pay-token",
          transactionId: "om-txn-123",
          paymentUrl: "https://payment.orange.com/pay/test",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        });

      // Mock Hedera transfer failure then success
      mockHederaService.prototype.transferHBAR = jest
        .fn()
        .mockRejectedValueOnce(new Error("NETWORK_BUSY"))
        .mockRejectedValueOnce(new Error("TIMEOUT"))
        .mockResolvedValueOnce({
          transactionId: "0.0.123456@1234567890.123456789",
          transactionHash: "test-hash",
          consensusTimestamp: "1234567890.123456789",
          actualCost: "0.001",
          status: "success",
        });

      const paymentSuccessEvent: PaymentSuccessEvent = {
        eventId: "evt-123",
        eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: new Date().toISOString(),
        transactionId: "txn-123",
        userId: "user-123",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-txn-123",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const conversionEvent = {
        Records: [
          {
            eventVersion: "1.0",
            eventSource: "aws:events",
            eventName: "Scheduled Event",
            awsRegion: "us-east-1",
            eventTime: new Date().toISOString(),
            eventBridge: {
              source: "sachain.recharge",
              "detail-type": "Orange Money Payment Success",
              detail: paymentSuccessEvent,
            },
          },
        ],
      };

      const response = await conversionHandler(
        conversionEvent as any,
        mockContext
      );

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify retry occurred (3 attempts total)
      expect(mockHederaService.prototype.transferHBAR).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries on persistent Hedera errors", async () => {
      // Mock persistent Hedera failure
      mockHederaService.prototype.transferHBAR = jest
        .fn()
        .mockRejectedValue(new Error("PERSISTENT_NETWORK_ERROR"));

      const paymentSuccessEvent: PaymentSuccessEvent = {
        eventId: "evt-123",
        eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: new Date().toISOString(),
        transactionId: "txn-123",
        userId: "user-123",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-txn-123",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const conversionEvent = {
        Records: [
          {
            eventVersion: "1.0",
            eventSource: "aws:events",
            eventName: "Scheduled Event",
            awsRegion: "us-east-1",
            eventTime: new Date().toISOString(),
            eventBridge: {
              source: "sachain.recharge",
              "detail-type": "Orange Money Payment Success",
              detail: paymentSuccessEvent,
            },
          },
        ],
      };

      const response = await conversionHandler(
        conversionEvent as any,
        mockContext
      );

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(RECHARGE_ERROR_CODES.CONVERSION_FAILED);

      // Verify max retries were attempted
      expect(mockHederaService.prototype.transferHBAR).toHaveBeenCalledTimes(5); // Max retries
    });

    it("should handle insufficient treasury balance", async () => {
      // Mock low treasury balance
      mockHederaService.prototype.getAccountBalance = jest
        .fn()
        .mockResolvedValue(1); // Very low balance
      mockHederaService.prototype.transferHBAR = jest
        .fn()
        .mockRejectedValue(new Error("INSUFFICIENT_ACCOUNT_BALANCE"));

      const paymentSuccessEvent: PaymentSuccessEvent = {
        eventId: "evt-123",
        eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: new Date().toISOString(),
        transactionId: "txn-123",
        userId: "user-123",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-txn-123",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const conversionEvent = {
        Records: [
          {
            eventVersion: "1.0",
            eventSource: "aws:events",
            eventName: "Scheduled Event",
            awsRegion: "us-east-1",
            eventTime: new Date().toISOString(),
            eventBridge: {
              source: "sachain.recharge",
              "detail-type": "Orange Money Payment Success",
              detail: paymentSuccessEvent,
            },
          },
        ],
      };

      const response = await conversionHandler(
        conversionEvent as any,
        mockContext
      );

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(
        RECHARGE_ERROR_CODES.INSUFFICIENT_TREASURY_BALANCE
      );
    });
  });

  describe("Exchange Rate Service Failures", () => {
    it("should use fallback rate when primary source fails", async () => {
      // Mock primary exchange rate failure, fallback success
      mockExchangeRateService.prototype.getCurrentRate = jest
        .fn()
        .mockRejectedValueOnce(new Error("Primary source unavailable"))
        .mockResolvedValueOnce({
          xafToHbar: 380, // Slightly different fallback rate
          lastUpdated: new Date().toISOString(),
          source: "fallback",
          confidence: "medium",
        });

      mockExchangeRateService.prototype.calculateHBARAmount = jest
        .fn()
        .mockResolvedValue({
          xafAmount: 10000,
          hbarAmount: 25.5, // Different amount due to fallback rate
          exchangeRate: 380,
          platformFee: 250,
          orangeMoneyFee: 500,
          netHBARAmount: 25.5,
        });

      mockHederaService.prototype.transferHBAR = jest.fn().mockResolvedValue({
        transactionId: "0.0.123456@1234567890.123456789",
        transactionHash: "test-hash",
        consensusTimestamp: "1234567890.123456789",
        actualCost: "0.001",
        status: "success",
      });

      const paymentSuccessEvent: PaymentSuccessEvent = {
        eventId: "evt-123",
        eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: new Date().toISOString(),
        transactionId: "txn-123",
        userId: "user-123",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-txn-123",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const conversionEvent = {
        Records: [
          {
            eventVersion: "1.0",
            eventSource: "aws:events",
            eventName: "Scheduled Event",
            awsRegion: "us-east-1",
            eventTime: new Date().toISOString(),
            eventBridge: {
              source: "sachain.recharge",
              "detail-type": "Orange Money Payment Success",
              detail: paymentSuccessEvent,
            },
          },
        ],
      };

      const response = await conversionHandler(
        conversionEvent as any,
        mockContext
      );

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify fallback rate was used
      expect(mockHederaService.prototype.transferHBAR).toHaveBeenCalledWith({
        fromAccountId: "0.0.999999",
        toAccountId: "0.0.123456",
        amount: 25.5, // Fallback rate amount
        memo: expect.stringContaining("HBAR Recharge"),
      });
    });

    it("should fail when all exchange rate sources are unavailable", async () => {
      // Mock all exchange rate sources failing
      mockExchangeRateService.prototype.getCurrentRate = jest
        .fn()
        .mockRejectedValue(new Error("All exchange rate sources unavailable"));

      const paymentSuccessEvent: PaymentSuccessEvent = {
        eventId: "evt-123",
        eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: new Date().toISOString(),
        transactionId: "txn-123",
        userId: "user-123",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-txn-123",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const conversionEvent = {
        Records: [
          {
            eventVersion: "1.0",
            eventSource: "aws:events",
            eventName: "Scheduled Event",
            awsRegion: "us-east-1",
            eventTime: new Date().toISOString(),
            eventBridge: {
              source: "sachain.recharge",
              "detail-type": "Orange Money Payment Success",
              detail: paymentSuccessEvent,
            },
          },
        ],
      };

      const response = await conversionHandler(
        conversionEvent as any,
        mockContext
      );

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(
        RECHARGE_ERROR_CODES.EXCHANGE_RATE_UNAVAILABLE
      );

      // Verify no HBAR transfer was attempted
      expect(mockHederaService.prototype.transferHBAR).not.toHaveBeenCalled();
    });
  });

  describe("Database Failures", () => {
    it("should handle DynamoDB connection failures", async () => {
      // Mock DynamoDB failure
      dynamoMock.rejects(new Error("DynamoDB connection failed"));

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

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(RECHARGE_ERROR_CODES.DATABASE_ERROR);
    });

    it("should handle partial DynamoDB failures during transaction updates", async () => {
      // Mock DynamoDB to succeed initially but fail on updates
      let callCount = 0;
      dynamoMock.callsFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({}); // First call succeeds (create transaction)
        } else {
          return Promise.reject(new Error("DynamoDB update failed")); // Subsequent calls fail
        }
      });

      mockOrangeMoneyService.prototype.initiateRechargePayment = jest
        .fn()
        .mockResolvedValue({
          success: true,
          payToken: "test-pay-token",
          transactionId: "om-txn-123",
          paymentUrl: "https://payment.orange.com/pay/test",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        });

      const paymentSuccessEvent: PaymentSuccessEvent = {
        eventId: "evt-123",
        eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: new Date().toISOString(),
        transactionId: "txn-123",
        userId: "user-123",
        xafAmount: 10000,
        orangeMoneyTransactionId: "om-txn-123",
        userHederaAccountId: "0.0.123456",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 250,
          totalFees: 750,
        },
      };

      const conversionEvent = {
        Records: [
          {
            eventVersion: "1.0",
            eventSource: "aws:events",
            eventName: "Scheduled Event",
            awsRegion: "us-east-1",
            eventTime: new Date().toISOString(),
            eventBridge: {
              source: "sachain.recharge",
              "detail-type": "Orange Money Payment Success",
              detail: paymentSuccessEvent,
            },
          },
        ],
      };

      const response = await conversionHandler(
        conversionEvent as any,
        mockContext
      );

      // Should still attempt to complete the conversion despite DB update failures
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(RECHARGE_ERROR_CODES.DATABASE_ERROR);
    });
  });

  describe("EventBridge Failures", () => {
    it("should handle EventBridge publishing failures gracefully", async () => {
      // Mock EventBridge failure
      eventBridgeMock
        .on(PutEventsCommand)
        .rejects(new Error("EventBridge unavailable"));

      mockOrangeMoneyService.prototype.initiateRechargePayment = jest
        .fn()
        .mockResolvedValue({
          success: true,
          payToken: "test-pay-token",
          transactionId: "om-txn-123",
          paymentUrl: "https://payment.orange.com/pay/test",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        });

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

      // Should still succeed even if event publishing fails
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("payment_initiated");
    });
  });

  describe("Validation Failures", () => {
    it("should handle invalid Hedera account ID", async () => {
      mockHederaService.prototype.validateHederaAccount = jest
        .fn()
        .mockResolvedValue(false);

      const request: HBARRechargeRequest = {
        userId: "user-123",
        xafAmount: 10000,
        userHederaAccountId: "invalid-account",
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

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT);
    });

    it("should handle amount validation failures", async () => {
      const invalidRequests = [
        { xafAmount: 500 }, // Below minimum
        { xafAmount: 200000 }, // Above maximum
        { xafAmount: -1000 }, // Negative amount
        { xafAmount: 0 }, // Zero amount
      ];

      for (const invalidAmount of invalidRequests) {
        const request: HBARRechargeRequest = {
          userId: "user-123",
          xafAmount: invalidAmount.xafAmount,
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

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe(RECHARGE_ERROR_CODES.INVALID_AMOUNT);
      }
    });
  });

  describe("Recovery Mechanisms", () => {
    it("should recover from temporary service outages", async () => {
      let attemptCount = 0;

      // Mock service to fail first few times then succeed
      mockOrangeMoneyService.prototype.initiateRechargePayment = jest
        .fn()
        .mockImplementation(async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error("Service temporarily unavailable");
          }
          return {
            success: true,
            payToken: "test-pay-token",
            transactionId: "om-txn-123",
            paymentUrl: "https://payment.orange.com/pay/test",
            expiresAt: new Date(Date.now() + 300000).toISOString(),
          };
        });

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
      expect(attemptCount).toBe(3); // Should have retried and succeeded
    });

    it("should handle circuit breaker pattern for persistent failures", async () => {
      // Mock persistent failures
      mockHederaService.prototype.transferHBAR = jest
        .fn()
        .mockRejectedValue(new Error("Persistent service failure"));

      const events = Array.from({ length: 10 }, (_, i) => {
        const paymentSuccessEvent: PaymentSuccessEvent = {
          eventId: `evt-${i}`,
          eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
          source: "sachain.recharge",
          version: "1.0",
          timestamp: new Date().toISOString(),
          transactionId: `txn-${i}`,
          userId: `user-${i}`,
          xafAmount: 10000,
          orangeMoneyTransactionId: `om-txn-${i}`,
          userHederaAccountId: `0.0.${123456 + i}`,
          fees: {
            orangeMoneyFee: 500,
            platformFee: 250,
            totalFees: 750,
          },
        };

        return {
          Records: [
            {
              eventVersion: "1.0",
              eventSource: "aws:events",
              eventName: "Scheduled Event",
              awsRegion: "us-east-1",
              eventTime: new Date().toISOString(),
              eventBridge: {
                source: "sachain.recharge",
                "detail-type": "Orange Money Payment Success",
                detail: paymentSuccessEvent,
              },
            },
          ],
        };
      });

      const responses = await Promise.all(
        events.map((event) => conversionHandler(event as any, mockContext))
      );

      // All should fail but gracefully
      responses.forEach((response) => {
        expect(response.statusCode).toBe(500);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
      });

      // Should have attempted retries for each event
      expect(mockHederaService.prototype.transferHBAR).toHaveBeenCalledTimes(
        50
      ); // 10 events * 5 retries each
    });
  });
});
