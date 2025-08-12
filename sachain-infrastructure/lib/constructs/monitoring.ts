import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

export interface MonitoringConstructProps {
  lambdaFunctions: lambda.Function[];
  environment: string;
  alertEmail?: string;
  logRetentionDays?: logs.RetentionDays;
  enableDetailedMonitoring?: boolean;
}

export class MonitoringConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alertTopic: sns.Topic;
  public readonly alarms: cloudwatch.Alarm[];

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    // SNS topic for alerts
    this.alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: `sachain-kyc-alerts-${props.environment}`,
      displayName: "Sachain KYC System Alerts",
    });

    // Subscribe email to alerts if provided
    if (props.alertEmail) {
      this.alertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(props.alertEmail)
      );
    }

    // CloudWatch dashboard
    this.dashboard = new cloudwatch.Dashboard(this, "KYCDashboard", {
      dashboardName: `sachain-kyc-dashboard-${props.environment}`,
    });

    // Log groups and alarms for Lambda functions
    this.alarms = [];
    const logRetention = props.logRetentionDays || logs.RetentionDays.ONE_MONTH;

    props.lambdaFunctions.forEach((func, index) => {
      // Create log group with configurable retention
      new logs.LogGroup(this, `LogGroup${index}`, {
        logGroupName: `/aws/lambda/${func.functionName}`,
        retention: logRetention,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      // Create alarms for each function
      this.createLambdaAlarms(func, index);
    });

    // Create additional log groups for system components
    this.createSystemLogGroups(props.environment, logRetention);

    // Create KYC-specific alarms
    this.createKYCAlarms();

    // Add widgets to dashboard
    this.createDashboardWidgets(props.lambdaFunctions);
  }

  private createSystemLogGroups(
    environment: string,
    retention: logs.RetentionDays
  ): void {
    // Create log groups for system components that might not be automatically created

    // API Gateway access logs
    new logs.LogGroup(this, "APIGatewayAccessLogs", {
      logGroupName: `/aws/apigateway/sachain-kyc-${environment}`,
      retention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // EventBridge logs
    new logs.LogGroup(this, "EventBridgeLogs", {
      logGroupName: `/aws/events/sachain-kyc-${environment}`,
      retention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Custom application logs
    new logs.LogGroup(this, "ApplicationLogs", {
      logGroupName: `/sachain/application/${environment}`,
      retention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Audit logs (longer retention for compliance)
    new logs.LogGroup(this, "AuditLogs", {
      logGroupName: `/sachain/audit/${environment}`,
      retention: logs.RetentionDays.ONE_YEAR, // Longer retention for audit logs
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Retain audit logs even after stack deletion
    });

    // Security logs
    new logs.LogGroup(this, "SecurityLogs", {
      logGroupName: `/sachain/security/${environment}`,
      retention: logs.RetentionDays.SIX_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }

  private createLambdaAlarms(func: lambda.Function, index: number): void {
    // Error rate alarm
    const errorAlarm = new cloudwatch.Alarm(this, `ErrorAlarm${index}`, {
      alarmName: `${func.functionName}-ErrorRate`,
      alarmDescription: `High error rate for ${func.functionName}`,
      metric: func.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(errorAlarm);

    // Duration alarm
    const durationAlarm = new cloudwatch.Alarm(this, `DurationAlarm${index}`, {
      alarmName: `${func.functionName}-Duration`,
      alarmDescription: `High duration for ${func.functionName}`,
      metric: func.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: "Average",
      }),
      threshold: 30000, // 30 seconds
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    durationAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(durationAlarm);

    // Throttle alarm
    const throttleAlarm = new cloudwatch.Alarm(this, `ThrottleAlarm${index}`, {
      alarmName: `${func.functionName}-Throttles`,
      alarmDescription: `Throttling detected for ${func.functionName}`,
      metric: func.metricThrottles({
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    throttleAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(throttleAlarm);
  }

  private createKYCAlarms(): void {
    // Upload failure rate alarm
    const uploadFailureAlarm = new cloudwatch.Alarm(
      this,
      "UploadFailureAlarm",
      {
        alarmName: "KYC-UploadFailureRate",
        alarmDescription: "High KYC upload failure rate",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "DirectUploadError",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 10,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    uploadFailureAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(uploadFailureAlarm);

    // S3 upload error alarm
    const s3ErrorAlarm = new cloudwatch.Alarm(this, "S3ErrorAlarm", {
      alarmName: "KYC-S3UploadErrors",
      alarmDescription: "S3 upload errors detected",
      metric: new cloudwatch.Metric({
        namespace: "Sachain/KYCUpload",
        metricName: "DirectUploadError",
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
        dimensionsMap: {
          errorType: "S3Upload",
        },
      }),
      threshold: 3,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    s3ErrorAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(s3ErrorAlarm);

    // DynamoDB error alarm
    const dynamoErrorAlarm = new cloudwatch.Alarm(this, "DynamoErrorAlarm", {
      alarmName: "KYC-DynamoDBErrors",
      alarmDescription: "DynamoDB operation errors detected",
      metric: new cloudwatch.Metric({
        namespace: "Sachain/KYCUpload",
        metricName: "DirectUploadError",
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
        dimensionsMap: {
          errorCategory: "system",
        },
      }),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dynamoErrorAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(dynamoErrorAlarm);

    // Create admin-specific alarms
    this.createAdminOperationAlarms();
  }

  private createAdminOperationAlarms(): void {
    // Admin operation failure rate alarm
    const adminFailureAlarm = new cloudwatch.Alarm(
      this,
      "AdminOperationFailureAlarm",
      {
        alarmName: "KYC-AdminOperationFailures",
        alarmDescription: "High admin operation failure rate detected",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "AdminReviewError",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    adminFailureAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(adminFailureAlarm);

    // Critical admin operation errors (data consistency issues)
    const adminCriticalAlarm = new cloudwatch.Alarm(
      this,
      "AdminCriticalErrorAlarm",
      {
        alarmName: "KYC-AdminCriticalErrors",
        alarmDescription:
          "Critical admin operation errors that may cause data inconsistency",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "AdminOperationCriticalError",
          period: cdk.Duration.minutes(1),
          statistic: "Sum",
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    adminCriticalAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(adminCriticalAlarm);

    // KYC approval database errors
    const approvalDbErrorAlarm = new cloudwatch.Alarm(
      this,
      "KYCApprovalDbErrorAlarm",
      {
        alarmName: "KYC-ApprovalDatabaseErrors",
        alarmDescription: "Database errors during KYC approval operations",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalDatabaseError",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 3,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    approvalDbErrorAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(approvalDbErrorAlarm);

    // KYC rejection database errors
    const rejectionDbErrorAlarm = new cloudwatch.Alarm(
      this,
      "KYCRejectionDbErrorAlarm",
      {
        alarmName: "KYC-RejectionDatabaseErrors",
        alarmDescription: "Database errors during KYC rejection operations",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCRejectionDatabaseError",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 3,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    rejectionDbErrorAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(rejectionDbErrorAlarm);

    // KYC approval critical errors (document approved but user status not updated)
    const approvalCriticalAlarm = new cloudwatch.Alarm(
      this,
      "KYCApprovalCriticalAlarm",
      {
        alarmName: "KYC-ApprovalCriticalErrors",
        alarmDescription:
          "Critical errors in KYC approval process causing data inconsistency",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalCriticalError",
          period: cdk.Duration.minutes(1),
          statistic: "Sum",
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    approvalCriticalAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(approvalCriticalAlarm);

    // KYC rejection critical errors (document rejected but user status not updated)
    const rejectionCriticalAlarm = new cloudwatch.Alarm(
      this,
      "KYCRejectionCriticalAlarm",
      {
        alarmName: "KYC-RejectionCriticalErrors",
        alarmDescription:
          "Critical errors in KYC rejection process causing data inconsistency",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCRejectionCriticalError",
          period: cdk.Duration.minutes(1),
          statistic: "Sum",
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    rejectionCriticalAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(rejectionCriticalAlarm);

    // Retryable error alarm (indicates potential system issues)
    const retryableErrorAlarm = new cloudwatch.Alarm(
      this,
      "AdminRetryableErrorAlarm",
      {
        alarmName: "KYC-AdminRetryableErrors",
        alarmDescription:
          "High rate of retryable errors in admin operations indicating system issues",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalRetryableError",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 10,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    retryableErrorAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(retryableErrorAlarm);

    // EventBridge publishing errors
    const eventBridgeErrorAlarm = new cloudwatch.Alarm(
      this,
      "AdminEventBridgeErrorAlarm",
      {
        alarmName: "KYC-AdminEventBridgeErrors",
        alarmDescription: "EventBridge publishing errors in admin operations",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalEventBridgeError",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    eventBridgeErrorAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(eventBridgeErrorAlarm);

    // Document retrieval errors
    const getDocumentsErrorAlarm = new cloudwatch.Alarm(
      this,
      "GetDocumentsErrorAlarm",
      {
        alarmName: "KYC-GetDocumentsErrors",
        alarmDescription: "Errors retrieving documents for admin review",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "GetDocumentsDatabaseError",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    getDocumentsErrorAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );
    this.alarms.push(getDocumentsErrorAlarm);
  }

  private createDashboardWidgets(lambdaFunctions: lambda.Function[]): void {
    // Lambda metrics widgets
    const lambdaErrorWidget = new cloudwatch.GraphWidget({
      title: "Lambda Errors",
      left: lambdaFunctions.map((func) => func.metricErrors()),
      width: 12,
      height: 6,
    });

    const lambdaDurationWidget = new cloudwatch.GraphWidget({
      title: "Lambda Duration",
      left: lambdaFunctions.map((func) => func.metricDuration()),
      width: 12,
      height: 6,
    });

    // KYC-specific metrics widgets
    const uploadMetricsWidget = new cloudwatch.GraphWidget({
      title: "KYC Upload Metrics",
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "DirectUploadSuccess",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "DirectUploadError",
          statistic: "Sum",
        }),
      ],
      width: 12,
      height: 6,
    });

    const errorCategoryWidget = new cloudwatch.GraphWidget({
      title: "Error Categories",
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "DirectUploadError",
          statistic: "Sum",
          dimensionsMap: { errorCategory: "validation" },
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "DirectUploadError",
          statistic: "Sum",
          dimensionsMap: { errorCategory: "system" },
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "DirectUploadError",
          statistic: "Sum",
          dimensionsMap: { errorCategory: "rate_limit" },
        }),
      ],
      width: 12,
      height: 6,
    });

    // Admin review metrics widgets
    const adminReviewMetricsWidget = new cloudwatch.GraphWidget({
      title: "Admin Review Operations",
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalSuccess",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCRejectionSuccess",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "AdminReviewError",
          statistic: "Sum",
        }),
      ],
      width: 12,
      height: 6,
    });

    const adminErrorCategoriesWidget = new cloudwatch.GraphWidget({
      title: "Admin Operation Error Categories",
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalDatabaseError",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCRejectionDatabaseError",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "GetDocumentsDatabaseError",
          statistic: "Sum",
        }),
      ],
      width: 12,
      height: 6,
    });

    const criticalErrorsWidget = new cloudwatch.GraphWidget({
      title: "Critical Admin Errors",
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "AdminOperationCriticalError",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalCriticalError",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCRejectionCriticalError",
          statistic: "Sum",
        }),
      ],
      width: 12,
      height: 6,
    });

    // Add widgets to dashboard
    this.dashboard.addWidgets(
      lambdaErrorWidget,
      lambdaDurationWidget,
      uploadMetricsWidget,
      errorCategoryWidget,
      adminReviewMetricsWidget,
      adminErrorCategoriesWidget,
      criticalErrorsWidget
    );
  }
}
