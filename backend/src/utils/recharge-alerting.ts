import { CloudWatch, SNS } from "aws-sdk";
import { StructuredLogger } from "./structured-logger";
import {
  rechargeMetricsService,
  TreasuryMetrics,
  ExchangeRateMetrics,
} from "./recharge-metrics";

const logger = StructuredLogger.getInstance("RechargeAlerting");
const cloudwatch = new CloudWatch();
const sns = new SNS();

export interface AlertThresholds {
  rechargeFailureRatePercent: number; // > 5%
  averageProcessingTimeMs: number; // > 30 seconds
  treasuryBalanceWarningHBAR: number; // < 1000 HBAR
  treasuryBalanceCriticalHBAR: number; // < 100 HBAR
  exchangeRateStaleMinutes: number; // > 5 minutes
  orangeMoneyErrorRatePercent: number; // > 1%
  hederaErrorRatePercent: number; // > 1%
  apiResponseTimeMs: number; // > 5 seconds
}

export interface AlertConfig {
  snsTopicArn: string;
  adminEmails: string[];
  slackWebhookUrl?: string;
  enabledAlerts: {
    rechargeFailures: boolean;
    performanceIssues: boolean;
    treasuryBalance: boolean;
    exchangeRateStale: boolean;
    systemErrors: boolean;
  };
}

export interface Alert {
  id: string;
  type: "warning" | "critical" | "info";
  title: string;
  message: string;
  timestamp: Date;
  metrics?: Record<string, any>;
  threshold?: number;
  currentValue?: number;
}

export class RechargeAlertingService {
  private thresholds: AlertThresholds;
  private config: AlertConfig;

  constructor(thresholds: AlertThresholds, config: AlertConfig) {
    this.thresholds = thresholds;
    this.config = config;
  }

  async checkRechargeFailureRate(): Promise<void> {
    if (!this.config.enabledAlerts.rechargeFailures) return;

    try {
      const successRate = await rechargeMetricsService.getRechargeSuccessRate(
        60
      );
      const failureRate = 100 - successRate;

      if (failureRate > this.thresholds.rechargeFailureRatePercent) {
        await this.sendAlert({
          id: `recharge-failure-rate-${Date.now()}`,
          type:
            failureRate > this.thresholds.rechargeFailureRatePercent * 2
              ? "critical"
              : "warning",
          title: "High Recharge Failure Rate Detected",
          message: `Recharge failure rate is ${failureRate.toFixed(
            2
          )}%, exceeding threshold of ${
            this.thresholds.rechargeFailureRatePercent
          }%`,
          timestamp: new Date(),
          currentValue: failureRate,
          threshold: this.thresholds.rechargeFailureRatePercent,
          metrics: { successRate, failureRate },
        });
      }
    } catch (error) {
      logger.error("Failed to check recharge failure rate", { error });
    }
  }

  async checkProcessingTime(): Promise<void> {
    if (!this.config.enabledAlerts.performanceIssues) return;

    try {
      const avgProcessingTime = await this.getAverageProcessingTime();

      if (avgProcessingTime > this.thresholds.averageProcessingTimeMs) {
        await this.sendAlert({
          id: `processing-time-${Date.now()}`,
          type:
            avgProcessingTime > this.thresholds.averageProcessingTimeMs * 2
              ? "critical"
              : "warning",
          title: "High Processing Time Detected",
          message: `Average processing time is ${avgProcessingTime}ms, exceeding threshold of ${this.thresholds.averageProcessingTimeMs}ms`,
          timestamp: new Date(),
          currentValue: avgProcessingTime,
          threshold: this.thresholds.averageProcessingTimeMs,
        });
      }
    } catch (error) {
      logger.error("Failed to check processing time", { error });
    }
  }

