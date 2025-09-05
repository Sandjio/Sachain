/**
 * Admin Dashboard Service Tests
 */

import { AdminDashboardService } from '../admin-dashboard-service';
import { RechargeRepository } from '../../../repositories/recharge-repository';
import { HederaService } from '../../../utils/hedera-service';
import { RechargeEventBridgeService } from '../../../utils/recharge-eventbridge-service';
import { AdminAlertService } from '../../../utils/admin-alert-service';
import { RechargeTransaction } from '../../../types/hbar-recharge';

// Mock dependencies
jest.mock('../../../repositories/recharge-repository');
jest.mock('../../../utils/hedera-service');
jest.mock('../../../utils/recharge-eventbridge-service');
jest.mock('../../../utils/admin-alert-service');

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let mockRechargeRepository: jest.Mocked<RechargeRepository>;
  let mockHederaService: jest.Mocked<HederaService>;
  let mockEventBridgeService: jest.Mocked<RechargeEventBridgeService>;
  let mockAlertService: jest.Mocked<AdminAlertService>;

  beforeEach(() => {
    mockRechargeRepository = new RechargeRepository({
      tableName: 'test-table',
      region: 'us-east-1',
    }) as jest.Mocked<RechargeRepository>;

    mockHederaService = new HederaService({
      accountId: '0.0.123',
      privateKey: 'test-key',
      network: 'testnet',
    }) as jest.Mocked<HederaService>;

    mockEventBridgeService = new RechargeEventBridgeService() as jest.Mocked<RechargeEventBridgeService>;
    mockAlertService = new AdminAlertService() as jest.Mocked<AdminAlertService>;

    service = new AdminDashboardService(
      mockRechargeRepository,
      mockHederaService,
      mockEventBridgeService,
      mockAlertService
    );
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics', async () => {
      // Arrange
      const mockStats = {
        totalTransactions: 100,
        successfulTransactions: 85,
        failedTransactions: 10,
        totalXAFAmount: 1000000,
        totalHBARAmount: 100,
        averageProcessingTime: 30,
      };

      mockRechargeRepository.getTransactionStatistics.mockResolvedValue(mockStats);
      mockHederaService.getAccountBalance.mockResolvedValue(5000);

      // Act
      const result = await service.getDashboardMetrics();

      // Assert
      expect(result).toEqual({
        totalTransactions: 100,
        successfulTransactions: 85,
        failedTransactions: 10,
        pendingTransactions: 5, // 100 - 85 - 10
        totalXAFVolume: 1000000,
        totalHBARVolume: 100,
        averageProcessingTime: 30,
        successRate: 85, // 85/100 * 100
        treasuryBalance: 5000,
        lastUpdated: expect.any(String),
      });
    });

    it('should handle zero transactions', async () => {
      // Arrange
      const mockStats = {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalXAFAmount: 0,
        totalHBARAmount: 0,
        averageProcessingTime: 0,
      };

      mockRechargeRepository.getTransactionStatistics.mockResolvedValue(mockStats);
      mockHederaService.getAccountBalance.mockResolvedValue(1000);

      // Act
      const result = await service.getDashboardMetrics();

      // Assert
      expect(result.successRate).toBe(0);
      expect(result.pendingTransactions).toBe(0);
    });
  });

  describe('getSystemHealth', () => {
    it('should return healthy status when all components are healthy', async () => {
      // Arrange
      mockRechargeRepository.getCachedExchangeRate.mockResolvedValue(null);
      mockHederaService.getAccountBalance.mockResolvedValue(5000);

      // Act
      const result = await service.getSystemHealth();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.components.database.status).toBe('healthy');
      expect(result.components.hedera.status).toBe('healthy');
      expect(result.components.treasury.status).toBe('healthy');
    });

    it('should return critical status when treasury balance is critical', async () => {
      // Arrange
      mockRechargeRepository.getCachedExchangeRate.mockResolvedValue(null);
      mockHederaService.getAccountBalance.mockResolvedValue(50); // Below critical threshold

      // Act
      const result = await service.getSystemHealth();

      // Assert
      expect(result.status).toBe('critical');
      expect(result.components.treasury.status).toBe('critical');
    });

    it('should handle component failures gracefully', async () => {
      // Arrange
      mockRechargeRepository.getCachedExchangeRate.mockRejectedValue(new Error('DB Error'));
      mockHederaService.getAccountBalance.mockRejectedValue(new Error('Hedera Error'));

      // Act
      const result = await service.getSystemHealth();

      // Assert
      expect(result.status).toBe('critical');
      expect(result.components.database.status).toBe('critical');
      expect(result.components.hedera.status).toBe('critical');
    });
  });

  describe('retryTransaction', () => {
    it('should retry a failed transaction', async () => {
      // Arrange
      const mockTransaction: RechargeTransaction = {
        PK: 'USER#user123',
        SK: 'RECHARGE#tx123',
        transactionId: 'tx123',
        userId: 'user123',
        userHederaAccountId: '0.0.456',
        xafAmount: 10000,
        orangeMoneyFee: 100,
        platformFee: 200,
        totalFees: 300,
        status: 'failed',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        retryCount: 1,
        GSI1PK: 'RECHARGE_STATUS#failed',
        GSI1SK: '2023-01-01T00:00:00Z',
        exchangeRate: 0.0001,
        hbarAmount: 1,
        errorMessage: 'Network error',
      };

      // Mock finding the transaction
      mockRechargeRepository.getRechargeTransactionsByStatus.mockResolvedValue({
        items: [mockTransaction],
        lastEvaluatedKey: undefined,
      });

      mockRechargeRepository.updateRechargeTransaction.mockResolvedValue();
      mockEventBridgeService.publishHBARConversionStarted.mockResolvedValue();

      // Act
      const result = await service.retryTransaction({
        transactionId: 'tx123',
        adminUserId: 'admin123',
        reason: 'Manual retry',
        forceRetry: false,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('tx123');
      expect(result.newStatus).toBe('converting');
      expect(mockRechargeRepository.updateRechargeTransaction).toHaveBeenCalledWith({
        transactionId: 'tx123',
        userId: 'user123',
        status: 'converting',
        retryCount: 2,
        errorMessage: undefined,
      });
    });

    it('should reject retry for non-failed transaction without force flag', async () => {
      // Arrange
      const mockTransaction: RechargeTransaction = {
        PK: 'USER#user123',
        SK: 'RECHARGE#tx123',
        transactionId: 'tx123',
        userId: 'user123',
        userHederaAccountId: '0.0.456',
        xafAmount: 10000,
        orangeMoneyFee: 100,
        platformFee: 200,
        totalFees: 300,
        status: 'completed',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        retryCount: 0,
        GSI1PK: 'RECHARGE_STATUS#completed',
        GSI1SK: '2023-01-01T00:00:00Z',
      };

      mockRechargeRepository.getRechargeTransactionsByStatus.mockResolvedValue({
        items: [mockTransaction],
        lastEvaluatedKey: undefined,
      });

      // Act & Assert
      await expect(
        service.retryTransaction({
          transactionId: 'tx123',
          adminUserId: 'admin123',
          reason: 'Manual retry',
          forceRetry: false,
        })
      ).rejects.toThrow('Transaction tx123 is not in failed state');
    });

    it('should allow force retry for non-failed transaction', async () => {
      // Arrange
      const mockTransaction: RechargeTransaction = {
        PK: 'USER#user123',
        SK: 'RECHARGE#tx123',
        transactionId: 'tx123',
        userId: 'user123',
        userHederaAccountId: '0.0.456',
        xafAmount: 10000,
        orangeMoneyFee: 100,
        platformFee: 200,
        totalFees: 300,
        status: 'completed',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        retryCount: 0,
        GSI1PK: 'RECHARGE_STATUS#completed',
        GSI1SK: '2023-01-01T00:00:00Z',
      };

      mockRechargeRepository.getRechargeTransactionsByStatus.mockResolvedValue({
        items: [mockTransaction],
        lastEvaluatedKey: undefined,
      });

      mockRechargeRepository.updateRechargeTransaction.mockResolvedValue();
      mockEventBridgeService.publishHBARConversionStarted.mockResolvedValue();

      // Act
      const result = await service.retryTransaction({
        transactionId: 'tx123',
        adminUserId: 'admin123',
        reason: 'Force retry',
        forceRetry: true,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockRechargeRepository.updateRechargeTransaction).toHaveBeenCalled();
    });
  });

  describe('getTreasuryBalance', () => {
    it('should return healthy treasury status', async () => {
      // Arrange
      mockHederaService.getAccountBalance.mockResolvedValue(5000);

      // Act
      const result = await service.getTreasuryBalance();

      // Assert
      expect(result).toEqual({
        hbarBalance: 5000,
        xafBalance: 0,
        lastUpdated: expect.any(String),
        lowBalanceThreshold: 1000,
        criticalBalanceThreshold: 100,
        status: 'healthy',
      });
    });

    it('should return low status when balance is below threshold', async () => {
      // Arrange
      mockHederaService.getAccountBalance.mockResolvedValue(500);

      // Act
      const result = await service.getTreasuryBalance();

      // Assert
      expect(result.status).toBe('low');
    });

    it('should return critical status when balance is critically low', async () => {
      // Arrange
      mockHederaService.getAccountBalance.mockResolvedValue(50);

      // Act
      const result = await service.getTreasuryBalance();

      // Assert
      expect(result.status).toBe('critical');
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report', async () => {
      // Arrange
      const mockStats = {
        totalTransactions: 100,
        successfulTransactions: 85,
        failedTransactions: 15,
        totalXAFAmount: 1000000,
        totalHBARAmount: 100,
        averageProcessingTime: 30,
      };

      mockRechargeRepository.getTransactionStatistics.mockResolvedValue(mockStats);

      // Act
      const result = await service.generateComplianceReport({
        reportType: 'daily',
        dateFrom: '2023-01-01',
        dateTo: '2023-01-02',
        generatedBy: 'admin123',
      });

      // Assert
      expect(result.reportType).toBe('daily');
      expect(result.generatedBy).toBe('admin123');
      expect(result.data.transactionSummary.totalTransactions).toBe(100);
      expect(result.data.complianceMetrics.kycComplianceRate).toBe(95);
    });
  });

  describe('generateFinancialAnalysis', () => {
    it('should generate financial analysis', async () => {
      // Arrange
      const mockStats = {
        totalTransactions: 100,
        successfulTransactions: 85,
        failedTransactions: 15,
        totalXAFAmount: 1000000,
        totalHBARAmount: 100,
        averageProcessingTime: 30,
      };

      mockRechargeRepository.getTransactionStatistics.mockResolvedValue(mockStats);

      // Act
      const result = await service.generateFinancialAnalysis({
        dateFrom: '2023-01-01',
        dateTo: '2023-01-02',
      });

      // Assert
      expect(result.revenue.totalFees).toBeGreaterThan(0);
      expect(result.revenue.platformFees).toBe(20000); // 2% of 1,000,000
      expect(result.revenue.orangeMoneyFees).toBe(10000); // 1% of 1,000,000
      expect(result.profitability.grossProfit).toBe(30000);
    });
  });
});