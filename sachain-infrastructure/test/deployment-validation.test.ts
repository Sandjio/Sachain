import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
  CoreStack,
  SecurityStack,
  EventStack,
  AuthStack,
  LambdaStack,
  MonitoringStack,
} from "../lib/stacks";

describe("Deployment Validation Tests", () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
  });

  describe("Stack Architecture Validation", () => {
    test("should create all required stacks with correct dependencies", () => {
      // Create stacks in dependency order
      const coreStack = new CoreStack(app, "TestCoreStack", {
        environment: "test",
      });

      const eventStack = new EventStack(app, "TestEventStack", {
        environment: "test",
      });

      const securityStack = new SecurityStack(app, "TestSecurityStack", {
        environment: "test",
        table: coreStack.table,
        documentBucket: coreStack.documentBucket,
        encryptionKey: coreStack.encryptionKey,
        notificationTopic: eventStack.notificationTopic,
        eventBus: eventStack.eventBus,
      });

      const authStack = new AuthStack(app, "TestAuthStack", {
        environment: "test",
      });

      const lambdaStack = new LambdaStack(app, "TestLambdaStack", {
        environment: "test",
        table: coreStack.table,
        documentBucket: coreStack.documentBucket,
        encryptionKey: coreStack.encryptionKey,
        postAuthRole: securityStack.postAuthRole,
        kycUploadRole: securityStack.kycUploadRole,
        adminReviewRole: securityStack.adminReviewRole,
        userNotificationRole: securityStack.userNotificationRole,
        kycProcessingRole: securityStack.kycProcessingRole,
        eventBus: eventStack.eventBus,
        notificationTopic: eventStack.notificationTopic,
        kycDocumentUploadedRule: eventStack.kycDocumentUploadedRule,
        kycStatusChangeRule: eventStack.kycStatusChangeRule,
        userPool: authStack.userPool,
      });

      const monitoringStack = new MonitoringStack(app, "TestMonitoringStack", {
        environment: "test",
        postAuthLambda: lambdaStack.postAuthLambda,
        kycUploadLambda: lambdaStack.kycUploadLambda,
        adminReviewLambda: lambdaStack.adminReviewLambda,
        userNotificationLambda: lambdaStack.userNotificationLambda,
        kycProcessingLambda: lambdaStack.kycProcessingLambda,
      });

      // Verify all stacks are created
      expect(coreStack).toBeDefined();
      expect(eventStack).toBeDefined();
      expect(securityStack).toBeDefined();
      expect(authStack).toBeDefined();
      expect(lambdaStack).toBeDefined();
      expect(monitoringStack).toBeDefined();

      // Verify core resources exist
      const coreTemplate = Template.fromStack(coreStack);
      coreTemplate.resourceCountIs("AWS::DynamoDB::Table", 1);
      coreTemplate.resourceCountIs("AWS::S3::Bucket", 1);
      coreTemplate.resourceCountIs("AWS::KMS::Key", 1);

      // Verify environment tags
      coreTemplate.hasResourceProperties("AWS::DynamoDB::Table", {
        Tags: [
          { Key: "Environment", Value: "test" },
          { Key: "Project", Value: "Sachain" },
        ],
      });
    });

    test("should have proper stack outputs for cross-stack references", () => {
      const coreStack = new CoreStack(app, "TestCoreStack", {
        environment: "test",
      });

      const eventStack = new EventStack(app, "TestEventStack", {
        environment: "test",
      });

      const coreTemplate = Template.fromStack(coreStack);
      const eventTemplate = Template.fromStack(eventStack);

      // Verify core stack outputs
      coreTemplate.hasOutput("TableName", {
        Description: "DynamoDB Table Name",
      });

      coreTemplate.hasOutput("BucketName", {
        Description: "S3 Document Bucket Name",
      });

      coreTemplate.hasOutput("KmsKeyArn", {
        Description: "KMS Encryption Key ARN",
      });

      // Verify event stack outputs
      eventTemplate.hasOutput("EventBusName", {
        Description: "EventBridge Bus Name",
      });

      eventTemplate.hasOutput("AdminNotificationTopicArn", {
        Description: "Admin Notification SNS Topic ARN",
      });
    });

    test("should validate that existing functionality is preserved", () => {
      // Create complete stack architecture
      const coreStack = new CoreStack(app, "TestCoreStack", {
        environment: "test",
      });

      const eventStack = new EventStack(app, "TestEventStack", {
        environment: "test",
      });

      const securityStack = new SecurityStack(app, "TestSecurityStack", {
        environment: "test",
        table: coreStack.table,
        documentBucket: coreStack.documentBucket,
        encryptionKey: coreStack.encryptionKey,
        notificationTopic: eventStack.notificationTopic,
        eventBus: eventStack.eventBus,
      });

      const authStack = new AuthStack(app, "TestAuthStack", {
        environment: "test",
      });

      const lambdaStack = new LambdaStack(app, "TestLambdaStack", {
        environment: "test",
        table: coreStack.table,
        documentBucket: coreStack.documentBucket,
        encryptionKey: coreStack.encryptionKey,
        postAuthRole: securityStack.postAuthRole,
        kycUploadRole: securityStack.kycUploadRole,
        adminReviewRole: securityStack.adminReviewRole,
        userNotificationRole: securityStack.userNotificationRole,
        kycProcessingRole: securityStack.kycProcessingRole,
        eventBus: eventStack.eventBus,
        notificationTopic: eventStack.notificationTopic,
        kycDocumentUploadedRule: eventStack.kycDocumentUploadedRule,
        kycStatusChangeRule: eventStack.kycStatusChangeRule,
        userPool: authStack.userPool,
      });

      // Verify all essential resources exist
      const coreTemplate = Template.fromStack(coreStack);
      const eventTemplate = Template.fromStack(eventStack);
      const securityTemplate = Template.fromStack(securityStack);
      const authTemplate = Template.fromStack(authStack);
      const lambdaTemplate = Template.fromStack(lambdaStack);

      // Core resources
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

      // Event resources
      eventTemplate.resourceCountIs("AWS::Events::EventBus", 1);
      eventTemplate.resourceCountIs("AWS::SNS::Topic", 2); // Admin and user notifications

      // Security resources
      securityTemplate.resourceCountIs("AWS::IAM::Role", 5); // All Lambda roles

      // Auth resources
      authTemplate.resourceCountIs("AWS::Cognito::UserPool", 1);
      authTemplate.resourceCountIs("AWS::Cognito::UserPoolClient", 1);

      // Lambda resources
      lambdaTemplate.resourceCountIs("AWS::Lambda::Function", 5); // All Lambda functions
      lambdaTemplate.resourceCountIs("AWS::ApiGateway::RestApi", 1);
    });
  });
});
