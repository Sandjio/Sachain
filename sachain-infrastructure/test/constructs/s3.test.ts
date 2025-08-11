import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import * as iam from "aws-cdk-lib/aws-iam";
import { S3Construct } from "../../lib/constructs/s3";

describe("S3Construct", () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack", {
      env: { account: "123456789012", region: "us-east-1" },
    });
  });

  describe("S3 Bucket Configuration", () => {
    it("should create S3 bucket with correct basic configuration", () => {
      // Arrange & Act
      const construct = new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::S3::Bucket", {
        BucketName: "sachain-kyc-documents-test-123456789012",
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: "aws:kms",
                KMSMasterKeyID: {
                  "Fn::GetAtt": [
                    Match.stringLikeRegexp(".*DocumentEncryptionKey.*"),
                    "Arn",
                  ],
                },
              },
            },
          ],
        },
        VersioningConfiguration: {
          Status: "Enabled",
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });

      expect(construct.documentBucket).toBeDefined();
      expect(construct.encryptionKey).toBeDefined();
    });

    it("should enable versioning", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::S3::Bucket", {
        VersioningConfiguration: {
          Status: "Enabled",
        },
      });
    });

    it("should block all public access", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::S3::Bucket", {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    it("should enforce SSL connections", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert - Check for SSL enforcement in bucket policy
      template.hasResourceProperties("AWS::S3::BucketPolicy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DenyInsecureConnections",
              Effect: "Deny",
              Principal: "*",
              Action: "s3:*",
              Resource: [Match.anyValue(), Match.anyValue()],
              Condition: {
                Bool: {
                  "aws:SecureTransport": "false",
                },
              },
            },
          ]),
        },
      });
    });

    it("should configure CORS for web uploads", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::S3::Bucket", {
        CorsConfiguration: {
          CorsRules: [
            {
              AllowedMethods: ["GET", "PUT", "POST"],
              AllowedOrigins: ["*"],
              AllowedHeaders: ["*"],
              MaxAge: 3000,
            },
          ],
        },
      });
    });
  });

  describe("KMS Encryption Configuration", () => {
    it("should create KMS key with correct configuration", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::KMS::Key", {
        Description: "KYC document encryption key for test",
        EnableKeyRotation: true,
        KeySpec: "SYMMETRIC_DEFAULT",
        KeyUsage: "ENCRYPT_DECRYPT",
      });
    });

    it("should create KMS key alias", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::KMS::Alias", {
        AliasName: Match.stringLikeRegexp("alias/.*"),
        TargetKeyId: {
          Ref: Match.stringLikeRegexp(".*DocumentEncryptionKey.*"),
        },
      });
    });

    it("should configure KMS key policy for Lambda access", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::KMS::Key", {
        KeyPolicy: {
          Statement: Match.arrayWith([
            {
              Sid: "AllowLambdaAccess",
              Effect: "Allow",
              Principal: {
                Service: "lambda.amazonaws.com",
              },
              Action: [
                "kms:Decrypt",
                "kms:DescribeKey",
                "kms:Encrypt",
                "kms:GenerateDataKey",
                "kms:ReEncrypt*",
              ],
              Resource: "*",
              Condition: {
                StringEquals: {
                  "kms:ViaService": "s3.us-east-1.amazonaws.com",
                },
              },
            },
          ]),
        },
      });
    });
  });

  describe("Bucket Policies", () => {
    it("should deny unencrypted object uploads", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::S3::BucketPolicy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DenyUnencryptedObjectUploads",
              Effect: "Deny",
              Principal: "*",
              Action: "s3:PutObject",
              Resource: Match.anyValue(),
              Condition: {
                StringNotEquals: {
                  "s3:x-amz-server-side-encryption": "aws:kms",
                },
              },
            },
          ]),
        },
      });
    });

    it("should deny uploads without correct KMS key", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::S3::BucketPolicy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DenyIncorrectEncryptionKey",
              Effect: "Deny",
              Principal: "*",
              Action: "s3:PutObject",
              Resource: Match.anyValue(),
              Condition: {
                StringNotEquals: {
                  "s3:x-amz-server-side-encryption-aws-kms-key-id":
                    Match.anyValue(),
                },
              },
            },
          ]),
        },
      });
    });

    it("should deny insecure connections", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::S3::BucketPolicy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Sid: "DenyInsecureConnections",
              Effect: "Deny",
              Principal: "*",
              Action: "s3:*",
              Resource: [Match.anyValue(), Match.anyValue()],
              Condition: {
                Bool: {
                  "aws:SecureTransport": "false",
                },
              },
            },
          ]),
        },
      });
    });
  });

  describe("Lifecycle Configuration", () => {
    it("should configure lifecycle rules for cost optimization", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::S3::Bucket", {
        LifecycleConfiguration: {
          Rules: [
            {
              Id: "KYCDocumentLifecycle",
              Status: "Enabled",
              Transitions: [
                {
                  StorageClass: "STANDARD_IA",
                  TransitionInDays: 30,
                },
                {
                  StorageClass: "GLACIER",
                  TransitionInDays: 90,
                },
                {
                  StorageClass: "DEEP_ARCHIVE",
                  TransitionInDays: 365,
                },
              ],
              NoncurrentVersionTransitions: [
                {
                  StorageClass: "STANDARD_IA",
                  TransitionInDays: 30,
                },
              ],
              NoncurrentVersionExpirationInDays: 90,
            },
          ],
        },
      });
    });
  });

  describe("Environment-specific Configuration", () => {
    it("should use RETAIN removal policy for production environment", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "prod",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResource("AWS::S3::Bucket", {
        DeletionPolicy: "Retain",
      });

      template.hasResource("AWS::KMS::Key", {
        DeletionPolicy: "Retain",
      });
    });

    it("should use DESTROY removal policy for non-production environments", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "dev",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResource("AWS::S3::Bucket", {
        DeletionPolicy: "Delete",
      });

      template.hasResource("AWS::KMS::Key", {
        DeletionPolicy: "Delete",
      });
    });

    it("should include correct bucket name with environment suffix", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "staging",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::S3::Bucket", {
        BucketName: "sachain-kyc-documents-staging-123456789012",
      });
    });

    it("should disable auto-delete for production environment", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "prod",
      });

      const template = Template.fromStack(stack);

      // Assert - In production, auto-delete should be disabled
      // This is implicit in CDK - if autoDeleteObjects is false, no custom resource is created
      template.resourceCountIs("AWS::CloudFormation::CustomResource", 0);
    });
  });

  describe("Resource Tags", () => {
    it("should apply correct tags to S3 bucket", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::S3::Bucket", {
        Tags: Match.arrayWith([
          {
            Key: "DataClassification",
            Value: "Sensitive",
          },
          {
            Key: "Purpose",
            Value: "KYC-Documents",
          },
          {
            Key: "Compliance",
            Value: "KYC-AML",
          },
        ]),
      });
    });

    it("should apply correct tags to KMS key", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::KMS::Key", {
        Tags: Match.arrayWith([
          {
            Key: "Purpose",
            Value: "KYC-Encryption",
          },
        ]),
      });
    });
  });

  describe("Lambda Access Methods", () => {
    it("should grant Lambda access to bucket and KMS key", () => {
      // Arrange
      const construct = new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const lambdaRole = new iam.Role(stack, "TestLambdaRole", {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      });

      // Act
      construct.grantLambdaAccess(lambdaRole);

      const template = Template.fromStack(stack);

      // Assert - Check that IAM policies are created for the Lambda role
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: "Allow",
              Action: Match.arrayWith([
                "s3:GetObject*",
                "s3:GetBucket*",
                "s3:List*",
                "s3:DeleteObject*",
                "s3:PutObject*",
                "s3:Abort*",
              ]),
            }),
          ]),
        },
      });

      // Assert KMS permissions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: "Allow",
              Action: Match.arrayWith([
                "kms:Decrypt",
                "kms:DescribeKey",
                "kms:Encrypt",
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*",
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe("Security Validation", () => {
    it("should not allow public read access", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert - Ensure no public read permissions are granted
      template.hasResourceProperties("AWS::S3::Bucket", {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    it("should require encryption for all uploads", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert - Verify bucket policy denies unencrypted uploads
      template.hasResourceProperties("AWS::S3::BucketPolicy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Effect: "Deny",
              Action: "s3:PutObject",
              Condition: {
                StringNotEquals: {
                  "s3:x-amz-server-side-encryption": "aws:kms",
                },
              },
            },
          ]),
        },
      });
    });

    it("should require specific KMS key for encryption", () => {
      // Arrange & Act
      new S3Construct(stack, "TestS3", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert - Verify bucket policy requires specific KMS key
      template.hasResourceProperties("AWS::S3::BucketPolicy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Effect: "Deny",
              Action: "s3:PutObject",
              Condition: {
                StringNotEquals: {
                  "s3:x-amz-server-side-encryption-aws-kms-key-id":
                    Match.anyValue(),
                },
              },
            },
          ]),
        },
      });
    });
  });
});
