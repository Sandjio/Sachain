import { ScheduledEvent, Context } from "aws-lambda";
import { StructuredLogger } from "../../utils/structured-logger";
import {
  RechargeAlertingService,
  DEFAULT_ALERT_THRESHOLDS,
  AlertConfig,
} from "../../utils/recharge-alerting";
import { rechargeMetricsService } from "../../utils/recharge-metrics";
import { cloudWatchDashboardService } from "../../utils/cloudwatch-dashboard";
import { createCloudWatchAlarmsService } from "../../utils/cloudwatch-alarms";

const logger = StructuredLogger.getInstance("RechargeMonitoring");

// Configuration from environment variables
const alertConfig: AlertConfig = {
  snsTopicArn: process.env.ALERT_SNS_TOPIC_ARN || "",
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .filter((email) => email.trim()),
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  enabledAlerts: {
    rechargeFailures: process.env.ENABLE_RECHARGE_FAILURE_ALERTS !== "false",
    performanceIssues: process.env.ENABLE_PERFORMANCE_ALERTS !== "false",
    treasuryBalance: process.env.ENABLE_TREASURY_ALERTS !== "false",
    exchangeRateStale: process.env.ENABLE_EXCHANGE_RATE_ALERTS !== "false",
    systemErrors: process.env.ENABLE_SYSTEM_ERROR_ALERTS !== "false",
  },
};

// Custom thresholds from environment or defaults
const alertThresholds = {
  ...DEFAULT_ALERT_THRESHOLDS,
  rechargeFailureRatePercent: parseFloat(
    process.env.FAILURE_RATE_THRESHOLD || "5"
  ),
  averageProcessingTimeMs: parseInt(
    process.env.PROCESSING_TIME_THRESHOLD || "30000"
  ),
  treasuryBalanceWarningHBAR: parseFloat(
    process.env.TREASURY_WARNING_THRESHOLD || "1000"
  ),
  treasuryBalanceCriticalHBAR: parseFloat(
    process.env.TREASURY_CRITICAL_THRESHOLD || "100"
  ),
  exchangeRateStaleMinutes: parseInt(
    process.env.EXCHANGE_RATE_STALE_THRESHOLD || "5"
  ),
  orangeMoneyErrorRatePercent: parseFloat(
    process.env.OM_ERROR_RATE_THRESHOLD || "1"
  ),
  hederaErrorRatePercent: parseFloat(
    process.env.HEDERA_ERROR_RATE_THRESHOLD || "1"
  ),
  apiResponseTimeMs: parseInt(
    process.env.API_RESPONSE_TIME_THRESHOLD || "5000"
  ),
};

const alertingService = new RechargeAlertingService(
  alertThresholds,
  alertConfig
);

const alarmsService = createCloudWatchAlarmsService(alertConfig.snsTopicArn);

export const handler = async (event: ScheduledEvent, context: Context) => {
  logger.info("Starting recharge monitoring check", {
    requestId: context.awsRequestId,
    eventSource: event.source,
    time: event.time,
  });

  try {
    // Handle different event types based on detail-type or custom parameter
    const eventType = event["detail-type"] || "monitoring-check";

    if (eventType === "setup-infrastructure") {
      await setupMonitoringInfrastructure();
    } else if (eventType === "cleanup-infrastructure") {
      await cleanupMonitoringInfrastructure();
    } else {
      // Default monitoring check
      await performMonitoringCheck();
    }

    logger.info("Recharge monitoring operation completed successfully", {
      requestId: context.awsRequestId,
      eventType,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Monitoring operation completed successfully",
        eventType,
        timestamp: new Date().toISOString(),
        requestId: context.awsRequestId,
      }),
    };
  } catch (error) {
    logger.error("Recharge monitoring operation failed", {
      error,
      requestId: context.awsRequestId,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Monitoring operation failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        requestId: context.awsRequestId,
      }),
    };
  }
};

async function performMonitoringCheck(): Promise<void> {
  // Run all monitoring checks in parallel
  const monitoringTasks = [
    alertingService.checkRechargeFailureRate(),
    alertingService.checkProcessingTime(),
    alertingService.checkSystemErrors(),
  ];

  // Execute all checks
  await Promise.allSettled(monitoringTasks);

  // Check treasury balance (this would typically get the current balance from Hedera)
  await checkTreasuryBalance();

  // Check exchange rate staleness (this would get the latest rate info)
  await checkExchangeRateStaleness();
}

