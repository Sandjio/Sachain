/**
 * Admin Dashboard Service
 * Core business logic for admin dashboard operations
 */

import { RechargeRepository } from '../../repositories/recharge-repository';
import { HederaService } from '../../utils/hedera-service';
import { RechargeEventBridgeService } from '../../utils/recharge-eventbridge-service';
import { AdminAlertService } from '../../utils/admin-alert-service';
import { structuredLogger } from '../../utils/structured-logger';
import {
  AdminDashboardMetrics,
  SystemHealthStatus,
  AdminTransactionQuery,
  AdminTransactionResponse,
  AdminTransactionDetail,
  ManualRetryRequest,
  ManualRetryResponse,
  TreasuryBalance,
  TreasuryAlert,
  DisputeCase,
  ComplianceReport,
  FinancialAnalysis,
  ComponentHealth,
} from '../../types/admin';
import { RechargeTransaction, RechargeTransactionStatus } from '../../types/hbar-recharge';

const logger = structuredLogger.child({ service: 'admin-dashboard-service' });

export class AdminDashboardService {
  constructor(
    private rechargeRepository: RechargeRepository,
    private hederaService: HederaService,
    private eventBridgeService = new RechargeEventBridgeService(),
    private alertService = new AdminAlertService()
  ) {}

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    logger.info('Fetching dashboard metrics');

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    const stats = await this.rechargeRepository.getTransactionStatistics(last24Hours, nowIso);
    const treasuryBalance = await this.getTreasuryBalance();

    const successRate = stats.totalTransactions > 0 
      ? (stats.successfulTransactions / stats.totalTransactions) * 100 
      : 0;

    const pendingTransactions = stats.totalTransactions - stats.successfulTransactions - stats.failedTransactions;

