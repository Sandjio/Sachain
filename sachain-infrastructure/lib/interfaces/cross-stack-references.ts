/**
 * Cross-Stack Reference Interfaces
 *
 * This file defines TypeScript interfaces for cross-stack communication
 * to ensure type safety and proper resource sharing between stacks.
 */

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";

/**
 * Core Stack Outputs
 * Contains foundational resources (DynamoDB, S3, KMS) and authentication resources (Cognito)
 */
export interface CoreStackOutputs {
  // DynamoDB resources
  table: dynamodb.Table;
  tableName: string;
  tableArn: string;

  // S3 resources
  documentBucket: s3.Bucket;
  bucketName: string;
  bucketArn: string;

  // KMS resources
  encryptionKey: kms.Key;
  kmsKeyArn: string;
  kmsKeyId: string;

  // Cognito resources (consolidated from AuthStack)
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  userPoolId: string;
  userPoolArn: string;
  userPoolClientId: string;
  userPoolDomain: string;

  // Post-authentication lambda (moved from LambdaStack)
  postAuthLambda: lambda.Function;
  postAuthLambdaArn: string;
}

/**
 * Security Stack Outputs
 * Contains IAM roles and policies with least-privilege access
 */
export interface SecurityStackOutputs {
  // Lambda execution roles
  kycUploadRole: iam.Role;
  adminReviewRole: iam.Role;
  userNotificationRole: iam.Role;
  kycProcessingRole: iam.Role;
  complianceRole?: iam.Role; // Optional for future compliance lambda

  // Role ARNs for cross-stack references
  kycUploadRoleArn: string;
  adminReviewRoleArn: string;
  userNotificationRoleArn: string;
  kycProcessingRoleArn: string;
  complianceRoleArn?: string;
}

/**
 * Lambda Stack Outputs
 * Contains Lambda functions, API Gateway, and event-driven resources (EventBridge, SNS)
 */
export interface LambdaStackOutputs {
  // Lambda functions (excluding post-auth which moved to CoreStack)
  kycUploadLambda: lambda.Function;
  adminReviewLambda: lambda.Function;
  userNotificationLambda: lambda.Function;
  kycProcessingLambda: lambda.Function;
  complianceLambda?: lambda.Function; // Optional for future compliance lambda

  // Lambda function ARNs
  kycUploadLambdaArn: string;
  adminReviewLambdaArn: string;
  userNotificationLambdaArn: string;
  kycProcessingLambdaArn: string;
  complianceLambdaArn?: string;

  // API Gateway resources
  api: apigateway.RestApi;
  apiUrl: string;
  apiId: string;
  apiRootResourceId: string;

  // EventBridge resources (consolidated from EventStack)
  eventBus: events.EventBus;
  eventBusName: string;
  eventBusArn: string;

  // SNS topics
  notificationTopic: sns.Topic;
  userNotificationTopic: sns.Topic;
  adminNotificationTopicArn: string;
  userNotificationTopicArn: string;

  // Event rules
  kycStatusChangeRule: events.Rule;
  kycDocumentUploadedRule: events.Rule;
  kycReviewCompletedRule: events.Rule;
  kycStatusChangeRuleArn: string;
  kycDocumentUploadedRuleArn: string;
  kycReviewCompletedRuleArn: string;
}

/**
 * Monitoring Stack Outputs
 * Contains CloudWatch dashboards, alarms, and monitoring resources
 */
export interface MonitoringStackOutputs {
  // CloudWatch resources
  dashboard: cloudwatch.Dashboard;
  alertTopic: sns.Topic;
  alarms: cloudwatch.Alarm[];

  // Monitoring identifiers
  dashboardUrl: string;
  dashboardName: string;
  alertTopicArn: string;
  alarmArns: string[];
  alarmCount: number;
}

/**
 * Complete Cross-Stack References
 * Aggregates all stack outputs for comprehensive cross-stack communication
 */
export interface CrossStackReferences {
  core: CoreStackOutputs;
  security: SecurityStackOutputs;
  lambda: LambdaStackOutputs;
  monitoring: MonitoringStackOutputs;
}

/**
 * Stack Configuration Interface
 * Common configuration properties for all stacks
 */
export interface StackConfig {
  environment: string;
  account?: string;
  region?: string;
  adminEmails?: string[];
  enableDetailedMonitoring?: boolean;
  alertEmail?: string;
}

/**
 * Stack Dependencies Interface
 * Defines which resources each stack depends on from other stacks
 */
export interface StackDependencies {
  core: {
    // CoreStack has no dependencies - now includes auth resources
  };

  security: {
    // SecurityStack depends on CoreStack (which now includes auth resources)
    coreOutputs: Pick<
      CoreStackOutputs,
      "table" | "documentBucket" | "encryptionKey" | "userPool"
    >;
  };

  lambda: {
    // LambdaStack depends on CoreStack and SecurityStack (now includes event resources)
    coreOutputs: Pick<
      CoreStackOutputs,
      | "table"
      | "documentBucket"
      | "encryptionKey"
      | "userPool"
      | "userPoolClient"
      | "postAuthLambda"
    >;
    securityOutputs: Pick<
      SecurityStackOutputs,
      | "kycUploadRole"
      | "adminReviewRole"
      | "userNotificationRole"
      | "kycProcessingRole"
    >;
  };

  monitoring: {
    // MonitoringStack depends on LambdaStack and CoreStack
    lambdaOutputs: Pick<
      LambdaStackOutputs,
      | "kycUploadLambda"
      | "adminReviewLambda"
      | "userNotificationLambda"
      | "kycProcessingLambda"
      | "complianceLambda"
    >;
    coreOutputs: Pick<CoreStackOutputs, "postAuthLambda">;
  };
}

