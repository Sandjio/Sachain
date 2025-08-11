import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export interface LambdaConstructProps {
  table: dynamodb.Table;
  documentBucket?: s3.Bucket;
  notificationTopic?: sns.Topic;
  eventBus?: events.EventBus;
  environment: string;
}

export class LambdaConstruct extends Construct {
  public readonly postAuthLambda: lambda.Function;
  public readonly kycUploadLambda: lambda.Function;
  public readonly adminReviewLambda: lambda.Function;
  public readonly kycUploadApi: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    // Post-Authentication Lambda
    this.postAuthLambda = new lambda.Function(this, "PostAuthLambda", {
      functionName: `sachain-post-auth-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("../backend/src/lambdas/post-auth"),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      deadLetterQueue: new sqs.Queue(this, "PostAuthDLQ", {
        queueName: `sachain-post-auth-dlq-${props.environment}`,
        retentionPeriod: cdk.Duration.days(14),
      }),
    });

    // KYC Upload Lambda
    this.kycUploadLambda = new lambda.Function(this, "KYCUploadLambda", {
      functionName: `sachain-kyc-upload-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("../backend/src/lambdas/kyc-upload"),
      environment: {
        TABLE_NAME: props.table.tableName,
        BUCKET_NAME: props.documentBucket?.bucketName || "",
        SNS_TOPIC_ARN: props.notificationTopic?.topicArn || "",
        ENVIRONMENT: props.environment,
        MAX_FILE_SIZE: "10485760", // 10MB
        ALLOWED_FILE_TYPES: "image/jpeg,image/png,application/pdf",
        ADMIN_PORTAL_URL: `https://admin.sachain-${props.environment}.com`,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      deadLetterQueue: new sqs.Queue(this, "KYCUploadDLQ", {
        queueName: `sachain-kyc-upload-dlq-${props.environment}`,
        retentionPeriod: cdk.Duration.days(14),
      }),
    });

    // Admin Review Lambda - will be implemented in task 7.1
    this.adminReviewLambda = new lambda.Function(this, "AdminReviewLambda", {
      functionName: `sachain-admin-review-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(
        "exports.handler = async () => ({ statusCode: 200 });"
      ),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant DynamoDB permissions
    props.table.grantReadWriteData(this.postAuthLambda);
    props.table.grantReadWriteData(this.kycUploadLambda);
    props.table.grantReadWriteData(this.adminReviewLambda);

    // Grant S3 permissions for KYC Upload Lambda
    if (props.documentBucket) {
      props.documentBucket.grantReadWrite(this.kycUploadLambda);
    }

    // Grant SNS permissions for KYC Upload Lambda
    if (props.notificationTopic) {
      props.notificationTopic.grantPublish(this.kycUploadLambda);
    }

    // Grant CloudWatch permissions
    this.postAuthLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/PostAuth",
          },
        },
      })
    );

    this.kycUploadLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/KYCUpload",
          },
        },
      })
    );

    // Create API Gateway for KYC Upload
    this.kycUploadApi = new apigateway.RestApi(this, "KYCUploadApi", {
      restApiName: `sachain-kyc-upload-api-${props.environment}`,
      description: "API for KYC document uploads",
      binaryMediaTypes: ["*/*"],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
      },
    });

    // Create API Gateway integration
    const kycUploadIntegration = new apigateway.LambdaIntegration(
      this.kycUploadLambda,
      {
        requestTemplates: { "application/json": '{"statusCode": "200"}' },
      }
    );

    // Add upload endpoint
    const uploadResource = this.kycUploadApi.root.addResource("upload");
    uploadResource.addMethod("POST", kycUploadIntegration);

    // Add presigned URL endpoint
    const presignedResource = this.kycUploadApi.root.addResource("presigned-url");
    presignedResource.addMethod("POST", kycUploadIntegration);

    // Add upload processing endpoint
    const processResource = this.kycUploadApi.root.addResource("process-upload");
    processResource.addMethod("POST", kycUploadIntegration);
  }
}
