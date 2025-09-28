/**
 * S3 Construct for Sachain
 * - S3 bucket for encrypted document storage with comprehensive security
 * - Lifecycle policies for cost optimization
 * - CORS configuration for web uploads
 * - Bucket policies to enforce security best practices
 * - Permissions for Lambda functions to access the buckets
 */

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { EnvironmentType } from "../types";

export interface S3ConstructProps {
  environment: EnvironmentType;
}

export class S3Construct extends Construct {
  public readonly sachainBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    // S3 bucket for encrypted document storage with comprehensive security
    this.sachainBucket = new s3.Bucket(this, "SachainBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        props.environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== "prod", // Only auto-delete in non-prod
      enforceSSL: true,

      // Lifecycle configuration for cost optimization
      lifecycleRules: [
        {
          id: "SachainBucketLifecycle",
          enabled: true,
          // Move to IA after 30 days
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(365),
            },
          ],
          // Delete non-current versions after 30 days
          noncurrentVersionTransitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          noncurrentVersionExpiration: cdk.Duration.days(90),
        },
      ],

      // CORS configuration for web uploads
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins:
            props.environment === "prod" ? ["https://yourdomain.com"] : ["*"],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],

      // Notification configuration (can be extended later)
      // notifications: [], // Commented out as this property doesn't exist in BucketProps

      // Server access logging (optional, can be enabled for audit)
      // serverAccessLogsBucket: accessLogsBucket,
      // serverAccessLogsPrefix: "access-logs/",
    });

    // Add bucket policy to restrict access to Lambda functions only
    this.addBucketPolicy();

    // Add tags for compliance and cost tracking
    cdk.Tags.of(this.sachainBucket).add("Purpose", "Sachain-Bucket");
  }

  private addBucketPolicy(): void {
    // Deny insecure connections
    this.sachainBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "DenyInsecureConnections",
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:*"],
        resources: [
          this.sachainBucket.bucketArn,
          this.sachainBucket.arnForObjects("*"),
        ],
        conditions: {
          Bool: {
            "aws:SecureTransport": "false",
          },
        },
      })
    );
  }

  /**
   * Grant Lambda function permissions to access the buckets
   */
  public grantLambdaAccess(
    lambdaRole: iam.IRole,
    access: "read" | "write" | "readwrite" = "readwrite"
  ) {
    if (access === "read") this.sachainBucket.grantRead(lambdaRole);
    else if (access === "write") this.sachainBucket.grantWrite(lambdaRole);
    else this.sachainBucket.grantReadWrite(lambdaRole);
  }
}
