import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";
import { SecurityConstruct } from "../constructs";
import { SecurityStackOutputs, StackDependencies } from "../interfaces";
import { CrossStackValidator, ResourceReferenceTracker } from "../utils";

export interface SecurityStackProps extends cdk.StackProps {
  environment: string;
  // Core resources from CoreStack
  table: dynamodb.Table;
  documentBucket: s3.Bucket;
  encryptionKey: kms.Key;
  // Event resources (optional for now, will be required when EventStack is created)
  notificationTopic?: sns.Topic;
  eventBus?: events.EventBus;
}

export class SecurityStack extends cdk.Stack implements SecurityStackOutputs {
  public readonly securityConstruct: SecurityConstruct;

  // SecurityStackOutputs interface implementation
  public readonly postAuthRole: iam.Role;
  public readonly kycUploadRole: iam.Role;
  public readonly adminReviewRole: iam.Role;
  public readonly userNotificationRole: iam.Role;
  public readonly kycProcessingRole: iam.Role;
  public readonly complianceRole?: iam.Role;
  public readonly postAuthRoleArn: string;
  public readonly kycUploadRoleArn: string;
  public readonly adminReviewRoleArn: string;
  public readonly userNotificationRoleArn: string;
  public readonly kycProcessingRoleArn: string;
  public readonly complianceRoleArn?: string;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    // Validate dependencies
    const dependencies: StackDependencies["security"] = {
      coreOutputs: {
        table: props.table,
        documentBucket: props.documentBucket,
        encryptionKey: props.encryptionKey,
      },
      eventOutputs:
        props.notificationTopic && props.eventBus
          ? {
              notificationTopic: props.notificationTopic,
              eventBus: props.eventBus,
            }
          : undefined,
    };

    CrossStackValidator.validateCoreStackOutputs(dependencies.coreOutputs, id);

    // Record cross-stack references for tracking
    ResourceReferenceTracker.recordReference(id, "CoreStack", "table");
    ResourceReferenceTracker.recordReference(id, "CoreStack", "documentBucket");
    ResourceReferenceTracker.recordReference(id, "CoreStack", "encryptionKey");

    if (dependencies.eventOutputs) {
      ResourceReferenceTracker.recordReference(
        id,
        "EventStack",
        "notificationTopic"
      );
      ResourceReferenceTracker.recordReference(id, "EventStack", "eventBus");
    }

    // Add environment tags
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Project", "Sachain");
    cdk.Tags.of(this).add("Component", "Security");

    // Create security construct with least-privilege IAM roles
    this.securityConstruct = new SecurityConstruct(this, "Security", {
      environment: props.environment,
      table: props.table,
      documentBucket: props.documentBucket,
      encryptionKey: props.encryptionKey,
      notificationTopic: props.notificationTopic,
      eventBus: props.eventBus,
    });

    // Expose roles for cross-stack references
    this.postAuthRole = this.securityConstruct.postAuthRole;
    this.kycUploadRole = this.securityConstruct.kycUploadRole;
    this.adminReviewRole = this.securityConstruct.adminReviewRole;
    this.userNotificationRole = this.securityConstruct.userNotificationRole;
    this.kycProcessingRole = this.securityConstruct.kycProcessingRole;

    // Set role ARNs for interface compliance
    this.postAuthRoleArn = this.postAuthRole.roleArn;
    this.kycUploadRoleArn = this.kycUploadRole.roleArn;
    this.adminReviewRoleArn = this.adminReviewRole.roleArn;
    this.userNotificationRoleArn = this.userNotificationRole.roleArn;
    this.kycProcessingRoleArn = this.kycProcessingRole.roleArn;

    // Create stack outputs for cross-stack references
    this.createStackOutputs(props.environment);
  }

  private createStackOutputs(environment: string): void {
    // Export role ARNs for use by other stacks
    new cdk.CfnOutput(this, "PostAuthRoleArn", {
      value: this.postAuthRole.roleArn,
      description: "Post-Authentication Lambda Role ARN",
      exportName: `${environment}-sachain-post-auth-role-arn`,
    });

    new cdk.CfnOutput(this, "KycUploadRoleArn", {
      value: this.kycUploadRole.roleArn,
      description: "KYC Upload Lambda Role ARN",
      exportName: `${environment}-sachain-kyc-upload-role-arn`,
    });

    new cdk.CfnOutput(this, "AdminReviewRoleArn", {
      value: this.adminReviewRole.roleArn,
      description: "Admin Review Lambda Role ARN",
      exportName: `${environment}-sachain-admin-review-role-arn`,
    });

    new cdk.CfnOutput(this, "UserNotificationRoleArn", {
      value: this.userNotificationRole.roleArn,
      description: "User Notification Lambda Role ARN",
      exportName: `${environment}-sachain-user-notification-role-arn`,
    });

    new cdk.CfnOutput(this, "KycProcessingRoleArn", {
      value: this.kycProcessingRole.roleArn,
      description: "KYC Processing Lambda Role ARN",
      exportName: `${environment}-sachain-kyc-processing-role-arn`,
    });
  }

  /**
   * Get security compliance report
   */
  public getSecurityComplianceReport(): any {
    return this.securityConstruct.getSecurityComplianceReport();
  }
}
