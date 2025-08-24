import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Template } from "aws-cdk-lib/assertions";
import { CoreStack } from "../../lib/stacks/core-stack";

describe("CoreStack", () => {
  let app: cdk.App;
  let stack: CoreStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new CoreStack(app, "TestCoreStack", {
      environment: "test",
    });
    template = Template.fromStack(stack);
  });

  test("creates DynamoDB table with correct configuration", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "sachain-kyc-table-test",
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        {
          AttributeName: "PK",
          AttributeType: "S",
        },
        {
          AttributeName: "SK",
          AttributeType: "S",
        },
        {
          AttributeName: "GSI1PK",
          AttributeType: "S",
        },
        {
          AttributeName: "GSI1SK",
          AttributeType: "S",
        },
        {
          AttributeName: "GSI2PK",
          AttributeType: "S",
        },
        {
          AttributeName: "GSI2SK",
          AttributeType: "S",
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [
            {
              AttributeName: "GSI1PK",
              KeyType: "HASH",
            },
            {
              AttributeName: "GSI1SK",
              KeyType: "RANGE",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
        },
        {
          IndexName: "GSI2",
          KeySchema: [
            {
              AttributeName: "GSI2PK",
              KeyType: "HASH",
            },
            {
              AttributeName: "GSI2SK",
              KeyType: "RANGE",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
        },
      ],
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
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: {
        Status: "Enabled",
      },
    });
  });

  test("creates KMS key with key rotation enabled", () => {
    template.hasResourceProperties("AWS::KMS::Key", {
      Description: "KYC document encryption key for test",
      EnableKeyRotation: true,
      KeySpec: "SYMMETRIC_DEFAULT",
      KeyUsage: "ENCRYPT_DECRYPT",
    });
  });

  test("creates stack outputs for cross-stack references", () => {
    template.hasOutput("TableName", {
      Description: "DynamoDB Table Name",
      Export: {
        Name: "test-sachain-core-table-name",
      },
    });

    template.hasOutput("TableArn", {
      Description: "DynamoDB Table ARN",
      Export: {
        Name: "test-sachain-core-table-arn",
      },
    });

    template.hasOutput("BucketName", {
      Description: "S3 Document Bucket Name",
      Export: {
        Name: "test-sachain-core-bucket-name",
      },
    });

    template.hasOutput("BucketArn", {
      Description: "S3 Document Bucket ARN",
      Export: {
        Name: "test-sachain-core-bucket-arn",
      },
    });

    template.hasOutput("KmsKeyArn", {
      Description: "KMS Encryption Key ARN",
      Export: {
        Name: "test-sachain-core-kms-key-arn",
      },
    });

    template.hasOutput("KmsKeyId", {
      Description: "KMS Encryption Key ID",
      Export: {
        Name: "test-sachain-core-kms-key-id",
      },
    });

    // Auth-related outputs (consolidated from AuthStack)
    template.hasOutput("UserPoolId", {
      Description: "Cognito User Pool ID",
      Export: {
        Name: "test-sachain-core-user-pool-id",
      },
    });

    template.hasOutput("UserPoolArn", {
      Description: "Cognito User Pool ARN",
      Export: {
        Name: "test-sachain-core-user-pool-arn",
      },
    });

    template.hasOutput("UserPoolClientId", {
      Description: "Cognito User Pool Client ID",
      Export: {
        Name: "test-sachain-core-user-pool-client-id",
      },
    });

    template.hasOutput("UserPoolDomain", {
      Description: "Cognito User Pool Domain",
      Export: {
        Name: "test-sachain-core-user-pool-domain",
      },
    });

    template.hasOutput("PostAuthLambdaArn", {
      Description: "Post-Authentication Lambda Function ARN",
      Export: {
        Name: "test-sachain-core-post-auth-lambda-arn",
      },
    });
  });

  test("applies correct tags", () => {
    // Check that the table has the expected tags (order may vary)
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      Tags: [
        {
          Key: "Component",
          Value: "DynamoDB",
        },
        {
          Key: "Environment",
          Value: "test",
        },
        {
          Key: "Project",
          Value: "Sachain",
        },
        {
          Key: "Purpose",
          Value: "KYC-UserData",
        },
      ],
    });
  });

  test("exposes resources for cross-stack references", () => {
    expect(stack.table).toBeDefined();
    expect(stack.documentBucket).toBeDefined();
    expect(stack.encryptionKey).toBeDefined();
    expect(stack.dynamoDBConstruct).toBeDefined();
    expect(stack.s3Construct).toBeDefined();

    // Auth resources (consolidated from AuthStack)
    expect(stack.userPool).toBeDefined();
    expect(stack.userPoolClient).toBeDefined();
    expect(stack.userPoolId).toBeDefined();
    expect(stack.userPoolArn).toBeDefined();
    expect(stack.userPoolClientId).toBeDefined();
    expect(stack.userPoolDomain).toBeDefined();
    expect(stack.cognitoConstruct).toBeDefined();

    // Post-auth lambda (moved from LambdaStack)
    expect(stack.postAuthLambda).toBeDefined();
    expect(stack.postAuthLambdaArn).toBeDefined();
    expect(stack.postAuthLambdaConstruct).toBeDefined();
  });

  // Auth functionality tests (consolidated from AuthStack)
  describe("Authentication Resources", () => {
    test("creates Cognito User Pool with correct configuration", () => {
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

    test("creates User Pool Domain", () => {
      template.hasResourceProperties("AWS::Cognito::UserPoolDomain", {
        Domain: "sachain-test",
      });
    });

    test("configures OAuth settings correctly", () => {
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

    test("applies correct tags to auth resources", () => {
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        UserPoolTags: {
          Environment: "test",
          Project: "Sachain",
          Component: "Core",
        },
      });
    });

    test("exposes User Pool and Client for cross-stack references", () => {
      expect(stack.userPool).toBeInstanceOf(cognito.UserPool);
      expect(stack.userPoolClient).toBeInstanceOf(cognito.UserPoolClient);
      expect(stack.cognitoConstruct).toBeDefined();
    });
  });

  describe("Post-Authentication Lambda", () => {
    test("creates post-authentication lambda function", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-post-auth-test",
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Timeout: 30,
      });
    });

    test("configures post-authentication Lambda trigger", () => {
      // Verify Lambda trigger is configured - check that LambdaConfig section exists
      const userPools = template.findResources("AWS::Cognito::UserPool");
      const userPoolKeys = Object.keys(userPools);
      expect(userPoolKeys.length).toBe(1);

      const userPool = userPools[userPoolKeys[0]];
      expect(userPool.Properties.LambdaConfig).toBeDefined();
      expect(userPool.Properties.LambdaConfig.PostAuthentication).toBeDefined();
    });

    test("post-auth lambda has proper IAM permissions", () => {
      // Verify that the lambda has an execution role
      const lambdaFunctions = template.findResources("AWS::Lambda::Function");
      const postAuthLambda = Object.values(lambdaFunctions).find(
        (fn: any) => fn.Properties.FunctionName === "sachain-post-auth-test"
      );
      expect(postAuthLambda).toBeDefined();
      expect((postAuthLambda as any).Properties.Role).toBeDefined();
    });

    test("exposes post-auth lambda for cross-stack references", () => {
      expect(stack.postAuthLambda).toBeDefined();
      expect(stack.postAuthLambdaArn).toBeDefined();
      expect(stack.postAuthLambdaConstruct).toBeDefined();
    });
  });
});
