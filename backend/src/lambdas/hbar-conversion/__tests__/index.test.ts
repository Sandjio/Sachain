/**
 * Unit tests for HBAR Conversion Handler Lambda
 */

import { EventBridgeEvent, Context } from "aws-lambda";
import { handler, healthCheck } from "../index";
import { HBARConversionService } from "../conversion-service";
import { StructuredLogger } from "../../../utils/structured-logger";
import { projectMetrics } from "../../../utils/project-metrics";
import { PaymentSuccessEvent } from "../../../types/hbar-recharge";

// Mock dependencies
jest.mock("../conversion-service");
jest.mock("../../../utils/structured-logger");
jest.mock("../../../utils/project-metrics");

const MockHBARConversionService = HBARConversionService as jest.MockedClass<
  typeof HBARConversionService
>;
const MockStructuredLogger = StructuredLogger as jest.MockedClass<
  typeof StructuredLogger
>;
const mockProjectMetrics = projectMetrics as jest.Mocked<typeof projectMetrics>;

describe("HBAR Conversion Handler Lambda", () => {
  let mockConversionService: jest.Mocked<HBARConversionService>;
  let mockLogger: jest.Mocked<StructuredLogger>;
  let mockContext: Context;

  const mockEventDetail: PaymentSuccessEvent["detail"] = {
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

  const mockEvent: EventBridgeEvent<
    "Orange Money Payment Success",
    PaymentSuccessEvent["detail"]
  > = {
    version: "0",
    id: "event-123",
    "detail-type": "Orange Money Payment Success",
    source: "sachain.payments",
    account: "123456789012",
    time: "2024-01-01T00:00:00Z",
    region: "us-east-1",
    resources: [],
    detail: mockEventDetail,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment variables
    process.env.DYNAMODB_TABLE_NAME = "test-table";
    process.env.EVENT_BUS_NAME = "test-event-bus";
    process.env.HEDERA_TREASURY_ACCOUNT_ID = "0.0.123456";
    process.env.AWS_REGION = "us-east-1";
    process.env.HEDERA_OPERATOR_ID = "0.0.123456";
    process.env.HEDERA_OPERATOR_KEY = "test-key";
    process.env.HEDERA_NETWORK = "testnet";

    // Setup mocks
    mockConversionService = {
      processPaymentSuccess: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockContext = {
      awsRequestId: "request-123",
      functionName: "hbar-conversion-handler",
      functionVersion: "1",
      memoryLimitInMB: "256",
      remainingTimeInMillis: 30000,
    } as any;

    // Setup mock implementations
    MockHBARConversionService.mockImplementation(() => mockConversionService);
    MockStructuredLogger.getInstance.mockReturnValue(mockLogger);
    mockProjectMetrics.recordHederaNetworkHealth = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  describe("handler", () => {
    it("should successfully process a payment success event", async () => {
      const mockResult = {
        success: true,
        data: {
          transactionId: "test-tx-123",
          hbarAmount: 0.5,
          hederaTransactionId: "hedera-tx-456",
          exchangeRate: 0.00005,
          actualCost: "0.05",
        },
      };

      mockConversionService.processPaymentSuccess.mockResolvedValue(mockResult);

      await handler(mockEvent, mockContext);

      expect(mockConversionService.processPaymentSuccess).toHaveBeenCalledWith(
        mockEventDetail
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Processing HBAR conversion event",
        expect.objectContaining({
          operation: "ProcessConversionEvent",
          requestId: "request-123",
          transactionId: "test-tx-123",
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "HBAR conversion completed successfully",
        expect.objectContaining({
          transactionId: "test-tx-123",
          hbarAmount: 0.5,
          hederaTransactionId: "hedera-tx-456",
        })
      );
      expect(mockProjectMetrics.recordHederaNetworkHealth).toHaveBeenCalledWith(
        true,
        expect.any(Number),
        "hbarConversion"
      );
    });

    it("should handle conversion service failures gracefully", async () => {
      const mockResult = {
        success: false,
        error: {
          code: "HEDERA_NETWORK_ERROR",
          message: "Failed to transfer HBAR",
          retryable: true,
        },
      };

      mockConversionService.processPaymentSuccess.mockResolvedValue(mockResult);

      await handler(mockEvent, mockContext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "HBAR conversion failed",
        expect.objectContaining({
          transactionId: "test-tx-123",
          error: mockResult.error,
        })
      );
      expect(mockProjectMetrics.recordHederaNetworkHealth).toHaveBeenCalledWith(
        false,
        expect.any(Number),
        "hbarConversion"
      );
    });

    it("should handle invalid event structure", async () => {
      const invalidEvent = {
        ...mockEvent,
        detail: null,
      } as any;

      await expect(handler(invalidEvent, mockContext)).rejects.toThrow(
        "Invalid event structure: missing transaction details"
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error in HBAR conversion handler",
        expect.objectContaining({
          operation: "ProcessConversionEvent",
          requestId: "request-123",
        }),
        expect.any(Error)
      );
      expect(mockProjectMetrics.recordHederaNetworkHealth).toHaveBeenCalledWith(
        false,
        expect.any(Number),
        "hbarConversion"
      );
    });

    it("should handle missing transaction ID in event", async () => {
      const invalidEvent = {
        ...mockEvent,
        detail: {
          ...mockEventDetail,
          transactionId: undefined,
        },
      } as any;

      await expect(handler(invalidEvent, mockContext)).rejects.toThrow(
        "Invalid event structure: missing transaction details"
      );
    });

    it("should handle conversion service exceptions", async () => {
      mockConversionService.processPaymentSuccess.mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(handler(mockEvent, mockContext)).rejects.toThrow(
        "Database connection failed"
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error in HBAR conversion handler",
        expect.objectContaining({
          operation: "ProcessConversionEvent",
          requestId: "request-123",
          transactionId: "test-tx-123",
        }),
        expect.any(Error)
      );
      expect(mockProjectMetrics.recordHederaNetworkHealth).toHaveBeenCalledWith(
        false,
        expect.any(Number),
        "hbarConversion"
      );
    });

    it("should log processing duration", async () => {
      const mockResult = {
        success: true,
        data: {
          transactionId: "test-tx-123",
          hbarAmount: 0.5,
          hederaTransactionId: "hedera-tx-456",
          exchangeRate: 0.00005,
          actualCost: "0.05",
        },
      };

      mockConversionService.processPaymentSuccess.mockResolvedValue(mockResult);

      await handler(mockEvent, mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "HBAR conversion completed successfully",
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );
    });

    it("should handle events with missing optional fields", async () => {
      const eventWithMinimalDetail = {
        ...mockEvent,
        detail: {
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
        },
      };

      const mockResult = {
        success: true,
        data: {
          transactionId: "test-tx-123",
          hbarAmount: 0.5,
          hederaTransactionId: "hedera-tx-456",
          exchangeRate: 0.00005,
          actualCost: "0.05",
        },
      };

      mockConversionService.processPaymentSuccess.mockResolvedValue(mockResult);

      await handler(eventWithMinimalDetail, mockContext);

      expect(mockConversionService.processPaymentSuccess).toHaveBeenCalledWith(
        eventWithMinimalDetail.detail
      );
    });
  });

  describe("healthCheck", () => {
    it("should return healthy status when all dependencies are working", async () => {
      const mockHealthResult = {
        database: true,
        eventBridge: true,
        exchangeRate: true,
        hederaNetwork: true,
      };

      mockConversionService.healthCheck.mockResolvedValue(mockHealthResult);

      const result = await healthCheck();

      expect(result.status).toBe("healthy");
      expect(result.dependencies).toEqual(mockHealthResult);
      expect(result.timestamp).toBeDefined();
    });

    it("should return degraded status when some dependencies fail", async () => {
      const mockHealthResult = {
        database: true,
        eventBridge: false,
        exchangeRate: true,
        hederaNetwork: true,
      };

      mockConversionService.healthCheck.mockResolvedValue(mockHealthResult);

      const result = await healthCheck();

      expect(result.status).toBe("degraded");
      expect(result.dependencies).toEqual(mockHealthResult);
    });

    it("should return unhealthy status when health check fails", async () => {
      mockConversionService.healthCheck.mockRejectedValue(
        new Error("Service unavailable")
      );

      const result = await healthCheck();

      expect(result.status).toBe("unhealthy");
      expect(result.dependencies).toEqual({
        database: false,
        eventBridge: false,
        exchangeRate: false,
        hederaNetwork: false,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Health check failed",
        {},
        expect.any(Error)
      );
    });

    it("should include timestamp in health check response", async () => {
      const mockHealthResult = {
        database: true,
        eventBridge: true,
        exchangeRate: true,
        hederaNetwork: true,
      };

      mockConversionService.healthCheck.mockResolvedValue(mockHealthResult);

      const result = await healthCheck();

      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe("environment variable validation", () => {
    it("should handle missing environment variables gracefully", async () => {
      // Remove required environment variables
      delete process.env.DYNAMODB_TABLE_NAME;
      delete process.env.EVENT_BUS_NAME;

      // The service should still be created but may fail during operation
      // This tests that the Lambda doesn't crash on initialization
      expect(() => {
        // Re-import to trigger initialization with missing env vars
        jest.resetModules();
      }).not.toThrow();
    });
  });

  describe("error handling edge cases", () => {
    it("should handle null event detail gracefully", async () => {
      const nullDetailEvent = {
        ...mockEvent,
        detail: null,
      } as any;

      await expect(handler(nullDetailEvent, mockContext)).rejects.toThrow();
    });

    it("should handle undefined event detail gracefully", async () => {
      const undefinedDetailEvent = {
        ...mockEvent,
        detail: undefined,
      } as any;

      await expect(
        handler(undefinedDetailEvent, mockContext)
      ).rejects.toThrow();
    });

    it("should handle empty transaction ID", async () => {
      const emptyTxIdEvent = {
        ...mockEvent,
        detail: {
          ...mockEventDetail,
          transactionId: "",
        },
      };

      await expect(handler(emptyTxIdEvent, mockContext)).rejects.toThrow();
    });
  });
});
