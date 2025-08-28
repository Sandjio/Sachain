import { BaseRepository, DynamoDBConfig } from "./base-repository";
import {
  StockNFT,
  CreateStockNFTInput,
  UpdateStockNFTInput,
  StockQueryOptions,
  QueryResult,
  PaginationOptions,
} from "../models";

export class StockRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }

  /**
   * Create a new stock NFT record
   */
  async createStockNFT(input: CreateStockNFTInput): Promise<StockNFT> {
    const timestamp = this.generateTimestamp();

    const stockNFT: StockNFT = {
      PK: `PROJECT#${input.projectId}`,
      SK: `STOCK#${input.stockNumber}`,
      projectId: input.projectId,
      stockNumber: input.stockNumber,
      tokenId: input.tokenId,
      serialNumber: input.serialNumber,
      ownerWalletAddress: input.ownerWalletAddress,
      mintedAt: timestamp,
      metadataUri: input.metadataUri,
      status: "minted",

      // GSI4 attributes for owner queries
      GSI4PK: `OWNER#${input.ownerWalletAddress}`,
      GSI4SK: timestamp,
    };

    await this.putItem(stockNFT);
    return stockNFT;
  }

  /**
   * Get stock NFT by project ID and stock number
   */
  async getStockNFT(projectId: string, stockNumber: number): Promise<StockNFT | null> {
    return await this.getItem<StockNFT>(`PROJECT#${projectId}`, `STOCK#${stockNumber}`);
  }

  /**
   * Update stock NFT (for transfers and status changes)
   */
  async updateStockNFT(input: UpdateStockNFTInput): Promise<void> {
    const pk = `PROJECT#${input.projectId}`;
    const sk = `STOCK#${input.stockNumber}`;

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (input.ownerWalletAddress !== undefined) {
      const timestamp = this.generateTimestamp();
      
      updateExpressions.push("#ownerWalletAddress = :ownerWalletAddress");
      updateExpressions.push("#GSI4PK = :GSI4PK");
      updateExpressions.push("#GSI4SK = :GSI4SK");

      expressionAttributeNames["#ownerWalletAddress"] = "ownerWalletAddress";
      expressionAttributeNames["#GSI4PK"] = "GSI4PK";
      expressionAttributeNames["#GSI4SK"] = "GSI4SK";

      expressionAttributeValues[":ownerWalletAddress"] = input.ownerWalletAddress;
      expressionAttributeValues[":GSI4PK"] = `OWNER#${input.ownerWalletAddress}`;
      expressionAttributeValues[":GSI4SK"] = timestamp;
    }

    if (input.status !== undefined) {
      updateExpressions.push("#status = :status");
      expressionAttributeNames["#status"] = "status";
      expressionAttributeValues[":status"] = input.status;
    }

    if (updateExpressions.length === 0) {
      return; // No updates to make
    }

    const updateExpression = `SET ${updateExpressions.join(", ")}`;

    await this.updateItem(
      pk,
      sk,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );
  }

  /**
   * Get all stocks for a project
   */
  async getProjectStocks(
    projectId: string,
    options?: PaginationOptions & { status?: "minted" | "listed" | "sold" | "transferred" }
  ): Promise<QueryResult<StockNFT>> {
    let filterExpression: string | undefined;
    let expressionAttributeNames: Record<string, string> | undefined;
    let expressionAttributeValues: Record<string, any> | undefined;

    if (options?.status) {
      filterExpression = "#status = :status";
      expressionAttributeNames = { "#status": "status" };
      expressionAttributeValues = { ":status": options.status };
    }

    return await this.queryItems<StockNFT>(
      "#PK = :pk AND begins_with(#SK, :skPrefix)",
      {
        "#PK": "PK",
        "#SK": "SK",
        ...(expressionAttributeNames || {}),
      },
      {
        ":pk": `PROJECT#${projectId}`,
        ":skPrefix": "STOCK#",
        ...(expressionAttributeValues || {}),
      },
      undefined, // No index needed for this query
      {
        limit: options?.limit,
        exclusiveStartKey: options?.exclusiveStartKey,
      }
    );
  }

  /**
   * Get stocks owned by a specific wallet address using GSI4
   */
  async getStocksByOwner(
    ownerWalletAddress: string,
    options?: PaginationOptions
  ): Promise<QueryResult<StockNFT>> {
    return await this.queryItems<StockNFT>(
      "#GSI4PK = :gsi4pk",
      {
        "#GSI4PK": "GSI4PK",
      },
      {
        ":gsi4pk": `OWNER#${ownerWalletAddress}`,
      },
      "GSI4", // Index name
      options
    );
  }

  /**
   * Get stocks with filtering and pagination
   */
  async getStocks(options?: StockQueryOptions): Promise<QueryResult<StockNFT>> {
    // If owner wallet address is specified, use GSI4 for efficient querying
    if (options?.ownerWalletAddress) {
      return await this.getStocksByOwner(options.ownerWalletAddress, {
        limit: options.limit,
        exclusiveStartKey: options.exclusiveStartKey,
      });
    }

    // If project ID is specified, query by project
    if (options?.projectId) {
      return await this.getProjectStocks(options.projectId, {
        status: options.status,
        limit: options.limit,
        exclusiveStartKey: options.exclusiveStartKey,
      });
    }

    // Otherwise, scan all stocks with optional status filter (use sparingly)
    let filterExpression: string | undefined;
    let expressionAttributeNames: Record<string, string> | undefined;
    let expressionAttributeValues: Record<string, any> | undefined;

    if (options?.status) {
      filterExpression = "#status = :status AND begins_with(#SK, :skPrefix)";
      expressionAttributeNames = { "#status": "status", "#SK": "SK" };
      expressionAttributeValues = { ":status": options.status, ":skPrefix": "STOCK#" };
    } else {
      filterExpression = "begins_with(#SK, :skPrefix)";
      expressionAttributeNames = { "#SK": "SK" };
      expressionAttributeValues = { ":skPrefix": "STOCK#" };
    }

    return await this.scanItems<StockNFT>(
      filterExpression,
      expressionAttributeNames,
      expressionAttributeValues,
      {
        limit: options?.limit,
        exclusiveStartKey: options?.exclusiveStartKey,
      }
    );
  }

  /**
   * Get stock count for a project by status
   */
  async getProjectStockCount(
    projectId: string,
    status?: "minted" | "listed" | "sold" | "transferred"
  ): Promise<number> {
    const result = await this.getProjectStocks(projectId, { status });
    return result.count;
  }

  /**
   * Get stock count for an owner
   */
  async getOwnerStockCount(ownerWalletAddress: string): Promise<number> {
    const result = await this.getStocksByOwner(ownerWalletAddress);
    return result.count;
  }

  /**
   * Check if stock exists
   */
  async stockExists(projectId: string, stockNumber: number): Promise<boolean> {
    const stock = await this.getStockNFT(projectId, stockNumber);
    return stock !== null;
  }

  /**
   * Get stock transfer history for a specific stock
   * This would require additional tracking records, but for now returns the current stock
   */
  async getStockTransferHistory(
    projectId: string,
    stockNumber: number
  ): Promise<StockNFT[]> {
    const stock = await this.getStockNFT(projectId, stockNumber);
    return stock ? [stock] : [];
  }

  /**
   * Batch get stocks by project and stock numbers
   */
  async batchGetStocks(
    projectId: string,
    stockNumbers: number[]
  ): Promise<StockNFT[]> {
    const keys = stockNumbers.map((stockNumber) => ({
      PK: `PROJECT#${projectId}`,
      SK: `STOCK#${stockNumber}`,
    }));

    return await this.batchGetItems<StockNFT>(keys);
  }

  /**
   * Get portfolio aggregation for an owner
   */
  async getOwnerPortfolio(ownerWalletAddress: string): Promise<{
    totalStocks: number;
    stocksByProject: Record<string, number>;
    stocksByStatus: Record<string, number>;
  }> {
    const result = await this.getStocksByOwner(ownerWalletAddress);
    const stocks = result.items;

    const stocksByProject: Record<string, number> = {};
    const stocksByStatus: Record<string, number> = {};

    stocks.forEach((stock) => {
      // Count by project
      stocksByProject[stock.projectId] = (stocksByProject[stock.projectId] || 0) + 1;
      
      // Count by status
      stocksByStatus[stock.status] = (stocksByStatus[stock.status] || 0) + 1;
    });

    return {
      totalStocks: stocks.length,
      stocksByProject,
      stocksByStatus,
    };
  }

  /**
   * Delete stock NFT record
   */
  async deleteStockNFT(projectId: string, stockNumber: number): Promise<void> {
    await this.deleteItem(`PROJECT#${projectId}`, `STOCK#${stockNumber}`);
  }

  /**
   * Batch create stock NFTs (for minting operations)
   */
  async batchCreateStockNFTs(stocks: CreateStockNFTInput[]): Promise<void> {
    const timestamp = this.generateTimestamp();
    
    const stockNFTs = stocks.map((input) => ({
      PK: `PROJECT#${input.projectId}`,
      SK: `STOCK#${input.stockNumber}`,
      projectId: input.projectId,
      stockNumber: input.stockNumber,
      tokenId: input.tokenId,
      serialNumber: input.serialNumber,
      ownerWalletAddress: input.ownerWalletAddress,
      mintedAt: timestamp,
      metadataUri: input.metadataUri,
      status: "minted" as const,

      // GSI4 attributes for owner queries
      GSI4PK: `OWNER#${input.ownerWalletAddress}`,
      GSI4SK: timestamp,
    }));

    await this.batchWriteItems(stockNFTs);
  }
}