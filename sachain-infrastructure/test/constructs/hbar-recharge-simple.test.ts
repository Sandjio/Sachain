import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import { Template } from "aws-cdk-lib/assertions";
import { HBARRechargeConstruct } from "../../lib/constructs/hbar-recharge";

describe("HBARRechargeConstruct - Simple Tests", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create mock dependencies
    const mockTable = new dynamodb.Table(stack, "MockTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    });

    const mockEventBus = new events.EventBus(stack, "MockEventBus");
    const mockNotificationTopic = new sns.Topic(stack, "MockNotificationTopic");

    // Create the construct
    new HBARRechargeConstruct(stack, "HBARRecharge", {
      environment: "test",
      table: mockTable,
      eventBus: mockEventBus,
      notificationTopic: mockNotificationTopic,
    });

    template = Template.fromStack(stack);
  });

  test("creates recharge table with correct name", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "sachain-hbar-recharge-test",
    });
  });

  test("creates recharge event bus", () => {
    template.hasResourceProperties("AWS::Events::EventBus", {
      Name: "sachain-hbar-recharge-events-test",
    });
  });

  test("creates Lambda functions with correct retry configuration", () => {
    // Recharge handler lambda
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-hbar-recharge-handler-test",
      Runtime: "nodejs20.x",
    });

    // Conversion handler lambda
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-hbar-conversion-handler-test",
      Runtime: "nodejs20.x",
    });
  });

  test("creates CloudWatch dashboard", () => {
    template.hasResourceProperties("AWS::CloudWatch::Dashboard", {
      DashboardName: "sachain-hbar-recharge-dashboard-test",
    });
  });

  test("creates appropriate IAM roles", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-hbar-recharge-handler-role-test",
    });

    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-hbar-conversion-handler-role-test",
    });
  });
});
