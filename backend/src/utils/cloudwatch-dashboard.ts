import { CloudWatch } from "aws-sdk";
import { StructuredLogger } from "./structured-logger";

const logger = StructuredLogger.getInstance("CloudWatchDashboard");
const cloudwatch = new CloudWatch();

export interface DashboardWidget {
  type: "metric" | "log" | "number";
  x: number;
  y: number;
  width: number;
  height: number;
  properties: any;
}

export interface DashboardConfig {
  name: string;
  widgets: DashboardWidget[];
}

export class CloudWatchDashboardService {
  private dashboardName = "HBAR-Recharge-System";

  async createRechargeDashboard(): Promise<void> {
    try {
      const dashboardBody = this.buildDashboardConfiguration();

      await cloudwatch
        .putDashboard({
          DashboardName: this.dashboardName,
          DashboardBody: JSON.stringify(dashboardBody),
        })
        .promise();

      logger.info("CloudWatch dashboard created successfully", {
        dashboardName: this.dashboardName,
      });
    } catch (error) {
      logger.error("Failed to create CloudWatch dashboard", { error });
      throw error;
    }
  }

  async updateDashboard(config: DashboardConfig): Promise<void> {
    try {
      await cloudwatch
        .putDashboard({
          DashboardName: config.name,
          DashboardBody: JSON.stringify(config),
        })
        .promise();

      logger.info("CloudWatch dashboard updated successfully", {
        dashboardName: config.name,
      });
    } catch (error) {
      logger.error("Failed to update CloudWatch dashboard", { error });
      throw error;
    }
  }

  async deleteDashboard(dashboardName: string): Promise<void> {
    try {
      await cloudwatch
        .deleteDashboards({
          DashboardNames: [dashboardName],
        })
        .promise();

      logger.info("CloudWatch dashboard deleted successfully", {
        dashboardName,
      });
    } catch (error) {
      logger.error("Failed to delete CloudWatch dashboard", { error });
      throw error;
    }
  }

  private buildDashboardConfiguration(): any {
    return {
      widgets: [
        // Row 1: Overview Metrics
        this.createRechargeSuccessRateWidget(0, 0),
        this.createTransactionVolumeWidget(6, 0),
        this.createProcessingTimeWidget(12, 0),
        this.createTreasuryBalanceWidget(18, 0),

        // Row 2: Performance Metrics
        this.createOrangeMoneyPerformanceWidget(0, 6),
        this.createHederaPerformanceWidget(6, 6),
        this.createErrorRateWidget(12, 6),
        this.createExchangeRateWidget(18, 6),

        // Row 3: System Health
        this.createSystemHealthWidget(0, 12),
        this.createActiveTransactionsWidget(6, 12),
        this.createAlertSummaryWidget(12, 12),

        // Row 4: Trends
        this.createHourlyTrendsWidget(0, 18),
        this.createDailyTrendsWidget(12, 18),
      ],
    };
  }

