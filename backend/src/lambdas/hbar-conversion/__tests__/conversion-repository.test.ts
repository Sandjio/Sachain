/**
 * Unit tests for Conversion Repository
 */

import { ConversionRepository } from "../conversion-repository";
import { BaseRepository } from "../../../repositories/base-repository";
import { RechargeTransaction } from "../../../types/hbar-recharge";

// Mock BaseRepository
jest.mock("../../../repositories/base-repository");

const MockBaseRepository = BaseRepository as jest.MockedClass<
  typeof BaseRepository
>;

describe("ConversionRepository", () => {
  let repository: ConversionRepository;
  let mockBaseRepository: jest.Mocked<BaseRepository>;

  const mockConfig = {
    tableName: "test-table",
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

    // Create mock instance
    mockBaseRepository = {
      getItem: jest.fn(),
      updateItem: jest.fn(),
      queryGSI: jest.fn(),
      deleteItem: jest.fn(),
    } as any;

    // Mock the BaseRepository constructor to return our mock
    MockBaseRepository.mockImplementation(() => mockBaseRepository);

    repository = new ConversionRepository(mockConfig);
  });

  describe("getTransaction", () => {
    it("should successfully retrieve a transaction", async () => {
      mockBaseRepository.getItem.mockResolvedValue(mockTransaction);

      const result = await repository.getTransaction("test-tx-123", "user-123");

      expect(result).toEqual(mockTransaction);
      expect(mockBaseRepository.getItem).toHaveBeenCalledWith(
        "USER#user-123",
        "RECHARGE#test-tx-123"
      );
    });

    it("should return null when transaction is not found", async () => {
      mockBaseRepository.getItem.mockResolvedValue(null);

      const result = await repository.getTransaction(
        "nonexistent-tx",
        "user-123"
      );

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      mockBaseRepository.getItem.mockRejectedValue(new Error("DynamoDB error"));

      await expect(
        repository.getTransaction("test-tx-123", "user-123")
      ).rejects.toThrow("Database error while retrieving transaction");
    });
  });

  describe("updateTransactionStatus", () => {
    it("should successfully update transaction status", async () => {
      mockBaseRepository.updateItem.mockResolvedValue();

      await repository.updateTransactionStatus(
        "test-tx-123",
        "user-123",
        "completed",
        { hederaTransactionId: "hedera-tx-123" }
      );

      expect(mockBaseRepository.updateItem).toHaveBeenCalledWith(
        "USER#user-123",
        "RECHARGE#test-tx-123",
        expect.stringContaining("SET #status = :status"),
        expect.objectContaining({
          "#status": "status",
          "#updatedAt": "updatedAt",
        }),
        expect.objectContaining({
          ":status": "completed",
          ":updatedAt": expect.any(String),
        })
      );
    });

    it("should handle additional updates", async () => {
      mockBaseRepository.updateItem.mockResolvedValue();

      await repository.updateTransactionStatus(
        "test-tx-123",
        "user-123",
        "failed",
        {
          errorMessage: "Transfer failed",
          retryCount: 1,
          GSI1PK: "RECHARGE_STATUS#failed",
        }
      );

      expect(mockBaseRepository.updateItem).toHaveBeenCalledWith(
        "USER#user-123",
        "RECHARGE#test-tx-123",
        expect.stringContaining("SET #status = :status"),
        expect.any(Object),
        expect.objectContaining({
          ":status": "failed",
        })
      );
    });

    it("should handle database errors", async () => {
      mockBaseRepository.updateItem.mockRejectedValue(
        new Error("DynamoDB error")
      );

      await expect(
        repository.updateTransactionStatus(
          "test-tx-123",
          "user-123",
          "completed"
        )
      ).rejects.toThrow("Database error while updating transaction status");
    });
  });

  describe("getTransactionsByStatus", () => {
    it("should successfully retrieve transactions by status", async () => {
      const mockTransactions = [mockTransaction];
      mockBaseRepository.queryGSI.mockResolvedValue(mockTransactions);

      const result = await repository.getTransactionsByStatus("completed", 10);

      expect(result).toEqual(mockTransactions);
      expect(mockBaseRepository.queryGSI).toHaveBeenCalledWith(
        "GSI1",
        "RECHARGE_STATUS#completed",
        undefined,
        10
      );
    });

    it("should use default limit when not specified", async () => {
      mockBaseRepository.queryGSI.mockResolvedValue([]);

      await repository.getTransactionsByStatus("failed");

      expect(mockBaseRepository.queryGSI).toHaveBeenCalledWith(
        "GSI1",
        "RECHARGE_STATUS#failed",
        undefined,
        50
      );
    });

    it("should handle database errors", async () => {
      mockBaseRepository.queryGSI.mockRejectedValue(
        new Error("DynamoDB error")
      );

      await expect(
        repository.getTransactionsByStatus("completed")
      ).rejects.toThrow("Database error while querying transactions by status");
    });
  });

  describe("getFailedTransactionsForRetry", () => {
    it("should return failed transactions within retry limit", async () => {
      const failedTransactions = [
        { ...mockTransaction, status: "failed", retryCount: 2 },
        { ...mockTransaction, status: "failed", retryCount: 5 }, // Should be filtered out
        { ...mockTransaction, status: "failed", retryCount: 1 },
      ];

      mockBaseRepository.queryGSI.mockResolvedValue(failedTransactions);

      const result = await repository.getFailedTransactionsForRetry(5, 20);

      expect(result).toHaveLength(2);
      expect(result.every((tx) => tx.retryCount < 5)).toBe(true);
    });

    it("should respect the limit parameter", async () => {
      const failedTransactions = Array(10)
        .fill(null)
        .map((_, i) => ({
          ...mockTransaction,
          status: "failed",
          retryCount: i % 3, // Mix of retry counts
          transactionId: `tx-${i}`,
        }));

      mockBaseRepository.queryGSI.mockResolvedValue(failedTransactions);

      const result = await repository.getFailedTransactionsForRetry(5, 3);

      expect(result).toHaveLength(3);
    });

    it("should handle database errors", async () => {
      mockBaseRepository.queryGSI.mockRejectedValue(
        new Error("DynamoDB error")
      );

      await expect(repository.getFailedTransactionsForRetry()).rejects.toThrow(
        "Database error while querying failed transactions"
      );
    });
  });

  describe("getConversionStats", () => {
    it("should calculate conversion statistics correctly", async () => {
      const mockTransactions = [
        {
          ...mockTransaction,
          status: "completed",
          xafAmount: 5000,
          hbarAmount: 0.25,
        },
        {
          ...mockTransaction,
          status: "completed",
          xafAmount: 3000,
          hbarAmount: 0.15,
        },
        { ...mockTransaction, status: "failed", xafAmount: 2000 },
        { ...mockTransaction, status: "converting", xafAmount: 1000 },
      ];

      // Mock multiple calls for different statuses
      mockBaseRepository.queryGSI
        .mockResolvedValueOnce([]) // initiated
        .mockResolvedValueOnce([]) // payment_confirmed
        .mockResolvedValueOnce([mockTransactions[3]]) // converting
        .mockResolvedValueOnce([mockTransactions[0], mockTransactions[1]]) // completed
        .mockResolvedValueOnce([mockTransactions[2]]); // failed

      const result = await repository.getConversionStats(
        "2024-01-01T00:00:00.000Z",
        "2024-01-02T00:00:00.000Z"
      );

      expect(result).toEqual({
        totalTransactions: 4,
        completedTransactions: 2,
        failedTransactions: 1,
        totalXAFAmount: 11000,
        totalHBARAmount: 0.4,
      });
    });

    it("should handle empty results", async () => {
      mockBaseRepository.queryGSI.mockResolvedValue([]);

      const result = await repository.getConversionStats(
        "2024-01-01T00:00:00.000Z",
        "2024-01-02T00:00:00.000Z"
      );

      expect(result).toEqual({
        totalTransactions: 0,
        completedTransactions: 0,
        failedTransactions: 0,
        totalXAFAmount: 0,
        totalHBARAmount: 0,
      });
    });

    it("should handle database errors", async () => {
      mockBaseRepository.queryGSI.mockRejectedValue(
        new Error("DynamoDB error")
      );

      await expect(
        repository.getConversionStats(
          "2024-01-01T00:00:00.000Z",
          "2024-01-02T00:00:00.000Z"
        )
      ).rejects.toThrow(
        "Database error while calculating conversion statistics"
      );
    });
  });

  describe("getStuckConversions", () => {
    it("should return transactions stuck in converting status", async () => {
      const now = new Date();
      const stuckTime = new Date(now.getTime() - 45 * 60 * 1000); // 45 minutes ago
      const recentTime = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago

      const convertingTransactions = [
        {
          ...mockTransaction,
          status: "converting",
          updatedAt: stuckTime.toISOString(),
        },
        {
          ...mockTransaction,
          status: "converting",
          updatedAt: recentTime.toISOString(),
        },
      ];

      mockBaseRepository.queryGSI.mockResolvedValue(convertingTransactions);

      const result = await repository.getStuckConversions(30, 50);

      expect(result).toHaveLength(1);
      expect(result[0].updatedAt).toBe(stuckTime.toISOString());
    });

    it("should handle database errors", async () => {
      mockBaseRepository.queryGSI.mockRejectedValue(
        new Error("DynamoDB error")
      );

      await expect(repository.getStuckConversions()).rejects.toThrow(
        "Database error while querying stuck conversions"
      );
    });
  });

  describe("healthCheck", () => {
    it("should pass when database is accessible", async () => {
      mockBaseRepository.queryGSI.mockResolvedValue([]);

      await expect(repository.healthCheck()).resolves.not.toThrow();
    });

    it("should fail when database is not accessible", async () => {
      mockBaseRepository.queryGSI.mockRejectedValue(
        new Error("Connection failed")
      );

      await expect(repository.healthCheck()).rejects.toThrow(
        "Database health check failed"
      );
    });
  });

  describe("cleanupOldTransactions", () => {
    it("should delete old completed transactions", async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const oldTransactions = [
        {
          ...mockTransaction,
          status: "completed",
          completedAt: oldDate.toISOString(),
          transactionId: "old-tx-1",
        },
        {
          ...mockTransaction,
          status: "completed",
          completedAt: oldDate.toISOString(),
          transactionId: "old-tx-2",
        },
      ];

      mockBaseRepository.queryGSI.mockResolvedValue(oldTransactions);
      mockBaseRepository.deleteItem.mockResolvedValue();

      const result = await repository.cleanupOldTransactions(90, 25);

      expect(result).toBe(2);
      expect(mockBaseRepository.deleteItem).toHaveBeenCalledTimes(2);
    });

    it("should handle deletion errors gracefully", async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const oldTransactions = [
        {
          ...mockTransaction,
          status: "completed",
          completedAt: oldDate.toISOString(),
          transactionId: "old-tx-1",
        },
        {
          ...mockTransaction,
          status: "completed",
          completedAt: oldDate.toISOString(),
          transactionId: "old-tx-2",
        },
      ];

      mockBaseRepository.queryGSI.mockResolvedValue(oldTransactions);
      mockBaseRepository.deleteItem
        .mockResolvedValueOnce() // First deletion succeeds
        .mockRejectedValueOnce(new Error("Delete failed")); // Second deletion fails

      const result = await repository.cleanupOldTransactions(90, 25);

      expect(result).toBe(1); // Only one successful deletion
    });

    it("should handle database errors", async () => {
      mockBaseRepository.queryGSI.mockRejectedValue(
        new Error("DynamoDB error")
      );

      await expect(repository.cleanupOldTransactions()).rejects.toThrow(
        "Database error during cleanup operation"
      );
    });
  });
});
