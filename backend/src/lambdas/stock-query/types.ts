import { APIGatewayProxyEvent } from "aws-lambda";
import { StockNFT } from "../../models/project";

export interface StockQueryEvent extends APIGatewayProxyEvent {
  pathParameters: {
    projectId?: string;
    stockId?: string;
  };
  queryStringParameters: {
    status?: "minted" | "listed" | "sold" | "transferred";
    projectId?: string;
    ownerWalletAddress?: string;
    walletAddress?: string;
    limit?: string;
    exclusiveStartKey?: string;
    includeMetadata?: string;
  };
}

export interface GetStocksRequest {
  status?: "minted" | "listed" | "sold" | "transferred";
  projectId?: string;
  ownerWalletAddress?: string;
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
  includeMetadata?: boolean;
}

export interface GetStockResponse {
  stock: StockWithMetadata;
}

export interface GetStocksResponse {
  stocks: StockWithMetadata[];
  pagination: {
    limit: number;
    count: number;
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  };
}

export interface StockWithMetadata extends StockNFT {
  project?: {
    name: string;
    category: string;
    status: string;
  };
}

export interface StockPortfolio {
  walletAddress: string;
  totalStocks: number;
  stocksByProject: Record<string, number>;
  stocksByStatus: Record<string, number>;
  stocks: StockNFT[];
}

export class StockQueryError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "StockQueryError";
  }
}

export const ErrorCodes = {
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  STOCK_NOT_FOUND: "STOCK_NOT_FOUND",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  INVALID_QUERY_PARAMETERS: "INVALID_QUERY_PARAMETERS",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Validation types
export interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedParams?: GetStocksRequest;
}