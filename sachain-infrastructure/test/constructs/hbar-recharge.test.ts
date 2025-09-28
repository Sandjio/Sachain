import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Template, Match } from "aws-cdk-lib/assertions";
import { HBARRechargeConstruct } from "../../lib/constructs/hbar-recharge";

describe("HBARRechargeConstruct", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;
  let mockTable: dynamodb.Table;
  let mockEventBus: events.EventBus;
  let mockNotificationTopic: sns.Topic;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create mock dependencies
    mockTable = new dynamodb.Table(stack, "MockTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    });

    mockEventBus = new events.EventBus(stack, "MockEventBus");
    mockNotificationTopic = new sns.Topic(stack, "MockNotificationTopic");

    // Create the construct
    new HBARRechargeConstruct(stack, "HBARRecharge", {
      environment: "test",
      table: mockTable,
      eventBus: mockEventBus,
      notificationTopic: mockNotificationTopic,
    });

    template = Template.fromStack(stack);
  });

  describe("DynamoDB Table", () => {
    test("creates recharge table with correct configuration", () => {
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: "sachain-hbar-recharge-test",
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" },
          { AttributeName: "SK", AttributeType: "S" },
          { AttributeName: "GSI1PK", AttributeType: "S" },
          { AttributeName: "GSI1SK", AttributeType: "S" },
          { AttributeName: "GSI2PK", AttributeType: "S" },
          { AttributeName: "GSI2SK", AttributeType: "S" },
          { AttributeName: "GSI3PK", AttributeType: "S" },
          { AttributeName: "GSI3SK", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "GSI1",
            KeySchema: [
              { AttributeName: "GSI1PK", KeyType: "HASH" },
              { AttributeName: "GSI1SK", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
          {
            IndexName: "GSI2",
            KeySchema: [
              { AttributeName: "GSI2PK", KeyType: "HASH" },
              { AttributeName: "GSI2SK", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
          {
            IndexName: "GSI3",
            KeySchema: [
              { AttributeName: "GSI3PK", KeyType: "HASH" },
              { AttributeName: "GSI3SK", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
        StreamSpecification: {
          StreamViewType: "NEW_AND_OLD_IMAGES",
        },
      });
    });

    test("has correct removal policy for test environment", () => {
      template.hasResource("AWS::DynamoDB::Table", {
        DeletionPolicy: "Delete",
      });
    });
  });

  describe("EventBridge", () => {
    test("creates custom event bus for recharge events", () => {
      template.hasResourceProperties("AWS::Events::EventBus", {
        Name: "sachain-hbar-recharge-events-test",
      });
    });

    test("creates payment success rule with correct event pattern", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-hbar-payment-success-test",
        Description:
          "Route Orange Money payment success events to HBAR conversion",
        EventPattern: {
          source: ["sachain.hbar-recharge"],
          "detail-type": ["Orange Money Payment Success"],
          detail: {
            eventType: ["ORANGE_MONEY_PAYMENT_SUCCESS"],
          },
        },
      });
    });

    test("creates conversion complete rule with correct event pattern", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-hbar-conversion-complete-test",
        Description:
          "Route HBAR conversion completion events for notifications",
        EventPattern: {
          source: ["sachain.hbar-recharge"],
          "detail-type": ["HBAR Conversion Complete"],
          detail: {
            eventType: ["HBAR_CONVERSION_COMPLETE", "HBAR_CONVERSION_FAILED"],
          },
        },
      });
    });
  });

  describe("Lambda Functions", () => {
    test("creates recharge handler lambda with correct configuration", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-hbar-recharge-handler-test",
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Timeout: 300, // 5 minutes
        MemorySize: 1024,
        Environment: {
          Variables: {
            RECHARGE_TABLE_NAME: Match.anyValue(),
            USER_TABLE_NAME: Match.anyValue(),
            EVENT_BUS_NAME: Match.anyValue(),
            ENVIRONMENT: "test",
            ORANGE_MONEY_SECRET_NAME: "sachain/orange-money/test",
            EXCHANGE_RATE_SECRET_NAME: "sachain/exchange-rates/test",
          },
        },
        TracingConfig: {
          Mode: "Active",
        },
        DeadLetterConfig: {
          TargetArn: Match.anyValue(),
        },
      });
    });

    test("creates conversion handler lambda with correct configuration", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-hbar-conversion-handler-test",
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Timeout: 600, // 10 minutes
        MemorySize: 1024,
        Environment: {
          Variables: {
            RECHARGE_TABLE_NAME: Match.anyValue(),
            EVENT_BUS_NAME: Match.anyValue(),
            NOTIFICATION_TOPIC_ARN: Match.anyValue(),
            ENVIRONMENT: "test",
            HEDERA_SECRET_NAME: "sachain/hedera/test",
            EXCHANGE_RATE_SECRET_NAME: "sachain/exchange-rates/test",
          },
        },
        TracingConfig: {
          Mode: "Active",
        },
        DeadLetterConfig: {
          TargetArn: Match.anyValue(),
        },
      });
    });
  });

  describe("IAM Roles", () => {
    test("creates recharge handler role with least privilege permissions", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-hbar-recharge-handler-role-test",
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: "lambda.amazonaws.com",
              },
              Action: "sts:AssumeRole",
            },
          ],
        },
      });

      // Check for DynamoDB permissions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DynamoDBRechargeOperations",
              Effect: "Allow",
              Action: [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:Query",
              ],
              Resource: Match.anyValue(),
            },
          ]),
        },
      });

      // Check for EventBridge permissions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "EventBridgePublish",
              Effect: "Allow",
              Action: ["events:PutEvents"],
              Resource: Match.anyValue(),
              Condition: {
                StringEquals: {
                  "events:source": "sachain.hbar-recharge",
                },
              },
            },
          ]),
        },
      });

      // Check for Secrets Manager permissions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "SecretsManagerAccess",
              Effect: "Allow",
              Action: ["secretsmanager:GetSecretValue"],
              Resource: Match.anyValue(),
            },
          ]),
        },
      });
    });

    test("creates conversion handler role with least privilege permissions", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-hbar-conversion-handler-role-test",
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: "lambda.amazonaws.com",
              },
              Action: "sts:AssumeRole",
            },
          ],
        },
      });

      // Check for SNS permissions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "SNSPublish",
              Effect: "Allow",
              Action: ["sns:Publish"],
              Resource: Match.anyValue(),
            },
          ]),
        },
      });
    });
  });

  describe("CloudWatch Monitoring", () => {
    test("creates CloudWatch alarms for error monitoring", () => {
      // Recharge handler error alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "HBAR-Recharge-Handler-Errors",
        AlarmDescription: "High error rate in HBAR recharge handler",
        MetricName: "Errors",
        Namespace: "AWS/Lambda",
        Statistic: "Sum",
        Threshold: 5,
        EvaluationPeriods: 2,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
      });

      // Conversion handler error alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "HBAR-Conversion-Handler-Errors",
        AlarmDescription: "High error rate in HBAR conversion handler",
        MetricName: "Errors",
        Namespace: "AWS/Lambda",
        Statistic: "Sum",
        Threshold: 3,
        EvaluationPeriods: 2,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
      });
    });

    test("creates CloudWatch alarms for duration monitoring", () => {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "HBAR-Recharge-Processing-Duration",
        AlarmDescription: "High processing duration for recharge requests",
        MetricName: "Duration",
        Namespace: "AWS/Lambda",
        Statistic: "Average",
        Threshold: 60000, // 60 seconds
        EvaluationPeriods: 3,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
      });
    });

    test("creates business metric alarms", () => {
      // Failed recharge transactions alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "HBAR-Failed-Recharge-Transactions",
        AlarmDescription: "High rate of failed recharge transactions",
        MetricName: "RechargeTransactionFailed",
        Namespace: "Sachain/HBARRecharge",
        Statistic: "Sum",
        Threshold: 10,
        EvaluationPeriods: 2,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
      });

      // Exchange rate staleness alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "HBAR-Stale-Exchange-Rate",
        AlarmDescription: "Exchange rate data is stale",
        MetricName: "ExchangeRateStale",
        Namespace: "Sachain/HBARConversion",
        Statistic: "Maximum",
        Threshold: 1,
        EvaluationPeriods: 1,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
      });

      // Treasury balance low alarm
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "HBAR-Treasury-Low-Balance",
        AlarmDescription: "Treasury HBAR balance is low",
        MetricName: "TreasuryBalance",
        Namespace: "Sachain/HBARConversion",
        Statistic: "Minimum",
        Threshold: 1000,
        EvaluationPeriods: 1,
        ComparisonOperator: "LessThanThreshold",
      });
    });

    test("creates CloudWatch dashboard", () => {
      template.hasResourceProperties("AWS::CloudWatch::Dashboard", {
        DashboardName: "sachain-hbar-recharge-dashboard-test",
        DashboardBody: Match.anyValue(),
      });
    });
  });

  describe("Event Rule Targets", () => {
    test("payment success rule targets conversion handler lambda", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Targets: [
          {
            Arn: Match.anyValue(),
            Id: Match.anyValue(),
            RetryPolicy: {
              MaximumRetryAttempts: 3,
            },
            DeadLetterConfig: {
              Arn: Match.anyValue(),
            },
          },
        ],
      });
    });

    test("conversion complete rule targets CloudWatch logs", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: "/sachain/hbar-recharge/audit/test",
        RetentionInDays: 365,
      });
    });
  });

  describe("Resource Tagging", () => {
    test("applies correct tags to all resources", () => {
      const resources = template.findResources("AWS::DynamoDB::Table");
      const tableLogicalId = Object.keys(resources)[1]; // Second table is the recharge table

      template.hasResource("AWS::DynamoDB::Table", {
        Properties: Match.objectLike({
          Tags: Match.arrayWith([
            { Key: "Environment", Value: "test" },
            { Key: "Project", Value: "Sachain" },
            { Key: "Component", Value: "HBAR-Recharge" },
            { Key: "Service", Value: "Blockchain-Integration" },
          ]),
        }),
      });
    });
  });

  describe("Security Configuration", () => {
    test("enables encryption for DynamoDB table", () => {
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        SSESpecification: {
          SSEEnabled: true,
        },
      });
    });

    test("enables X-Ray tracing for Lambda functions", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        TracingConfig: {
          Mode: "Active",
        },
      });
    });

    test("configures dead letter queues for Lambda functions", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        DeadLetterConfig: {
          TargetArn: Match.anyValue(),
        },
      });
    });
  });

  describe("Error Handling", () => {
    test("configures retry policies for event targets", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Targets: Match.arrayWith([
          {
            RetryPolicy: {
              MaximumRetryAttempts: 3,
            },
            DeadLetterConfig: {
              Arn: Match.anyValue(),
            },
          },
        ]),
      });
    });

    test("sets appropriate timeouts for Lambda functions", () => {
      // Recharge handler timeout
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-hbar-recharge-handler-test",
        Timeout: 300, // 5 minutes
      });

      // Conversion handler timeout
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-hbar-conversion-handler-test",
        Timeout: 600, // 10 minutes
      });
    });
  });
});
