/**
 * Unit tests for HBAR recharge types and interfaces
 */

import {
  HBARRechargeRequest,
  HBARRechargeResponse,
  RechargeTransaction,
  ExchangeRate,
  ConversionResult,
  HBARTransferParams,
  HBARTransferResult,
  PaymentSuccessEvent,
  HBARConversionStartedEvent,
  HBARConversionCompletedEvent,
  HBARConversionFailedEvent,
  RechargeConfig,
  RECHARGE_ERROR_CODES,
  RechargeErrorCode,
} from "../hbar-recharge";

describe("HBAR Recharge Types", () => {
  describe("API Request/Response Types", () => {
    it("should create valid HBARRechargeRequest", () => {
      const request: HBARRechargeRequest = {
        userId: "user123",
        xafAmount: 5000,
        userHederaAccountId: "0.0.123456",
        pin: "1234",
      };

      expect(request.userId).toBe("user123");
      expect(request.xafAmount).toBe(5000);
      expect(request.userHederaAccountId).toBe("0.0.123456");
      expect(request.pin).toBe("1234");
    });

    it("should create valid HBARRechargeResponse", () => {
      const response: HBARRechargeResponse = {
        transactionId: "tx123",
        xafAmount: 5000,
        estimatedHBARAmount: 10.5,
        conversionRate: 476.19,
        fees: {
          orangeMoneyFee: 75,
          platformFee: 125,
          totalFees: 200,
        },
        status: "payment_initiated",
      };

      expect(response.transactionId).toBe("tx123");
      expect(response.status).toBe("payment_initiated");
      expect(response.fees.totalFees).toBe(200);
    });
  });

  describe("Transaction Data Models", () => {
    it("should create valid RechargeTransaction", () => {
      const transaction: RechargeTransaction = {
        PK: "USER#user123",
        SK: "RECHARGE#tx123",
        transactionId: "tx123",
        userId: "user123",
        userHederaAccountId: "0.0.123456",
        xafAmount: 5000,
        hbarAmount: 10.5,
        exchangeRate: 476.19,
        orangeMoneyFee: 75,
        platformFee: 125,
        totalFees: 200,
        status: "completed",
        orangeMoneyTransactionId: "om123",
        hederaTransactionId: "hts123",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:05:00Z",
        completedAt: "2024-01-01T00:05:00Z",
        retryCount: 0,
        GSI1PK: "RECHARGE_STATUS#completed",
        GSI1SK: "2024-01-01T00:00:00Z",
      };

      expect(transaction.PK).toBe("USER#user123");
      expect(transaction.SK).toBe("RECHARGE#tx123");
      expect(transaction.status).toBe("completed");
    });
  });

  describe("Exchange Rate Models", () => {
    it("should create valid ExchangeRate", () => {
      const rate: ExchangeRate = {
        xafToHbar: 476.19,
        lastUpdated: "2024-01-01T00:00:00Z",
        source: "coingecko",
        confidence: "high",
      };

      expect(rate.xafToHbar).toBe(476.19);
      expect(rate.confidence).toBe("high");
    });

    it("should create valid ConversionResult", () => {
      const result: ConversionResult = {
        xafAmount: 5000,
        hbarAmount: 10.5,
        exchangeRate: 476.19,
        platformFee: 125,
        orangeMoneyFee: 75,
        netHBARAmount: 10.08,
      };

      expect(result.netHBARAmount).toBe(10.08);
      expect(result.hbarAmount).toBe(10.5);
    });
  });

  describe("Hedera Integration Models", () => {
    it("should create valid HBARTransferParams", () => {
      const params: HBARTransferParams = {
        fromAccountId: "0.0.treasury",
        toAccountId: "0.0.123456",
        amount: 10.5,
        memo: "HBAR recharge",
      };

      expect(params.fromAccountId).toBe("0.0.treasury");
      expect(params.toAccountId).toBe("0.0.123456");
      expect(params.amount).toBe(10.5);
    });

    it("should create valid HBARTransferResult", () => {
      const result: HBARTransferResult = {
        transactionId: "hts123",
        transactionHash: "hash123",
        consensusTimestamp: "1640995200.123456789",
        actualCost: "0.001",
        status: "success",
      };

      expect(result.status).toBe("success");
      expect(result.transactionId).toBe("hts123");
    });
  });

  describe("Event Schemas", () => {
    it("should create valid PaymentSuccessEvent", () => {
      const event: PaymentSuccessEvent = {
        eventId: "evt123",
        eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
        source: "sachain.payments",
        timestamp: "2024-01-01T00:00:00Z",
        version: "1.0",
        detail: {
          transactionId: "tx123",
          userId: "user123",
          xafAmount: 5000,
          orangeMoneyTransactionId: "om123",
          userHederaAccountId: "0.0.123456",
          fees: {
            orangeMoneyFee: 75,
            platformFee: 125,
            totalFees: 200,
          },
        },
      };

      expect(event.eventType).toBe("ORANGE_MONEY_PAYMENT_SUCCESS");
      expect(event.source).toBe("sachain.payments");
      expect(event.detail.transactionId).toBe("tx123");
    });

    it("should create valid HBARConversionStartedEvent", () => {
      const event: HBARConversionStartedEvent = {
        eventId: "evt124",
        eventType: "HBAR_CONVERSION_STARTED",
        source: "sachain.recharge",
        timestamp: "2024-01-01T00:01:00Z",
        version: "1.0",
        detail: {
          transactionId: "tx123",
          userId: "user123",
          xafAmount: 5000,
          exchangeRate: 476.19,
          estimatedHBARAmount: 10.5,
        },
      };

      expect(event.eventType).toBe("HBAR_CONVERSION_STARTED");
      expect(event.source).toBe("sachain.recharge");
    });

    it("should create valid HBARConversionCompletedEvent", () => {
      const event: HBARConversionCompletedEvent = {
        eventId: "evt125",
        eventType: "HBAR_CONVERSION_COMPLETED",
        source: "sachain.recharge",
        timestamp: "2024-01-01T00:05:00Z",
        version: "1.0",
        detail: {
          transactionId: "tx123",
          userId: "user123",
          xafAmount: 5000,
          hbarAmount: 10.5,
          exchangeRate: 476.19,
          hederaTransactionId: "hts123",
          fees: {
            orangeMoneyFee: 75,
            platformFee: 125,
            totalFees: 200,
          },
        },
      };

      expect(event.eventType).toBe("HBAR_CONVERSION_COMPLETED");
      expect(event.detail.hederaTransactionId).toBe("hts123");
    });

    it("should create valid HBARConversionFailedEvent", () => {
      const event: HBARConversionFailedEvent = {
        eventId: "evt126",
        eventType: "HBAR_CONVERSION_FAILED",
        source: "sachain.recharge",
        timestamp: "2024-01-01T00:03:00Z",
        version: "1.0",
        detail: {
          transactionId: "tx123",
          userId: "user123",
          xafAmount: 5000,
          errorMessage: "Hedera network unavailable",
          retryCount: 2,
          willRetry: true,
        },
      };

      expect(event.eventType).toBe("HBAR_CONVERSION_FAILED");
      expect(event.detail.willRetry).toBe(true);
    });
  });

  describe("Configuration Models", () => {
    it("should create valid RechargeConfig", () => {
      const config: RechargeConfig = {
        limits: {
          minRechargeAmount: 1000,
          maxRechargeAmount: 1000000,
          dailyUserLimit: 5000000,
        },
        fees: {
          platformFeePercentage: 2.5,
          orangeMoneyFeePercentage: 1.5,
        },
        retry: {
          maxRetries: 5,
          baseDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
        },
        exchangeRate: {
          cacheTimeout: 300,
          staleThreshold: 600,
        },
      };

      expect(config.limits.minRechargeAmount).toBe(1000);
      expect(config.fees.platformFeePercentage).toBe(2.5);
      expect(config.retry.maxRetries).toBe(5);
    });
  });

  describe("Error Models", () => {
    it("should have all required error codes", () => {
      expect(RECHARGE_ERROR_CODES.INVALID_AMOUNT).toBe("INVALID_AMOUNT");
      expect(RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW).toBe("AMOUNT_TOO_LOW");
      expect(RECHARGE_ERROR_CODES.AMOUNT_TOO_HIGH).toBe("AMOUNT_TOO_HIGH");
      expect(RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT).toBe(
        "INVALID_HEDERA_ACCOUNT"
      );
      expect(RECHARGE_ERROR_CODES.DAILY_LIMIT_EXCEEDED).toBe(
        "DAILY_LIMIT_EXCEEDED"
      );
      expect(RECHARGE_ERROR_CODES.INVALID_USER).toBe("INVALID_USER");
      expect(RECHARGE_ERROR_CODES.INSUFFICIENT_KYC).toBe("INSUFFICIENT_KYC");
      expect(RECHARGE_ERROR_CODES.ORANGE_MONEY_FAILED).toBe(
        "ORANGE_MONEY_FAILED"
      );
      expect(RECHARGE_ERROR_CODES.INSUFFICIENT_BALANCE).toBe(
        "INSUFFICIENT_BALANCE"
      );
      expect(RECHARGE_ERROR_CODES.INVALID_PIN).toBe("INVALID_PIN");
      expect(RECHARGE_ERROR_CODES.EXCHANGE_RATE_UNAVAILABLE).toBe(
        "EXCHANGE_RATE_UNAVAILABLE"
      );
      expect(RECHARGE_ERROR_CODES.HEDERA_NETWORK_ERROR).toBe(
        "HEDERA_NETWORK_ERROR"
      );
      expect(RECHARGE_ERROR_CODES.INSUFFICIENT_TREASURY_BALANCE).toBe(
        "INSUFFICIENT_TREASURY_BALANCE"
      );
      expect(RECHARGE_ERROR_CODES.DATABASE_ERROR).toBe("DATABASE_ERROR");
      expect(RECHARGE_ERROR_CODES.EVENT_PUBLISHING_FAILED).toBe(
        "EVENT_PUBLISHING_FAILED"
      );
      expect(RECHARGE_ERROR_CODES.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
    });

    it("should use error codes as types", () => {
      const errorCode: RechargeErrorCode = RECHARGE_ERROR_CODES.INVALID_AMOUNT;
      expect(errorCode).toBe("INVALID_AMOUNT");
    });
  });
});
