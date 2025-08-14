import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as kms from "aws-cdk-lib/aws-kms";
import { Template, Match } from "aws-cdk-lib/assertions";
import { SecurityConstruct } from "../../lib/constructs/security";

describe("IAM Permissions Refactor", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    const table = new dynamodb.Table(stack, "TestTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
    });

    const encryptionKey = new kms.Key(stack, "TestKey");
    const documentBucket = new s3.Bucket(stack, "TestBucket", {
      encryptionKey,
    });

    const eventBus = new events.EventBus(stack, "TestEventBus");
    const notificationTopic = new sns.Topic(stack, "TestTopic");

    new SecurityConstruct(stack, "Security", {
      environment: "test",
      table,
      documentBucket,
      encryptionKey,
      notificationTopic,
      eventBus,
    });

    template = Template.fromStack(stack);
  });

  test("KYC upload role has EventBridge publishing permissions", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-kyc-upload-lambda-role-test",
      Policies: Match.arrayWith([
        {
          PolicyDocument: {
            Statement: Match.arrayWith([
              {
                Sid: "EventBridgePutEvents",
                Effect: "Allow",
                Action: ["events:PutEvents"],
                Resource: { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
                Condition: {
                  StringEquals: {
                    "events:source": "sachain.kyc",
                  },
                },
              },
            ]),
          },
        },
      ]),
    });
  });

  test("KYC upload role does not have SNS permissions", () => {
    const uploadRoleStatements = template.findResources("AWS::IAM::Role", {
      RoleName: "sachain-kyc-upload-lambda-role-test",
    });

    // Check that no policy statements contain SNS actions
    Object.values(uploadRoleStatements).forEach((role: any) => {
      const policies = role.Properties?.Policies || [];
      policies.forEach((policy: any) => {
        const statements = policy.PolicyDocument?.Statement || [];
        statements.forEach((statement: any) => {
          const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
          expect(actions.some((action: string) => action.includes("sns:"))).toBeFalsy();
        });
      });
    });
  });

  test("KYC processing role has SNS publishing permissions", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-kyc-processing-lambda-role-test",
      Policies: Match.arrayWith([
        {
          PolicyDocument: {
            Statement: Match.arrayWith([
              {
                Sid: "SNSPublish",
                Effect: "Allow",
                Action: ["sns:Publish"],
                Resource: { Ref: Match.anyValue() },
              },
            ]),
          },
        },
      ]),
    });
  });

  test("KYC processing role has DynamoDB permissions", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-kyc-processing-lambda-role-test",
      Policies: Match.arrayWith([
        {
          PolicyDocument: {
            Statement: Match.arrayWith([
              {
                Sid: "DynamoDBKycProcessing",
                Effect: "Allow",
                Action: [
                  "dynamodb:GetItem",
                  "dynamodb:PutItem",
                  "dynamodb:UpdateItem",
                  "dynamodb:Query",
                ],
                Resource: [
                  { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
                  { "Fn::Join": ["/", [{ "Fn::GetAtt": [Match.anyValue(), "Arn"] }, "index/*"]] },
                ],
              },
            ]),
          },
        },
      ]),
    });
  });

  test("follows least privilege principle", () => {
    // Verify upload role only has necessary permissions
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "sachain-kyc-upload-lambda-role-test",
      Policies: Match.arrayWith([
        {
          PolicyDocument: {
            Statement: Match.arrayWith([
              {
                Sid: "DynamoDBKycOperations",
                Effect: "Allow",
                Action: [
                  "dynamodb:GetItem",
                  "dynamodb:PutItem",
                  "dynamodb:UpdateItem",
                  "dynamodb:Query",
                ],
                Condition: {
                  "ForAllValues:StringLike": {
                    "dynamodb:LeadingKeys": ["USER#*"],
                  },
                },
              },
            ]),
          },
        },
      ]),
    });
  });

  test("SNS resource policy allows processing Lambda", () => {
    template.hasResourceProperties("AWS::SNS::TopicPolicy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Sid: "AllowLambdaPublish",
            Effect: "Allow",
            Principal: {
              AWS: [
                { "Fn::GetAtt": [Match.stringLikeRegexp(".*KycProcessingLambdaRole.*"), "Arn"] },
                { "Fn::GetAtt": [Match.stringLikeRegexp(".*UserNotificationLambdaRole.*"), "Arn"] },
              ],
            },
            Action: ["sns:Publish"],
          },
        ]),
      },
    });
  });
});