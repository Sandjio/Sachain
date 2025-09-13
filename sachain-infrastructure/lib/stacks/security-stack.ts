import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

import { EnvironmentType } from "../types";
import { SecurityConstruct } from "../constructs";

export interface SecurityStackProps extends cdk.StackProps {
  environment: EnvironmentType;
  table: dynamodb.ITable;
  sachainBucket: s3.Bucket;
  userPool: cognito.UserPool;
  // Note: Event resources (notificationTopic, eventBus) are created in LambdaStack
  // EventBridge permissions will be added directly in LambdaStack to avoid circular dependencies
}

export class SecurityStack extends cdk.Stack {
  public readonly securityConstruct: SecurityConstruct;

  // SecurityStackOutputs interface implementation
  public readonly kycUploadRole: iam.Role;
  public readonly adminReviewRole: iam.Role;
  public readonly userNotificationRole: iam.Role;
  public readonly kycProcessingRole: iam.Role;
  public readonly projectCreationRole: iam.Role;
  public readonly stockMintingRole: iam.Role;
  public readonly stockMintingStatusRole: iam.Role;
  public readonly complianceRole?: iam.Role;
  public readonly kycUploadRoleArn: string;
  public readonly adminReviewRoleArn: string;
  public readonly userNotificationRoleArn: string;
  public readonly kycProcessingRoleArn: string;
  public readonly projectCreationRoleArn: string;
  public readonly stockMintingRoleArn: string;
  public readonly stockMintingStatusRoleArn: string;
  public readonly complianceRoleArn?: string;
  public readonly omPaymentsRole: iam.Role;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    // Add environment tags
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Project", "Sachain");
    cdk.Tags.of(this).add("Component", "Security");

    // Create security construct with least-privilege IAM roles
    // Event resources (notificationTopic, eventBus) will come from LambdaStack after consolidation
    this.securityConstruct = new SecurityConstruct(this, "Security", {
      environment: props.environment,
      table: props.table,
      sachainBucket: props.sachainBucket,
    });

    // Expose roles for cross-stack references
    this.kycUploadRole = this.securityConstruct.kycUploadRole;
    this.adminReviewRole = this.securityConstruct.adminReviewRole;
    this.userNotificationRole = this.securityConstruct.userNotificationRole;
    this.kycProcessingRole = this.securityConstruct.kycProcessingRole;
    this.projectCreationRole = this.securityConstruct.projectCreationRole;
    this.stockMintingRole = this.securityConstruct.stockMintingRole;
    this.stockMintingStatusRole = this.securityConstruct.stockMintingStatusRole;
    this.omPaymentsRole = this.securityConstruct.omPaymentsRole;

    // Set role ARNs for interface compliance
    this.kycUploadRoleArn = this.kycUploadRole.roleArn;
    this.adminReviewRoleArn = this.adminReviewRole.roleArn;
    this.userNotificationRoleArn = this.userNotificationRole.roleArn;
    this.kycProcessingRoleArn = this.kycProcessingRole.roleArn;
    this.projectCreationRoleArn = this.projectCreationRole.roleArn;
    this.stockMintingRoleArn = this.stockMintingRole.roleArn;
    this.stockMintingStatusRoleArn = this.stockMintingStatusRole.roleArn;

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

    new cdk.CfnOutput(this, "ProjectCreationRoleArn", {
      value: this.projectCreationRole.roleArn,
      description: "Project Creation Lambda Role ARN",
      exportName: `${environment}-sachain-security-project-creation-role-arn`,
    });

    new cdk.CfnOutput(this, "StockMintingRoleArn", {
      value: this.stockMintingRole.roleArn,
      description: "Stock Minting Lambda Role ARN",
      exportName: `${environment}-sachain-security-stock-minting-role-arn`,
    });

    new cdk.CfnOutput(this, "StockMintingStatusRoleArn", {
      value: this.stockMintingStatusRole.roleArn,
      description: "Stock Minting Status Lambda Role ARN",
      exportName: `${environment}-sachain-security-stock-minting-status-role-arn`,
    });
  }

  /**
   * Get security compliance report
   */
  public getSecurityComplianceReport(): any {
    return this.securityConstruct.getSecurityComplianceReport();
  }
}
