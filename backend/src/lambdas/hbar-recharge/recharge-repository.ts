/**
 * HBAR Recharge Repository
 * Handles DynamoDB operations for recharge transactions
 */

import { BaseRepository } from "../../repositories/base-repository";
import { RechargeTransaction } from "../../types/hbar-recharge";
import { DailySpendingInfo } from "./types";

export class RechargeRepository extends BaseRepository {
  /**
   * Creates a new recharge transaction record
   */
  async createTransaction(transaction: RechargeTransaction): Promise<void> {
    await this.putItem(transaction);
  }

  /**
   * Gets a recharge transaction by ID and user ID
   */
  async getTransaction(
    transactionId: string,
    userId: string
  ): Promise<RechargeTransaction | null> {
    return await this.getItem<RechargeTransaction>(
      `USER#${userId}`,
      `RECHARGE#${transactionId}`
    );
  }

  /**
   * Updates transaction status and related fields
   */
  async updateTransactionStatus(
    transactionId: string,
    userId: string,
    status: string,
    updates: Partial<RechargeTransaction> = {}
  ): Promise<void> {
    const updateExpressions: string[] = [];
    const attributeNames: Record<string, string> = {};
    const attributeValues: Record<string, any> = {};

    // Always update status and updatedAt
    updateExpressions.push("#status = :status");
    updateExpressions.push("#updatedAt = :updatedAt");
    attributeNames["#status"] = "status";
    attributeNames["#updatedAt"] = "updatedAt";
    attributeValues[":status"] = status;
    attributeValues[":updatedAt"] = new Date().toISOString();

    // Add other updates
    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== "status" && key !== "updatedAt" && value !== undefined) {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        attributeNames[attrName] = key;
        attributeValues[attrValue] = value;
      }
    });

    const updateExpression = `SET ${updateExpressions.join(", ")}`;

    await this.updateItem(
      `USER#${userId}`,
      `RECHARGE#${transactionId}`,
      updateExpression,
      attributeNames,
      attributeValues
    );
  }

  /**
   * Gets daily spending amount for a user on a specific date
   */
  async getDailySpending(userId: string, date: string): Promise<number> {
    try {
      const dailySpending = await this.getItem<DailySpendingInfo>(
        `USER#${userId}`,
        `DAILY_SPENDING#${date}`
      );

      return dailySpending?.totalSpent || 0;
    } catch (error) {
      // If item doesn't exist, return 0
      return 0;
    }
  }

  /**
   * Updates daily spending for a user
   */
  async updateDailySpending(
    userId: string,
    date: string,
    additionalAmount: number
  ): Promise<void> {
    const pk = `USER#${userId}`;
    const sk = `DAILY_SPENDING#${date}`;

    try {
      // Try to get existing record first
      const existing = await this.getItem<DailySpendingInfo>(pk, sk);

      if (existing) {
        // Update existing record
        await this.updateItem(
          pk,
          sk,
          "SET #totalSpent = #totalSpent + :amount, #transactionCount = #transactionCount + :count, #lastUpdated = :timestamp",
          {
            "#totalSpent": "totalSpent",
            "#transactionCount": "transactionCount",
            "#lastUpdated": "lastUpdated",
          },
          {
            ":amount": additionalAmount,
            ":count": 1,
            ":timestamp": new Date().toISOString(),
          }
        );
      } else {
        // Create new record
        const newRecord: DailySpendingInfo = {
          userId,
          date,
          totalSpent: additionalAmount,
          transactionCount: 1,
          lastUpdated: new Date().toISOString(),
        };

        await this.putItem({
          PK: pk,
          SK: sk,
          ...newRecord,
        });
      }
    } catch (error) {
      console.error("Failed to update daily spending:", error);
      throw error;
    }
  }

  /**
   * Gets transactions by status (using GSI)
   */
  async getTransactionsByStatus(
    status: string,
    limit?: number,
    exclusiveStartKey?: any
  ): Promise<{
    items: RechargeTransaction[];
    lastEvaluatedKey?: any;
    count: number;
  }> {
    return await this.queryItems<RechargeTransaction>(
      "#gsi1pk = :status",
      {
        "#gsi1pk": "GSI1PK",
      },
      {
        ":status": `RECHARGE_STATUS#${status}`,
      },
      "GSI1", // Assuming GSI1 is the status index
      {
        limit,
        exclusiveStartKey,
      }
    );
  }

  /**
   * Gets user's recharge transactions
   */
  async getUserTransactions(
    userId: string,
    limit?: number,
    exclusiveStartKey?: any
  ): Promise<{
    items: RechargeTransaction[];
    lastEvaluatedKey?: any;
    count: number;
  }> {
    return await this.queryItems<RechargeTransaction>(
      "#pk = :userId AND begins_with(#sk, :prefix)",
      {
        "#pk": "PK",
        "#sk": "SK",
      },
      {
        ":userId": `USER#${userId}`,
        ":prefix": "RECHARGE#",
      },
      undefined, // Use main table
      {
        limit,
        exclusiveStartKey,
      }
    );
  }

  /**
   * List user transactions with filtering and pagination (alias for getUserTransactions)
   */
  async listUserTransactions(
    userId: string,
    options: {
      limit?: number;
      status?: string;
      exclusiveStartKey?: string;
    } = {}
  ): Promise<{
    transactions: RechargeTransaction[];
    pagination: {
      limit: number;
      exclusiveStartKey?: string;
      hasMore: boolean;
    };
  }> {
    const { limit = 20, status, exclusiveStartKey } = options;

    let result;
    if (status) {
      // Query by status using GSI
      result = await this.queryItems<RechargeTransaction>(
        "#gsi1pk = :statusKey AND #gsi1sk >= :userId",
        {
          "#gsi1pk": "GSI1PK",
          "#gsi1sk": "GSI1SK",
        },
        {
          ":statusKey": `RECHARGE_STATUS#${status}`,
          ":userId": `USER#${userId}`,
        },
        "GSI1", // Use GSI1 for status queries
        {
          limit,
          exclusiveStartKey: exclusiveStartKey
            ? JSON.parse(exclusiveStartKey)
            : undefined,
        }
      );
    } else {
      // Query all user transactions
      result = await this.getUserTransactions(
        userId,
        limit,
        exclusiveStartKey ? JSON.parse(exclusiveStartKey) : undefined
      );
    }

    return {
      transactions: result.items,
      pagination: {
        limit,
        exclusiveStartKey: result.lastEvaluatedKey
          ? JSON.stringify(result.lastEvaluatedKey)
          : undefined,
        hasMore: !!result.lastEvaluatedKey,
      },
    };
  }

  /**
   * Gets a transaction by ID (without requiring user ID)
   */
  async getTransactionById(
    transactionId: string
  ): Promise<RechargeTransaction | null> {
    // Query using GSI to find transaction by ID
    const result = await this.queryItems<RechargeTransaction>(
      "begins_with(#sk, :transactionPrefix)",
      {
        "#sk": "SK",
      },
      {
        ":transactionPrefix": `RECHARGE#${transactionId}`,
      },
      undefined, // Use main table
      {
        limit: 1,
      }
    );

    return result.items.length > 0 ? result.items[0] : null;
  }

  /**
   * Gets failed transactions that need retry
   */
  async getFailedTransactionsForRetry(
    maxRetryCount: number = 5,
    limit: number = 50
  ): Promise<RechargeTransaction[]> {
    const result = await this.queryItems<RechargeTransaction>(
      "#gsi1pk = :status",
      {
        "#gsi1pk": "GSI1PK",
      },
      {
        ":status": "RECHARGE_STATUS#failed",
      },
      "GSI1",
      { limit }
    );

    // Filter by retry count
    return result.items.filter(
      (transaction) => transaction.retryCount < maxRetryCount
    );
  }

  /**
   * Increments retry count for a transaction
   */
  async incrementRetryCount(
    transactionId: string,
    userId: string
  ): Promise<void> {
    await this.updateItem(
      `USER#${userId}`,
      `RECHARGE#${transactionId}`,
      "SET #retryCount = #retryCount + :increment, #updatedAt = :timestamp",
      {
        "#retryCount": "retryCount",
        "#updatedAt": "updatedAt",
      },
      {
        ":increment": 1,
        ":timestamp": new Date().toISOString(),
      }
    );
  }

  /**
   * Gets transaction statistics for a date range
   */
  async getTransactionStats(
    startDate: string,
    endDate: string
  ): Promise<{
    totalTransactions: number;
    totalAmount: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageAmount: number;
  }> {
    // This would require a more complex query or scan operation
    // For now, we'll implement a basic version using scan
    const result = await this.scanItems<RechargeTransaction>(
      "#createdAt BETWEEN :startDate AND :endDate",
      {
        "#createdAt": "createdAt",
      },
      {
        ":startDate": startDate,
        ":endDate": endDate,
      }
    );

    const transactions = result.items;
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.xafAmount, 0);
    const successfulTransactions = transactions.filter(
      (t) => t.status === "completed"
    ).length;
    const failedTransactions = transactions.filter(
      (t) => t.status === "failed"
    ).length;
    const averageAmount =
      totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    return {
      totalTransactions,
      totalAmount,
      successfulTransactions,
      failedTransactions,
      averageAmount,
    };
  }

  /**
   * Health check for repository
   */
  async healthCheck(): Promise<void> {
    // Simple health check - try to query a non-existent item
    try {
      await this.getItem("HEALTH_CHECK", "TEST");
    } catch (error) {
      // If it's a DynamoDB connectivity issue, it will throw
      // If it's just "item not found", that's fine
      if (
        (error as Error).message.includes("network") ||
        (error as Error).message.includes("timeout")
      ) {
        throw error;
      }
    }
  }

  /**
   * Cleanup old daily spending records (for maintenance)
   */
  async cleanupOldDailySpending(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // This would require scanning for old records and deleting them
    // Implementation would depend on your specific cleanup requirements
    // For now, return 0 as placeholder
    return 0;
  }
}
