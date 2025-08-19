import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Template } from "aws-cdk-lib/assertions";
import { AuthStack } from "../../lib/stacks/auth-stack";

describe("AuthStack", () => {
  let app: cdk.App;
  let mockPostAuthLambda: lambda.Function;

  beforeEach(() => {
    app = new cdk.App();

    // Create a mock Lambda function for post-authentication trigger
    const mockStack = new cdk.Stack(app, "MockStack");
    mockPostAuthLambda = new lambda.Function(mockStack, "MockPostAuthLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromInline("exports.handler = async () => {};"),
    });
  });

  test("creates Cognito User Pool with correct configuration", () => {
    const stack = new AuthStack(app, "TestAuthStack", {
      environment: "test",
      postAuthLambda: mockPostAuthLambda,
    });

    const template = Template.fromStack(stack);

    // Verify User Pool is created
    template.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolName: "sachain-user-pool-test",
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
      AutoVerifiedAttributes: ["email"],
      UsernameAttributes: ["email"],
      UsernameConfiguration: {
        CaseSensitive: false,
      },
    });
  });

  test("creates User Pool Client with correct configuration", () => {
    const stack = new AuthStack(app, "TestAuthStack", {
      environment: "test",
      postAuthLambda: mockPostAuthLambda,
    });

    const template = Template.fromStack(stack);

    // Verify User Pool Client is created
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      ClientName: "sachain-client-test",
      ExplicitAuthFlows: [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_ADMIN_USER_PASSWORD_AUTH",
        "ALLOW_USER_SRP_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
      ],
      SupportedIdentityProviders: ["COGNITO"],
      AllowedOAuthFlows: ["code"],
      AllowedOAuthScopes: ["email", "openid", "profile"],
      PreventUserExistenceErrors: "ENABLED",
      EnableTokenRevocation: true,
      AccessTokenValidity: 60, // 1 hour in minutes
      IdTokenValidity: 60, // 1 hour in minutes
      RefreshTokenValidity: 43200, // 30 days in minutes
    });
  });

  test("configures post-authentication Lambda trigger", () => {
    const stack = new AuthStack(app, "TestAuthStack", {
      environment: "test",
      postAuthLambda: mockPostAuthLambda,
    });

    const template = Template.fromStack(stack);

    // Verify Lambda trigger is configured - check that LambdaConfig section exists
    const userPools = template.findResources("AWS::Cognito::UserPool");
    const userPoolKeys = Object.keys(userPools);
    expect(userPoolKeys.length).toBe(1);

    const userPool = userPools[userPoolKeys[0]];
    expect(userPool.Properties.LambdaConfig).toBeDefined();
    expect(userPool.Properties.LambdaConfig.PostAuthentication).toBeDefined();
  });

  test("creates User Pool Domain", () => {
    const stack = new AuthStack(app, "TestAuthStack", {
      environment: "test",
      postAuthLambda: mockPostAuthLambda,
    });

    const template = Template.fromStack(stack);

    // Verify User Pool Domain is created
    template.hasResourceProperties("AWS::Cognito::UserPoolDomain", {
      Domain: "sachain-test",
    });
  });

  test("creates stack outputs for cross-stack references", () => {
    const stack = new AuthStack(app, "TestAuthStack", {
      environment: "test",
      postAuthLambda: mockPostAuthLambda,
    });

    const template = Template.fromStack(stack);

    // Verify outputs are created
    template.hasOutput("UserPoolId", {
      Export: {
        Name: "test-sachain-user-pool-id",
      },
    });

    template.hasOutput("UserPoolArn", {
      Export: {
        Name: "test-sachain-user-pool-arn",
      },
    });

    template.hasOutput("UserPoolClientId", {
      Export: {
        Name: "test-sachain-user-pool-client-id",
      },
    });

    template.hasOutput("UserPoolDomain", {
      Export: {
        Name: "test-sachain-user-pool-domain",
      },
    });
  });

  test("applies correct tags", () => {
    const stack = new AuthStack(app, "TestAuthStack", {
      environment: "test",
      postAuthLambda: mockPostAuthLambda,
    });

    const template = Template.fromStack(stack);

    // Verify tags are applied to User Pool
    template.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolTags: {
        Environment: "test",
        Project: "Sachain",
        Component: "Authentication",
      },
    });
  });

  test("exposes User Pool and Client for cross-stack references", () => {
    const stack = new AuthStack(app, "TestAuthStack", {
      environment: "test",
      postAuthLambda: mockPostAuthLambda,
    });

    // Verify that the stack exposes the necessary resources
    expect(stack.userPool).toBeInstanceOf(cognito.UserPool);
    expect(stack.userPoolClient).toBeInstanceOf(cognito.UserPoolClient);
    expect(stack.cognitoConstruct).toBeDefined();
  });

  test("configures OAuth settings correctly", () => {
    const stack = new AuthStack(app, "TestAuthStack", {
      environment: "test",
      postAuthLambda: mockPostAuthLambda,
    });

    const template = Template.fromStack(stack);

    // Verify OAuth configuration
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      CallbackURLs: [
        "https://sachain-test.com/auth/callback",
        "http://localhost:3000/auth/callback",
      ],
      LogoutURLs: [
        "https://sachain-test.com/auth/logout",
        "http://localhost:3000/auth/logout",
      ],
    });
  });
});
