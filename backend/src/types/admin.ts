/**
 * Admin dashboard and management tool types
 */

import { RechargeTransaction, RechargeTransactionStatus } from './hbar-recharge';

// ============================================================================
// Admin Dashboard Types
// ============================================================================

export interface AdminDashboardMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalXAFVolume: number;
  totalHBARVolume: number;
  averageProcessingTime: number;
  successRate: number;
  treasuryBalance: number;
  lastUpdated: string;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  components: {
    database: ComponentHealth;
    hedera: ComponentHealth;
    orangeMoney: ComponentHealth;
    eventBridge: ComponentHealth;
    treasury: ComponentHealth;
  };
  lastChecked: string;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical';
  responseTime?: number;
  errorRate?: number;
  lastError?: string;
  lastChecked: string;
}

// ============================================================================
// Transaction Management Types
// ============================================================================

export interface AdminTransactionQuery {
  status?: RechargeTransactionStatus;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  hasErrors?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface AdminTransactionResponse {
  transactions: AdminTransactionDetail[];
  pagination: {
    limit: number;
    exclusiveStartKey?: string;
    hasMore: boolean;
  };
  totalCount: number;
}

export interface AdminTransactionDetail extends RechargeTransaction {
  retryHistory?: RetryAttempt[];
  adminNotes?: string;
  flaggedForReview?: boolean;
  disputeStatus?: DisputeStatus;
}

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: string;
  errorMessage?: string;
  adminUserId?: string;
  result: 'success' | 'failed' | 'pending';
}

// ============================================================================
// Manual Retry Types
// ============================================================================

export interface ManualRetryRequest {
  transactionId: string;
  adminUserId: string;
  reason: string;
  forceRetry?: boolean;
}

export interface ManualRetryResponse {
  success: boolean;
  transactionId: string;
  newStatus: RechargeTransactionStatus;
  retryAttemptId: string;
  message: string;
}

// ============================================================================
// Treasury Management Types
// ============================================================================

export interface TreasuryBalance {
  hbarBalance: number;
  xafBalance: number;
  lastUpdated: string;
  lowBalanceThreshold: number;
  criticalBalanceThreshold: number;
  status: 'healthy' | 'low' | 'critical';
}

export interface TreasuryAlert {
  id: string;
  type: 'low_balance' | 'critical_balance' | 'failed_transfer' | 'rate_limit_exceeded';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface TreasuryOperation {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  currency: 'HBAR' | 'XAF';
  status: 'pending' | 'completed' | 'failed';
  adminUserId: string;
  timestamp: string;
  transactionHash?: string;
  errorMessage?: string;
}

// ============================================================================
// Dispute Resolution Types
// ============================================================================

export type DisputeStatus = 'none' | 'reported' | 'investigating' | 'resolved' | 'rejected';

export interface DisputeCase {
  id: string;
  transactionId: string;
  userId: string;
  reportedBy: string;
  disputeType: 'payment_failed' | 'wrong_amount' | 'duplicate_charge' | 'unauthorized' | 'other';
  description: string;
  status: DisputeStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  refundAmount?: number;
  refundStatus?: 'pending' | 'completed' | 'failed';
}

export interface RefundRequest {
  transactionId: string;
  disputeId?: string;
  amount: number;
  currency: 'HBAR' | 'XAF';
  reason: string;
  adminUserId: string;
  approvalRequired: boolean;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  status: 'pending_approval' | 'processing' | 'completed' | 'failed';
  message: string;
}

// ============================================================================
// Reporting Types
// ============================================================================

export interface ComplianceReport {
  reportId: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  generatedBy: string;
  data: {
    transactionSummary: TransactionSummary;
    volumeAnalysis: VolumeAnalysis;
    errorAnalysis: ErrorAnalysis;
    complianceMetrics: ComplianceMetrics;
  };
}

export interface TransactionSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalVolume: {
    xaf: number;
    hbar: number;
  };
  averageTransactionSize: {
    xaf: number;
    hbar: number;
  };
  processingTimes: {
    average: number;
    median: number;
    p95: number;
    p99: number;
  };
}

export interface VolumeAnalysis {
  dailyVolumes: Array<{
    date: string;
    xafVolume: number;
    hbarVolume: number;
    transactionCount: number;
  }>;
  topUsers: Array<{
    userId: string;
    transactionCount: number;
    totalVolume: number;
  }>;
  peakHours: Array<{
    hour: number;
    transactionCount: number;
    averageVolume: number;
  }>;
}

export interface ErrorAnalysis {
  errorsByType: Array<{
    errorCode: string;
    count: number;
    percentage: number;
  }>;
  errorsByHour: Array<{
    hour: number;
    errorCount: number;
    errorRate: number;
  }>;
  topFailureReasons: Array<{
    reason: string;
    count: number;
    impact: 'low' | 'medium' | 'high';
  }>;
}

export interface ComplianceMetrics {
  kycComplianceRate: number;
  fraudDetectionAlerts: number;
  suspiciousTransactions: number;
  regulatoryReports: number;
  auditTrailCompleteness: number;
}

// ============================================================================
// Financial Analysis Types
// ============================================================================

export interface FinancialAnalysis {
  revenue: {
    totalFees: number;
    platformFees: number;
    orangeMoneyFees: number;
    feesByDay: Array<{
      date: string;
      totalFees: number;
      transactionCount: number;
    }>;
  };
  costs: {
    hederaNetworkFees: number;
    operationalCosts: number;
    totalCosts: number;
  };
  profitability: {
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
  };
  exchangeRateAnalysis: {
    averageRate: number;
    rateVolatility: number;
    rateHistory: Array<{
      timestamp: string;
      rate: number;
      source: string;
    }>;
  };
}

// ============================================================================
// Admin API Request/Response Types
// ============================================================================

export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId: string;
  timestamp: string;
}

export interface AdminAuthContext {
  adminUserId: string;
  permissions: AdminPermission[];
  sessionId: string;
}

export type AdminPermission = 
  | 'view_dashboard'
  | 'view_transactions'
  | 'retry_transactions'
  | 'manage_treasury'
  | 'handle_disputes'
  | 'generate_reports'
  | 'system_admin';

// ============================================================================
// Error Codes
// ============================================================================

export const ADMIN_ERROR_CODES = {
  UNAUTHORIZED: 'ADMIN_UNAUTHORIZED',
  INSUFFICIENT_PERMISSIONS: 'ADMIN_INSUFFICIENT_PERMISSIONS',
  TRANSACTION_NOT_FOUND: 'ADMIN_TRANSACTION_NOT_FOUND',
  INVALID_RETRY_STATE: 'ADMIN_INVALID_RETRY_STATE',
  TREASURY_OPERATION_FAILED: 'ADMIN_TREASURY_OPERATION_FAILED',
  DISPUTE_NOT_FOUND: 'ADMIN_DISPUTE_NOT_FOUND',
  REFUND_FAILED: 'ADMIN_REFUND_FAILED',
  REPORT_GENERATION_FAILED: 'ADMIN_REPORT_GENERATION_FAILED',
  SYSTEM_HEALTH_CHECK_FAILED: 'ADMIN_SYSTEM_HEALTH_CHECK_FAILED',
} as const;

export type AdminErrorCode = typeof ADMIN_ERROR_CODES[keyof typeof ADMIN_ERROR_CODES];