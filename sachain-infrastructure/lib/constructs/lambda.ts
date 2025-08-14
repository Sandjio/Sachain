import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { SecurityConstruct } from "./security";
import * as path from "path";

export interface LambdaConstructProps {
  table: dynamodb.Table;
  documentBucket?: s3.Bucket;
  notificationTopic?: sns.Topic;
  eventBus?: events.EventBus;
  environment: string;
  securityConstruct?: SecurityConstruct;
}

export class LambdaConstruct extends Construct {
  public readonly postAuthLambda: lambda.Function;
  public readonly kycUploadLambda: lambda.Function;
  public readonly adminReviewLambda: lambda.Function;
  public readonly userNotificationLambda: lambda.Function;
  public readonly kycUploadApi: apigateway.RestApi;
  public readonly adminReviewApi: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    // Post-Authentication Lambda
    this.postAuthLambda = new NodejsFunction(this, "PostAuthLambda", {
      functionName: `sachain-post-auth-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../..",
        "backend/src/lambdas/post-auth/index.ts"
      ),
      role: props.securityConstruct?.postAuthRole,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [
          "@aws-sdk/client-dynamodb",
          "@aws-sdk/lib-dynamodb",
          "@aws-sdk/client-cloudwatch",
        ],
      },
      projectRoot: path.join(__dirname, "../../.."),
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
      tracing: lambda.Tracing.ACTIVE,
    });

    // KYC Upload Lambda
    this.kycUploadLambda = new NodejsFunction(this, "KYCUploadLambda", {
      functionName: `sachain-kyc-upload-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../..",
        "backend/src/lambdas/kyc-upload/index.ts"
      ),
      role: props.securityConstruct?.kycUploadRole,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [
          "aws-lambda",
          "@aws-sdk/client-dynamodb",
          "@aws-sdk/client-s3",
          "@aws-sdk/s3-request-presigner",
          "@aws-sdk/client-sns",
          "@aws-sdk/client-cloudwatch",
          "@aws-sdk/lib-dynamodb",
        ],
      },
      projectRoot: path.join(__dirname, "../../.."),
      environment: {
        TABLE_NAME: props.table.tableName,
        BUCKET_NAME: props.documentBucket?.bucketName || "",
        SNS_TOPIC_ARN: props.notificationTopic?.topicArn || "",
        ENVIRONMENT: props.environment,

        ADMIN_PORTAL_URL: `https://admin.sachain-${props.environment}.com`,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      deadLetterQueue: new sqs.Queue(this, "KYCUploadDLQ", {
        queueName: `sachain-kyc-upload-dlq-${props.environment}`,
        retentionPeriod: cdk.Duration.days(14),
      }),
      tracing: lambda.Tracing.ACTIVE,
    });

    // Admin Review Lambda
    this.adminReviewLambda = new NodejsFunction(this, "AdminReviewLambda", {
      functionName: `sachain-admin-review-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../..",
        "backend/src/lambdas/admin-review/index-enhanced.ts"
      ),
      role: props.securityConstruct?.adminReviewRole,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [
          "aws-lambda",
          "@aws-sdk/client-dynamodb",
          "@aws-sdk/client-cloudwatch",
          "@aws-sdk/lib-dynamodb",
        ],
      },
      projectRoot: path.join(__dirname, "../../.."),
      environment: {
        TABLE_NAME: props.table.tableName,
        EVENT_BUS_NAME: props.eventBus?.eventBusName || "",
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
      deadLetterQueue: new sqs.Queue(this, "AdminReviewDLQ", {
        queueName: `sachain-admin-review-dlq-${props.environment}`,
        retentionPeriod: cdk.Duration.days(14),
      }),
      tracing: lambda.Tracing.ACTIVE,
    });

    // User Notification Lambda
    this.userNotificationLambda = new NodejsFunction(
      this,
      "UserNotificationLambda",
      {
        functionName: `sachain-user-notification-${props.environment}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../../..",
          "backend/src/lambdas/user-notification/index.ts"
        ),
        role: props.securityConstruct?.userNotificationRole,
        bundling: {
          minify: true,
          sourceMap: true,
          target: "node20",
          externalModules: [
            "aws-lambda",
            "@aws-sdk/client-sns",
            "@aws-sdk/client-dynamodb",
            "@aws-sdk/lib-dynamodb",
          ],
        },
        projectRoot: path.join(__dirname, "../../.."),
        environment: {
          TABLE_NAME: props.table.tableName,
          ENVIRONMENT: props.environment,
          FRONTEND_URL: `https://app.sachain-${props.environment}.com`,
        },
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        deadLetterQueue: new sqs.Queue(this, "UserNotificationDLQ", {
          queueName: `sachain-user-notification-dlq-${props.environment}`,
          retentionPeriod: cdk.Duration.days(14),
        }),
        tracing: lambda.Tracing.ACTIVE,
      }
    );

    // Note: IAM permissions are now managed by the SecurityConstruct
    // which provides least-privilege access with proper conditions and restrictions
    // All Lambda functions use custom IAM roles from the SecurityConstruct

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
        proxy: true,
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
        ],
      }
    );

    // Add upload endpoint
    const uploadResource = this.kycUploadApi.root.addResource("upload");
    uploadResource.addMethod("POST", kycUploadIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    // Add presigned URL endpoint
    const presignedResource =
      this.kycUploadApi.root.addResource("presigned-url");
    presignedResource.addMethod("POST", kycUploadIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    // Add upload processing endpoint
    const processResource =
      this.kycUploadApi.root.addResource("process-upload");
    processResource.addMethod("POST", kycUploadIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    // Create API Gateway for Admin Review
    this.adminReviewApi = new apigateway.RestApi(this, "AdminReviewApi", {
      restApiName: `sachain-admin-review-api-${props.environment}`,
      description: "API for KYC admin review operations",
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

    // Create API Gateway integration for Admin Review
    const adminReviewIntegration = new apigateway.LambdaIntegration(
      this.adminReviewLambda,
      {
        requestTemplates: { "application/json": '{"statusCode": "200"}' },
      }
    );

    // Add admin endpoints
    const approveResource = this.adminReviewApi.root.addResource("approve");
    approveResource.addMethod("POST", adminReviewIntegration);

    const rejectResource = this.adminReviewApi.root.addResource("reject");
    rejectResource.addMethod("POST", adminReviewIntegration);

    const documentsResource = this.adminReviewApi.root.addResource("documents");
    documentsResource.addMethod("GET", adminReviewIntegration);
  }
}
