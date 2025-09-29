/**
 * Unit tests for HBAR Conversion Service
 */

import { HBARConversionService } from "../conversion-service";
import { ConversionRepository } from "../conversion-repository";
import { ConversionEventPublisher } from "../event-publisher";
import { HederaService } from "../../../utils/hedera-service";
import { createExchangeRateService } from "../../../utils/exchange-rate-service";
import { StructuredLogger } from "../../../utils/structured-logger";
import {
  PaymentSuccessEvent,
  RechargeTransaction,
  RECHARGE_ERROR_CODES,
} from "../../../types/hbar-recharge";

// Mock dependencies
jest.mock("../conversion-repository");
jest.mock("../event-publisher");
jest.mock("../../../utils/hedera-service");
jest.mock("../../../utils/exchange-rate-service");
jest.mock("../../../utils/structured-logger");

const MockConversionRepository = ConversionRepository as jest.MockedClass<
  typeof ConversionRepository
>;
const MockConversionEventPublisher =
  ConversionEventPublisher as jest.MockedClass<typeof ConversionEventPublisher>;
const MockHederaService = HederaService as jest.MockedClass<
  typeof HederaService
>;
const mockCreateExchangeRateService =
  createExchangeRateService as jest.MockedFunction<
    typeof createExchangeRateService
  >;
const MockStructuredLogger = StructuredLogger as jest.MockedClass<
  typeof StructuredLogger
>;

