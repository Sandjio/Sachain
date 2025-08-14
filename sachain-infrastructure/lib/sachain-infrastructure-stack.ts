import * as cdk from "aws-cdk-lib";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";
import {
  DynamoDBConstruct,
  LambdaConstruct,
  S3Construct,
  EventBridgeConstruct,
  CognitoConstruct,
  MonitoringConstruct,
  SecurityConstruct,
} from "./constructs";

export interface SachainInfrastructureStackProps extends cdk.StackProps {
  environment?: string;
}

export class SachainInfrastructureStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: SachainInfrastructureStackProps
  ) {
    super(scope, id, props);

    // Get environment from props or default to 'dev'
    const environment = props?.environment || "dev";

    // Add environment tags
    cdk.Tags.of(this).add("Environment", environment);
    cdk.Tags.of(this).add("Project", "Sachain");
    cdk.Tags.of(this).add("Component", "KYC-Authentication");

    // Create DynamoDB table for Single Table Design
    const dynamoDBConstruct = new DynamoDBConstruct(this, "DynamoDB", {
      environment,
    });

    // Create S3 bucket for encrypted document storage
    const s3Construct = new S3Construct(this, "S3", {
      environment,
    });

    // Create EventBridge and SNS first (needed for security roles)
    const eventBridgeConstruct = new EventBridgeConstruct(this, "EventBridge", {
      environment,
      adminEmails: ["emmasandjio@gmail.com"],
    });

    // Create security construct with least-privilege IAM roles
    const securityConstruct = new SecurityConstruct(this, "Security", {
      environment,
      table: dynamoDBConstruct.table,
      documentBucket: s3Construct.documentBucket,
      encryptionKey: s3Construct.encryptionKey,
      notificationTopic: eventBridgeConstruct.notificationTopic,
      eventBus: eventBridgeConstruct.eventBus,
    });

    // Create Lambda functions
    const lambdaConstruct = new LambdaConstruct(this, "Lambda", {
      table: dynamoDBConstruct.table,
      documentBucket: s3Construct.documentBucket,
      environment,
      securityConstruct,
      eventBus: eventBridgeConstruct.eventBus,
      notificationTopic: eventBridgeConstruct.notificationTopic,
    });



    // Add KYC Processing Lambda as target for document upload events
    eventBridgeConstruct.kycDocumentUploadedRule.addTarget(
      new targets.LambdaFunction(lambdaConstruct.kycProcessingLambda, {
        retryAttempts: 3,
        maxEventAge: cdk.Duration.hours(2),
      })
    );

    // Update Lambda environment variables with EventBridge resources
    lambdaConstruct.adminReviewLambda.addEnvironment(
      "EVENT_BUS_NAME",
      eventBridgeConstruct.eventBus.eventBusName
    );

    // Update EventBridge with User Notification Lambda target
    eventBridgeConstruct.kycStatusChangeRule.addTarget(
      new targets.LambdaFunction(lambdaConstruct.userNotificationLambda)
    );

    // Create Cognito User Pool
    const cognitoConstruct = new CognitoConstruct(this, "Cognito", {
      postAuthLambda: lambdaConstruct.postAuthLambda,
      environment,
    });

    // Create monitoring and logging
    const monitoringConstruct = new MonitoringConstruct(this, "Monitoring", {
      lambdaFunctions: [
        lambdaConstruct.postAuthLambda,
        lambdaConstruct.kycUploadLambda,
        lambdaConstruct.adminReviewLambda,
        lambdaConstruct.userNotificationLambda,
      ],
      environment,
    });

    // Output important resource ARNs and names for reference
    new cdk.CfnOutput(this, "UserPoolId", {
      value: cognitoConstruct.userPool.userPoolId,
      description: "Cognito User Pool ID",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: cognitoConstruct.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    });

    new cdk.CfnOutput(this, "DynamoDBTableName", {
      value: dynamoDBConstruct.table.tableName,
      description: "DynamoDB Table Name",
    });

    new cdk.CfnOutput(this, "S3BucketName", {
      value: s3Construct.documentBucket.bucketName,
      description: "S3 Document Bucket Name",
    });

    new cdk.CfnOutput(this, "EventBusName", {
      value: eventBridgeConstruct.eventBus.eventBusName,
      description: "EventBridge Bus Name",
    });

    new cdk.CfnOutput(this, "KYCUploadApiUrl", {
      value: lambdaConstruct.kycUploadApi.url,
      description: "KYC Upload API Gateway URL",
    });

    new cdk.CfnOutput(this, "SecurityComplianceReport", {
      value: JSON.stringify(securityConstruct.getSecurityComplianceReport()),
      description: "Security compliance and IAM roles summary",
    });
  }
}
