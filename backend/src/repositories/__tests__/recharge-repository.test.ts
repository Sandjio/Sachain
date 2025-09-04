import { RechargeRepository } from "../recharge-repository";
import {
  RechargeTransaction,
  RechargeTransactionStatus,
} from "../../types/hbar-recharge";

// Mock the BaseRepository and AWS SDK
jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/lib-dynamodb");

describe("RechargeRepository", () => {
  let repository: RechargeRepository;
  let mockPutItem: jest.Mock;
  let mockGetItem: jest.Mock;
  let mockUpdateItem: jest.Mock;
  let mockQueryItems: jest.Mock;
  let mockBatchGetItems: jest.Mock;
  let mockBatchWriteItems: jest.Mock;
  let mockDeleteItem: jest.Mock;

  beforeEach(() => {
    // Mock the protected methods from BaseRepository
    mockPutItem = jest.fn();
    mockGetItem = jest.fn();
    mockUpdateItem = jest.fn();
    mockQueryItems = jest.fn();
    mockBatchGetItems = jest.fn();
    mockBatchWriteItems = jest.fn();
    mockDeleteItem = jest.fn();

    repository = new RechargeRepository({
      tableName: "test-table",
      region: "us-east-1",
    });

    // Override the protected methods
    (repository as any).putItem = mockPutItem;
    (repository as any).getItem = mockGetItem;
    (repository as any).updateItem = mockUpdateItem;
    (repository as any).queryItems = mockQueryItems;
    (repository as any).batchGetItems = mockBatchGetItems;
    (repository as any).batchWriteItems = mockBatchWriteItems;
    (repository as any).deleteItem = mockDeleteItem;

    // Mock generateId and generateTimestamp
    jest
      .spyOn(repository as any, "generateId")
      .mockReturnValue("test-transaction-id");
    jest
      .spyOn(repository as any, "generateTimestamp")
      .mockReturnValue("2024-01-01T00:00:00.000Z");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createRechargeTransaction", () => {
    it("should create a new recharge transaction with correct structure", async () => {
      const input = {
        userId: "user123",
        userHederaAccountId: "0.0.123456",
        xafAmount: 10000,
        orangeMoneyFee: 100,
        platformFee: 50,
        totalFees: 150,
      };

      const result = await repository.createRechargeTransaction(input);

      expect(mockPutItem).toHaveBeenCalledWith({
        PK: "USER#user123",
        SK: "RECHARGE#test-transaction-id",
        transactionId: "test-transaction-id",
        userId: "user123",
        userHederaAccountId: "0.0.123456",
        xafAmount: 10000,
        orangeMoneyFee: 100,
        platformFee: 50,
        totalFees: 150,
        status: "initiated",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        retryCount: 0,
        GSI1PK: "RECHARGE_STATUS#initiated",
        GSI1SK: "2024-01-01T00:00:00.000Z",
      });

      expect(result.transactionId).toBe("test-transaction-id");
      expect(result.status).toBe("initiated");
    });
  });

  describe("getRechargeTransaction", () => {
    it("should retrieve a recharge transaction by ID and user ID", async () => {
      const mockTransaction: RechargeTransaction = {
        PK: "USER#user123",
        SK: "RECHARGE#transaction123",
        transactionId: "transaction123",
        userId: "user123",
        userHederaAccountId: "0.0.123456",
        xafAmount: 10000,
        orangeMoneyFee: 100,
        platformFee: 50,
        totalFees: 150,
        status: "completed",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T01:00:00.000Z",
        retryCount: 0,
        GSI1PK: "RECHARGE_STATUS#completed",
        GSI1SK: "2024-01-01T00:00:00.000Z",
      };

      mockGetItem.mockResolvedValue(mockTransaction);

      const result = await repository.getRechargeTransaction(
        "transaction123",
        "user123"
      );

      expect(mockGetItem).toHaveBeenCalledWith(
        "USER#user123",
        "RECHARGE#transaction123"
      );
      expect(result).toEqual(mockTransaction);
    });

    it("should return null when transaction not found", async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await repository.getRechargeTransaction(
        "nonexistent",
        "user123"
      );

      expect(result).toBeNull();
    });
  });

  describe("updateRechargeTransaction", () => {
    it("should update transaction status and GSI1PK", async () => {
      const input = {
        transactionId: "transaction123",
        userId: "user123",
        status: "completed" as RechargeTransactionStatus,
        hbarAmount: 50.5,
        exchangeRate: 0.005,
      };

      await repository.updateRechargeTransaction(input);

      expect(mockUpdateItem).toHaveBeenCalledWith(
        "USER#user123",
        "RECHARGE#transaction123",
        "SET #updatedAt = :updatedAt, #status = :status, #GSI1PK = :GSI1PK, #hbarAmount = :hbarAmount, #exchangeRate = :exchangeRate",
        {
          "#updatedAt": "updatedAt",
          "#status": "status",
          "#GSI1PK": "GSI1PK",
          "#hbarAmount": "hbarAmount",
          "#exchangeRate": "exchangeRate",
        },
        {
          ":updatedAt": "2024-01-01T00:00:00.000Z",
          ":status": "completed",
          ":GSI1PK": "RECHARGE_STATUS#completed",
          ":hbarAmount": 50.5,
          ":exchangeRate": 0.005,
        }
      );
    });

    it("should update only provided fields", async () => {
      const input = {
        transactionId: "transaction123",
        userId: "user123",
        errorMessage: "Network error",
        retryCount: 3,
      };

      await repository.updateRechargeTransaction(input);

      expect(mockUpdateItem).toHaveBeenCalledWith(
        "USER#user123",
        "RECHARGE#transaction123",
        "SET #updatedAt = :updatedAt, #errorMessage = :errorMessage, #retryCount = :retryCount",
        {
          "#updatedAt": "updatedAt",
          "#errorMessage": "errorMessage",
          "#retryCount": "retryCount",
        },
        {
          ":updatedAt": "2024-01-01T00:00:00.000Z",
          ":errorMessage": "Network error",
          ":retryCount": 3,
        }
      );
    });
  });

  describe("getUserRechargeTransactions", () => {
    it("should query user transactions with pagination", async () => {
      const mockResult = {
        items: [],
        lastEvaluatedKey: undefined,
        count: 0,
      };

      mockQueryItems.mockResolvedValue(mockResult);

      const options = { limit: 10 };
      const result = await repository.getUserRechargeTransactions(
        "user123",
        options
      );

      expect(mockQueryItems).toHaveBeenCalledWith(
        "#PK = :pk AND begins_with(#SK, :skPrefix)",
        {
          "#PK": "PK",
          "#SK": "SK",
        },
        {
          ":pk": "USER#user123",
          ":skPrefix": "RECHARGE#",
        },
        undefined,
        options
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe("getRechargeTransactionsByStatus", () => {
    it("should query transactions by status using GSI", async () => {
      const mockResult = {
        items: [],
        lastEvaluatedKey: undefined,
        count: 0,
      };

      mockQueryItems.mockResolvedValue(mockResult);

      const result = await repository.getRechargeTransactionsByStatus(
        "payment_confirmed"
      );

      expect(mockQueryItems).toHaveBeenCalledWith(
        "#GSI1PK = :gsi1pk",
        {
          "#GSI1PK": "GSI1PK",
        },
        {
          ":gsi1pk": "RECHARGE_STATUS#payment_confirmed",
        },
        "GSI1",
        undefined
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe("getRechargeTransactionsByStatusAndDateRange", () => {
    it("should query transactions by status and date range using GSI", async () => {
      const mockResult = {
        items: [],
        lastEvaluatedKey: undefined,
        count: 0,
      };

      mockQueryItems.mockResolvedValue(mockResult);

      const dateFrom = "2024-01-01T00:00:00.000Z";
      const dateTo = "2024-01-31T23:59:59.999Z";

      const result =
        await repository.getRechargeTransactionsByStatusAndDateRange(
          "completed",
          dateFrom,
          dateTo
        );

      expect(mockQueryItems).toHaveBeenCalledWith(
        "#GSI1PK = :gsi1pk AND #GSI1SK BETWEEN :dateFrom AND :dateTo",
        {
          "#GSI1PK": "GSI1PK",
          "#GSI1SK": "GSI1SK",
        },
        {
          ":gsi1pk": "RECHARGE_STATUS#completed",
          ":dateFrom": dateFrom,
          ":dateTo": dateTo,
        },
        "GSI1",
        undefined
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe("batchGetRechargeTransactions", () => {
    it("should batch get multiple transactions", async () => {
      const transactions = [
        { transactionId: "tx1", userId: "user1" },
        { transactionId: "tx2", userId: "user2" },
      ];

      const mockResult: RechargeTransaction[] = [];
      mockBatchGetItems.mockResolvedValue(mockResult);

      const result = await repository.batchGetRechargeTransactions(
        transactions
      );

      expect(mockBatchGetItems).toHaveBeenCalledWith([
        { PK: "USER#user1", SK: "RECHARGE#tx1" },
        { PK: "USER#user2", SK: "RECHARGE#tx2" },
      ]);

      expect(result).toEqual(mockResult);
    });
  });

  describe("batchCreateRechargeTransactions", () => {
    it("should batch create multiple transactions", async () => {
      const inputs = [
        {
          userId: "user1",
          userHederaAccountId: "0.0.123456",
          xafAmount: 10000,
          orangeMoneyFee: 100,
          platformFee: 50,
          totalFees: 150,
        },
        {
          userId: "user2",
          userHederaAccountId: "0.0.789012",
          xafAmount: 20000,
          orangeMoneyFee: 200,
          platformFee: 100,
          totalFees: 300,
        },
      ];

      const result = await repository.batchCreateRechargeTransactions(inputs);

      expect(mockBatchWriteItems).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            PK: "USER#user1",
            SK: "RECHARGE#test-transaction-id",
            userId: "user1",
            xafAmount: 10000,
          }),
          expect.objectContaining({
            PK: "USER#user2",
            SK: "RECHARGE#test-transaction-id",
            userId: "user2",
            xafAmount: 20000,
          }),
        ])
      );

      expect(result).toHaveLength(2);
    });
  });

  describe("getUserDailyRechargeTotal", () => {
    it("should calculate daily recharge total for a user", async () => {
      const mockTransactions: RechargeTransaction[] = [
        {
          PK: "USER#user123",
          SK: "RECHARGE#tx1",
          transactionId: "tx1",
          userId: "user123",
          userHederaAccountId: "0.0.123456",
          xafAmount: 5000,
          orangeMoneyFee: 50,
          platformFee: 25,
          totalFees: 75,
          status: "completed",
          createdAt: "2024-01-01T10:00:00.000Z",
          updatedAt: "2024-01-01T10:30:00.000Z",
          retryCount: 0,
          GSI1PK: "RECHARGE_STATUS#completed",
          GSI1SK: "2024-01-01T10:00:00.000Z",
        },
        {
          PK: "USER#user123",
          SK: "RECHARGE#tx2",
          transactionId: "tx2",
          userId: "user123",
          userHederaAccountId: "0.0.123456",
          xafAmount: 3000,
          orangeMoneyFee: 30,
          platformFee: 15,
          totalFees: 45,
          status: "completed",
          createdAt: "2024-01-01T14:00:00.000Z",
          updatedAt: "2024-01-01T14:30:00.000Z",
          retryCount: 0,
          GSI1PK: "RECHARGE_STATUS#completed",
          GSI1SK: "2024-01-01T14:00:00.000Z",
        },
        {
          PK: "USER#user123",
          SK: "RECHARGE#tx3",
          transactionId: "tx3",
          userId: "user123",
          userHederaAccountId: "0.0.123456",
          xafAmount: 2000,
          orangeMoneyFee: 20,
          platformFee: 10,
          totalFees: 30,
          status: "failed",
          createdAt: "2024-01-01T16:00:00.000Z",
          updatedAt: "2024-01-01T16:30:00.000Z",
          retryCount: 3,
          GSI1PK: "RECHARGE_STATUS#failed",
          GSI1SK: "2024-01-01T16:00:00.000Z",
        },
      ];

      mockQueryItems.mockResolvedValue({
        items: mockTransactions,
        lastEvaluatedKey: undefined,
        count: 3,
      });

      const total = await repository.getUserDailyRechargeTotal(
        "user123",
        "2024-01-01"
      );

      expect(total).toBe(8000); // 5000 + 3000, excluding failed transaction
    });
  });

  describe("cacheExchangeRate", () => {
    it("should cache exchange rate with TTL", async () => {
      const input = {
        rate: 0.005,
        source: "CoinGecko",
        confidence: "high" as const,
        ttlSeconds: 300,
      };

      await repository.cacheExchangeRate(input);

      expect(mockPutItem).toHaveBeenCalledWith({
        PK: "EXCHANGE_RATE",
        SK: "XAF_HBAR",
        rate: 0.005,
        source: "CoinGecko",
        lastUpdated: "2024-01-01T00:00:00.000Z",
        expiresAt: expect.any(String),
        confidence: "high",
      });
    });
  });

  describe("getCachedExchangeRate", () => {
    it("should return cached exchange rate if not expired", async () => {
      const futureDate = new Date(Date.now() + 300000).toISOString(); // 5 minutes in future
      const mockCache = {
        PK: "EXCHANGE_RATE",
        SK: "XAF_HBAR",
        rate: 0.005,
        source: "CoinGecko",
        lastUpdated: "2024-01-01T00:00:00.000Z",
        expiresAt: futureDate,
        confidence: "high" as const,
      };

      mockGetItem.mockResolvedValue(mockCache);

      const result = await repository.getCachedExchangeRate();

      expect(result).toEqual(mockCache);
    });

    it("should return null if cache is expired", async () => {
      const pastDate = new Date(Date.now() - 300000).toISOString(); // 5 minutes in past
      const mockCache = {
        PK: "EXCHANGE_RATE",
        SK: "XAF_HBAR",
        rate: 0.005,
        source: "CoinGecko",
        lastUpdated: "2024-01-01T00:00:00.000Z",
        expiresAt: pastDate,
        confidence: "high" as const,
      };

      mockGetItem.mockResolvedValue(mockCache);

      const result = await repository.getCachedExchangeRate();

      expect(result).toBeNull();
    });

    it("should return null if no cache exists", async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await repository.getCachedExchangeRate();

      expect(result).toBeNull();
    });
  });

  describe("deleteExpiredExchangeRateCache", () => {
    it("should delete exchange rate cache", async () => {
      await repository.deleteExpiredExchangeRateCache();

      expect(mockDeleteItem).toHaveBeenCalledWith("EXCHANGE_RATE", "XAF_HBAR");
    });
  });

  describe("getTransactionStatistics", () => {
    it("should calculate transaction statistics", async () => {
      const mockTransactions: RechargeTransaction[] = [
        {
          PK: "USER#user1",
          SK: "RECHARGE#tx1",
          transactionId: "tx1",
          userId: "user1",
          userHederaAccountId: "0.0.123456",
          xafAmount: 10000,
          hbarAmount: 50,
          orangeMoneyFee: 100,
          platformFee: 50,
          totalFees: 150,
          status: "completed",
          createdAt: "2024-01-01T10:00:00.000Z",
          updatedAt: "2024-01-01T10:30:00.000Z",
          completedAt: "2024-01-01T10:30:00.000Z",
          retryCount: 0,
          GSI1PK: "RECHARGE_STATUS#completed",
          GSI1SK: "2024-01-01T10:00:00.000Z",
        },
        {
          PK: "USER#user2",
          SK: "RECHARGE#tx2",
          transactionId: "tx2",
          userId: "user2",
          userHederaAccountId: "0.0.789012",
          xafAmount: 5000,
          orangeMoneyFee: 50,
          platformFee: 25,
          totalFees: 75,
          status: "failed",
          createdAt: "2024-01-01T14:00:00.000Z",
          updatedAt: "2024-01-01T14:30:00.000Z",
          retryCount: 3,
          GSI1PK: "RECHARGE_STATUS#failed",
          GSI1SK: "2024-01-01T14:00:00.000Z",
        },
      ];

      // Mock multiple calls for different statuses
      mockQueryItems
        .mockResolvedValueOnce({ items: [mockTransactions[0]], count: 1 }) // completed
        .mockResolvedValueOnce({ items: [mockTransactions[1]], count: 1 }) // failed
        .mockResolvedValue({ items: [], count: 0 }); // other statuses

      const result = await repository.getTransactionStatistics(
        "2024-01-01T00:00:00.000Z",
        "2024-01-31T23:59:59.999Z"
      );

      expect(result).toEqual({
        totalTransactions: 2,
        successfulTransactions: 1,
        failedTransactions: 1,
        totalXAFAmount: 15000,
        totalHBARAmount: 50,
        averageProcessingTime: 1800, // 30 minutes in seconds
      });
    });
  });
});
