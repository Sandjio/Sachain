import { BaseRepository, DynamoDBConfig } from "./base-repository";
import {
  RechargeTransaction,
  RechargeTransactionStatus,
  ExchangeRateCache,
  FeeBreakdown,
} from "../types/hbar-recharge";
import { QueryResult, PaginationOptions } from "../models";

export interface CreateRechargeTransactionInput {
  userId: string;
  userHederaAccountId: string;
  xafAmount: number;
  orangeMoneyFee: number;
  platformFee: number;
  totalFees: number;
}

export interface UpdateRechargeTransactionInput {
  transactionId: string;
  userId: string;
  status?: RechargeTransactionStatus;
  hbarAmount?: number;
  exchangeRate?: number;
  orangeMoneyTransactionId?: string;
  hederaTransactionId?: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount?: number;
}

export interface RechargeTransactionQuery {
  userId?: string;
  status?: RechargeTransactionStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExchangeRateCacheInput {
  rate: number;
  source: string;
  confidence: "high" | "medium" | "low";
  ttlSeconds: number;
}

export class RechargeRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }

  /**
   * Create a new recharge transaction
   */
  async createRechargeTransaction(
    input: CreateRechargeTransactionInput
  ): Promise<RechargeTransaction> {
    const transactionId = this.generateId();
    const timestamp = this.generateTimestamp();

    const transaction: RechargeTransaction = {
      PK: `USER#${input.userId}`,
      SK: `RECHARGE#${transactionId}`,
      transactionId,
      userId: input.userId,
      userHederaAccountId: input.userHederaAccountId,
      xafAmount: input.xafAmount,
      orangeMoneyFee: input.orangeMoneyFee,
      platformFee: input.platformFee,
      totalFees: input.totalFees,
      status: "initiated",
      createdAt: timestamp,
      updatedAt: timestamp,
      retryCount: 0,
      GSI1PK: "RECHARGE_STATUS#initiated",
      GSI1SK: timestamp,
    };

    await this.putItem(transaction);
    return transaction;
  }

  /**
   * Get a recharge transaction by ID and user ID
   */
  async getRechargeTransaction(
    transactionId: string,
    userId: string
  ): Promise<RechargeTransaction | null> {
    return await this.getItem<RechargeTransaction>(
      `USER#${userId}`,
      `RECHARGE#${transactionId}`
    );
  }

  /**
   * Update a recharge transaction
   */
  async updateRechargeTransaction(
    input: UpdateRechargeTransactionInput
  ): Promise<void> {
    const timestamp = this.generateTimestamp();
    const updateExpressions: string[] = ["#updatedAt = :updatedAt"];
    const expressionAttributeNames: Record<string, string> = {
      "#updatedAt": "updatedAt",
    };
    const expressionAttributeValues: Record<string, any> = {
      ":updatedAt": timestamp,
    };

    // Build dynamic update expression based on provided fields
    if (input.status !== undefined) {
      updateExpressions.push("#status = :status");
      updateExpressions.push("#GSI1PK = :GSI1PK");
      expressionAttributeNames["#status"] = "status";
      expressionAttributeNames["#GSI1PK"] = "GSI1PK";
      expressionAttributeValues[":status"] = input.status;
      expressionAttributeValues[":GSI1PK"] = `RECHARGE_STATUS#${input.status}`;
    }

    if (input.hbarAmount !== undefined) {
      updateExpressions.push("#hbarAmount = :hbarAmount");
      expressionAttributeNames["#hbarAmount"] = "hbarAmount";
      expressionAttributeValues[":hbarAmount"] = input.hbarAmount;
    }

    if (input.exchangeRate !== undefined) {
      updateExpressions.push("#exchangeRate = :exchangeRate");
      expressionAttributeNames["#exchangeRate"] = "exchangeRate";
      expressionAttributeValues[":exchangeRate"] = input.exchangeRate;
    }

    if (input.orangeMoneyTransactionId !== undefined) {
      updateExpressions.push(
        "#orangeMoneyTransactionId = :orangeMoneyTransactionId"
      );
      expressionAttributeNames["#orangeMoneyTransactionId"] =
        "orangeMoneyTransactionId";
      expressionAttributeValues[":orangeMoneyTransactionId"] =
        input.orangeMoneyTransactionId;
    }

    if (input.hederaTransactionId !== undefined) {
      updateExpressions.push("#hederaTransactionId = :hederaTransactionId");
      expressionAttributeNames["#hederaTransactionId"] = "hederaTransactionId";
      expressionAttributeValues[":hederaTransactionId"] =
        input.hederaTransactionId;
    }

    if (input.completedAt !== undefined) {
      updateExpressions.push("#completedAt = :completedAt");
      expressionAttributeNames["#completedAt"] = "completedAt";
      expressionAttributeValues[":completedAt"] = input.completedAt;
    }

    if (input.errorMessage !== undefined) {
      updateExpressions.push("#errorMessage = :errorMessage");
      expressionAttributeNames["#errorMessage"] = "errorMessage";
      expressionAttributeValues[":errorMessage"] = input.errorMessage;
    }

    if (input.retryCount !== undefined) {
      updateExpressions.push("#retryCount = :retryCount");
      expressionAttributeNames["#retryCount"] = "retryCount";
      expressionAttributeValues[":retryCount"] = input.retryCount;
    }

    const updateExpression = `SET ${updateExpressions.join(", ")}`;

    await this.updateItem(
      `USER#${input.userId}`,
      `RECHARGE#${input.transactionId}`,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );
  }

  /**
   * Get recharge transactions for a user with pagination
   */
  async getUserRechargeTransactions(
    userId: string,
    options?: PaginationOptions
  ): Promise<QueryResult<RechargeTransaction>> {
    return await this.queryItems<RechargeTransaction>(
      "#PK = :pk AND begins_with(#SK, :skPrefix)",
      {
        "#PK": "PK",
        "#SK": "SK",
      },
      {
        ":pk": `USER#${userId}`,
        ":skPrefix": "RECHARGE#",
      },
      undefined,
      options
    );
  }

  /**
   * Get recharge transactions by status using GSI
   */
  async getRechargeTransactionsByStatus(
    status: RechargeTransactionStatus,
    options?: PaginationOptions
  ): Promise<QueryResult<RechargeTransaction>> {
    return await this.queryItems<RechargeTransaction>(
      "#GSI1PK = :gsi1pk",
      {
        "#GSI1PK": "GSI1PK",
      },
      {
        ":gsi1pk": `RECHARGE_STATUS#${status}`,
      },
      "GSI1",
      options
    );
  }

  /**
   * Get recharge transactions by status within a date range using GSI
   */
  async getRechargeTransactionsByStatusAndDateRange(
    status: RechargeTransactionStatus,
    dateFrom: string,
    dateTo: string,
    options?: PaginationOptions
  ): Promise<QueryResult<RechargeTransaction>> {
    return await this.queryItems<RechargeTransaction>(
      "#GSI1PK = :gsi1pk AND #GSI1SK BETWEEN :dateFrom AND :dateTo",
      {
        "#GSI1PK": "GSI1PK",
        "#GSI1SK": "GSI1SK",
      },
      {
        ":gsi1pk": `RECHARGE_STATUS#${status}`,
        ":dateFrom": dateFrom,
        ":dateTo": dateTo,
      },
      "GSI1",
      options
    );
  }

  /**
   * Batch get recharge transactions by transaction IDs and user IDs
   */
  async batchGetRechargeTransactions(
    transactions: Array<{ transactionId: string; userId: string }>
  ): Promise<RechargeTransaction[]> {
    const keys = transactions.map(({ transactionId, userId }) => ({
      PK: `USER#${userId}`,
      SK: `RECHARGE#${transactionId}`,
    }));

    return await this.batchGetItems<RechargeTransaction>(keys);
  }

  /**
   * Batch create recharge transactions
   */
  async batchCreateRechargeTransactions(
    inputs: CreateRechargeTransactionInput[]
  ): Promise<RechargeTransaction[]> {
    const timestamp = this.generateTimestamp();
    const transactions: RechargeTransaction[] = inputs.map((input) => {
      const transactionId = this.generateId();
      return {
        PK: `USER#${input.userId}`,
        SK: `RECHARGE#${transactionId}`,
        transactionId,
        userId: input.userId,
        userHederaAccountId: input.userHederaAccountId,
        xafAmount: input.xafAmount,
        orangeMoneyFee: input.orangeMoneyFee,
        platformFee: input.platformFee,
        totalFees: input.totalFees,
        status: "initiated",
        createdAt: timestamp,
        updatedAt: timestamp,
        retryCount: 0,
        GSI1PK: "RECHARGE_STATUS#initiated",
        GSI1SK: timestamp,
      };
    });

    await this.batchWriteItems(transactions);
    return transactions;
  }

  /**
   * Get user's daily recharge total for limit checking
   */
  async getUserDailyRechargeTotal(
    userId: string,
    date: string
  ): Promise<number> {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const result = await this.queryItems<RechargeTransaction>(
      "#PK = :pk AND begins_with(#SK, :skPrefix)",
      {
        "#PK": "PK",
        "#SK": "SK",
        "#createdAt": "createdAt",
      },
      {
        ":pk": `USER#${userId}`,
        ":skPrefix": "RECHARGE#",
        ":startOfDay": startOfDay,
        ":endOfDay": endOfDay,
      }
    );

    // Filter by date range and sum XAF amounts for non-failed transactions
    return result.items
      .filter(
        (transaction) =>
          transaction.createdAt >= startOfDay &&
          transaction.createdAt <= endOfDay &&
          transaction.status !== "failed"
      )
      .reduce((total, transaction) => total + transaction.xafAmount, 0);
  }

  /**
   * Cache exchange rate with TTL
   */
  async cacheExchangeRate(input: ExchangeRateCacheInput): Promise<void> {
    const timestamp = this.generateTimestamp();
    const expiresAt = new Date(
      Date.now() + input.ttlSeconds * 1000
    ).toISOString();

    const cacheItem: ExchangeRateCache = {
      PK: "EXCHANGE_RATE",
      SK: "XAF_HBAR",
      rate: input.rate,
      source: input.source,
      lastUpdated: timestamp,
      expiresAt,
      confidence: input.confidence,
    };

    await this.putItem(cacheItem);
  }

  /**
   * Get cached exchange rate
   */
  async getCachedExchangeRate(): Promise<ExchangeRateCache | null> {
    const cached = await this.getItem<ExchangeRateCache>(
      "EXCHANGE_RATE",
      "XAF_HBAR"
    );

    // Check if cache is expired
    if (cached && new Date(cached.expiresAt) < new Date()) {
      return null;
    }

    return cached;
  }

  /**
   * Delete expired exchange rate cache
   */
  async deleteExpiredExchangeRateCache(): Promise<void> {
    await this.deleteItem("EXCHANGE_RATE", "XAF_HBAR");
  }

  /**
   * Get transaction statistics for monitoring
   */
  async getTransactionStatistics(
    dateFrom: string,
    dateTo: string
  ): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalXAFAmount: number;
    totalHBARAmount: number;
    averageProcessingTime: number;
  }> {
    // Query all transactions in date range using GSI
    const allStatuses: RechargeTransactionStatus[] = [
      "initiated",
      "payment_confirmed",
      "converting",
      "completed",
      "failed",
    ];

    let allTransactions: RechargeTransaction[] = [];

    for (const status of allStatuses) {
      const result = await this.getRechargeTransactionsByStatusAndDateRange(
        status,
        dateFrom,
        dateTo
      );
      allTransactions = allTransactions.concat(result.items);
    }

    const totalTransactions = allTransactions.length;
    const successfulTransactions = allTransactions.filter(
      (t) => t.status === "completed"
    ).length;
    const failedTransactions = allTransactions.filter(
      (t) => t.status === "failed"
    ).length;

    const totalXAFAmount = allTransactions.reduce(
      (sum, t) => sum + t.xafAmount,
      0
    );
    const totalHBARAmount = allTransactions.reduce(
      (sum, t) => sum + (t.hbarAmount || 0),
      0
    );

    // Calculate average processing time for completed transactions
    const completedTransactions = allTransactions.filter(
      (t) => t.status === "completed" && t.completedAt
    );
    const averageProcessingTime =
      completedTransactions.length > 0
        ? completedTransactions.reduce((sum, t) => {
            const processingTime =
              new Date(t.completedAt!).getTime() -
              new Date(t.createdAt).getTime();
            return sum + processingTime;
          }, 0) / completedTransactions.length
        : 0;

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      totalXAFAmount,
      totalHBARAmount,
      averageProcessingTime: Math.round(averageProcessingTime / 1000), // Convert to seconds
    };
  }
}
