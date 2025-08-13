import * as AWS from "aws-sdk";
import { SachainInfrastructureStack } from "../lib/sachain-infrastructure-stack";
import * as cdk from "aws-cdk-lib";

// Mock AWS SDK
jest.mock("aws-sdk");

describe("Deployment Validation Tests", () => {
  let app: cdk.App;
  let stack: SachainInfrastructureStack;

  beforeEach(() => {
    app = new cdk.App();
  });

  describe("Environment-specific deployments", () => {
    test("should create dev environment stack with correct configuration", () => {
      stack = new SachainInfrastructureStack(app, "TestStack", {
        environment: "dev",
        env: { account: "123456789012", region: "us-east-1" },
      });

      const template = cdk.Template.fromStack(stack);

      // Verify environment tags
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        Tags: [
          { Key: "Environment", Value: "dev" },
          { Key: "Project", Value: "Sachain" },
          { Key: "Component", Value: "KYC-Authentication" },
        ],
      });

      // Verify DynamoDB table exists
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        BillingMode: "PAY_PER_REQUEST",
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });

      // Verify S3 bucket with encryption
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

      // Verify Cognito User Pool
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireUppercase: true,
            RequireLowercase: true,
            RequireNumbers: true,
          },
        },
      });
    });

    test("should create staging environment stack with enhanced security", () => {
      stack = new SachainInfrastructureStack(app, "TestStack", {
        environment: "staging",
        env: { account: "123456789012", region: "us-east-1" },
      });

      const template = cdk.Template.fromStack(stack);

      // Verify enhanced monitoring is enabled
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        RetentionInDays: 30,
      });

      // Verify staging-specific tags
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        Tags: [{ Key: "Environment", Value: "staging" }],
      });
    });

    test("should create production environment stack with maximum security", () => {
      stack = new SachainInfrastructureStack(app, "TestStack", {
        environment: "prod",
        env: { account: "123456789012", region: "us-east-1" },
      });

      const template = cdk.Template.fromStack(stack);

      // Verify production log retention
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        RetentionInDays: 90,
      });

      // Verify production tags
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        Tags: [{ Key: "Environment", Value: "prod" }],
      });
    });
  });

  describe("Resource validation", () => {
    beforeEach(() => {
      stack = new SachainInfrastructureStack(app, "TestStack", {
        environment: "dev",
        env: { account: "123456789012", region: "us-east-1" },
      });
    });

    test("should have all required Lambda functions", () => {
      const template = cdk.Template.fromStack(stack);

      // Verify all Lambda functions exist
      template.resourceCountIs("AWS::Lambda::Function", 4);

      // Verify specific Lambda functions
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: cdk.Match.stringLikeRegexp(".*PostAuth.*"),
      });

      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: cdk.Match.stringLikeRegexp(".*KYCUpload.*"),
      });

      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: cdk.Match.stringLikeRegexp(".*AdminReview.*"),
      });

      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: cdk.Match.stringLikeRegexp(".*UserNotification.*"),
      });
    });

    test("should have proper IAM roles and policies", () => {
      const template = cdk.Template.fromStack(stack);

      // Verify IAM roles exist for Lambda functions
      template.resourceCountIs("AWS::IAM::Role", cdk.Match.anyValue());

      // Verify least privilege policies
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: cdk.Match.arrayWith([
            cdk.Match.objectLike({
              Effect: "Allow",
              Action: cdk.Match.arrayWith([
                "dynamodb:PutItem",
                "dynamodb:GetItem",
              ]),
            }),
          ]),
        },
      });
    });

    test("should have EventBridge configuration", () => {
      const template = cdk.Template.fromStack(stack);

      // Verify EventBridge bus
      template.hasResourceProperties("AWS::Events::EventBus", {
        Name: cdk.Match.stringLikeRegexp(".*sachain.*"),
      });

      // Verify EventBridge rules
      template.hasResourceProperties("AWS::Events::Rule", {
        EventPattern: {
          source: ["sachain.kyc"],
        },
      });
    });

    test("should have monitoring and alerting setup", () => {
      const template = cdk.Template.fromStack(stack);

      // Verify CloudWatch alarms
      template.resourceCountIs("AWS::CloudWatch::Alarm", cdk.Match.anyValue());

      // Verify SNS topics for notifications
      template.hasResourceProperties("AWS::SNS::Topic", {
        DisplayName: cdk.Match.stringLikeRegexp(".*Notification.*"),
      });
    });
  });

  describe("Security validation", () => {
    beforeEach(() => {
      stack = new SachainInfrastructureStack(app, "TestStack", {
        environment: "prod",
        env: { account: "123456789012", region: "us-east-1" },
      });
    });

    test("should have encryption enabled for all data stores", () => {
      const template = cdk.Template.fromStack(stack);

      // Verify S3 encryption
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

      // Verify DynamoDB encryption
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        SSESpecification: {
          SSEEnabled: true,
        },
      });
    });

    test("should have proper VPC and security group configuration", () => {
      const template = cdk.Template.fromStack(stack);

      // Verify security groups have restrictive rules
      template.hasResourceProperties("AWS::EC2::SecurityGroup", {
        SecurityGroupEgress: cdk.Match.arrayWith([
          cdk.Match.objectLike({
            IpProtocol: "tcp",
            FromPort: 443,
            ToPort: 443,
          }),
        ]),
      });
    });

    test("should have WAF protection for API Gateway", () => {
      const template = cdk.Template.fromStack(stack);

      // Verify WAF WebACL exists
      template.hasResourceProperties("AWS::WAFv2::WebACL", {
        Scope: "REGIONAL",
      });
    });
  });

  describe("Output validation", () => {
    beforeEach(() => {
      stack = new SachainInfrastructureStack(app, "TestStack", {
        environment: "dev",
        env: { account: "123456789012", region: "us-east-1" },
      });
    });

    test("should have all required stack outputs", () => {
      const template = cdk.Template.fromStack(stack);

      // Verify required outputs exist
      template.hasOutput("UserPoolId", {});
      template.hasOutput("UserPoolClientId", {});
      template.hasOutput("DynamoDBTableName", {});
      template.hasOutput("S3BucketName", {});
      template.hasOutput("EventBusName", {});
      template.hasOutput("KYCUploadApiUrl", {});
      template.hasOutput("SecurityComplianceReport", {});
    });
  });
});

