/**
 * Unit tests for Alarm Configuration Manager
 */

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Template } from "aws-cdk-lib/assertions";
import { AlarmConfigurationManager } from "../../lib/constructs/alarm-configuration";

describe("AlarmConfigurationManager", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;
  let alertTopic: sns.Topic;
  let alarmManager: AlarmConfigurationManager;
  let mockLambdaFunction: lambda.Function;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create SNS topic
    alertTopic = new sns.Topic(stack, "AlertTopic", {
      topicName: "test-alerts",
    });

    // Create alarm manager
    alarmManager = new AlarmConfigurationManager(alertTopic, "test");

    // Create mock Lambda function
    mockLambdaFunction = new lambda.Function(stack, "TestLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromInline("exports.handler = async () => {};"),
      functionName: "test-function",
    });

    template = Template.fromStack(stack);
  });

  describe("Lambda Alarms", () => {
    it("should create standard Lambda alarms with correct configuration", () => {
      const thresholds = AlarmConfigurationManager.getDefaultThresholds("auth");
      const alarms = alarmManager.createLambdaAlarms(
        mockLambdaFunction,
        thresholds,
        0
      );

      expect(alarms).toHaveLength(4); // Error, Duration, Throttle, Concurrency

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "test-function-ErrorRate-test",
        AlarmDescription: "High error rate detected for test-function",
        MetricName: "Errors",
        Namespace: "AWS/Lambda",
        Statistic: "Sum",
        Threshold: 3, // Auth function threshold
        EvaluationPeriods: 2,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        TreatMissingData: "notBreaching",
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "test-function-Duration-test",
        AlarmDescription: "High execution duration for test-function",
        MetricName: "Duration",
        Namespace: "AWS/Lambda",
        Statistic: "Average",
        Threshold: 10000, // Auth function threshold (10 seconds)
        EvaluationPeriods: 3,
        ComparisonOperator: "GreaterThanThreshold",
        TreatMissingData: "notBreaching",
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "test-function-Throttles-test",
        AlarmDescription: "Function throttling detected for test-function",
        MetricName: "Throttles",
        Namespace: "AWS/Lambda",
        Statistic: "Sum",
        Threshold: 1,
        EvaluationPeriods: 1,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        TreatMissingData: "notBreaching",
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "test-function-ConcurrentExecutions-test",
        AlarmDescription: "High concurrent executions for test-function",
        MetricName: "Invocations",
        Namespace: "AWS/Lambda",
        Statistic: "Sum",
        Threshold: 100,
        EvaluationPeriods: 3,
        ComparisonOperator: "GreaterThanThreshold",
        TreatMissingData: "notBreaching",
      });
    });

    it("should configure SNS actions for all Lambda alarms", () => {
      const thresholds = AlarmConfigurationManager.getDefaultThresholds("auth");
      alarmManager.createLambdaAlarms(mockLambdaFunction, thresholds, 0);

      const alarms = template.findResources("AWS::CloudWatch::Alarm");
      const lambdaAlarms = Object.values(alarms).filter((alarm: any) =>
        alarm.Properties?.AlarmName?.includes("test-function")
      );

      lambdaAlarms.forEach((alarm: any) => {
        expect(alarm.Properties.AlarmActions).toBeDefined();
        expect(alarm.Properties.AlarmActions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("KYC Business Alarms", () => {
    it("should create KYC business-specific alarms", () => {
      const alarms = alarmManager.createKYCBusinessAlarms();

      expect(alarms.length).toBeGreaterThan(0);

      // Upload failure rate alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-UploadFailureRate-test",
        AlarmDescription: "High KYC document upload failure rate detected",
        MetricName: "KYCUploadFailure",
        Namespace: "Sachain/KYCUpload",
        Statistic: "Sum",
        Threshold: 10,
        EvaluationPeriods: 2,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        TreatMissingData: "notBreaching",
      });

      // High pending documents alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-HighPendingDocuments-test",
        AlarmDescription:
          "High number of pending KYC documents requiring review",
        MetricName: "PendingKYCDocuments",
        Namespace: "Sachain/KYC",
        Statistic: "Maximum",
        Threshold: 50,
        EvaluationPeriods: 2,
        ComparisonOperator: "GreaterThanThreshold",
        TreatMissingData: "notBreaching",
      });

      // Long processing time alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-LongProcessingTime-test",
        AlarmDescription: "KYC documents are taking too long to process",
        MetricName: "KYCProcessingTime",
        Namespace: "Sachain/KYC",
        Statistic: "Average",
        Threshold: 86400, // 24 hours
        EvaluationPeriods: 1,
        ComparisonOperator: "GreaterThanThreshold",
        TreatMissingData: "notBreaching",
      });
    });

    it("should create low approval rate alarm with math expression", () => {
      alarmManager.createKYCBusinessAlarms();

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-LowApprovalRate-test",
        AlarmDescription: "KYC approval rate is below expected threshold",
        Threshold: 70,
        EvaluationPeriods: 2,
        ComparisonOperator: "LessThanThreshold",
        TreatMissingData: "notBreaching",
      });
    });
  });

  describe("System Health Alarms", () => {
    it("should create system health alarms", () => {
      const alarms = alarmManager.createSystemHealthAlarms();

      expect(alarms.length).toBeGreaterThan(0);

      // DynamoDB throttling alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "DynamoDB-Throttling-test",
        AlarmDescription: "DynamoDB operations are being throttled",
        MetricName: "ThrottledRequests",
        Namespace: "AWS/DynamoDB",
        Statistic: "Sum",
        Threshold: 5,
        EvaluationPeriods: 2,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        TreatMissingData: "notBreaching",
      });

      // S3 error rate alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "S3-ErrorRate-test",
        AlarmDescription: "High error rate for S3 operations",
        MetricName: "4xxErrors",
        Namespace: "AWS/S3",
        Statistic: "Sum",
        Threshold: 10,
        EvaluationPeriods: 2,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        TreatMissingData: "notBreaching",
      });

      // API Gateway latency alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "APIGateway-HighLatency-test",
        AlarmDescription: "API Gateway response times are high",
        MetricName: "Latency",
        Namespace: "AWS/ApiGateway",
        Statistic: "Average",
        Threshold: 5000,
        EvaluationPeriods: 3,
        ComparisonOperator: "GreaterThanThreshold",
        TreatMissingData: "notBreaching",
      });
    });
  });

  describe("Security Alarms", () => {
    it("should create security-related alarms", () => {
      const alarms = alarmManager.createSecurityAlarms();

      expect(alarms.length).toBeGreaterThan(0);

      // High authentication failure rate
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "Auth-HighFailureRate-test",
        AlarmDescription:
          "High authentication failure rate detected - possible attack",
        MetricName: "AuthenticationFailure",
        Namespace: "Sachain/Authentication",
        Statistic: "Sum",
        Threshold: 20,
        EvaluationPeriods: 2,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        TreatMissingData: "notBreaching",
      });

      // Suspicious file uploads
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "Security-SuspiciousUploads-test",
        AlarmDescription: "Suspicious file upload patterns detected",
        MetricName: "KYCUploadFailure",
        Namespace: "Sachain/KYCUpload",
        Statistic: "Sum",
        Threshold: 15,
        EvaluationPeriods: 2,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        TreatMissingData: "notBreaching",
      });
    });
  });

  describe("Default Thresholds", () => {
    it("should return appropriate thresholds for auth functions", () => {
      const thresholds = AlarmConfigurationManager.getDefaultThresholds("auth");

      expect(thresholds.errorRateThreshold).toBe(3);
      expect(thresholds.durationThreshold).toBe(10000);
      expect(thresholds.errorRateEvaluationPeriods).toBe(2);
      expect(thresholds.durationEvaluationPeriods).toBe(3);
      expect(thresholds.throttleThreshold).toBe(1);
      expect(thresholds.throttleEvaluationPeriods).toBe(1);
    });

    it("should return appropriate thresholds for upload functions", () => {
      const thresholds =
        AlarmConfigurationManager.getDefaultThresholds("upload");

      expect(thresholds.errorRateThreshold).toBe(10);
      expect(thresholds.durationThreshold).toBe(60000);
    });

    it("should return appropriate thresholds for admin functions", () => {
      const thresholds =
        AlarmConfigurationManager.getDefaultThresholds("admin");

      expect(thresholds.errorRateThreshold).toBe(2);
      expect(thresholds.durationThreshold).toBe(15000);
    });

    it("should return appropriate thresholds for notification functions", () => {
      const thresholds =
        AlarmConfigurationManager.getDefaultThresholds("notification");

      expect(thresholds.errorRateThreshold).toBe(5);
      expect(thresholds.durationThreshold).toBe(20000);
    });

    it("should return default thresholds for unknown function types", () => {
      const thresholds = AlarmConfigurationManager.getDefaultThresholds(
        "unknown" as any
      );

      expect(thresholds.errorRateThreshold).toBe(5);
      expect(thresholds.durationThreshold).toBe(30000);
    });
  });

  describe("Alarm Actions", () => {
    it("should add SNS actions to all alarms", () => {
      const thresholds = AlarmConfigurationManager.getDefaultThresholds("auth");
      alarmManager.createLambdaAlarms(mockLambdaFunction, thresholds, 0);
      alarmManager.createKYCBusinessAlarms();
      alarmManager.createSystemHealthAlarms();
      alarmManager.createSecurityAlarms();

      const alarms = template.findResources("AWS::CloudWatch::Alarm");

      Object.values(alarms).forEach((alarm: any) => {
        expect(alarm.Properties.AlarmActions).toBeDefined();
        expect(alarm.Properties.AlarmActions.length).toBeGreaterThan(0);
      });
    });

    it("should add OK actions for critical alarms", () => {
      alarmManager.createSecurityAlarms(); // Contains critical alarms

      const criticalAlarms = template.findResources("AWS::CloudWatch::Alarm", {
        Properties: {
          AlarmName: "Auth-HighFailureRate-test",
        },
      });

      expect(Object.keys(criticalAlarms)).toHaveLength(1);
      const alarm = Object.values(criticalAlarms)[0] as any;
      expect(alarm.Properties.OKActions).toBeDefined();
    });
  });

  describe("Environment Configuration", () => {
    it("should include environment in alarm names", () => {
      const thresholds = AlarmConfigurationManager.getDefaultThresholds("auth");
      alarmManager.createLambdaAlarms(mockLambdaFunction, thresholds, 0);

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "test-function-ErrorRate-test",
      });
    });

    it("should use environment-specific resource names in metrics", () => {
      alarmManager.createSystemHealthAlarms();

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "DynamoDB-Throttling-test",
        Dimensions: [
          {
            Name: "TableName",
            Value: "sachain-kyc-table-test",
          },
        ],
      });
    });
  });
});
