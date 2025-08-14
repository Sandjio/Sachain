import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import { Template, Match } from "aws-cdk-lib/assertions";
import { LambdaConstruct } from "../../lib/constructs/lambda";
import { SecurityConstruct } from "../../lib/constructs/security";
import * as kms from "aws-cdk-lib/aws-kms";

describe("KYC Processing Lambda Construct", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create dependencies
    const table = new dynamodb.Table(stack, "TestTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    });

    const encryptionKey = new kms.Key(stack, "TestKey");
    const documentBucket = new s3.Bucket(stack, "TestBucket", {
      encryptionKey,
    });

    const eventBus = new events.EventBus(stack, "TestEventBus");
    const notificationTopic = new sns.Topic(stack, "TestTopic");

    const securityConstruct = new SecurityConstruct(stack, "Security", {
      environment: "test",
      table,
      documentBucket,
      encryptionKey,
      notificationTopic,
      eventBus,
    });

    // Create Lambda construct
    new LambdaConstruct(stack, "Lambda", {
      table,
      documentBucket,
      environment: "test",
      securityConstruct,
      eventBus,
      notificationTopic,
    });

    template = Template.fromStack(stack);
  });

  test("creates KYC processing Lambda with correct configuration", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-kyc-processing-test",
      Runtime: "nodejs20.x",
      Handler: "index.handler",
      Timeout: 120,
      MemorySize: 512,
    });
  });

  test("configures processing Lambda environment variables", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-kyc-processing-test",
      Environment: {
        Variables: {
          TABLE_NAME: { Ref: Match.anyValue() },
          SNS_TOPIC_ARN: { Ref: Match.anyValue() },
          ENVIRONMENT: "test",
          ADMIN_PORTAL_URL: "https://admin.sachain-test.com",
        },
      },
    });
  });

  test("creates dead letter queue for processing Lambda", () => {
    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "sachain-kyc-processing-dlq-test",
      MessageRetentionPeriod: 1209600, // 14 days
    });
  });

  test("enables X-Ray tracing for processing Lambda", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-kyc-processing-test",
      TracingConfig: {
        Mode: "Active",
      },
    });
  });

  test("processing Lambda has correct IAM role", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-kyc-processing-test",
      Role: {
        "Fn::GetAtt": [Match.stringLikeRegexp(".*KycProcessingLambdaRole.*"), "Arn"],
      },
    });
  });
});