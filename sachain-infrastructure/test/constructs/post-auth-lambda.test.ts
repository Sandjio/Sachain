import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import { Template, Match } from "aws-cdk-lib/assertions";
import { PostAuthLambdaConstruct } from "../../lib/constructs/post-auth-lambda";

describe("PostAuthLambdaConstruct", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let mockTable: dynamodb.Table;
  let mockRole: iam.Role;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create mock DynamoDB table
    mockTable = new dynamodb.Table(stack, "MockTable", {
      tableName: "test-table",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create mock IAM role
    mockRole = new iam.Role(stack, "MockRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });
  });

  describe("Lambda Function Configuration", () => {
    test("should create Lambda function with correct configuration", () => {
      // Arrange & Act
      const construct = new PostAuthLambdaConstruct(
        stack,
        "TestPostAuthLambda",
        {
          table: mockTable,
          environment: "test",
          postAuthRole: mockRole,
        }
      );

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-post-auth-test",
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Timeout: 30,
        MemorySize: 256,
        TracingConfig: {
          Mode: "Active",
        },
      });

      expect(construct.postAuthLambda).toBeDefined();
    });

    test("should configure environment variables correctly", () => {
      // Arrange & Act
      new PostAuthLambdaConstruct(stack, "TestPostAuthLambda", {
        table: mockTable,
        environment: "test",
        postAuthRole: mockRole,
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Lambda::Function", {
        Environment: {
          Variables: {
            TABLE_NAME: {
              Ref: Match.anyValue(),
            },
            ENVIRONMENT: "test",
          },
        },
      });
    });

    test("should use provided IAM role", () => {
      // Arrange & Act
      new PostAuthLambdaConstruct(stack, "TestPostAuthLambda", {
        table: mockTable,
        environment: "test",
        postAuthRole: mockRole,
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Lambda::Function", {
        Role: {
          "Fn::GetAtt": [Match.anyValue(), "Arn"],
        },
      });
    });
  });

  describe("Environment-specific Configuration", () => {
    test("should include correct function name with environment suffix", () => {
      // Arrange & Act
      new PostAuthLambdaConstruct(stack, "TestPostAuthLambda", {
        table: mockTable,
        environment: "staging",
        postAuthRole: mockRole,
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-post-auth-staging",
      });
    });

    test("should set environment variable correctly", () => {
      // Arrange & Act
      new PostAuthLambdaConstruct(stack, "TestPostAuthLambda", {
        table: mockTable,
        environment: "prod",
        postAuthRole: mockRole,
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Lambda::Function", {
        Environment: {
          Variables: {
            ENVIRONMENT: "prod",
          },
        },
      });
    });
  });

  describe("Public Methods", () => {
    test("should provide grantInvokeToUserPool method", () => {
      // Arrange
      const construct = new PostAuthLambdaConstruct(
        stack,
        "TestPostAuthLambda",
        {
          table: mockTable,
          environment: "test",
          postAuthRole: mockRole,
        }
      );

      const userPoolArn =
        "arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_EXAMPLE";

      // Act
      construct.grantInvokeToUserPool(userPoolArn);

      const template = Template.fromStack(stack);

      // Assert - Check that Lambda permission is created
      template.hasResourceProperties("AWS::Lambda::Permission", {
        Action: "lambda:InvokeFunction",
        Principal: "cognito-idp.amazonaws.com",
        SourceArn: userPoolArn,
      });
    });

    test("should provide getFunction method", () => {
      // Arrange
      const construct = new PostAuthLambdaConstruct(
        stack,
        "TestPostAuthLambda",
        {
          table: mockTable,
          environment: "test",
          postAuthRole: mockRole,
        }
      );

      // Act
      const lambdaFunction = construct.getFunction();

      // Assert
      expect(lambdaFunction).toBe(construct.postAuthLambda);
    });
  });

  describe("Integration with DynamoDB", () => {
    test("should reference the provided DynamoDB table in environment variables", () => {
      // Arrange & Act
      new PostAuthLambdaConstruct(stack, "TestPostAuthLambda", {
        table: mockTable,
        environment: "test",
        postAuthRole: mockRole,
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Lambda::Function", {
        Environment: {
          Variables: {
            TABLE_NAME: {
              Ref: Match.anyValue(),
            },
          },
        },
      });
    });
  });

  describe("Error Cases", () => {
    test("should handle missing IAM role gracefully", () => {
      // Arrange & Act
      const construct = new PostAuthLambdaConstruct(
        stack,
        "TestPostAuthLambda",
        {
          table: mockTable,
          environment: "test",
          // postAuthRole is undefined
        }
      );

      // Assert - Should create function without role (CDK will create default)
      expect(construct.postAuthLambda).toBeDefined();
    });
  });

  describe("Extracted from LambdaConstruct", () => {
    test("should maintain same configuration as original implementation", () => {
      // Arrange & Act
      new PostAuthLambdaConstruct(stack, "TestPostAuthLambda", {
        table: mockTable,
        environment: "test",
        postAuthRole: mockRole,
      });

      const template = Template.fromStack(stack);

      // Assert - Verify it matches the original LambdaConstruct configuration
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-post-auth-test",
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Timeout: 30,
        MemorySize: 256,
        TracingConfig: {
          Mode: "Active",
        },
        Environment: {
          Variables: {
            TABLE_NAME: {
              Ref: Match.anyValue(),
            },
            ENVIRONMENT: "test",
          },
        },
      });
    });
  });
});
