/**
 * End-to-End Integration Tests for HBAR Recharge System
 * Tests complete flow from request initiation to HBAR transfer completion
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
  RechargeTransaction,
  PaymentSuccessEvent,
  RechargeTransactionStatus,
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

describe("HBAR Recharge E2E Integration Tests", () => {
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

    // Setup default mock responses
    setupDefaultMocks();
  });

  const setupDefaultMocks = () => {
    // DynamoDB mocks
    dynamoMock.resolves({});

    // EventBridge mocks
    eventBridgeMock.on(PutEventsCommand).resolves({
      FailedEntryCount: 0,
      Entries: [{ EventId: "test-event-id" }],
    });

    // Hedera service mocks
    mockHederaService.prototype.validateHederaAccount = jest
      .fn()
      .mockResolvedValue(true);
    mockHederaService.prototype.transferHBAR = jest.fn().mockResolvedValue({
      transactionId: "0.0.123456@1234567890.123456789",
      transactionHash: "test-hash",
      consensusTimestamp: "1234567890.123456789",
      actualCost: "0.001",
      status: "success",
    });
    mockHederaService.prototype.getAccountBalance = jest
      .fn()
      .mockResolvedValue(1000);

    // Exchange rate service mocks
    mockExchangeRateService.prototype.getCurrentRate = jest
      .fn()
      .mockResolvedValue({
        xafToHbar: 400,
        lastUpdated: new Date().toISOString(),
        source: "coingecko",
        confidence: "high",
      });
    mockExchangeRateService.prototype.calculateHBARAmount = jest
      .fn()
      .mockResolvedValue({
        xafAmount: 10000,
        hbarAmount: 24.25,
        exchangeRate: 400,
        platformFee: 250,
        orangeMoneyFee: 500,
        netHBARAmount: 24.25,
      });

    // Orange Money service mocks
    mockOrangeMoneyService.prototype.validateRechargePayment = jest
      .fn()
      .mockReturnValue({
        isValid: true,
        errors: [],
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
  };

  describe("Complete Recharge Flow", () => {
    it("should successfully complete end-to-end recharge flow", async () => {
      // Step 1: User initiates recharge request
      const rechargeRequest: HBARRechargeRequest = {
        userId: "user-123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
      };

      const rechargeEvent: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/recharge",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify(rechargeRequest),
        isBase64Encoded: false,
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
      };

      // Execute recharge handler
      const rechargeResponse = await rechargeHandler(
        rechargeEvent,
        mockContext
      );

      // Verify recharge response
      expect(rechargeResponse.statusCode).toBe(200);
      const rechargeBody = JSON.parse(rechargeResponse.body);
      expect(rechargeBody.success).toBe(true);
      expect(rechargeBody.data.transactionId).toBeDefined();
      expect(rechargeBody.data.status).toBe("payment_initiated");

      // Step 2: Simulate Orange Money payment success event
      const paymentSuccessEvent: PaymentSuccessEvent = {
        eventId: "evt-123",
        eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: new Date().toISOString(),
        transactionId: rechargeBody.data.transactionId,
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

      // Execute conversion handler
      const conversionResponse = await conversionHandler(
        conversionEvent as any,
        mockContext
      );

      // Verify conversion completed successfully
      expect(conversionResponse.statusCode).toBe(200);
      const conversionBody = JSON.parse(conversionResponse.body);
      expect(conversionBody.success).toBe(true);
      expect(conversionBody.processedEvents).toBe(1);

      // Verify Hedera transfer was called
      expect(mockHederaService.prototype.transferHBAR).toHaveBeenCalledWith({
        fromAccountId: "0.0.999999",
        toAccountId: "0.0.123456",
        amount: 24.25,
        memo: expect.stringContaining("HBAR Recharge"),
      });

      // Verify EventBridge events were published
      expect(eventBridgeMock.calls()).toHaveLength(3); // Payment success, conversion started, conversion completed
    });

    it("should handle payment failure gracefully", async () => {
      // Mock Orange Money payment failure
      mockOrangeMoneyService.prototype.initiateRechargePayment = jest
        .fn()
        .mockResolvedValue({
          success: false,
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: "Insufficient Orange Money balance",
          },
        });

      const rechargeRequest: HBARRechargeRequest = {
        userId: "user-123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
      };

      const rechargeEvent: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/recharge",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rechargeRequest),
        isBase64Encoded: false,
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
      };

      const response = await rechargeHandler(rechargeEvent, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("PAYMENT_FAILED");

      // Verify no HBAR transfer was attempted
      expect(mockHederaService.prototype.transferHBAR).not.toHaveBeenCalled();
    });

    it("should handle Hedera network failures with retry", async () => {
      // Mock Hedera transfer failure then success
      mockHederaService.prototype.transferHBAR = jest
        .fn()
        .mockRejectedValueOnce(new Error("Network timeout"))
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
      // Verify retry occurred
      expect(mockHederaService.prototype.transferHBAR).toHaveBeenCalledTimes(2);
    });
  });

  describe("Data Consistency Tests", () => {
    it("should maintain transaction state consistency across failures", async () => {
      // Mock DynamoDB operations to track state changes
      const stateChanges: RechargeTransaction[] = [];

      jest
        .spyOn(rechargeRepo, "updateTransaction")
        .mockImplementation(async (transactionId, updates) => {
          const mockTransaction: RechargeTransaction = {
            PK: `USER#user-123`,
            SK: `RECHARGE#${transactionId}`,
            transactionId,
            userId: "user-123",
            userHederaAccountId: "0.0.123456",
            xafAmount: 10000,
            orangeMoneyFee: 500,
            platformFee: 250,
            totalFees: 750,
            status: "initiated" as RechargeTransactionStatus,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            retryCount: 0,
            GSI1PK: "RECHARGE_STATUS#initiated",
            GSI1SK: new Date().toISOString(),
            ...updates,
          };
          stateChanges.push(mockTransaction);
          return mockTransaction;
        });

      // Mock Hedera failure
      mockHederaService.prototype.transferHBAR = jest
        .fn()
        .mockRejectedValue(new Error("Persistent network failure"));

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

      await conversionHandler(conversionEvent as any, mockContext);

      // Verify state transitions
      expect(stateChanges.length).toBeGreaterThan(0);

      // Should have progressed through: converting -> failed
      const statusProgression = stateChanges.map((change) => change.status);
      expect(statusProgression).toContain("converting");
      expect(statusProgression[statusProgression.length - 1]).toBe("failed");

      // Should have error information
      const finalState = stateChanges[stateChanges.length - 1];
      expect(finalState.errorMessage).toBeDefined();
      expect(finalState.retryCount).toBeGreaterThan(0);
    });

    it("should handle concurrent recharge requests without conflicts", async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => ({
        userId: `user-${i}`,
        xafAmount: 5000 + i * 1000,
        userHederaAccountId: `0.0.${123456 + i}`,
        pin: "1234",
      }));

      const rechargePromises = concurrentRequests.map(
        async (request, index) => {
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
            requestContext: { requestId: `req-${index}` } as any,
            resource: "",
          };

          return rechargeHandler(event, mockContext);
        }
      );

      const responses = await Promise.all(rechargePromises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data.transactionId).toBeDefined();
      });

      // All transaction IDs should be unique
      const transactionIds = responses.map((response) => {
        const body = JSON.parse(response.body);
        return body.data.transactionId;
      });
      const uniqueIds = new Set(transactionIds);
      expect(uniqueIds.size).toBe(transactionIds.length);
    });
  });

  describe("Event-Driven Processing Tests", () => {
    it("should process events in correct order", async () => {
      const eventOrder: string[] = [];

      // Mock EventBridge to track event publishing order
      eventBridgeMock.on(PutEventsCommand).callsFake((input) => {
        const events = input.Entries || [];
        events.forEach((event) => {
          eventOrder.push(event.DetailType || "unknown");
        });
        return Promise.resolve({
          FailedEntryCount: 0,
          Entries: events.map(() => ({ EventId: "test-event-id" })),
        });
      });

      // Execute complete flow
      const rechargeRequest: HBARRechargeRequest = {
        userId: "user-123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
      };

      const rechargeEvent: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/recharge",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rechargeRequest),
        isBase64Encoded: false,
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
      };

      const rechargeResponse = await rechargeHandler(
        rechargeEvent,
        mockContext
      );
      const rechargeBody = JSON.parse(rechargeResponse.body);

      // Simulate payment success event
      const paymentSuccessEvent: PaymentSuccessEvent = {
        eventId: "evt-123",
        eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
        source: "sachain.recharge",
        version: "1.0",
        timestamp: new Date().toISOString(),
        transactionId: rechargeBody.data.transactionId,
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

      await conversionHandler(conversionEvent as any, mockContext);

      // Verify event order
      expect(eventOrder).toEqual([
        "Orange Money Payment Success",
        "HBAR Conversion Started",
        "HBAR Conversion Completed",
        "Recharge Completed",
      ]);
    });

    it("should handle event processing failures gracefully", async () => {
      // Mock EventBridge failure
      eventBridgeMock
        .on(PutEventsCommand)
        .rejects(new Error("EventBridge unavailable"));

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

      // Should not throw error even if event publishing fails
      const response = await conversionHandler(
        conversionEvent as any,
        mockContext
      );

      // Conversion should still complete successfully
      expect(response.statusCode).toBe(200);

      // But HBAR transfer should still have occurred
      expect(mockHederaService.prototype.transferHBAR).toHaveBeenCalled();
    });
  });
});
