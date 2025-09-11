import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import * as iam from "aws-cdk-lib/aws-iam";
import { S3Construct } from "../../lib/constructs/s3";
import { EnvironmentType } from "../../lib/types";

describe("S3Construct", () => {
  const synthesize = (environment: EnvironmentType) => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, `TestStack-${environment}`);
    new S3Construct(stack, "TestS3", { environment });
    return Template.fromStack(stack);
  };

  test("creates bucket with encryption, SSL enforced, and public access blocked", () => {
    const template = synthesize("dev");

    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          { ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test("bucket removal policy differs by environment", () => {
    const devTemplate = synthesize("dev");
    const prodTemplate = synthesize("prod");

    devTemplate.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Delete",
      UpdateReplacePolicy: "Delete",
    });

    prodTemplate.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Retain",
      UpdateReplacePolicy: "Retain",
    });
  });

  test("bucket has correct CORS rules per environment", () => {
    const devTemplate = synthesize("dev");
    const prodTemplate = synthesize("prod");

    devTemplate.hasResourceProperties("AWS::S3::Bucket", {
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

    prodTemplate.hasResourceProperties("AWS::S3::Bucket", {
      CorsConfiguration: {
        CorsRules: [
          {
            AllowedMethods: ["GET", "PUT", "POST"],
            AllowedOrigins: ["https://yourdomain.com"],
            AllowedHeaders: ["*"],
            MaxAge: 3000,
          },
        ],
      },
    });
  });

  test("bucket policy denies insecure transport", () => {
    const template = synthesize("dev");

    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "DenyInsecureConnections",
            Effect: "Deny",
            Action: "s3:*",
            Principal: { AWS: "*" },
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          }),
        ]),
      },
    });
  });

  test("grantLambdaAccess applies correct permissions", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "LambdaAccessTest");
    const construct = new S3Construct(stack, "TestS3", { environment: "dev" });

    const role = new iam.Role(stack, "LambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    construct.grantLambdaAccess(role, "read");

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Allow",
            Action: Match.arrayWith(["s3:GetObject*"]),
          }),
        ]),
      },
    });
  });
});
