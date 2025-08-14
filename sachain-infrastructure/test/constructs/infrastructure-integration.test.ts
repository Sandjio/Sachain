import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { SachainInfrastructureStack } from "../../lib/sachain-infrastructure-stack";

describe("Infrastructure Integration", () => {
  let app: cdk.App;
  let stack: SachainInfrastructureStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new SachainInfrastructureStack(app, "TestStack", {
      environment: "test",
    });
    template = Template.fromStack(stack);
  });

  test("creates EventBridge custom bus for KYC events", () => {
    template.hasResourceProperties("AWS::Events::EventBus", {
      Name: "sachain-kyc-events-test",
    });
  });

  test("creates KYC document uploaded rule", () => {
    template.hasResourceProperties("AWS::Events::Rule", {
      Name: "sachain-kyc-document-uploaded-test",
      EventPattern: {
        source: ["sachain.kyc"],
        "detail-type": ["KYC Document Uploaded"],
        detail: {
          eventType: ["KYC_DOCUMENT_UPLOADED"],
        },
      },
    });
  });

  test("creates SNS topics for notifications", () => {
    template.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-admin-notifications-test",
    });

    template.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-user-notifications-test",
    });
  });

  test("creates DynamoDB table with correct configuration", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
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
    });
  });

  test("creates KMS key for encryption", () => {
    template.hasResourceProperties("AWS::KMS::Key", {
      KeyPolicy: {
        Statement: Match.arrayWith([
          {
            Effect: "Allow",
            Principal: { AWS: Match.anyValue() },
            Action: "kms:*",
            Resource: "*",
          },
        ]),
      },
    });
  });

  test("creates IAM roles with least privilege", () => {
    // Check that upload role exists
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-kyc-upload-lambda-role-test",
    });

    // Check that admin review role exists
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-admin-review-lambda-role-test",
    });

    // Check that user notification role exists
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-user-notification-lambda-role-test",
    });

    // Check that post auth role exists
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-post-auth-lambda-role-test",
    });
  });

  test("outputs important resource information", () => {
    template.hasOutput("EventBusName", {
      Description: "EventBridge Bus Name",
    });

    template.hasOutput("DynamoDBTableName", {
      Description: "DynamoDB Table Name",
    });

    template.hasOutput("S3BucketName", {
      Description: "S3 Document Bucket Name",
    });
  });
});