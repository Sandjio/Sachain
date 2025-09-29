import { CloudWatch, DynamoDB } from "aws-sdk";
import { structuredLogger } from "./structured-logger";
import { rechargeMetricsService } from "./recharge-metrics";

const logger = structuredLogger("RechargeDashboard");
const cloudwatch = new CloudWatch();
const dynamodb = new DynamoDB.DocumentClient();

export interface DashboardMetrics {
  overview: {
    totalTransactions24h: number;
    successfulTransactions24h: number;
    failedTransactions24h: number;
    successRate: number;
    totalVolume24h: {
      xaf: number;
      hbar: number;
    };
    averageProcessingTime: number;
  };
  realTime: {
    activeTransactions: number;
    queueDepth: number;
    currentTreasuryBalance: number;
    lastExchangeRate: {
      rate: number;
      source: string;
      lastUpdated: Date;
      staleness: number;
    };
  };
  performance: {
    orangeMoneyApi: {
      averageResponseTime: number;
      errorRate: number;
      availability: number;
    };
    hederaNetwork: {
      averageResponseTime: number;
      errorRate: number;
      averageNetworkFee: number;
    };
    systemHealth: {
      lambdaErrors: number;
      databaseErrors: number;
      eventBridgeErrors: number;
    };
  };
  trends: {
    hourlyVolume: Array<{
      hour: string;
      transactions: number;
      volume: number;
      successRate: number;
    }>;
    dailyTrends: Array<{
      date: string;
      transactions: number;
      volume: number;
      successRate: number;
      averageAmount: number;
    }>;
  };
}

export interface AlertSummary {
  active: Array<{
    id: string;
    type: "warning" | "critical" | "info";
    title: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;
  recent: Array<{
    id: string;
    type: "warning" | "critical" | "info";
    title: string;
    resolvedAt: Date;
    duration: number; // in minutes
  }>;
}

export class RechargeDashboardService {
  private tableName =
    process.env.RECHARGE_TRANSACTIONS_TABLE || "RechargeTransactions";
  private alertsTableName =
    process.env.RECHARGE_ALERTS_TABLE || "RechargeAlerts";

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const [overview, realTime, performance, trends] = await Promise.all([
        this.getOverviewMetrics(),
        this.getRealTimeMetrics(),
        this.getPerformanceMetrics(),
        this.getTrendMetrics(),
      ]);

