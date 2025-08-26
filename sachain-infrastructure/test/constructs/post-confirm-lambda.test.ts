import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { PostConfirmLambdaConstruct } from "../../lib/constructs/post-confirm-lambda.ts";

describe("PostConfirmLambdaConstruct", () => {
  let stack: cdk.Stack;
  let userPool: cognito.UserPool;

  beforeEach(() => {
    stack = new cdk.Stack();
    userPool = new cognito.UserPool(stack, "TestUserPool");
    new PostConfirmLambdaConstruct(stack, "TestConstruct", {
      environment: "dev",
      userPool,
    });
  });

  it("creates the Lambda function with expected configuration", () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "sachain-post-add-user-to-group-dev",
      Runtime: "nodejs20.x",
      Handler: "index.handler",
      MemorySize: 256,
      Timeout: 30,
      TracingConfig: {
        Mode: "Active",
      },
      Environment: {
        Variables: {
          ENVIRONMENT: "dev",
          DEFAULT_GROUP: "Investor",
          REGION: {
            Ref: "AWS::Region",
          },
          FUNCTION_NAME: "sachain-post-add-user-to-group-dev",
        },
      },
    });
  });

  it("creates the IAM Role with least-privilege policies", () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-post-add-user-to-group-role-dev",
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Allow",
            Principal: {
              Service: "lambda.amazonaws.com",
            },
          }),
        ]),
      },
    });

    // Validate inline policy for Cognito permissions
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "CognitoUserPoolGroups",
            Action: [
              "cognito-idp:AdminAddUserToGroup",
              "cognito-idp:AdminListGroupsForUser",
            ],
            Effect: "Allow",
            Resource: {
              "Fn::GetAtt": [Match.stringLikeRegexp("TestUserPool*"), "Arn"],
            },
          }),
          Match.objectLike({
            Sid: "CloudWatchMetrics",
            Action: "cloudwatch:PutMetricData",
            Effect: "Allow",
            Resource: "*",
            Condition: {
              StringEquals: {
                "cloudwatch:namespace": "Sachain/PostAddUserToGroup",
              },
            },
          }),
        ]),
      },
    });
  });
});
