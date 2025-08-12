import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import { Template } from "aws-cdk-lib/assertions";
import { SecurityConstruct } from "../../lib/constructs/security";
import { LambdaConstruct } from "../../lib/constructs/lambda";

describe("Security Implementation Validation", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;
  let securityConstruct: SecurityConstruct;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");

    // Create test resources
    const table = new dynamodb.Table(stack, "TestTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    });

    const encryptionKey = new kms.Key(stack, "TestKey");
    const bucket = new s3.Bucket(stack, "TestBucket", {
      encryptionKey,
    });

    const notificationTopic = new sns.Topic(stack, "TestTopic");
    const eventBus = new events.EventBus(stack, "TestEventBus");

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

  describe("IAM Roles Creation", () => {
    test("should create all required IAM roles", () => {
      // Verify that 4 IAM roles are created
      template.resourceCountIs("AWS::IAM::Role", 4);
      
      // Check that roles have correct names
      const roles = template.findResources("AWS::IAM::Role");
      const roleNames = Object.values(roles).map((role: any) => role.Properties.RoleName);
      
      expect(roleNames).toContain("sachain-post-auth-lambda-role-test");
      expect(roleNames).toContain("sachain-kyc-upload-lambda-role-test");
      expect(roleNames).toContain("sachain-admin-review-lambda-role-test");
      expect(roleNames).toContain("sachain-user-notification-lambda-role-test");
    });

    test("should create IAM policies for each role", () => {
      // Verify that IAM policies are created
      template.resourceCountIs("AWS::IAM::Policy", 4);
    });

    test("should have proper assume role policies", () => {
      const roles = template.findResources("AWS::IAM::Role");
      
      Object.values(roles).forEach((role: any) => {
        expect(role.Properties.AssumeRolePolicyDocument.Statement[0].Principal.Service).toBe("lambda.amazonaws.com");
        expect(role.Properties.AssumeRolePolicyDocument.Statement[0].Action).toBe("sts:AssumeRole");
      });
    });
  });

  describe("Security Policies Validation", () => {
    test("should have privilege escalation prevention", () => {
      const policies = template.findResources("AWS::IAM::Policy");
      
      let hasPrivilegeEscalationPrevention = false;
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          if (statement.Sid === "PreventPrivilegeEscalation" && statement.Effect === "Deny") {
            hasPrivilegeEscalationPrevention = true;
            expect(statement.Action).toContain("iam:CreateRole");
            expect(statement.Action).toContain("iam:AttachRolePolicy");
          }
        });
      });
      
      expect(hasPrivilegeEscalationPrevention).toBe(true);
    });

    test("should have DynamoDB access restrictions", () => {
      const policies = template.findResources("AWS::IAM::Policy");
      
      let hasDynamoDBRestrictions = false;
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          if (statement.Action && statement.Action.some((action: string) => action.startsWith("dynamodb:"))) {
            if (statement.Condition && statement.Condition["ForAllValues:StringLike"]) {
              hasDynamoDBRestrictions = true;
              expect(statement.Condition["ForAllValues:StringLike"]["dynamodb:LeadingKeys"]).toBeDefined();
            }
          }
        });
      });
      
      expect(hasDynamoDBRestrictions).toBe(true);
    });

    test("should have CloudWatch namespace restrictions", () => {
      const policies = template.findResources("AWS::IAM::Policy");
      
      let hasCloudWatchRestrictions = false;
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          if (statement.Action && statement.Action.includes("cloudwatch:PutMetricData")) {
            if (statement.Condition && statement.Condition.StringEquals) {
              hasCloudWatchRestrictions = true;
              expect(statement.Condition.StringEquals["cloudwatch:namespace"]).toMatch(/Sachain\//);
            }
          }
        });
      });
      
      expect(hasCloudWatchRestrictions).toBe(true);
    });

    test("should have X-Ray tracing permissions", () => {
      const policies = template.findResources("AWS::IAM::Policy");
      
      let hasXRayPermissions = false;
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          if (statement.Sid === "XRayTracing") {
            hasXRayPermissions = true;
            expect(statement.Action).toContain("xray:PutTraceSegments");
            expect(statement.Action).toContain("xray:PutTelemetryRecords");
          }
        });
      });
      
      expect(hasXRayPermissions).toBe(true);
    });
  });

  describe("Resource-Based Policies", () => {
    test("should create S3 bucket policy", () => {
      template.resourceCountIs("AWS::S3::BucketPolicy", 1);
      
      const bucketPolicies = template.findResources("AWS::S3::BucketPolicy");
      const bucketPolicy = Object.values(bucketPolicies)[0] as any;
      
      expect(bucketPolicy.Properties.PolicyDocument.Statement).toBeDefined();
      expect(bucketPolicy.Properties.PolicyDocument.Statement.length).toBeGreaterThan(0);
    });

    test("should create SNS topic policy", () => {
      template.resourceCountIs("AWS::SNS::TopicPolicy", 1);
      
      const topicPolicies = template.findResources("AWS::SNS::TopicPolicy");
      const topicPolicy = Object.values(topicPolicies)[0] as any;
      
      expect(topicPolicy.Properties.PolicyDocument.Statement).toBeDefined();
      expect(topicPolicy.Properties.PolicyDocument.Statement.length).toBeGreaterThan(0);
    });

    test("should have KMS key policy", () => {
      const kmsKeys = template.findResources("AWS::KMS::Key");
      const kmsKey = Object.values(kmsKeys)[0] as any;
      
      expect(kmsKey.Properties.KeyPolicy.Statement).toBeDefined();
      expect(kmsKey.Properties.KeyPolicy.Statement.length).toBeGreaterThan(1);
    });
  });

  describe("Lambda Integration", () => {
    test("should integrate with Lambda construct", () => {
      const table = new dynamodb.Table(stack, "LambdaTable", {
        partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      });

      const encryptionKey = new kms.Key(stack, "LambdaKey");
      const bucket = new s3.Bucket(stack, "LambdaBucket", {
        encryptionKey,
      });

      const notificationTopic = new sns.Topic(stack, "LambdaTopic");
      const eventBus = new events.EventBus(stack, "LambdaEventBus");

      const lambdaSecurityConstruct = new SecurityConstruct(stack, "LambdaSecurityConstruct", {
        environment: "test",
        table,
        documentBucket: bucket,
        encryptionKey,
        notificationTopic,
        eventBus,
      });

      // Create Lambda construct with security construct
      new LambdaConstruct(stack, "LambdaConstruct", {
        table,
        documentBucket: bucket,
        notificationTopic,
        eventBus,
        environment: "test",
        securityConstruct: lambdaSecurityConstruct,
      });

      const updatedTemplate = Template.fromStack(stack);

      // Verify Lambda functions are created
      updatedTemplate.resourceCountIs("AWS::Lambda::Function", 4);
      
      // Verify Lambda functions have X-Ray tracing enabled
      const lambdaFunctions = updatedTemplate.findResources("AWS::Lambda::Function");
      Object.values(lambdaFunctions).forEach((func: any) => {
        expect(func.Properties.TracingConfig?.Mode).toBe("Active");
      });
    });
  });

  describe("Security Compliance Report", () => {
    test("should generate comprehensive compliance report", () => {
      const complianceReport = securityConstruct.getSecurityComplianceReport();

      expect(complianceReport).toHaveProperty("roles");
      expect(complianceReport).toHaveProperty("securityFeatures");

      // Verify all roles are included
      expect(complianceReport.roles).toHaveProperty("postAuth");
      expect(complianceReport.roles).toHaveProperty("kycUpload");
      expect(complianceReport.roles).toHaveProperty("adminReview");
      expect(complianceReport.roles).toHaveProperty("userNotification");

      // Verify security features
      expect(complianceReport.securityFeatures).toContain("least-privilege-access");
      expect(complianceReport.securityFeatures).toContain("resource-based-policies");
      expect(complianceReport.securityFeatures).toContain("cross-service-access-controls");
      expect(complianceReport.securityFeatures).toContain("privilege-escalation-prevention");
    });

    test("should validate role permissions", () => {
      const complianceReport = securityConstruct.getSecurityComplianceReport();

      // Post-auth role should have limited permissions
      expect(complianceReport.roles.postAuth.permissions).toContain("dynamodb:read-write-user-profiles");
      expect(complianceReport.roles.postAuth.permissions).toContain("cloudwatch:metrics");
      expect(complianceReport.roles.postAuth.permissions).toContain("xray:tracing");

      // KYC upload role should have S3 and encryption permissions
      expect(complianceReport.roles.kycUpload.permissions).toContain("s3:read-write-kyc-documents");
      expect(complianceReport.roles.kycUpload.permissions).toContain("kms:encrypt-decrypt");
      expect(complianceReport.roles.kycUpload.permissions).toContain("sns:publish");

      // Admin review role should have EventBridge permissions
      expect(complianceReport.roles.adminReview.permissions).toContain("events:put-events");
      expect(complianceReport.roles.adminReview.permissions).toContain("s3:read-kyc-documents");

      // User notification role should have read-only permissions
      expect(complianceReport.roles.userNotification.permissions).toContain("dynamodb:read-user-profiles");
    });
  });

  describe("Environment Configuration", () => {
    test("should create environment-specific resources", () => {
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
      const roles = prodTemplate.findResources("AWS::IAM::Role");
      const roleNames = Object.values(roles).map((role: any) => role.Properties.RoleName);
      
      expect(roleNames).toContain("sachain-post-auth-lambda-role-prod");
      expect(roleNames).toContain("sachain-kyc-upload-lambda-role-prod");
      expect(roleNames).toContain("sachain-admin-review-lambda-role-prod");
      expect(roleNames).toContain("sachain-user-notification-lambda-role-prod");
    });
  });
});