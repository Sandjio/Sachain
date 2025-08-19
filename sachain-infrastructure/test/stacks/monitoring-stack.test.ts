import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Template, Match } from "aws-cdk-lib/assertions";
import { MonitoringStack } from "../../lib/stacks/monitoring-stack";

describe("MonitoringStack", () => {
  // Mock Lambda functions for testing
  const createMockLambda = (scope: cdk.Stack, id: string): lambda.Function => {
    return new lambda.Function(scope, id, {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromInline("exports.handler = async () => {};"),
    });
  };

  const createTestStack = (stackId: string) => {
    const app = new cdk.App();

    // Create a temporary stack to hold mock Lambda functions
    const mockStack = new cdk.Stack(app, "MockStack");

    const mockLambdas = {
      postAuthLambda: createMockLambda(mockStack, "PostAuth"),
      kycUploadLambda: createMockLambda(mockStack, "KycUpload"),
      adminReviewLambda: createMockLambda(mockStack, "AdminReview"),
      userNotificationLambda: createMockLambda(mockStack, "UserNotification"),
      kycProcessingLambda: createMockLambda(mockStack, "KycProcessing"),
    };

    const stack = new MonitoringStack(app, stackId, {
      environment: "test",
      ...mockLambdas,
      alertEmail: "test@example.com",
      enableDetailedMonitoring: true,
    });

    return { app, stack, template: Template.fromStack(stack) };
  };

  test("creates CloudWatch dashboard", () => {
    const { template } = createTestStack("TestMonitoringStack1");

    template.hasResourceProperties("AWS::CloudWatch::Dashboard", {
      DashboardName: "sachain-kyc-dashboard-test",
    });
  });

  test("creates SNS alert topic", () => {
    const { template } = createTestStack("TestMonitoringStack2");

    template.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-alerts-test",
      DisplayName: "Sachain KYC System Alerts",
    });
  });

  test("creates email subscription for alerts", () => {
    const { template } = createTestStack("TestMonitoringStack3");

    template.hasResourceProperties("AWS::SNS::Subscription", {
      Protocol: "email",
      Endpoint: "test@example.com",
    });
  });

  test("creates Lambda function alarms", () => {
    const { template } = createTestStack("TestMonitoringStack4");

    // Should create error, duration, and throttle alarms for each Lambda function
    // Check that we have CloudWatch alarms (there should be many)
    const alarms = template.findResources("AWS::CloudWatch::Alarm");
    expect(Object.keys(alarms).length).toBeGreaterThan(15); // Should have many alarms

    // Just verify that we have alarms - the MonitoringConstruct is already tested separately
    expect(Object.keys(alarms).length).toBeGreaterThan(0);
  });

  test("creates KYC-specific alarms", () => {
    const { template } = createTestStack("TestMonitoringStack5");

    // Check for upload failure alarm
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "KYC-UploadFailureRate",
      AlarmDescription: "High KYC upload failure rate",
    });

    // Check for S3 error alarm
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "KYC-S3UploadErrors",
      AlarmDescription: "S3 upload errors detected",
    });

    // Check for DynamoDB error alarm
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "KYC-DynamoDBErrors",
      AlarmDescription: "DynamoDB operation errors detected",
    });
  });

  test("creates admin operation alarms", () => {
    const { template } = createTestStack("TestMonitoringStack6");

    // Check for admin operation failure alarm
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "KYC-AdminOperationFailures",
      AlarmDescription: "High admin operation failure rate detected",
    });

    // Check for critical admin operation errors
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "KYC-AdminCriticalErrors",
      AlarmDescription:
        "Critical admin operation errors that may cause data inconsistency",
    });
  });

  test("creates log groups for system components", () => {
    const { template } = createTestStack("TestMonitoringStack7");

    // Check for API Gateway access logs
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      LogGroupName: "/aws/apigateway/sachain-kyc-test",
    });

    // Check for EventBridge logs
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      LogGroupName: "/aws/events/sachain-kyc-test",
    });

    // Check for application logs
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      LogGroupName: "/sachain/application/test",
    });

    // Check for audit logs
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      RetentionInDays: 365, // One year retention for audit logs
    });

    // Check for security logs
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      RetentionInDays: 180, // Six months retention for security logs
    });
  });

  test("creates stack outputs", () => {
    const { template } = createTestStack("TestMonitoringStack8");

    // Check for dashboard URL output
    template.hasOutput("DashboardUrl", {
      Description: "CloudWatch Dashboard URL",
    });

    // Check for alert topic ARN output
    template.hasOutput("AlertTopicArn", {
      Description: "SNS Alert Topic ARN",
    });

    // Check for dashboard name output
    template.hasOutput("DashboardName", {
      Description: "CloudWatch Dashboard Name",
    });

    // Check for alarm count output
    template.hasOutput("AlarmCount", {
      Description: "Number of CloudWatch Alarms Created",
    });
  });

  test("handles optional compliance lambda", () => {
    const app = new cdk.App();
    const mockStack = new cdk.Stack(app, "MockStackWithCompliance");
    const complianceLambda = createMockLambda(mockStack, "Compliance");

    const stackWithCompliance = new MonitoringStack(
      app,
      "TestMonitoringStackWithCompliance",
      {
        environment: "test",
        postAuthLambda: createMockLambda(mockStack, "PostAuth2"),
        kycUploadLambda: createMockLambda(mockStack, "KycUpload2"),
        adminReviewLambda: createMockLambda(mockStack, "AdminReview2"),
        userNotificationLambda: createMockLambda(
          mockStack,
          "UserNotification2"
        ),
        kycProcessingLambda: createMockLambda(mockStack, "KycProcessing2"),
        complianceLambda,
        alertEmail: "test@example.com",
      }
    );

    const templateWithCompliance = Template.fromStack(stackWithCompliance);

    // Should still create the dashboard and other resources
    templateWithCompliance.hasResourceProperties("AWS::CloudWatch::Dashboard", {
      DashboardName: "sachain-kyc-dashboard-test",
    });
  });

  test("works without optional parameters", () => {
    const app = new cdk.App();
    const mockStackMinimal = new cdk.Stack(app, "MockStackMinimal");

    const minimalStack = new MonitoringStack(
      app,
      "TestMonitoringStackMinimal",
      {
        environment: "test",
        postAuthLambda: createMockLambda(mockStackMinimal, "PostAuth3"),
        kycUploadLambda: createMockLambda(mockStackMinimal, "KycUpload3"),
        adminReviewLambda: createMockLambda(mockStackMinimal, "AdminReview3"),
        userNotificationLambda: createMockLambda(
          mockStackMinimal,
          "UserNotification3"
        ),
        kycProcessingLambda: createMockLambda(
          mockStackMinimal,
          "KycProcessing3"
        ),
      }
    );

    const minimalTemplate = Template.fromStack(minimalStack);

    // Should still create the dashboard
    minimalTemplate.hasResourceProperties("AWS::CloudWatch::Dashboard", {
      DashboardName: "sachain-kyc-dashboard-test",
    });

    // Should create SNS topic but no email subscription
    minimalTemplate.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-alerts-test",
    });
  });

  test("exposes monitoring resources correctly", () => {
    const { stack } = createTestStack("TestMonitoringStack9");

    // Check that the stack exposes the expected properties
    expect(stack.dashboardUrl).toContain("console.aws.amazon.com/cloudwatch");
    expect(typeof stack.alertTopicArn).toBe("string");
    expect(Array.isArray(stack.alarmArns)).toBe(true);
    expect(stack.alarmArns.length).toBeGreaterThan(0);
  });
});
