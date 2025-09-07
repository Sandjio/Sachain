import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { CognitoLambdaConstruct } from "../../lib/constructs/cognito-lambda-triggers";

describe("CognitoLambdaConstruct", () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");
  });

  test("creates PostAuth Lambda + Role when table is provided", () => {
    const table = new dynamodb.Table(stack, "TestTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    });

    new CognitoLambdaConstruct(stack, "CognitoLambdas", {
      environment: "dev",
      table,
    });

    const template = Template.fromStack(stack);

    // Assert Lambda function exists
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-post-auth-dev",
      Runtime: "nodejs20.x",
      Handler: "index.handler",
      TracingConfig: { Mode: "Active" },
      MemorySize: 256,
      Timeout: 30,
      Environment: {
        Variables: {
          TABLE_NAME: Match.anyValue(),
          ENVIRONMENT: "dev",
        },
      },
    });

    // Assert IAM Role policy for DynamoDB access
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Allow",
            Action: Match.arrayWith([
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:GetItem",
            ]),
          }),
        ]),
      }),
    });
  });

  test("creates PostConfirm Lambda + Role when userPool is provided", () => {
    const userPool = new cognito.UserPool(stack, "TestUserPool");

    new CognitoLambdaConstruct(stack, "CognitoLambdas", {
      environment: "prod",
      userPool,
    });

    const template = Template.fromStack(stack);

    // Assert Lambda function exists
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-post-add-user-to-group-prod",
      Runtime: "nodejs20.x",
      Handler: "index.handler",
      TracingConfig: { Mode: "Active" },
      Environment: Match.objectLike({
        Variables: {
          ENVIRONMENT: "prod",
          DEFAULT_GROUP: "Investor",
        },
      }),
    });

    // Assert IAM Role has Cognito permissions
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              "cognito-idp:AdminAddUserToGroup",
              "cognito-idp:AdminListGroupsForUser",
            ]),
          }),
        ]),
      }),
    });
  });

  test("creates both Lambdas when table and userPool are provided", () => {
    const table = new dynamodb.Table(stack, "BothTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    });
    const userPool = new cognito.UserPool(stack, "BothUserPool");

    new CognitoLambdaConstruct(stack, "CognitoLambdas", {
      environment: "staging",
      table,
      userPool,
    });

    const template = Template.fromStack(stack);

    // Should have 2 Lambdas
    template.resourceCountIs("AWS::Lambda::Function", 2);
    // Should have 2 IAM Roles
    template.resourceCountIs("AWS::IAM::Role", 2);
  });

  test("creates nothing if no table and no userPool are provided", () => {
    new CognitoLambdaConstruct(stack, "CognitoLambdas", {
      environment: "test",
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs("AWS::Lambda::Function", 0);
    template.resourceCountIs("AWS::IAM::Role", 0);
  });
});
