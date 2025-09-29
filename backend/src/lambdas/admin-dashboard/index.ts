/**
 * Admin Dashboard Lambda Handler
 * Provides admin endpoints for monitoring recharge transactions and system health
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RechargeRepository } from '../../repositories/recharge-repository';
import { HederaService } from '../../utils/hedera-service';
import { AdminDashboardService } from './admin-dashboard-service';
import { AdminAuthService } from './admin-auth-service';
import { errorResponseFormatter } from '../../utils/error-response-formatter';
import { structuredLogger } from '../../utils/structured-logger';
import { corsHeaders } from '../../utils/cors-security';
import { AdminApiResponse, AdminAuthContext, ADMIN_ERROR_CODES } from '../../types/admin';

const logger = structuredLogger.child({ service: 'admin-dashboard' });

// Initialize services
const rechargeRepository = new RechargeRepository({
  tableName: process.env.DYNAMODB_TABLE_NAME!,
  region: process.env.AWS_REGION!,
});

const hederaService = new HederaService({
  accountId: process.env.HEDERA_ACCOUNT_ID!,
  privateKey: process.env.HEDERA_PRIVATE_KEY!,
  network: process.env.HEDERA_NETWORK as 'testnet' | 'mainnet',
});

const adminDashboardService = new AdminDashboardService(rechargeRepository, hederaService);
const adminAuthService = new AdminAuthService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  
  logger.info('Admin dashboard request received', {
    requestId,
    httpMethod: event.httpMethod,
    path: event.path,
    resource: event.resource,
  });

  try {
    // Authenticate admin user
    const authContext = await adminAuthService.authenticateAdmin(event);
    
    // Route request based on path and method
    const response = await routeRequest(event, authContext);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };
  } catch (error) {
    logger.error('Admin dashboard request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorResponse = errorResponseFormatter.formatError(error, requestId);
    return {
      statusCode: errorResponse.statusCode,
      headers: corsHeaders,
      body: JSON.stringify(errorResponse.body),
    };
  }
};

async function routeRequest(
  event: APIGatewayProxyEvent,
  authContext: AdminAuthContext
): Promise<AdminApiResponse> {
  const { httpMethod, resource, pathParameters, queryStringParameters } = event;
  const requestId = event.requestContext.requestId;

  switch (resource) {
    case '/admin/dashboard/metrics':
      if (httpMethod === 'GET') {
        adminAuthService.requirePermission(authContext, 'view_dashboard');
        const metrics = await adminDashboardService.getDashboardMetrics();
        return {
          success: true,
          data: metrics,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      break;

    case '/admin/dashboard/health':
      if (httpMethod === 'GET') {
        adminAuthService.requirePermission(authContext, 'view_dashboard');
        const health = await adminDashboardService.getSystemHealth();
        return {
          success: true,
          data: health,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      break;

    case '/admin/transactions':
      if (httpMethod === 'GET') {
        adminAuthService.requirePermission(authContext, 'view_transactions');
        const query = parseTransactionQuery(queryStringParameters);
        const transactions = await adminDashboardService.getTransactions(query);
        return {
          success: true,
          data: transactions,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      break;

    case '/admin/transactions/{transactionId}':
      if (httpMethod === 'GET') {
        adminAuthService.requirePermission(authContext, 'view_transactions');
        const transactionId = pathParameters?.transactionId;
        if (!transactionId) {
          throw new Error('Transaction ID is required');
        }
        const transaction = await adminDashboardService.getTransactionDetail(transactionId);
        return {
          success: true,
          data: transaction,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      break;

    case '/admin/transactions/{transactionId}/retry':
      if (httpMethod === 'POST') {
        adminAuthService.requirePermission(authContext, 'retry_transactions');
        const transactionId = pathParameters?.transactionId;
        if (!transactionId) {
          throw new Error('Transaction ID is required');
        }
        const body = JSON.parse(event.body || '{}');
        const retryResult = await adminDashboardService.retryTransaction({
          transactionId,
          adminUserId: authContext.adminUserId,
          reason: body.reason || 'Manual admin retry',
          forceRetry: body.forceRetry || false,
        });
        return {
          success: true,
          data: retryResult,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      break;

    case '/admin/treasury/balance':
      if (httpMethod === 'GET') {
        adminAuthService.requirePermission(authContext, 'manage_treasury');
        const balance = await adminDashboardService.getTreasuryBalance();
        return {
          success: true,
          data: balance,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      break;

    case '/admin/treasury/alerts':
      if (httpMethod === 'GET') {
        adminAuthService.requirePermission(authContext, 'manage_treasury');
        const alerts = await adminDashboardService.getTreasuryAlerts();
        return {
          success: true,
          data: alerts,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      break;

    case '/admin/disputes':
      if (httpMethod === 'GET') {
        adminAuthService.requirePermission(authContext, 'handle_disputes');
        const disputes = await adminDashboardService.getDisputes(queryStringParameters);
        return {
          success: true,
          data: disputes,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      break;

    case '/admin/reports/compliance':
      if (httpMethod === 'POST') {
        adminAuthService.requirePermission(authContext, 'generate_reports');
        const body = JSON.parse(event.body || '{}');
        const report = await adminDashboardService.generateComplianceReport({
          reportType: body.reportType,
          dateFrom: body.dateFrom,
          dateTo: body.dateTo,
          generatedBy: authContext.adminUserId,
        });
        return {
          success: true,
          data: report,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      break;

    case '/admin/reports/financial':
      if (httpMethod === 'POST') {
        adminAuthService.requirePermission(authContext, 'generate_reports');
        const body = JSON.parse(event.body || '{}');
        const analysis = await adminDashboardService.generateFinancialAnalysis({
          dateFrom: body.dateFrom,
          dateTo: body.dateTo,
        });
        return {
          success: true,
          data: analysis,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      break;

    default:
      throw new Error(`Unsupported route: ${httpMethod} ${resource}`);
  }

  throw new Error(`Method not allowed: ${httpMethod} ${resource}`);
}

function parseTransactionQuery(params: { [key: string]: string } | null) {
  if (!params) return {};

  return {
    status: params.status,
    userId: params.userId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    minAmount: params.minAmount ? parseFloat(params.minAmount) : undefined,
    maxAmount: params.maxAmount ? parseFloat(params.maxAmount) : undefined,
    hasErrors: params.hasErrors === 'true',
    limit: params.limit ? parseInt(params.limit) : 50,
    exclusiveStartKey: params.exclusiveStartKey,
  };
}