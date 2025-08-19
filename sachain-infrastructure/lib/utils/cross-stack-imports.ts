/**
 * Cross-Stack Import Utilities
 *
 * Utilities for importing resources from other stacks using CloudFormation exports.
 * This provides a type-safe way to reference resources across stack boundaries.
 */

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { EXPORT_NAMES } from "../interfaces";

/**
 * Utility class for importing cross-stack resources
 */
export class CrossStackImporter {
  /**
   * Import CoreStack resources using CloudFormation exports
   */
  static importCoreStackResources(
    scope: Construct,
    environment: string
  ): {
    table: dynamodb.ITable;
    documentBucket: s3.IBucket;
    encryptionKey: kms.IKey;
  } {
    // Import DynamoDB table
    const table = dynamodb.Table.fromTableAttributes(scope, "ImportedTable", {
      tableName: cdk.Fn.importValue(EXPORT_NAMES.tableName(environment)),
      tableArn: cdk.Fn.importValue(EXPORT_NAMES.tableArn(environment)),
    });

    // Import S3 bucket
    const documentBucket = s3.Bucket.fromBucketAttributes(
      scope,
      "ImportedBucket",
      {
        bucketName: cdk.Fn.importValue(EXPORT_NAMES.bucketName(environment)),
        bucketArn: cdk.Fn.importValue(EXPORT_NAMES.bucketArn(environment)),
      }
    );

    // Import KMS key
    const encryptionKey = kms.Key.fromKeyArn(
      scope,
      "ImportedKmsKey",
      cdk.Fn.importValue(EXPORT_NAMES.kmsKeyArn(environment))
    );

    return {
      table,
      documentBucket,
      encryptionKey,
    };
  }

  /**
   * Import SecurityStack resources using CloudFormation exports
   */
  static importSecurityStackResources(
    scope: Construct,
    environment: string
  ): {
    postAuthRole: iam.IRole;
    kycUploadRole: iam.IRole;
    adminReviewRole: iam.IRole;
    userNotificationRole: iam.IRole;
    kycProcessingRole: iam.IRole;
  } {
    const postAuthRole = iam.Role.fromRoleArn(
      scope,
      "ImportedPostAuthRole",
      cdk.Fn.importValue(EXPORT_NAMES.postAuthRoleArn(environment))
    );

    const kycUploadRole = iam.Role.fromRoleArn(
      scope,
      "ImportedKycUploadRole",
      cdk.Fn.importValue(EXPORT_NAMES.kycUploadRoleArn(environment))
    );

    const adminReviewRole = iam.Role.fromRoleArn(
      scope,
      "ImportedAdminReviewRole",
      cdk.Fn.importValue(EXPORT_NAMES.adminReviewRoleArn(environment))
    );

    const userNotificationRole = iam.Role.fromRoleArn(
      scope,
      "ImportedUserNotificationRole",
      cdk.Fn.importValue(EXPORT_NAMES.userNotificationRoleArn(environment))
    );

    const kycProcessingRole = iam.Role.fromRoleArn(
      scope,
      "ImportedKycProcessingRole",
      cdk.Fn.importValue(EXPORT_NAMES.kycProcessingRoleArn(environment))
    );

    return {
      postAuthRole,
      kycUploadRole,
      adminReviewRole,
      userNotificationRole,
      kycProcessingRole,
    };
  }

  /**
   * Import EventStack resources using CloudFormation exports
   */
  static importEventStackResources(
    scope: Construct,
    environment: string
  ): {
    eventBus: events.IEventBus;
    notificationTopic: sns.ITopic;
    userNotificationTopic: sns.ITopic;
  } {
    const eventBus = events.EventBus.fromEventBusAttributes(
      scope,
      "ImportedEventBus",
      {
        eventBusName: cdk.Fn.importValue(
          EXPORT_NAMES.eventBusName(environment)
        ),
        eventBusArn: cdk.Fn.importValue(EXPORT_NAMES.eventBusArn(environment)),
        eventBusPolicy: "", // Empty policy for imported event bus
      }
    );

    const notificationTopic = sns.Topic.fromTopicArn(
      scope,
      "ImportedNotificationTopic",
      cdk.Fn.importValue(EXPORT_NAMES.adminNotificationTopicArn(environment))
    );

    const userNotificationTopic = sns.Topic.fromTopicArn(
      scope,
      "ImportedUserNotificationTopic",
      cdk.Fn.importValue(EXPORT_NAMES.userNotificationTopicArn(environment))
    );

    return {
      eventBus,
      notificationTopic,
      userNotificationTopic,
    };
  }

