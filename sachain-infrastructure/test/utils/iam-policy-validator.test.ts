import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { IAMPolicyValidator, PolicyValidationResult } from "../../lib/utils/iam-policy-validator";

describe("IAMPolicyValidator", () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");
  });

  describe("validatePolicy", () => {
    test("should pass validation for secure policy", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
            resources: ["arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"],
            conditions: {
              "ForAllValues:StringLike": {
                "dynamodb:LeadingKeys": ["USER#*"],
              },
            },
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ["iam:*"],
            resources: ["*"],
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      expect(result.complianceScore).toBeGreaterThan(80);
      expect(result.violations.filter(v => v.severity === "HIGH")).toHaveLength(0);
    });

    test("should detect overly broad permissions", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["*"],
            resources: ["*"],
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === "OVERLY_BROAD_PERMISSIONS")).toBe(true);
      expect(result.complianceScore).toBeLessThan(50);
    });

    test("should detect missing required conditions for S3 operations", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:PutObject"],
            resources: ["arn:aws:s3:::my-bucket/*"],
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      expect(result.violations.some(v => v.type === "MISSING_REQUIRED_CONDITION")).toBe(true);
      expect(result.violations.some(v => v.description.includes("s3:x-amz-server-side-encryption"))).toBe(true);
    });

    test("should detect unrestricted resource access", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:Scan"],
            resources: ["*"],
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      expect(result.violations.some(v => v.type === "UNRESTRICTED_RESOURCE_ACCESS")).toBe(true);
    });

    test("should detect missing privilege escalation prevention", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:GetItem"],
            resources: ["arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"],
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      expect(result.violations.some(v => v.type === "MISSING_PRIVILEGE_ESCALATION_PREVENTION")).toBe(true);
    });

    test("should detect missing time restrictions for destructive actions", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:DeleteItem"],
            resources: ["arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"],
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      expect(result.violations.some(v => v.type === "MISSING_TIME_RESTRICTION")).toBe(true);
    });

    test("should generate appropriate recommendations", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["*"],
            resources: ["*"],
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      expect(result.recommendations).toContain("Implement least-privilege access principles");
      expect(result.recommendations).toContain("Use resource-specific ARNs instead of wildcards");
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("validateMultiplePolicies", () => {
    test("should validate multiple policies and provide summary", () => {
      const policies = [
        {
          name: "SecurePolicy",
          policy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["dynamodb:GetItem"],
                resources: ["arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"],
                conditions: {
                  "ForAllValues:StringLike": {
                    "dynamodb:LeadingKeys": ["USER#*"],
                  },
                },
              }),
            ],
          }),
        },
        {
          name: "InsecurePolicy",
          policy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["*"],
                resources: ["*"],
              }),
            ],
          }),
        },
      ];

      const result = IAMPolicyValidator.validateMultiplePolicies(policies);
      
      expect(result.results).toHaveLength(2);
      expect(result.summary.totalViolations).toBeGreaterThan(0);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThan(100);
    });

    test("should calculate correct overall score", () => {
      const policies = [
        {
          name: "Policy1",
          policy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["dynamodb:GetItem"],
                resources: ["arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"],
              }),
            ],
          }),
        },
        {
          name: "Policy2",
          policy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["s3:GetObject"],
                resources: ["arn:aws:s3:::my-bucket/*"],
              }),
            ],
          }),
        },
      ];

      const result = IAMPolicyValidator.validateMultiplePolicies(policies);
      
      expect(result.overallScore).toBe(
        (result.results[0].result.complianceScore + result.results[1].result.complianceScore) / 2
      );
    });
  });

  describe("compliance scoring", () => {
    test("should assign higher scores to more secure policies", () => {
      const securePolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:GetItem"],
            resources: ["arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"],
            conditions: {
              "ForAllValues:StringLike": {
                "dynamodb:LeadingKeys": ["USER#*"],
              },
            },
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ["iam:*"],
            resources: ["*"],
          }),
        ],
      });

      const insecurePolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["*"],
            resources: ["*"],
          }),
        ],
      });

      const secureResult = IAMPolicyValidator.validatePolicy(securePolicy);
      const insecureResult = IAMPolicyValidator.validatePolicy(insecurePolicy);
      
      expect(secureResult.complianceScore).toBeGreaterThan(insecureResult.complianceScore);
    });

    test("should penalize high-severity violations more than medium-severity", () => {
      const highSeverityPolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["*"],
            resources: ["*"],
          }),
        ],
      });

      const mediumSeverityPolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:*"],
            resources: ["arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"],
          }),
        ],
      });

      const highResult = IAMPolicyValidator.validatePolicy(highSeverityPolicy);
      const mediumResult = IAMPolicyValidator.validatePolicy(mediumSeverityPolicy);
      
      expect(highResult.complianceScore).toBeLessThan(mediumResult.complianceScore);
    });
  });

  describe("security best practices validation", () => {
    test("should validate KMS ViaService conditions", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["kms:Decrypt"],
            resources: ["arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"],
            conditions: {
              StringEquals: {
                "kms:ViaService": "s3.us-east-1.amazonaws.com",
              },
            },
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      // Should not flag this as a violation since it has proper ViaService condition
      expect(result.violations.filter(v => v.type === "MISSING_REQUIRED_CONDITION")).toHaveLength(0);
    });

    test("should validate CloudWatch namespace restrictions", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["cloudwatch:PutMetricData"],
            resources: ["*"],
            conditions: {
              StringEquals: {
                "cloudwatch:namespace": "Sachain/PostAuth",
              },
            },
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      // Should not flag this as a violation since it has proper namespace restriction
      expect(result.violations.filter(v => v.type === "MISSING_REQUIRED_CONDITION")).toHaveLength(0);
    });

    test("should validate EventBridge source restrictions", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["events:PutEvents"],
            resources: ["arn:aws:events:us-east-1:123456789012:event-bus/sachain-kyc"],
            conditions: {
              StringEquals: {
                "events:source": "sachain.kyc",
              },
            },
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      // Should not flag this as a violation since it has proper source restriction
      expect(result.violations.filter(v => v.type === "MISSING_REQUIRED_CONDITION")).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    test("should handle empty policy document", () => {
      const policy = new iam.PolicyDocument({
        statements: [],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      expect(result.violations.some(v => v.type === "MISSING_PRIVILEGE_ESCALATION_PREVENTION")).toBe(true);
      expect(result.complianceScore).toBeLessThan(100);
    });

    test("should handle policy with only DENY statements", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ["*"],
            resources: ["*"],
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      // DENY statements should not trigger broad permissions violations
      expect(result.violations.filter(v => v.type === "OVERLY_BROAD_PERMISSIONS")).toHaveLength(0);
    });

    test("should handle complex conditions", () => {
      const policy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:GetObject"],
            resources: ["*"],
            conditions: {
              StringEquals: {
                "s3:x-amz-server-side-encryption": "aws:kms",
              },
              IpAddress: {
                "aws:SourceIp": "203.0.113.0/24",
              },
              DateGreaterThan: {
                "aws:CurrentTime": "2023-01-01T00:00:00Z",
              },
            },
          }),
        ],
      });

      const result = IAMPolicyValidator.validatePolicy(policy);
      
      // Should not flag unrestricted resource access due to restrictive conditions
      expect(result.violations.filter(v => v.type === "UNRESTRICTED_RESOURCE_ACCESS")).toHaveLength(0);
    });
  });
});