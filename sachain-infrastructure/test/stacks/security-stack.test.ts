import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Template, Match } from "aws-cdk-lib/assertions";
import { SecurityStack } from "../../lib/stacks/security-stack";

describe("SecurityStack", () => {
  let app: cdk.App;
  let stack: SecurityStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();

    const table = new dynamodb.Table(
      new cdk.Stack(app, "InfraStack"),
      "TestTable",
      {
        partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      }
    );

    const bucket = new s3.Bucket(
      new cdk.Stack(app, "InfraStack2"),
      "TestBucket"
    );
    const userPool = new cognito.UserPool(
      new cdk.Stack(app, "InfraStack3"),
      "TestUserPool"
    );

    stack = new SecurityStack(app, "SecurityStack", {
      environment: "dev",
      table,
      sachainBucket: bucket,
      userPool,
    });

    template = Template.fromStack(stack);
  });

  test("creates 7 IAM Roles", () => {
    template.resourceCountIs("AWS::IAM::Role", 7);
  });

  test("creates expected stack outputs", () => {
    const outputs = template.findOutputs("*");

    const expected = [
      "dev-sachain-security-kyc-upload-role-arn",
      "dev-sachain-security-admin-review-role-arn",
      "dev-sachain-security-user-notification-role-arn",
      "dev-sachain-security-kyc-processing-role-arn",
      "dev-sachain-security-project-creation-role-arn",
      "dev-sachain-security-stock-minting-role-arn",
      "dev-sachain-security-stock-minting-status-role-arn",
    ];

    expected.forEach((exp) => {
      expect(
        Object.values(outputs).some((o: any) => o.Export?.Name === exp)
      ).toBe(true);
    });
  });

  test("applies expected tags", () => {
    template.hasResource("AWS::IAM::Role", {
      Properties: Match.objectLike({
        Tags: Match.arrayWith([
          { Key: "Environment", Value: "dev" },
          { Key: "Project", Value: "Sachain" },
        ]),
      }),
    });
  });

  test("matches snapshot", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
