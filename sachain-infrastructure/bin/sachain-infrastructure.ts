#!/usr/bin/env node
/// <reference types="node" />

import * as cdk from "aws-cdk-lib";
import {
  SecurityStack,
  SachainDynamoDBStack,
  S3Stack,
  CognitoLambdaStack,
  CognitoStack,
  LambdaStack,
  MonitoringStack,
} from "../lib/stacks";

const app = new cdk.App();

// Get environment from context or environment variable, default to 'dev'
const environment =
  app.node.tryGetContext("environment") || process.env.ENVIRONMENT || "dev";

// const env = {
//   account: "123456789",
//   region: "us-east-2",
// };
try {
  const sachainDynamodb = new SachainDynamoDBStack(
    app,
    `SachainDynamoDBStack-${environment}`,
    {
      environment,
      // env,
    }
  );
  const s3Stack = new S3Stack(app, `SachainS3Stack-${environment}`, {
    environment,
    // env,
  });

  const cognitoLambdaTriggerStack = new CognitoLambdaStack(
    app,
    `SachainCognitoLambdaStack-${environment}`,
    {
      environment,
      table: sachainDynamodb.table,
      // env,
    }
  );

  const cognitoStack = new CognitoStack(
    app,
    `SachainCognitoStack-${environment}`,
    {
      environment,

      postAuthLambda: cognitoLambdaTriggerStack.postAuthLambda,
      postAddUserToGroupLambda:
        cognitoLambdaTriggerStack.postAddUserToGroupLambda,
      // env,
    }
  );

  const securityStack = new SecurityStack(
    app,
    `SachainSecurityStack-${environment}`,
    {
      environment,
      table: sachainDynamodb.table,
      sachainBucket: s3Stack.bucket,
      userPool: cognitoStack.cognito.userPool,
      // env,
    }
  );

  const lambdaStack = new LambdaStack(
    app,
    `SachainLambdaStack-${environment}`,
    {
      environment,
      table: sachainDynamodb.table,
      documentBucket: s3Stack.bucket,
      projectImagesBucket: s3Stack.bucket,
      userPool: cognitoStack.cognito.userPool,
      userPoolClient: cognitoStack.cognito.userPoolClient,
      kycUploadRole: securityStack.kycUploadRole,
      adminReviewRole: securityStack.adminReviewRole,
      userNotificationRole: securityStack.userNotificationRole,
      kycProcessingRole: securityStack.kycProcessingRole,
      projectCreationRole: securityStack.projectCreationRole,
      stockMintingRole: securityStack.stockMintingRole,
      stockMintingStatusRole: securityStack.stockMintingStatusRole,
      // env,
    }
  );

  const monitoringStack = new MonitoringStack(
    app,
    `SachainMonitoringStack-${environment}`,
    {
      environment,
      kycUploadLambda: lambdaStack.kycUploadLambda,
      adminReviewLambda: lambdaStack.adminReviewLambda,
      userNotificationLambda: lambdaStack.userNotificationLambda,
      kycProcessingLambda: lambdaStack.kycProcessingLambda,
      enableDetailedMonitoring: true,
      // env,
    }
  );
} catch (error) {
  console.error("✗ Stack creation failed:", error);
  throw error;
}