      return {
        overview,
        realTime,
        performance,
        trends,
      };
    } catch (error) {
      logger.error("Failed to get dashboard metrics", { error });
      throw error;
    }
  }

  async getAlertSummary(): Promise<AlertSummary> {
    try {
      const [activeAlerts, recentAlerts] = await Promise.all([
        this.getActiveAlerts(),
        this.getRecentResolvedAlerts(),
      ]);

      return {
        active: activeAlerts,
        recent: recentAlerts,
      };
    } catch (error) {
      logger.error("Failed to get alert summary", { error });
      throw error;
    }
  }

  private async getOverviewMetrics(): Promise<DashboardMetrics["overview"]> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const [
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      volumeMetrics,
      processingTimeMetrics,
    ] = await Promise.all([
      this.getMetricSum("RechargeTransactionCount", startTime, endTime),
      this.getMetricSum("RechargeTransactionCount", startTime, endTime, [
        { Name: "Status", Value: "success" },
      ]),
      this.getMetricSum("RechargeTransactionCount", startTime, endTime, [
        { Name: "Status", Value: "failed" },
      ]),
      this.getVolumeMetrics(startTime, endTime),
      this.getAverageMetric("RechargeProcessingTime", startTime, endTime),
    ]);

    const successRate =
      totalTransactions > 0
        ? (successfulTransactions / totalTransactions) * 100
        : 0;

    return {
      totalTransactions24h: totalTransactions,
      successfulTransactions24h: successfulTransactions,
      failedTransactions24h: failedTransactions,
      successRate,
      totalVolume24h: volumeMetrics,
      averageProcessingTime: processingTimeMetrics,
    };
  }

  private async getRealTimeMetrics(): Promise<DashboardMetrics["realTime"]> {
    const [activeTransactions, queueDepth, treasuryBalance, exchangeRateInfo] =
      await Promise.all([
        this.getActiveTransactionCount(),
        this.getQueueDepth(),
        this.getCurrentTreasuryBalance(),
        this.getLatestExchangeRate(),
      ]);

    return {
      activeTransactions,
      queueDepth,
      currentTreasuryBalance: treasuryBalance,
      lastExchangeRate: exchangeRateInfo,
    };
  }

  private async getPerformanceMetrics(): Promise<
    DashboardMetrics["performance"]
  > {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

    const [
      omResponseTime,
      omErrorRate,
      hederaResponseTime,
      hederaErrorRate,
      hederaNetworkFee,
      systemErrors,
    ] = await Promise.all([
      this.getAverageMetric("OrangeMoneyAPIResponseTime", startTime, endTime),
      this.calculateErrorRate(
        "OrangeMoneyAPIErrors",
        "OrangeMoneyAPICallCount",
        startTime,
        endTime
      ),
      this.getAverageMetric("HederaOperationResponseTime", startTime, endTime),
      this.calculateErrorRate(
        "HederaOperationErrors",
        "HederaOperationCount",
        startTime,
        endTime
      ),
      this.getAverageMetric("HederaNetworkFees", startTime, endTime),
      this.getSystemErrors(startTime, endTime),
    ]);

    return {
      orangeMoneyApi: {
        averageResponseTime: omResponseTime,
        errorRate: omErrorRate,
        availability: 100 - omErrorRate, // Simplified availability calculation
      },
      hederaNetwork: {
        averageResponseTime: hederaResponseTime,
        errorRate: hederaErrorRate,
        averageNetworkFee: hederaNetworkFee,
      },
      systemHealth: systemErrors,
    };
  }

  private async getTrendMetrics(): Promise<DashboardMetrics["trends"]> {
    const [hourlyVolume, dailyTrends] = await Promise.all([
      this.getHourlyVolume(),
      this.getDailyTrends(),
    ]);

    return {
      hourlyVolume,
      dailyTrends,
    };
  }

  private async getMetricSum(
    metricName: string,
    startTime: Date,
    endTime: Date,
    dimensions: CloudWatch.Dimension[] = []
  ): Promise<number> {
    try {
      const params: CloudWatch.GetMetricStatisticsRequest = {
        Namespace: "Sachain/HBARRecharge",
        MetricName: metricName,
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ["Sum"],
        Dimensions: dimensions,
      };

      const result = await cloudwatch.getMetricStatistics(params).promise();
      return (
        result.Datapoints?.reduce((sum, point) => sum + (point.Sum || 0), 0) ||
        0
      );
    } catch (error) {
      logger.error("Failed to get metric sum", { error, metricName });
      return 0;
    }
  }

  private async getAverageMetric(
    metricName: string,
    startTime: Date,
    endTime: Date,
    dimensions: CloudWatch.Dimension[] = []
  ): Promise<number> {
    try {
      const params: CloudWatch.GetMetricStatisticsRequest = {
        Namespace: "Sachain/HBARRecharge",
        MetricName: metricName,
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ["Average"],
        Dimensions: dimensions,
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
      logger.error("Failed to get average metric", { error, metricName });
      return 0;
    }
  }

  private async getVolumeMetrics(
    startTime: Date,
    endTime: Date
  ): Promise<{ xaf: number; hbar: number }> {
    try {
      const [xafVolume, hbarVolume] = await Promise.all([
        this.getMetricSum("RechargeVolume", startTime, endTime, [
          { Name: "Currency", Value: "XAF" },
        ]),
        this.getMetricSum("HBARVolume", startTime, endTime, [
          { Name: "Currency", Value: "HBAR" },
        ]),
      ]);

      return { xaf: xafVolume, hbar: hbarVolume };
    } catch (error) {
      logger.error("Failed to get volume metrics", { error });
      return { xaf: 0, hbar: 0 };
    }
  }

  private async calculateErrorRate(
    errorMetric: string,
    totalMetric: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    try {
      const [errorCount, totalCount] = await Promise.all([
        this.getMetricSum(errorMetric, startTime, endTime),
        this.getMetricSum(totalMetric, startTime, endTime),
      ]);

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

  private async getActiveTransactionCount(): Promise<number> {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: "GSI1", // Status index
        KeyConditionExpression: "GSI1PK = :status",
        ExpressionAttributeValues: {
          ":status": "RECHARGE_STATUS#processing",
        },
        Select: "COUNT" as const,
      };

      const result = await dynamodb.query(params).promise();
      return result.Count || 0;
    } catch (error) {
      logger.error("Failed to get active transaction count", { error });
      return 0;
    }
  }

  private async getQueueDepth(): Promise<number> {
    // In a real implementation, this would check SQS queue depth or similar
    // For now, return a simulated value
    return Math.floor(Math.random() * 10);
  }

  private async getCurrentTreasuryBalance(): Promise<number> {
    // In a real implementation, this would call the Hedera service
    // For now, return a simulated value
    return 1500 + Math.random() * 500; // Simulated balance between 1500-2000 HBAR
  }

  private async getLatestExchangeRate(): Promise<
    DashboardMetrics["realTime"]["lastExchangeRate"]
  > {
    // In a real implementation, this would get the latest exchange rate from cache or service
    const lastUpdated = new Date(Date.now() - Math.random() * 10 * 60 * 1000); // Random time within last 10 minutes
    const staleness = Math.floor(
      (Date.now() - lastUpdated.getTime()) / (1000 * 60)
    );

    return {
      rate: 0.000025, // Simulated XAF to HBAR rate
      source: "CoinGecko",
      lastUpdated,
      staleness,
    };
  }

  private async getSystemErrors(
    startTime: Date,
    endTime: Date
  ): Promise<DashboardMetrics["performance"]["systemHealth"]> {
    // In a real implementation, this would aggregate various system error metrics
    return {
      lambdaErrors: Math.floor(Math.random() * 5),
      databaseErrors: Math.floor(Math.random() * 3),
      eventBridgeErrors: Math.floor(Math.random() * 2),
    };
  }

  private async getHourlyVolume(): Promise<
    DashboardMetrics["trends"]["hourlyVolume"]
  > {
    const hourlyData: DashboardMetrics["trends"]["hourlyVolume"] = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = hour.toISOString().substring(0, 13) + ":00:00Z";

      // In a real implementation, this would query actual metrics
      hourlyData.push({
        hour: hourStr,
        transactions: Math.floor(Math.random() * 50),
        volume: Math.floor(Math.random() * 100000),
        successRate: 95 + Math.random() * 5,
      });
    }

    return hourlyData;
  }

  private async getDailyTrends(): Promise<
    DashboardMetrics["trends"]["dailyTrends"]
  > {
    const dailyData: DashboardMetrics["trends"]["dailyTrends"] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().substring(0, 10);

      // In a real implementation, this would query actual metrics
      const transactions = Math.floor(Math.random() * 500);
      const volume = Math.floor(Math.random() * 1000000);

      dailyData.push({
        date: dateStr,
        transactions,
        volume,
        successRate: 95 + Math.random() * 5,
        averageAmount: transactions > 0 ? volume / transactions : 0,
      });
    }

    return dailyData;
  }

  private async getActiveAlerts(): Promise<AlertSummary["active"]> {
    try {
      const params = {
        TableName: this.alertsTableName,
        FilterExpression: "attribute_exists(#status) AND #status = :active",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":active": "active",
        },
      };

      const result = await dynamodb.scan(params).promise();

      return (result.Items || []).map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        timestamp: new Date(item.timestamp),
        acknowledged: item.acknowledged || false,
      }));
    } catch (error) {
      logger.error("Failed to get active alerts", { error });
      return [];
    }
  }

  private async getRecentResolvedAlerts(): Promise<AlertSummary["recent"]> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const params = {
        TableName: this.alertsTableName,
        FilterExpression:
          "attribute_exists(resolvedAt) AND resolvedAt > :oneDayAgo",
        ExpressionAttributeValues: {
          ":oneDayAgo": oneDayAgo.toISOString(),
        },
      };

      const result = await dynamodb.scan(params).promise();

      return (result.Items || []).map((item) => {
        const resolvedAt = new Date(item.resolvedAt);
        const createdAt = new Date(item.timestamp);
        const duration = Math.floor(
          (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60)
        );

        return {
          id: item.id,
          type: item.type,
          title: item.title,
          resolvedAt,
          duration,
        };
      });
    } catch (error) {
      logger.error("Failed to get recent resolved alerts", { error });
      return [];
    }
  }
}

export const rechargeDashboardService = new RechargeDashboardService();
