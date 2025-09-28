import { CloudWatch } from "aws-sdk";
import { StructuredLogger } from "./structured-logger";
import { DEFAULT_ALERT_THRESHOLDS, AlertThresholds } from "./recharge-alerting";

const logger = StructuredLogger.getInstance("CloudWatchAlarms");
const cloudwatch = new CloudWatch();

export interface AlarmConfig {
  alarmName: string;
  metricName: string;
  namespace: string;
  statistic: "Average" | "Sum" | "Maximum" | "Minimum";
  threshold: number;
  comparisonOperator:
    | "GreaterThanThreshold"
    | "LessThanThreshold"
    | "GreaterThanOrEqualToThreshold"
    | "LessThanOrEqualToThreshold";
  evaluationPeriods: number;
  period: number;
  treatMissingData?: "breaching" | "notBreaching" | "ignore" | "missing";
  dimensions?: CloudWatch.Dimension[];
  alarmActions?: string[];
  okActions?: string[];
  alarmDescription?: string;
}

export class CloudWatchAlarmsService {
  private namespace = "Sachain/HBARRecharge";
  private snsTopicArn: string;

  constructor(snsTopicArn: string) {
    this.snsTopicArn = snsTopicArn;
  }

  async createAllRechargeAlarms(
    thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS
  ): Promise<void> {
    try {
      const alarmConfigs = this.buildAlarmConfigurations(thresholds);

      // Create alarms in parallel
      await Promise.all(alarmConfigs.map((config) => this.createAlarm(config)));

      logger.info("All recharge system alarms created successfully", {
        alarmCount: alarmConfigs.length,
      });
    } catch (error) {
      logger.error("Failed to create recharge system alarms", { error });
      throw error;
    }
  }

  async createAlarm(config: AlarmConfig): Promise<void> {
    try {
      const params: CloudWatch.PutMetricAlarmInput = {
        AlarmName: config.alarmName,
        AlarmDescription:
          config.alarmDescription || `Alarm for ${config.metricName}`,
        MetricName: config.metricName,
        Namespace: config.namespace,
        Statistic: config.statistic,
        Threshold: config.threshold,
        ComparisonOperator: config.comparisonOperator,
        EvaluationPeriods: config.evaluationPeriods,
        Period: config.period,
        TreatMissingData: config.treatMissingData || "notBreaching",
        Dimensions: config.dimensions || [],
        AlarmActions: config.alarmActions || [this.snsTopicArn],
        OKActions: config.okActions || [this.snsTopicArn],
      };

      await cloudwatch.putMetricAlarm(params).promise();

      logger.info("CloudWatch alarm created successfully", {
        alarmName: config.alarmName,
        metricName: config.metricName,
        threshold: config.threshold,
      });
    } catch (error) {
      logger.error("Failed to create CloudWatch alarm", {
        error,
        alarmName: config.alarmName,
      });
      throw error;
    }
  }

  async deleteAlarm(alarmName: string): Promise<void> {
    try {
      await cloudwatch
        .deleteAlarms({
          AlarmNames: [alarmName],
        })
        .promise();

      logger.info("CloudWatch alarm deleted successfully", { alarmName });
    } catch (error) {
      logger.error("Failed to delete CloudWatch alarm", { error, alarmName });
      throw error;
    }
  }

  async deleteAllRechargeAlarms(): Promise<void> {
    try {
      const alarmNames = this.getAllRechargeAlarmNames();

      await cloudwatch
        .deleteAlarms({
          AlarmNames: alarmNames,
        })
        .promise();

      logger.info("All recharge system alarms deleted successfully", {
        alarmCount: alarmNames.length,
      });
    } catch (error) {
      logger.error("Failed to delete recharge system alarms", { error });
      throw error;
    }
  }

  async getAlarmState(alarmName: string): Promise<string> {
    try {
      const result = await cloudwatch
        .describeAlarms({
          AlarmNames: [alarmName],
        })
        .promise();

      if (result.MetricAlarms && result.MetricAlarms.length > 0) {
        return result.MetricAlarms[0].StateValue || "INSUFFICIENT_DATA";
      }

      throw new Error(`Alarm ${alarmName} not found`);
    } catch (error) {
      logger.error("Failed to get alarm state", { error, alarmName });
      throw error;
    }
  }

