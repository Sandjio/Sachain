import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import { Template } from "aws-cdk-lib/assertions";
import { LambdaConstruct } from "../../lib/constructs/lambda";

describe("KYC Upload Lambda Simple Tests", () => {
  it("should create Lambda construct successfully", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    const table = new dynamodb.Table(stack, "TestTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    });

    const bucket = new s3.Bucket(stack, "TestBucket");
    const topic = new sns.Topic(stack, "TestTopic");
    const eventBus = new events.EventBus(stack, "TestEventBus");

    // This should not throw an error
    const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
      table,
      documentBucket: bucket,
      notificationTopic: topic,
      eventBus,
      environment: "test",
    });

    // Verify construct was created
    expect(lambdaConstruct).toBeDefined();
    expect(lambdaConstruct.kycUploadLambda).toBeDefined();
    expect(lambdaConstruct.kycUploadApi).toBeDefined();
  });

  it("should create Lambda functions", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    const table = new dynamodb.Table(stack, "TestTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    });

    const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
      table,
      environment: "test",
    });

    const template = Template.fromStack(stack);

    // Verify that Lambda functions exist
    template.resourceCountIs("AWS::Lambda::Function", 3);
    
    // Verify that at least one function has the KYC upload name
    const functions = template.findResources("AWS::Lambda::Function");
    const functionNames = Object.values(functions).map((fn: any) => fn.Properties?.FunctionName);
    
    expect(functionNames).toContain("sachain-kyc-upload-test");
  });

  it("should create API Gateway when all props provided", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    const table = new dynamodb.Table(stack, "TestTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    });

    const bucket = new s3.Bucket(stack, "TestBucket");
    const topic = new sns.Topic(stack, "TestTopic");
    const eventBus = new events.EventBus(stack, "TestEventBus");

    const lambdaConstruct = new LambdaConstruct(stack, "TestLambda", {
      table,
      documentBucket: bucket,
      notificationTopic: topic,
      eventBus,
      environment: "test",
    });

    const template = Template.fromStack(stack);

    // Verify API Gateway exists
    template.resourceCountIs("AWS::ApiGateway::RestApi", 1);
  });
});