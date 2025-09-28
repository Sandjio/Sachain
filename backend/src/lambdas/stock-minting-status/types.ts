import { APIGatewayProxyEvent } from "aws-lambda";

export interface MintingStatusEvent extends APIGatewayProxyEvent {
  pathParameters: {
    projectId: string;
  };
}

export interface MintingStatusResponse {
  projectId: string;
  status: "draft" | "minting" | "active" | "paused" | "completed";
  progress: MintingProgress;
  tokenId?: string;
  totalMinted?: number;
  mintingBatches?: number;
  transactionIds?: string[];
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
  error?: string;
}

export interface MintingProgress {
  completed: number;
  total: number;
  percentage: number;
  status: "in_progress" | "completed" | "failed";
  currentBatch?: number;
  totalBatches?: number;
}

export class MintingStatusError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "MintingStatusError";
  }
}

export const ErrorCodes = {
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  INVALID_REQUEST: "INVALID_REQUEST",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  INVALID_PROJECT_STATUS: "INVALID_PROJECT_STATUS",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Progress tracking types
export interface MintingProgressInfo {
  progress: MintingProgress;
  tokenId?: string;
  startedAt?: string;
  estimatedCompletion?: string;
}

export interface CompletedMintingInfo {
  totalMinted: number;
  mintingBatches: number;
  transactionIds: string[];
  tokenId?: string;
  startedAt?: string;
  completedAt?: string;
}

// Database query result types
export interface ProjectStatsResult {
  totalStocks: number;
  mintedStocks: number;
  availableStocks: number;
  soldStocks: number;
  totalRaised: number;
  lastUpdated: string;
}

export interface HederaTransactionResult {
  transactionId: string;
  transactionType: "token_creation" | "nft_mint";
  status: "pending" | "success" | "failed";
  gasUsed?: number;
  timestamp: string;
  errorMessage?: string;
}

// Status calculation types
export interface StatusCalculationInput {
  projectStatus: string;
  stats?: ProjectStatsResult;
  transactions: HederaTransactionResult[];
}

export interface StatusCalculationResult {
  progress: MintingProgress;
  tokenId?: string;
  totalMinted?: number;
  mintingBatches?: number;
  transactionIds?: string[];
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
}

// Performance monitoring types
export interface StatusRequestMetrics {
  projectId: string;
  requestDuration: number;
  databaseQueries: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
}

// Caching types for performance optimization
export interface CachedMintingStatus {
  projectId: string;
  status: MintingStatusResponse;
  cachedAt: string;
  expiresAt: string;
}

export interface CacheConfiguration {
  ttlSeconds: number;
  maxEntries: number;
  enableCaching: boolean;
}
