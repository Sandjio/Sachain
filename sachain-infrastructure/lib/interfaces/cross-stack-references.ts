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
 * Contains foundational resources (DynamoDB, S3, KMS)
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
}

/**
 * Security Stack Outputs
 * Contains IAM roles and policies with least-privilege access
 */
export interface SecurityStackOutputs {
  // Lambda execution roles
  postAuthRole: iam.Role;
  kycUploadRole: iam.Role;
  adminReviewRole: iam.Role;
  userNotificationRole: iam.Role;
  kycProcessingRole: iam.Role;
  complianceRole?: iam.Role; // Optional for future compliance lambda

  // Role ARNs for cross-stack references
  postAuthRoleArn: string;
  kycUploadRoleArn: string;
  adminReviewRoleArn: string;
  userNotificationRoleArn: string;
  kycProcessingRoleArn: string;
  complianceRoleArn?: string;
}

/**
 * Event Stack Outputs
 * Contains EventBridge and SNS resources for event-driven architecture
 */
export interface EventStackOutputs {
  // EventBridge resources
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
 * Auth Stack Outputs
 * Contains Cognito User Pool and related authentication resources
 */
export interface AuthStackOutputs {
  // Cognito resources
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;

  // Identifiers for API Gateway authorization
  userPoolId: string;
  userPoolArn: string;
  userPoolClientId: string;
  userPoolDomain: string;
}

/**
 * Lambda Stack Outputs
 * Contains Lambda functions and API Gateway
 */
export interface LambdaStackOutputs {
  // Lambda functions
  postAuthLambda: lambda.Function;
  kycUploadLambda: lambda.Function;
  adminReviewLambda: lambda.Function;
  userNotificationLambda: lambda.Function;
  kycProcessingLambda: lambda.Function;
  complianceLambda?: lambda.Function; // Optional for future compliance lambda

  // Lambda function ARNs
  postAuthLambdaArn: string;
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
  events: EventStackOutputs;
  auth: AuthStackOutputs;
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
    // CoreStack has no dependencies
  };

  security: {
    // SecurityStack depends on CoreStack and EventStack
    coreOutputs: Pick<
      CoreStackOutputs,
      "table" | "documentBucket" | "encryptionKey"
    >;
    eventOutputs?: Pick<EventStackOutputs, "notificationTopic" | "eventBus">;
  };

  events: {
    // EventStack has no dependencies
  };

  auth: {
    // AuthStack optionally depends on LambdaStack for post-auth trigger
    lambdaOutputs?: Pick<LambdaStackOutputs, "postAuthLambda">;
  };

  lambda: {
    // LambdaStack depends on all other stacks except monitoring
    coreOutputs: Pick<
      CoreStackOutputs,
      "table" | "documentBucket" | "encryptionKey"
    >;
    securityOutputs: Pick<
      SecurityStackOutputs,
      | "postAuthRole"
      | "kycUploadRole"
      | "adminReviewRole"
      | "userNotificationRole"
      | "kycProcessingRole"
    >;
    eventOutputs: Pick<
      EventStackOutputs,
      | "eventBus"
      | "notificationTopic"
      | "kycDocumentUploadedRule"
      | "kycStatusChangeRule"
    >;
    authOutputs: Pick<AuthStackOutputs, "userPool" | "userPoolClient">;
  };

  monitoring: {
    // MonitoringStack depends on LambdaStack
    lambdaOutputs: Pick<
      LambdaStackOutputs,
      | "postAuthLambda"
      | "kycUploadLambda"
      | "adminReviewLambda"
      | "userNotificationLambda"
      | "kycProcessingLambda"
      | "complianceLambda"
    >;
  };
}

/**
 * Export Names Interface
 * Standardizes CloudFormation export names for cross-stack references
 */
export interface ExportNames {
  // Core Stack exports
  tableName: (environment: string) => string;
  tableArn: (environment: string) => string;
  bucketName: (environment: string) => string;
  bucketArn: (environment: string) => string;
  kmsKeyArn: (environment: string) => string;
  kmsKeyId: (environment: string) => string;

  // Security Stack exports
  postAuthRoleArn: (environment: string) => string;
  kycUploadRoleArn: (environment: string) => string;
  adminReviewRoleArn: (environment: string) => string;
  userNotificationRoleArn: (environment: string) => string;
  kycProcessingRoleArn: (environment: string) => string;

