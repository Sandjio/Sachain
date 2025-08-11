import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

export interface MonitoringConstructProps {
  lambdaFunctions: lambda.Function[];
  environment: string;
  alertEmail?: string;
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
    props.lambdaFunctions.forEach((func, index) => {
      // Create log group
      new logs.LogGroup(this, `LogGroup${index}`, {
        logGroupName: `/aws/lambda/${func.functionName}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      // Create alarms for each function
      this.createLambdaAlarms(func, index);
    });

    // Create KYC-specific alarms
    this.createKYCAlarms();

    // Add widgets to dashboard
    this.createDashboardWidgets(props.lambdaFunctions);
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
    errorAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));
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
    durationAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));
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
    throttleAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));
    this.alarms.push(throttleAlarm);
  }

  private createKYCAlarms(): void {
    // Upload failure rate alarm
    const uploadFailureAlarm = new cloudwatch.Alarm(this, "UploadFailureAlarm", {
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
    });
    uploadFailureAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));
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
    s3ErrorAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));
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
    dynamoErrorAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));
    this.alarms.push(dynamoErrorAlarm);
  }

  private createDashboardWidgets(lambdaFunctions: lambda.Function[]): void {
    // Lambda metrics widgets
    const lambdaErrorWidget = new cloudwatch.GraphWidget({
      title: "Lambda Errors",
      left: lambdaFunctions.map(func => func.metricErrors()),
      width: 12,
      height: 6,
    });

    const lambdaDurationWidget = new cloudwatch.GraphWidget({
      title: "Lambda Duration",
      left: lambdaFunctions.map(func => func.metricDuration()),
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

    // Add widgets to dashboard
    this.dashboard.addWidgets(
      lambdaErrorWidget,
      lambdaDurationWidget,
      uploadMetricsWidget,
      errorCategoryWidget
    );
  }
}
