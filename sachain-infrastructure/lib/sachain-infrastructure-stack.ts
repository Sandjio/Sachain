import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  DynamoDBConstruct,
  LambdaConstruct,
  S3Construct,
  EventBridgeConstruct,
  CognitoConstruct,
  MonitoringConstruct,
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

    // Create EventBridge and SNS for event-driven architecture
    const eventBridgeConstruct = new EventBridgeConstruct(this, "EventBridge", {
      environment,
    });

    // Create Lambda functions
    const lambdaConstruct = new LambdaConstruct(this, "Lambda", {
      table: dynamoDBConstruct.table,
      documentBucket: s3Construct.documentBucket,
      notificationTopic: eventBridgeConstruct.notificationTopic,
      eventBus: eventBridgeConstruct.eventBus,
      environment,
    });

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
  }
}
