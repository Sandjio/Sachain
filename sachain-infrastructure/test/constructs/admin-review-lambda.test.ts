import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Template, Match } from "aws-cdk-lib/assertions";
import { LambdaConstruct } from "../../lib/constructs/lambda";

describe("Admin Review Lambda Infrastructure", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let table: dynamodb.Table;
  let eventBus: events.EventBus;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");
    
    // Create test DynamoDB table
    table = new dynamodb.Table(stack, "TestTable", {
      tableName: "test-table",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Create test EventBridge bus
    eventBus = new events.EventBus(stack, "TestEventBus", {
      eventBusName: "test-event-bus",
    });
  });

  describe("Lambda Function Configuration", () => {
    it("should create Admin Review Lambda with correct configuration", () => {
      const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify Lambda function exists
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-admin-review-test",
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Timeout: 120, // 2 minutes
        MemorySize: 512,
      });

      // Verify environment variables
      template.hasResourceProperties("AWS::Lambda::Function", {
        Environment: {
          Variables: {
            TABLE_NAME: { Ref: Match.anyValue() },
            EVENT_BUS_NAME: "test-event-bus",
            ENVIRONMENT: "test",
          },
        },
      });
    });

    it("should create Dead Letter Queue for Admin Review Lambda", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify DLQ exists
      template.hasResourceProperties("AWS::SQS::Queue", {
        QueueName: "sachain-admin-review-dlq-test",
        MessageRetentionPeriod: 1209600, // 14 days
      });

      // Verify Lambda has DLQ configured
      template.hasResourceProperties("AWS::Lambda::Function", {
        DeadLetterConfig: {
          TargetArn: { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
        },
      });
    });
  });

  describe("IAM Permissions", () => {
    it("should grant DynamoDB read/write permissions", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify DynamoDB permissions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Effect: "Allow",
              Action: [
                "dynamodb:BatchGetItem",
                "dynamodb:GetRecords",
                "dynamodb:GetShardIterator",
                "dynamodb:Query",
                "dynamodb:GetItem",
                "dynamodb:Scan",
                "dynamodb:ConditionCheckItem",
                "dynamodb:BatchWriteItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:DescribeTable",
              ],
              Resource: [
                { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
                {
                  "Fn::Join": [
                    "",
                    [
                      { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
                      "/index/*",
                    ],
                  ],
                },
              ],
            },
          ]),
        },
      });
    });

    it("should grant EventBridge permissions", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify EventBridge permissions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Effect: "Allow",
              Action: "events:PutEvents",
              Resource: { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
            },
          ]),
        },
      });
    });

    it("should grant CloudWatch metrics permissions", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify CloudWatch permissions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Effect: "Allow",
              Action: ["cloudwatch:PutMetricData"],
              Resource: "*",
              Condition: {
                StringEquals: {
                  "cloudwatch:namespace": "Sachain/AdminReview",
                },
              },
            },
          ]),
        },
      });
    });
  });

  describe("API Gateway Configuration", () => {
    it("should create Admin Review API Gateway", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify API Gateway exists
      template.hasResourceProperties("AWS::ApiGateway::RestApi", {
        Name: "sachain-admin-review-api-test",
        Description: "API for KYC admin review operations",
      });
    });

    it("should create approve endpoint", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify approve resource exists
      template.hasResourceProperties("AWS::ApiGateway::Resource", {
        PathPart: "approve",
      });

      // Verify POST method exists
      template.hasResourceProperties("AWS::ApiGateway::Method", {
        HttpMethod: "POST",
        ResourceId: { Ref: Match.anyValue() },
      });
    });

    it("should create reject endpoint", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify reject resource exists
      template.hasResourceProperties("AWS::ApiGateway::Resource", {
        PathPart: "reject",
      });

      // Verify POST method exists
      template.hasResourceProperties("AWS::ApiGateway::Method", {
        HttpMethod: "POST",
        ResourceId: { Ref: Match.anyValue() },
      });
    });

    it("should create documents endpoint", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify documents resource exists
      template.hasResourceProperties("AWS::ApiGateway::Resource", {
        PathPart: "documents",
      });

      // Verify GET method exists
      template.hasResourceProperties("AWS::ApiGateway::Method", {
        HttpMethod: "GET",
        ResourceId: { Ref: Match.anyValue() },
      });
    });

    it("should configure CORS for all endpoints", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify CORS configuration
      template.hasResourceProperties("AWS::ApiGateway::Method", {
        HttpMethod: "OPTIONS",
      });
    });
  });

  describe("Integration Configuration", () => {
    it("should configure Lambda integration for all endpoints", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify Lambda integration exists
      template.hasResourceProperties("AWS::ApiGateway::Method", {
        Integration: {
          Type: "AWS_PROXY",
          IntegrationHttpMethod: "POST",
          Uri: {
            "Fn::Join": [
              "",
              [
                "arn:",
                { Ref: "AWS::Partition" },
                ":apigateway:",
                { Ref: "AWS::Region" },
                ":lambda:path/2015-03-31/functions/",
                { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
                "/invocations",
              ],
            ],
          },
        },
      });
    });

    it("should grant API Gateway permission to invoke Lambda", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify Lambda permission for API Gateway
      template.hasResourceProperties("AWS::Lambda::Permission", {
        Action: "lambda:InvokeFunction",
        Principal: "apigateway.amazonaws.com",
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle missing EventBridge gracefully", () => {
      const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
        table,
        environment: "test",
        // eventBus not provided
      });

      const template = Template.fromStack(stack);

      // Should still create Lambda function
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-admin-review-test",
      });

      // Environment should have empty EVENT_BUS_NAME
      template.hasResourceProperties("AWS::Lambda::Function", {
        Environment: {
          Variables: {
            EVENT_BUS_NAME: "",
          },
        },
      });
    });
  });

  describe("Resource Naming", () => {
    it("should use environment-specific naming", () => {
      new LambdaConstruct(stack, "TestLambda", {
        table,
        eventBus,
        environment: "prod",
      });

      const template = Template.fromStack(stack);

      // Verify environment-specific names
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-admin-review-prod",
      });

      template.hasResourceProperties("AWS::SQS::Queue", {
        QueueName: "sachain-admin-review-dlq-prod",
      });

      template.hasResourceProperties("AWS::ApiGateway::RestApi", {
        Name: "sachain-admin-review-api-prod",
      });
    });
  });
});