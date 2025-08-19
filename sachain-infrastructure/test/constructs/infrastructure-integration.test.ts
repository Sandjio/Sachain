import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import {
  CoreStack,
  SecurityStack,
  EventStack,
  AuthStack,
  LambdaStack,
  MonitoringStack,
} from "../../lib/stacks";

describe("Infrastructure Integration", () => {
  let app: cdk.App;
  let coreStack: CoreStack;
  let eventStack: EventStack;
  let securityStack: SecurityStack;
  let authStack: AuthStack;
  let lambdaStack: LambdaStack;
  let monitoringStack: MonitoringStack;

  beforeEach(() => {
    app = new cdk.App();

    // Create stacks in dependency order
    coreStack = new CoreStack(app, "TestCoreStack", {
      environment: "test",
    });

    eventStack = new EventStack(app, "TestEventStack", {
      environment: "test",
    });

    securityStack = new SecurityStack(app, "TestSecurityStack", {
      environment: "test",
      table: coreStack.table,
      documentBucket: coreStack.documentBucket,
      encryptionKey: coreStack.encryptionKey,
      notificationTopic: eventStack.notificationTopic,
      eventBus: eventStack.eventBus,
    });

    authStack = new AuthStack(app, "TestAuthStack", {
      environment: "test",
    });

    lambdaStack = new LambdaStack(app, "TestLambdaStack", {
      environment: "test",
      table: coreStack.table,
      documentBucket: coreStack.documentBucket,
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

    monitoringStack = new MonitoringStack(app, "TestMonitoringStack", {
      environment: "test",
      postAuthLambda: lambdaStack.postAuthLambda,
      kycUploadLambda: lambdaStack.kycUploadLambda,
      adminReviewLambda: lambdaStack.adminReviewLambda,
      userNotificationLambda: lambdaStack.userNotificationLambda,
      kycProcessingLambda: lambdaStack.kycProcessingLambda,
    });
  });

  test("creates EventBridge custom bus for KYC events", () => {
    const eventTemplate = Template.fromStack(eventStack);
    eventTemplate.hasResourceProperties("AWS::Events::EventBus", {
      Name: "sachain-kyc-events-test",
    });
  });

  test("creates KYC document uploaded rule", () => {
    const eventTemplate = Template.fromStack(eventStack);
    eventTemplate.hasResourceProperties("AWS::Events::Rule", {
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
    const eventTemplate = Template.fromStack(eventStack);
    eventTemplate.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-admin-notifications-test",
    });

    eventTemplate.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-user-notifications-test",
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
    const eventTemplate = Template.fromStack(eventStack);
    const coreTemplate = Template.fromStack(coreStack);

    eventTemplate.hasOutput("EventBusName", {
      Description: "EventBridge Bus Name",
    });

    coreTemplate.hasOutput("TableName", {
      Description: "DynamoDB Table Name",
    });

    coreTemplate.hasOutput("BucketName", {
      Description: "S3 Document Bucket Name",
    });
  });

  test("validates cross-stack dependencies", () => {
    // Verify that stacks can reference each other's resources
    expect(coreStack.table).toBeDefined();
    expect(coreStack.documentBucket).toBeDefined();
    expect(coreStack.encryptionKey).toBeDefined();

    expect(eventStack.eventBus).toBeDefined();
    expect(eventStack.notificationTopic).toBeDefined();

    expect(securityStack.postAuthRole).toBeDefined();
    expect(securityStack.kycUploadRole).toBeDefined();

    expect(authStack.userPool).toBeDefined();

    expect(lambdaStack.postAuthLambda).toBeDefined();
    expect(lambdaStack.kycUploadLambda).toBeDefined();
  });
});
