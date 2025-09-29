import { CloudWatch } from "aws-sdk";
import { StructuredLogger } from "./structured-logger";

const logger = StructuredLogger.getInstance("RechargeMetrics");
const cloudwatch = new CloudWatch();

export interface RechargeMetrics {
  transactionId: string;
  userId: string;
  xafAmount: number;
  hbarAmount?: number;
  processingTimeMs: number;
  status: "success" | "failed" | "timeout";
  errorType?: string;
  stage: "payment" | "conversion" | "transfer" | "notification";
}

export interface OrangeMoneyMetrics {
  transactionId: string;
  responseTimeMs: number;
  status: "success" | "failed" | "timeout";
  errorCode?: string;
  amount: number;
}

export interface HederaMetrics {
  transactionId: string;
  operationType: "transfer" | "account_validation" | "balance_check";
  responseTimeMs: number;
  status: "success" | "failed" | "timeout";
  networkFee?: number;
  errorType?: string;
}

export interface TreasuryMetrics {
  accountId: string;
  currentBalance: number;
  threshold: number;
  alertLevel: "normal" | "warning" | "critical";
}

export interface ExchangeRateMetrics {
  source: string;
  rate: number;
  lastUpdated: Date;
  stalenessMinutes: number;
  confidence: "high" | "medium" | "low";
}

export class RechargeMetricsService {
  private namespace = "Sachain/HBARRecharge";

  async recordRechargeTransaction(metrics: RechargeMetrics): Promise<void> {
    try {
      const metricData: any[] = [
        {
          MetricName: "RechargeTransactionCount",
          Value: 1,
          Unit: "Count",
          Dimensions: [
            { Name: "Status", Value: metrics.status },
            { Name: "Stage", Value: metrics.stage },
          ],
        },
        {
          MetricName: "RechargeProcessingTime",
          Value: metrics.processingTimeMs,
          Unit: "Milliseconds",
          Dimensions: [
            { Name: "Status", Value: metrics.status },
            { Name: "Stage", Value: metrics.stage },
          ],
        },
        {
          MetricName: "RechargeVolume",
          Value: metrics.xafAmount,
          Unit: "Count",
          Dimensions: [{ Name: "Currency", Value: "XAF" }],
        },
      ];

      if (metrics.hbarAmount) {
        metricData.push({
          MetricName: "HBARVolume",
          Value: metrics.hbarAmount,
          Unit: "Count",
          Dimensions: [{ Name: "Currency", Value: "HBAR" }],
        });
      }

      if (metrics.errorType) {
        metricData.push({
          MetricName: "RechargeErrors",
          Value: 1,
          Unit: "Count",
          Dimensions: [
            { Name: "ErrorType", Value: metrics.errorType },
            { Name: "Stage", Value: metrics.stage },
          ],
        });
      }

      await this.putMetrics(metricData);

      logger.info("Recharge metrics recorded", {
        transactionId: metrics.transactionId,
        status: metrics.status,
        processingTime: metrics.processingTimeMs,
      });
    } catch (error) {
      logger.error("Failed to record recharge metrics", { error, metrics });
    }
  }

  async recordOrangeMoneyMetrics(metrics: OrangeMoneyMetrics): Promise<void> {
    try {
      const metricData: any[] = [
        {
          MetricName: "OrangeMoneyAPIResponseTime",
          Value: metrics.responseTimeMs,
          Unit: "Milliseconds",
          Dimensions: [{ Name: "Status", Value: metrics.status }],
        },
        {
          MetricName: "OrangeMoneyAPICallCount",
          Value: 1,
          Unit: "Count",
          Dimensions: [{ Name: "Status", Value: metrics.status }],
        },
      ];

      if (metrics.errorCode) {
        metricData.push({
          MetricName: "OrangeMoneyAPIErrors",
          Value: 1,
          Unit: "Count",
          Dimensions: [{ Name: "ErrorCode", Value: metrics.errorCode }],
        });
      }

      await this.putMetrics(metricData);

      logger.info("Orange Money metrics recorded", {
        transactionId: metrics.transactionId,
        responseTime: metrics.responseTimeMs,
        status: metrics.status,
      });
    } catch (error) {
      logger.error("Failed to record Orange Money metrics", { error, metrics });
    }
  }

