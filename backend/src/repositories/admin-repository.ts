/**
 * Admin Repository
 * Data access layer for admin-specific operations
 */

import { BaseRepository, DynamoDBConfig } from './base-repository';
import { QueryResult, PaginationOptions } from '../models';
import {
  TreasuryAlert,
  TreasuryOperation,
  DisputeCase,
  RetryAttempt,
  DisputeStatus,
} from '../types/admin';

export interface CreateTreasuryAlertInput {
  type: 'low_balance' | 'critical_balance' | 'failed_transfer' | 'rate_limit_exceeded';
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface CreateDisputeCaseInput {
  transactionId: string;
  userId: string;
  reportedBy: string;
  disputeType: 'payment_failed' | 'wrong_amount' | 'duplicate_charge' | 'unauthorized' | 'other';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CreateTreasuryOperationInput {
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  currency: 'HBAR' | 'XAF';
  adminUserId: string;
}

export class AdminRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }

  // ============================================================================
  // Treasury Alert Operations
  // ============================================================================

  /**
   * Create a treasury alert
   */
  async createTreasuryAlert(input: CreateTreasuryAlertInput): Promise<TreasuryAlert> {
    const alertId = this.generateId();
    const timestamp = this.generateTimestamp();

    const alert: TreasuryAlert = {
      id: alertId,
      type: input.type,
      severity: input.severity,
      message: input.message,
      timestamp,
      acknowledged: false,
    };

    await this.putItem({
      PK: 'TREASURY_ALERT',
      SK: `ALERT#${alertId}`,
      ...alert,
      GSI1PK: `ALERT_STATUS#${alert.acknowledged ? 'acknowledged' : 'pending'}`,
      GSI1SK: timestamp,
    });

    return alert;
  }

