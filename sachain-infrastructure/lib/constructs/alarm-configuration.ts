/**
 * Advanced CloudWatch Alarm Configuration Utility
 * Provides standardized alarm configurations for different service types
 */

import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

export interface AlarmThresholds {
  // Error rate thresholds
  errorRateThreshold: number;
  errorRateEvaluationPeriods: number;

  // Duration thresholds
  durationThreshold: number; // milliseconds
  durationEvaluationPeriods: number;

  // Throttle thresholds
  throttleThreshold: number;
  throttleEvaluationPeriods: number;

  // Custom metric thresholds
  customMetricThreshold?: number;
  customMetricEvaluationPeriods?: number;
}

export interface AlarmConfiguration {
  alarmName: string;
  alarmDescription: string;
  metric: cloudwatch.IMetric;
  threshold: number;
  evaluationPeriods: number;
  period: cdk.Duration;
  comparisonOperator: cloudwatch.ComparisonOperator;
  treatMissingData: cloudwatch.TreatMissingData;
  severity: "critical" | "high" | "medium" | "low";
}

export class AlarmConfigurationManager {
  private readonly alertTopic: sns.Topic;
  private readonly environment: string;

  constructor(alertTopic: sns.Topic, environment: string) {
    this.alertTopic = alertTopic;
    this.environment = environment;
  }

