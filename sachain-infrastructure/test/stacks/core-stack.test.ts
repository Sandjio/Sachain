import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { CoreStack } from "../../lib/stacks/core-stack";

describe("CoreStack", () => {
  let app: cdk.App;
  let stack: CoreStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new CoreStack(app, "TestCoreStack", {
      environment: "test",
    });
    template = Template.fromStack(stack);
  });

  test("creates DynamoDB table with correct configuration", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "sachain-kyc-table-test",
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        {
          AttributeName: "PK",
          AttributeType: "S",
        },
        {
          AttributeName: "SK",
          AttributeType: "S",
        },
        {
          AttributeName: "GSI1PK",
          AttributeType: "S",
        },
        {
          AttributeName: "GSI1SK",
          AttributeType: "S",
        },
        {
          AttributeName: "GSI2PK",
          AttributeType: "S",
        },
        {
          AttributeName: "GSI2SK",
          AttributeType: "S",
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [
            {
              AttributeName: "GSI1PK",
              KeyType: "HASH",
            },
            {
              AttributeName: "GSI1SK",
              KeyType: "RANGE",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
        },
        {
          IndexName: "GSI2",
          KeySchema: [
            {
              AttributeName: "GSI2PK",
              KeyType: "HASH",
            },
            {
              AttributeName: "GSI2SK",
              KeyType: "RANGE",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
        },
      ],
    });
  });

  test("creates S3 bucket with encryption", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "aws:kms",
            },
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: {
        Status: "Enabled",
      },
    });
  });

  test("creates KMS key with key rotation enabled", () => {
    template.hasResourceProperties("AWS::KMS::Key", {
      Description: "KYC document encryption key for test",
      EnableKeyRotation: true,
      KeySpec: "SYMMETRIC_DEFAULT",
      KeyUsage: "ENCRYPT_DECRYPT",
    });
  });

  test("creates stack outputs for cross-stack references", () => {
    template.hasOutput("TableName", {
      Description: "DynamoDB Table Name",
      Export: {
        Name: "test-sachain-table-name",
      },
    });

    template.hasOutput("TableArn", {
      Description: "DynamoDB Table ARN",
      Export: {
        Name: "test-sachain-table-arn",
      },
    });

    template.hasOutput("BucketName", {
      Description: "S3 Document Bucket Name",
      Export: {
        Name: "test-sachain-bucket-name",
      },
    });

    template.hasOutput("BucketArn", {
      Description: "S3 Document Bucket ARN",
      Export: {
        Name: "test-sachain-bucket-arn",
      },
    });

    template.hasOutput("KmsKeyArn", {
      Description: "KMS Encryption Key ARN",
      Export: {
        Name: "test-sachain-kms-key-arn",
      },
    });

    template.hasOutput("KmsKeyId", {
      Description: "KMS Encryption Key ID",
      Export: {
        Name: "test-sachain-kms-key-id",
      },
    });
  });

  test("applies correct tags", () => {
    // Check that the table has the expected tags (order may vary)
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      Tags: [
        {
          Key: "Component",
          Value: "DynamoDB",
        },
        {
          Key: "Environment",
          Value: "test",
        },
        {
          Key: "Project",
          Value: "Sachain",
        },
        {
          Key: "Purpose",
          Value: "KYC-UserData",
        },
      ],
    });
  });

  test("exposes resources for cross-stack references", () => {
    expect(stack.table).toBeDefined();
    expect(stack.documentBucket).toBeDefined();
    expect(stack.encryptionKey).toBeDefined();
    expect(stack.dynamoDBConstruct).toBeDefined();
    expect(stack.s3Construct).toBeDefined();
  });
});
