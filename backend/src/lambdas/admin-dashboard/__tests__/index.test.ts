/**
 * Admin Dashboard Lambda Handler Tests
 */

import { handler } from '../index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { AdminDashboardService } from '../admin-dashboard-service';
import { AdminAuthService } from '../admin-auth-service';

// Mock dependencies
jest.mock('../admin-dashboard-service');
jest.mock('../admin-auth-service');
jest.mock('../../../repositories/recharge-repository');
jest.mock('../../../utils/hedera-service');

describe('Admin Dashboard Lambda Handler', () => {
  let mockAdminDashboardService: jest.Mocked<AdminDashboardService>;
  let mockAdminAuthService: jest.Mocked<AdminAuthService>;

  beforeEach(() => {
    mockAdminDashboardService = new AdminDashboardService(
      {} as any,
      {} as any
    ) as jest.Mocked<AdminDashboardService>;

    mockAdminAuthService = new AdminAuthService() as jest.Mocked<AdminAuthService>;

    // Mock the constructor calls
    (AdminDashboardService as jest.Mock).mockImplementation(() => mockAdminDashboardService);
    (AdminAuthService as jest.Mock).mockImplementation(() => mockAdminAuthService);
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
    headers: { Authorization: 'Bearer valid-token' },
    requestContext: { requestId: 'test-request-id' },
  } as any);

  const mockAuthContext = {
    adminUserId: 'admin123',
    permissions: ['view_dashboard', 'view_transactions', 'retry_transactions'],
    sessionId: 'session123',
  };

  describe('Dashboard Metrics Endpoint', () => {
    it('should return dashboard metrics', async () => {
      // Arrange
      const mockMetrics = {
        totalTransactions: 100,
        successfulTransactions: 85,
        failedTransactions: 10,
        pendingTransactions: 5,
        totalXAFVolume: 1000000,
        totalHBARVolume: 100,
        averageProcessingTime: 30,
        successRate: 85,
        treasuryBalance: 5000,
        lastUpdated: '2023-01-01T00:00:00Z',
      };

      mockAdminAuthService.authenticateAdmin.mockResolvedValue(mockAuthContext);
      mockAdminAuthService.requirePermission.mockImplementation(() => {});
      mockAdminDashboardService.getDashboardMetrics.mockResolvedValue(mockMetrics);

      const event = createMockEvent('GET', '/admin/dashboard/metrics');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockMetrics);
    });
  });

  describe('System Health Endpoint', () => {
    it('should return system health status', async () => {
      // Arrange
      const mockHealth = {
        status: 'healthy' as const,
        components: {
          database: { status: 'healthy' as const, lastChecked: '2023-01-01T00:00:00Z' },
          hedera: { status: 'healthy' as const, lastChecked: '2023-01-01T00:00:00Z' },
          orangeMoney: { status: 'healthy' as const, lastChecked: '2023-01-01T00:00:00Z' },
          eventBridge: { status: 'healthy' as const, lastChecked: '2023-01-01T00:00:00Z' },
          treasury: { status: 'healthy' as const, lastChecked: '2023-01-01T00:00:00Z' },
        },
        lastChecked: '2023-01-01T00:00:00Z',
      };

      mockAdminAuthService.authenticateAdmin.mockResolvedValue(mockAuthContext);
      mockAdminAuthService.requirePermission.mockImplementation(() => {});
      mockAdminDashboardService.getSystemHealth.mockResolvedValue(mockHealth);

      const event = createMockEvent('GET', '/admin/dashboard/health');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
    });
  });

  describe('Transaction Management Endpoints', () => {
    it('should return transactions list', async () => {
      // Arrange
      const mockTransactions = {
        transactions: [
          {
            transactionId: 'tx123',
            userId: 'user123',
            status: 'completed',
            xafAmount: 10000,
            hbarAmount: 1,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ],
        pagination: {
          limit: 50,
          hasMore: false,
        },
        totalCount: 1,
      };

      mockAdminAuthService.authenticateAdmin.mockResolvedValue(mockAuthContext);
      mockAdminAuthService.requirePermission.mockImplementation(() => {});
      mockAdminDashboardService.getTransactions.mockResolvedValue(mockTransactions);

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
    });

    it('should return transaction detail', async () => {
      // Arrange
      const mockTransaction = {
        transactionId: 'tx123',
        userId: 'user123',
        status: 'completed',
        xafAmount: 10000,
        hbarAmount: 1,
        createdAt: '2023-01-01T00:00:00Z',
        retryHistory: [],
      };

      mockAdminAuthService.authenticateAdmin.mockResolvedValue(mockAuthContext);
      mockAdminAuthService.requirePermission.mockImplementation(() => {});
      mockAdminDashboardService.getTransactionDetail.mockResolvedValue(mockTransaction);

      const event = createMockEvent('GET', '/admin/transactions/{transactionId}', {
        transactionId: 'tx123',
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.transactionId).toBe('tx123');
    });

    it('should retry transaction', async () => {
      // Arrange
      const mockRetryResult = {
        success: true,
        transactionId: 'tx123',
        newStatus: 'converting' as const,
        retryAttemptId: 'retry-123',
        message: 'Transaction retry initiated successfully',
      };

      mockAdminAuthService.authenticateAdmin.mockResolvedValue(mockAuthContext);
      mockAdminAuthService.requirePermission.mockImplementation(() => {});
      mockAdminDashboardService.retryTransaction.mockResolvedValue(mockRetryResult);

      const event = createMockEvent(
        'POST',
        '/admin/transactions/{transactionId}/retry',
        { transactionId: 'tx123' },
        undefined,
        JSON.stringify({ reason: 'Manual retry', forceRetry: false })
      );

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.transactionId).toBe('tx123');
    });
  });

  describe('Treasury Management Endpoints', () => {
    it('should return treasury balance', async () => {
      // Arrange
      const mockBalance = {
        hbarBalance: 5000,
        xafBalance: 0,
        lastUpdated: '2023-01-01T00:00:00Z',
        lowBalanceThreshold: 1000,
        criticalBalanceThreshold: 100,
        status: 'healthy' as const,
      };

      mockAdminAuthService.authenticateAdmin.mockResolvedValue({
        ...mockAuthContext,
        permissions: ['manage_treasury'],
      });
      mockAdminAuthService.requirePermission.mockImplementation(() => {});
      mockAdminDashboardService.getTreasuryBalance.mockResolvedValue(mockBalance);

      const event = createMockEvent('GET', '/admin/treasury/balance');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.hbarBalance).toBe(5000);
    });

    it('should return treasury alerts', async () => {
      // Arrange
      const mockAlerts = [
        {
          id: 'alert123',
          type: 'low_balance' as const,
          severity: 'warning' as const,
          message: 'Treasury balance is low',
          timestamp: '2023-01-01T00:00:00Z',
          acknowledged: false,
        },
      ];

      mockAdminAuthService.authenticateAdmin.mockResolvedValue({
        ...mockAuthContext,
        permissions: ['manage_treasury'],
      });
      mockAdminAuthService.requirePermission.mockImplementation(() => {});
      mockAdminDashboardService.getTreasuryAlerts.mockResolvedValue(mockAlerts);

      const event = createMockEvent('GET', '/admin/treasury/alerts');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });
  });

  describe('Reporting Endpoints', () => {
    it('should generate compliance report', async () => {
      // Arrange
      const mockReport = {
        reportId: 'report123',
        reportType: 'daily' as const,
        dateFrom: '2023-01-01',
        dateTo: '2023-01-02',
        generatedAt: '2023-01-01T00:00:00Z',
        generatedBy: 'admin123',
        data: {
          transactionSummary: {
            totalTransactions: 100,
            successfulTransactions: 85,
            failedTransactions: 15,
            totalVolume: { xaf: 1000000, hbar: 100 },
            averageTransactionSize: { xaf: 10000, hbar: 1 },
            processingTimes: { average: 30, median: 25, p95: 60, p99: 120 },
          },
          volumeAnalysis: { dailyVolumes: [], topUsers: [], peakHours: [] },
          errorAnalysis: { errorsByType: [], errorsByHour: [], topFailureReasons: [] },
          complianceMetrics: {
            kycComplianceRate: 95,
            fraudDetectionAlerts: 0,
            suspiciousTransactions: 0,
            regulatoryReports: 1,
            auditTrailCompleteness: 100,
          },
        },
      };

      mockAdminAuthService.authenticateAdmin.mockResolvedValue({
        ...mockAuthContext,
        permissions: ['generate_reports'],
      });
      mockAdminAuthService.requirePermission.mockImplementation(() => {});
      mockAdminDashboardService.generateComplianceReport.mockResolvedValue(mockReport);

      const event = createMockEvent(
        'POST',
        '/admin/reports/compliance',
        undefined,
        undefined,
        JSON.stringify({
          reportType: 'daily',
          dateFrom: '2023-01-01',
          dateTo: '2023-01-02',
        })
      );

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.reportType).toBe('daily');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      // Arrange
      mockAdminAuthService.authenticateAdmin.mockRejectedValue(new Error('ADMIN_UNAUTHORIZED'));

      const event = createMockEvent('GET', '/admin/dashboard/metrics');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });

    it('should handle unsupported routes', async () => {
      // Arrange
      mockAdminAuthService.authenticateAdmin.mockResolvedValue(mockAuthContext);

      const event = createMockEvent('GET', '/admin/unsupported');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });

    it('should handle missing path parameters', async () => {
      // Arrange
      mockAdminAuthService.authenticateAdmin.mockResolvedValue(mockAuthContext);
      mockAdminAuthService.requirePermission.mockImplementation(() => {});

      const event = createMockEvent('GET', '/admin/transactions/{transactionId}');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      // Arrange
      mockAdminAuthService.authenticateAdmin.mockResolvedValue(mockAuthContext);
      mockAdminAuthService.requirePermission.mockImplementation(() => {});
      mockAdminDashboardService.getDashboardMetrics.mockResolvedValue({} as any);

      const event = createMockEvent('GET', '/admin/dashboard/metrics');

      // Act
      const result = await handler(event);

      // Assert
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Headers');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Methods');
    });
  });
});