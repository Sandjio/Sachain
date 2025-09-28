import { BaseRepository, DynamoDBConfig } from "./base-repository";
import { HBARTransaction } from "../models/index";

export class TransactionRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }

  async createHBARTransaction(data: {
    userId: string;
    paymentOrderId: string;
    fromAccountId: string;
    toAccountId: string;
    hbarAmount: number;
    xafAmount: number;
    exchangeRate: number;
  }): Promise<HBARTransaction> {
    const timestamp = this.generateTimestamp();
    const transactionId = `hbar_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const transaction: HBARTransaction = {
      PK: `USER#${data.userId}`,
      SK: `HBAR_TXN#${transactionId}`,
      transactionId,
      userId: data.userId,
      paymentOrderId: data.paymentOrderId,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      hbarAmount: data.hbarAmount,
      xafAmount: data.xafAmount,
      exchangeRate: data.exchangeRate,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
      GSI1PK: "HBAR_TXN_STATUS#pending",
      GSI1SK: timestamp,
    };

    await this.putItem(transaction);
    return transaction;
  }

  async updateHBARTransaction(
    userId: string,
    transactionId: string,
    updates: {
      status?: HBARTransaction["status"];
      hederaTransactionId?: string;
      hederaTransactionHash?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    const timestamp = this.generateTimestamp();
    const updateExpressions = ["#updatedAt = :updatedAt"];
    const names: Record<string, string> = { "#updatedAt": "updatedAt" };
    const values: Record<string, any> = { ":updatedAt": timestamp };

    if (updates.status) {
      updateExpressions.push("#status = :status", "#GSI1PK = :GSI1PK");
      names["#status"] = "status";
      names["#GSI1PK"] = "GSI1PK";
      values[":status"] = updates.status;
      values[":GSI1PK"] = `HBAR_TXN_STATUS#${updates.status}`;

      if (updates.status === "completed") {
        updateExpressions.push("#completedAt = :completedAt");
        names["#completedAt"] = "completedAt";
        values[":completedAt"] = timestamp;
      }
    }

    if (updates.hederaTransactionId) {
      updateExpressions.push("#hederaTxnId = :hederaTxnId");
      names["#hederaTxnId"] = "hederaTransactionId";
      values[":hederaTxnId"] = updates.hederaTransactionId;
    }

    if (updates.hederaTransactionHash) {
      updateExpressions.push("#hederaTxnHash = :hederaTxnHash");
      names["#hederaTxnHash"] = "hederaTransactionHash";
      values[":hederaTxnHash"] = updates.hederaTransactionHash;
    }

    if (updates.errorMessage) {
      updateExpressions.push("#errorMessage = :errorMessage");
      names["#errorMessage"] = "errorMessage";
      values[":errorMessage"] = updates.errorMessage;
    }

    await this.updateItem(
      `USER#${userId}`,
      `HBAR_TXN#${transactionId}`,
      `SET ${updateExpressions.join(", ")}`,
      names,
      values
    );
  }

  async getHBARTransaction(
    userId: string,
    transactionId: string
  ): Promise<HBARTransaction | null> {
    return await this.getItem<HBARTransaction>(
      `USER#${userId}`,
      `HBAR_TXN#${transactionId}`
    );
  }
}
