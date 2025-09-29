import { BaseRepository, DynamoDBConfig } from "./base-repository";
import {
  StockListing,
  StockTransaction,
  CreateStockListingInput,
  CreateStockTransactionInput,
  ScheduledTransaction,
  CreateScheduledTransactionInput,
  QueryResult,
  PaginationOptions,
} from "../models";

export class StockTradingRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }

  // Create stock listing
  async createListing(input: CreateStockListingInput): Promise<StockListing> {
    const timestamp = this.generateTimestamp();
    const listingId = this.generateId();

    const listing: StockListing = {
      PK: `LISTING#${listingId}`,
      SK: "METADATA",
      listingId,
      projectId: input.projectId,
      stockNumber: input.stockNumber,
      sellerId: input.sellerId,
      pricePerStock: input.pricePerStock,
      quantity: input.quantity,
      status: "active",
      listedAt: timestamp,
      expiresAt: input.expiresAt,
      GSI5PK: `MARKETPLACE#${input.projectId}`,
      GSI5SK: `${input.pricePerStock
        .toString()
        .padStart(10, "0")}#${timestamp}`,
    };

    await this.putItem(listing);
    return listing;
  }

  // Get marketplace listings for a project
  async getMarketplaceListings(
    projectId: string,
    options?: PaginationOptions
  ): Promise<QueryResult<StockListing>> {
    return await this.queryItems<StockListing>(
      "#GSI5PK = :gsi5pk AND #status = :status",
      {
        "#GSI5PK": "GSI5PK",
        "#status": "status",
      },
      {
        ":gsi5pk": `MARKETPLACE#${projectId}`,
        ":status": "active",
      },
      "GSI5",
      options
    );
  }

  // Create stock transaction
  async createTransaction(
    input: CreateStockTransactionInput
  ): Promise<StockTransaction> {
    const timestamp = this.generateTimestamp();
    const transactionId = this.generateId();

    const transaction: StockTransaction = {
      PK: `TRANSACTION#${transactionId}`,
      SK: "METADATA",
      transactionId,
      projectId: input.projectId,
      stockNumber: input.stockNumber,
      fromWallet: input.fromWallet,
      toWallet: input.toWallet,
      pricePerStock: input.pricePerStock,
      quantity: input.quantity,
      totalAmount: input.pricePerStock * input.quantity,
      transactionType: "sale",
      hederaTransactionId: "",
      status: "pending",
      createdAt: timestamp,
    };

    await this.putItem(transaction);
    return transaction;
  }

  // Update transaction status
  async updateTransactionStatus(
    transactionId: string,
    status: "completed" | "failed",
    hederaTransactionId?: string
  ): Promise<void> {
    const updateExpression = hederaTransactionId
      ? "SET #status = :status, #hederaTransactionId = :hederaTransactionId, #completedAt = :completedAt"
      : "SET #status = :status, #completedAt = :completedAt";

    const expressionAttributeValues: any = {
      ":status": status,
      ":completedAt": this.generateTimestamp(),
    };

    if (hederaTransactionId) {
      expressionAttributeValues[":hederaTransactionId"] = hederaTransactionId;
    }

    await this.updateItem(
      `TRANSACTION#${transactionId}`,
      "METADATA",
      updateExpression,
      {
        "#status": "status",
        "#completedAt": "completedAt",
        ...(hederaTransactionId && {
          "#hederaTransactionId": "hederaTransactionId",
        }),
      },
      expressionAttributeValues
    );
  }
  // Get a single listing
  async getListing(listingId: string): Promise<StockListing | null> {
    return await this.getItem<StockListing>(`LISTING#${listingId}`, "METADATA");
  }

  // Update listing status
  async updateListingStatus(
    listingId: string,
    status: "sold" | "cancelled" | "expired"
  ): Promise<void> {
    await this.updateItem(
      `LISTING#${listingId}`,
      "METADATA",
      "SET #status = :status",
      { "#status": "status" },
      { ":status": status }
    );
  }
  // Get transactions for a user (both as buyer and seller)
  async getUserTransactions(
    userId: string,
    options?: PaginationOptions
  ): Promise<QueryResult<StockTransaction>> {
    // Since we don't have a GSI for user transactions, we'll need to scan
    // In a production system, you'd want to add GSI6 for user transactions
    return await this.scanItems<StockTransaction>(
      "(#fromWallet = :userId OR #toWallet = :userId) AND begins_with(#PK, :txPrefix)",
      {
        "#fromWallet": "fromWallet",
        "#toWallet": "toWallet",
        "#PK": "PK",
      },
      {
        ":userId": userId,
        ":txPrefix": "TRANSACTION#",
      },
      options
    );
  }

  async createScheduledTransaction(
    input: CreateScheduledTransactionInput
  ): Promise<ScheduledTransaction> {
    const timestamp = this.generateTimestamp();
    const transactionId = this.generateId();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    const scheduledTx: ScheduledTransaction = {
      PK: `SCHEDULED_TX#${transactionId}`,
      SK: "METADATA",
      transactionId,
      projectId: input.projectId,
      investorId: input.investorId,
      entrepreneurId: input.entrepreneurId,
      sharesRequested: input.sharesRequested,
      sharesAvailable: input.sharesAvailable,
      pricePerShare: input.pricePerShare,
      totalAmount: input.sharesRequested * input.pricePerShare,
      investorPrivateKey: input.investorPrivateKey, // Should be encrypted in production
      status: "pending",
      createdAt: timestamp,
      expiresAt,
      GSI6PK: `ENTREPRENEUR#${input.entrepreneurId}`,
      GSI6SK: timestamp,
    };

    await this.putItem(scheduledTx);
    return scheduledTx;
  }

  async getScheduledTransaction(
    transactionId: string
  ): Promise<ScheduledTransaction | null> {
    return await this.getItem<ScheduledTransaction>(
      `SCHEDULED_TX#${transactionId}`,
      "METADATA"
    );
  }

  async getEntrepreneurPendingTransactions(
    entrepreneurId: string,
    options?: PaginationOptions
  ): Promise<QueryResult<ScheduledTransaction>> {
    return await this.queryItems<ScheduledTransaction>(
      "#GSI6PK = :gsi6pk AND #status = :status",
      {
        "#GSI6PK": "GSI6PK",
        "#status": "status",
      },
      {
        ":gsi6pk": `ENTREPRENEUR#${entrepreneurId}`,
        ":status": "pending",
      },
      "GSI6",
      options
    );
  }

  async updateScheduledTransactionStatus(
    transactionId: string,
    status: "approved" | "rejected" | "expired"
  ): Promise<void> {
    await this.updateItem(
      `SCHEDULED_TX#${transactionId}`,
      "METADATA",
      "SET #status = :status, #updatedAt = :updatedAt",
      { "#status": "status", "#updatedAt": "updatedAt" },
      { ":status": status, ":updatedAt": this.generateTimestamp() }
    );
  }
  async updateScheduledTransaction(
    transactionId: string,
    updates: { hederaScheduledTxId?: string }
  ): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (updates.hederaScheduledTxId !== undefined) {
      updateExpressions.push("#hederaScheduledTxId = :hederaScheduledTxId");
      expressionAttributeNames["#hederaScheduledTxId"] = "hederaScheduledTxId";
      expressionAttributeValues[":hederaScheduledTxId"] =
        updates.hederaScheduledTxId;
    }

    if (updateExpressions.length === 0) {
      return;
    }

    const updateExpression = `SET ${updateExpressions.join(", ")}`;

    await this.updateItem(
      `SCHEDULED_TX#${transactionId}`,
      "METADATA",
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );
  }
}
