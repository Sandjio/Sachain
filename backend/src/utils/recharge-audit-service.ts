/**
 * Comprehensive Audit Logging Service for HBAR Recharge Operations
 * Provides detailed audit trails for all recharge-related activities
 */

import { AuditEnhancer, AuditContext, AuditResult } from "./audit-enhancer";
import { StructuredLogger } from "./structured-logger";
import { BaseRepository } from "../repositories/base-repository";

export interface RechargeAuditContext extends AuditContext {
  transactionId?: string;
  xafAmount?: number;
  hbarAmount?: number;
  exchangeRate?: number;
  orangeMoneyTransactionId?: string;
  hederaTransactionId?: string;
  fees?: {
    platformFee: number;
    orangeMoneyFee: number;
    totalFees: number;
  };
}

export interface RechargeAuditEvent {
  eventId: string;
  transactionId: string;
  userId: string;
  eventType: RechargeAuditEventType;
  timestamp: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;

  // Financial data
  xafAmount?: number;
  hbarAmount?: number;
  exchangeRate?: number;
  fees?: {
    platformFee: number;
    orangeMoneyFee: number;
    totalFees: number;
  };

  // External transaction IDs
  orangeMoneyTransactionId?: string;
  hederaTransactionId?: string;

  // Status and error information
  status: "initiated" | "processing" | "completed" | "failed";
  errorCode?: string;
  errorMessage?: string;

  // Compliance and security
  kycVerificationLevel?: "none" | "basic" | "enhanced";
  riskLevel?: "low" | "medium" | "high" | "critical";
  fraudDetectionFlags?: string[];

  // Performance metrics
  processingTimeMs?: number;
  retryCount?: number;
}

export type RechargeAuditEventType =
  | "recharge_request_received"
  | "recharge_validation_started"
  | "recharge_validation_completed"
  | "kyc_verification_check"
  | "fraud_detection_check"
  | "rate_limit_check"
  | "exchange_rate_fetched"
  | "fee_calculation_completed"
  | "orange_money_payment_initiated"
  | "orange_money_payment_confirmed"
  | "orange_money_payment_failed"
  | "hbar_conversion_started"
  | "hbar_transfer_initiated"
  | "hbar_transfer_completed"
  | "hbar_transfer_failed"
  | "recharge_completed"
  | "recharge_failed"
  | "admin_intervention_required"
  | "transaction_refunded"
  | "compliance_alert_triggered";

export interface AuditQueryOptions {
  userId?: string;
  transactionId?: string;
  eventType?: RechargeAuditEventType;
  status?: "initiated" | "processing" | "completed" | "failed";
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  riskLevel?: "low" | "medium" | "high" | "critical";
  limit?: number;
  nextToken?: string;
}

export interface AuditSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalXafAmount: number;
    totalHbarAmount: number;
    averageProcessingTime: number;
    uniqueUsers: number;
    uniqueIPs: number;
  };
  riskAnalysis: {
    highRiskTransactions: number;
    fraudDetectionAlerts: number;
    kycVerificationRequired: number;
    rateLimitViolations: number;
  };
  errorAnalysis: {
    topErrorCodes: Array<{ code: string; count: number }>;
    orangeMoneyFailures: number;
    hederaNetworkFailures: number;
    validationFailures: number;
  };
}

export class RechargeAuditService {
  constructor(
    private auditEnhancer: AuditEnhancer,
    private repository: BaseRepository,
    private logger: StructuredLogger
  ) {}

