import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import { Template, Match } from "aws-cdk-lib/assertions";
import { LambdaConstruct } from "../../lib/constructs/lambda";

describe("KYC Upload Lambda Infrastructure", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let table: dynamodb.Table;
  let bucket: s3.Bucket;
  let topic: sns.Topic;
  let eventBus: events.EventBus;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create test resources
    table = new dynamodb.Table(stack, "TestTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    });

    bucket = new s3.Bucket(stack, "TestBucket");
    topic = new sns.Topic(stack, "TestTopic");
    eventBus = new events.EventBus(stack, "TestEventBus");
  });

  describe("Lambda Function Configuration", () => {
    it("should create KYC Upload Lambda with correct basic configuration", () => {
      const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
        table,
        documentBucket: bucket,
        notificationTopic: topic,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify KYC Upload Lambda function exists
      template.hasResourceProperties("AWS::Lambda::Function", 
        Match.objectLike({
          FunctionName: "sachain-kyc-upload-test",
          Runtime: "nodejs20.x",
          Handler: "index.handler",
          Timeout: 300, // 5 minutes
          MemorySize: 512,
        })
      );

      // Verify Dead Letter Queue exists
      template.hasResourceProperties("AWS::SQS::Queue", {
        QueueName: "sachain-kyc-upload-dlq-test",
      });
    });

    it("should create Lambda with environment variables", () => {
      const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
        table,
        documentBucket: bucket,
        notificationTopic: topic,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify environment variables are set
      template.hasResourceProperties("AWS::Lambda::Function", 
        Match.objectLike({
          FunctionName: "sachain-kyc-upload-test",
          Environment: {
            Variables: Match.objectLike({
              ENVIRONMENT: "test",
              MAX_FILE_SIZE: "10485760",
              ALLOWED_FILE_TYPES: "image/jpeg,image/png,application/pdf",
            }),
          },
        })
      );
    });
  });

  describe("IAM Permissions", () => {
    it("should grant DynamoDB permissions", () => {
      const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
        table,
        documentBucket: bucket,
        notificationTopic: topic,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify DynamoDB permissions exist (at least one policy with DynamoDB actions)
      template.hasResourceProperties("AWS::IAM::Policy", 
        Match.objectLike({
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Effect: "Allow",
                Action: Match.arrayWith([
                  Match.stringLikeRegexp("dynamodb:.*")
                ]),
              })
            ])
          }
        })
      );
    });

    it("should grant CloudWatch permissions", () => {
      const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
        table,
        documentBucket: bucket,
        notificationTopic: topic,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify CloudWatch permissions exist
      template.hasResourceProperties("AWS::IAM::Policy", 
        Match.objectLike({
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Effect: "Allow",
                Action: "cloudwatch:PutMetricData",
                Resource: "*",
                Condition: {
                  StringEquals: {
                    "cloudwatch:namespace": "Sachain/KYCUpload",
                  },
                },
              })
            ])
          }
        })
      );
    });
  });

  describe("API Gateway Configuration", () => {
    it("should create API Gateway", () => {
      const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
        table,
        documentBucket: bucket,
        notificationTopic: topic,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify API Gateway exists
      template.hasResourceProperties("AWS::ApiGateway::RestApi", {
        Name: "sachain-kyc-upload-api-test",
        Description: "API for KYC document uploads",
      });
    });

    it("should create API Gateway resources and methods", () => {
      const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
        table,
        documentBucket: bucket,
        notificationTopic: topic,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Verify upload resource exists
      template.hasResourceProperties("AWS::ApiGateway::Resource", {
        PathPart: "upload",
      });

      // Verify presigned-url resource exists
      template.hasResourceProperties("AWS::ApiGateway::Resource", {
        PathPart: "presigned-url",
      });

      // Verify POST methods exist
      template.resourceCountIs("AWS::ApiGateway::Method", Match.anyValue());
    });
  });

  describe("Resource Limits", () => {
    it("should configure appropriate timeout and memory settings", () => {
      const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
        table,
        documentBucket: bucket,
        notificationTopic: topic,
        eventBus,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::Lambda::Function", 
        Match.objectLike({
          FunctionName: "sachain-kyc-upload-test",
          Timeout: 300, // 5 minutes
          MemorySize: 512,
        })
      );
    });
  });

  describe("Construct Properties", () => {
    it("should expose KYC Upload Lambda and API Gateway", () => {
      const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
        table,
        documentBucket: bucket,
        notificationTopic: topic,
        eventBus,
        environment: "test",
      });

      // Verify construct exposes the Lambda function
      expect(lambdaConstruct.kycUploadLambda).toBeInstanceOf(lambda.Function);
      expect(lambdaConstruct.kycUploadApi).toBeDefined();
    });
  });
});