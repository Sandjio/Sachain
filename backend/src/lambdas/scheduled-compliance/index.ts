import { ScheduledEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { AuditLogRepository } from "../../repositories/audit-log-repository";
import { ComplianceRepository } from "../../repositories/compliance-repository";
import { ComplianceService } from "../../utils/compliance-service";
import { StructuredLogger } from "../../utils/structured-logger";
import { CloudWatchMetrics } from "../../utils/cloudwatch-metrics";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.DYNAMODB_TABLE_NAME!;

const auditRepo = new AuditLogRepository({ client: dynamoClient, tableName });
const complianceRepo = new ComplianceRepository({ client: dynamoClient, tableName });
const logger = new StructuredLogger("scheduled-compliance");
const metrics = new CloudWatchMetrics("Sachain/Compliance");
const complianceService = new ComplianceService(complianceRepo, auditRepo, logger);

export const handler = async (event: ScheduledEvent): Promise<void> => {
  const startTime = Date.now();
  
  logger.info("Scheduled compliance task started", {
    operation: "ScheduledCompliance",
    eventSource: event.source,
    scheduledTime: event.time,
  });

  try {
    // Enforce data retention policies
    const retentionResults = await complianceService.enforceDataRetention();
    
    // Generate daily compliance metrics
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];
    
    const report = await complianceService.generateComplianceReport(dateStr, dateStr);
    
    // Validate retention compliance
    const retentionStatus = await complianceService.validateRetentionCompliance();
    
    // Send metrics to CloudWatch
    await sendComplianceMetrics(retentionResults, report, retentionStatus);
    
    // Log audit entry for the scheduled task
    await auditRepo.createAuditLog({
      userId: "system",
      action: "scheduled_compliance_check",
      resource: "compliance_system",
      result: "success",
      details: {
        auditLogsDeleted: retentionResults.auditLogsDeleted,
        complianceEventsDeleted: retentionResults.complianceEventsDeleted,
        retentionCompliant: retentionStatus.compliant,
        violationsCount: retentionStatus.violations.length,
        dailyAuditLogs: report.metrics.totalAuditLogs,
        failureRate: report.metrics.totalAuditLogs > 0 
          ? report.metrics.failedOperations / report.metrics.totalAuditLogs 
          : 0,
      },
    });

    const duration = Date.now() - startTime;
    
    logger.info("Scheduled compliance task completed successfully", {
      operation: "ScheduledCompliance",
      duration,
      auditLogsDeleted: retentionResults.auditLogsDeleted,
      complianceEventsDeleted: retentionResults.complianceEventsDeleted,
      retentionCompliant: retentionStatus.compliant,
      violationsCount: retentionStatus.violations.length,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error("Scheduled compliance task failed", {
      operation: "ScheduledCompliance",
      duration,
    }, error as Error);

    // Log the failure for audit purposes
    try {
      await auditRepo.createAuditLog({
        userId: "system",
        action: "scheduled_compliance_check",
        resource: "compliance_system",
        result: "failure",
        errorMessage: (error as Error).message,
        details: {
          errorType: (error as Error).constructor.name,
        },
      });
    } catch (auditError) {
      logger.error("Failed to log compliance task failure", {
        operation: "ScheduledCompliance",
      }, auditError as Error);
    }

    // Send failure metric
    await metrics.putMetric("ComplianceTaskFailures", 1, "Count");
    
    throw error;
  }
};

async function sendComplianceMetrics(
  retentionResults: any,
  report: any,
  retentionStatus: any
): Promise<void> {
  try {
    // Data retention metrics
    await metrics.putMetric("AuditLogsDeleted", retentionResults.auditLogsDeleted, "Count");
    await metrics.putMetric("ComplianceEventsDeleted", retentionResults.complianceEventsDeleted, "Count");
    await metrics.putMetric("RetentionErrors", retentionResults.errors.length, "Count");
    
    // Daily audit metrics
    await metrics.putMetric("DailyAuditLogs", report.metrics.totalAuditLogs, "Count");
    await metrics.putMetric("DailySuccessfulOperations", report.metrics.successfulOperations, "Count");
    await metrics.putMetric("DailyFailedOperations", report.metrics.failedOperations, "Count");
    await metrics.putMetric("DailyProjectsCreated", report.metrics.projectsCreated, "Count");
    await metrics.putMetric("DailyStocksMinted", report.metrics.stocksMinted, "Count");
    
    // Failure rate metric
    const failureRate = report.metrics.totalAuditLogs > 0 
      ? (report.metrics.failedOperations / report.metrics.totalAuditLogs) * 100 
      : 0;
    await metrics.putMetric("OperationFailureRate", failureRate, "Percent");
    
    // Compliance status metrics
    await metrics.putMetric("RetentionCompliant", retentionStatus.compliant ? 1 : 0, "Count");
    await metrics.putMetric("RetentionViolations", retentionStatus.violations.length, "Count");
    
    // Risk indicator metrics
    await metrics.putMetric("HighFailureRateRisk", report.riskIndicators.highFailureRate ? 1 : 0, "Count");
    await metrics.putMetric("SuspiciousActivityRisk", report.riskIndicators.suspiciousActivity ? 1 : 0, "Count");
    await metrics.putMetric("DataRetentionViolationRisk", report.riskIndicators.dataRetentionViolations ? 1 : 0, "Count");

    logger.info("Compliance metrics sent to CloudWatch", {
      operation: "ScheduledCompliance",
      metricsCount: 13,
    });

  } catch (error) {
    logger.error("Failed to send compliance metrics", {
      operation: "ScheduledCompliance",
    }, error as Error);
    // Don't throw here as metrics failure shouldn't fail the entire task
  }
}