  async recordHederaMetrics(metrics: HederaMetrics): Promise<void> {
    try {
      const metricData: any[] = [
        {
          MetricName: "HederaOperationResponseTime",
          Value: metrics.responseTimeMs,
          Unit: "Milliseconds",
          Dimensions: [
            { Name: "OperationType", Value: metrics.operationType },
            { Name: "Status", Value: metrics.status },
          ],
        },
        {
          MetricName: "HederaOperationCount",
          Value: 1,
          Unit: "Count",
          Dimensions: [
            { Name: "OperationType", Value: metrics.operationType },
            { Name: "Status", Value: metrics.status },
          ],
        },
      ];

      if (metrics.networkFee) {
        metricData.push({
          MetricName: "HederaNetworkFees",
          Value: metrics.networkFee,
          Unit: "Count",
          Dimensions: [{ Name: "OperationType", Value: metrics.operationType }],
        });
      }

      if (metrics.errorType) {
        metricData.push({
          MetricName: "HederaOperationErrors",
          Value: 1,
          Unit: "Count",
          Dimensions: [
            { Name: "ErrorType", Value: metrics.errorType },
            { Name: "OperationType", Value: metrics.operationType },
          ],
        });
      }

      await this.putMetrics(metricData);

      logger.info("Hedera metrics recorded", {
        transactionId: metrics.transactionId,
        operationType: metrics.operationType,
        responseTime: metrics.responseTimeMs,
        status: metrics.status,
      });
    } catch (error) {
      logger.error("Failed to record Hedera metrics", { error, metrics });
    }
  }

  async recordTreasuryBalance(metrics: TreasuryMetrics): Promise<void> {
    try {
      const metricData: any[] = [
        {
          MetricName: "TreasuryBalance",
          Value: metrics.currentBalance,
          Unit: "Count",
          Dimensions: [
            { Name: "AccountId", Value: metrics.accountId },
            { Name: "AlertLevel", Value: metrics.alertLevel },
          ],
        },
        {
          MetricName: "TreasuryBalanceRatio",
          Value: metrics.currentBalance / metrics.threshold,
          Unit: "None",
          Dimensions: [{ Name: "AccountId", Value: metrics.accountId }],
        },
      ];

      await this.putMetrics(metricData);

      logger.info("Treasury balance metrics recorded", {
        accountId: metrics.accountId,
        balance: metrics.currentBalance,
        alertLevel: metrics.alertLevel,
      });
    } catch (error) {
      logger.error("Failed to record treasury balance metrics", {
        error,
        metrics,
      });
    }
  }

  async recordExchangeRateMetrics(metrics: ExchangeRateMetrics): Promise<void> {
    try {
      const metricData: any[] = [
        {
          MetricName: "ExchangeRate",
          Value: metrics.rate,
          Unit: "None",
          Dimensions: [
            { Name: "Source", Value: metrics.source },
            { Name: "Confidence", Value: metrics.confidence },
          ],
        },
        {
          MetricName: "ExchangeRateStaleness",
          Value: metrics.stalenessMinutes,
          Unit: "Count",
          Dimensions: [{ Name: "Source", Value: metrics.source }],
        },
      ];

      await this.putMetrics(metricData);

      logger.info("Exchange rate metrics recorded", {
        source: metrics.source,
        rate: metrics.rate,
        staleness: metrics.stalenessMinutes,
      });
    } catch (error) {
      logger.error("Failed to record exchange rate metrics", {
        error,
        metrics,
      });
    }
  }

  private async putMetrics(metricData: any[]): Promise<void> {
    const params: CloudWatch.PutMetricDataInput = {
      Namespace: this.namespace,
      MetricData: metricData.map((metric) => ({
        ...metric,
        Timestamp: new Date(),
      })),
    };

    await cloudwatch.putMetricData(params).promise();
  }

  // Utility methods for calculating success rates
  async getRechargeSuccessRate(timeRangeMinutes: number = 60): Promise<number> {
    try {
      const endTime = new Date();
      const startTime = new Date(
        endTime.getTime() - timeRangeMinutes * 60 * 1000
      );

      const successMetrics = await this.getMetricStatistics(
        "RechargeTransactionCount",
        startTime,
        endTime,
        [{ Name: "Status", Value: "success" }]
      );

      const totalMetrics = await this.getMetricStatistics(
        "RechargeTransactionCount",
        startTime,
        endTime,
        []
      );

      const successCount =
        successMetrics.Datapoints?.reduce(
          (sum, point) => sum + (point.Sum || 0),
          0
        ) || 0;
      const totalCount =
        totalMetrics.Datapoints?.reduce(
          (sum, point) => sum + (point.Sum || 0),
          0
        ) || 0;

      return totalCount > 0 ? (successCount / totalCount) * 100 : 0;
    } catch (error) {
      logger.error("Failed to calculate success rate", { error });
      return 0;
    }
  }

  private async getMetricStatistics(
    metricName: string,
    startTime: Date,
    endTime: Date,
    dimensions: CloudWatch.Dimension[]
  ): Promise<CloudWatch.GetMetricStatisticsOutput> {
    const params: CloudWatch.GetMetricStatisticsInput = {
      Namespace: this.namespace,
      MetricName: metricName,
      StartTime: startTime,
      EndTime: endTime,
      Period: 300, // 5 minutes
      Statistics: ["Sum"],
      Dimensions: dimensions,
    };

    return cloudwatch.getMetricStatistics(params).promise();
  }
}

export const rechargeMetricsService = new RechargeMetricsService();
