export interface ScheduledComplianceResult {
  success: boolean;
  duration: number;
  retentionResults: {
    auditLogsDeleted: number;
    complianceEventsDeleted: number;
    errors: string[];
  };
  complianceReport: {
    totalAuditLogs: number;
    successfulOperations: number;
    failedOperations: number;
    failureRate: number;
  };
  retentionStatus: {
    compliant: boolean;
    violationsCount: number;
  };
  riskIndicators: {
    highFailureRate: boolean;
    suspiciousActivity: boolean;
    dataRetentionViolations: boolean;
  };
}

export interface ComplianceMetrics {
  auditLogsDeleted: number;
  complianceEventsDeleted: number;
  retentionErrors: number;
  dailyAuditLogs: number;
  dailySuccessfulOperations: number;
  dailyFailedOperations: number;
  dailyProjectsCreated: number;
  dailyStocksMinted: number;
  operationFailureRate: number;
  retentionCompliant: number;
  retentionViolations: number;
  highFailureRateRisk: number;
  suspiciousActivityRisk: number;
  dataRetentionViolationRisk: number;
}