  private createRechargeSuccessRateWidget(
    x: number,
    y: number
  ): DashboardWidget {
    return {
      type: "metric",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        metrics: [
          [
            "Sachain/HBARRecharge",
            "RechargeTransactionCount",
            "Status",
            "success",
          ],
          [".", ".", ".", "failed"],
        ],
        view: "timeSeries",
        stacked: false,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Recharge Success Rate",
        period: 300,
        stat: "Sum",
        yAxis: {
          left: {
            min: 0,
          },
        },
      },
    };
  }

  private createTransactionVolumeWidget(x: number, y: number): DashboardWidget {
    return {
      type: "metric",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        metrics: [
          ["Sachain/HBARRecharge", "RechargeVolume", "Currency", "XAF"],
          [".", "HBARVolume", ".", "HBAR"],
        ],
        view: "timeSeries",
        stacked: false,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Transaction Volume",
        period: 300,
        stat: "Sum",
        yAxis: {
          left: {
            min: 0,
          },
        },
      },
    };
  }

  private createProcessingTimeWidget(x: number, y: number): DashboardWidget {
    return {
      type: "metric",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        metrics: [
          [
            "Sachain/HBARRecharge",
            "RechargeProcessingTime",
            "Status",
            "success",
          ],
          [".", ".", ".", "failed"],
        ],
        view: "timeSeries",
        stacked: false,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Average Processing Time",
        period: 300,
        stat: "Average",
        yAxis: {
          left: {
            min: 0,
            label: "Milliseconds",
          },
        },
      },
    };
  }

  private createTreasuryBalanceWidget(x: number, y: number): DashboardWidget {
    return {
      type: "metric",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        metrics: [["Sachain/HBARRecharge", "TreasuryBalance"]],
        view: "timeSeries",
        stacked: false,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Treasury Balance (HBAR)",
        period: 300,
        stat: "Average",
        yAxis: {
          left: {
            min: 0,
            label: "HBAR",
          },
        },
        annotations: {
          horizontal: [
            {
              label: "Critical Threshold",
              value: 100,
              fill: "above",
            },
            {
              label: "Warning Threshold",
              value: 1000,
              fill: "above",
            },
          ],
        },
      },
    };
  }

  private createOrangeMoneyPerformanceWidget(
    x: number,
    y: number
  ): DashboardWidget {
    return {
      type: "metric",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        metrics: [
          [
            "Sachain/HBARRecharge",
            "OrangeMoneyAPIResponseTime",
            "Status",
            "success",
          ],
          [".", ".", ".", "failed"],
          [".", "OrangeMoneyAPICallCount", ".", "success"],
          [".", ".", ".", "failed"],
        ],
        view: "timeSeries",
        stacked: false,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Orange Money API Performance",
        period: 300,
        stat: "Average",
        yAxis: {
          left: {
            min: 0,
            label: "Response Time (ms)",
          },
          right: {
            min: 0,
            label: "Call Count",
          },
        },
      },
    };
  }

  private createHederaPerformanceWidget(x: number, y: number): DashboardWidget {
    return {
      type: "metric",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        metrics: [
          [
            "Sachain/HBARRecharge",
            "HederaOperationResponseTime",
            "OperationType",
            "transfer",
          ],
          [".", ".", ".", "account_validation"],
          [".", ".", ".", "balance_check"],
          [".", "HederaNetworkFees", ".", "transfer"],
        ],
        view: "timeSeries",
        stacked: false,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Hedera Network Performance",
        period: 300,
        stat: "Average",
        yAxis: {
          left: {
            min: 0,
            label: "Response Time (ms)",
          },
          right: {
            min: 0,
            label: "Network Fees (HBAR)",
          },
        },
      },
    };
  }

  private createErrorRateWidget(x: number, y: number): DashboardWidget {
    return {
      type: "metric",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        metrics: [
          ["Sachain/HBARRecharge", "OrangeMoneyAPIErrors"],
          [".", "HederaOperationErrors"],
          [".", "RechargeErrors"],
        ],
        view: "timeSeries",
        stacked: false,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Error Rates",
        period: 300,
        stat: "Sum",
        yAxis: {
          left: {
            min: 0,
            label: "Error Count",
          },
        },
      },
    };
  }

  private createExchangeRateWidget(x: number, y: number): DashboardWidget {
    return {
      type: "metric",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        metrics: [
          ["Sachain/HBARRecharge", "ExchangeRate", "Source", "CoinGecko"],
          [".", "ExchangeRateStaleness", ".", "."],
        ],
        view: "timeSeries",
        stacked: false,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Exchange Rate & Staleness",
        period: 300,
        stat: "Average",
        yAxis: {
          left: {
            min: 0,
            label: "XAF to HBAR Rate",
          },
          right: {
            min: 0,
            label: "Staleness (minutes)",
          },
        },
      },
    };
  }

  private createSystemHealthWidget(x: number, y: number): DashboardWidget {
    return {
      type: "number",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        metrics: [
          ["AWS/Lambda", "Errors", "FunctionName", "hbar-recharge-handler"],
          [".", ".", ".", "hbar-conversion-handler"],
          [".", ".", ".", "recharge-monitoring"],
          ["AWS/DynamoDB", "SystemErrors", "TableName", "RechargeTransactions"],
        ],
        view: "singleValue",
        region: process.env.AWS_REGION || "us-east-1",
        title: "System Health",
        period: 300,
        stat: "Sum",
      },
    };
  }

  private createActiveTransactionsWidget(
    x: number,
    y: number
  ): DashboardWidget {
    return {
      type: "number",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        metrics: [
          [
            "Sachain/HBARRecharge",
            "RechargeTransactionCount",
            "Status",
            "processing",
          ],
        ],
        view: "singleValue",
        region: process.env.AWS_REGION || "us-east-1",
        title: "Active Transactions",
        period: 300,
        stat: "Sum",
      },
    };
  }

  private createAlertSummaryWidget(x: number, y: number): DashboardWidget {
    return {
      type: "log",
      x,
      y,
      width: 6,
      height: 6,
      properties: {
        query: `SOURCE '/aws/lambda/recharge-monitoring' | fields @timestamp, @message
| filter @message like /Alert/
| sort @timestamp desc
| limit 20`,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Recent Alerts",
        view: "table",
      },
    };
  }

  private createHourlyTrendsWidget(x: number, y: number): DashboardWidget {
    return {
      type: "metric",
      x,
      y,
      width: 12,
      height: 6,
      properties: {
        metrics: [
          [
            "Sachain/HBARRecharge",
            "RechargeTransactionCount",
            "Status",
            "success",
          ],
          [".", ".", ".", "failed"],
          [".", "RechargeVolume", "Currency", "XAF"],
        ],
        view: "timeSeries",
        stacked: false,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Hourly Transaction Trends",
        period: 3600, // 1 hour
        stat: "Sum",
        yAxis: {
          left: {
            min: 0,
          },
        },
      },
    };
  }

  private createDailyTrendsWidget(x: number, y: number): DashboardWidget {
    return {
      type: "metric",
      x,
      y,
      width: 12,
      height: 6,
      properties: {
        metrics: [
          [
            "Sachain/HBARRecharge",
            "RechargeTransactionCount",
            "Status",
            "success",
          ],
          [".", ".", ".", "failed"],
          [".", "RechargeVolume", "Currency", "XAF"],
          [".", "HBARVolume", ".", "HBAR"],
        ],
        view: "timeSeries",
        stacked: false,
        region: process.env.AWS_REGION || "us-east-1",
        title: "Daily Transaction Trends",
        period: 86400, // 1 day
        stat: "Sum",
        yAxis: {
          left: {
            min: 0,
          },
        },
      },
    };
  }
}

export const cloudWatchDashboardService = new CloudWatchDashboardService();
