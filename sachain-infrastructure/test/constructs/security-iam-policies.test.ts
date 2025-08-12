import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import { Template, Match } from "aws-cdk-lib/assertions";
import { SecurityConstruct } from "../../lib/constructs/security";

describe("SecurityConstruct IAM Policies", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;
  let table: dynamodb.Table;
  let bucket: s3.Bucket;
  let encryptionKey: kms.Key;
  let notificationTopic: sns.Topic;
  let eventBus: events.EventBus;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create test resources
    table = new dynamodb.Table(stack, "TestTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    });

    encryptionKey = new kms.Key(stack, "TestKey");

    bucket = new s3.Bucket(stack, "TestBucket", {
      encryptionKey,
    });

    notificationTopic = new sns.Topic(stack, "TestTopic");
    eventBus = new events.EventBus(stack, "TestEventBus");

    // Create security construct
    new SecurityConstruct(stack, "SecurityConstruct", {
      environment: "test",
      table,
      documentBucket: bucket,
      encryptionKey,
      notificationTopic,
      eventBus,
    });

    template = Template.fromStack(stack);
  });

  describe("Post-Auth Lambda Role", () => {
    test("should create role with least-privilege permissions", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-post-auth-lambda-role-test",
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: "lambda.amazonaws.com",
              },
              Action: "sts:AssumeRole",
            },
          ],
        },
      });
    });

    test("should have DynamoDB permissions with conditions", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DynamoDBUserProfileWrite",
              Effect: "Allow",
              Action: [
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:GetItem",
              ],
              Resource: { Ref: Match.anyValue() },
              Condition: {
                "ForAllValues:StringLike": {
                  "dynamodb:LeadingKeys": ["USER#*"],
                },
                StringEquals: {
                  "dynamodb:Select": ["ALL_ATTRIBUTES"],
                },
              },
            },
          ]),
        },
      });
    });

    test("should have CloudWatch metrics permissions with namespace restriction", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "CloudWatchMetrics",
              Effect: "Allow",
              Action: ["cloudwatch:PutMetricData"],
              Resource: "*",
              Condition: {
                StringEquals: {
                  "cloudwatch:namespace": "Sachain/PostAuth",
                },
              },
            },
          ]),
        },
      });
    });

    test("should have X-Ray tracing permissions", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "XRayTracing",
              Effect: "Allow",
              Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
              Resource: "*",
            },
          ]),
        },
      });
    });

    test("should prevent privilege escalation", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "PreventPrivilegeEscalation",
              Effect: "Deny",
              Action: [
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PutRolePolicy",
                "iam:DeleteRolePolicy",
                "iam:UpdateAssumeRolePolicy",
              ],
              Resource: "*",
            },
          ]),
        },
      });
    });
  });

  describe("KYC Upload Lambda Role", () => {
    test("should create role with comprehensive KYC permissions", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-kyc-upload-lambda-role-test",
      });
    });

    test("should have DynamoDB permissions for KYC operations", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
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
      });
    });

    test("should have S3 permissions with encryption conditions", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "S3KycDocuments",
              Effect: "Allow",
              Action: [
                "s3:GetObject",
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObjectVersion",
              ],
              Condition: {
                StringEquals: {
                  "s3:x-amz-server-side-encryption": "aws:kms",
                  "s3:x-amz-server-side-encryption-aws-kms-key-id": {
                    "Fn::GetAtt": [Match.anyValue(), "Arn"],
                  },
                },
              },
            },
          ]),
        },
      });
    });

    test("should have KMS permissions with ViaService condition", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "KMSOperations",
              Effect: "Allow",
              Action: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*",
                "kms:DescribeKey",
              ],
              Condition: {
                StringEquals: {
                  "kms:ViaService": {
                    "Fn::Sub": "s3.${AWS::Region}.amazonaws.com",
                  },
                },
              },
            },
          ]),
        },
      });
    });

    test("should have SNS publish permissions", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
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
      });
    });
  });

  describe("Admin Review Lambda Role", () => {
    test("should create role with admin review permissions", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-admin-review-lambda-role-test",
      });
    });

    test("should have DynamoDB admin operations permissions", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DynamoDBAdminOperations",
              Effect: "Allow",
              Action: [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:Query",
                "dynamodb:Scan",
              ],
              Condition: {
                "ForAllValues:StringLike": {
                  "dynamodb:LeadingKeys": ["USER#*", "AUDIT#*"],
                },
              },
            },
          ]),
        },
      });
    });

    test("should have S3 read permissions for KYC documents", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "S3ReadKycDocuments",
              Effect: "Allow",
              Action: ["s3:GetObject", "s3:GetObjectVersion"],
            },
          ]),
        },
      });
    });

    test("should have EventBridge permissions with source condition", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "EventBridgePutEvents",
              Effect: "Allow",
              Action: ["events:PutEvents"],
              Condition: {
                StringEquals: {
                  "events:source": "sachain.kyc",
                },
              },
            },
          ]),
        },
      });
    });

    test("should have time-based access restrictions", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "TimeBasedAccess",
              Effect: "Deny",
              Action: [
                "dynamodb:DeleteItem",
                "dynamodb:DeleteTable",
                "s3:DeleteObject",
                "s3:DeleteBucket",
              ],
              Resource: "*",
              Condition: {
                DateGreaterThan: {
                  "aws:CurrentTime": "23:59:59Z",
                },
                DateLessThan: {
                  "aws:CurrentTime": "06:00:00Z",
                },
              },
            },
          ]),
        },
      });
    });
  });

  describe("User Notification Lambda Role", () => {
    test("should create role with read-only permissions", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-user-notification-lambda-role-test",
      });
    });

    test("should have read-only DynamoDB permissions", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DynamoDBReadUserProfiles",
              Effect: "Allow",
              Action: ["dynamodb:GetItem", "dynamodb:Query"],
              Condition: {
                "ForAllValues:StringLike": {
                  "dynamodb:LeadingKeys": ["USER#*"],
                },
                StringEquals: {
                  "dynamodb:Select": ["ALL_ATTRIBUTES"],
                },
              },
            },
          ]),
        },
      });
    });
  });

  describe("Resource-Based Policies", () => {
    test("should add resource-based policy to S3 bucket", () => {
      template.hasResourceProperties("AWS::S3::BucketPolicy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "RestrictToLambdaRoles",
              Effect: "Allow",
              Action: ["s3:GetObject", "s3:PutObject", "s3:GetObjectVersion"],
              Condition: {
                StringEquals: {
                  "s3:x-amz-server-side-encryption": "aws:kms",
                },
              },
            },
          ]),
        },
      });
    });

    test("should add resource-based policy to KMS key", () => {
      template.hasResourceProperties("AWS::KMS::Key", {
        KeyPolicy: {
          Statement: Match.arrayWith([
            {
              Sid: "AllowLambdaRoleAccess",
              Effect: "Allow",
              Action: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*",
                "kms:DescribeKey",
              ],
              Resource: "*",
              Condition: {
                StringEquals: {
                  "kms:ViaService": {
                    "Fn::Sub": "s3.${AWS::Region}.amazonaws.com",
                  },
                },
              },
            },
          ]),
        },
      });
    });

    test("should add resource-based policy to SNS topic", () => {
      template.hasResourceProperties("AWS::SNS::TopicPolicy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "AllowLambdaPublish",
              Effect: "Allow",
              Action: ["sns:Publish"],
            },
          ]),
        },
      });
    });
  });

  describe("Security Compliance", () => {
    test("should enforce encryption for all S3 operations", () => {
      // Check that all S3 policies require encryption
      const policies = template.findResources("AWS::IAM::Policy");

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        const s3Statements = statements.filter((stmt: any) =>
          stmt.Action?.some?.((action: string) => action.startsWith("s3:"))
        );

        s3Statements.forEach((stmt: any) => {
          if (stmt.Action.includes("s3:PutObject")) {
            expect(stmt.Condition).toBeDefined();
            expect(stmt.Condition.StringEquals).toBeDefined();
            expect(
              stmt.Condition.StringEquals["s3:x-amz-server-side-encryption"]
            ).toBe("aws:kms");
          }
        });
      });
    });

    test("should restrict CloudWatch metrics to specific namespaces", () => {
      const policies = template.findResources("AWS::IAM::Policy");

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        const cloudwatchStatements = statements.filter((stmt: any) =>
          stmt.Action?.includes?.("cloudwatch:PutMetricData")
        );

        cloudwatchStatements.forEach((stmt: any) => {
          expect(stmt.Condition).toBeDefined();
          expect(stmt.Condition.StringEquals).toBeDefined();
          expect(stmt.Condition.StringEquals["cloudwatch:namespace"]).toMatch(
            /^Sachain\//
          );
        });
      });
    });

    test("should prevent privilege escalation in all roles", () => {
      const policies = template.findResources("AWS::IAM::Policy");

      let privilegeEscalationPolicyFound = false;
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        const denyStatements = statements.filter(
          (stmt: any) => stmt.Effect === "Deny"
        );

        denyStatements.forEach((stmt: any) => {
          if (stmt.Sid === "PreventPrivilegeEscalation") {
            privilegeEscalationPolicyFound = true;
            expect(stmt.Action).toContain("iam:CreateRole");
            expect(stmt.Action).toContain("iam:AttachRolePolicy");
            expect(stmt.Resource).toBe("*");
          }
        });
      });

      expect(privilegeEscalationPolicyFound).toBe(true);
    });

    test("should have proper DynamoDB access patterns", () => {
      const policies = template.findResources("AWS::IAM::Policy");

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        const dynamoStatements = statements.filter((stmt: any) =>
          stmt.Action?.some?.((action: string) =>
            action.startsWith("dynamodb:")
          )
        );

        dynamoStatements.forEach((stmt: any) => {
          if (stmt.Effect === "Allow") {
            expect(stmt.Condition).toBeDefined();
            expect(stmt.Condition["ForAllValues:StringLike"]).toBeDefined();
            expect(
              stmt.Condition["ForAllValues:StringLike"]["dynamodb:LeadingKeys"]
            ).toBeDefined();
          }
        });
      });
    });
  });

  describe("Cross-Service Access Controls", () => {
    test("should have proper KMS ViaService conditions", () => {
      const policies = template.findResources("AWS::IAM::Policy");

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        const kmsStatements = statements.filter((stmt: any) =>
          stmt.Action?.some?.((action: string) => action.startsWith("kms:"))
        );

        kmsStatements.forEach((stmt: any) => {
          if (stmt.Effect === "Allow") {
            expect(stmt.Condition).toBeDefined();
            expect(stmt.Condition.StringEquals).toBeDefined();
            expect(stmt.Condition.StringEquals["kms:ViaService"]).toBeDefined();
          }
        });
      });
    });

    test("should restrict EventBridge events to specific sources", () => {
      const policies = template.findResources("AWS::IAM::Policy");

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        const eventStatements = statements.filter((stmt: any) =>
          stmt.Action?.includes?.("events:PutEvents")
        );

        eventStatements.forEach((stmt: any) => {
          if (stmt.Effect === "Allow") {
            expect(stmt.Condition).toBeDefined();
            expect(stmt.Condition.StringEquals).toBeDefined();
            expect(stmt.Condition.StringEquals["events:source"]).toBe(
              "sachain.kyc"
            );
          }
        });
      });
    });
  });
});
