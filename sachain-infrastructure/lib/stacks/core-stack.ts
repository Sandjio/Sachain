import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  DynamoDBConstruct,
  S3Construct,
  CognitoConstruct,
  PostAuthLambdaConstruct,
  // SecurityConstruct,
} from "../constructs";
import { CoreStackOutputs, StackConfig } from "../interfaces";

export interface CoreStackProps extends cdk.StackProps {
  environment: string;
  postAuthRole?: cdk.aws_iam.Role;
}

export class CoreStack extends cdk.Stack implements CoreStackOutputs {
  public readonly dynamoDBConstruct: DynamoDBConstruct;
  public readonly s3Construct: S3Construct;
  public readonly cognitoConstruct: CognitoConstruct;
  public readonly postAuthLambdaConstruct: PostAuthLambdaConstruct;

  // CoreStackOutputs interface implementation
  public readonly table: cdk.aws_dynamodb.Table;
  public readonly tableName: string;
  public readonly tableArn: string;
  public readonly documentBucket: cdk.aws_s3.Bucket;
  public readonly bucketName: string;
  public readonly bucketArn: string;
  public readonly encryptionKey: cdk.aws_kms.Key;
  public readonly kmsKeyArn: string;
  public readonly kmsKeyId: string;

  // Cognito resources (consolidated from AuthStack)
  public readonly userPool: cdk.aws_cognito.UserPool;
  public readonly userPoolClient: cdk.aws_cognito.UserPoolClient;
  public readonly userPoolId: string;
  public readonly userPoolArn: string;
  public readonly userPoolClientId: string;
  public readonly userPoolDomain: string;

  // Post-authentication lambda (moved from LambdaStack)
  public readonly postAuthLambda: cdk.aws_lambda.Function;
  public readonly postAuthLambdaArn: string;

  constructor(scope: Construct, id: string, props: CoreStackProps) {
    super(scope, id, props);

    // Add environment tags
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Project", "Sachain");
    cdk.Tags.of(this).add("Component", "Core");

    // Create DynamoDB table for Single Table Design
    this.dynamoDBConstruct = new DynamoDBConstruct(this, "DynamoDB", {
      environment: props.environment,
    });

    // Create S3 bucket for encrypted document storage
    this.s3Construct = new S3Construct(this, "S3", {
      environment: props.environment,
    });

    // Create post-authentication lambda (moved from LambdaStack)
    this.postAuthLambdaConstruct = new PostAuthLambdaConstruct(
      this,
      "PostAuthLambda",
      {
        table: this.dynamoDBConstruct.table,
        environment: props.environment,
        // postAuthRole: props.postAuthRole,
      }
    );

    // Create Cognito User Pool with post-auth lambda trigger (consolidated from AuthStack)
    this.cognitoConstruct = new CognitoConstruct(this, "Cognito", {
      postAuthLambda: this.postAuthLambdaConstruct.postAuthLambda,
      environment: props.environment,
    });

    // Grant Cognito permission to invoke the post-auth lambda
    this.postAuthLambdaConstruct.grantInvokeToUserPool(
      this.cognitoConstruct.userPool.userPoolArn
    );

    // Expose resources for cross-stack references
    this.table = this.dynamoDBConstruct.table;
    this.tableName = this.table.tableName;
    this.tableArn = this.table.tableArn;
    this.documentBucket = this.s3Construct.documentBucket;
    this.bucketName = this.documentBucket.bucketName;
    this.bucketArn = this.documentBucket.bucketArn;
    this.encryptionKey = this.s3Construct.encryptionKey;
    this.kmsKeyArn = this.encryptionKey.keyArn;
    this.kmsKeyId = this.encryptionKey.keyId;

    // Expose auth resources for cross-stack references
    this.userPool = this.cognitoConstruct.userPool;
    this.userPoolClient = this.cognitoConstruct.userPoolClient;
    this.userPoolId = this.userPool.userPoolId;
    this.userPoolArn = this.userPool.userPoolArn;
    this.userPoolClientId = this.userPoolClient.userPoolClientId;
    this.userPoolDomain = `sachain-${props.environment}.auth.${this.region}.amazoncognito.com`;
    this.postAuthLambda = this.postAuthLambdaConstruct.postAuthLambda;
    this.postAuthLambdaArn = this.postAuthLambda.functionArn;

    // Create stack outputs for cross-stack references
    new cdk.CfnOutput(this, "TableName", {
      value: this.table.tableName,
      description: "DynamoDB Table Name",
      exportName: `${props.environment}-sachain-core-table-name`,
    });

    new cdk.CfnOutput(this, "TableArn", {
      value: this.table.tableArn,
      description: "DynamoDB Table ARN",
      exportName: `${props.environment}-sachain-core-table-arn`,
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: this.documentBucket.bucketName,
      description: "S3 Document Bucket Name",
      exportName: `${props.environment}-sachain-core-bucket-name`,
    });

    new cdk.CfnOutput(this, "BucketArn", {
      value: this.documentBucket.bucketArn,
      description: "S3 Document Bucket ARN",
      exportName: `${props.environment}-sachain-core-bucket-arn`,
    });

    new cdk.CfnOutput(this, "KmsKeyArn", {
      value: this.encryptionKey.keyArn,
      description: "KMS Encryption Key ARN",
      exportName: `${props.environment}-sachain-core-kms-key-arn`,
    });

    new cdk.CfnOutput(this, "KmsKeyId", {
      value: this.encryptionKey.keyId,
      description: "KMS Encryption Key ID",
      exportName: `${props.environment}-sachain-core-kms-key-id`,
    });

    // Auth-related outputs (consolidated from AuthStack)
    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: `${props.environment}-sachain-core-user-pool-id`,
    });

    new cdk.CfnOutput(this, "UserPoolArn", {
      value: this.userPool.userPoolArn,
      description: "Cognito User Pool ARN",
      exportName: `${props.environment}-sachain-core-user-pool-arn`,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
      exportName: `${props.environment}-sachain-core-user-pool-client-id`,
    });

    new cdk.CfnOutput(this, "UserPoolDomain", {
      value: this.userPoolDomain,
      description: "Cognito User Pool Domain",
      exportName: `${props.environment}-sachain-core-user-pool-domain`,
    });

    new cdk.CfnOutput(this, "PostAuthLambdaArn", {
      value: this.postAuthLambda.functionArn,
      description: "Post-Authentication Lambda Function ARN",
      exportName: `${props.environment}-sachain-core-post-auth-lambda-arn`,
    });
  }
}