/**
 * Export Names Interface
 * Standardizes CloudFormation export names for cross-stack references
 */
export interface ExportNames {
  // Core Stack exports (including auth resources)
  tableName: (environment: string) => string;
  tableArn: (environment: string) => string;
  bucketName: (environment: string) => string;
  bucketArn: (environment: string) => string;
  kmsKeyArn: (environment: string) => string;
  kmsKeyId: (environment: string) => string;
  userPoolId: (environment: string) => string;
  userPoolArn: (environment: string) => string;
  userPoolClientId: (environment: string) => string;
  userPoolDomain: (environment: string) => string;
  postAuthLambdaArn: (environment: string) => string;

  // Security Stack exports
  kycUploadRoleArn: (environment: string) => string;
  adminReviewRoleArn: (environment: string) => string;
  userNotificationRoleArn: (environment: string) => string;
  kycProcessingRoleArn: (environment: string) => string;

  // Lambda Stack exports (including event resources)
  apiUrl: (environment: string) => string;
  apiId: (environment: string) => string;
  apiRootResourceId: (environment: string) => string;
  kycUploadLambdaArn: (environment: string) => string;
  adminReviewLambdaArn: (environment: string) => string;
  userNotificationLambdaArn: (environment: string) => string;
  kycProcessingLambdaArn: (environment: string) => string;
  eventBusName: (environment: string) => string;
  eventBusArn: (environment: string) => string;
  adminNotificationTopicArn: (environment: string) => string;
  userNotificationTopicArn: (environment: string) => string;
  kycStatusChangeRuleArn: (environment: string) => string;
  kycDocumentUploadedRuleArn: (environment: string) => string;
  kycReviewCompletedRuleArn: (environment: string) => string;

  // Monitoring Stack exports
  dashboardUrl: (environment: string) => string;
  dashboardName: (environment: string) => string;
  alertTopicArn: (environment: string) => string;
  alarmCount: (environment: string) => string;
}

/**
 * Standard export names implementation
 */
export const EXPORT_NAMES: ExportNames = {
  // Core Stack exports (including auth resources)
  tableName: (env) => `${env}-sachain-core-table-name`,
  tableArn: (env) => `${env}-sachain-core-table-arn`,
  bucketName: (env) => `${env}-sachain-core-bucket-name`,
  bucketArn: (env) => `${env}-sachain-core-bucket-arn`,
  kmsKeyArn: (env) => `${env}-sachain-core-kms-key-arn`,
  kmsKeyId: (env) => `${env}-sachain-core-kms-key-id`,
  userPoolId: (env) => `${env}-sachain-core-user-pool-id`,
  userPoolArn: (env) => `${env}-sachain-core-user-pool-arn`,
  userPoolClientId: (env) => `${env}-sachain-core-user-pool-client-id`,
  userPoolDomain: (env) => `${env}-sachain-core-user-pool-domain`,
  postAuthLambdaArn: (env) => `${env}-sachain-core-post-auth-lambda-arn`,

  // Security Stack exports
  kycUploadRoleArn: (env) => `${env}-sachain-security-kyc-upload-role-arn`,
  adminReviewRoleArn: (env) => `${env}-sachain-security-admin-review-role-arn`,
  userNotificationRoleArn: (env) =>
    `${env}-sachain-security-user-notification-role-arn`,
  kycProcessingRoleArn: (env) =>
    `${env}-sachain-security-kyc-processing-role-arn`,

  // Lambda Stack exports (including event resources)
  apiUrl: (env) => `${env}-sachain-lambda-api-url`,
  apiId: (env) => `${env}-sachain-lambda-api-id`,
  apiRootResourceId: (env) => `${env}-sachain-lambda-api-root-resource-id`,
  kycUploadLambdaArn: (env) => `${env}-sachain-lambda-kyc-upload-lambda-arn`,
  adminReviewLambdaArn: (env) =>
    `${env}-sachain-lambda-admin-review-lambda-arn`,
  userNotificationLambdaArn: (env) =>
    `${env}-sachain-lambda-user-notification-lambda-arn`,
  kycProcessingLambdaArn: (env) =>
    `${env}-sachain-lambda-kyc-processing-lambda-arn`,
  eventBusName: (env) => `${env}-sachain-lambda-event-bus-name`,
  eventBusArn: (env) => `${env}-sachain-lambda-event-bus-arn`,
  adminNotificationTopicArn: (env) =>
    `${env}-sachain-lambda-admin-notification-topic-arn`,
  userNotificationTopicArn: (env) =>
    `${env}-sachain-lambda-user-notification-topic-arn`,
  kycStatusChangeRuleArn: (env) =>
    `${env}-sachain-lambda-kyc-status-change-rule-arn`,
  kycDocumentUploadedRuleArn: (env) =>
    `${env}-sachain-lambda-kyc-document-uploaded-rule-arn`,
  kycReviewCompletedRuleArn: (env) =>
    `${env}-sachain-lambda-kyc-review-completed-rule-arn`,

  // Monitoring Stack exports
  dashboardUrl: (env) => `${env}-sachain-monitoring-dashboard-url`,
  dashboardName: (env) => `${env}-sachain-monitoring-dashboard-name`,
  alertTopicArn: (env) => `${env}-sachain-monitoring-alert-topic-arn`,
  alarmCount: (env) => `${env}-sachain-monitoring-alarm-count`,
};
