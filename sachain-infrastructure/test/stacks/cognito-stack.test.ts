import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { CognitoStack } from "../../lib/stacks/cognito-stack";

describe("CognitoStack", () => {
  it("matches the snapshot", () => {
    const app = new cdk.App();

    // Fake lambdas for testing
    const dummyLambda = new lambda.Function(app, "DummyLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromInline("exports.handler = async () => {};"),
    });

    const stack = new CognitoStack(app, "TestCognitoStack", {
      environment: "dev",
      postAuthLambda: dummyLambda,
      postAddUserToGroupLambda: dummyLambda,
    });

    const template = Template.fromStack(stack);

    expect(template.toJSON()).toMatchSnapshot();
  });
});
