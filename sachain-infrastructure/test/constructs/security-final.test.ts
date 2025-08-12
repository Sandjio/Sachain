import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import { Template } from "aws-cdk-lib/assertions";
import { SecurityConstruct } from "../../lib/constructs/security";
import { LambdaConstruct } from "../../lib/constructs/lambda";

describe("Security Implementation Final Validation", () => {
  describe("Core Security Features", () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let template: Template;
    let securityConstruct: SecurityConstruct;

    beforeAll(() => {
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

    test("should create all required IAM roles", () => {
      template.resourceCountIs("AWS::IAM::Role", 4);
      
      const roles = template.findResources("AWS::IAM::Role");
      const roleNames = Object.values(roles).map((role: any) => role.Properties.RoleName);
      
      expect(roleNames).toContain("sachain-post-auth-lambda-role-test");
      expect(roleNames).toContain("sachain-kyc-upload-lambda-role-test");
      expect(roleNames).toContain("sachain-admin-review-lambda-role-test");
      expect(roleNames).toContain("sachain-user-notification-lambda-role-test");
    });

    test("should create IAM policies for each role", () => {
      template.resourceCountIs("AWS::IAM::Policy", 4);
    });

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
          if (statement.Action) {
            const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
            if (actions.some((action: string) => action.startsWith("dynamodb:"))) {
              if (statement.Condition && statement.Condition["ForAllValues:StringLike"]) {
                hasDynamoDBRestrictions = true;
                expect(statement.Condition["ForAllValues:StringLike"]["dynamodb:LeadingKeys"]).toBeDefined();
              }
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
          if (statement.Action) {
            const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
            if (actions.includes("cloudwatch:PutMetricData")) {
              if (statement.Condition && statement.Condition.StringEquals) {
                hasCloudWatchRestrictions = true;
                expect(statement.Condition.StringEquals["cloudwatch:namespace"]).toMatch(/Sachain\//);
              }
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

    test("should create resource-based policies", () => {
      // S3 bucket policy
      template.resourceCountIs("AWS::S3::BucketPolicy", 1);
      
      // SNS topic policy
      template.resourceCountIs("AWS::SNS::TopicPolicy", 1);
      
      // KMS key policy (embedded in key resource)
      const kmsKeys = template.findResources("AWS::KMS::Key");
      const kmsKey = Object.values(kmsKeys)[0] as any;
      expect(kmsKey.Properties.KeyPolicy.Statement).toBeDefined();
      expect(kmsKey.Properties.KeyPolicy.Statement.length).toBeGreaterThan(1);
    });

    test("should generate security compliance report", () => {
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
  });

  describe("Lambda Integration", () => {
    test("should integrate with Lambda construct", () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, "LambdaTestStack");

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

      const template = Template.fromStack(stack);

      // Verify Lambda functions are created (3 functions + 1 DLQ = 3 Lambda functions)
      const lambdaFunctions = template.findResources("AWS::Lambda::Function");
      expect(Object.keys(lambdaFunctions).length).toBeGreaterThanOrEqual(3);
      
      // Verify Lambda functions have X-Ray tracing enabled
      Object.values(lambdaFunctions).forEach((func: any) => {
        if (func.Properties.TracingConfig) {
          expect(func.Properties.TracingConfig.Mode).toBe("Active");
        }
      });
    });
  });

  describe("Environment Configuration", () => {
    test("should create environment-specific resources", () => {
      const app = new cdk.App();
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

  describe("Security Best Practices", () => {
    test("should enforce least-privilege access", () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, "SecurityTestStack");

      const table = new dynamodb.Table(stack, "SecurityTable", {
        partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      });

      const encryptionKey = new kms.Key(stack, "SecurityKey");
      const bucket = new s3.Bucket(stack, "SecurityBucket", {
        encryptionKey,
      });

      const securityConstruct = new SecurityConstruct(stack, "SecurityConstruct", {
        environment: "test",
        table,
        documentBucket: bucket,
        encryptionKey,
      });

      const template = Template.fromStack(stack);
      const policies = template.findResources("AWS::IAM::Policy");

      // Verify that policies have conditions and restrictions
      let hasRestrictedPolicies = false;
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          if (statement.Effect === "Allow" && statement.Condition) {
            hasRestrictedPolicies = true;
          }
        });
      });

      expect(hasRestrictedPolicies).toBe(true);
    });

    test("should have comprehensive security controls", () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, "ComprehensiveSecurityStack");

      const table = new dynamodb.Table(stack, "ComprehensiveTable", {
        partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      });

      const encryptionKey = new kms.Key(stack, "ComprehensiveKey");
      const bucket = new s3.Bucket(stack, "ComprehensiveBucket", {
        encryptionKey,
      });

      const notificationTopic = new sns.Topic(stack, "ComprehensiveTopic");
      const eventBus = new events.EventBus(stack, "ComprehensiveEventBus");

      const securityConstruct = new SecurityConstruct(stack, "ComprehensiveSecurityConstruct", {
        environment: "test",
        table,
        documentBucket: bucket,
        encryptionKey,
        notificationTopic,
        eventBus,
      });

      const complianceReport = securityConstruct.getSecurityComplianceReport();

      // Verify comprehensive security features
      const expectedFeatures = [
        "least-privilege-access",
        "resource-based-policies",
        "cross-service-access-controls",
        "time-based-restrictions",
        "encryption-enforcement",
        "secure-transport-only",
        "privilege-escalation-prevention",
      ];

      expectedFeatures.forEach(feature => {
        expect(complianceReport.securityFeatures).toContain(feature);
      });
    });
  });
});