/**
 * Performance Integration Tests for HBAR Recharge System
 * Tests concurrent processing, high-volume scenarios, and performance benchmarks
 */

import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { handler as rechargeHandler } from "../../lambdas/hbar-recharge/index";
import { handler as conversionHandler } from "../../lambdas/hbar-conversion/index";
import { HederaService } from "../../utils/hedera-service";
import { ExchangeRateService } from "../../utils/exchange-rate-service";
import { OrangeMoneyRechargeService } from "../../lambdas/om-payments/recharge-service";
import {
  HBARRechargeRequest,
  PaymentSuccessEvent,
} from "../../types/hbar-recharge";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { measurePerformance, executeBatch } from "../e2e/test-setup";

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

describe("HBAR Recharge Performance Integration Tests", () => {
  let mockContext: Context;

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

    setupPerformanceMocks();
  });

  const setupPerformanceMocks = () => {
    // Fast DynamoDB responses
    dynamoMock.resolves({});

    // Fast EventBridge responses
    eventBridgeMock.on(PutEventsCommand).resolves({
      FailedEntryCount: 0,
      Entries: [{ EventId: "test-event-id" }],
    });

    // Fast Hedera service responses
    mockHederaService.prototype.validateHederaAccount = jest
      .fn()
      .mockResolvedValue(true);
    mockHederaService.prototype.transferHBAR = jest
      .fn()
      .mockImplementation(async () => {
        // Simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          transactionId: `0.0.123456@${Date.now()}.123456789`,
          transactionHash: "test-hash",
          consensusTimestamp: `${Date.now()}.123456789`,
          actualCost: "0.001",
          status: "success",
        };
      });
    mockHederaService.prototype.getAccountBalance = jest
      .fn()
      .mockResolvedValue(10000);

    // Fast exchange rate responses
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

    // Fast Orange Money responses
    mockOrangeMoneyService.prototype.validateRechargePayment = jest
      .fn()
      .mockReturnValue({
        isValid: true,
        errors: [],
      });
    mockOrangeMoneyService.prototype.initiateRechargePayment = jest
      .fn()
      .mockImplementation(async () => {
        // Simulate Orange Money API latency
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          success: true,
          payToken: `pay-token-${Date.now()}`,
          transactionId: `om-txn-${Date.now()}`,
          paymentUrl: "https://payment.orange.com/pay/test",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        };
      });
  };

  describe("Concurrent Request Processing", () => {
    it("should handle 10 concurrent recharge requests efficiently", async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        xafAmount: 5000 + i * 1000,
        userHederaAccountId: `0.0.${123456 + i}`,
        pin: "1234",
      }));

      const {
        result: responses,
        duration,
        memoryUsage,
      } = await measurePerformance(async () => {
        const promises = concurrentRequests.map(async (request, index) => {
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
        });

        return Promise.all(promises);
      }, "10 Concurrent Recharge Requests");

      // Performance assertions
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB

      // Functional assertions
      expect(responses).toHaveLength(10);
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
      });

      // Verify all Orange Money calls were made
      expect(
        mockOrangeMoneyService.prototype.initiateRechargePayment
      ).toHaveBeenCalledTimes(10);
    });

    it("should handle 50 concurrent conversion events efficiently", async () => {
      const conversionEvents = Array.from({ length: 50 }, (_, i) => {
        const paymentSuccessEvent: PaymentSuccessEvent = {
          eventId: `evt-${i}`,
          eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
          source: "sachain.recharge",
          version: "1.0",
          timestamp: new Date().toISOString(),
          transactionId: `txn-${i}`,
          userId: `user-${i}`,
          xafAmount: 5000 + i * 100,
          orangeMoneyTransactionId: `om-txn-${i}`,
          userHederaAccountId: `0.0.${123456 + i}`,
          fees: {
            orangeMoneyFee: 250 + i * 5,
            platformFee: 125 + i * 2,
            totalFees: 375 + i * 7,
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

      const {
        result: responses,
        duration,
        memoryUsage,
      } = await measurePerformance(async () => {
        const promises = conversionEvents.map((event) =>
          conversionHandler(event as any, mockContext)
        );
        return Promise.all(promises);
      }, "50 Concurrent Conversion Events");

      // Performance assertions
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB

      // Functional assertions
      expect(responses).toHaveLength(50);
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
      });

      // Verify all Hedera transfers were made
      expect(mockHederaService.prototype.transferHBAR).toHaveBeenCalledTimes(
        50
      );
    });
  });

  describe("High-Volume Processing", () => {
    it("should process 100 recharge requests in batches efficiently", async () => {
      const batchSize = 10;
      const totalRequests = 100;

      const requests = Array.from({ length: totalRequests }, (_, i) => ({
        userId: `user-${i}`,
        xafAmount: 5000,
        userHederaAccountId: `0.0.${123456 + i}`,
        pin: "1234",
      }));

      const operations = requests.map((request) => async () => {
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
          requestContext: { requestId: `req-${Math.random()}` } as any,
          resource: "",
        };

        return rechargeHandler(event, mockContext);
      });

      const { result: responses, duration } = await measurePerformance(
        () => executeBatch(operations, batchSize, 50), // 50ms delay between batches
        `${totalRequests} Recharge Requests in Batches of ${batchSize}`
      );

      // Performance assertions
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(responses).toHaveLength(totalRequests);

      // Verify success rate
      const successfulResponses = responses.filter(
        (response) => response.statusCode === 200
      );
      const successRate = (successfulResponses.length / totalRequests) * 100;
      expect(successRate).toBeGreaterThan(95); // At least 95% success rate

      console.log(`Batch processing stats:
        - Total requests: ${totalRequests}
        - Batch size: ${batchSize}
        - Success rate: ${successRate.toFixed(2)}%
        - Average time per request: ${(duration / totalRequests).toFixed(2)}ms
        - Requests per second: ${(totalRequests / (duration / 1000)).toFixed(
          2
        )}`);
    });

    it("should maintain performance under sustained load", async () => {
      const sustainedLoadDuration = 5000; // 5 seconds
      const requestInterval = 100; // New request every 100ms
      const responses: any[] = [];
      const startTime = Date.now();

      const sustainedLoadPromise = new Promise<void>((resolve) => {
        const interval = setInterval(async () => {
          if (Date.now() - startTime >= sustainedLoadDuration) {
            clearInterval(interval);
            resolve();
            return;
          }

          const request: HBARRechargeRequest = {
            userId: `user-${Date.now()}`,
            xafAmount: 5000,
            userHederaAccountId: `0.0.${
              123456 + Math.floor(Math.random() * 1000)
            }`,
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
            requestContext: { requestId: `req-${Date.now()}` } as any,
            resource: "",
          };

          try {
            const response = await rechargeHandler(event, mockContext);
            responses.push(response);
          } catch (error) {
            responses.push({ statusCode: 500, error });
          }
        }, requestInterval);
      });

      const { duration } = await measurePerformance(
        () => sustainedLoadPromise,
        "Sustained Load Test"
      );

      // Performance assertions
      expect(responses.length).toBeGreaterThan(40); // Should process at least 40 requests in 5 seconds

      const successfulResponses = responses.filter(
        (response) => response.statusCode === 200
      );
      const successRate = (successfulResponses.length / responses.length) * 100;
      expect(successRate).toBeGreaterThan(90); // At least 90% success rate under load

      console.log(`Sustained load stats:
        - Duration: ${duration}ms
        - Total requests: ${responses.length}
        - Success rate: ${successRate.toFixed(2)}%
        - Requests per second: ${(responses.length / (duration / 1000)).toFixed(
          2
        )}`);
    });
  });

  describe("Memory and Resource Usage", () => {
    it("should not have memory leaks during extended processing", async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 20;
      const requestsPerIteration = 5;

      for (let i = 0; i < iterations; i++) {
        const requests = Array.from(
          { length: requestsPerIteration },
          (_, j) => ({
            userId: `user-${i}-${j}`,
            xafAmount: 5000,
            userHederaAccountId: `0.0.${123456 + i * 100 + j}`,
            pin: "1234",
          })
        );

        const promises = requests.map(async (request) => {
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
            requestContext: { requestId: `req-${i}-${Math.random()}` } as any,
            resource: "",
          };

          return rechargeHandler(event, mockContext);
        });

        await Promise.all(promises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Check memory usage every 5 iterations
        if (i % 5 === 0) {
          const currentMemory = process.memoryUsage();
          const memoryIncrease =
            currentMemory.heapUsed - initialMemory.heapUsed;

          console.log(
            `Iteration ${i}: Memory increase: ${Math.round(
              memoryIncrease / 1024 / 1024
            )}MB`
          );

          // Memory increase should be reasonable (less than 50MB after 100 requests)
          if (i > 10) {
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
          }
        }
      }

      const finalMemory = process.memoryUsage();
      const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(
        `Total memory increase after ${
          iterations * requestsPerIteration
        } requests: ${Math.round(totalMemoryIncrease / 1024 / 1024)}MB`
      );

      // Total memory increase should be reasonable
      expect(totalMemoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    it("should handle resource cleanup properly", async () => {
      // Track resource usage
      const resourceTracker = {
        openConnections: 0,
        pendingPromises: 0,
        timers: 0,
      };

      // Mock resource creation and cleanup
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;

      global.setTimeout = jest.fn().mockImplementation((...args) => {
        resourceTracker.timers++;
        return originalSetTimeout(...args);
      });

      global.clearTimeout = jest.fn().mockImplementation((timer) => {
        resourceTracker.timers--;
        return originalClearTimeout(timer);
      });

      try {
        // Process multiple requests
        const requests = Array.from({ length: 10 }, (_, i) => ({
          userId: `user-${i}`,
          xafAmount: 5000,
          userHederaAccountId: `0.0.${123456 + i}`,
          pin: "1234",
        }));

        const promises = requests.map(async (request) => {
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
            requestContext: { requestId: `req-${Math.random()}` } as any,
            resource: "",
          };

          return rechargeHandler(event, mockContext);
        });

        await Promise.all(promises);

        // Allow time for cleanup
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Verify resources are cleaned up
        expect(resourceTracker.timers).toBeLessThanOrEqual(1); // Some timers may be expected
      } finally {
        // Restore original functions
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
      }
    });
  });

  describe("Performance Benchmarks", () => {
    it("should meet response time SLAs", async () => {
      const slaRequirements = {
        p50: 1000, // 50th percentile: 1 second
        p95: 3000, // 95th percentile: 3 seconds
        p99: 5000, // 99th percentile: 5 seconds
      };

      const requestCount = 100;
      const responseTimes: number[] = [];

      for (let i = 0; i < requestCount; i++) {
        const request: HBARRechargeRequest = {
          userId: `user-${i}`,
          xafAmount: 5000,
          userHederaAccountId: `0.0.${123456 + i}`,
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
          requestContext: { requestId: `req-${i}` } as any,
          resource: "",
        };

        const startTime = Date.now();
        await rechargeHandler(event, mockContext);
        const responseTime = Date.now() - startTime;

        responseTimes.push(responseTime);
      }

      // Calculate percentiles
      responseTimes.sort((a, b) => a - b);
      const p50 = responseTimes[Math.floor(requestCount * 0.5)];
      const p95 = responseTimes[Math.floor(requestCount * 0.95)];
      const p99 = responseTimes[Math.floor(requestCount * 0.99)];

      console.log(`Response time percentiles:
        - P50: ${p50}ms (SLA: ${slaRequirements.p50}ms)
        - P95: ${p95}ms (SLA: ${slaRequirements.p95}ms)
        - P99: ${p99}ms (SLA: ${slaRequirements.p99}ms)`);

      // Verify SLA compliance
      expect(p50).toBeLessThanOrEqual(slaRequirements.p50);
      expect(p95).toBeLessThanOrEqual(slaRequirements.p95);
      expect(p99).toBeLessThanOrEqual(slaRequirements.p99);
    });

    it("should maintain throughput under varying load", async () => {
      const loadLevels = [1, 5, 10, 20]; // Concurrent requests
      const throughputResults: { load: number; throughput: number }[] = [];

      for (const concurrentRequests of loadLevels) {
        const { duration } = await measurePerformance(async () => {
          const promises = Array.from(
            { length: concurrentRequests },
            async (_, i) => {
              const request: HBARRechargeRequest = {
                userId: `user-${i}`,
                xafAmount: 5000,
                userHederaAccountId: `0.0.${123456 + i}`,
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
                requestContext: { requestId: `req-${i}` } as any,
                resource: "",
              };

              return rechargeHandler(event, mockContext);
            }
          );

          return Promise.all(promises);
        }, `Load Level: ${concurrentRequests} concurrent requests`);

        const throughput = (concurrentRequests / duration) * 1000; // requests per second
        throughputResults.push({ load: concurrentRequests, throughput });
      }

      // Verify throughput scales reasonably
      console.log("Throughput results:", throughputResults);

      // Throughput should not degrade significantly with increased load
      const baselineThroughput = throughputResults[0].throughput;
      const maxLoadThroughput =
        throughputResults[throughputResults.length - 1].throughput;

      // Allow for some degradation but not more than 50%
      expect(maxLoadThroughput).toBeGreaterThan(baselineThroughput * 0.5);
    });
  });
});