  /**
   * Log recharge request received
   */
  async logRechargeRequest(
    context: RechargeAuditContext,
    requestDetails: {
      xafAmount: number;
      userHederaAccountId: string;
      estimatedHbarAmount?: number;
      estimatedFees?: any;
    }
  ): Promise<AuditResult> {
    return await this.logRechargeEvent({
      ...context,
      eventType: "recharge_request_received",
      status: "initiated",
      details: {
        ...requestDetails,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log validation process
   */
  async logValidation(
    context: RechargeAuditContext,
    validationResult: {
      isValid: boolean;
      validationErrors?: string[];
      kycVerificationLevel?: "none" | "basic" | "enhanced";
      riskLevel?: "low" | "medium" | "high" | "critical";
      fraudDetectionFlags?: string[];
    }
  ): Promise<AuditResult> {
    const eventType = validationResult.isValid
      ? "recharge_validation_completed"
      : "recharge_validation_started";

    return await this.logRechargeEvent({
      ...context,
      eventType,
      status: validationResult.isValid ? "processing" : "failed",
      kycVerificationLevel: validationResult.kycVerificationLevel,
      riskLevel: validationResult.riskLevel,
      fraudDetectionFlags: validationResult.fraudDetectionFlags,
      details: {
        validationResult,
        timestamp: new Date().toISOString(),
      },
      errorMessage: validationResult.validationErrors?.join(", "),
    });
  }

  /**
   * Log Orange Money payment events
   */
  async logOrangeMoneyPayment(
    context: RechargeAuditContext,
    paymentResult: {
      success: boolean;
      orangeMoneyTransactionId?: string;
      errorCode?: string;
      errorMessage?: string;
      processingTimeMs?: number;
    }
  ): Promise<AuditResult> {
    const eventType = paymentResult.success
      ? "orange_money_payment_confirmed"
      : "orange_money_payment_failed";

    return await this.logRechargeEvent({
      ...context,
      eventType,
      status: paymentResult.success ? "processing" : "failed",
      orangeMoneyTransactionId: paymentResult.orangeMoneyTransactionId,
      processingTimeMs: paymentResult.processingTimeMs,
      errorCode: paymentResult.errorCode,
      errorMessage: paymentResult.errorMessage,
      details: {
        paymentResult,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log HBAR transfer events
   */
  async logHbarTransfer(
    context: RechargeAuditContext,
    transferResult: {
      success: boolean;
      hederaTransactionId?: string;
      hbarAmount?: number;
      exchangeRate?: number;
      actualCost?: string;
      errorCode?: string;
      errorMessage?: string;
      processingTimeMs?: number;
      retryCount?: number;
    }
  ): Promise<AuditResult> {
    const eventType = transferResult.success
      ? "hbar_transfer_completed"
      : "hbar_transfer_failed";

    return await this.logRechargeEvent({
      ...context,
      eventType,
      status: transferResult.success ? "completed" : "failed",
      hederaTransactionId: transferResult.hederaTransactionId,
      hbarAmount: transferResult.hbarAmount,
      exchangeRate: transferResult.exchangeRate,
      processingTimeMs: transferResult.processingTimeMs,
      retryCount: transferResult.retryCount,
      errorCode: transferResult.errorCode,
      errorMessage: transferResult.errorMessage,
      details: {
        transferResult,
        actualCost: transferResult.actualCost,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log transaction completion
   */
  async logTransactionCompletion(
    context: RechargeAuditContext,
    completionResult: {
      success: boolean;
      finalStatus: "completed" | "failed";
      totalProcessingTimeMs: number;
      finalHbarAmount?: number;
      finalFees?: any;
      errorSummary?: string;
    }
  ): Promise<AuditResult> {
    const eventType = completionResult.success
      ? "recharge_completed"
      : "recharge_failed";

    return await this.logRechargeEvent({
      ...context,
      eventType,
      status: completionResult.finalStatus,
      hbarAmount: completionResult.finalHbarAmount,
      fees: completionResult.finalFees,
      processingTimeMs: completionResult.totalProcessingTimeMs,
      errorMessage: completionResult.errorSummary,
      details: {
        completionResult,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log compliance alerts
   */
  async logComplianceAlert(
    context: RechargeAuditContext,
    alertDetails: {
      alertType: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      triggeredBy: string;
      requiresAction: boolean;
      recommendedActions?: string[];
    }
  ): Promise<AuditResult> {
    return await this.logRechargeEvent({
      ...context,
      eventType: "compliance_alert_triggered",
      status: "processing",
      riskLevel: alertDetails.severity,
      details: {
        alertDetails,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log admin interventions
   */
  async logAdminIntervention(
    context: RechargeAuditContext,
    interventionDetails: {
      adminUserId: string;
      action: string;
      reason: string;
      outcome: "resolved" | "escalated" | "pending";
      notes?: string;
    }
  ): Promise<AuditResult> {
    return await this.logRechargeEvent({
      ...context,
      eventType: "admin_intervention_required",
      status:
        interventionDetails.outcome === "resolved" ? "completed" : "processing",
      details: {
        interventionDetails,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Query audit events with filters
   */
  async queryAuditEvents(options: AuditQueryOptions): Promise<{
    events: RechargeAuditEvent[];
    nextToken?: string;
    totalCount: number;
  }> {
    try {
      let queryExpression = "";
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build query based on options
      if (options.userId) {
        queryExpression = "#PK = :pk";
        expressionAttributeNames["#PK"] = "PK";
        expressionAttributeValues[":pk"] = `RECHARGE_AUDIT#${options.userId}`;

        if (options.transactionId) {
          queryExpression += " AND begins_with(#SK, :skPrefix)";
          expressionAttributeNames["#SK"] = "SK";
          expressionAttributeValues[":skPrefix"] = `${options.transactionId}#`;
        }
      } else if (options.transactionId) {
        // Use GSI to query by transaction ID across all users
        queryExpression = "#GSI1PK = :gsi1pk";
        expressionAttributeNames["#GSI1PK"] = "GSI1PK";
        expressionAttributeValues[
          ":gsi1pk"
        ] = `TRANSACTION#${options.transactionId}`;
      } else {
        // Query by date range using GSI2
        queryExpression = "#GSI2PK = :gsi2pk";
        expressionAttributeNames["#GSI2PK"] = "GSI2PK";
        expressionAttributeValues[":gsi2pk"] = "RECHARGE_EVENTS";

        if (options.startDate && options.endDate) {
          queryExpression += " AND #GSI2SK BETWEEN :start AND :end";
          expressionAttributeNames["#GSI2SK"] = "GSI2SK";
          expressionAttributeValues[":start"] = options.startDate;
          expressionAttributeValues[":end"] = options.endDate;
        }
      }

      // Add filters
      if (options.eventType) {
        queryExpression += " AND #eventType = :eventType";
        expressionAttributeNames["#eventType"] = "eventType";
        expressionAttributeValues[":eventType"] = options.eventType;
      }

      if (options.status) {
        queryExpression += " AND #status = :status";
        expressionAttributeNames["#status"] = "status";
        expressionAttributeValues[":status"] = options.status;
      }

      if (options.riskLevel) {
        queryExpression += " AND #riskLevel = :riskLevel";
        expressionAttributeNames["#riskLevel"] = "riskLevel";
        expressionAttributeValues[":riskLevel"] = options.riskLevel;
      }

      const result = await this.repository.queryItems(
        queryExpression,
        expressionAttributeNames,
        expressionAttributeValues,
        options.userId ? undefined : "GSI2", // Use GSI2 for non-user queries
        {
          limit: options.limit || 50,
          exclusiveStartKey: options.nextToken
            ? JSON.parse(options.nextToken)
            : undefined,
        }
      );

      const events = result.items.map(this.mapToRechargeAuditEvent);

      return {
        events,
        nextToken: result.lastEvaluatedKey
          ? JSON.stringify(result.lastEvaluatedKey)
          : undefined,
        totalCount: result.count,
      };
    } catch (error) {
      this.logger.error(
        "Failed to query audit events",
        {
          operation: "RechargeAuditService",
          options,
        },
        error as Error
      );

      return {
        events: [],
        totalCount: 0,
      };
    }
  }

  /**
   * Generate audit summary for a period
   */
  async generateAuditSummary(
    startDate: string,
    endDate: string
  ): Promise<AuditSummary> {
    try {
      const events = await this.queryAuditEvents({
        startDate,
        endDate,
        limit: 10000, // Large limit to get comprehensive data
      });

      const summary: AuditSummary = {
        period: { startDate, endDate },
        metrics: {
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          totalXafAmount: 0,
          totalHbarAmount: 0,
          averageProcessingTime: 0,
          uniqueUsers: 0,
          uniqueIPs: 0,
        },
        riskAnalysis: {
          highRiskTransactions: 0,
          fraudDetectionAlerts: 0,
          kycVerificationRequired: 0,
          rateLimitViolations: 0,
        },
        errorAnalysis: {
          topErrorCodes: [],
          orangeMoneyFailures: 0,
          hederaNetworkFailures: 0,
          validationFailures: 0,
        },
      };

      // Analyze events
      const uniqueUsers = new Set<string>();
      const uniqueIPs = new Set<string>();
      const errorCodes: Record<string, number> = {};
      const processingTimes: number[] = [];

      for (const event of events.events) {
        uniqueUsers.add(event.userId);
        if (event.ipAddress) uniqueIPs.add(event.ipAddress);

        // Count transactions
        if (event.eventType === "recharge_request_received") {
          summary.metrics.totalTransactions++;
          if (event.xafAmount)
            summary.metrics.totalXafAmount += event.xafAmount;
        }

        if (event.eventType === "recharge_completed") {
          summary.metrics.successfulTransactions++;
          if (event.hbarAmount)
            summary.metrics.totalHbarAmount += event.hbarAmount;
        }

        if (event.eventType === "recharge_failed") {
          summary.metrics.failedTransactions++;
        }

        // Risk analysis
        if (event.riskLevel === "high" || event.riskLevel === "critical") {
          summary.riskAnalysis.highRiskTransactions++;
        }

        if (event.fraudDetectionFlags && event.fraudDetectionFlags.length > 0) {
          summary.riskAnalysis.fraudDetectionAlerts++;
        }

        if (
          event.kycVerificationLevel &&
          event.kycVerificationLevel !== "none"
        ) {
          summary.riskAnalysis.kycVerificationRequired++;
        }

        // Error analysis
        if (event.errorCode) {
          errorCodes[event.errorCode] = (errorCodes[event.errorCode] || 0) + 1;

          if (event.errorCode.includes("ORANGE_MONEY")) {
            summary.errorAnalysis.orangeMoneyFailures++;
          } else if (event.errorCode.includes("HEDERA")) {
            summary.errorAnalysis.hederaNetworkFailures++;
          } else if (event.errorCode.includes("VALIDATION")) {
            summary.errorAnalysis.validationFailures++;
          } else if (event.errorCode.includes("RATE_LIMIT")) {
            summary.riskAnalysis.rateLimitViolations++;
          }
        }

        // Processing times
        if (event.processingTimeMs) {
          processingTimes.push(event.processingTimeMs);
        }
      }

      // Finalize metrics
      summary.metrics.uniqueUsers = uniqueUsers.size;
      summary.metrics.uniqueIPs = uniqueIPs.size;
      summary.metrics.averageProcessingTime =
        processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) /
            processingTimes.length
          : 0;

      // Top error codes
      summary.errorAnalysis.topErrorCodes = Object.entries(errorCodes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([code, count]) => ({ code, count }));

      return summary;
    } catch (error) {
      this.logger.error(
        "Failed to generate audit summary",
        {
          operation: "RechargeAuditService",
          startDate,
          endDate,
        },
        error as Error
      );

      throw error;
    }
  }

  private async logRechargeEvent(
    event: Partial<RechargeAuditEvent>
  ): Promise<AuditResult> {
    try {
      const eventId = this.generateEventId();
      const timestamp = new Date().toISOString();
      const date = timestamp.split("T")[0];

      const auditEvent: RechargeAuditEvent = {
        eventId,
        timestamp,
        status: "initiated",
        details: {},
        ...event,
      } as RechargeAuditEvent;

      // Store in DynamoDB for querying
      const record = {
        PK: `RECHARGE_AUDIT#${auditEvent.userId}`,
        SK: `${auditEvent.transactionId}#${timestamp}#${eventId}`,

        // Copy all event fields
        ...auditEvent,

        // GSI1 for transaction-based queries
        GSI1PK: auditEvent.transactionId
          ? `TRANSACTION#${auditEvent.transactionId}`
          : undefined,
        GSI1SK: timestamp,

        // GSI2 for time-based queries
        GSI2PK: "RECHARGE_EVENTS",
        GSI2SK: timestamp,
      };

      await this.repository.putItem(record);

      // Also log through audit enhancer for compliance
      const auditResult = await this.auditEnhancer.logUserAction(
        {
          userId: auditEvent.userId,
          action: auditEvent.eventType,
          resource: "hbar_recharge",
          ipAddress: auditEvent.ipAddress,
          userAgent: auditEvent.userAgent,
          sessionId: auditEvent.sessionId,
          requestId: auditEvent.requestId,
        },
        auditEvent.status === "completed"
          ? "success"
          : auditEvent.status === "failed"
          ? "failure"
          : "success",
        auditEvent.details,
        auditEvent.errorMessage
      );

      this.logger.info("Recharge audit event logged", {
        operation: "RechargeAuditService",
        eventId,
        eventType: auditEvent.eventType,
        userId: auditEvent.userId,
        transactionId: auditEvent.transactionId,
      });

      return auditResult;
    } catch (error) {
      this.logger.error(
        "Failed to log recharge audit event",
        {
          operation: "RechargeAuditService",
          eventType: event.eventType,
          userId: event.userId,
        },
        error as Error
      );

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private mapToRechargeAuditEvent(item: any): RechargeAuditEvent {
    return {
      eventId: item.eventId,
      transactionId: item.transactionId,
      userId: item.userId,
      eventType: item.eventType,
      timestamp: item.timestamp,
      details: item.details || {},
      ipAddress: item.ipAddress,
      userAgent: item.userAgent,
      sessionId: item.sessionId,
      requestId: item.requestId,
      xafAmount: item.xafAmount,
      hbarAmount: item.hbarAmount,
      exchangeRate: item.exchangeRate,
      fees: item.fees,
      orangeMoneyTransactionId: item.orangeMoneyTransactionId,
      hederaTransactionId: item.hederaTransactionId,
      status: item.status,
      errorCode: item.errorCode,
      errorMessage: item.errorMessage,
      kycVerificationLevel: item.kycVerificationLevel,
      riskLevel: item.riskLevel,
      fraudDetectionFlags: item.fraudDetectionFlags,
      processingTimeMs: item.processingTimeMs,
      retryCount: item.retryCount,
    };
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
