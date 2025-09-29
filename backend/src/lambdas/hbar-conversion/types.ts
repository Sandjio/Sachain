/**
 * Types for HBAR Conversion Handler Lambda
 */

import {
  PaymentSuccessEvent,
  HBARConversionStartedEvent,
  HBARConversionCompletedEvent,
  HBARConversionFailedEvent,
  RechargeTransaction,
  ConversionResult,
  HBARTransferParams,
  HBARTransferResult,
} from "../../types/hbar-recharge";

// Re-export core types for convenience
export {
  PaymentSuccessEvent,
  HBARConversionStartedEvent,
  HBARConversionCompletedEvent,
  HBARConversionFailedEvent,
  RechargeTransaction,
  ConversionResult,
  HBARTransferParams,
  HBARTransferResult,
};

// Service-specific interfaces
export interface ConversionServiceConfig {
  tableName: string;
  eventBusName: string;
  treasuryAccountId: string;
  region?: string;
}

export interface ConversionServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
}

export interface ConversionCompletionResult {
  transactionId: string;
  hbarAmount: number;
  hederaTransactionId: string;
  exchangeRate: number;
  actualCost: string;
}

export interface ConversionHealthCheck {
  database: boolean;
  eventBridge: boolean;
  exchangeRate: boolean;
  hederaNetwork: boolean;
}

// Retry configuration
export interface ConversionRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

// Monitoring and metrics
export interface ConversionMetrics {
  operation: string;
  success: boolean;
  duration: number;
  xafAmount?: number;
  hbarAmount?: number;
  errorCode?: string;
  timestamp: string;
}

export interface ConversionStats {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  totalXAFProcessed: number;
  totalHBARTransferred: number;
  averageConversionTime: number;
}

// Error handling
export interface ConversionError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  context: {
    operation: string;
    transactionId?: string;
    userId?: string;
    xafAmount?: number;
    timestamp: string;
  };
}

// Treasury management
export interface TreasuryBalanceInfo {
  accountId: string;
  balance: number;
  threshold: number;
  isAboveThreshold: boolean;
  lastChecked: string;
}

export interface TreasuryAlert {
  type: "LOW_BALANCE" | "CRITICAL_BALANCE" | "TRANSFER_FAILED";
  accountId: string;
  currentBalance: number;
  threshold: number;
  message: string;
  timestamp: string;
  severity: "warning" | "critical";
}

// Conversion queue management
export interface ConversionQueueItem {
  transactionId: string;
  userId: string;
  xafAmount: number;
  priority: "high" | "normal" | "low";
  retryCount: number;
  scheduledAt: string;
  createdAt: string;
}

export interface ConversionBatch {
  batchId: string;
  items: ConversionQueueItem[];
  totalXAFAmount: number;
  estimatedHBARAmount: number;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  processedAt?: string;
}

// Rate limiting and throttling
export interface ConversionRateLimit {
  userId?: string;
  accountId?: string;
  requestCount: number;
  windowStart: string;
  windowEnd: string;
  limitExceeded: boolean;
}

export interface ConversionThrottleConfig {
  maxConcurrentConversions: number;
  maxConversionsPerMinute: number;
  maxHBARPerHour: number;
  enabled: boolean;
}

// Audit and compliance
export interface ConversionAuditLog {
  transactionId: string;
  userId: string;
  operation: string;
  status: "success" | "failure";
  details: {
    xafAmount: number;
    hbarAmount?: number;
    exchangeRate?: number;
    hederaTransactionId?: string;
    errorMessage?: string;
  };
  timestamp: string;
  duration?: number;
}

// Event processing
export interface EventProcessingResult {
  eventId: string;
  processed: boolean;
  error?: string;
  processingTime: number;
  retryCount: number;
}

export interface EventProcessingStats {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  lastProcessedAt: string;
}

// Configuration and settings
export interface ConversionSettings {
  enabled: boolean;
  batchProcessing: boolean;
  maxBatchSize: number;
  processingTimeout: number;
  retryConfig: ConversionRetryConfig;
  throttleConfig: ConversionThrottleConfig;
  treasuryThreshold: number;
  alertThresholds: {
    lowBalance: number;
    criticalBalance: number;
    failureRate: number;
  };
}

// Lambda event types
export interface ConversionLambdaEvent {
  source: string;
  "detail-type": string;
  detail: PaymentSuccessEvent["detail"];
  time: string;
  region: string;
  account: string;
}

export interface ConversionLambdaContext {
  awsRequestId: string;
  functionName: string;
  functionVersion: string;
  memoryLimitInMB: string;
  remainingTimeInMillis: number;
}

// Response types
export interface ConversionLambdaResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  dependencies: ConversionHealthCheck;
  version: string;
}

// Utility types
export type ConversionStatus = RechargeTransaction["status"];

export type ConversionEventType =
  | "HBAR_CONVERSION_STARTED"
  | "HBAR_CONVERSION_COMPLETED"
  | "HBAR_CONVERSION_FAILED";

export interface ConversionEventDetail {
  transactionId: string;
  userId: string;
  eventType: ConversionEventType;
  timestamp: string;
  data: Record<string, any>;
}

// Database query types
export interface ConversionQuery {
  status?: ConversionStatus;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  lastEvaluatedKey?: Record<string, any>;
}

export interface ConversionQueryResult {
  items: RechargeTransaction[];
  lastEvaluatedKey?: Record<string, any>;
  count: number;
  scannedCount: number;
}

// Notification types
export interface ConversionNotification {
  type: "SUCCESS" | "FAILURE" | "RETRY" | "ALERT";
  transactionId: string;
  userId: string;
  message: string;
  data: Record<string, any>;
  channels: ("email" | "sms" | "push")[];
  priority: "high" | "normal" | "low";
}

export interface NotificationTemplate {
  type: ConversionNotification["type"];
  subject: string;
  body: string;
  variables: string[];
}

// Integration types
export interface ExternalServiceConfig {
  name: string;
  endpoint: string;
  timeout: number;
  retries: number;
  apiKey?: string;
  enabled: boolean;
}

export interface ServiceHealthStatus {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime: number;
  lastChecked: string;
  error?: string;
}
