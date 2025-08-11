import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export interface S3ConstructProps {
  environment: string;
}

export class S3Construct extends Construct {
  public readonly documentBucket: s3.Bucket;
  public readonly encryptionKey: kms.Key;

  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    // KMS key for S3 encryption - will be configured in task 5.1
    this.encryptionKey = new kms.Key(this, "DocumentEncryptionKey", {
      description: `KYC document encryption key for ${props.environment}`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // S3 bucket for encrypted document storage - will be implemented in task 5.1
    this.documentBucket = new s3.Bucket(this, "DocumentBucket", {
      bucketName: `sachain-kyc-documents-${props.environment}-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });
  }
}