async function setupMonitoringInfrastructure(): Promise<void> {
  logger.info("Setting up monitoring infrastructure");

  try {
    // Create CloudWatch dashboard
    await cloudWatchDashboardService.createRechargeDashboard();
    logger.info("CloudWatch dashboard created successfully");

    // Create CloudWatch alarms
    await alarmsService.createAllRechargeAlarms(alertThresholds);
    logger.info("CloudWatch alarms created successfully");
  } catch (error) {
    logger.error("Failed to setup monitoring infrastructure", { error });
    throw error;
  }
}

async function cleanupMonitoringInfrastructure(): Promise<void> {
  logger.info("Cleaning up monitoring infrastructure");

  try {
    // Delete CloudWatch alarms
    await alarmsService.deleteAllRechargeAlarms();
    logger.info("CloudWatch alarms deleted successfully");

    // Delete CloudWatch dashboard
    await cloudWatchDashboardService.deleteDashboard("HBAR-Recharge-System");
    logger.info("CloudWatch dashboard deleted successfully");
  } catch (error) {
    logger.error("Failed to cleanup monitoring infrastructure", { error });
    throw error;
  }
}

async function checkTreasuryBalance(): Promise<void> {
  try {
    // In a real implementation, this would call the Hedera service to get actual balance
    // For now, we'll simulate getting the balance
    const treasuryAccountId =
      process.env.HEDERA_TREASURY_ACCOUNT_ID || "0.0.123456";

    // Simulate getting balance - in real implementation, use HederaService
    const currentBalance = await simulateGetTreasuryBalance(treasuryAccountId);

    const treasuryMetrics = {
      accountId: treasuryAccountId,
      currentBalance,
      threshold: alertThresholds.treasuryBalanceWarningHBAR,
      alertLevel:
        currentBalance < alertThresholds.treasuryBalanceCriticalHBAR
          ? ("critical" as const)
          : currentBalance < alertThresholds.treasuryBalanceWarningHBAR
          ? ("warning" as const)
          : ("normal" as const),
    };

    // Record metrics
    await rechargeMetricsService.recordTreasuryBalance(treasuryMetrics);

    // Check for alerts
    await alertingService.checkTreasuryBalance(treasuryMetrics);

    logger.info("Treasury balance check completed", {
      accountId: treasuryAccountId,
      balance: currentBalance,
      alertLevel: treasuryMetrics.alertLevel,
    });
  } catch (error) {
    logger.error("Failed to check treasury balance", { error });
  }
}

async function checkExchangeRateStaleness(): Promise<void> {
  try {
    // In a real implementation, this would check the exchange rate service
    // For now, we'll simulate getting exchange rate info
    const exchangeRateInfo = await simulateGetExchangeRateInfo();

    const exchangeRateMetrics = {
      source: exchangeRateInfo.source,
      rate: exchangeRateInfo.rate,
      lastUpdated: exchangeRateInfo.lastUpdated,
      stalenessMinutes: Math.floor(
        (Date.now() - exchangeRateInfo.lastUpdated.getTime()) / (1000 * 60)
      ),
      confidence: exchangeRateInfo.confidence,
    };

    // Record metrics
    await rechargeMetricsService.recordExchangeRateMetrics(exchangeRateMetrics);

    // Check for alerts
    await alertingService.checkExchangeRateStaleness(exchangeRateMetrics);

    logger.info("Exchange rate staleness check completed", {
      source: exchangeRateInfo.source,
      staleness: exchangeRateMetrics.stalenessMinutes,
      confidence: exchangeRateInfo.confidence,
    });
  } catch (error) {
    logger.error("Failed to check exchange rate staleness", { error });
  }
}

// Simulation functions - replace with actual service calls in real implementation
async function simulateGetTreasuryBalance(accountId: string): Promise<number> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return a simulated balance (in real implementation, call HederaService)
  return Math.random() * 2000; // Random balance between 0-2000 HBAR
}

async function simulateGetExchangeRateInfo(): Promise<{
  source: string;
  rate: number;
  lastUpdated: Date;
  confidence: "high" | "medium" | "low";
}> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return simulated exchange rate info
  const ageMinutes = Math.random() * 10; // Random age between 0-10 minutes
  return {
    source: "CoinGecko",
    rate: 0.000025, // Simulated XAF to HBAR rate
    lastUpdated: new Date(Date.now() - ageMinutes * 60 * 1000),
    confidence: ageMinutes < 2 ? "high" : ageMinutes < 5 ? "medium" : "low",
  };
}
