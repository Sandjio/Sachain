/**
 * Admin Dashboard Integration Tests
 * Tests the complete admin dashboard functionality end-to-end
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../lambdas/admin-dashboard/index';
import { RechargeRepository } from '../../repositories/recharge-repository';
import { AdminRepository } from '../../repositories/admin-repository';
import { HederaService } from '../../utils/hedera-service';
import { RechargeTransaction } from '../../types/hbar-recharge';

// Mock AWS services
jest.mock('../../repositories/recharge-repository');
jest.mock('../../repositories/admin-repository');
jest.mock('../../utils/hedera-service');
jest.mock('aws-jwt-verify');

describe('Admin Dashboard Integration Tests', () => {
  let mockRechargeRepository: jest.Mocked<RechargeRepository>;
  let mockAdminRepository: jest.Mocked<AdminRepository>;
  let mockHederaService: jest.Mocked<HederaService>;

  beforeEach(() => {
    // Setup mocks
    mockRechargeRepository = new RechargeRepository({
      tableName: 'test-table',
      region: 'us-east-1',
    }) as jest.Mocked<RechargeRepository>;

    mockAdminRepository = new AdminRepository({
      tableName: 'test-table',
      region: 'us-east-1',
    }) as jest.Mocked<AdminRepository>;

    mockHederaService = new HederaService({
      accountId: '0.0.123',
      privateKey: 'test-key',
      network: 'testnet',
    }) as jest.Mocked<HederaService>;

    // Mock JWT verification
    const { CognitoJwtVerifier } = require('aws-jwt-verify');
    const mockVerifier = { verify: jest.fn() };
    CognitoJwtVerifier.create.mockReturnValue(mockVerifier);
    
    mockVerifier.verify.mockResolvedValue({
      sub: 'admin123',
      'cognito:groups': ['sachain-super-admins'],
    });

    // Setup environment variables
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.COGNITO_USER_POOL_ID = 'test-pool';
    process.env.COGNITO_CLIENT_ID = 'test-client';
    process.env.HEDERA_ACCOUNT_ID = '0.0.123';
    process.env.HEDERA_PRIVATE_KEY = 'test-key';
    process.env.HEDERA_NETWORK = 'testnet';
  });

  const createMockEvent = (
    httpMethod: string,
    resource: string,
    pathParameters?: Record<string, string>,
    queryStringParameters?: Record<string, string>,
    body?: string
  ): APIGatewayProxyEvent => ({
    httpMethod,
    resource,
    pathParameters: pathParameters || null,
    queryStringParameters: queryStringParameters || null,
    body: body || null,
    headers: { Authorization: 'Bearer valid-admin-token' },
    requestContext: { requestId: 'test-request-id' },
  } as any);

  describe('Dashboard Metrics Integration', () => {
    it('should return comprehensive dashboard metrics', async () => {
      // Arrange
      const mockStats = {
        totalTransactions: 150,
        successfulTransactions: 120,
        failedTransactions: 20,
        totalXAFAmount: 1500000,
        totalHBARAmount: 150,
        averageProcessingTime: 45,
      };

      mockRechargeRepository.getTransactionStatistics.mockResolvedValue(mockStats);
      mockHederaService.getAccountBalance.mockResolvedValue(5000);

      const event = createMockEvent('GET', '/admin/dashboard/metrics');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        totalTransactions: 150,
        successfulTransactions: 120,
        failedTransactions: 20,
        pendingTransactions: 10, // 150 - 120 - 20
        totalXAFVolume: 1500000,
        totalHBARVolume: 150,
        averageProcessingTime: 45,
        successRate: 80, // 120/150 * 100
        treasuryBalance: 5000,
      });
      expect(body.data.lastUpdated).toBeDefined();
    });

    it('should handle system health check with mixed component status', async () => {
      // Arrange
      mockRechargeRepository.getCachedExchangeRate.mockResolvedValue(null);
      mockHederaService.getAccountBalance.mockResolvedValue(50); // Critical balance

      const event = createMockEvent('GET', '/admin/dashboard/health');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('critical'); // Due to low treasury balance
      expect(body.data.components.treasury.status).toBe('critical');
      expect(body.data.components.database.status).toBe('healthy');
    });
  });

  describe('Transaction Management Integration', () => {
    it('should retrieve and filter transactions correctly', async () => {
      // Arrange
      const mockTransactions: RechargeTransaction[] = [
        {
          PK: 'USER#user1',
          SK: 'RECHARGE#tx1',
          transactionId: 'tx1',
          userId: 'user1',
          userHederaAccountId: '0.0.456',
          xafAmount: 10000,
          hbarAmount: 1,
          orangeMoneyFee: 100,
          platformFee: 200,
          totalFees: 300,
          status: 'completed',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T01:00:00Z',
          completedAt: '2023-01-01T01:00:00Z',
          retryCount: 0,
          GSI1PK: 'RECHARGE_STATUS#completed',
          GSI1SK: '2023-01-01T00:00:00Z',
        },
        {
          PK: 'USER#user2',
          SK: 'RECHARGE#tx2',
          transactionId: 'tx2',
          userId: 'user2',
          userHederaAccountId: '0.0.789',
          xafAmount: 20000,
          orangeMoneyFee: 200,
          platformFee: 400,
          totalFees: 600,
          status: 'failed',
          createdAt: '2023-01-01T02:00:00Z',
          updatedAt: '2023-01-01T02:30:00Z',
          retryCount: 2,
          errorMessage: 'Network timeout',
          GSI1PK: 'RECHARGE_STATUS#failed',
          GSI1SK: '2023-01-01T02:00:00Z',
        },
      ];

      mockRechargeRepository.getRechargeTransactionsByStatus.mockResolvedValue({
        items: mockTransactions.filter(tx => tx.status === 'completed'),
        lastEvaluatedKey: undefined,
      });

      const event = createMockEvent('GET', '/admin/transactions', undefined, {
        status: 'completed',
        limit: '50',
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data.transactions).toHaveLength(1);
      expect(body.data.transactions[0].transactionId).toBe('tx1');
      expect(body.data.transactions[0].status).toBe('completed');
      expect(body.data.totalCount).toBe(1);
    });

    it('should successfully retry a failed transaction', async () => {
      // Arrange
      const failedTransaction: RechargeTransaction = {
        PK: 'USER#user1',
        SK: 'RECHARGE#tx1',
        transactionId: 'tx1',
        userId: 'user1',
        userHederaAccountId: '0.0.456',
        xafAmount: 10000,
        orangeMoneyFee: 100,
        platformFee: 200,
        totalFees: 300,
        status: 'failed',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T01:00:00Z',
        retryCount: 1,
        errorMessage: 'Network timeout',
        GSI1PK: 'RECHARGE_STATUS#failed',
        GSI1SK: '2023-01-01T00:00:00Z',
        exchangeRate: 0.0001,
        hbarAmount: 1,
      };

      mockRechargeRepository.getRechargeTransactionsByStatus.mockResolvedValue({
        items: [failedTransaction],
        lastEvaluatedKey: undefined,
      });

      mockRechargeRepository.updateRechargeTransaction.mockResolvedValue();

      const event = createMockEvent(
        'POST',
        '/admin/transactions/{transactionId}/retry',
        { transactionId: 'tx1' },
        undefined,
        JSON.stringify({
          reason: 'Manual admin retry after network issue resolved',
          forceRetry: false,
        })
      );

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data.transactionId).toBe('tx1');
      expect(body.data.newStatus).toBe('converting');
      expect(body.data.success).toBe(true);

      // Verify repository calls
      expect(mockRechargeRepository.updateRechargeTransaction).toHaveBeenCalledWith({
        transactionId: 'tx1',
        userId: 'user1',
        status: 'converting',
        retryCount: 2,
        errorMessage: undefined,
      });
    });
  });

  describe('Treasury Management Integration', () => {
    it('should return treasury balance with correct status assessment', async () => {
      // Arrange
      mockHederaService.getAccountBalance.mockResolvedValue(500); // Low balance

      const event = createMockEvent('GET', '/admin/treasury/balance');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        hbarBalance: 500,
        xafBalance: 0,
        lowBalanceThreshold: 1000,
        criticalBalanceThreshold: 100,
        status: 'low',
      });
      expect(body.data.lastUpdated).toBeDefined();
    });

    it('should return treasury alerts based on balance status', async () => {
      // Arrange
      mockHederaService.getAccountBalance.mockResolvedValue(50); // Critical balance

      const event = createMockEvent('GET', '/admin/treasury/alerts');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].type).toBe('critical_balance');
      expect(body.data[0].severity).toBe('critical');
      expect(body.data[0].message).toContain('critically low');
    });
  });

  describe('Reporting Integration', () => {
    it('should generate comprehensive compliance report', async () => {
      // Arrange
      const mockStats = {
        totalTransactions: 200,
        successfulTransactions: 180,
        failedTransactions: 20,
        totalXAFAmount: 2000000,
        totalHBARAmount: 200,
        averageProcessingTime: 35,
      };

      mockRechargeRepository.getTransactionStatistics.mockResolvedValue(mockStats);

      const event = createMockEvent(
        'POST',
        '/admin/reports/compliance',
        undefined,
        undefined,
        JSON.stringify({
          reportType: 'weekly',
          dateFrom: '2023-01-01',
          dateTo: '2023-01-07',
        })
      );

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data.reportType).toBe('weekly');
      expect(body.data.generatedBy).toBe('admin123');
      expect(body.data.data.transactionSummary).toMatchObject({
        totalTransactions: 200,
        successfulTransactions: 180,
        failedTransactions: 20,
        totalVolume: {
          xaf: 2000000,
          hbar: 200,
        },
      });
      expect(body.data.data.complianceMetrics.kycComplianceRate).toBe(95);
    });

    it('should generate financial analysis with revenue calculations', async () => {
      // Arrange
      const mockStats = {
        totalTransactions: 100,
        successfulTransactions: 90,
        failedTransactions: 10,
        totalXAFAmount: 1000000,
        totalHBARAmount: 100,
        averageProcessingTime: 30,
      };

      mockRechargeRepository.getTransactionStatistics.mockResolvedValue(mockStats);

      const event = createMockEvent(
        'POST',
        '/admin/reports/financial',
        undefined,
        undefined,
        JSON.stringify({
          dateFrom: '2023-01-01',
          dateTo: '2023-01-31',
        })
      );

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data.revenue.totalFees).toBe(30000); // 2% + 1% of 1,000,000
      expect(body.data.revenue.platformFees).toBe(20000); // 2% of 1,000,000
      expect(body.data.revenue.orangeMoneyFees).toBe(10000); // 1% of 1,000,000
      expect(body.data.costs.hederaNetworkFees).toBe(0.009); // 90 * 0.0001
      expect(body.data.profitability.grossProfit).toBe(30000);
      expect(body.data.profitability.netProfit).toBeCloseTo(29999.991);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle unauthorized access gracefully', async () => {
      // Arrange
      const { CognitoJwtVerifier } = require('aws-jwt-verify');
      const mockVerifier = CognitoJwtVerifier.create();
      mockVerifier.verify.mockRejectedValue(new Error('Token verification failed'));

      const event = createMockEvent('GET', '/admin/dashboard/metrics');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should handle insufficient permissions', async () => {
      // Arrange
      const { CognitoJwtVerifier } = require('aws-jwt-verify');
      const mockVerifier = CognitoJwtVerifier.create();
      mockVerifier.verify.mockResolvedValue({
        sub: 'user123',
        'cognito:groups': ['sachain-users'], // Not an admin group
      });

      const event = createMockEvent('GET', '/admin/dashboard/metrics');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ADMIN_INSUFFICIENT_PERMISSIONS');
    });

    it('should handle service failures gracefully', async () => {
      // Arrange
      mockRechargeRepository.getTransactionStatistics.mockRejectedValue(
        new Error('Database connection failed')
      );

      const event = createMockEvent('GET', '/admin/dashboard/metrics');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBeGreaterThanOrEqual(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });

  describe('Permission-based Access Control', () => {
    it('should allow treasury managers to access treasury endpoints', async () => {
      // Arrange
      const { CognitoJwtVerifier } = require('aws-jwt-verify');
      const mockVerifier = CognitoJwtVerifier.create();
      mockVerifier.verify.mockResolvedValue({
        sub: 'treasury123',
        'cognito:groups': ['sachain-treasury-managers'],
      });

      mockHederaService.getAccountBalance.mockResolvedValue(2000);

      const event = createMockEvent('GET', '/admin/treasury/balance');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should deny treasury access to support agents', async () => {
      // Arrange
      const { CognitoJwtVerifier } = require('aws-jwt-verify');
      const mockVerifier = CognitoJwtVerifier.create();
      mockVerifier.verify.mockResolvedValue({
        sub: 'support123',
        'cognito:groups': ['sachain-support-agents'],
      });

      const event = createMockEvent('GET', '/admin/treasury/balance');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ADMIN_INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should validate transaction retry requests', async () => {
      // Arrange
      const event = createMockEvent(
        'POST',
        '/admin/transactions/{transactionId}/retry',
        { transactionId: 'tx1' },
        undefined,
        JSON.stringify({
          // Missing required reason field
          forceRetry: false,
        })
      );

      // Mock finding the transaction
      mockRechargeRepository.getRechargeTransactionsByStatus.mockResolvedValue({
        items: [{
          transactionId: 'tx1',
          status: 'completed',
        } as RechargeTransaction],
        lastEvaluatedKey: undefined,
      });

      // Act
      const result = await handler(event);

      // Assert - Should still work with default reason
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should handle missing transaction gracefully', async () => {
      // Arrange
      mockRechargeRepository.getRechargeTransactionsByStatus.mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined,
      });

      const event = createMockEvent('GET', '/admin/transactions/{transactionId}', {
        transactionId: 'nonexistent-tx',
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });
});