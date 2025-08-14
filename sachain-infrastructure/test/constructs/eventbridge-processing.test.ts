import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Template, Match } from "aws-cdk-lib/assertions";
import { EventBridgeConstruct } from "../../lib/constructs/eventbridge";

describe("EventBridge Processing Integration", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;
  let kycProcessingLambda: lambda.Function;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create mock processing Lambda
    kycProcessingLambda = new lambda.Function(stack, "ProcessingLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline("exports.handler = async () => {};"),
    });

    // Create EventBridge construct
    const eventBridgeConstruct = new EventBridgeConstruct(stack, "EventBridge", {
      environment: "test",
    });

    // Add processing Lambda target (simulating main stack behavior)
    eventBridgeConstruct.kycDocumentUploadedRule.addTarget(
      new targets.LambdaFunction(kycProcessingLambda, {
        retryAttempts: 3,
        maxEventAge: cdk.Duration.hours(2),
      })
    );

    template = Template.fromStack(stack);
  });

  test("creates custom EventBridge bus for KYC events", () => {
    template.hasResourceProperties("AWS::Events::EventBus", {
      Name: "sachain-kyc-events-test",
    });
  });

  test("creates KYC document uploaded rule with correct pattern", () => {
    template.hasResourceProperties("AWS::Events::Rule", {
      Name: "sachain-kyc-document-uploaded-test",
      Description: "Route KYC document upload events to admin notifications",
      EventPattern: {
        source: ["sachain.kyc"],
        "detail-type": ["KYC Document Uploaded"],
        detail: {
          eventType: ["KYC_DOCUMENT_UPLOADED"],
        },
      },
    });
  });

  test("configures Lambda target with retry policies", () => {
    template.hasResourceProperties("AWS::Events::Rule", {
      Name: "sachain-kyc-document-uploaded-test",
      Targets: [
        {
          Arn: { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
          Id: Match.anyValue(),
          RetryPolicy: {
            MaximumRetryAttempts: 3,
            MaximumEventAge: 7200, // 2 hours
          },
        },
      ],
    });
  });

  test("creates CloudWatch log group for event debugging", () => {
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      RetentionInDays: 30,
    });
  });

  test("configures CloudWatch logs target for debugging", () => {
    template.hasResourceProperties("AWS::Events::Rule", {
      Name: "sachain-kyc-document-uploaded-test",
      Targets: Match.arrayWith([
        {
          Arn: { "Fn::GetAtt": [Match.stringLikeRegexp(".*LogGroup.*"), "Arn"] },
          Id: Match.anyValue(),
        },
      ]),
    });
  });

  test("creates SNS topics for notifications", () => {
    template.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-admin-notifications-test",
      DisplayName: "Sachain KYC Admin Notifications",
    });

    template.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-user-notifications-test",
      DisplayName: "Sachain KYC User Notifications",
    });
  });

  test("outputs important ARNs", () => {
    template.hasOutput("EventBusArn", {
      Description: "KYC EventBridge Bus ARN",
    });

    template.hasOutput("AdminNotificationTopicArn", {
      Description: "Admin Notification SNS Topic ARN",
    });

    template.hasOutput("UserNotificationTopicArn", {
      Description: "User Notification SNS Topic ARN",
    });
  });
});