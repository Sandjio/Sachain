import { ComplianceRepository } from "../repositories/compliance-repository";
import { AuditLogRepository } from "../repositories/audit-log-repository";
import { StructuredLogger } from "./structured-logger";

export interface DataRetentionConfig {
  auditLogs: number; // days
  projectData: number; // days
  userProfiles: number; // days
  kycDocuments: number; // days
  complianceEvents: number; // days
}

export interface ComplianceReport {
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalAuditLogs: number;
    successfulOperations: number;
    failedOperations: number;
    projectsCreated: number;
    stocksMinted: number;
    complianceEvents: number;
  };
  riskIndicators: {
    highFailureRate: boolean;
    suspiciousActivity: boolean;
    dataRetentionViolations: boolean;
  };
}

export class ComplianceService {
  private readonly defaultRetentionConfig: DataRetentionConfig = {
    auditLogs: 2555, // 7 years
    projectData: 2555, // 7 years
    userProfiles: 2555, // 7 years
    kycDocuments: 1825, // 5 years
    complianceEvents: 3650, // 10 years
  };

  constructor(
    private complianceRepo: ComplianceRepository,
    private auditRepo: AuditLogRepository,
    private logger: StructuredLogger,
    private retentionConfig: DataRetentionConfig = {} as DataRetentionConfig
  ) {
    this.retentionConfig = { ...this.defaultRetentionConfig, ...retentionConfig };
  }

  async enforceDataRetention(): Promise<{
    auditLogsDeleted: number;
    complianceEventsDeleted: number;
    errors: string[];
  }> {
    const results = {
      auditLogsDeleted: 0,
      complianceEventsDeleted: 0,
      errors: [] as string[],
    };

    try {
      // Clean up old audit logs
      results.auditLogsDeleted = await this.auditRepo.cleanupOldLogs(
        this.retentionConfig.auditLogs
      );

      this.logger.info("Data retention enforcement completed", {
        operation: "ComplianceService",
        auditLogsDeleted: results.auditLogsDeleted,
      });
    } catch (error) {
      const errorMsg = `Data retention enforcement failed: ${(error as Error).message}`;
      results.errors.push(errorMsg);
      this.logger.error("Data retention enforcement failed", {
        operation: "ComplianceService",
      }, error as Error);
    }

    return results;
  }

  async generateComplianceReport(
    startDate: string,
    endDate: string
  ): Promise<ComplianceReport> {
    try {
      const report: ComplianceReport = {
        period: { startDate, endDate },
        metrics: {
          totalAuditLogs: 0,
          successfulOperations: 0,
          failedOperations: 0,
          projectsCreated: 0,
          stocksMinted: 0,
          complianceEvents: 0,
        },
        riskIndicators: {
          highFailureRate: false,
          suspiciousActivity: false,
          dataRetentionViolations: false,
        },
      };

      // Collect metrics for each day in the range
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);

      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const dayStats = await this.auditRepo.getAuditStats(dateStr);

        report.metrics.totalAuditLogs += dayStats.total;
        report.metrics.successfulOperations += dayStats.successful;
        report.metrics.failedOperations += dayStats.failed;
        report.metrics.projectsCreated += dayStats.byAction["project_creation"] || 0;
        report.metrics.stocksMinted += dayStats.byAction["stock_minting"] || 0;

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate risk indicators
      const failureRate = report.metrics.totalAuditLogs > 0 
        ? report.metrics.failedOperations / report.metrics.totalAuditLogs 
        : 0;
      
      report.riskIndicators.highFailureRate = failureRate > 0.05; // 5% threshold
      report.riskIndicators.suspiciousActivity = await this.detectSuspiciousActivity(startDate, endDate);
      report.riskIndicators.dataRetentionViolations = await this.checkRetentionViolations();

      this.logger.info("Compliance report generated", {
        operation: "ComplianceService",
        period: report.period,
        totalAuditLogs: report.metrics.totalAuditLogs,
        riskIndicators: report.riskIndicators,
      });

      return report;
    } catch (error) {
      this.logger.error("Failed to generate compliance report", {
        operation: "ComplianceService",
        startDate,
        endDate,
      }, error as Error);
      throw error;
    }
  }

  async trackDataAccess(
    userId: string,
    dataType: string,
    accessReason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.complianceRepo.createComplianceEvent({
        eventType: "data_accessed",
        userId,
        details: {
          dataType,
          accessReason,
          timestamp: new Date().toISOString(),
        },
        ipAddress,
        userAgent,
        legalBasis: "legitimate_interest",
      });

      this.logger.info("Data access tracked", {
        operation: "ComplianceService",
        userId,
        dataType,
        accessReason,
      });
    } catch (error) {
      this.logger.error("Failed to track data access", {
        operation: "ComplianceService",
        userId,
        dataType,
      }, error as Error);
      throw error;
    }
  }

  async validateRetentionCompliance(): Promise<{
    compliant: boolean;
    violations: Array<{
      dataType: string;
      issue: string;
      recommendedAction: string;
    }>;
  }> {
    const violations: Array<{
      dataType: string;
      issue: string;
      recommendedAction: string;
    }> = [];

    try {
      // Check for data older than retention periods
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionConfig.auditLogs);
      
      const oldAuditLogs = await this.auditRepo.getAuditLogsByDateRange(
        "2020-01-01", // Start from a very old date
        cutoffDate.toISOString().split("T")[0]
      );

      if (oldAuditLogs.count > 0) {
        violations.push({
          dataType: "audit_logs",
          issue: `${oldAuditLogs.count} audit logs exceed retention period`,
          recommendedAction: "Run data retention cleanup process",
        });
      }

      this.logger.info("Retention compliance validation completed", {
        operation: "ComplianceService",
        violationsFound: violations.length,
      });

      return {
        compliant: violations.length === 0,
        violations,
      };
    } catch (error) {
      this.logger.error("Failed to validate retention compliance", {
        operation: "ComplianceService",
      }, error as Error);
      throw error;
    }
  }

  private async detectSuspiciousActivity(startDate: string, endDate: string): Promise<boolean> {
    try {
      // Look for patterns that might indicate suspicious activity
      const failedLogs = await this.auditRepo.getFailedAuditLogs({ limit: 1000 });
      
      // Check for high frequency of failed operations from same user/IP
      const failuresByUser: Record<string, number> = {};
      const failuresByIP: Record<string, number> = {};
      
      failedLogs.items.forEach(log => {
        if (log.timestamp >= startDate && log.timestamp <= endDate) {
          failuresByUser[log.userId] = (failuresByUser[log.userId] || 0) + 1;
          if (log.ipAddress) {
            failuresByIP[log.ipAddress] = (failuresByIP[log.ipAddress] || 0) + 1;
          }
        }
      });

      // Flag as suspicious if any user has more than 50 failures or any IP has more than 100 failures
      const suspiciousUsers = Object.values(failuresByUser).some(count => count > 50);
      const suspiciousIPs = Object.values(failuresByIP).some(count => count > 100);

      return suspiciousUsers || suspiciousIPs;
    } catch (error) {
      this.logger.error("Failed to detect suspicious activity", {
        operation: "ComplianceService",
      }, error as Error);
      return false;
    }
  }

  private async checkRetentionViolations(): Promise<boolean> {
    try {
      const validation = await this.validateRetentionCompliance();
      return !validation.compliant;
    } catch (error) {
      this.logger.error("Failed to check retention violations", {
        operation: "ComplianceService",
      }, error as Error);
      return true; // Assume violation if check fails
    }
  }
}