  /**
   * Get treasury alerts
   */
  async getTreasuryAlerts(
    acknowledged?: boolean,
    options?: PaginationOptions
  ): Promise<QueryResult<TreasuryAlert>> {
    if (acknowledged !== undefined) {
      const status = acknowledged ? 'acknowledged' : 'pending';
      const result = await this.queryItems<any>(
        '#GSI1PK = :gsi1pk',
        { '#GSI1PK': 'GSI1PK' },
        { ':gsi1pk': `ALERT_STATUS#${status}` },
        'GSI1',
        options
      );

      return {
        items: result.items.map(item => this.mapToTreasuryAlert(item)),
        lastEvaluatedKey: result.lastEvaluatedKey,
      };
    }

    const result = await this.queryItems<any>(
      '#PK = :pk AND begins_with(#SK, :skPrefix)',
      { '#PK': 'PK', '#SK': 'SK' },
      { ':pk': 'TREASURY_ALERT', ':skPrefix': 'ALERT#' },
      undefined,
      options
    );

    return {
      items: result.items.map(item => this.mapToTreasuryAlert(item)),
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Acknowledge treasury alert
   */
  async acknowledgeTreasuryAlert(
    alertId: string,
    adminUserId: string
  ): Promise<void> {
    const timestamp = this.generateTimestamp();

    await this.updateItem(
      'TREASURY_ALERT',
      `ALERT#${alertId}`,
      'SET #acknowledged = :acknowledged, #acknowledgedBy = :acknowledgedBy, #acknowledgedAt = :acknowledgedAt, #GSI1PK = :gsi1pk',
      {
        '#acknowledged': 'acknowledged',
        '#acknowledgedBy': 'acknowledgedBy',
        '#acknowledgedAt': 'acknowledgedAt',
        '#GSI1PK': 'GSI1PK',
      },
      {
        ':acknowledged': true,
        ':acknowledgedBy': adminUserId,
        ':acknowledgedAt': timestamp,
        ':gsi1pk': 'ALERT_STATUS#acknowledged',
      }
    );
  }

  // ============================================================================
  // Treasury Operation Operations
  // ============================================================================

  /**
   * Create treasury operation record
   */
  async createTreasuryOperation(input: CreateTreasuryOperationInput): Promise<TreasuryOperation> {
    const operationId = this.generateId();
    const timestamp = this.generateTimestamp();

    const operation: TreasuryOperation = {
      id: operationId,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      status: 'pending',
      adminUserId: input.adminUserId,
      timestamp,
    };

    await this.putItem({
      PK: 'TREASURY_OPERATION',
      SK: `OPERATION#${operationId}`,
      ...operation,
      GSI1PK: `OPERATION_STATUS#${operation.status}`,
      GSI1SK: timestamp,
    });

    return operation;
  }

  /**
   * Update treasury operation status
   */
  async updateTreasuryOperation(
    operationId: string,
    status: 'pending' | 'completed' | 'failed',
    transactionHash?: string,
    errorMessage?: string
  ): Promise<void> {
    const timestamp = this.generateTimestamp();
    
    const updateExpression = 'SET #status = :status, #updatedAt = :updatedAt, #GSI1PK = :gsi1pk';
    const expressionAttributeNames: Record<string, string> = {
      '#status': 'status',
      '#updatedAt': 'updatedAt',
      '#GSI1PK': 'GSI1PK',
    };
    const expressionAttributeValues: Record<string, any> = {
      ':status': status,
      ':updatedAt': timestamp,
      ':gsi1pk': `OPERATION_STATUS#${status}`,
    };

    if (transactionHash) {
      updateExpression.replace('SET', 'SET #transactionHash = :transactionHash,');
      expressionAttributeNames['#transactionHash'] = 'transactionHash';
      expressionAttributeValues[':transactionHash'] = transactionHash;
    }

    if (errorMessage) {
      updateExpression.replace('SET', 'SET #errorMessage = :errorMessage,');
      expressionAttributeNames['#errorMessage'] = 'errorMessage';
      expressionAttributeValues[':errorMessage'] = errorMessage;
    }

    await this.updateItem(
      'TREASURY_OPERATION',
      `OPERATION#${operationId}`,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );
  }

  /**
   * Get treasury operations
   */
  async getTreasuryOperations(
    status?: 'pending' | 'completed' | 'failed',
    options?: PaginationOptions
  ): Promise<QueryResult<TreasuryOperation>> {
    if (status) {
      const result = await this.queryItems<any>(
        '#GSI1PK = :gsi1pk',
        { '#GSI1PK': 'GSI1PK' },
        { ':gsi1pk': `OPERATION_STATUS#${status}` },
        'GSI1',
        options
      );

      return {
        items: result.items.map(item => this.mapToTreasuryOperation(item)),
        lastEvaluatedKey: result.lastEvaluatedKey,
      };
    }

    const result = await this.queryItems<any>(
      '#PK = :pk AND begins_with(#SK, :skPrefix)',
      { '#PK': 'PK', '#SK': 'SK' },
      { ':pk': 'TREASURY_OPERATION', ':skPrefix': 'OPERATION#' },
      undefined,
      options
    );

    return {
      items: result.items.map(item => this.mapToTreasuryOperation(item)),
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  // ============================================================================
  // Dispute Case Operations
  // ============================================================================

  /**
   * Create dispute case
   */
  async createDisputeCase(input: CreateDisputeCaseInput): Promise<DisputeCase> {
    const disputeId = this.generateId();
    const timestamp = this.generateTimestamp();

    const dispute: DisputeCase = {
      id: disputeId,
      transactionId: input.transactionId,
      userId: input.userId,
      reportedBy: input.reportedBy,
      disputeType: input.disputeType,
      description: input.description,
      status: 'reported',
      priority: input.priority,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.putItem({
      PK: 'DISPUTE_CASE',
      SK: `DISPUTE#${disputeId}`,
      ...dispute,
      GSI1PK: `DISPUTE_STATUS#${dispute.status}`,
      GSI1SK: timestamp,
    });

    return dispute;
  }

  /**
   * Update dispute case
   */
  async updateDisputeCase(
    disputeId: string,
    updates: {
      status?: DisputeStatus;
      assignedTo?: string;
      resolution?: string;
      refundAmount?: number;
      refundStatus?: 'pending' | 'completed' | 'failed';
    }
  ): Promise<void> {
    const timestamp = this.generateTimestamp();
    const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = {
      '#updatedAt': 'updatedAt',
    };
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': timestamp,
    };

    if (updates.status) {
      updateExpressions.push('#status = :status', '#GSI1PK = :gsi1pk');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeNames['#GSI1PK'] = 'GSI1PK';
      expressionAttributeValues[':status'] = updates.status;
      expressionAttributeValues[':gsi1pk'] = `DISPUTE_STATUS#${updates.status}`;

      if (updates.status === 'resolved') {
        updateExpressions.push('#resolvedAt = :resolvedAt');
        expressionAttributeNames['#resolvedAt'] = 'resolvedAt';
        expressionAttributeValues[':resolvedAt'] = timestamp;
      }
    }

    if (updates.assignedTo) {
      updateExpressions.push('#assignedTo = :assignedTo');
      expressionAttributeNames['#assignedTo'] = 'assignedTo';
      expressionAttributeValues[':assignedTo'] = updates.assignedTo;
    }

    if (updates.resolution) {
      updateExpressions.push('#resolution = :resolution');
      expressionAttributeNames['#resolution'] = 'resolution';
      expressionAttributeValues[':resolution'] = updates.resolution;
    }

    if (updates.refundAmount) {
      updateExpressions.push('#refundAmount = :refundAmount');
      expressionAttributeNames['#refundAmount'] = 'refundAmount';
      expressionAttributeValues[':refundAmount'] = updates.refundAmount;
    }

    if (updates.refundStatus) {
      updateExpressions.push('#refundStatus = :refundStatus');
      expressionAttributeNames['#refundStatus'] = 'refundStatus';
      expressionAttributeValues[':refundStatus'] = updates.refundStatus;
    }

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

    await this.updateItem(
      'DISPUTE_CASE',
      `DISPUTE#${disputeId}`,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );
  }

  /**
   * Get dispute cases
   */
  async getDisputeCases(
    status?: DisputeStatus,
    options?: PaginationOptions
  ): Promise<QueryResult<DisputeCase>> {
    if (status) {
      const result = await this.queryItems<any>(
        '#GSI1PK = :gsi1pk',
        { '#GSI1PK': 'GSI1PK' },
        { ':gsi1pk': `DISPUTE_STATUS#${status}` },
        'GSI1',
        options
      );

      return {
        items: result.items.map(item => this.mapToDisputeCase(item)),
        lastEvaluatedKey: result.lastEvaluatedKey,
      };
    }

    const result = await this.queryItems<any>(
      '#PK = :pk AND begins_with(#SK, :skPrefix)',
      { '#PK': 'PK', '#SK': 'SK' },
      { ':pk': 'DISPUTE_CASE', ':skPrefix': 'DISPUTE#' },
      undefined,
      options
    );

    return {
      items: result.items.map(item => this.mapToDisputeCase(item)),
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Get dispute case by transaction ID
   */
  async getDisputeByTransactionId(transactionId: string): Promise<DisputeCase | null> {
    // In a real implementation, we'd need a GSI for transaction ID lookups
    // For now, scan all disputes (not efficient for production)
    const result = await this.queryItems<any>(
      '#PK = :pk AND begins_with(#SK, :skPrefix)',
      { '#PK': 'PK', '#SK': 'SK' },
      { ':pk': 'DISPUTE_CASE', ':skPrefix': 'DISPUTE#' }
    );

    const dispute = result.items.find(item => item.transactionId === transactionId);
    return dispute ? this.mapToDisputeCase(dispute) : null;
  }

  // ============================================================================
  // Retry Attempt Operations
  // ============================================================================

  /**
   * Record retry attempt
   */
  async recordRetryAttempt(
    transactionId: string,
    attempt: Omit<RetryAttempt, 'attemptNumber'>
  ): Promise<void> {
    // Get current retry count for this transaction
    const retryCount = await this.getRetryCount(transactionId);

    const retryAttempt: RetryAttempt = {
      ...attempt,
      attemptNumber: retryCount + 1,
    };

    await this.putItem({
      PK: `TRANSACTION#${transactionId}`,
      SK: `RETRY#${retryAttempt.attemptNumber}`,
      ...retryAttempt,
    });
  }

  /**
   * Get retry attempts for a transaction
   */
  async getRetryAttempts(transactionId: string): Promise<RetryAttempt[]> {
    const result = await this.queryItems<any>(
      '#PK = :pk AND begins_with(#SK, :skPrefix)',
      { '#PK': 'PK', '#SK': 'SK' },
      { ':pk': `TRANSACTION#${transactionId}`, ':skPrefix': 'RETRY#' }
    );

    return result.items.map(item => ({
      attemptNumber: item.attemptNumber,
      timestamp: item.timestamp,
      errorMessage: item.errorMessage,
      adminUserId: item.adminUserId,
      result: item.result,
    }));
  }

  // Private helper methods

  private async getRetryCount(transactionId: string): Promise<number> {
    const attempts = await this.getRetryAttempts(transactionId);
    return attempts.length;
  }

  private mapToTreasuryAlert(item: any): TreasuryAlert {
    return {
      id: item.id,
      type: item.type,
      severity: item.severity,
      message: item.message,
      timestamp: item.timestamp,
      acknowledged: item.acknowledged,
      acknowledgedBy: item.acknowledgedBy,
      acknowledgedAt: item.acknowledgedAt,
    };
  }

  private mapToTreasuryOperation(item: any): TreasuryOperation {
    return {
      id: item.id,
      type: item.type,
      amount: item.amount,
      currency: item.currency,
      status: item.status,
      adminUserId: item.adminUserId,
      timestamp: item.timestamp,
      transactionHash: item.transactionHash,
      errorMessage: item.errorMessage,
    };
  }

  private mapToDisputeCase(item: any): DisputeCase {
    return {
      id: item.id,
      transactionId: item.transactionId,
      userId: item.userId,
      reportedBy: item.reportedBy,
      disputeType: item.disputeType,
      description: item.description,
      status: item.status,
      priority: item.priority,
      assignedTo: item.assignedTo,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      resolvedAt: item.resolvedAt,
      resolution: item.resolution,
      refundAmount: item.refundAmount,
      refundStatus: item.refundStatus,
    };
  }
}