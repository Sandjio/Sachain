export interface ComplianceReportRequest {
  startDate: string;
  endDate: string;
}

export interface DataAccessTrackingRequest {
  dataType: string;
  accessReason: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQueryRequest {
  date?: string;
  action?: string;
  userId?: string;
  limit?: number;
}

export interface ComplianceReportResponse {
  report: {
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
  };
}

export interface RetentionStatusResponse {
  retentionStatus: {
    compliant: boolean;
    violations: Array<{
      dataType: string;
      issue: string;
      recommendedAction: string;
    }>;
  };
}

export interface DataRetentionResponse {
  retentionResults: {
    auditLogsDeleted: number;
    complianceEventsDeleted: number;
    errors: string[];
  };
}