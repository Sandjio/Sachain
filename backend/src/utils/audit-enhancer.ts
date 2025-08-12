import { AuditLogRepository } from "../repositories/audit-log-repository";
import { ComplianceRepository } from "../repositories/compliance-repository";
import { StructuredLogger } from "./structured-logger";

export interface AuditContext {
  userId: string;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

export interface AuditResult {
  success: boolean;
  auditLogId?: string;
  complianceEventId?: string;
  error?: string;
}

export class AuditEnhancer {
  constructor(
    private auditRepo: AuditLogRepository,
    private complianceRepo: ComplianceRepository,
    private logger: StructuredLogger
  ) {}

  /**
   * Enhanced audit logging with compliance event tracking
   */
  async logUserAction(
    context: AuditContext,
    result: "success" | "failure",
    details?: Record<string, any>,
    errorMessage?: string
  ): Promise<AuditResult> {
    try {
      // Create audit log
      const auditLog = await this.auditRepo.createAuditLog({
        userId: context.userId,
        action: context.action,
        resource: context.resource,
        result,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        errorMessage,
        details: {
          ...details,
          sessionId: context.sessionId,
          requestId: context.requestId,
        },
      });

      // Create compliance event for sensitive actions
      let complianceEventId: string | undefined;
      if (this.isSensitiveAction(context.action)) {
        const complianceEvent = await this.complianceRepo.createComplianceEvent({
          eventType: this.mapActionToComplianceEvent(context.action),
          userId: context.userId,
          details: {
            action: context.action,
            resource: context.resource,
            result,
            ...details,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          legalBasis: this.determineLegalBasis(context.action),
        });
        complianceEventId = complianceEvent.SK;
      }

      this.logger.info("Enhanced audit log created", {
        operation: "AuditEnhancer",
        userId: context.userId,
        action: context.action,
        result,
        auditLogId: auditLog.SK,
        complianceEventId,
      });

      return {
        success: true,
        auditLogId: auditLog.SK,
        complianceEventId,
      };
    } catch (error) {
      this.logger.error("Failed to create enhanced audit log", {
        operation: "AuditEnhancer",
        userId: context.userId,
        action: context.action,
      }, error as Error);

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Log data access events for GDPR compliance
   */
  async logDataAccess(
    userId: string,
    dataType: string,
    accessReason: string,
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<AuditResult> {
    return await this.logUserAction(
      {
        userId,
        action: "data_access",
        resource: dataType,
        ipAddress,
        userAgent,
      },
      "success",
      {
        dataType,
        accessReason,
        ...details,
      }
    );
  }

  /**
   * Log authentication events with enhanced security context
   */
  async logAuthentication(
    userId: string,
    authMethod: string,
    result: "success" | "failure",
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<AuditResult> {
    return await this.logUserAction(
      {
        userId,
        action: "authentication",
        resource: "user_session",
        ipAddress,
        userAgent,
      },
      result,
      {
        authMethod,
        ...details,
      },
      result === "failure" ? details?.errorMessage : undefined
    );
  }

  /**
   * Log administrative actions with elevated tracking
   */
  async logAdminAction(
    adminUserId: string,
    targetUserId: string,
    action: string,
    resource: string,
    result: "success" | "failure",
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<AuditResult> {
    return await this.logUserAction(
      {
        userId: adminUserId,
        action: `admin_${action}`,
        resource,
        ipAddress,
        userAgent,
      },
      result,
      {
        targetUserId,
        adminAction: action,
        ...details,
      }
    );
  }

  /**
   * Batch audit logging for bulk operations
   */
  async logBulkOperation(
    userId: string,
    operation: string,
    items: Array<{ resource: string; result: "success" | "failure"; details?: Record<string, any> }>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditResult[]> {
    const results: AuditResult[] = [];

    for (const item of items) {
      const result = await this.logUserAction(
        {
          userId,
          action: `bulk_${operation}`,
          resource: item.resource,
          ipAddress,
          userAgent,
        },
        item.result,
        {
          bulkOperation: operation,
          ...item.details,
        }
      );
      results.push(result);
    }

    return results;
  }

  private isSensitiveAction(action: string): boolean {
    const sensitiveActions = [
      "data_access",
      "data_export",
      "data_deletion",
      "kyc_upload",
      "kyc_approve",
      "kyc_reject",
      "profile_update",
      "consent_granted",
      "consent_revoked",
      "admin_access",
    ];
    return sensitiveActions.some(sensitive => action.includes(sensitive));
  }

  private mapActionToComplianceEvent(action: string): any {
    const mapping: Record<string, any> = {
      "data_access": "data_accessed",
      "data_export": "data_exported",
      "data_deletion": "data_deleted",
      "consent_granted": "consent_granted",
      "consent_revoked": "consent_revoked",
    };
    return mapping[action] || "data_accessed";
  }

  private determineLegalBasis(action: string): string {
    const legalBasisMapping: Record<string, string> = {
      "authentication": "contract",
      "kyc_upload": "legal_obligation",
      "kyc_approve": "legal_obligation",
      "kyc_reject": "legal_obligation",
      "data_export": "legitimate_interest",
      "data_deletion": "consent",
      "consent_granted": "consent",
      "consent_revoked": "consent",
      "profile_update": "contract",
    };
    
    for (const [key, basis] of Object.entries(legalBasisMapping)) {
      if (action.includes(key)) {
        return basis;
      }
    }
    
    return "legitimate_interest";
  }
}