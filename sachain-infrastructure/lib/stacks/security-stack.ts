import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { SecurityConstruct } from "../constructs";
import { SecurityStackOutputs, StackDependencies } from "../interfaces";
import { CrossStackValidator, ResourceReferenceTracker } from "../utils";

export interface SecurityStackProps extends cdk.StackProps {
  environment: string;
  // Core resources from CoreStack (now includes auth resources)
  table: dynamodb.Table;
  documentBucket: s3.Bucket;
  encryptionKey: kms.Key;
  userPool: cognito.UserPool;
  // Note: Event resources (notificationTopic, eventBus) are created in LambdaStack
  // EventBridge permissions will be added directly in LambdaStack to avoid circular dependencies
}

export class SecurityStack extends cdk.Stack implements SecurityStackOutputs {
  public readonly securityConstruct: SecurityConstruct;

  // SecurityStackOutputs interface implementation
  public readonly kycUploadRole: iam.Role;
  public readonly adminReviewRole: iam.Role;
  public readonly userNotificationRole: iam.Role;
  public readonly kycProcessingRole: iam.Role;
  public readonly complianceRole?: iam.Role;
  public readonly kycUploadRoleArn: string;
  public readonly adminReviewRoleArn: string;
  public readonly userNotificationRoleArn: string;
  public readonly kycProcessingRoleArn: string;
  public readonly complianceRoleArn?: string;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    // Validate dependencies - now all resources come from CoreStack (consolidated)
    const dependencies: StackDependencies["security"] = {
      coreOutputs: {
        table: props.table,
        documentBucket: props.documentBucket,
        encryptionKey: props.encryptionKey,
        userPool: props.userPool,
      },
    };

    CrossStackValidator.validateCoreStackOutputs(dependencies.coreOutputs, id, [
      "table",
      "documentBucket",
      "encryptionKey",
      "userPool",
    ]);

    // Record cross-stack references for tracking - all from CoreStack now
    ResourceReferenceTracker.recordReference(id, "CoreStack", "table");
    ResourceReferenceTracker.recordReference(id, "CoreStack", "documentBucket");
    ResourceReferenceTracker.recordReference(id, "CoreStack", "encryptionKey");
    ResourceReferenceTracker.recordReference(id, "CoreStack", "userPool");

    // Add environment tags
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Project", "Sachain");
    cdk.Tags.of(this).add("Component", "Security");

    // Create security construct with least-privilege IAM roles
    // Event resources (notificationTopic, eventBus) will come from LambdaStack after consolidation
    this.securityConstruct = new SecurityConstruct(this, "Security", {
      environment: props.environment,
      table: props.table,
      documentBucket: props.documentBucket,
      encryptionKey: props.encryptionKey,
      // EventBridge permissions will be added in LambdaStack to avoid circular dependencies
    });

    // Expose roles for cross-stack references
    this.kycUploadRole = this.securityConstruct.kycUploadRole;
    this.adminReviewRole = this.securityConstruct.adminReviewRole;
    this.userNotificationRole = this.securityConstruct.userNotificationRole;
    this.kycProcessingRole = this.securityConstruct.kycProcessingRole;

    // Set role ARNs for interface compliance
    this.kycUploadRoleArn = this.kycUploadRole.roleArn;
    this.adminReviewRoleArn = this.adminReviewRole.roleArn;
    this.userNotificationRoleArn = this.userNotificationRole.roleArn;
    this.kycProcessingRoleArn = this.kycProcessingRole.roleArn;

    // Create stack outputs for cross-stack references
    this.createStackOutputs(props.environment);
  }

  private createStackOutputs(environment: string): void {
    // Export role ARNs for use by other stacks - using updated export names for consolidated structure
    new cdk.CfnOutput(this, "KycUploadRoleArn", {
      value: this.kycUploadRole.roleArn,
      description: "KYC Upload Lambda Role ARN",
      exportName: `${environment}-sachain-security-kyc-upload-role-arn`,
    });

    new cdk.CfnOutput(this, "AdminReviewRoleArn", {
      value: this.adminReviewRole.roleArn,
      description: "Admin Review Lambda Role ARN",
      exportName: `${environment}-sachain-security-admin-review-role-arn`,
    });

    new cdk.CfnOutput(this, "UserNotificationRoleArn", {
      value: this.userNotificationRole.roleArn,
      description: "User Notification Lambda Role ARN",
      exportName: `${environment}-sachain-security-user-notification-role-arn`,
    });

    new cdk.CfnOutput(this, "KycProcessingRoleArn", {
      value: this.kycProcessingRole.roleArn,
      description: "KYC Processing Lambda Role ARN",
      exportName: `${environment}-sachain-security-kyc-processing-role-arn`,
    });
  }

  /**
   * Get security compliance report
   */
  public getSecurityComplianceReport(): any {
    return this.securityConstruct.getSecurityComplianceReport();
  }
}