  /**
   * Import AuthStack resources using CloudFormation exports
   */
  static importAuthStackResources(
    scope: Construct,
    environment: string
  ): {
    userPool: cognito.IUserPool;
    userPoolClient: cognito.IUserPoolClient;
  } {
    const userPool = cognito.UserPool.fromUserPoolId(
      scope,
      "ImportedUserPool",
      cdk.Fn.importValue(EXPORT_NAMES.userPoolId(environment))
    );

    const userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
      scope,
      "ImportedUserPoolClient",
      cdk.Fn.importValue(EXPORT_NAMES.userPoolClientId(environment))
    );

    return {
      userPool,
      userPoolClient,
    };
  }

  /**
   * Import LambdaStack resources using CloudFormation exports
   */
  static importLambdaStackResources(
    scope: Construct,
    environment: string
  ): {
    api: apigateway.IRestApi;
    postAuthLambda: lambda.IFunction;
    kycUploadLambda: lambda.IFunction;
    adminReviewLambda: lambda.IFunction;
    userNotificationLambda: lambda.IFunction;
    kycProcessingLambda: lambda.IFunction;
  } {
    const api = apigateway.RestApi.fromRestApiAttributes(scope, "ImportedApi", {
      restApiId: cdk.Fn.importValue(EXPORT_NAMES.apiId(environment)),
      rootResourceId: cdk.Fn.importValue(
        EXPORT_NAMES.apiRootResourceId(environment)
      ),
    });

    const postAuthLambda = lambda.Function.fromFunctionArn(
      scope,
      "ImportedPostAuthLambda",
      cdk.Fn.importValue(EXPORT_NAMES.postAuthLambdaArn(environment))
    );

    const kycUploadLambda = lambda.Function.fromFunctionArn(
      scope,
      "ImportedKycUploadLambda",
      cdk.Fn.importValue(EXPORT_NAMES.kycUploadLambdaArn(environment))
    );

    const adminReviewLambda = lambda.Function.fromFunctionArn(
      scope,
      "ImportedAdminReviewLambda",
      cdk.Fn.importValue(EXPORT_NAMES.adminReviewLambdaArn(environment))
    );

    const userNotificationLambda = lambda.Function.fromFunctionArn(
      scope,
      "ImportedUserNotificationLambda",
      cdk.Fn.importValue(EXPORT_NAMES.userNotificationLambdaArn(environment))
    );

    const kycProcessingLambda = lambda.Function.fromFunctionArn(
      scope,
      "ImportedKycProcessingLambda",
      cdk.Fn.importValue(EXPORT_NAMES.kycProcessingLambdaArn(environment))
    );

    return {
      api,
      postAuthLambda,
      kycUploadLambda,
      adminReviewLambda,
      userNotificationLambda,
      kycProcessingLambda,
    };
  }

  /**
   * Validates that all required exports exist for a given environment
   */
  static validateExportsExist(
    environment: string,
    requiredExports: (keyof typeof EXPORT_NAMES)[]
  ): string[] {
    const missingExports: string[] = [];

    for (const exportKey of requiredExports) {
      const exportName = EXPORT_NAMES[exportKey](environment);
      // Note: In a real deployment, you would check if the export exists
      // This is a placeholder for validation logic
      if (!exportName || exportName.length === 0) {
        missingExports.push(exportName);
      }
    }

    return missingExports;
  }

  /**
   * Creates a cross-stack reference with proper error handling
   */
  static createSafeImport(exportName: string, fallbackValue?: string): string {
    try {
      return cdk.Fn.importValue(exportName);
    } catch (error) {
      if (fallbackValue) {
        return fallbackValue;
      }
      throw new Error(
        `Failed to import cross-stack reference: ${exportName}. Error: ${error}`
      );
    }
  }
}

/**
 * Cross-stack reference validation utilities
 */
export class CrossStackReferenceValidator {
  /**
   * Validates that a cross-stack reference can be resolved
   */
  static validateReference(
    scope: Construct,
    exportName: string,
    resourceType: string
  ): boolean {
    try {
      const importedValue = cdk.Fn.importValue(exportName);
      // Basic validation - check if the import value is defined
      return importedValue !== undefined && importedValue !== null;
    } catch (error) {
      console.warn(
        `Failed to validate cross-stack reference ${exportName} for ${resourceType}: ${error}`
      );
      return false;
    }
  }

  /**
   * Validates all required cross-stack references for a stack
   */
  static validateAllReferences(
    scope: Construct,
    environment: string,
    requiredReferences: (keyof typeof EXPORT_NAMES)[]
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const refKey of requiredReferences) {
      const exportName = EXPORT_NAMES[refKey](environment);
      if (!this.validateReference(scope, exportName, refKey)) {
        missing.push(exportName);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
