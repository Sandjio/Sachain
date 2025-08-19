import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import { Template } from "aws-cdk-lib/assertions";
import { SecurityStack } from "../../lib/stacks/security-stack";

describe("SecurityStack", () => {
  test("creates SecurityStack successfully", () => {
    const app = new cdk.App();

    // Create a separate stack for mock resources
    const mockStack = new cdk.Stack(app, "MockStack");

    // Create mock resources using imported ARNs to avoid dependencies
    const mockTable = dynamodb.Table.fromTableArn(
      mockStack,
      "MockTable",
      "arn:aws:dynamodb:us-east-1:123456789012:table/mock-table"
    );
    const mockBucket = s3.Bucket.fromBucketArn(
      mockStack,
      "MockBucket",
      "arn:aws:s3:::mock-bucket"
    );
    const mockKey = kms.Key.fromKeyArn(
      mockStack,
      "MockKey",
      "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
    );

    const stack = new SecurityStack(app, "TestSecurityStack", {
      environment: "test",
      table: mockTable,
      documentBucket: mockBucket,
      encryptionKey: mockKey,
    });

    expect(stack).toBeDefined();
    expect(stack.securityConstruct).toBeDefined();
    expect(stack.postAuthRole).toBeDefined();
    expect(stack.kycUploadRole).toBeDefined();
    expect(stack.adminReviewRole).toBeDefined();
    expect(stack.userNotificationRole).toBeDefined();
    expect(stack.kycProcessingRole).toBeDefined();

    const template = Template.fromStack(stack);

    // Verify all IAM roles are created (SecurityConstruct creates 5 roles)
    template.resourceCountIs("AWS::IAM::Role", 5);
  });

  test("creates stack outputs for role ARNs", () => {
    const app = new cdk.App();
    const mockStack = new cdk.Stack(app, "MockStack");

    const mockTable = dynamodb.Table.fromTableArn(
      mockStack,
      "MockTable",
      "arn:aws:dynamodb:us-east-1:123456789012:table/mock-table"
    );
    const mockBucket = s3.Bucket.fromBucketArn(
      mockStack,
      "MockBucket",
      "arn:aws:s3:::mock-bucket"
    );
    const mockKey = kms.Key.fromKeyArn(
      mockStack,
      "MockKey",
      "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
    );

    const stack = new SecurityStack(app, "TestSecurityStack", {
      environment: "test",
      table: mockTable,
      documentBucket: mockBucket,
      encryptionKey: mockKey,
    });

    const template = Template.fromStack(stack);

    // Check that all role ARNs are exported
    template.hasOutput("PostAuthRoleArn", {
      Description: "Post-Authentication Lambda Role ARN",
      Export: {
        Name: "test-sachain-post-auth-role-arn",
      },
    });

    template.hasOutput("KycUploadRoleArn", {
      Description: "KYC Upload Lambda Role ARN",
      Export: {
        Name: "test-sachain-kyc-upload-role-arn",
      },
    });

    template.hasOutput("AdminReviewRoleArn", {
      Description: "Admin Review Lambda Role ARN",
      Export: {
        Name: "test-sachain-admin-review-role-arn",
      },
    });

    template.hasOutput("UserNotificationRoleArn", {
      Description: "User Notification Lambda Role ARN",
      Export: {
        Name: "test-sachain-user-notification-role-arn",
      },
    });

    template.hasOutput("KycProcessingRoleArn", {
      Description: "KYC Processing Lambda Role ARN",
      Export: {
        Name: "test-sachain-kyc-processing-role-arn",
      },
    });
  });

  test("returns security compliance report", () => {
    const app = new cdk.App();
    const mockStack = new cdk.Stack(app, "MockStack");

    const mockTable = dynamodb.Table.fromTableArn(
      mockStack,
      "MockTable",
      "arn:aws:dynamodb:us-east-1:123456789012:table/mock-table"
    );
    const mockBucket = s3.Bucket.fromBucketArn(
      mockStack,
      "MockBucket",
      "arn:aws:s3:::mock-bucket"
    );
    const mockKey = kms.Key.fromKeyArn(
      mockStack,
      "MockKey",
      "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
    );

    const stack = new SecurityStack(app, "TestSecurityStack", {
      environment: "test",
      table: mockTable,
      documentBucket: mockBucket,
      encryptionKey: mockKey,
    });

    const report = stack.getSecurityComplianceReport();

    expect(report).toHaveProperty("roles");
    expect(report).toHaveProperty("securityFeatures");

    // Check that all roles are included in the report (SecurityConstruct has 4 roles)
    expect(report.roles).toHaveProperty("postAuth");
    expect(report.roles).toHaveProperty("kycUpload");
    expect(report.roles).toHaveProperty("adminReview");
    expect(report.roles).toHaveProperty("userNotification");

    // Check security features
    expect(report.securityFeatures).toContain("least-privilege-access");
    expect(report.securityFeatures).toContain("resource-based-policies");
    expect(report.securityFeatures).toContain(
      "privilege-escalation-prevention"
    );
  });
});
