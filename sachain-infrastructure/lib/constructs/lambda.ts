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
import * as cognito from "aws-cdk-lib/aws-cognito";
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
  userPool?: cognito.UserPool;
}

export class LambdaConstruct extends Construct {
  public readonly postAuthLambda: lambda.Function;
  public readonly kycUploadLambda: lambda.Function;
  public readonly adminReviewLambda: lambda.Function;
  public readonly userNotificationLambda: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly kycProcessingLambda: lambda.Function;
  private cognitoAuthorizer?: apigateway.CognitoUserPoolsAuthorizer;
  private kycResource: apigateway.Resource;
  private adminResource: apigateway.Resource;

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
      // deadLetterQueue: Temporarily removed to avoid circular dependencies
      // Can be added back later after stack refactoring is complete
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
        EVENT_BUS_NAME: props.eventBus?.eventBusName || "",
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      // deadLetterQueue: Temporarily removed to avoid circular dependencies
      // Can be added back later after stack refactoring is complete
      tracing: lambda.Tracing.ACTIVE,
    });

    // KYC Processing Lambda
    this.kycProcessingLambda = new NodejsFunction(this, "KYCProcessingLambda", {
      functionName: `sachain-kyc-processing-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../..",
        "backend/src/lambdas/kyc-processing/index.ts"
      ),
      role: props.securityConstruct?.kycProcessingRole,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [
          "aws-lambda",
          "@aws-sdk/client-dynamodb",
          "@aws-sdk/client-sns",
          "@aws-sdk/lib-dynamodb",
        ],
      },
      projectRoot: path.join(__dirname, "../../.."),
      environment: {
        TABLE_NAME: props.table.tableName,
        SNS_TOPIC_ARN: props.notificationTopic?.topicArn || "",
        ENVIRONMENT: props.environment,
        ADMIN_PORTAL_URL: `https://admin.sachain-${props.environment}.com`,
      },
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
      // deadLetterQueue: Temporarily removed to avoid circular dependencies
      // Can be added back later after stack refactoring is complete
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
        "backend/src/lambdas/admin-review/index.ts"
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
      // deadLetterQueue: Temporarily removed to avoid circular dependencies
      // Can be added back later after stack refactoring is complete
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
          // ENVIRONMENT: props.environment,
          FRONTEND_URL: `https://app.sachain-${props.environment}.com`,
          FROM_EMAIL: `no-reply@emmasandjio.com`,
        },
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        // deadLetterQueue: Temporarily removed to avoid circular dependencies
        // Can be added back later after stack refactoring is complete
        tracing: lambda.Tracing.ACTIVE,
      }
    );

    // Create unified API Gateway
    this.api = new apigateway.RestApi(this, "SachainApi", {
      restApiName: `sachain-api-${props.environment}`,
      description: "Unified API for Sachain platform",
      binaryMediaTypes: ["*/*"],
      defaultCorsPreflightOptions: {
        allowOrigins:
          props.environment === "prod"
            ? ["https://sachain.emmsandjio.com"]
            : apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },
      deployOptions: {
        stageName: props.environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    // KYC Upload Integration
    const kycUploadIntegration = new apigateway.LambdaIntegration(
      this.kycUploadLambda,
      { proxy: true }
    );

    // Admin Review Integration
    const adminReviewIntegration = new apigateway.LambdaIntegration(
      this.adminReviewLambda,
      { proxy: true }
    );

    // Store resources for later authorization setup
    this.kycResource = this.api.root.addResource("kyc");
    this.adminResource = this.api.root.addResource("admin");
  }

  public addCognitoAuthorization(userPool: cognito.UserPool): void {
    // Create Cognito User Pool Authorizer
    this.cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "CognitoAuthorizer",
      {
        cognitoUserPools: [userPool],
        authorizerName: `sachain-authorizer-${
          this.node.tryGetContext("environment") || "dev"
        }`,
      }
    );

    // KYC Upload Integration
    const kycUploadIntegration = new apigateway.LambdaIntegration(
      this.kycUploadLambda,
      { proxy: true }
    );

    // Admin Review Integration
    const adminReviewIntegration = new apigateway.LambdaIntegration(
      this.adminReviewLambda,
      { proxy: true }
    );

    // Add KYC endpoints with authorization
    const uploadResource = this.kycResource.addResource("upload");
    uploadResource.addMethod("POST", kycUploadIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Add admin endpoints with authorization
    const approveResource = this.adminResource.addResource("approve");
    approveResource.addMethod("POST", adminReviewIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const rejectResource = this.adminResource.addResource("reject");
    rejectResource.addMethod("POST", adminReviewIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const documentsResource = this.adminResource.addResource("documents");
    documentsResource.addMethod("GET", adminReviewIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
  }
}
