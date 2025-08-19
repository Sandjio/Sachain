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

    // Verify outputs exist
    expect(template.Outputs.TableName).toBeDefined();
    expect(template.Outputs.TableArn).toBeDefined();
    expect(template.Outputs.BucketName).toBeDefined();
    expect(template.Outputs.BucketArn).toBeDefined();
    expect(template.Outputs.KmsKeyArn).toBeDefined();
    expect(template.Outputs.KmsKeyId).toBeDefined();
  });

  test("exposes correct cross-stack reference properties", () => {
    const app = new cdk.App();

    const coreStack = new CoreStack(app, "TestCoreStack", {
      environment: "test",
    });

    // Verify that all required properties are exposed
    expect(coreStack.table).toBeDefined();
    expect(coreStack.documentBucket).toBeDefined();
    expect(coreStack.encryptionKey).toBeDefined();
    expect(coreStack.dynamoDBConstruct).toBeDefined();
    expect(coreStack.s3Construct).toBeDefined();

    // Verify that the exposed resources have the correct properties
    expect(coreStack.table.tableName).toBeDefined();
    expect(coreStack.documentBucket.bucketName).toBeDefined();
    expect(coreStack.encryptionKey.keyId).toBeDefined();

    // Verify the constructs are the same instances
    expect(coreStack.table).toBe(coreStack.dynamoDBConstruct.table);
    expect(coreStack.documentBucket).toBe(coreStack.s3Construct.documentBucket);
    expect(coreStack.encryptionKey).toBe(coreStack.s3Construct.encryptionKey);
  });
});
