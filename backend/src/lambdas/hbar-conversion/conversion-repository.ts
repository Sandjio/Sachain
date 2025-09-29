/**
 * Conversion Repository
 * Database operations for HBAR conversion transactions
 */

import { BaseRepository } from "../../repositories/base-repository";
import { RechargeTransaction } from "../../types/hbar-recharge";

export interface ConversionRepositoryConfig {
  tableName: string;
}

export class ConversionRepository extends BaseRepository {
  constructor(config: ConversionRepositoryConfig) {
    super({ tableName: config.tableName });
  }

  /**
   * Get a recharge transaction by ID and user ID
   */
  async getTransaction(
    transactionId: string,
    userId: string
  ): Promise<RechargeTransaction | null> {
    try {
      const pk = `USER#${userId}`;
      const sk = `RECHARGE#${transactionId}`;

      return await this.getItem<RechargeTransaction>(pk, sk);
    } catch (error) {
      console.error("Failed to get transaction:", error);
      throw new Error("Database error while retrieving transaction");
    }
  }

  /**
   * Update transaction status and related fields
   */
  async updateTransactionStatus(
    transactionId: string,
    userId: string,
    status: string,
    updates: Partial<RechargeTransaction> = {}
  ): Promise<void> {
    try {
      const pk = `USER#${userId}`;
      const sk = `RECHARGE#${transactionId}`;

      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Always update status and updatedAt
      updateExpression.push("#status = :status");
      expressionAttributeNames["#status"] = "status";
      expressionAttributeValues[":status"] = status;

      updateExpression.push("#updatedAt = :updatedAt");
      expressionAttributeNames["#updatedAt"] = "updatedAt";
      expressionAttributeValues[":updatedAt"] = new Date().toISOString();

      // Add other updates
      Object.entries(updates).forEach(([key, value], index) => {
        if (key !== "status" && key !== "updatedAt") {
          const attrName = `#attr${index}`;
          const attrValue = `:val${index}`;

          updateExpression.push(`${attrName} = ${attrValue}`);
          expressionAttributeNames[attrName] = key;
          expressionAttributeValues[attrValue] = value;
        }
      });

      await this.updateItem(
        pk,
        sk,
        `SET ${updateExpression.join(", ")}`,
        expressionAttributeNames,
        expressionAttributeValues
      );
    } catch (error) {
      console.error("Failed to update transaction status:", error);
      throw new Error("Database error while updating transaction status");
    }
  }

  /**
   * Get transactions by status for monitoring and retry operations
   */
  async getTransactionsByStatus(
    status: string,
    limit: number = 50
  ): Promise<RechargeTransaction[]> {
    try {
      const gsi1pk = `RECHARGE_STATUS#${status}`;

      return await this.queryGSI<RechargeTransaction>(
        "GSI1",
        gsi1pk,
        undefined,
        limit
      );
    } catch (error) {
      console.error("Failed to get transactions by status:", error);
      throw new Error("Database error while querying transactions by status");
    }
  }

  /**
   * Get failed transactions that need retry
   */
  async getFailedTransactionsForRetry(
    maxRetryCount: number = 5,
    limit: number = 20
  ): Promise<RechargeTransaction[]> {
    try {
      const failedTransactions = await this.getTransactionsByStatus(
        "failed",
        limit * 2
      );

      // Filter transactions that haven't exceeded retry limit
      return failedTransactions
        .filter((transaction) => transaction.retryCount < maxRetryCount)
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get failed transactions for retry:", error);
      throw new Error("Database error while querying failed transactions");
    }
  }

  /**
   * Get conversion statistics for a time period
   */
  async getConversionStats(
    startTime: string,
    endTime: string
  ): Promise<{
    totalTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    totalXAFAmount: number;
    totalHBARAmount: number;
  }> {
    try {
      // Query all transactions in the time range
      // This is a simplified implementation - in production, you might want to use
      // a separate GSI or aggregation table for better performance

      const allStatuses = [
        "initiated",
        "payment_confirmed",
        "converting",
        "completed",
        "failed",
      ];
      let totalTransactions = 0;
      let completedTransactions = 0;
      let failedTransactions = 0;
      let totalXAFAmount = 0;
      let totalHBARAmount = 0;

      for (const status of allStatuses) {
        const transactions = await this.getTransactionsByStatus(status, 1000);

        // Filter by time range
        const filteredTransactions = transactions.filter(
          (tx) => tx.createdAt >= startTime && tx.createdAt <= endTime
        );

        totalTransactions += filteredTransactions.length;

        filteredTransactions.forEach((tx) => {
          totalXAFAmount += tx.xafAmount;

          if (tx.status === "completed") {
            completedTransactions++;
            totalHBARAmount += tx.hbarAmount || 0;
          } else if (tx.status === "failed") {
            failedTransactions++;
          }
        });
      }

      return {
        totalTransactions,
        completedTransactions,
        failedTransactions,
        totalXAFAmount,
        totalHBARAmount,
      };
    } catch (error) {
      console.error("Failed to get conversion stats:", error);
      throw new Error("Database error while calculating conversion statistics");
    }
  }

  /**
   * Get transactions that are stuck in converting status for too long
   */
  async getStuckConversions(
    timeoutMinutes: number = 30,
    limit: number = 50
  ): Promise<RechargeTransaction[]> {
    try {
      const convertingTransactions = await this.getTransactionsByStatus(
        "converting",
        limit * 2
      );
      const timeoutThreshold = new Date(
        Date.now() - timeoutMinutes * 60 * 1000
      ).toISOString();

      return convertingTransactions
        .filter((tx) => tx.updatedAt < timeoutThreshold)
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get stuck conversions:", error);
      throw new Error("Database error while querying stuck conversions");
    }
  }

  /**
   * Health check for database connectivity
   */
  async healthCheck(): Promise<void> {
    try {
      // Try to perform a simple query to check connectivity
      await this.getTransactionsByStatus("completed", 1);
    } catch (error) {
      console.error("Database health check failed:", error);
      throw new Error("Database health check failed");
    }
  }

  /**
   * Clean up old completed transactions (for maintenance)
   */
  async cleanupOldTransactions(
    olderThanDays: number = 90,
    batchSize: number = 25
  ): Promise<number> {
    try {
      const cutoffDate = new Date(
        Date.now() - olderThanDays * 24 * 60 * 60 * 1000
      ).toISOString();
      const completedTransactions = await this.getTransactionsByStatus(
        "completed",
        batchSize * 2
      );

      const oldTransactions = completedTransactions
        .filter((tx) => tx.completedAt && tx.completedAt < cutoffDate)
        .slice(0, batchSize);

      let deletedCount = 0;
      for (const transaction of oldTransactions) {
        try {
          await this.deleteItem(transaction.PK, transaction.SK);
          deletedCount++;
        } catch (error) {
          console.error(
            `Failed to delete transaction ${transaction.transactionId}:`,
            error
          );
          // Continue with other deletions
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Failed to cleanup old transactions:", error);
      throw new Error("Database error during cleanup operation");
    }
  }
}