  private buildAlarmConfigurations(thresholds: AlertThresholds): AlarmConfig[] {
    return [
      // Recharge failure rate alarm
      {
        alarmName: "HBAR-Recharge-High-Failure-Rate",
        metricName: "RechargeTransactionCount",
        namespace: this.namespace,
        statistic: "Sum",
        threshold: thresholds.rechargeFailureRatePercent,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 2,
        period: 300, // 5 minutes
        dimensions: [{ Name: "Status", Value: "failed" }],
        alarmDescription: `Recharge failure rate exceeds ${thresholds.rechargeFailureRatePercent}%`,
        treatMissingData: "notBreaching",
      },

      // Processing time alarm
      {
        alarmName: "HBAR-Recharge-High-Processing-Time",
        metricName: "RechargeProcessingTime",
        namespace: this.namespace,
        statistic: "Average",
        threshold: thresholds.averageProcessingTimeMs,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 3,
        period: 300, // 5 minutes
        alarmDescription: `Average processing time exceeds ${thresholds.averageProcessingTimeMs}ms`,
        treatMissingData: "notBreaching",
      },

      // Treasury balance warning alarm
      {
        alarmName: "HBAR-Treasury-Balance-Warning",
        metricName: "TreasuryBalance",
        namespace: this.namespace,
        statistic: "Average",
        threshold: thresholds.treasuryBalanceWarningHBAR,
        comparisonOperator: "LessThanThreshold",
        evaluationPeriods: 1,
        period: 300, // 5 minutes
        alarmDescription: `Treasury balance below warning threshold of ${thresholds.treasuryBalanceWarningHBAR} HBAR`,
        treatMissingData: "breaching",
      },

      // Treasury balance critical alarm
      {
        alarmName: "HBAR-Treasury-Balance-Critical",
        metricName: "TreasuryBalance",
        namespace: this.namespace,
        statistic: "Average",
        threshold: thresholds.treasuryBalanceCriticalHBAR,
        comparisonOperator: "LessThanThreshold",
        evaluationPeriods: 1,
        period: 300, // 5 minutes
        alarmDescription: `Treasury balance below critical threshold of ${thresholds.treasuryBalanceCriticalHBAR} HBAR`,
        treatMissingData: "breaching",
      },

      // Exchange rate staleness alarm
      {
        alarmName: "HBAR-Exchange-Rate-Stale",
        metricName: "ExchangeRateStaleness",
        namespace: this.namespace,
        statistic: "Average",
        threshold: thresholds.exchangeRateStaleMinutes,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 2,
        period: 300, // 5 minutes
        alarmDescription: `Exchange rate staleness exceeds ${thresholds.exchangeRateStaleMinutes} minutes`,
        treatMissingData: "breaching",
      },

      // Orange Money API error rate alarm
      {
        alarmName: "HBAR-Orange-Money-High-Error-Rate",
        metricName: "OrangeMoneyAPIErrors",
        namespace: this.namespace,
        statistic: "Sum",
        threshold: 5, // Absolute count threshold
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 2,
        period: 300, // 5 minutes
        alarmDescription: `Orange Money API error count exceeds threshold`,
        treatMissingData: "notBreaching",
      },

      // Orange Money API response time alarm
      {
        alarmName: "HBAR-Orange-Money-High-Response-Time",
        metricName: "OrangeMoneyAPIResponseTime",
        namespace: this.namespace,
        statistic: "Average",
        threshold: thresholds.apiResponseTimeMs,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 3,
        period: 300, // 5 minutes
        alarmDescription: `Orange Money API response time exceeds ${thresholds.apiResponseTimeMs}ms`,
        treatMissingData: "notBreaching",
      },

      // Hedera operation error rate alarm
      {
        alarmName: "HBAR-Hedera-High-Error-Rate",
        metricName: "HederaOperationErrors",
        namespace: this.namespace,
        statistic: "Sum",
        threshold: 3, // Absolute count threshold
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 2,
        period: 300, // 5 minutes
        alarmDescription: `Hedera operation error count exceeds threshold`,
        treatMissingData: "notBreaching",
      },

      // Hedera operation response time alarm
      {
        alarmName: "HBAR-Hedera-High-Response-Time",
        metricName: "HederaOperationResponseTime",
        namespace: this.namespace,
        statistic: "Average",
        threshold: thresholds.apiResponseTimeMs,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 3,
        period: 300, // 5 minutes
        alarmDescription: `Hedera operation response time exceeds ${thresholds.apiResponseTimeMs}ms`,
        treatMissingData: "notBreaching",
      },

      // Lambda function error alarms
      {
        alarmName: "HBAR-Recharge-Handler-Errors",
        metricName: "Errors",
        namespace: "AWS/Lambda",
        statistic: "Sum",
        threshold: 5,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 2,
        period: 300, // 5 minutes
        dimensions: [{ Name: "FunctionName", Value: "hbar-recharge-handler" }],
        alarmDescription: "HBAR recharge handler Lambda function errors",
        treatMissingData: "notBreaching",
      },

      {
        alarmName: "HBAR-Conversion-Handler-Errors",
        metricName: "Errors",
        namespace: "AWS/Lambda",
        statistic: "Sum",
        threshold: 5,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 2,
        period: 300, // 5 minutes
        dimensions: [
          { Name: "FunctionName", Value: "hbar-conversion-handler" },
        ],
        alarmDescription: "HBAR conversion handler Lambda function errors",
        treatMissingData: "notBreaching",
      },

      // DynamoDB error alarm
      {
        alarmName: "HBAR-DynamoDB-Errors",
        metricName: "SystemErrors",
        namespace: "AWS/DynamoDB",
        statistic: "Sum",
        threshold: 5,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 2,
        period: 300, // 5 minutes
        dimensions: [{ Name: "TableName", Value: "RechargeTransactions" }],
        alarmDescription:
          "DynamoDB system errors for recharge transactions table",
        treatMissingData: "notBreaching",
      },
    ];
  }

  private getAllRechargeAlarmNames(): string[] {
    return [
      "HBAR-Recharge-High-Failure-Rate",
      "HBAR-Recharge-High-Processing-Time",
      "HBAR-Treasury-Balance-Warning",
      "HBAR-Treasury-Balance-Critical",
      "HBAR-Exchange-Rate-Stale",
      "HBAR-Orange-Money-High-Error-Rate",
      "HBAR-Orange-Money-High-Response-Time",
      "HBAR-Hedera-High-Error-Rate",
      "HBAR-Hedera-High-Response-Time",
      "HBAR-Recharge-Handler-Errors",
      "HBAR-Conversion-Handler-Errors",
      "HBAR-DynamoDB-Errors",
    ];
  }
}

export const createCloudWatchAlarmsService = (snsTopicArn: string) =>
  new CloudWatchAlarmsService(snsTopicArn);
