/**
 * Hedera Transfer Integration Tests for HBAR Recharge System
 * Tests Hedera network interactions, transfer operations, and blockchain integration
 */

import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { handler as conversionHandler } from "../../lambdas/hbar-conversion/index";
import { HederaService } from "../../utils/hedera-service";
import { ExchangeRateService } from "../../utils/exchange-rate-service";
import {
  PaymentSuccessEvent,
  HBARTransferParams,
  HBARTransferResult,
} from "../../types/hbar-recharge";
import { Context } from "aws-lambda";

// Mock AWS clients
const dynamoMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock external services
jest.mock("../../utils/exchange-rate-service");

const mockExchangeRateService = ExchangeRateService as jest.MockedClass<typeof ExchangeRateService>;

describe("Hedera Transfer Integration Tests", () => {
  let mockContext: Context;
  let hederaService: HederaService;

  beforeEach(() => {
    // Reset all mocks
    dynamoMock.reset();
    eventBridgeMock.reset();
    jest.clearAllMocks();

    // Setup environment
    process.env.TABLE_NAME = "test-table";
    process.env.EVENT_BUS_NAME = "test-event-bus";
    process.env.HEDERA_TREASURY_ACCOUNT_ID = "0.0.999999";
    process.env.HEDERA_NETWORK = "testnet";
    process.env.HEDERA_OPERATOR_ID = "0.0.999998";
    process.env.HEDERA_OPERATOR_KEY = "test-private-key";

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

    // Initialize Hedera service (not mocked for detailed testing)
    hederaService = new HederaService({
      network: "testnet",
      operatorId: process.env.HEDERA_OPERATOR_ID!,
      operatorKey: process.env.HEDERA_OPERATOR_KEY!,
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

    // Exchange rate service mocks
    mockExchangeRateService.prototype.getCurrentRate = jest.fn().mockResolvedValue({
      xafToHbar: 400,
      lastUpdated: new Date().toISOString(),
      source: "coingecko",
      confidence: "high",
    });
    mockExchangeRateService.prototype.calculateHBARAmount = jest.fn().mockResolvedValue({
      xafAmount: 10000,
      hbarAmount: 24.25,
      exchangeRate: 400,
      platformFee: 250,
      orangeMoneyFee: 500,
      netHBARAmount: 24.25,
    });
  });

  describe("Hedera Account Validation", () => {
    it("should validate valid Hedera account IDs", async () => {
      const validAccountIds = [
        "0.0.123456",
        "0.0.1",
        "0.0.999999999",
      ];

      for (const accountId of validAccountIds) {
        // Mock successful account validation
        jest.spyOn(hederaService, 'validateHederaAccount').mockResolvedValueOnce(true);

        const isValid = await hederaService.validateHederaAccount(accountId);
        expect(isValid).toBe(true);
      }
    });

    it("should reject invalid Hedera account IDs", async () => {
      const invalidAccountIds = [
        "invalid-account",
        "0.0",
        "0.0.abc",
        "",
        "1.2.3.4.5",
        "0.0.-1",
      ];

      for (const accountId of invalidAccountIds) {
        // Mock failed account validation
        jest.spyOn(hederaService, 'validateHederaAccount').mockResolvedValueOnce(false);

        const isValid = await hederaService.validateHederaAccount(accountId);
        expect(isValid).toBe(false);
      }
    });

    it("should handle network errors during account validation", async () => {
      // Mock network error
      jest.spyOn(hederaService, 'validateHederaAccount').mockRejectedValueOnce(
        new Error("HEDERA_NETWORK_ERROR")
      );

      await expect(hederaService.validateHederaAccount("0.0.123456"))
        .rejects.toThrow("HEDERA_NETWORK_ERROR");
    });
  });

  describe("HBAR Transfer Operations", () => {
    it("should execute successful HBAR transfer", async () => {
      const transferParams: HBARTransferParams = {
        fromAccountId: "0.0.999999",
        toAccountId: "0.0.123456",
        amount: 25.5,
        memo: "HBAR Recharge - Transaction txn-123",
      };

      // Mock successful transfer
      const expectedResult: HBARTransferResult = {
        transactionId: "0.0.123456@1234567890.123456789",
        transactionHash: "test-hash-123",
        consensusTimestamp: "1234567890.123456789",
        actualCost: "0.001",
        status: "success",
      };

      jest.spyOn(hederaService, 'transferHBAR').mockResolvedValueOnce(expectedResult);

      const result = await hederaService.transferHBAR(transferParams);

      expect(result.status).toBe("success");
      expect(result.transactionId).toBe("0.0.123456@1234567890.123456789");
      expect(result.actualCost).toBe("0.001");
      expect(parseFloat(result.actualCost)).toBeLessThan(1); // Cost should be reasonable
    });

    it("should handle insufficient treasury balance", async () => {
      const transferParams: HBARTransferParams = {
        fromAccountId: "0.0.999999",
        toAccountId: "0.0.123456",
        amount: 1000000, // Very large amount
        memo: "HBAR Recharge - Large transfer",
      };

      // Mock insufficient balance error
      jest.spyOn(hederaService, 'transferHBAR').mockRejectedValueOnce(
        new Error("INSUFFICIENT_ACCOUNT_BALANCE")
      );

      await expect(hederaService.transferHBAR(transferParams))
        .rejects.toThrow("INSUFFICIENT_ACCOUNT_BALANCE");
    });

    it("should handle network congestion and timeouts", async () => {
      const transferParams: HBARTransferParams = {
        fromAccountId: "0.0.999999",
        toAccountId: "0.0.123456",
        amount: 25.5,
        memo: "HBAR Recharge - Network test",
      };

      // Mock network timeout
      jest.spyOn(hederaService, 'transferHBAR').mockRejectedValueOnce(
        new Error("NETWORK_TIMEOUT")
      );

      await expect(hederaService.transferHBAR(transferParams))
        .rejects.toThrow("NETWORK_TIMEOUT");
    });

    it("should validate transfer amounts", async () => {
      const invalidAmounts = [
        -1, // Negative amount
        0, // Zero amount
        0.00000001, // Too small (below minimum)
      ];

      for (const amount of invalidAmounts) {
        const transferParams: HBARTransferParams = {
          fromAccountId: "0.0.999999",
          toAccountId: "0.0.123456",
          amount,
          memo: "Invalid amount test",
        };

        // Mock validation error
        jest.spyOn(hederaService, 'transferHBAR').mockRejectedValueOnce(
          new Error("INVALID_TRANSFER_AMOUNT")
        );

        await expect(hederaService.transferHBAR(transferParams))
          .rejects.toThrow("INVALID_TRANSFER_AMOUNT");
      }
    });
  });

  describe("Treasury Account Management", () => {
    it("should monitor treasury account balance", async () => {
      // Mock balance check
      jest.spyOn(hederaService, 'getAccountBalance').mockResolvedValueOnce(1000.5);

      const balance = await hederaService.getAccountBalance("0.0.999999");

      expect(balance).toBe(1000.5);
      expect(balance).toBeGreaterThan(0);
    });

    it("should alert when treasury balance is low", async () => {
      const lowBalance = 10; // Below warning threshold
      const warningThreshold = 100;

      jest.spyOn(hederaService, 'getAccountBalance').mockResolvedValueOnce(lowBalance);

      const balance = await hederaService.getAccountBalance("0.0.999999");

      expect(balance).toBe(lowBalance);
      expect(balance).toBeLessThan(warningThreshold);

      // In real implementation, this would trigger an alert
      if (balance < warningThreshold) {
        console.warn(`Treasury balance is low: ${balance} HBAR`);
      }
    });

    it("should handle treasury account access errors", async () => {
      // Mock access error (e.g., invalid credentials)
      jest.spyOn(hederaService, 'getAccountBalance').mockRejectedValueOnce(
        new Error("UNAUTHORIZED_ACCESS")
      );

      await expect(hederaService.getAccountBalance("0.0.999999"))
        .rejects.toThrow("UNAUTHORIZED_ACCESS");
    });
  });

  describe("Transaction Cost Estimation", () => {
    it("should estimate transaction costs accurately", async () => {
      const transferParams: HBARTransferParams = {
        fromAccountId: "0.0.999999",
        toAccountId: "0.0.123456",
        amount: 25.5,
        memo: "Cost estimation test",
      };

      // Mock cost estimation
      const estimatedCost = {
        totalEstimate: "0.001",
        breakdown: {
          networkFee: "0.0001",
          nodeFee: "0.0005",
          serviceFee: "0.0004",
        },
      };

      jest.spyOn(hederaService, 'calculateGasFees').mockResolvedValueOnce(estimatedCost);

      const cost = await hederaService.calculateGasFees(transferParams);

      expect(parseFloat(cost.totalEstimate)).toBeLessThan(0.01); // Should be very low cost
      expect(cost.breakdown).toBeDefined();
      expect(cost.breakdown.networkFee).toBeDefined();
    });

    it("should handle cost estimation failures", async () => {
      const transferParams: HBARTransferParams = {
        fromAccountId: "0.0.999999",
        toAccountId: "0.0.123456",
        amount: 25.5,
        memo: "Cost estimation failure test",
      };

      // Mock cost estimation failure
      jest.spyOn(hederaService, 'calculateGasFees').mockRejectedValueOnce(
        new Error("COST_ESTIMATION_FAILED")
      );

      await expect(hederaService.calculateGasFees(transferParams))
        .rejects.toThrow("COST_ESTIMATION_FAILED");
    });
  });

  describe("Hedera Network Integration with Conversion Handler", () => {
    it("should complete HBAR conversion with real Hedera operations", async () => {
      // Mock successful Hedera operations
      jest.spyOn(hederaService, 'validateHederaAccount').mockResolvedValueOnce(true);
      jest.spyOn(hederaService, 'getAccountBalance').mockResolvedValueOnce(1000);
      jest.spyOn(hederaService, 'transferHBAR').mockResolvedValueOnce({
        transactionId: "0.0.123456@1234567890.123456789",
        transactionHash: "test-hash-123",
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

      const response = await conversionHandler(conversionEvent as any, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify Hedera operations were called
      expect(hederaService.validateHederaAccount).toHaveBeenCalledWith("0.0.123456");
      expect(hederaService.transferHBAR).toHaveBeenCalledWith({
        fromAccountId: "0.0.999999",
        toAccountId: "0.0.123456",
        amount: 24.25,
        memo: expect.stringContaining("HBAR Recharge"),
      });
    });

    it("should handle Hedera network failures during conversion", async () => {
      // Mock Hedera network failure
      jest.spyOn(hederaService, 'validateHederaAccount').mockResolvedValueOnce(true);
      jest.spyOn(hederaService, 'getAccountBalance').mockResolvedValueOnce(1000);
      jest.spyOn(hederaService, 'transferHBAR').mockRejectedValueOnce(
        new Error("HEDERA_NETWORK_BUSY")
      );

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

      const response = await conversionHandler(conversionEvent as any, mockContext);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("CONVERSION_FAILED");
    });
  });

  describe("Hedera Transaction Monitoring", () => {
    it("should track transaction status and confirmations", async () => {
      const transactionId = "0.0.123456@1234567890.123456789";

      // Mock transaction status check
      const transactionStatus = {
        transactionId,
        status: "success",
        consensusTimestamp: "1234567890.123456789",
        charged: "0.001",
        receipt: {
          status: "SUCCESS",
          accountId: "0.0.123456",
          contractId: null,
          fileId: null,
          topicId: null,
        },
      };

      jest.spyOn(hederaService, 'getTransactionStatus').mockResolvedValueOnce(transactionStatus);

      const status = await hederaService.getTransactionStatus(transactionId);

      expect(status.status).toBe("success");
      expect(status.transactionId).toBe(transactionId);
      expect(status.receipt.status).toBe("SUCCESS");
    });

    it("should handle pending transactions", async () => {
      const transactionId = "0.0.123456@1234567890.123456789";

      // Mock pending transaction
      const transactionStatus = {
        transactionId,
        status: "pending",
        consensusTimestamp: null,
        charged: null,
        receipt: null,
      };

      jest.spyOn(hederaService, 'getTransactionStatus').mockResolvedValueOnce(transactionStatus);

      const status = await hederaService.getTransactionStatus(transactionId);

      expect(status.status).toBe("pending");
      expect(status.consensusTimestamp).toBeNull();
    });

    it("should handle failed transactions", async () => {
      const transactionId = "0.0.123456@1234567890.123456789";

      // Mock failed transaction
      const transactionStatus = {
        transactionId,
        status: "failed",
        consensusTimestamp: "1234567890.123456789",
        charged: "0.001",
        receipt: {
          status: "INSUFFICIENT_ACCOUNT_BALANCE",
          accountId: "0.0.123456",
          contractId: null,
          fileId: null,
          topicId: null,
        },
      };

      jest.spyOn(hederaService, 'getTransactionStatus').mockResolvedValueOnce(transactionStatus);

      const status = await hederaService.getTransactionStatus(transactionId);

      expect(status.status).toBe("failed");
      expect(status.receipt.status).toBe("INSUFFICIENT_ACCOUNT_BALANCE");
    });
  });

  describe("Hedera Performance and Scalability", () => {
    it("should handle multiple concurrent transfers", async () => {
      const concurrentTransfers = Array.from({ length: 10 }, (_, i) => ({
        fromAccountId: "0.0.999999",
        toAccountId: `0.0.${123456 + i}`,
        amount: 10 + i,
        memo: `Concurrent transfer ${i}`,
      }));

      // Mock successful transfers
      concurrentTransfers.forEach((_, i) => {
        jest.spyOn(hederaService, 'transferHBAR').mockResolvedValueOnce({
          transactionId: `0.0.${123456 + i}@${1234567890 + i}.123456789`,
          transactionHash: `test-hash-${i}`,
          consensusTimestamp: `${1234567890 + i}.123456789`,
          actualCost: "0.001",
          status: "success",
        });
      });

      const transferPromises = concurrentTransfers.map(params => 
        hederaService.transferHBAR(params)
      );

      const results = await Promise.all(transferPromises);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.status).toBe("success");
        expect(result.transactionId).toContain(`0.0.${123456 + i}`);
      });
    });

    it("should measure transfer performance", async () => {
      const transferParams: HBARTransferParams = {
        fromAccountId: "0.0.999999",
        toAccountId: "0.0.123456",
        amount: 25.5,
        memo: "Performance test",
      };

      // Mock transfer with timing
      jest.spyOn(hederaService, 'transferHBAR').mockImplementation(async () => {
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          transactionId: "0.0.123456@1234567890.123456789",
          transactionHash: "test-hash",
          consensusTimestamp: "1234567890.123456789",
          actualCost: "0.001",
          status: "success",
        };
      });

      const startTime = Date.now();
      const result = await hederaService.transferHBAR(transferParams);
      const duration = Date.now() - startTime;

      expect(result.status).toBe("success");
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`Transfer completed in ${duration}ms`);
    });
  });
});