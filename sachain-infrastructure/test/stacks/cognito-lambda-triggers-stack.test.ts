import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { CognitoLambdaStack } from "../../lib/stacks/cognito-lambda-triggers-stack";

describe("CognitoLambdaStack Snapshot Test", () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
  });

  test("matches snapshot when given table and user pool", () => {
    const stack = new cdk.Stack(app, "TestStack");

    // Mock DynamoDB table (imported from another stack)
    const table = dynamodb.Table.fromTableArn(
      stack,
      "ImportedTable",
      "arn:aws:dynamodb:us-east-1:123456789012:table/test-table"
    );

    // Mock Cognito User Pool (imported from another stack)
    const userPool = cognito.UserPool.fromUserPoolId(
      stack,
      "ImportedUserPool",
      "us-east-1_ABCDEFGHI"
    );

    // Create the stack under test
    new CognitoLambdaStack(stack, "CognitoLambdaStack", {
      environment: "dev",
      table,
      userPool,
    });

    const template = Template.fromStack(stack);

    // Snapshot the entire synthesized template
    expect(template.toJSON()).toMatchSnapshot();
  });
});
