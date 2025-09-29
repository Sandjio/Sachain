/**
 * Core data models and types for HBAR recharge system
 * Supports conversion of XAF (Orange Money) to HBAR tokens
 */

// ============================================================================
// API Request/Response Interfaces
// ============================================================================

export interface HBARRechargeRequest {
  userId: string;
  xafAmount: number;
  userHederaAccountId: string;
  pin: string; // Orange Money PIN
}

export interface HBARRechargeResponse {
  transactionId: string;
  xafAmount: number;
  estimatedHBARAmount: number;
  conversionRate: number;
  fees: {
    orangeMoneyFee: number;
    platformFee: number;
    totalFees: number;
  };
  status: "payment_initiated" | "payment_confirmed" | "processing";
}

export interface RechargeStatusRequest {
  transactionId: string;
  userId: string;
}

export interface RechargeStatusResponse {
  transactionId: string;
  status: RechargeTransactionStatus;
  xafAmount: number;
  hbarAmount?: number;
  exchangeRate?: number;
  fees: FeeBreakdown;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
  orangeMoneyTransactionId?: string;
  hederaTransactionId?: string;
}

// ============================================================================
// Transaction Data Models
// ============================================================================

export type RechargeTransactionStatus =
  | "initiated"
  | "payment_confirmed"
  | "converting"
  | "completed"
  | "failed";

export interface FeeBreakdown {
  orangeMoneyFee: number;
  platformFee: number;
  totalFees: number;
}

export interface RechargeTransaction {
  PK: string; // USER#${userId}
  SK: string; // RECHARGE#${transactionId}

  // Core transaction data
  transactionId: string;
  userId: string;
  userHederaAccountId: string;

  // Financial data
  xafAmount: number;
  hbarAmount?: number;
  exchangeRate?: number;

  // Fee breakdown
  orangeMoneyFee: number;
  platformFee: number;
  totalFees: number;

  // Status tracking
  status: RechargeTransactionStatus;
  orangeMoneyTransactionId?: string;
  hederaTransactionId?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  // Error handling
  errorMessage?: string;
  retryCount: number;

  // GSI for status queries
  GSI1PK: string; // RECHARGE_STATUS#${status}
  GSI1SK: string; // ${createdAt}
}

// ============================================================================
// Exchange Rate Models
// ============================================================================

export interface ExchangeRate {
  xafToHbar: number;
  lastUpdated: string;
  source: string;
  confidence: "high" | "medium" | "low";
}

export interface ExchangeRateCache {
  PK: string; // EXCHANGE_RATE
  SK: string; // XAF_HBAR

  rate: number;
  source: string;
  lastUpdated: string;
  expiresAt: string;
  confidence: "high" | "medium" | "low";
}

export interface ConversionResult {
  xafAmount: number;
  hbarAmount: number;
  exchangeRate: number;
  platformFee: number;
  orangeMoneyFee: number;
  netHBARAmount: number;
}

// ============================================================================
// Hedera Integration Models
// ============================================================================

export interface HBARTransferParams {
  fromAccountId: string;
  toAccountId: string;
  amount: number; // in HBAR
  memo?: string;
}

export interface HBARTransferResult {
  transactionId: string;
  transactionHash: string;
  consensusTimestamp: string;
  actualCost: string;
  status: "success" | "failed";
}

// ============================================================================
// Event Schemas
// ============================================================================

export interface BaseEvent {
  eventId: string;
  eventType: string;
  source: string;
  timestamp: string;
  version: string;
}

export interface PaymentSuccessEvent extends BaseEvent {
  eventType: "ORANGE_MONEY_PAYMENT_SUCCESS";
  source: "sachain.payments";
  detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    orangeMoneyTransactionId: string;
    userHederaAccountId: string;
    fees: FeeBreakdown;
  };
}

export interface HBARConversionStartedEvent extends BaseEvent {
  eventType: "HBAR_CONVERSION_STARTED";
  source: "sachain.recharge";
  detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    exchangeRate: number;
    estimatedHBARAmount: number;
  };
}

export interface HBARConversionCompletedEvent extends BaseEvent {
  eventType: "HBAR_CONVERSION_COMPLETED";
  source: "sachain.recharge";
  detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    hbarAmount: number;
    exchangeRate: number;
    hederaTransactionId: string;
    fees: FeeBreakdown;
  };
}

export interface HBARConversionFailedEvent extends BaseEvent {
  eventType: "HBAR_CONVERSION_FAILED";
  source: "sachain.recharge";
  detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    errorMessage: string;
    retryCount: number;
    willRetry: boolean;
  };
}

// Union type for all recharge events
export type RechargeEvent =
  | PaymentSuccessEvent
  | HBARConversionStartedEvent
  | HBARConversionCompletedEvent
  | HBARConversionFailedEvent;

// ============================================================================
// Configuration Models
// ============================================================================

export interface RechargeConfig {
  limits: {
    minRechargeAmount: number; // Minimum XAF amount
    maxRechargeAmount: number; // Maximum XAF amount
    dailyUserLimit: number; // Daily limit per user in XAF
  };
  fees: {
    platformFeePercentage: number; // Platform fee as percentage
    orangeMoneyFeePercentage: number; // Orange Money fee as percentage
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  exchangeRate: {
    cacheTimeout: number; // Cache timeout in seconds
    staleThreshold: number; // Consider rate stale after X seconds
  };
}

// ============================================================================
// Error Models
// ============================================================================

export interface RechargeError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

export const RECHARGE_ERROR_CODES = {
  // Validation errors
  INVALID_AMOUNT: "INVALID_AMOUNT",
  AMOUNT_TOO_LOW: "AMOUNT_TOO_LOW",
  AMOUNT_TOO_HIGH: "AMOUNT_TOO_HIGH",
  INVALID_HEDERA_ACCOUNT: "INVALID_HEDERA_ACCOUNT",
  DAILY_LIMIT_EXCEEDED: "DAILY_LIMIT_EXCEEDED",

  // Authentication errors
  INVALID_USER: "INVALID_USER",
  INSUFFICIENT_KYC: "INSUFFICIENT_KYC",
  INSUFFICIENT_PRIVILEGES: "INSUFFICIENT_PRIVILEGES",

  // Payment errors
  ORANGE_MONEY_FAILED: "ORANGE_MONEY_FAILED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVALID_PIN: "INVALID_PIN",

  // Transaction errors
  TRANSACTION_NOT_FOUND: "TRANSACTION_NOT_FOUND",
  INVALID_TRANSACTION_STATE: "INVALID_TRANSACTION_STATE",

  // Conversion errors
  EXCHANGE_RATE_UNAVAILABLE: "EXCHANGE_RATE_UNAVAILABLE",
  HEDERA_NETWORK_ERROR: "HEDERA_NETWORK_ERROR",
  INSUFFICIENT_TREASURY_BALANCE: "INSUFFICIENT_TREASURY_BALANCE",

  // System errors
  DATABASE_ERROR: "DATABASE_ERROR",
  EVENT_PUBLISHING_FAILED: "EVENT_PUBLISHING_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type RechargeErrorCode =
  (typeof RECHARGE_ERROR_CODES)[keyof typeof RECHARGE_ERROR_CODES];
