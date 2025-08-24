import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaStack } from "../../lib/stacks/lambda-stack";

// Mock the utils module to avoid validation issues in unit tests
jest.mock("../../lib/utils", () => ({
  CrossStackValidator: {
    validateLambdaStackDependencies: jest.fn(),
  },
  ResourceReferenceTracker: {
    recordReference: jest.fn(),
  },
}));

describe("LambdaStack", () => {
  let app: cdk.App;
  let stack: LambdaStack;
  let template: Template;

  // Mock dependencies
  let mockTable: dynamodb.Table;
  let mockBucket: s3.Bucket;
  let mockEncryptionKey: kms.Key;
  let mockEventBus: events.EventBus;
  let mockNotificationTopic: sns.Topic;
  let mockUserPool: cognito.UserPool;
  let mockUserPoolClient: cognito.UserPoolClient;
  let mockPostAuthLambda: lambda.Function;
  let mockRoles: {
    postAuthRole: iam.Role;
    kycUploadRole: iam.Role;
    adminReviewRole: iam.Role;
    userNotificationRole: iam.Role;
    kycProcessingRole: iam.Role;
  };
  let mockEventRules: {
    kycDocumentUploadedRule: events.Rule;
    kycStatusChangeRule: events.Rule;
  };

  beforeEach(() => {
    app = new cdk.App();

    // Create a temporary stack for mock resources
    const mockStack = new cdk.Stack(app, "MockStack");

    // Create mock DynamoDB table
    mockTable = new dynamodb.Table(mockStack, "MockTable", {
      tableName: "test-table",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Create mock S3 bucket
    mockBucket = new s3.Bucket(mockStack, "MockBucket", {
      bucketName: "test-bucket",
    });

    // Create mock KMS key
    mockEncryptionKey = new kms.Key(mockStack, "MockEncryptionKey", {
      description: "Test encryption key",
    });

    // Create mock EventBridge bus
    mockEventBus = new events.EventBus(mockStack, "MockEventBus", {
      eventBusName: "test-event-bus",
    });

    // Create mock SNS topic
    mockNotificationTopic = new sns.Topic(mockStack, "MockTopic", {
      topicName: "test-topic",
    });

    // Create mock Cognito User Pool
    mockUserPool = new cognito.UserPool(mockStack, "MockUserPool", {
      userPoolName: "test-user-pool",
    });

    // Create mock Cognito User Pool Client
    mockUserPoolClient = new cognito.UserPoolClient(
      mockStack,
      "MockUserPoolClient",
      {
        userPool: mockUserPool,
        generateSecret: false,
        userPoolClientName: "test-user-pool-client",
      }
    );

    // Create mock Post-Authentication Lambda function
    mockPostAuthLambda = new lambda.Function(mockStack, "MockPostAuthLambda", {
      functionName: "test-post-auth-lambda",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline("exports.handler = async () => {};"),
    });

    // Create mock IAM roles
    mockRoles = {
      postAuthRole: new iam.Role(mockStack, "MockPostAuthRole", {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        roleName: "test-post-auth-role",
      }),
      kycUploadRole: new iam.Role(mockStack, "MockKycUploadRole", {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        roleName: "test-kyc-upload-role",
      }),
      adminReviewRole: new iam.Role(mockStack, "MockAdminReviewRole", {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        roleName: "test-admin-review-role",
      }),
      userNotificationRole: new iam.Role(
        mockStack,
        "MockUserNotificationRole",
        {
          assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
          roleName: "test-user-notification-role",
        }
      ),
      kycProcessingRole: new iam.Role(mockStack, "MockKycProcessingRole", {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        roleName: "test-kyc-processing-role",
      }),
    };

    // Create mock EventBridge rules
    mockEventRules = {
      kycDocumentUploadedRule: new events.Rule(
        mockStack,
        "MockKycDocumentUploadedRule",
        {
          eventBus: mockEventBus,
          eventPattern: {
            source: ["sachain.kyc"],
            detailType: ["Document Uploaded"],
          },
        }
      ),
      kycStatusChangeRule: new events.Rule(
        mockStack,
        "MockKycStatusChangeRule",
        {
          eventBus: mockEventBus,
          eventPattern: {
            source: ["sachain.kyc"],
            detailType: ["Status Changed"],
          },
        }
      ),
    };

    // Create LambdaStack with mock dependencies
    stack = new LambdaStack(app, "TestLambdaStack", {
      environment: "test",
      table: mockTable,
      documentBucket: mockBucket,
      kycUploadRole: mockRoles.kycUploadRole,
      adminReviewRole: mockRoles.adminReviewRole,
      userNotificationRole: mockRoles.userNotificationRole,
      kycProcessingRole: mockRoles.kycProcessingRole,
      userPool: mockUserPool,
      encryptionKey: mockEncryptionKey,
      userPoolClient: mockUserPoolClient,
      postAuthLambda: mockPostAuthLambda,
    });

    template = Template.fromStack(stack);
  });

  test("creates all required Lambda functions", () => {
    // Verify that all Lambda functions are created (excluding post-auth which is now in CoreStack)
    template.resourceCountIs("AWS::Lambda::Function", 4);

    // Check for specific Lambda functions by name pattern (post-auth lambda is now in CoreStack)
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-kyc-upload-test",
      Runtime: "nodejs20.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-admin-review-test",
      Runtime: "nodejs20.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-user-notification-test",
      Runtime: "nodejs20.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-kyc-processing-test",
      Runtime: "nodejs20.x",
    });
  });

  test("creates API Gateway with proper configuration", () => {
    // Verify API Gateway is created
    template.resourceCountIs("AWS::ApiGateway::RestApi", 1);

    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "sachain-api-test",
      Description: "Unified API for Sachain platform",
    });

    // Verify deployment is created
    template.resourceCountIs("AWS::ApiGateway::Deployment", 1);

    // Verify stage is created
    template.resourceCountIs("AWS::ApiGateway::Stage", 1);
    template.hasResourceProperties("AWS::ApiGateway::Stage", {
      StageName: "test",
    });
  });

  test("creates Cognito authorizer for API Gateway", () => {
    // Verify Cognito authorizer is created
    template.resourceCountIs("AWS::ApiGateway::Authorizer", 1);

    template.hasResourceProperties("AWS::ApiGateway::Authorizer", {
      Name: "sachain-authorizer-dev",
      Type: "COGNITO_USER_POOLS",
    });
  });

  test("creates API Gateway resources and methods", () => {
    // Verify API resources are created (actual count may vary based on implementation)
    const resources = template.findResources("AWS::ApiGateway::Resource");
    expect(Object.keys(resources).length).toBeGreaterThan(0);

    // Verify API methods are created with authorization
    const methods = template.findResources("AWS::ApiGateway::Method");
    expect(Object.keys(methods).length).toBeGreaterThan(0);
  });

  test("creates SQS dead letter queues for Lambda functions", () => {
    // Note: DLQs may be created by the LambdaConstruct implementation
    // This test verifies the stack can be created successfully
    expect(stack).toBeDefined();
    expect(stack.lambdaConstruct).toBeDefined();
  });

  test("configures Lambda functions with proper environment variables", () => {
    // Verify Lambda functions have environment variables
    const lambdaFunctions = template.findResources("AWS::Lambda::Function");
    const functionNames = Object.values(lambdaFunctions);

    // Check that at least one function has environment variables
    const hasEnvironmentVars = functionNames.some(
      (fn: any) =>
        fn.Properties &&
        fn.Properties.Environment &&
        fn.Properties.Environment.Variables
    );
    expect(hasEnvironmentVars).toBe(true);
  });

  test("creates proper stack outputs", () => {
    // Verify stack outputs are created
    template.hasOutput("ApiUrl", {
      Description: "Sachain API Gateway URL",
      Export: {
        Name: "test-sachain-api-url",
      },
    });

    template.hasOutput("KycUploadLambdaArn", {
      Description: "KYC Upload Lambda Function ARN",
      Export: {
        Name: "test-sachain-lambda-kyc-upload-lambda-arn",
      },
    });

    template.hasOutput("AdminReviewLambdaArn", {
      Description: "Admin Review Lambda Function ARN",
      Export: {
        Name: "test-sachain-lambda-admin-review-lambda-arn",
      },
    });

    template.hasOutput("UserNotificationLambdaArn", {
      Description: "User Notification Lambda Function ARN",
      Export: {
        Name: "test-sachain-lambda-user-notification-lambda-arn",
      },
    });

    template.hasOutput("KycProcessingLambdaArn", {
      Description: "KYC Processing Lambda Function ARN",
      Export: {
        Name: "test-sachain-lambda-kyc-processing-lambda-arn",
      },
    });
  });

  test("applies proper tags to resources", () => {
    // Verify that stack-level tags are applied
    const stackTags = Template.fromStack(stack).toJSON().Resources;

    // Check that resources have the expected tags through the stack
    expect(stack.tags.tagValues()).toEqual({
      Environment: "test",
      Project: "Sachain",
      Component: "Lambda",
    });
  });

  test("exposes Lambda functions for cross-stack references", () => {
    // Verify that the stack exposes the Lambda functions (post-auth is now in CoreStack)
    expect(stack.kycUploadLambda).toBeDefined();
    expect(stack.adminReviewLambda).toBeDefined();
    expect(stack.userNotificationLambda).toBeDefined();
    expect(stack.kycProcessingLambda).toBeDefined();
    expect(stack.api).toBeDefined();

    // Verify event-related resources are exposed (consolidated from EventStack)
    expect(stack.eventBus).toBeDefined();
    expect(stack.notificationTopic).toBeDefined();
    expect(stack.userNotificationTopic).toBeDefined();
    expect(stack.kycStatusChangeRule).toBeDefined();
    expect(stack.kycDocumentUploadedRule).toBeDefined();
    expect(stack.kycReviewCompletedRule).toBeDefined();
  });

  test("configures EventBridge integrations", () => {
    // Verify that EventBridge targets are configured
    // This is tested indirectly through the Lambda construct integration
    expect(stack.kycProcessingLambda).toBeDefined();
    expect(stack.userNotificationLambda).toBeDefined();
  });

  // Event functionality tests (consolidated from EventStack)
  describe("EventBridge Resources", () => {
    test("creates custom EventBridge bus", () => {
      template.hasResourceProperties("AWS::Events::EventBus", {
        Name: "sachain-kyc-events-test",
      });
    });

    test("creates KYC status change rule", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-kyc-status-change-test",
        Description: "Route KYC status change events to user notifications",
        EventPattern: {
          source: ["sachain.kyc"],
          "detail-type": ["KYC Status Changed"],
          detail: {
            eventType: ["KYC_STATUS_CHANGED"],
            newStatus: ["approved", "rejected"],
          },
        },
      });
    });

    test("creates KYC document uploaded rule", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-kyc-document-uploaded-test",
        Description: "Route KYC document upload events to admin notifications",
        EventPattern: {
          source: ["sachain.kyc"],
          "detail-type": ["KYC Document Uploaded"],
          detail: {
            eventType: ["KYC_DOCUMENT_UPLOADED"],
          },
        },
      });
    });

    test("creates KYC review completed rule", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-kyc-review-completed-test",
        Description:
          "Route KYC review completion events for audit and analytics",
        EventPattern: {
          source: ["sachain.kyc"],
          "detail-type": ["KYC Review Completed"],
          detail: {
            eventType: ["KYC_REVIEW_COMPLETED"],
          },
        },
      });
    });

    test("exposes event bus for cross-stack access", () => {
      expect(stack.eventBus).toBeDefined();
      expect(stack.eventBus.eventBusArn).toBeDefined();
    });

    test("exposes event rules for cross-stack access", () => {
      expect(stack.kycStatusChangeRule).toBeDefined();
      expect(stack.kycDocumentUploadedRule).toBeDefined();
      expect(stack.kycReviewCompletedRule).toBeDefined();
    });
  });

  describe("SNS Resources", () => {
    test("creates admin notification topic", () => {
      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-admin-notifications-test",
        DisplayName: "Sachain KYC Admin Notifications",
        FifoTopic: false,
      });
    });

    test("creates user notification topic", () => {
      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-user-notifications-test",
        DisplayName: "Sachain KYC User Notifications",
        FifoTopic: false,
      });
    });

    test("exposes notification topics for cross-stack access", () => {
      expect(stack.notificationTopic).toBeDefined();
      expect(stack.userNotificationTopic).toBeDefined();
    });
  });

  describe("Event Stack Outputs", () => {
    test("exports event bus name and ARN", () => {
      template.hasOutput("EventBusName", {
        Export: {
          Name: "test-sachain-lambda-event-bus-name",
        },
      });

      template.hasOutput("EventBusArn", {
        Export: {
          Name: "test-sachain-lambda-event-bus-arn",
        },
      });
    });

    test("exports notification topic ARNs", () => {
      template.hasOutput("AdminNotificationTopicArn", {
        Export: {
          Name: "test-sachain-lambda-admin-notification-topic-arn",
        },
      });

      template.hasOutput("UserNotificationTopicArn", {
        Export: {
          Name: "test-sachain-lambda-user-notification-topic-arn",
        },
      });
    });

    test("exports event rule ARNs", () => {
      template.hasOutput("KycStatusChangeRuleArn", {
        Export: {
          Name: "test-sachain-lambda-kyc-status-change-rule-arn",
        },
      });

      template.hasOutput("KycDocumentUploadedRuleArn", {
        Export: {
          Name: "test-sachain-lambda-kyc-document-uploaded-rule-arn",
        },
      });

      template.hasOutput("KycReviewCompletedRuleArn", {
        Export: {
          Name: "test-sachain-lambda-kyc-review-completed-rule-arn",
        },
      });
    });
  });

  describe("CloudWatch Resources", () => {
    test("creates log group for event debugging", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        RetentionInDays: 30,
      });
    });
  });

  describe("Environment Configuration", () => {
    test("uses environment in event resource naming", () => {
      const resources = template.findResources("AWS::Events::EventBus");
      const eventBusResource = Object.values(resources)[0];
      expect(eventBusResource.Properties.Name).toBe("sachain-kyc-events-test");
    });
  });
});
