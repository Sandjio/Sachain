import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Template, Match } from "aws-cdk-lib/assertions";
import { SecurityConstruct } from "../../lib/constructs/security";

describe("SecurityConstruct", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    const table = new dynamodb.Table(stack, "TestTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
    });

    const bucket = new s3.Bucket(stack, "TestBucket");

    new SecurityConstruct(stack, "SecurityConstruct", {
      environment: "dev",
      table,
      sachainBucket: bucket,
    });

    template = Template.fromStack(stack);
  });

  test("creates 7 IAM Roles", () => {
    template.resourceCountIs("AWS::IAM::Role", 7);
  });

  test("KYC Upload role has DynamoDB permissions", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "DynamoDBKycOperations",
            Action: Match.arrayWith(["dynamodb:GetItem", "dynamodb:PutItem"]),
            Effect: "Allow",
          }),
        ]),
      },
    });
  });

  test("All roles include privilege escalation prevention", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "PreventPrivilegeEscalation",
            Effect: "Deny",
            Action: Match.arrayWith([
              "iam:CreateRole",
              "iam:AttachRolePolicy",
              "iam:PutRolePolicy",
            ]),
          }),
        ]),
      },
    });
  });

  test("matches snapshot", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