  async checkTreasuryBalance(treasuryMetrics: TreasuryMetrics): Promise<void> {
    if (!this.config.enabledAlerts.treasuryBalance) return;

    try {
      const { currentBalance } = treasuryMetrics;

      if (currentBalance < this.thresholds.treasuryBalanceCriticalHBAR) {
        await this.sendAlert({
          id: `treasury-critical-${Date.now()}`,
          type: "critical",
          title: "Critical Treasury Balance Alert",
          message: `Treasury balance is critically low: ${currentBalance} HBAR (threshold: ${this.thresholds.treasuryBalanceCriticalHBAR} HBAR). Immediate action required!`,
          timestamp: new Date(),
          currentValue: currentBalance,
          threshold: this.thresholds.treasuryBalanceCriticalHBAR,
          metrics: treasuryMetrics,
        });
      } else if (currentBalance < this.thresholds.treasuryBalanceWarningHBAR) {
        await this.sendAlert({
          id: `treasury-warning-${Date.now()}`,
          type: "warning",
          title: "Low Treasury Balance Warning",
          message: `Treasury balance is low: ${currentBalance} HBAR (threshold: ${this.thresholds.treasuryBalanceWarningHBAR} HBAR). Consider replenishing soon.`,
          timestamp: new Date(),
          currentValue: currentBalance,
          threshold: this.thresholds.treasuryBalanceWarningHBAR,
          metrics: treasuryMetrics,
        });
      }
    } catch (error) {
      logger.error("Failed to check treasury balance", { error });
    }
  }

  async checkExchangeRateStaleness(
    exchangeRateMetrics: ExchangeRateMetrics
  ): Promise<void> {
    if (!this.config.enabledAlerts.exchangeRateStale) return;

    try {
      const { stalenessMinutes } = exchangeRateMetrics;

      if (stalenessMinutes > this.thresholds.exchangeRateStaleMinutes) {
        await this.sendAlert({
          id: `exchange-rate-stale-${Date.now()}`,
          type:
            stalenessMinutes > this.thresholds.exchangeRateStaleMinutes * 2
              ? "critical"
              : "warning",
          title: "Stale Exchange Rate Detected",
          message: `Exchange rate from ${exchangeRateMetrics.source} is ${stalenessMinutes} minutes old, exceeding threshold of ${this.thresholds.exchangeRateStaleMinutes} minutes`,
          timestamp: new Date(),
          currentValue: stalenessMinutes,
          threshold: this.thresholds.exchangeRateStaleMinutes,
          metrics: exchangeRateMetrics,
        });
      }
    } catch (error) {
      logger.error("Failed to check exchange rate staleness", { error });
    }
  }

  async checkSystemErrors(): Promise<void> {
    if (!this.config.enabledAlerts.systemErrors) return;

    try {
      // Check Orange Money error rate
      const omErrorRate = await this.getErrorRate(
        "OrangeMoneyAPIErrors",
        "OrangeMoneyAPICallCount"
      );
      if (omErrorRate > this.thresholds.orangeMoneyErrorRatePercent) {
        await this.sendAlert({
          id: `om-error-rate-${Date.now()}`,
          type: "warning",
          title: "High Orange Money Error Rate",
          message: `Orange Money API error rate is ${omErrorRate.toFixed(
            2
          )}%, exceeding threshold of ${
            this.thresholds.orangeMoneyErrorRatePercent
          }%`,
          timestamp: new Date(),
          currentValue: omErrorRate,
          threshold: this.thresholds.orangeMoneyErrorRatePercent,
        });
      }

      // Check Hedera error rate
      const hederaErrorRate = await this.getErrorRate(
        "HederaOperationErrors",
        "HederaOperationCount"
      );
      if (hederaErrorRate > this.thresholds.hederaErrorRatePercent) {
        await this.sendAlert({
          id: `hedera-error-rate-${Date.now()}`,
          type: "warning",
          title: "High Hedera Operation Error Rate",
          message: `Hedera operation error rate is ${hederaErrorRate.toFixed(
            2
          )}%, exceeding threshold of ${
            this.thresholds.hederaErrorRatePercent
          }%`,
          timestamp: new Date(),
          currentValue: hederaErrorRate,
          threshold: this.thresholds.hederaErrorRatePercent,
        });
      }
    } catch (error) {
      logger.error("Failed to check system errors", { error });
    }
  }

