// Project-related data models for DynamoDB Single Table Design
// These interfaces define the structure of project and stock data

export interface Project {
  PK: string; // PROJECT#${projectId}
  SK: string; // METADATA
  projectId: string;
  entrepreneurId: string;
  name: string;
  description: string;
  category: string;
  targetFundingGoal?: number;
  stockSupply: number;
  pricePerStock?: number;
  coverImageUrl?: string;
  status: "draft" | "minting" | "active" | "paused" | "completed";
  createdAt: string;
  updatedAt: string;

  // GSI3 attributes for project queries
  GSI3PK: string; // PROJECT_STATUS#${status}
  GSI3SK: string; // ${createdAt}
}

export interface StockNFT {
  PK: string; // PROJECT#${projectId}
  SK: string; // STOCK#${stockNumber}
  projectId: string;
  stockNumber: number;
  tokenId: string; // Hedera token ID
  serialNumber: number; // Hedera serial number
  ownerWalletAddress: string;
  mintedAt: string;
  metadataUri: string; // IPFS URI
  status: "minted" | "listed" | "sold" | "transferred";

  // GSI4 attributes for owner queries
  GSI4PK: string; // OWNER#${ownerWalletAddress}
  GSI4SK: string; // ${mintedAt}
}

export interface ProjectStats {
  PK: string; // PROJECT#${projectId}
  SK: string; // STATS
  projectId: string;
  totalStocks: number;
  mintedStocks: number;
  availableStocks: number;
  soldStocks: number;
  totalRaised: number;
  lastUpdated: string;
}

export interface HederaTransaction {
  PK: string; // PROJECT#${projectId}
  SK: string; // HEDERA_TX#${transactionId}
  projectId: string;
  transactionId: string;
  transactionType: "token_creation" | "nft_mint" | "nft_transfer";
  status: "pending" | "success" | "failed";
  gasUsed?: number;
  timestamp: string;
  errorMessage?: string;
}

// Input types for creating new records
export interface CreateProjectInput {
  entrepreneurId: string;
  name: string;
  description: string;
  category: string;
  targetFundingGoal?: number;
  stockSupply: number;
  pricePerStock?: number;
  coverImageUrl?: string;
}

export interface CreateStockNFTInput {
  projectId: string;
  stockNumber: number;
  tokenId: string;
  serialNumber: number;
  ownerWalletAddress: string;
  metadataUri: string;
}

export interface CreateHederaTransactionInput {
  projectId: string;
  transactionId: string;
  transactionType: "token_creation" | "nft_mint" | "nft_transfer";
  gasUsed?: number;
}

// Update types
export interface UpdateProjectInput {
  projectId: string;
  name?: string;
  description?: string;
  category?: string;
  targetFundingGoal?: number;
  pricePerStock?: number;
  coverImageUrl?: string;
  status?: "draft" | "minting" | "active" | "paused" | "completed";
}

export interface UpdateStockNFTInput {
  projectId: string;
  stockNumber: number;
  ownerWalletAddress?: string;
  status?: "minted" | "listed" | "sold" | "transferred";
}

export interface UpdateHederaTransactionInput {
  projectId: string;
  transactionId: string;
  status?: "pending" | "success" | "failed";
  gasUsed?: number;
  errorMessage?: string;
}

// Query types
export interface ProjectQueryOptions {
  status?: "draft" | "minting" | "active" | "paused" | "completed";
  entrepreneurId?: string;
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
}

export interface StockQueryOptions {
  projectId?: string;
  ownerWalletAddress?: string;
  status?: "minted" | "listed" | "sold" | "transferred";
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
}

// Validation types
export interface ProjectValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface StockValidationResult {
  isValid: boolean;
  errors: string[];
}

// Constants for validation
export const PROJECT_CATEGORIES = [
  "technology",
  "healthcare",
  "finance",
  "education",
  "retail",
  "manufacturing",
  "agriculture",
  "energy",
  "cleantech",
  "real_estate",
  "entertainment",
  "transportation",
  "food_beverage",
  "other",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_VALIDATION_RULES = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 2000,
  MIN_STOCK_SUPPLY: 1,
  MAX_STOCK_SUPPLY: 1000000,
  MAX_DECIMAL_PLACES: 8,
  MAX_FUNDING_GOAL_DECIMAL_PLACES: 2,
} as const;

// Stock listing for marketplace
export interface StockListing {
  PK: string; // LISTING#${listingId}
  SK: string; // METADATA
  listingId: string;
  projectId: string;
  stockNumber: number;
  sellerId: string; // wallet address
  pricePerStock: number; // in HBAR
  quantity: number; // number of stocks being sold
  status: "active" | "sold" | "cancelled" | "expired";
  listedAt: string;
  expiresAt?: string;

  // GSI5 for marketplace queries
  GSI5PK: string; // MARKETPLACE#${projectId}
  GSI5SK: string; // ${pricePerStock}#${listedAt}
}

// Stock transfer/sale transaction
export interface StockTransaction {
  PK: string; // TRANSACTION#${transactionId}
  SK: string; // METADATA
  transactionId: string;
  projectId: string;
  stockNumber: number;
  fromWallet: string;
  toWallet: string;
  pricePerStock: number;
  quantity: number;
  totalAmount: number;
  transactionType: "sale" | "transfer";
  hederaTransactionId: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
}

// Input types
export interface CreateStockListingInput {
  projectId: string;
  stockNumber: number;
  sellerId: string;
  pricePerStock: number;
  quantity: number;
  expiresAt?: string;
}

export interface CreateStockTransactionInput {
  projectId: string;
  stockNumber: number;
  fromWallet: string;
  toWallet: string;
  pricePerStock: number;
  quantity: number;
}

export interface ScheduledTransaction {
  PK: string; // SCHEDULED_TX#${transactionId}
  SK: string; // METADATA
  transactionId: string;
  projectId: string;
  investorId: string;
  entrepreneurId: string;
  sharesRequested: number;
  sharesAvailable: number;
  pricePerShare: number;
  totalAmount: number;
  hederaScheduledTxId?: string;
  investorPrivateKey: string; // Encrypted
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: string;
  expiresAt: string; // 30 minutes from creation

  // GSI6 for entrepreneur queries
  GSI6PK: string; // ENTREPRENEUR#${entrepreneurId}
  GSI6SK: string; // ${createdAt}
}

export interface BuySharesRequest {
  projectId: string;
  sharesRequested: number;
  investorWalletAddress: string;
  investorPrivateKey: string;
}

export interface CreateScheduledTransactionInput {
  projectId: string;
  investorId: string;
  entrepreneurId: string;
  sharesRequested: number;
  sharesAvailable: number;
  pricePerShare: number;
  investorPrivateKey: string;
}
