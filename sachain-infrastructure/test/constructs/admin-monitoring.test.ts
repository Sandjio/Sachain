import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Template } from "aws-cdk-lib/assertions";
import { MonitoringConstruct } from "../../lib/constructs/monitoring";

describe("MonitoringConstruct - Admin Operation Alarms", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create mock Lambda functions
    const mockLambdaFunctions = [
      new lambda.Function(stack, "PostAuthLambda", {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromInline("exports.handler = async () => {};"),
        functionName: "post-auth-function",
      }),
      new lambda.Function(stack, "KYCUploadLambda", {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromInline("exports.handler = async () => {};"),
        functionName: "kyc-upload-function",
      }),
      new lambda.Function(stack, "AdminReviewLambda", {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromInline("exports.handler = async () => {};"),
        functionName: "admin-review-function",
      }),
    ];

    // Create monitoring construct
    new MonitoringConstruct(stack, "TestMonitoring", {
      lambdaFunctions: mockLambdaFunctions,
      environment: "test",
      alertEmail: "admin@example.com",
    });

    template = Template.fromStack(stack);
  });

  describe("Admin Operation Alarms", () => {
    it("should create admin operation failure rate alarm", () => {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-AdminOperationFailures",
        AlarmDescription: "High admin operation failure rate detected",
        MetricName: "AdminReviewError",
        Namespace: "Sachain/AdminReview",
        Statistic: "Sum",
        Period: 300,
        Threshold: 5,
        EvaluationPeriods: 2,
        TreatMissingData: "notBreaching",
      });
    });

    it("should create critical admin operation error alarm", () => {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-AdminCriticalErrors",
        AlarmDescription:
          "Critical admin operation errors that may cause data inconsistency",
        MetricName: "AdminOperationCriticalError",
        Namespace: "Sachain/AdminReview",
        Statistic: "Sum",
        Period: 60,
        Threshold: 1,
        EvaluationPeriods: 1,
        TreatMissingData: "notBreaching",
      });
    });

    it("should create KYC approval database error alarm", () => {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-ApprovalDatabaseErrors",
        AlarmDescription: "Database errors during KYC approval operations",
        MetricName: "KYCApprovalDatabaseError",
        Namespace: "Sachain/AdminReview",
        Statistic: "Sum",
        Period: 300,
        Threshold: 3,
        EvaluationPeriods: 2,
        TreatMissingData: "notBreaching",
      });
    });

    it("should create KYC rejection database error alarm", () => {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-RejectionDatabaseErrors",
        AlarmDescription: "Database errors during KYC rejection operations",
        MetricName: "KYCRejectionDatabaseError",
        Namespace: "Sachain/AdminReview",
        Statistic: "Sum",
        Period: 300,
        Threshold: 3,
        EvaluationPeriods: 2,
        TreatMissingData: "notBreaching",
      });
    });

    it("should create KYC approval critical error alarm", () => {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-ApprovalCriticalErrors",
        AlarmDescription:
          "Critical errors in KYC approval process causing data inconsistency",
        MetricName: "KYCApprovalCriticalError",
        Namespace: "Sachain/AdminReview",
        Statistic: "Sum",
        Period: 60,
        Threshold: 1,
        EvaluationPeriods: 1,
        TreatMissingData: "notBreaching",
      });
    });

    it("should create KYC rejection critical error alarm", () => {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-RejectionCriticalErrors",
        AlarmDescription:
          "Critical errors in KYC rejection process causing data inconsistency",
        MetricName: "KYCRejectionCriticalError",
        Namespace: "Sachain/AdminReview",
        Statistic: "Sum",
        Period: 60,
        Threshold: 1,
        EvaluationPeriods: 1,
        TreatMissingData: "notBreaching",
      });
    });

    it("should create retryable error alarm", () => {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-AdminRetryableErrors",
        AlarmDescription:
          "High rate of retryable errors in admin operations indicating system issues",
        MetricName: "KYCApprovalRetryableError",
        Namespace: "Sachain/AdminReview",
        Statistic: "Sum",
        Period: 300,
        Threshold: 10,
        EvaluationPeriods: 2,
        TreatMissingData: "notBreaching",
      });
    });

    it("should create EventBridge error alarm", () => {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-AdminEventBridgeErrors",
        AlarmDescription: "EventBridge publishing errors in admin operations",
        MetricName: "KYCApprovalEventBridgeError",
        Namespace: "Sachain/AdminReview",
        Statistic: "Sum",
        Period: 300,
        Threshold: 5,
        EvaluationPeriods: 2,
        TreatMissingData: "notBreaching",
      });
    });

    it("should create document retrieval error alarm", () => {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-GetDocumentsErrors",
        AlarmDescription: "Errors retrieving documents for admin review",
        MetricName: "GetDocumentsDatabaseError",
        Namespace: "Sachain/AdminReview",
        Statistic: "Sum",
        Period: 300,
        Threshold: 5,
        EvaluationPeriods: 2,
        TreatMissingData: "notBreaching",
      });
    });
  });

  describe("SNS Alarm Actions", () => {
    it("should configure all admin alarms to send notifications to SNS topic", () => {
      // Get all alarms from the template
      const alarms = template.findResources("AWS::CloudWatch::Alarm");

      // Filter admin-related alarms
      const adminAlarms = Object.values(alarms).filter((alarm: any) => {
        const alarmName = alarm.Properties?.AlarmName;
        return (
          alarmName &&
          (alarmName.includes("AdminOperation") ||
            alarmName.includes("KYCApproval") ||
            alarmName.includes("KYCRejection") ||
            alarmName.includes("GetDocuments") ||
            alarmName.includes("AdminRetryable") ||
            alarmName.includes("AdminEventBridge") ||
            alarmName.includes("AdminCritical"))
        );
      });

      // Verify each admin alarm has SNS action configured
      adminAlarms.forEach((alarm: any) => {
        expect(alarm.Properties.AlarmActions).toBeDefined();
        expect(alarm.Properties.AlarmActions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Dashboard Widgets", () => {
    it("should create CloudWatch dashboard with admin metrics widgets", () => {
      template.hasResourceProperties("AWS::CloudWatch::Dashboard", {
        DashboardName: "sachain-kyc-dashboard-test",
        DashboardBody: {
          "Fn::Join": [
            "",
            [
              '{"widgets":[',
              // Lambda errors widget
              '{"type":"metric","x":0,"y":0,"width":12,"height":6,"properties":{"view":"timeSeries","stacked":false,"metrics":[',
              // Lambda duration widget
              // Upload metrics widget
              // Error category widget
              // Admin review metrics widget - should contain admin-specific metrics
              // Admin error categories widget
              // Critical errors widget
            ],
          ],
        },
      });
    });

    it("should include admin review metrics in dashboard", () => {
      const dashboardBody = template.toJSON().Resources;
      const dashboard = Object.values(dashboardBody).find(
        (resource: any) => resource.Type === "AWS::CloudWatch::Dashboard"
      ) as any;

      expect(dashboard).toBeDefined();

      // The dashboard body should contain admin-specific metrics
      const bodyString = JSON.stringify(dashboard.Properties.DashboardBody);
      expect(bodyString).toContain("KYCApprovalSuccess");
      expect(bodyString).toContain("KYCRejectionSuccess");
      expect(bodyString).toContain("AdminReviewError");
      expect(bodyString).toContain("KYCApprovalDatabaseError");
      expect(bodyString).toContain("KYCRejectionDatabaseError");
      expect(bodyString).toContain("GetDocumentsDatabaseError");
      expect(bodyString).toContain("AdminOperationCriticalError");
      expect(bodyString).toContain("KYCApprovalCriticalError");
      expect(bodyString).toContain("KYCRejectionCriticalError");
    });
  });

  describe("Alarm Thresholds and Evaluation", () => {
    it("should set appropriate thresholds for different alarm types", () => {
      // Critical errors should have threshold of 1 (immediate alert)
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-AdminCriticalErrors",
        Threshold: 1,
        EvaluationPeriods: 1,
        Period: 60,
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-ApprovalCriticalErrors",
        Threshold: 1,
        EvaluationPeriods: 1,
        Period: 60,
      });

      // Database errors should have moderate thresholds
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-ApprovalDatabaseErrors",
        Threshold: 3,
        EvaluationPeriods: 2,
        Period: 300,
      });

      // General failures should have higher thresholds
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-AdminOperationFailures",
        Threshold: 5,
        EvaluationPeriods: 2,
        Period: 300,
      });

      // Retryable errors should have highest threshold (indicates system issues)
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-AdminRetryableErrors",
        Threshold: 10,
        EvaluationPeriods: 2,
        Period: 300,
      });
    });

    it("should configure all alarms to not breach on missing data", () => {
      const alarms = template.findResources("AWS::CloudWatch::Alarm");

      Object.values(alarms).forEach((alarm: any) => {
        expect(alarm.Properties.TreatMissingData).toBe("notBreaching");
      });
    });
  });

  describe("Metric Namespaces", () => {
    it("should use correct namespaces for different metric types", () => {
      // Admin review metrics should use Sachain/AdminReview namespace
      const adminMetricAlarms = [
        "KYC-AdminOperationFailures",
        "KYC-AdminCriticalErrors",
        "KYC-ApprovalDatabaseErrors",
        "KYC-RejectionDatabaseErrors",
        "KYC-ApprovalCriticalErrors",
        "KYC-RejectionCriticalErrors",
        "KYC-AdminRetryableErrors",
        "KYC-AdminEventBridgeErrors",
        "KYC-GetDocumentsErrors",
      ];

      adminMetricAlarms.forEach((alarmName) => {
        template.hasResourceProperties("AWS::CloudWatch::Alarm", {
          AlarmName: alarmName,
          Namespace: "Sachain/AdminReview",
        });
      });

      // Upload metrics should use Sachain/KYCUpload namespace
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "KYC-UploadFailureRate",
        Namespace: "Sachain/KYCUpload",
      });
    });
  });

  describe("Environment-specific Configuration", () => {
    it("should include environment in dashboard name", () => {
      template.hasResourceProperties("AWS::CloudWatch::Dashboard", {
        DashboardName: "sachain-kyc-dashboard-test",
      });
    });

    it("should include environment in SNS topic name", () => {
      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-alerts-test",
        DisplayName: "Sachain KYC System Alerts",
      });
    });

    it("should configure email subscription when provided", () => {
      template.hasResourceProperties("AWS::SNS::Subscription", {
        Protocol: "email",
        Endpoint: "admin@example.com",
      });
    });
  });

  describe("Log Groups Configuration", () => {
    it("should create log groups for all Lambda functions", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: "/aws/lambda/post-auth-function",
        RetentionInDays: 30,
      });

      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: "/aws/lambda/kyc-upload-function",
        RetentionInDays: 30,
      });

      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: "/aws/lambda/admin-review-function",
        RetentionInDays: 30,
      });
    });

    it("should set appropriate log retention policy", () => {
      const logGroups = template.findResources("AWS::Logs::LogGroup");

      Object.values(logGroups).forEach((logGroup: any) => {
        expect(logGroup.Properties.RetentionInDays).toBe(30);
      });
    });
  });
});
