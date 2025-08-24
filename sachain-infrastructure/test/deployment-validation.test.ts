import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
  CoreStack,
  SecurityStack,
  LambdaStack,
  MonitoringStack,
} from "../lib/stacks";

describe("Deployment Validation Tests", () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
  });

  describe("Stack Architecture Validation", () => {
    test("should create all required stacks with correct dependencies (consolidated)", () => {
      // Create stacks in dependency order (consolidated structure)
      const coreStack = new CoreStack(app, "TestCoreStack", {
        environment: "test",
      });

      const securityStack = new SecurityStack(app, "TestSecurityStack", {
        environment: "test",
        table: coreStack.table,
        documentBucket: coreStack.documentBucket,
        encryptionKey: coreStack.encryptionKey,
        userPool: coreStack.userPool,
      });

      const lambdaStack = new LambdaStack(app, "TestLambdaStack", {
        environment: "test",
        table: coreStack.table,
        documentBucket: coreStack.documentBucket,
        encryptionKey: coreStack.encryptionKey,
        userPool: coreStack.userPool,
        userPoolClient: coreStack.userPoolClient,
        postAuthLambda: coreStack.postAuthLambda,
        kycUploadRole: securityStack.kycUploadRole,
        adminReviewRole: securityStack.adminReviewRole,
        userNotificationRole: securityStack.userNotificationRole,
        kycProcessingRole: securityStack.kycProcessingRole,
      });

      const monitoringStack = new MonitoringStack(app, "TestMonitoringStack", {
        environment: "test",
        postAuthLambda: coreStack.postAuthLambda,
        kycUploadLambda: lambdaStack.kycUploadLambda,
        adminReviewLambda: lambdaStack.adminReviewLambda,
        userNotificationLambda: lambdaStack.userNotificationLambda,
        kycProcessingLambda: lambdaStack.kycProcessingLambda,
      });

      // Verify all stacks are created (consolidated structure)
      expect(coreStack).toBeDefined();
      expect(securityStack).toBeDefined();
      expect(lambdaStack).toBeDefined();
      expect(monitoringStack).toBeDefined();

      // Verify core resources exist (including auth)
      const coreTemplate = Template.fromStack(coreStack);
      coreTemplate.resourceCountIs("AWS::DynamoDB::Table", 1);
      coreTemplate.resourceCountIs("AWS::S3::Bucket", 1);
      coreTemplate.resourceCountIs("AWS::KMS::Key", 1);
      coreTemplate.resourceCountIs("AWS::Cognito::UserPool", 1);
      coreTemplate.resourceCountIs("AWS::Cognito::UserPoolClient", 1);
      coreTemplate.resourceCountIs("AWS::Lambda::Function", 1); // Post-auth lambda

      // Verify environment tags
      coreTemplate.hasResourceProperties("AWS::DynamoDB::Table", {
        Tags: [
          { Key: "Environment", Value: "test" },
          { Key: "Project", Value: "Sachain" },
        ],
      });
    });

    test("should have proper stack outputs for cross-stack references (consolidated)", () => {
      const coreStack = new CoreStack(app, "TestCoreStack", {
        environment: "test",
      });

      const lambdaStack = new LambdaStack(app, "TestLambdaStack", {
        environment: "test",
        table: coreStack.table,
        documentBucket: coreStack.documentBucket,
        encryptionKey: coreStack.encryptionKey,
        userPool: coreStack.userPool,
        userPoolClient: coreStack.userPoolClient,
        postAuthLambda: coreStack.postAuthLambda,
        kycUploadRole: {} as any, // Mock for test
        adminReviewRole: {} as any,
        userNotificationRole: {} as any,
        kycProcessingRole: {} as any,
      });

      const coreTemplate = Template.fromStack(coreStack);
      const lambdaTemplate = Template.fromStack(lambdaStack);

      // Verify core stack outputs (including auth)
      coreTemplate.hasOutput("TableName", {
        Description: "DynamoDB Table Name",
      });

      coreTemplate.hasOutput("BucketName", {
        Description: "S3 Document Bucket Name",
      });

      coreTemplate.hasOutput("KmsKeyArn", {
        Description: "KMS Encryption Key ARN",
      });

      coreTemplate.hasOutput("UserPoolId", {
        Description: "Cognito User Pool ID",
      });

      coreTemplate.hasOutput("PostAuthLambdaArn", {
        Description: "Post Authentication Lambda ARN",
      });

      // Verify lambda stack outputs (including events)
      lambdaTemplate.hasOutput("EventBusName", {
        Description: "EventBridge Bus Name",
      });

      lambdaTemplate.hasOutput("AdminNotificationTopicArn", {
        Description: "Admin Notification SNS Topic ARN",
      });
    });

    test("should validate that existing functionality is preserved (consolidated)", () => {
      // Create complete stack architecture (consolidated)
      const coreStack = new CoreStack(app, "TestCoreStack", {
        environment: "test",
      });

      const securityStack = new SecurityStack(app, "TestSecurityStack", {
        environment: "test",
        table: coreStack.table,
        documentBucket: coreStack.documentBucket,
        encryptionKey: coreStack.encryptionKey,
        userPool: coreStack.userPool,
      });

      const lambdaStack = new LambdaStack(app, "TestLambdaStack", {
        environment: "test",
        table: coreStack.table,
        documentBucket: coreStack.documentBucket,
        encryptionKey: coreStack.encryptionKey,
        userPool: coreStack.userPool,
        userPoolClient: coreStack.userPoolClient,
        postAuthLambda: coreStack.postAuthLambda,
        kycUploadRole: securityStack.kycUploadRole,
        adminReviewRole: securityStack.adminReviewRole,
        userNotificationRole: securityStack.userNotificationRole,
        kycProcessingRole: securityStack.kycProcessingRole,
      });

      // Verify all essential resources exist
      const coreTemplate = Template.fromStack(coreStack);
      const securityTemplate = Template.fromStack(securityStack);
      const lambdaTemplate = Template.fromStack(lambdaStack);

      // Core resources (including auth)
      coreTemplate.hasResourceProperties("AWS::DynamoDB::Table", {
        BillingMode: "PAY_PER_REQUEST",
      });

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

      // Auth resources (consolidated into CoreStack)
      coreTemplate.resourceCountIs("AWS::Cognito::UserPool", 1);
      coreTemplate.resourceCountIs("AWS::Cognito::UserPoolClient", 1);
      coreTemplate.resourceCountIs("AWS::Lambda::Function", 1); // Post-auth lambda

      // Security resources
      securityTemplate.resourceCountIs("AWS::IAM::Role", 4); // Lambda roles (excluding post-auth)

      // Lambda resources (including events)
      lambdaTemplate.resourceCountIs("AWS::Lambda::Function", 4); // Lambda functions (excluding post-auth)
      lambdaTemplate.resourceCountIs("AWS::ApiGateway::RestApi", 1);
      lambdaTemplate.resourceCountIs("AWS::Events::EventBus", 1); // Event resources consolidated
      lambdaTemplate.resourceCountIs("AWS::SNS::Topic", 2); // Admin and user notifications
    });
  });
});
