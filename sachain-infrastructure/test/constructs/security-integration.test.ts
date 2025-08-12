import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Template, Match } from "aws-cdk-lib/assertions";
import { SecurityConstruct } from "../../lib/constructs/security";
import { LambdaConstruct } from "../../lib/constructs/lambda";

describe("SecurityConstruct Integration", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;
  let securityConstruct: SecurityConstruct;
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
    securityConstruct = new SecurityConstruct(stack, "SecurityConstruct", {
      environment: "test",
      table,
      documentBucket: bucket,
      encryptionKey,
      notificationTopic,
      eventBus,
    });

    template = Template.fromStack(stack);
  });

  describe("IAM Role Integration", () => {
    test("should create all required IAM roles", () => {
      template.resourceCountIs("AWS::IAM::Role", 4);
      
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-post-auth-lambda-role-test",
      });
      
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-kyc-upload-lambda-role-test",
      });
      
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-admin-review-lambda-role-test",
      });
      
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-user-notification-lambda-role-test",
      });
    });

    test("should apply roles to Lambda functions correctly", () => {
      // Create Lambda construct with security construct
      const lambdaConstruct = new LambdaConstruct(stack, "LambdaConstruct", {
        table,
        documentBucket: bucket,
        notificationTopic,
        eventBus,
        environment: "test",
        securityConstruct,
      });

      const updatedTemplate = Template.fromStack(stack);

      // Verify Lambda functions use custom roles
      updatedTemplate.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-post-auth-test",
        Role: {
          "Fn::GetAtt": [Match.stringLikeRegexp(".*PostAuthLambdaRole.*"), "Arn"],
        },
      });

      updatedTemplate.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "sachain-kyc-upload-test",
        Role: {
          "Fn::GetAtt": [Match.stringLikeRegexp(".*KycUploadLambdaRole.*"), "Arn"],
        },
      });
    });
  });

  describe("Least-Privilege Access Validation", () => {
    test("should enforce DynamoDB access patterns", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DynamoDBUserProfileWrite",
              Effect: "Allow",
              Action: ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:GetItem"],
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

    test("should enforce S3 encryption requirements", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "S3KycDocuments",
              Effect: "Allow",
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

    test("should enforce KMS ViaService restrictions", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "KMSOperations",
              Effect: "Allow",
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

    test("should enforce CloudWatch namespace restrictions", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "CloudWatchMetrics",
              Effect: "Allow",
              Action: ["cloudwatch:PutMetricData"],
              Condition: {
                StringEquals: {
                  "cloudwatch:namespace": Match.stringLikeRegexp("Sachain/.*"),
                },
              },
            },
          ]),
        },
      });
    });

    test("should enforce EventBridge source restrictions", () => {
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
  });

  describe("Security Controls", () => {
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

    test("should implement time-based restrictions for admin operations", () => {
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

  describe("Cross-Service Access Controls", () => {
    test("should validate role separation", () => {
      // Post-auth role should only have user profile access
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DynamoDBUserProfileWrite",
              Condition: {
                "ForAllValues:StringLike": {
                  "dynamodb:LeadingKeys": ["USER#*"],
                },
              },
            },
          ]),
        },
        Roles: [
          {
            Ref: Match.stringLikeRegexp(".*PostAuthLambdaRole.*"),
          },
        ],
      });

      // Admin role should have broader access including audit logs
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DynamoDBAdminOperations",
              Condition: {
                "ForAllValues:StringLike": {
                  "dynamodb:LeadingKeys": ["USER#*", "AUDIT#*"],
                },
              },
            },
          ]),
        },
        Roles: [
          {
            Ref: Match.stringLikeRegexp(".*AdminReviewLambdaRole.*"),
          },
        ],
      });
    });

    test("should validate service-specific permissions", () => {
      // Only KYC upload role should have S3 write permissions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "S3KycDocuments",
              Action: ["s3:GetObject", "s3:PutObject", "s3:PutObjectAcl", "s3:GetObjectVersion"],
            },
          ]),
        },
        Roles: [
          {
            Ref: Match.stringLikeRegexp(".*KycUploadLambdaRole.*"),
          },
        ],
      });

      // User notification role should only have read permissions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DynamoDBReadUserProfiles",
              Action: ["dynamodb:GetItem", "dynamodb:Query"],
            },
          ]),
        },
        Roles: [
          {
            Ref: Match.stringLikeRegexp(".*UserNotificationLambdaRole.*"),
          },
        ],
      });
    });
  });

  describe("Security Compliance Report", () => {
    test("should generate comprehensive security compliance report", () => {
      const complianceReport = securityConstruct.getSecurityComplianceReport();

      expect(complianceReport).toHaveProperty("roles");
      expect(complianceReport).toHaveProperty("securityFeatures");

      expect(complianceReport.roles).toHaveProperty("postAuth");
      expect(complianceReport.roles).toHaveProperty("kycUpload");
      expect(complianceReport.roles).toHaveProperty("adminReview");
      expect(complianceReport.roles).toHaveProperty("userNotification");

      expect(complianceReport.securityFeatures).toContain("least-privilege-access");
      expect(complianceReport.securityFeatures).toContain("resource-based-policies");
      expect(complianceReport.securityFeatures).toContain("cross-service-access-controls");
      expect(complianceReport.securityFeatures).toContain("privilege-escalation-prevention");
    });

    test("should validate role permissions in compliance report", () => {
      const complianceReport = securityConstruct.getSecurityComplianceReport();

      expect(complianceReport.roles.postAuth.permissions).toContain("dynamodb:read-write-user-profiles");
      expect(complianceReport.roles.postAuth.permissions).toContain("cloudwatch:metrics");
      expect(complianceReport.roles.postAuth.permissions).toContain("xray:tracing");

      expect(complianceReport.roles.kycUpload.permissions).toContain("s3:read-write-kyc-documents");
      expect(complianceReport.roles.kycUpload.permissions).toContain("kms:encrypt-decrypt");
      expect(complianceReport.roles.kycUpload.permissions).toContain("sns:publish");

      expect(complianceReport.roles.adminReview.permissions).toContain("events:put-events");
      expect(complianceReport.roles.adminReview.permissions).toContain("s3:read-kyc-documents");

      expect(complianceReport.roles.userNotification.permissions).toContain("dynamodb:read-user-profiles");
    });
  });

  describe("Environment-Specific Configuration", () => {
    test("should create environment-specific role names", () => {
      const prodStack = new cdk.Stack(app, "ProdStack");
      const prodTable = new dynamodb.Table(prodStack, "ProdTable", {
        partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      });
      const prodKey = new kms.Key(prodStack, "ProdKey");
      const prodBucket = new s3.Bucket(prodStack, "ProdBucket", {
        encryptionKey: prodKey,
      });

      new SecurityConstruct(prodStack, "ProdSecurityConstruct", {
        environment: "prod",
        table: prodTable,
        documentBucket: prodBucket,
        encryptionKey: prodKey,
      });

      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-post-auth-lambda-role-prod",
      });

      prodTemplate.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "sachain-kyc-upload-lambda-role-prod",
      });
    });
  });
});