  private async sendAlert(alert: Alert): Promise<void> {
    try {
      const message = this.formatAlertMessage(alert);

      // Send SNS notification
      await sns
        .publish({
          TopicArn: this.config.snsTopicArn,
          Subject: `[${alert.type.toUpperCase()}] ${alert.title}`,
          Message: message,
        })
        .promise();

      // Send to Slack if configured
      if (this.config.slackWebhookUrl) {
        await this.sendSlackAlert(alert);
      }

      logger.info("Alert sent successfully", {
        alertId: alert.id,
        type: alert.type,
        title: alert.title,
      });
    } catch (error) {
      logger.error("Failed to send alert", { error, alert });
    }
  }

  private formatAlertMessage(alert: Alert): string {
    let message = `Alert: ${alert.title}\n\n`;
    message += `Type: ${alert.type.toUpperCase()}\n`;
    message += `Time: ${alert.timestamp.toISOString()}\n`;
    message += `Message: ${alert.message}\n\n`;

    if (alert.currentValue !== undefined && alert.threshold !== undefined) {
      message += `Current Value: ${alert.currentValue}\n`;
      message += `Threshold: ${alert.threshold}\n\n`;
    }

    if (alert.metrics) {
      message += `Additional Metrics:\n`;
      Object.entries(alert.metrics).forEach(([key, value]) => {
        message += `  ${key}: ${JSON.stringify(value)}\n`;
      });
    }

    return message;
  }

  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.config.slackWebhookUrl) return;

    const color =
      alert.type === "critical"
        ? "danger"
        : alert.type === "warning"
        ? "warning"
        : "good";

    const payload = {
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: [
            {
              title: "Type",
              value: alert.type.toUpperCase(),
              short: true,
            },
            {
              title: "Time",
              value: alert.timestamp.toISOString(),
              short: true,
            },
          ],
          footer: "Sachain HBAR Recharge System",
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    // Note: In a real implementation, you would use a proper HTTP client
    // This is a placeholder for the Slack webhook call
    logger.info("Slack alert would be sent", { payload });
  }

  private async getAverageProcessingTime(): Promise<number> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

      const params: CloudWatch.GetMetricStatisticsInput = {
        Namespace: "Sachain/HBARRecharge",
        MetricName: "RechargeProcessingTime",
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ["Average"],
      };

      const result = await cloudwatch.getMetricStatistics(params).promise();
      const datapoints = result.Datapoints || [];

      if (datapoints.length === 0) return 0;

      const sum = datapoints.reduce(
        (acc, point) => acc + (point.Average || 0),
        0
      );
      return sum / datapoints.length;
    } catch (error) {
      logger.error("Failed to get average processing time", { error });
      return 0;
    }
  }

  private async getErrorRate(
    errorMetric: string,
    totalMetric: string
  ): Promise<number> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

      const [errorResult, totalResult] = await Promise.all([
        this.getMetricSum(errorMetric, startTime, endTime),
        this.getMetricSum(totalMetric, startTime, endTime),
      ]);

      const errorCount = errorResult;
      const totalCount = totalResult;

      return totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
    } catch (error) {
      logger.error("Failed to calculate error rate", {
        error,
        errorMetric,
        totalMetric,
      });
      return 0;
    }
  }

  private async getMetricSum(
    metricName: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    const params: CloudWatch.GetMetricStatisticsInput = {
      Namespace: "Sachain/HBARRecharge",
      MetricName: metricName,
      StartTime: startTime,
      EndTime: endTime,
      Period: 300,
      Statistics: ["Sum"],
    };

    const result = await cloudwatch.getMetricStatistics(params).promise();
    const datapoints = result.Datapoints || [];

    return datapoints.reduce((sum, point) => sum + (point.Sum || 0), 0);
  }
}

// Default thresholds
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  rechargeFailureRatePercent: 5,
  averageProcessingTimeMs: 30000, // 30 seconds
  treasuryBalanceWarningHBAR: 1000,
  treasuryBalanceCriticalHBAR: 100,
  exchangeRateStaleMinutes: 5,
  orangeMoneyErrorRatePercent: 1,
  hederaErrorRatePercent: 1,
  apiResponseTimeMs: 5000, // 5 seconds
};
