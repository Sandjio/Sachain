/**
 * Types for HBAR Recharge Handler Lambda
 */

import {
  HBARRechargeRequest,
  HBARRechargeResponse,
  RechargeTransaction,
  RechargeError,
  FeeBreakdown,
} from "../../types/hbar-recharge";

// Re-export core types for convenience
export {
  HBARRechargeRequest,
  HBARRechargeResponse,
  RechargeTransaction,
  RechargeError,
  FeeBreakdown,
};

// Service-specific interfaces
export interface HBARRechargeServiceConfig {
  tableName: string;
  eventBusName: string;
  region?: string;
}

export interface RechargeServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface RechargeInitiationResult {
  transactionId: string;
  xafAmount: number;
  estimatedHBARAmount: number;
  conversionRate: number;
  fees: FeeBreakdown;
  status: "payment_initiated";
  orangeMoneyTransactionId?: string;
}

export interface DailySpendingInfo {
  userId: string;
  date: string;
  totalSpent: number;
  transactionCount: number;
  lastUpdated: string;
}

export interface RechargeValidationContext {
  userId: string;
  xafAmount: number;
  userHederaAccountId: string;
  customerNumber: string;
  pin: string;
  currentDailySpent?: number;
}

export interface HealthCheckResult {
  database: boolean;
  eventBridge: boolean;
  exchangeRate: boolean;
  orangeMoney: boolean;
  timestamp: string;
}

// Event types for recharge system
export interface RechargeEventDetail {
  transactionId: string;
  userId: string;
  xafAmount: number;
  userHederaAccountId: string;
  fees: FeeBreakdown;
  orangeMoneyTransactionId?: string;
  timestamp: string;
}

export interface PaymentInitiatedEvent {
  eventType: "PAYMENT_INITIATED";
  source: "sachain.recharge";
  detail: RechargeEventDetail;
}

export interface PaymentConfirmedEvent {
  eventType: "PAYMENT_CONFIRMED";
  source: "sachain.recharge";
  detail: RechargeEventDetail & {
    orangeMoneyTransactionId: string;
  };
}

// Configuration interfaces
export interface RechargeServiceLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
}

export interface RechargeServiceFees {
  platformFeePercentage: number;
  orangeMoneyFeePercentage: number;
}

export interface RechargeServiceConfig {
  limits: RechargeServiceLimits;
  fees: RechargeServiceFees;
  exchangeRate: {
    cacheTimeout: number;
    staleThreshold: number;
  };
}

// Error classification
export interface ErrorContext {
  operation: string;
  userId?: string;
  transactionId?: string;
  xafAmount?: number;
  timestamp: string;
}

export interface ClassifiedError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  context: ErrorContext;
}

// Audit and logging
export interface RechargeAuditLog {
  transactionId: string;
  userId: string;
  operation: string;
  status: "success" | "failure";
  details: Record<string, any>;
  timestamp: string;
  duration?: number;
}

export interface RechargeMetrics {
  operation: string;
  success: boolean;
  duration: number;
  xafAmount?: number;
  errorCode?: string;
  timestamp: string;
}

// Repository interfaces
export interface RechargeRepository {
  createTransaction(transaction: RechargeTransaction): Promise<void>;
  getTransaction(
    transactionId: string,
    userId: string
  ): Promise<RechargeTransaction | null>;
  updateTransactionStatus(
    transactionId: string,
    userId: string,
    status: string,
    updates?: Partial<RechargeTransaction>
  ): Promise<void>;
  getDailySpending(userId: string, date: string): Promise<number>;
  updateDailySpending(
    userId: string,
    date: string,
    amount: number
  ): Promise<void>;
}

// Orange Money integration
export interface OrangeMoneyPaymentRequest {
  transactionId: string;
  userId: string;
  customerNumber: string;
  xafAmount: number;
  userHederaAccountId: string;
  estimatedHBARAmount: number;
  fees: FeeBreakdown;
  pin: string;
}

export interface OrangeMoneyPaymentResult {
  success: boolean;
  orangeMoneyTransactionId?: string;
  paymentData?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Exchange rate service integration
export interface ExchangeRateInfo {
  xafToHbar: number;
  lastUpdated: string;
  source: string;
  confidence: "high" | "medium" | "low";
}

export interface ConversionCalculation {
  xafAmount: number;
  hbarAmount: number;
  exchangeRate: number;
  platformFee: number;
  orangeMoneyFee: number;
  netHBARAmount: number;
}

// EventBridge integration
export interface EventPublishResult {
  success: boolean;
  eventId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface RechargeEventPublisher {
  publishPaymentInitiated(
    detail: RechargeEventDetail
  ): Promise<EventPublishResult>;
  publishPaymentConfirmed(
    detail: RechargeEventDetail & { orangeMoneyTransactionId: string }
  ): Promise<EventPublishResult>;
}

// Service dependencies
export interface ServiceDependencies {
  rechargeRepository: RechargeRepository;
  exchangeRateService: any; // Will be typed when we import the actual service
  orangeMoneyService: any; // Will be typed when we import the actual service
  eventPublisher: RechargeEventPublisher;
  logger: any; // Will be typed when we import the actual logger
}

// Request validation
export interface ValidationRule<T = any> {
  field: string;
  validator: (value: T) => boolean;
  errorCode: string;
  errorMessage: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    code: string;
    message: string;
  }>;
}

// Fee calculation
export interface FeeCalculationInput {
  xafAmount: number;
  platformFeePercentage: number;
  orangeMoneyFeePercentage: number;
}

export interface FeeCalculationResult extends FeeBreakdown {
  netAmount: number; // Amount after fees
}

// Transaction state management
export type TransactionStatus =
  | "initiated"
  | "payment_confirmed"
  | "converting"
  | "completed"
  | "failed";

export interface TransactionStateTransition {
  from: TransactionStatus;
  to: TransactionStatus;
  allowed: boolean;
  reason?: string;
}

// Rate limiting
export interface RateLimitInfo {
  userId: string;
  requestCount: number;
  windowStart: string;
  windowEnd: string;
  limitExceeded: boolean;
}

export interface RateLimitConfig {
  windowSizeMinutes: number;
  maxRequestsPerWindow: number;
  enabled: boolean;
}
