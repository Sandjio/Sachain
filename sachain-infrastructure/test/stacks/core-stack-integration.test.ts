import * as cdk from "aws-cdk-lib";
import { CoreStack } from "../../lib/stacks/core-stack";

describe("CoreStack Integration", () => {
  test("can be synthesized without errors", () => {
    const app = new cdk.App();

    // Create the CoreStack
    const coreStack = new CoreStack(app, "TestCoreStack", {
      environment: "test",
      env: {
        account: "123456789012",
        region: "us-east-1",
      },
    });

    // Synthesize the stack to CloudFormation template
    const template = app.synth().getStackByName(coreStack.stackName).template;

    // Verify that the template contains the expected resources
    expect(template.Resources).toBeDefined();
    expect(template.Outputs).toBeDefined();

    // Verify DynamoDB table exists
    const dynamoTables = Object.values(template.Resources).filter(
      (resource: any) => resource.Type === "AWS::DynamoDB::Table"
    );
    expect(dynamoTables).toHaveLength(1);

    // Verify S3 bucket exists
    const s3Buckets = Object.values(template.Resources).filter(
      (resource: any) => resource.Type === "AWS::S3::Bucket"
    );
    expect(s3Buckets).toHaveLength(1);

    // Verify KMS key exists
    const kmsKeys = Object.values(template.Resources).filter(
      (resource: any) => resource.Type === "AWS::KMS::Key"
    );
    expect(kmsKeys).toHaveLength(1);

    // Verify core outputs exist
    expect(template.Outputs.TableName).toBeDefined();
    expect(template.Outputs.TableArn).toBeDefined();
    expect(template.Outputs.BucketName).toBeDefined();
    expect(template.Outputs.BucketArn).toBeDefined();
    expect(template.Outputs.KmsKeyArn).toBeDefined();
    expect(template.Outputs.KmsKeyId).toBeDefined();

    // Verify auth outputs exist (consolidated from AuthStack)
    expect(template.Outputs.UserPoolId).toBeDefined();
    expect(template.Outputs.UserPoolArn).toBeDefined();
    expect(template.Outputs.UserPoolClientId).toBeDefined();
    expect(template.Outputs.UserPoolDomain).toBeDefined();
    expect(template.Outputs.PostAuthLambdaArn).toBeDefined();
  });

  test("exposes correct cross-stack reference properties", () => {
    const app = new cdk.App();

    const coreStack = new CoreStack(app, "TestCoreStack", {
      environment: "test",
    });

    // Verify that all required core properties are exposed
    expect(coreStack.table).toBeDefined();
    expect(coreStack.documentBucket).toBeDefined();
    expect(coreStack.encryptionKey).toBeDefined();
    expect(coreStack.dynamoDBConstruct).toBeDefined();
    expect(coreStack.s3Construct).toBeDefined();

    // Verify that auth properties are exposed (consolidated from AuthStack)
    expect(coreStack.userPool).toBeDefined();
    expect(coreStack.userPoolClient).toBeDefined();
    expect(coreStack.userPoolId).toBeDefined();
    expect(coreStack.userPoolArn).toBeDefined();
    expect(coreStack.userPoolClientId).toBeDefined();
    expect(coreStack.userPoolDomain).toBeDefined();
    expect(coreStack.cognitoConstruct).toBeDefined();

    // Verify that post-auth lambda properties are exposed
    expect(coreStack.postAuthLambda).toBeDefined();
    expect(coreStack.postAuthLambdaArn).toBeDefined();
    expect(coreStack.postAuthLambdaConstruct).toBeDefined();

    // Verify that the exposed resources have the correct properties
    expect(coreStack.table.tableName).toBeDefined();
    expect(coreStack.documentBucket.bucketName).toBeDefined();
    expect(coreStack.encryptionKey.keyId).toBeDefined();
    expect(coreStack.userPool.userPoolId).toBeDefined();
    expect(coreStack.userPoolClient.userPoolClientId).toBeDefined();
    expect(coreStack.postAuthLambda.functionArn).toBeDefined();

    // Verify the constructs are the same instances
    expect(coreStack.table).toBe(coreStack.dynamoDBConstruct.table);
    expect(coreStack.documentBucket).toBe(coreStack.s3Construct.documentBucket);
    expect(coreStack.encryptionKey).toBe(coreStack.s3Construct.encryptionKey);
    expect(coreStack.userPool).toBe(coreStack.cognitoConstruct.userPool);
    expect(coreStack.userPoolClient).toBe(
      coreStack.cognitoConstruct.userPoolClient
    );
    expect(coreStack.postAuthLambda).toBe(
      coreStack.postAuthLambdaConstruct.postAuthLambda
    );
  });

  test("auth resources are properly integrated", () => {
    const app = new cdk.App();

    const coreStack = new CoreStack(app, "TestCoreStack", {
      environment: "test",
    });

    // Synthesize to verify integration
    const template = app.synth().getStackByName(coreStack.stackName).template;

    // Verify Cognito resources exist
    const userPools = Object.values(template.Resources).filter(
      (resource: any) => resource.Type === "AWS::Cognito::UserPool"
    );
    expect(userPools).toHaveLength(1);

    const userPoolClients = Object.values(template.Resources).filter(
      (resource: any) => resource.Type === "AWS::Cognito::UserPoolClient"
    );
    expect(userPoolClients).toHaveLength(1);

    const userPoolDomains = Object.values(template.Resources).filter(
      (resource: any) => resource.Type === "AWS::Cognito::UserPoolDomain"
    );
    expect(userPoolDomains).toHaveLength(1);

    // Verify post-auth lambda exists
    const lambdaFunctions = Object.values(template.Resources).filter(
      (resource: any) => resource.Type === "AWS::Lambda::Function"
    );
    const postAuthLambda = lambdaFunctions.find(
      (fn: any) => fn.Properties.FunctionName === "sachain-post-auth-test"
    );
    expect(postAuthLambda).toBeDefined();

    // Verify auth-related outputs
    expect(template.Outputs.UserPoolId).toBeDefined();
    expect(template.Outputs.UserPoolArn).toBeDefined();
    expect(template.Outputs.UserPoolClientId).toBeDefined();
    expect(template.Outputs.UserPoolDomain).toBeDefined();
    expect(template.Outputs.PostAuthLambdaArn).toBeDefined();
  });
});