  // Event Stack exports
  eventBusName: (environment: string) => string;
  eventBusArn: (environment: string) => string;
  adminNotificationTopicArn: (environment: string) => string;
  userNotificationTopicArn: (environment: string) => string;
  kycStatusChangeRuleArn: (environment: string) => string;
  kycDocumentUploadedRuleArn: (environment: string) => string;
  kycReviewCompletedRuleArn: (environment: string) => string;

  // Auth Stack exports
  userPoolId: (environment: string) => string;
  userPoolArn: (environment: string) => string;
  userPoolClientId: (environment: string) => string;
  userPoolDomain: (environment: string) => string;

  // Lambda Stack exports
  apiUrl: (environment: string) => string;
  apiId: (environment: string) => string;
  apiRootResourceId: (environment: string) => string;
  postAuthLambdaArn: (environment: string) => string;
  kycUploadLambdaArn: (environment: string) => string;
  adminReviewLambdaArn: (environment: string) => string;
  userNotificationLambdaArn: (environment: string) => string;
  kycProcessingLambdaArn: (environment: string) => string;

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
  // Core Stack exports
  tableName: (env) => `${env}-sachain-table-name`,
  tableArn: (env) => `${env}-sachain-table-arn`,
  bucketName: (env) => `${env}-sachain-bucket-name`,
  bucketArn: (env) => `${env}-sachain-bucket-arn`,
  kmsKeyArn: (env) => `${env}-sachain-kms-key-arn`,
  kmsKeyId: (env) => `${env}-sachain-kms-key-id`,

  // Security Stack exports
  postAuthRoleArn: (env) => `${env}-sachain-post-auth-role-arn`,
  kycUploadRoleArn: (env) => `${env}-sachain-kyc-upload-role-arn`,
  adminReviewRoleArn: (env) => `${env}-sachain-admin-review-role-arn`,
  userNotificationRoleArn: (env) => `${env}-sachain-user-notification-role-arn`,
  kycProcessingRoleArn: (env) => `${env}-sachain-kyc-processing-role-arn`,

  // Event Stack exports
  eventBusName: (env) => `${env}-sachain-event-bus-name`,
  eventBusArn: (env) => `${env}-sachain-event-bus-arn`,
  adminNotificationTopicArn: (env) =>
    `${env}-sachain-admin-notification-topic-arn`,
  userNotificationTopicArn: (env) =>
    `${env}-sachain-user-notification-topic-arn`,
  kycStatusChangeRuleArn: (env) => `${env}-sachain-kyc-status-change-rule-arn`,
  kycDocumentUploadedRuleArn: (env) =>
    `${env}-sachain-kyc-document-uploaded-rule-arn`,
  kycReviewCompletedRuleArn: (env) =>
    `${env}-sachain-kyc-review-completed-rule-arn`,

  // Auth Stack exports
  userPoolId: (env) => `${env}-sachain-user-pool-id`,
  userPoolArn: (env) => `${env}-sachain-user-pool-arn`,
  userPoolClientId: (env) => `${env}-sachain-user-pool-client-id`,
  userPoolDomain: (env) => `${env}-sachain-user-pool-domain`,

  // Lambda Stack exports
  apiUrl: (env) => `${env}-sachain-api-url`,
  apiId: (env) => `${env}-sachain-api-id`,
  apiRootResourceId: (env) => `${env}-sachain-api-root-resource-id`,
  postAuthLambdaArn: (env) => `${env}-sachain-post-auth-lambda-arn`,
  kycUploadLambdaArn: (env) => `${env}-sachain-kyc-upload-lambda-arn`,
  adminReviewLambdaArn: (env) => `${env}-sachain-admin-review-lambda-arn`,
  userNotificationLambdaArn: (env) =>
    `${env}-sachain-user-notification-lambda-arn`,
  kycProcessingLambdaArn: (env) => `${env}-sachain-kyc-processing-lambda-arn`,

  // Monitoring Stack exports
  dashboardUrl: (env) => `${env}-sachain-dashboard-url`,
  dashboardName: (env) => `${env}-sachain-dashboard-name`,
  alertTopicArn: (env) => `${env}-sachain-alert-topic-arn`,
  alarmCount: (env) => `${env}-sachain-alarm-count`,
};
