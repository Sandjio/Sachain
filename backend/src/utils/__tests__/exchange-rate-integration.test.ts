/**
 * Integration tests for Exchange Rate Service with HBAR recharge validation
 * Tests the complete flow from validation to exchange rate calculation
 */

import { createExchangeRateService } from "../exchange-rate-service";
import {
  validateRechargeAmount,
  validateHederaAccountId,
  validateHBARRechargeRequest,
  areAllValidationsValid,
} from "../hbar-recharge-validation";

// Mock DynamoDB operations
jest.mock("../../repositories/base-repository");

// Mock fetch globally
global.fetch = jest.fn();

describe("Exchange Rate Service Integration", () => {
  let exchangeRateService: ReturnType<typeof createExchangeRateService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create service with test configuration
    exchangeRateService = createExchangeRateService("test-table", {
      cacheTimeout: 300,
      staleThreshold: 600,
      fees: {
        platformFeePercentage: 2.5,
        orangeMoneyFeePercentage: 1.5,
      },
    });

    // Mock the DynamoDB operations
    (exchangeRateService as any).getItem = jest.fn().mockResolvedValue(null);
    (exchangeRateService as any).putItem = jest
      .fn()
      .mockResolvedValue(undefined);

    // Mock successful exchange rate fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          "hedera-hashgraph": { xaf: 500 }, // 1 HBAR = 500 XAF
        }),
    });
  });

  describe("Complete recharge flow validation and calculation", () => {
    it("should validate request and calculate HBAR amount for valid inputs", async () => {
      const rechargeRequest = {
        userId: "user123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        customerNumber: "+237677123456",
        pin: "1234",
        transactionId: "txn_123456789",
      };

      // Step 1: Validate the request
      const validationResults = validateHBARRechargeRequest(rechargeRequest);
      expect(areAllValidationsValid(validationResults)).toBe(true);

      // Step 2: Calculate HBAR amount with fees
      const conversionResult = await exchangeRateService.calculateHBARAmount(
        rechargeRequest.xafAmount
      );

      expect(conversionResult).toEqual({
        xafAmount: 10000,
        hbarAmount: 19.2, // (10000 - 400) * (1/500)
        exchangeRate: 0.002, // 1/500
        platformFee: 250, // 2.5% of 10000
        orangeMoneyFee: 150, // 1.5% of 10000
        netHBARAmount: 19.2,
      });
    });

    it("should reject invalid amounts during validation", async () => {
      const invalidRequest = {
        userId: "user123",
        xafAmount: 500, // Below minimum of 1000
        userHederaAccountId: "0.0.123456",
        customerNumber: "+237677123456",
        pin: "1234",
        transactionId: "txn_123456789",
      };

      const validationResults = validateHBARRechargeRequest(invalidRequest);
      expect(areAllValidationsValid(validationResults)).toBe(false);

      const amountValidation = validationResults.find((result) =>
        result.errorMessage?.includes("Amount must be at least")
      );
      expect(amountValidation?.isValid).toBe(false);
    });

    it("should reject invalid Hedera account IDs", async () => {
      const invalidRequest = {
        userId: "user123",
        xafAmount: 10000,
        userHederaAccountId: "invalid-account", // Invalid format
        customerNumber: "+237677123456",
        pin: "1234",
        transactionId: "txn_123456789",
      };

      const validationResults = validateHBARRechargeRequest(invalidRequest);
      expect(areAllValidationsValid(validationResults)).toBe(false);

      const accountValidation = validationResults.find((result) =>
        result.errorMessage?.includes("Invalid Hedera account ID format")
      );
      expect(accountValidation?.isValid).toBe(false);
    });

    it("should handle different exchange rates correctly", async () => {
      // Mock different exchange rate (1 HBAR = 1000 XAF)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            "hedera-hashgraph": { xaf: 1000 },
          }),
      });

      const rechargeRequest = {
        userId: "user123",
        xafAmount: 50000,
        userHederaAccountId: "0.0.123456",
        customerNumber: "+237677123456",
        pin: "1234",
        transactionId: "txn_123456789",
      };

      // Validate request
      const validationResults = validateHBARRechargeRequest(rechargeRequest);
      expect(areAllValidationsValid(validationResults)).toBe(true);

      // Calculate with new exchange rate
      const conversionResult = await exchangeRateService.calculateHBARAmount(
        rechargeRequest.xafAmount
      );

      expect(conversionResult).toEqual({
        xafAmount: 50000,
        hbarAmount: 48, // (50000 - 2000) * (1/1000)
        exchangeRate: 0.001, // 1/1000
        platformFee: 1250, // 2.5% of 50000
        orangeMoneyFee: 750, // 1.5% of 50000
        netHBARAmount: 48,
      });
    });

    it("should validate individual components correctly", async () => {
      // Test amount validation
      const amountValidation = validateRechargeAmount(5000);
      expect(amountValidation.isValid).toBe(true);

      const lowAmountValidation = validateRechargeAmount(500);
      expect(lowAmountValidation.isValid).toBe(false);

      // Test Hedera account validation
      const validAccountValidation = validateHederaAccountId("0.0.123456");
      expect(validAccountValidation.isValid).toBe(true);

      const invalidAccountValidation = validateHederaAccountId("invalid");
      expect(invalidAccountValidation.isValid).toBe(false);
    });

    it("should handle exchange rate service errors gracefully", async () => {
      // Mock exchange rate service failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const rechargeRequest = {
        userId: "user123",
        xafAmount: 10000,
        userHederaAccountId: "0.0.123456",
        customerNumber: "+237677123456",
        pin: "1234",
        transactionId: "txn_123456789",
      };

      // Validation should still pass
      const validationResults = validateHBARRechargeRequest(rechargeRequest);
      expect(areAllValidationsValid(validationResults)).toBe(true);

      // But exchange rate calculation should fail
      await expect(
        exchangeRateService.calculateHBARAmount(rechargeRequest.xafAmount)
      ).rejects.toThrow("EXCHANGE_RATE_UNAVAILABLE");
    }, 15000);
  });

  describe("Fee calculation scenarios", () => {
    it("should calculate fees correctly for different amounts", async () => {
      const testCases = [
        {
          amount: 1000,
          expectedPlatformFee: 25,
          expectedOrangeMoneyFee: 15,
          expectedNetAmount: 960,
        },
        {
          amount: 100000,
          expectedPlatformFee: 2500,
          expectedOrangeMoneyFee: 1500,
          expectedNetAmount: 96000,
        },
        {
          amount: 1000000,
          expectedPlatformFee: 25000,
          expectedOrangeMoneyFee: 15000,
          expectedNetAmount: 960000,
        },
      ];

      for (const testCase of testCases) {
        const result = await exchangeRateService.calculateHBARAmount(
          testCase.amount
        );

        expect(result.platformFee).toBe(testCase.expectedPlatformFee);
        expect(result.orangeMoneyFee).toBe(testCase.expectedOrangeMoneyFee);
        expect(
          result.xafAmount - result.platformFee - result.orangeMoneyFee
        ).toBe(testCase.expectedNetAmount);
      }
    });
  });
});
