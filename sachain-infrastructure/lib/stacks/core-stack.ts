import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DynamoDBConstruct, S3Construct } from "../constructs";
import { CoreStackOutputs, StackConfig } from "../interfaces";

export interface CoreStackProps extends cdk.StackProps {
  environment: string;
}

export class CoreStack extends cdk.Stack implements CoreStackOutputs {
  public readonly dynamoDBConstruct: DynamoDBConstruct;
  public readonly s3Construct: S3Construct;

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

    // Create stack outputs for cross-stack references
    new cdk.CfnOutput(this, "TableName", {
      value: this.table.tableName,
      description: "DynamoDB Table Name",
      exportName: `${props.environment}-sachain-table-name`,
    });

    new cdk.CfnOutput(this, "TableArn", {
      value: this.table.tableArn,
      description: "DynamoDB Table ARN",
      exportName: `${props.environment}-sachain-table-arn`,
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: this.documentBucket.bucketName,
      description: "S3 Document Bucket Name",
      exportName: `${props.environment}-sachain-bucket-name`,
    });

    new cdk.CfnOutput(this, "BucketArn", {
      value: this.documentBucket.bucketArn,
      description: "S3 Document Bucket ARN",
      exportName: `${props.environment}-sachain-bucket-arn`,
    });

    new cdk.CfnOutput(this, "KmsKeyArn", {
      value: this.encryptionKey.keyArn,
      description: "KMS Encryption Key ARN",
      exportName: `${props.environment}-sachain-kms-key-arn`,
    });

    new cdk.CfnOutput(this, "KmsKeyId", {
      value: this.encryptionKey.keyId,
      description: "KMS Encryption Key ID",
      exportName: `${props.environment}-sachain-kms-key-id`,
    });
  }
}