describe("HBARConversionService", () => {
  let conversionService: HBARConversionService;
  let mockRepository: jest.Mocked<ConversionRepository>;
  let mockEventPublisher: jest.Mocked<ConversionEventPublisher>;
  let mockHederaService: jest.Mocked<HederaService>;
  let mockExchangeRateService: any;
  let mockLogger: jest.Mocked<StructuredLogger>;

  const mockConfig = {
    tableName: "test-table",
    eventBusName: "test-event-bus",
    treasuryAccountId: "0.0.123456",
    region: "us-east-1",
  };

  const mockPaymentEvent: PaymentSuccessEvent["detail"] = {
    transactionId: "test-tx-123",
    userId: "user-123",
    xafAmount: 10000,
    orangeMoneyTransactionId: "om-tx-456",
    userHederaAccountId: "0.0.789012",
    fees: {
      orangeMoneyFee: 150,
      platformFee: 250,
      totalFees: 400,
    },
  };

  const mockTransaction: RechargeTransaction = {
    PK: "USER#user-123",
    SK: "RECHARGE#test-tx-123",
    transactionId: "test-tx-123",
    userId: "user-123",
    userHederaAccountId: "0.0.789012",
    xafAmount: 10000,
    hbarAmount: 0.5,
    exchangeRate: 0.00005,
    orangeMoneyFee: 150,
    platformFee: 250,
    totalFees: 400,
    status: "payment_confirmed",
    orangeMoneyTransactionId: "om-tx-456",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    retryCount: 0,
    GSI1PK: "RECHARGE_STATUS#payment_confirmed",
    GSI1SK: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockRepository = new MockConversionRepository({
      tableName: "test",
    }) as jest.Mocked<ConversionRepository>;
    mockEventPublisher = new MockConversionEventPublisher({
      eventBusName: "test",
    }) as jest.Mocked<ConversionEventPublisher>;
    mockHederaService = new MockHederaService({
      operatorId: "0.0.123",
      operatorKey: "test-key",
      network: "testnet",
    }) as jest.Mocked<HederaService>;

    mockExchangeRateService = {
      calculateHBARAmount: jest.fn(),
      getCurrentRate: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Setup mock implementations
    MockConversionRepository.mockImplementation(() => mockRepository);
    MockConversionEventPublisher.mockImplementation(() => mockEventPublisher);
    MockHederaService.mockImplementation(() => mockHederaService);
    mockCreateExchangeRateService.mockReturnValue(mockExchangeRateService);
    MockStructuredLogger.getInstance.mockReturnValue(mockLogger);

    // Set environment variables
    process.env.HEDERA_OPERATOR_ID = "0.0.123456";
    process.env.HEDERA_OPERATOR_KEY = "test-key";
    process.env.HEDERA_NETWORK = "testnet";

    conversionService = new HBARConversionService(mockConfig);
  });

  describe("processPaymentSuccess", () => {
    it("should successfully process a payment success event", async () => {
      // Setup mocks
      mockRepository.getTransaction.mockResolvedValue(mockTransaction);
      mockRepository.updateTransactionStatus.mockResolvedValue();
      mockEventPublisher.publishConversionStarted.mockResolvedValue({
        success: true,
      });
      mockEventPublisher.publishConversionCompleted.mockResolvedValue({
        success: true,
      });

      mockExchangeRateService.calculateHBARAmount.mockResolvedValue({
        xafAmount: 10000,
        hbarAmount: 0.5,
        exchangeRate: 0.00005,
        platformFee: 250,
        orangeMoneyFee: 150,
        netHBARAmount: 0.5,
      });

      mockHederaService.validateHederaAccount.mockResolvedValue(true);
      mockHederaService.getAccountBalance.mockResolvedValue(100); // Treasury has 100 HBAR
      mockHederaService.transferHBAR.mockResolvedValue({
        transactionId: "hedera-tx-123",
        transactionHash: "hash-123",
        consensusTimestamp: "1234567890.123456789",
        actualCost: "0.05",
        status: "success",
      });

      // Execute
      const result = await conversionService.processPaymentSuccess(
        mockPaymentEvent
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        transactionId: "test-tx-123",
        hbarAmount: 0.5,
        hederaTransactionId: "hedera-tx-123",
        exchangeRate: 0.00005,
        actualCost: "0.05",
      });

      // Verify repository calls
      expect(mockRepository.getTransaction).toHaveBeenCalledWith(
        "test-tx-123",
        "user-123"
      );
      expect(mockRepository.updateTransactionStatus).toHaveBeenCalledTimes(2); // converting and completed

      // Verify event publishing
      expect(mockEventPublisher.publishConversionStarted).toHaveBeenCalled();
      expect(mockEventPublisher.publishConversionCompleted).toHaveBeenCalled();

      // Verify Hedera service calls
      expect(mockHederaService.validateHederaAccount).toHaveBeenCalledWith(
        "0.0.789012"
      );
      expect(mockHederaService.getAccountBalance).toHaveBeenCalledWith(
        "0.0.123456"
      );
      expect(mockHederaService.transferHBAR).toHaveBeenCalledWith({
        fromAccountId: "0.0.123456",
        toAccountId: "0.0.789012",
        amount: 0.5,
        memo: "Recharge: test-tx-123",
      });
    });

    it("should return success if transaction is already completed", async () => {
      const completedTransaction = {
        ...mockTransaction,
        status: "completed" as const,
        hederaTransactionId: "existing-hedera-tx",
      };

      mockRepository.getTransaction.mockResolvedValue(completedTransaction);

      const result = await conversionService.processPaymentSuccess(
        mockPaymentEvent
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        transactionId: "test-tx-123",
        hbarAmount: 0.5,
        hederaTransactionId: "existing-hedera-tx",
        exchangeRate: 0.00005,
        actualCost: "0",
      });

      // Should not perform any operations
      expect(mockRepository.updateTransactionStatus).not.toHaveBeenCalled();
      expect(mockHederaService.transferHBAR).not.toHaveBeenCalled();
    });

    it("should fail if transaction is not found", async () => {
      mockRepository.getTransaction.mockResolvedValue(null);

      const result = await conversionService.processPaymentSuccess(
        mockPaymentEvent
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(RECHARGE_ERROR_CODES.INVALID_AMOUNT);
      expect(result.error?.message).toBe("Transaction not found");
      expect(result.error?.retryable).toBe(false);
    });

    it("should fail if transaction is in wrong status", async () => {
      const wrongStatusTransaction = {
        ...mockTransaction,
        status: "initiated" as const,
      };

      mockRepository.getTransaction.mockResolvedValue(wrongStatusTransaction);

      const result = await conversionService.processPaymentSuccess(
        mockPaymentEvent
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(RECHARGE_ERROR_CODES.INTERNAL_ERROR);
      expect(result.error?.message).toBe(
        "Invalid transaction status: initiated"
      );
      expect(result.error?.retryable).toBe(false);
    });

    it("should fail if Hedera account is invalid", async () => {
      mockRepository.getTransaction.mockResolvedValue(mockTransaction);
      mockRepository.updateTransactionStatus.mockResolvedValue();
      mockEventPublisher.publishConversionStarted.mockResolvedValue({
        success: true,
      });
      mockEventPublisher.publishConversionFailed.mockResolvedValue({
        success: true,
      });

      mockExchangeRateService.calculateHBARAmount.mockResolvedValue({
        xafAmount: 10000,
        hbarAmount: 0.5,
        exchangeRate: 0.00005,
        platformFee: 250,
        orangeMoneyFee: 150,
        netHBARAmount: 0.5,
      });

      mockHederaService.validateHederaAccount.mockResolvedValue(false);

      const result = await conversionService.processPaymentSuccess(
        mockPaymentEvent
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(
        RECHARGE_ERROR_CODES.HEDERA_NETWORK_ERROR
      );
      expect(result.error?.retryable).toBe(false);

      // Should update transaction to failed
      expect(mockRepository.updateTransactionStatus).toHaveBeenCalledWith(
        "test-tx-123",
        "user-123",
        "failed",
        expect.objectContaining({
          errorMessage: expect.stringContaining("Invalid Hedera account"),
        })
      );

      // Should publish failed event
      expect(mockEventPublisher.publishConversionFailed).toHaveBeenCalled();
    });

    it("should fail if treasury has insufficient balance", async () => {
      mockRepository.getTransaction.mockResolvedValue(mockTransaction);
      mockRepository.updateTransactionStatus.mockResolvedValue();
      mockEventPublisher.publishConversionStarted.mockResolvedValue({
        success: true,
      });
      mockEventPublisher.publishConversionFailed.mockResolvedValue({
        success: true,
      });

      mockExchangeRateService.calculateHBARAmount.mockResolvedValue({
        xafAmount: 10000,
        hbarAmount: 0.5,
        exchangeRate: 0.00005,
        platformFee: 250,
        orangeMoneyFee: 150,
        netHBARAmount: 0.5,
      });

      mockHederaService.validateHederaAccount.mockResolvedValue(true);
      mockHederaService.getAccountBalance.mockResolvedValue(0.1); // Insufficient balance

      const result = await conversionService.processPaymentSuccess(
        mockPaymentEvent
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(
        RECHARGE_ERROR_CODES.HEDERA_NETWORK_ERROR
      );
      expect(result.error?.retryable).toBe(false);

      // Should update transaction to failed
      expect(mockRepository.updateTransactionStatus).toHaveBeenCalledWith(
        "test-tx-123",
        "user-123",
        "failed",
        expect.objectContaining({
          errorMessage: expect.stringContaining(
            "Insufficient treasury balance"
          ),
        })
      );
    });

    it("should fail if HBAR transfer fails", async () => {
      mockRepository.getTransaction.mockResolvedValue(mockTransaction);
      mockRepository.updateTransactionStatus.mockResolvedValue();
      mockEventPublisher.publishConversionStarted.mockResolvedValue({
        success: true,
      });
      mockEventPublisher.publishConversionFailed.mockResolvedValue({
        success: true,
      });

      mockExchangeRateService.calculateHBARAmount.mockResolvedValue({
        xafAmount: 10000,
        hbarAmount: 0.5,
        exchangeRate: 0.00005,
        platformFee: 250,
        orangeMoneyFee: 150,
        netHBARAmount: 0.5,
      });

      mockHederaService.validateHederaAccount.mockResolvedValue(true);
      mockHederaService.getAccountBalance.mockResolvedValue(100);
      mockHederaService.transferHBAR.mockResolvedValue({
        transactionId: "failed-tx",
        transactionHash: "",
        consensusTimestamp: "",
        actualCost: "0",
        status: "failed",
      });

      const result = await conversionService.processPaymentSuccess(
        mockPaymentEvent
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(
        RECHARGE_ERROR_CODES.HEDERA_NETWORK_ERROR
      );
      expect(result.error?.retryable).toBe(false);
    });

    it("should handle exchange rate service failures", async () => {
      mockRepository.getTransaction.mockResolvedValue(mockTransaction);
      mockRepository.updateTransactionStatus.mockResolvedValue();
      mockEventPublisher.publishConversionStarted.mockResolvedValue({
        success: true,
      });
      mockEventPublisher.publishConversionFailed.mockResolvedValue({
        success: true,
      });

      mockExchangeRateService.calculateHBARAmount.mockRejectedValue(
        new Error("Exchange rate service unavailable")
      );

      const result = await conversionService.processPaymentSuccess(
        mockPaymentEvent
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(
        RECHARGE_ERROR_CODES.HEDERA_NETWORK_ERROR
      );
      expect(result.error?.retryable).toBe(false);
    });

    it("should handle unexpected errors gracefully", async () => {
      mockRepository.getTransaction.mockRejectedValue(
        new Error("Database connection failed")
      );

      const result = await conversionService.processPaymentSuccess(
        mockPaymentEvent
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(RECHARGE_ERROR_CODES.INTERNAL_ERROR);
      expect(result.error?.message).toBe(
        "Unexpected error during conversion process"
      );
      expect(result.error?.retryable).toBe(true);
    });
  });

  describe("healthCheck", () => {
    it("should return healthy status when all services are working", async () => {
      mockRepository.healthCheck.mockResolvedValue();
      mockEventPublisher.healthCheck.mockResolvedValue();
      mockExchangeRateService.getCurrentRate.mockResolvedValue({
        xafToHbar: 0.00005,
        lastUpdated: "2024-01-01T00:00:00.000Z",
        source: "test",
        confidence: "high",
      });
      mockHederaService.getAccountBalance.mockResolvedValue(100);

      const result = await conversionService.healthCheck();

      expect(result).toEqual({
        database: true,
        eventBridge: true,
        exchangeRate: true,
        hederaNetwork: true,
      });
    });

    it("should return degraded status when some services fail", async () => {
      mockRepository.healthCheck.mockResolvedValue();
      mockEventPublisher.healthCheck.mockRejectedValue(
        new Error("EventBridge error")
      );
      mockExchangeRateService.getCurrentRate.mockResolvedValue({
        xafToHbar: 0.00005,
        lastUpdated: "2024-01-01T00:00:00.000Z",
        source: "test",
        confidence: "high",
      });
      mockHederaService.getAccountBalance.mockResolvedValue(100);

      const result = await conversionService.healthCheck();

      expect(result).toEqual({
        database: true,
        eventBridge: false,
        exchangeRate: true,
        hederaNetwork: true,
      });
    });

    it("should handle all services failing", async () => {
      mockRepository.healthCheck.mockRejectedValue(new Error("DB error"));
      mockEventPublisher.healthCheck.mockRejectedValue(
        new Error("EventBridge error")
      );
      mockExchangeRateService.getCurrentRate.mockRejectedValue(
        new Error("Exchange rate error")
      );
      mockHederaService.getAccountBalance.mockRejectedValue(
        new Error("Hedera error")
      );

      const result = await conversionService.healthCheck();

      expect(result).toEqual({
        database: false,
        eventBridge: false,
        exchangeRate: false,
        hederaNetwork: false,
      });
    });
  });
});