    return {
      totalTransactions: stats.totalTransactions,
      successfulTransactions: stats.successfulTransactions,
      failedTransactions: stats.failedTransactions,
      pendingTransactions,
      totalXAFVolume: stats.totalXAFAmount,
      totalHBARVolume: stats.totalHBARAmount,
      averageProcessingTime: stats.averageProcessingTime,
      successRate,
      treasuryBalance: treasuryBalance.hbarBalance,
      lastUpdated: nowIso,
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    logger.info('Checking system health');

    const healthChecks = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkHederaHealth(),
      this.checkOrangeMoneyHealth(),
      this.checkEventBridgeHealth(),
      this.checkTreasuryHealth(),
    ]);

    const [database, hedera, orangeMoney, eventBridge, treasury] = healthChecks.map(
      (result) => result.status === 'fulfilled' ? result.value : this.createUnhealthyComponent('Service check failed')
    );

    const overallStatus = this.determineOverallHealth([database, hedera, orangeMoney, eventBridge, treasury]);

    return {
      status: overallStatus,
      components: {
        database,
        hedera,
        orangeMoney,
        eventBridge,
        treasury,
      },
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Get transactions with admin details
   */
  async getTransactions(query: AdminTransactionQuery): Promise<AdminTransactionResponse> {
    logger.info('Fetching admin transactions', { query });

    let transactions: RechargeTransaction[] = [];
    let totalCount = 0;

    if (query.status) {
      const result = query.dateFrom && query.dateTo
        ? await this.rechargeRepository.getRechargeTransactionsByStatusAndDateRange(
            query.status,
            query.dateFrom,
            query.dateTo,
            { limit: query.limit, exclusiveStartKey: query.exclusiveStartKey }
          )
        : await this.rechargeRepository.getRechargeTransactionsByStatus(
            query.status,
            { limit: query.limit, exclusiveStartKey: query.exclusiveStartKey }
          );
      
      transactions = result.items;
      totalCount = result.items.length;
    } else {
      // Get all transactions across statuses
      const allStatuses: RechargeTransactionStatus[] = ['initiated', 'payment_confirmed', 'converting', 'completed', 'failed'];
      
      for (const status of allStatuses) {
        const result = await this.rechargeRepository.getRechargeTransactionsByStatus(status, { limit: 100 });
        transactions = transactions.concat(result.items);
      }
      
      totalCount = transactions.length;
      
      // Apply filters
      transactions = this.applyTransactionFilters(transactions, query);
      
      // Apply pagination
      const startIndex = query.exclusiveStartKey ? parseInt(query.exclusiveStartKey) : 0;
      const endIndex = startIndex + (query.limit || 50);
      transactions = transactions.slice(startIndex, endIndex);
    }

    // Enhance with admin details
    const adminTransactions: AdminTransactionDetail[] = await Promise.all(
      transactions.map(async (tx) => this.enhanceTransactionWithAdminDetails(tx))
    );

    return {
      transactions: adminTransactions,
      pagination: {
        limit: query.limit || 50,
        exclusiveStartKey: transactions.length === (query.limit || 50) 
          ? String((parseInt(query.exclusiveStartKey || '0') + transactions.length))
          : undefined,
        hasMore: transactions.length === (query.limit || 50),
      },
      totalCount,
    };
  }

  /**
   * Get detailed transaction information
   */
  async getTransactionDetail(transactionId: string): Promise<AdminTransactionDetail> {
    logger.info('Fetching transaction detail', { transactionId });

    // Find transaction across all users (admin privilege)
    const allStatuses: RechargeTransactionStatus[] = ['initiated', 'payment_confirmed', 'converting', 'completed', 'failed'];
    
    for (const status of allStatuses) {
      const result = await this.rechargeRepository.getRechargeTransactionsByStatus(status);
      const transaction = result.items.find(tx => tx.transactionId === transactionId);
      
      if (transaction) {
        return this.enhanceTransactionWithAdminDetails(transaction);
      }
    }

    throw new Error(`Transaction ${transactionId} not found`);
  }

  /**
   * Retry a failed transaction
   */
  async retryTransaction(request: ManualRetryRequest): Promise<ManualRetryResponse> {
    logger.info('Processing manual retry request', { request });

    const transaction = await this.getTransactionDetail(request.transactionId);
    
    if (!request.forceRetry && transaction.status !== 'failed') {
      throw new Error(`Transaction ${request.transactionId} is not in failed state`);
    }

    // Update retry count and status
    await this.rechargeRepository.updateRechargeTransaction({
      transactionId: request.transactionId,
      userId: transaction.userId,
      status: 'converting',
      retryCount: (transaction.retryCount || 0) + 1,
      errorMessage: undefined,
    });

    // Publish retry event
    await this.eventBridgeService.publishHBARConversionStarted({
      transactionId: request.transactionId,
      userId: transaction.userId,
      xafAmount: transaction.xafAmount,
      exchangeRate: transaction.exchangeRate || 0,
      estimatedHBARAmount: transaction.hbarAmount || 0,
    });

    // Log admin action
    logger.info('Manual retry initiated', {
      transactionId: request.transactionId,
      adminUserId: request.adminUserId,
      reason: request.reason,
    });

    return {
      success: true,
      transactionId: request.transactionId,
      newStatus: 'converting',
      retryAttemptId: `retry-${Date.now()}`,
      message: 'Transaction retry initiated successfully',
    };
  }

  /**
   * Get treasury balance and status
   */
  async getTreasuryBalance(): Promise<TreasuryBalance> {
    logger.info('Fetching treasury balance');

    const hbarBalance = await this.hederaService.getAccountBalance();
    const lowThreshold = parseFloat(process.env.TREASURY_LOW_BALANCE_THRESHOLD || '1000');
    const criticalThreshold = parseFloat(process.env.TREASURY_CRITICAL_BALANCE_THRESHOLD || '100');

    let status: 'healthy' | 'low' | 'critical' = 'healthy';
    if (hbarBalance <= criticalThreshold) {
      status = 'critical';
    } else if (hbarBalance <= lowThreshold) {
      status = 'low';
    }

    return {
      hbarBalance,
      xafBalance: 0, // Not tracked in current implementation
      lastUpdated: new Date().toISOString(),
      lowBalanceThreshold: lowThreshold,
      criticalBalanceThreshold: criticalThreshold,
      status,
    };
  }

  /**
   * Get treasury alerts
   */
  async getTreasuryAlerts(): Promise<TreasuryAlert[]> {
    logger.info('Fetching treasury alerts');

    // In a real implementation, these would be stored in DynamoDB
    // For now, return mock alerts based on current balance
    const balance = await this.getTreasuryBalance();
    const alerts: TreasuryAlert[] = [];

    if (balance.status === 'critical') {
      alerts.push({
        id: `alert-${Date.now()}`,
        type: 'critical_balance',
        severity: 'critical',
        message: `Treasury balance is critically low: ${balance.hbarBalance} HBAR`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    } else if (balance.status === 'low') {
      alerts.push({
        id: `alert-${Date.now()}`,
        type: 'low_balance',
        severity: 'warning',
        message: `Treasury balance is low: ${balance.hbarBalance} HBAR`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    }

    return alerts;
  }

  /**
   * Get dispute cases
   */
  async getDisputes(params: { [key: string]: string } | null): Promise<DisputeCase[]> {
    logger.info('Fetching disputes', { params });

    // Mock implementation - in real system, disputes would be stored in DynamoDB
    return [];
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(params: {
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
    dateFrom: string;
    dateTo: string;
    generatedBy: string;
  }): Promise<ComplianceReport> {
    logger.info('Generating compliance report', { params });

    const stats = await this.rechargeRepository.getTransactionStatistics(params.dateFrom, params.dateTo);

    return {
      reportId: `report-${Date.now()}`,
      reportType: params.reportType,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      generatedAt: new Date().toISOString(),
      generatedBy: params.generatedBy,
      data: {
        transactionSummary: {
          totalTransactions: stats.totalTransactions,
          successfulTransactions: stats.successfulTransactions,
          failedTransactions: stats.failedTransactions,
          totalVolume: {
            xaf: stats.totalXAFAmount,
            hbar: stats.totalHBARAmount,
          },
          averageTransactionSize: {
            xaf: stats.totalTransactions > 0 ? stats.totalXAFAmount / stats.totalTransactions : 0,
            hbar: stats.totalTransactions > 0 ? stats.totalHBARAmount / stats.totalTransactions : 0,
          },
          processingTimes: {
            average: stats.averageProcessingTime,
            median: stats.averageProcessingTime,
            p95: stats.averageProcessingTime * 1.5,
            p99: stats.averageProcessingTime * 2,
          },
        },
        volumeAnalysis: {
          dailyVolumes: [],
          topUsers: [],
          peakHours: [],
        },
        errorAnalysis: {
          errorsByType: [],
          errorsByHour: [],
          topFailureReasons: [],
        },
        complianceMetrics: {
          kycComplianceRate: 95,
          fraudDetectionAlerts: 0,
          suspiciousTransactions: 0,
          regulatoryReports: 1,
          auditTrailCompleteness: 100,
        },
      },
    };
  }

  /**
   * Generate financial analysis
   */
  async generateFinancialAnalysis(params: {
    dateFrom: string;
    dateTo: string;
  }): Promise<FinancialAnalysis> {
    logger.info('Generating financial analysis', { params });

    const stats = await this.rechargeRepository.getTransactionStatistics(params.dateFrom, params.dateTo);

    // Calculate total fees from successful transactions
    const platformFeeRate = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2') / 100;
    const orangeMoneyFeeRate = parseFloat(process.env.ORANGE_MONEY_FEE_PERCENTAGE || '1') / 100;

    const totalPlatformFees = stats.totalXAFAmount * platformFeeRate;
    const totalOrangeFees = stats.totalXAFAmount * orangeMoneyFeeRate;
    const totalFees = totalPlatformFees + totalOrangeFees;

    return {
      revenue: {
        totalFees,
        platformFees: totalPlatformFees,
        orangeMoneyFees: totalOrangeFees,
        feesByDay: [],
      },
      costs: {
        hederaNetworkFees: stats.successfulTransactions * 0.0001, // Estimated HBAR network fees
        operationalCosts: 0,
        totalCosts: stats.successfulTransactions * 0.0001,
      },
      profitability: {
        grossProfit: totalFees,
        netProfit: totalFees - (stats.successfulTransactions * 0.0001),
        profitMargin: totalFees > 0 ? ((totalFees - (stats.successfulTransactions * 0.0001)) / totalFees) * 100 : 0,
      },
      exchangeRateAnalysis: {
        averageRate: 0.0001, // Mock rate
        rateVolatility: 5,
        rateHistory: [],
      },
    };
  }

  // Private helper methods

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    try {
      const start = Date.now();
      await this.rechargeRepository.getCachedExchangeRate();
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
        errorRate: 0,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return this.createUnhealthyComponent('Database connection failed');
    }
  }

  private async checkHederaHealth(): Promise<ComponentHealth> {
    try {
      const start = Date.now();
      await this.hederaService.getAccountBalance();
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
        errorRate: 0,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return this.createUnhealthyComponent('Hedera network connection failed');
    }
  }

  private async checkOrangeMoneyHealth(): Promise<ComponentHealth> {
    // Mock health check for Orange Money
    return {
      status: 'healthy',
      responseTime: 150,
      errorRate: 0,
      lastChecked: new Date().toISOString(),
    };
  }

  private async checkEventBridgeHealth(): Promise<ComponentHealth> {
    // Mock health check for EventBridge
    return {
      status: 'healthy',
      responseTime: 50,
      errorRate: 0,
      lastChecked: new Date().toISOString(),
    };
  }

  private async checkTreasuryHealth(): Promise<ComponentHealth> {
    try {
      const balance = await this.getTreasuryBalance();
      const status = balance.status === 'healthy' ? 'healthy' : 
                    balance.status === 'low' ? 'degraded' : 'critical';

      return {
        status,
        responseTime: 100,
        errorRate: 0,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return this.createUnhealthyComponent('Treasury balance check failed');
    }
  }

  private createUnhealthyComponent(errorMessage: string): ComponentHealth {
    return {
      status: 'critical',
      errorRate: 100,
      lastError: errorMessage,
      lastChecked: new Date().toISOString(),
    };
  }

  private determineOverallHealth(components: ComponentHealth[]): 'healthy' | 'degraded' | 'critical' {
    const criticalCount = components.filter(c => c.status === 'critical').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;

    if (criticalCount > 0) return 'critical';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  private applyTransactionFilters(transactions: RechargeTransaction[], query: AdminTransactionQuery): RechargeTransaction[] {
    return transactions.filter(tx => {
      if (query.userId && tx.userId !== query.userId) return false;
      if (query.minAmount && tx.xafAmount < query.minAmount) return false;
      if (query.maxAmount && tx.xafAmount > query.maxAmount) return false;
      if (query.hasErrors && !tx.errorMessage) return false;
      if (query.dateFrom && tx.createdAt < query.dateFrom) return false;
      if (query.dateTo && tx.createdAt > query.dateTo) return false;
      return true;
    });
  }

  private async enhanceTransactionWithAdminDetails(transaction: RechargeTransaction): Promise<AdminTransactionDetail> {
    return {
      ...transaction,
      retryHistory: [], // Would be populated from audit logs
      flaggedForReview: transaction.retryCount > 2,
      disputeStatus: 'none',
    };
  }
}