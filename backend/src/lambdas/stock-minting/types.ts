import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export interface StockMintingEvent extends APIGatewayProxyEvent {
  body: string;
  pathParameters: {
    projectId: string;
  };
}

export interface MintStocksRequest {
  walletAddress: string;
  privateKey: string;
}

export interface MintStocksResponse {
  message: string;
  tokenId: string;
  totalMinted: number;
  mintingBatches: number;
  transactionIds: string[];
  progress: MintingProgress;
}

export interface MintingProgress {
  completed: number;
  total: number;
  percentage: number;
  status: "in_progress" | "completed" | "failed";
  currentBatch?: number;
  totalBatches?: number;
}

export interface BatchMintingResult {
  totalMinted: number;
  batches: Array<{
    batchNumber: number;
    stockNumbers: number[];
    serialNumbers: number[];
    transactionId: string;
  }>;
  transactionIds: string[];
}

export class StockMintingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "StockMintingError";
  }
}

export const ErrorCodes = {
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  INVALID_REQUEST: "INVALID_REQUEST",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  INVALID_PROJECT_STATUS: "INVALID_PROJECT_STATUS",
  INVALID_STOCK_SUPPLY: "INVALID_STOCK_SUPPLY",
  INVALID_WALLET_ADDRESS: "INVALID_WALLET_ADDRESS",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  TOKEN_CREATION_FAILED: "TOKEN_CREATION_FAILED",
  NFT_MINTING_FAILED: "NFT_MINTING_FAILED",
  METADATA_STORAGE_FAILED: "METADATA_STORAGE_FAILED",
  DATABASE_ERROR: "DATABASE_ERROR",
  HEDERA_SERVICE_ERROR: "HEDERA_SERVICE_ERROR",
  IPFS_SERVICE_ERROR: "IPFS_SERVICE_ERROR",
  PARTIAL_MINTING_FAILURE: "PARTIAL_MINTING_FAILURE",
  MINTING_IN_PROGRESS: "MINTING_IN_PROGRESS",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Event types for EventBridge
export interface StockMintingCompletedEventDetail {
  eventType: "STOCK_MINTING_COMPLETED";
  projectId: string;
  entrepreneurId: string;
  projectName: string;
  tokenId: string;
  totalMinted: number;
  totalBatches: number;
  transactionIds: string[];
  completedAt: string;
}

export interface StockMintingProgressEventDetail {
  eventType: "STOCK_MINTING_PROGRESS";
  projectId: string;
  progress: MintingProgress;
  timestamp: string;
}

export interface StockMintingFailedEventDetail {
  eventType: "STOCK_MINTING_FAILED";
  projectId: string;
  entrepreneurId: string;
  error: string;
  partialResults?: {
    totalMinted: number;
    completedBatches: number;
    failedAt: string;
  };
  timestamp: string;
}

// Validation result types
export interface ProjectValidationResult {
  isValid: boolean;
  project?: any;
  error?: string;
}

export interface WalletValidationResult {
  isValid: boolean;
  canAffordOperation: boolean;
  balance: string;
  estimatedGasFee: string;
  error?: string;
}

// Minting state management types
export interface MintingState {
  projectId: string;
  status:
    | "initializing"
    | "creating_token"
    | "minting_nfts"
    | "updating_records"
    | "completed"
    | "failed";
  progress: MintingProgress;
  tokenId?: string;
  currentBatch?: number;
  error?: string;
  startedAt: string;
  updatedAt: string;
}

// Recovery and rollback types
export interface MintingRecoveryInfo {
  projectId: string;
  tokenId?: string;
  completedBatches: number;
  totalBatches: number;
  mintedStocks: number[];
  failedAt: string;
  error: string;
}

export interface RollbackOperation {
  projectId: string;
  operations: Array<{
    type: "project_status" | "transaction_record" | "stock_record";
    data: any;
    completed: boolean;
  }>;
}

// Batch processing types
export interface BatchProcessingConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  timeoutPerBatch: number;
}

export interface BatchResult {
  batchNumber: number;
  success: boolean;
  stockNumbers: number[];
  serialNumbers?: number[];
  transactionId?: string;
  error?: string;
  duration: number;
}

// Gas fee and cost estimation types
export interface MintingCostEstimate {
  tokenCreationCost: string; // in Hbar
  nftMintingCost: string; // in Hbar
  totalCost: string; // in Hbar
  estimatedBatches: number;
  costPerNFT: string; // in Hbar
}

// Metadata generation types
export interface StockMetadataTemplate {
  projectId: string;
  projectName: string;
  projectDescription: string;
  projectCategory: string;
  coverImageUrl?: string;
  totalSupply: number;
  baseExternalUrl: string;
}

export interface GeneratedStockMetadata {
  stockNumber: number;
  metadata: {
    name: string;
    description: string;
    image: string;
    external_url: string;
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
    project_id: string;
    stock_number: number;
  };
  ipfsUri?: string;
}

// Transaction logging types
export interface TransactionLogEntry {
  projectId: string;
  transactionId: string;
  transactionType: "token_creation" | "nft_mint";
  batchNumber?: number;
  stockNumbers?: number[];
  status: "pending" | "success" | "failed";
  gasUsed?: number;
  error?: string;
  timestamp: string;
}

// Performance monitoring types
export interface MintingPerformanceMetrics {
  projectId: string;
  totalDuration: number;
  tokenCreationDuration: number;
  mintingDuration: number;
  averageBatchDuration: number;
  totalGasUsed: number;
  averageGasPerNFT: number;
  throughputNFTsPerSecond: number;
  batchMetrics: Array<{
    batchNumber: number;
    duration: number;
    gasUsed: number;
    nftCount: number;
  }>;
}

// Error recovery types
export interface ErrorRecoveryStrategy {
  maxRetries: number;
  retryableErrors: string[];
  backoffStrategy: "linear" | "exponential";
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}

export interface RecoveryAttempt {
  attemptNumber: number;
  error: string;
  strategy: string;
  delay: number;
  timestamp: string;
  success: boolean;
}
