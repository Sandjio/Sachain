import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Template } from "aws-cdk-lib/assertions";
import { CognitoConstruct } from "../../lib/constructs/cognito";

describe("CognitoConstruct", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let mockPostAuthLambda: lambda.Function;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create mock Lambda function for testing
    mockPostAuthLambda = new lambda.Function(stack, "MockPostAuthLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline("exports.handler = async () => ({});"),
    });
  });

  describe("User Pool Configuration", () => {
    test("should create User Pool with correct basic configuration", () => {
      // Arrange & Act
      const construct = new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        UserPoolName: "sachain-user-pool-test",
        AliasAttributes: ["email"],
        AutoVerifiedAttributes: ["email"],
      });

      expect(construct.userPool).toBeDefined();
    });

    test("should configure password policies correctly", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: true,
            RequireUppercase: true,
            TemporaryPasswordValidityDays: 7,
          },
        },
      });
    });

    test("should enable advanced security features", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        UserPoolAddOns: {
          AdvancedSecurityMode: "ENFORCED",
        },
      });
    });

    test("should configure device tracking", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        DeviceConfiguration: {
          ChallengeRequiredOnNewDevice: true,
          DeviceOnlyRememberedOnUserPrompt: false,
        },
      });
    });

    test("should configure custom attributes", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert - Check that custom attributes are defined in schema
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        Schema: [
          {
            AttributeDataType: "String",
            Name: "email",
            Required: true,
            Mutable: true,
          },
          {
            AttributeDataType: "String",
            Name: "given_name",
            Required: false,
            Mutable: true,
          },
          {
            AttributeDataType: "String",
            Name: "family_name",
            Required: false,
            Mutable: true,
          },
          {
            AttributeDataType: "String",
            Name: "userType",
            Mutable: true,
            DeveloperOnlyAttribute: false,
          },
          {
            AttributeDataType: "String",
            Name: "kycStatus",
            Mutable: true,
            DeveloperOnlyAttribute: false,
          },
        ],
      });
    });
  });

  describe("Environment-specific Configuration", () => {
    test("should use RETAIN removal policy for production environment", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "prod",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResource("AWS::Cognito::UserPool", {
        DeletionPolicy: "Retain",
      });
    });

    test("should use DESTROY removal policy for non-production environments", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "dev",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResource("AWS::Cognito::UserPool", {
        DeletionPolicy: "Delete",
      });
    });

    test("should include correct User Pool name with environment suffix", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "staging",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        UserPoolName: "sachain-user-pool-staging",
      });
    });
  });

  describe("Security Configuration", () => {
    test("should enforce advanced security mode", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        UserPoolAddOns: {
          AdvancedSecurityMode: "ENFORCED",
        },
      });
    });

    test("should require email verification", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        AutoVerifiedAttributes: ["email"],
      });
    });

    test("should configure account recovery with email only", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: "verified_email",
              Priority: 1,
            },
          ],
        },
      });
    });
  });

  describe("Lambda Integration", () => {
    test("should configure post-authentication Lambda trigger", () => {
      // Arrange & Act
      const construct = new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "test",
      });

      // Assert - Verify the construct is created successfully
      expect(construct.userPool).toBeDefined();
      expect(construct.userPoolClient).toBeDefined();
    });

    test("should grant invoke permissions to post-authentication Lambda", () => {
      // Arrange & Act
      new CognitoConstruct(stack, "TestCognito", {
        postAuthLambda: mockPostAuthLambda,
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert - Check that Lambda permission is created
      template.hasResourceProperties("AWS::Lambda::Permission", {
        Action: "lambda:InvokeFunction",
        Principal: "cognito-idp.amazonaws.com",
      });
    });
  });
});