  /**
   * Create standardized Lambda function alarms
   */
  createLambdaAlarms(
    func: lambda.Function,
    thresholds: AlarmThresholds,
    index: number
  ): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];

    // Error rate alarm
    const errorAlarm = new cloudwatch.Alarm(func, `ErrorAlarm${index}`, {
      alarmName: `${func.functionName}-ErrorRate-${this.environment}`,
      alarmDescription: `High error rate detected for ${func.functionName}`,
      metric: func.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: thresholds.errorRateThreshold,
      evaluationPeriods: thresholds.errorRateEvaluationPeriods,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    this.addAlarmActions(errorAlarm, "high");
    alarms.push(errorAlarm);

    // Duration alarm
    const durationAlarm = new cloudwatch.Alarm(func, `DurationAlarm${index}`, {
      alarmName: `${func.functionName}-Duration-${this.environment}`,
      alarmDescription: `High execution duration for ${func.functionName}`,
      metric: func.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: "Average",
      }),
      threshold: thresholds.durationThreshold,
      evaluationPeriods: thresholds.durationEvaluationPeriods,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    this.addAlarmActions(durationAlarm, "medium");
    alarms.push(durationAlarm);

    // Throttle alarm
    const throttleAlarm = new cloudwatch.Alarm(func, `ThrottleAlarm${index}`, {
      alarmName: `${func.functionName}-Throttles-${this.environment}`,
      alarmDescription: `Function throttling detected for ${func.functionName}`,
      metric: func.metricThrottles({
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: thresholds.throttleThreshold,
      evaluationPeriods: thresholds.throttleEvaluationPeriods,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    this.addAlarmActions(throttleAlarm, "high");
    alarms.push(throttleAlarm);

    // Concurrent executions alarm
    const concurrencyAlarm = new cloudwatch.Alarm(
      func,
      `ConcurrencyAlarm${index}`,
      {
        alarmName: `${func.functionName}-ConcurrentExecutions-${this.environment}`,
        alarmDescription: `High concurrent executions for ${func.functionName}`,
        metric: func.metricInvocations({
          period: cdk.Duration.minutes(1),
          statistic: "Sum",
        }),
        threshold: 100, // Adjust based on expected load
        evaluationPeriods: 3,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    this.addAlarmActions(concurrencyAlarm, "medium");
    alarms.push(concurrencyAlarm);

    return alarms;
  }

  /**
   * Create business-specific KYC alarms
   */
  createKYCBusinessAlarms(): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];

    // High KYC upload failure rate
    const uploadFailureAlarm = new cloudwatch.Alarm(
      this.alertTopic,
      "KYCUploadFailureRate",
      {
        alarmName: `KYC-UploadFailureRate-${this.environment}`,
        alarmDescription: "High KYC document upload failure rate detected",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "KYCUploadFailure",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 10,
        evaluationPeriods: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    this.addAlarmActions(uploadFailureAlarm, "high");
    alarms.push(uploadFailureAlarm);

    // Low KYC approval rate (business metric)
    const lowApprovalRateAlarm = new cloudwatch.Alarm(
      this.alertTopic,
      "KYCLowApprovalRate",
      {
        alarmName: `KYC-LowApprovalRate-${this.environment}`,
        alarmDescription: "KYC approval rate is below expected threshold",
        metric: new cloudwatch.MathExpression({
          expression: "(approvals / (approvals + rejections)) * 100",
          usingMetrics: {
            approvals: new cloudwatch.Metric({
              namespace: "Sachain/AdminReview",
              metricName: "KYCApprovalSuccess",
              period: cdk.Duration.hours(1),
              statistic: "Sum",
            }),
            rejections: new cloudwatch.Metric({
              namespace: "Sachain/AdminReview",
              metricName: "KYCRejectionSuccess",
              period: cdk.Duration.hours(1),
              statistic: "Sum",
            }),
          },
          period: cdk.Duration.hours(1),
        }),
        threshold: 70, // 70% approval rate threshold
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    this.addAlarmActions(lowApprovalRateAlarm, "medium");
    alarms.push(lowApprovalRateAlarm);

    // High pending documents count
    const highPendingAlarm = new cloudwatch.Alarm(
      this.alertTopic,
      "KYCHighPendingDocuments",
      {
        alarmName: `KYC-HighPendingDocuments-${this.environment}`,
        alarmDescription:
          "High number of pending KYC documents requiring review",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/KYC",
          metricName: "PendingKYCDocuments",
          period: cdk.Duration.minutes(30),
          statistic: "Maximum",
        }),
        threshold: 50,
        evaluationPeriods: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    this.addAlarmActions(highPendingAlarm, "medium");
    alarms.push(highPendingAlarm);

    // Long KYC processing time
    const longProcessingTimeAlarm = new cloudwatch.Alarm(
      this.alertTopic,
      "KYCLongProcessingTime",
      {
        alarmName: `KYC-LongProcessingTime-${this.environment}`,
        alarmDescription: "KYC documents are taking too long to process",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/KYC",
          metricName: "KYCProcessingTime",
          period: cdk.Duration.hours(1),
          statistic: "Average",
        }),
        threshold: 86400, // 24 hours in seconds
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    this.addAlarmActions(longProcessingTimeAlarm, "high");
    alarms.push(longProcessingTimeAlarm);

    return alarms;
  }

  /**
   * Create system health alarms
   */
  createSystemHealthAlarms(): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];

    // DynamoDB throttling alarm
    const dynamoThrottleAlarm = new cloudwatch.Alarm(
      this.alertTopic,
      "DynamoDBThrottling",
      {
        alarmName: `DynamoDB-Throttling-${this.environment}`,
        alarmDescription: "DynamoDB operations are being throttled",
        metric: new cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "ThrottledRequests",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
          dimensionsMap: {
            TableName: `sachain-kyc-table-${this.environment}`,
          },
        }),
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    this.addAlarmActions(dynamoThrottleAlarm, "critical");
    alarms.push(dynamoThrottleAlarm);

    // S3 error rate alarm
    const s3ErrorAlarm = new cloudwatch.Alarm(this.alertTopic, "S3ErrorRate", {
      alarmName: `S3-ErrorRate-${this.environment}`,
      alarmDescription: "High error rate for S3 operations",
      metric: new cloudwatch.Metric({
        namespace: "AWS/S3",
        metricName: "4xxErrors",
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
        dimensionsMap: {
          BucketName: `sachain-kyc-documents-${this.environment}`,
        },
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    this.addAlarmActions(s3ErrorAlarm, "high");
    alarms.push(s3ErrorAlarm);

    // API Gateway high latency alarm
    const apiLatencyAlarm = new cloudwatch.Alarm(
      this.alertTopic,
      "APIGatewayLatency",
      {
        alarmName: `APIGateway-HighLatency-${this.environment}`,
        alarmDescription: "API Gateway response times are high",
        metric: new cloudwatch.Metric({
          namespace: "AWS/ApiGateway",
          metricName: "Latency",
          period: cdk.Duration.minutes(5),
          statistic: "Average",
          dimensionsMap: {
            ApiName: `sachain-kyc-api-${this.environment}`,
          },
        }),
        threshold: 5000, // 5 seconds
        evaluationPeriods: 3,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    this.addAlarmActions(apiLatencyAlarm, "medium");
    alarms.push(apiLatencyAlarm);

    return alarms;
  }

  /**
   * Create security-related alarms
   */
  createSecurityAlarms(): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];

    // High authentication failure rate
    const authFailureAlarm = new cloudwatch.Alarm(
      this.alertTopic,
      "HighAuthFailureRate",
      {
        alarmName: `Auth-HighFailureRate-${this.environment}`,
        alarmDescription:
          "High authentication failure rate detected - possible attack",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/Authentication",
          metricName: "AuthenticationFailure",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 20,
        evaluationPeriods: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    this.addAlarmActions(authFailureAlarm, "critical");
    alarms.push(authFailureAlarm);

    // Suspicious file upload patterns
    const suspiciousUploadAlarm = new cloudwatch.Alarm(
      this.alertTopic,
      "SuspiciousFileUploads",
      {
        alarmName: `Security-SuspiciousUploads-${this.environment}`,
        alarmDescription: "Suspicious file upload patterns detected",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "KYCUploadFailure",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
          dimensionsMap: {
            ErrorCategory: "validation",
          },
        }),
        threshold: 15,
        evaluationPeriods: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    this.addAlarmActions(suspiciousUploadAlarm, "high");
    alarms.push(suspiciousUploadAlarm);

    return alarms;
  }

  /**
   * Add appropriate alarm actions based on severity
   */
  private addAlarmActions(
    alarm: cloudwatch.Alarm,
    severity: "critical" | "high" | "medium" | "low"
  ): void {
    // All alarms send to the main alert topic
    alarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

    // Critical alarms could trigger additional actions
    if (severity === "critical") {
      // Could add additional notification channels for critical alarms
      // For example: PagerDuty, Slack, SMS, etc.
      alarm.addOkAction(new cloudwatchActions.SnsAction(this.alertTopic));
    }
  }

  /**
   * Get default alarm thresholds for different Lambda function types
   */
  static getDefaultThresholds(
    functionType: "auth" | "upload" | "admin" | "notification"
  ): AlarmThresholds {
    const baseThresholds: AlarmThresholds = {
      errorRateThreshold: 5,
      errorRateEvaluationPeriods: 2,
      durationThreshold: 30000, // 30 seconds
      durationEvaluationPeriods: 3,
      throttleThreshold: 1,
      throttleEvaluationPeriods: 1,
    };

    switch (functionType) {
      case "auth":
        return {
          ...baseThresholds,
          errorRateThreshold: 3, // Lower threshold for auth functions
          durationThreshold: 10000, // 10 seconds for auth
        };
      case "upload":
        return {
          ...baseThresholds,
          errorRateThreshold: 10, // Higher threshold for upload functions
          durationThreshold: 60000, // 60 seconds for file uploads
        };
      case "admin":
        return {
          ...baseThresholds,
          errorRateThreshold: 2, // Very low threshold for admin functions
          durationThreshold: 15000, // 15 seconds for admin operations
        };
      case "notification":
        return {
          ...baseThresholds,
          errorRateThreshold: 5,
          durationThreshold: 20000, // 20 seconds for notifications
        };
      default:
        return baseThresholds;
    }
  }
}