/**
 * Integration tests for deployed resources
 */
describe("Deployed Resource Validation", () => {
  const environment = process.env.TEST_ENVIRONMENT || "dev";
  const stackName = `SachainKYCStack-${environment}`;

  // Skip integration tests if not in CI/CD environment
  const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "true";

  describe("AWS Resource Validation", () => {
    let cloudFormation: AWS.CloudFormation;
    let cognito: AWS.CognitoIdentityServiceProvider;
    let dynamodb: AWS.DynamoDB;
    let s3: AWS.S3;

    beforeAll(() => {
      if (runIntegrationTests) {
        cloudFormation = new AWS.CloudFormation({ region: "us-east-1" });
        cognito = new AWS.CognitoIdentityServiceProvider({
          region: "us-east-1",
        });
        dynamodb = new AWS.DynamoDB({ region: "us-east-1" });
        s3 = new AWS.S3({ region: "us-east-1" });
      }
    });

    test("should have deployed CloudFormation stack", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const stacks = await cloudFormation
        .describeStacks({ StackName: stackName })
        .promise();
      expect(stacks.Stacks).toHaveLength(1);
      expect(stacks.Stacks![0].StackStatus).toBe("CREATE_COMPLETE");
    }, 30000);

    test("should have accessible Cognito User Pool", async () => {
      if (!runIntegrationTests) return;

      const stacks = await cloudFormation
        .describeStacks({ StackName: stackName })
        .promise();
      const userPoolId = stacks.Stacks![0].Outputs?.find(
        (o) => o.OutputKey === "UserPoolId"
      )?.OutputValue;

      expect(userPoolId).toBeDefined();

      const userPool = await cognito
        .describeUserPool({ UserPoolId: userPoolId! })
        .promise();
      expect(userPool.UserPool).toBeDefined();
      expect(userPool.UserPool!.Policies?.PasswordPolicy).toBeDefined();
    }, 30000);

    test("should have accessible DynamoDB table", async () => {
      if (!runIntegrationTests) return;

      const stacks = await cloudFormation
        .describeStacks({ StackName: stackName })
        .promise();
      const tableName = stacks.Stacks![0].Outputs?.find(
        (o) => o.OutputKey === "DynamoDBTableName"
      )?.OutputValue;

      expect(tableName).toBeDefined();

      const table = await dynamodb
        .describeTable({ TableName: tableName! })
        .promise();
      expect(table.Table).toBeDefined();
      expect(table.Table!.TableStatus).toBe("ACTIVE");
    }, 30000);

    test("should have accessible S3 bucket", async () => {
      if (!runIntegrationTests) return;

      const stacks = await cloudFormation
        .describeStacks({ StackName: stackName })
        .promise();
      const bucketName = stacks.Stacks![0].Outputs?.find(
        (o) => o.OutputKey === "S3BucketName"
      )?.OutputValue;

      expect(bucketName).toBeDefined();

      const bucket = await s3.headBucket({ Bucket: bucketName! }).promise();
      expect(bucket).toBeDefined();
    }, 30000);
  });

  describe("API Endpoint Validation", () => {
    test("should have accessible API Gateway endpoints", async () => {
      if (!runIntegrationTests) return;

      const cloudFormation = new AWS.CloudFormation({ region: "us-east-1" });
      const stacks = await cloudFormation
        .describeStacks({ StackName: stackName })
        .promise();
      const apiUrl = stacks.Stacks![0].Outputs?.find(
        (o) => o.OutputKey === "KYCUploadApiUrl"
      )?.OutputValue;

      expect(apiUrl).toBeDefined();

      // Test API health endpoint
      const response = await fetch(`${apiUrl}/health`);
      expect(response.status).toBeLessThan(500); // Should not be server error
    }, 30000);
  });
});
