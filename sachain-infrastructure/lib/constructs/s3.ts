import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface S3ConstructProps {
  environment: string;
  lambdaExecutionRoleArns?: string[];
}

export class S3Construct extends Construct {
  public readonly documentBucket: s3.Bucket;
  public readonly encryptionKey: kms.Key;

  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    // KMS key for S3 encryption with proper key policy
    this.encryptionKey = new kms.Key(this, "DocumentEncryptionKey", {
      description: `KYC document encryption key for ${props.environment}`,
      enableKeyRotation: true,
      removalPolicy:
        props.environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
    });

    // Add key policy to allow Lambda functions to use the key
    this.encryptionKey.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowLambdaAccess",
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("lambda.amazonaws.com")],
        actions: [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey",
          "kms:ReEncrypt*",
        ],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "kms:ViaService": `s3.${cdk.Aws.REGION}.amazonaws.com`,
          },
        },
      })
    );

    // S3 bucket for encrypted document storage with comprehensive security
    this.documentBucket = new s3.Bucket(this, "DocumentBucket", {
      bucketName: `sachain-kyc-documents-${props.environment}-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy:
        props.environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== "prod", // Only auto-delete in non-prod
      enforceSSL: true,

      // Lifecycle configuration for cost optimization
      lifecycleRules: [
        {
          id: "KYCDocumentLifecycle",
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
          allowedOrigins: ["*"], // Should be restricted to actual domain in production
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
    cdk.Tags.of(this.documentBucket).add("DataClassification", "Sensitive");
    cdk.Tags.of(this.documentBucket).add("Purpose", "KYC-Documents");
    cdk.Tags.of(this.documentBucket).add("Compliance", "KYC-AML");
    cdk.Tags.of(this.encryptionKey).add("Purpose", "KYC-Encryption");
  }

  private addBucketPolicy(): void {
    // Bucket policy to restrict access to Lambda functions and deny unencrypted uploads
    const bucketPolicy = new iam.PolicyDocument({
      statements: [
        // Deny unencrypted object uploads
        new iam.PolicyStatement({
          sid: "DenyUnencryptedObjectUploads",
          effect: iam.Effect.DENY,
          principals: [new iam.AnyPrincipal()],
          actions: ["s3:PutObject"],
          resources: [this.documentBucket.arnForObjects("*")],
          conditions: {
            StringNotEquals: {
              "s3:x-amz-server-side-encryption": "aws:kms",
            },
          },
        }),
        // Deny uploads without proper KMS key
        new iam.PolicyStatement({
          sid: "DenyIncorrectEncryptionKey",
          effect: iam.Effect.DENY,
          principals: [new iam.AnyPrincipal()],
          actions: ["s3:PutObject"],
          resources: [this.documentBucket.arnForObjects("*")],
          conditions: {
            StringNotEquals: {
              "s3:x-amz-server-side-encryption-aws-kms-key-id":
                this.encryptionKey.keyArn,
            },
          },
        }),
        // Deny insecure connections
        new iam.PolicyStatement({
          sid: "DenyInsecureConnections",
          effect: iam.Effect.DENY,
          principals: [new iam.AnyPrincipal()],
          actions: ["s3:*"],
          resources: [
            this.documentBucket.bucketArn,
            this.documentBucket.arnForObjects("*"),
          ],
          conditions: {
            Bool: {
              "aws:SecureTransport": "false",
            },
          },
        }),
      ],
    });

    // Apply the bucket policy
    this.documentBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "DenyUnencryptedObjectUploads",
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:PutObject"],
        resources: [this.documentBucket.arnForObjects("*")],
        conditions: {
          StringNotEquals: {
            "s3:x-amz-server-side-encryption": "aws:kms",
          },
        },
      })
    );

    this.documentBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "DenyIncorrectEncryptionKey",
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:PutObject"],
        resources: [this.documentBucket.arnForObjects("*")],
        conditions: {
          StringNotEquals: {
            "s3:x-amz-server-side-encryption-aws-kms-key-id":
              this.encryptionKey.keyArn,
          },
        },
      })
    );

    this.documentBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "DenyInsecureConnections",
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:*"],
        resources: [
          this.documentBucket.bucketArn,
          this.documentBucket.arnForObjects("*"),
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
   * Grant Lambda function permissions to access the bucket
   */
  public grantLambdaAccess(lambdaRole: iam.IRole): void {
    // Grant S3 permissions
    this.documentBucket.grantReadWrite(lambdaRole);

    // Grant KMS permissions
    this.encryptionKey.grantEncryptDecrypt(lambdaRole);
  }
}
