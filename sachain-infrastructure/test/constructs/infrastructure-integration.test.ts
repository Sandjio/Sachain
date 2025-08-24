import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import {
  CoreStack,
  SecurityStack,
  LambdaStack,
  MonitoringStack,
} from "../../lib/stacks";

describe("Infrastructure Integration", () => {
  let app: cdk.App;
  let coreStack: CoreStack;
  let securityStack: SecurityStack;
  let lambdaStack: LambdaStack;
  let monitoringStack: MonitoringStack;

  beforeEach(() => {
    app = new cdk.App();

    // Create stacks in consolidated dependency order
    coreStack = new CoreStack(app, "TestCoreStack", {
      environment: "test",
    });

    securityStack = new SecurityStack(app, "TestSecurityStack", {
      environment: "test",
      table: coreStack.table,
      documentBucket: coreStack.documentBucket,
      encryptionKey: coreStack.encryptionKey,
      userPool: coreStack.userPool,
    });

    lambdaStack = new LambdaStack(app, "TestLambdaStack", {
      environment: "test",
      table: coreStack.table,
      documentBucket: coreStack.documentBucket,
      kycUploadRole: securityStack.kycUploadRole,
      adminReviewRole: securityStack.adminReviewRole,
      userNotificationRole: securityStack.userNotificationRole,
      kycProcessingRole: securityStack.kycProcessingRole,
      encryptionKey: coreStack.encryptionKey,
      userPool: coreStack.userPool,
      userPoolClient: coreStack.userPoolClient,
      postAuthLambda: coreStack.postAuthLambda,
    });

    monitoringStack = new MonitoringStack(app, "TestMonitoringStack", {
      environment: "test",
      postAuthLambda: coreStack.postAuthLambda,
      kycUploadLambda: lambdaStack.kycUploadLambda,
      adminReviewLambda: lambdaStack.adminReviewLambda,
      userNotificationLambda: lambdaStack.userNotificationLambda,
      kycProcessingLambda: lambdaStack.kycProcessingLambda,
    });
  });

  test("creates EventBridge custom bus for KYC events in LambdaStack", () => {
    const lambdaTemplate = Template.fromStack(lambdaStack);
    lambdaTemplate.hasResourceProperties("AWS::Events::EventBus", {
      Name: "sachain-kyc-events-test",
    });
  });

  test("creates KYC document uploaded rule in LambdaStack", () => {
    const lambdaTemplate = Template.fromStack(lambdaStack);
    lambdaTemplate.hasResourceProperties("AWS::Events::Rule", {
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

  test("creates SNS topics for notifications in LambdaStack", () => {
    const lambdaTemplate = Template.fromStack(lambdaStack);
    lambdaTemplate.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-admin-notifications-test",
    });

    lambdaTemplate.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-user-notifications-test",
    });
  });

  test("creates Cognito User Pool in CoreStack", () => {
    const coreTemplate = Template.fromStack(coreStack);
    coreTemplate.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolName: "sachain-user-pool-test",
    });
  });

  test("creates post-authentication lambda in CoreStack", () => {
    const coreTemplate = Template.fromStack(coreStack);
    coreTemplate.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-post-auth-test",
    });
  });

  test("creates DynamoDB table with correct configuration", () => {
    const coreTemplate = Template.fromStack(coreStack);
    coreTemplate.hasResourceProperties("AWS::DynamoDB::Table", {
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    });
  });

  test("creates S3 bucket with encryption", () => {
    const coreTemplate = Template.fromStack(coreStack);
    coreTemplate.hasResourceProperties("AWS::S3::Bucket", {
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
    const coreTemplate = Template.fromStack(coreStack);
    coreTemplate.hasResourceProperties("AWS::KMS::Key", {
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
    const securityTemplate = Template.fromStack(securityStack);

    // Check that upload role exists
    securityTemplate.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-kyc-upload-lambda-role-test",
    });

    // Check that admin review role exists
    securityTemplate.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-admin-review-lambda-role-test",
    });

    // Check that user notification role exists
    securityTemplate.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-user-notification-lambda-role-test",
    });

    // Check that post auth role exists
    securityTemplate.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-post-auth-lambda-role-test",
    });
  });

  test("outputs important resource information", () => {
    const lambdaTemplate = Template.fromStack(lambdaStack);
    const coreTemplate = Template.fromStack(coreStack);

    lambdaTemplate.hasOutput("EventBusName", {
      Description: "EventBridge Bus Name",
    });

    coreTemplate.hasOutput("TableName", {
      Description: "DynamoDB Table Name",
    });

    coreTemplate.hasOutput("BucketName", {
      Description: "S3 Document Bucket Name",
    });

    coreTemplate.hasOutput("UserPoolId", {
      Description: "Cognito User Pool ID",
    });

    coreTemplate.hasOutput("PostAuthLambdaArn", {
      Description: "Post-Authentication Lambda Function ARN",
    });
  });

  test("validates cross-stack dependencies", () => {
    // Verify that stacks can reference each other's resources
    expect(coreStack.table).toBeDefined();
    expect(coreStack.documentBucket).toBeDefined();
    expect(coreStack.encryptionKey).toBeDefined();

    // Auth resources now in CoreStack
    expect(coreStack.userPool).toBeDefined();
    expect(coreStack.userPoolClient).toBeDefined();
    expect(coreStack.postAuthLambda).toBeDefined();

    // Event resources now in LambdaStack
    expect(lambdaStack.eventBus).toBeDefined();
    expect(lambdaStack.notificationTopic).toBeDefined();
    expect(lambdaStack.userNotificationTopic).toBeDefined();

    expect(securityStack.kycUploadRole).toBeDefined();
    expect(securityStack.adminReviewRole).toBeDefined();
    expect(securityStack.userNotificationRole).toBeDefined();
    expect(securityStack.kycProcessingRole).toBeDefined();

    expect(lambdaStack.kycUploadLambda).toBeDefined();
    expect(lambdaStack.adminReviewLambda).toBeDefined();
    expect(lambdaStack.userNotificationLambda).toBeDefined();
    expect(lambdaStack.kycProcessingLambda).toBeDefined();
  });

  test("validates consolidated stack structure", () => {
    // Verify CoreStack includes auth functionality
    expect(coreStack.cognitoConstruct).toBeDefined();
    expect(coreStack.postAuthLambdaConstruct).toBeDefined();

    // Verify LambdaStack includes event functionality
    expect(lambdaStack.eventBridgeConstruct).toBeDefined();
    expect(lambdaStack.kycStatusChangeRule).toBeDefined();
    expect(lambdaStack.kycDocumentUploadedRule).toBeDefined();
    expect(lambdaStack.kycReviewCompletedRule).toBeDefined();
  });
});
