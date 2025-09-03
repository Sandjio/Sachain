import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { SecurityConstruct } from "./security";
import * as path from "path";

export interface LambdaConstructProps {
  table: dynamodb.Table;
  documentBucket?: s3.Bucket;
  projectImagesBucket?: s3.Bucket;
  encryptionKey?: import("aws-cdk-lib/aws-kms").Key;
  notificationTopic?: sns.Topic;
  eventBus?: events.EventBus;
  environment: string;
  securityConstruct?: SecurityConstruct;
  stockMintingRole?: import("aws-cdk-lib/aws-iam").Role;
  stockMintingStatusRole?: import("aws-cdk-lib/aws-iam").Role;
  omPaymentsRole?: import("aws-cdk-lib/aws-iam").Role;
}

export class LambdaConstruct extends Construct {
  public readonly kycUploadLambda: lambda.Function;
  public readonly adminReviewLambda: lambda.Function;
  public readonly userNotificationLambda: lambda.Function;
  public readonly kycProcessingLambda: lambda.Function;
  public readonly projectCreationLambda: lambda.Function;
  public readonly projectQueryLambda: lambda.Function;
  public readonly projectManagementLambda: lambda.Function;
  public readonly stockMintingLambda: lambda.Function;
  public readonly stockMintingStatusLambda: lambda.Function;
  public readonly omPaymentsLambda: lambda.Function;
  public readonly api: apigateway.RestApi;
  private cognitoAuthorizer?: apigateway.CognitoUserPoolsAuthorizer;
  private kycResource: apigateway.Resource;
  private adminResource: apigateway.Resource;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

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
          "@aws-sdk/client-eventbridge",
        ],
      },
      projectRoot: path.join(__dirname, "../../.."),
      environment: {
        TABLE_NAME: props.table.tableName,
        BUCKET_NAME: props.documentBucket?.bucketName || "",
        PROJECT_IMAGES_BUCKET_NAME: props.projectImagesBucket?.bucketName || "",
        EVENT_BUS_NAME: props.eventBus?.eventBusName || "",
        ENVIRONMENT: props.environment,
        KMS_KEY_ID: props.encryptionKey?.keyId || "",
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
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
        EVENT_BUS_NAME: props.eventBus?.eventBusName || "",
        ENVIRONMENT: props.environment,
        ADMIN_PORTAL_URL: `https://admin.sachain-${props.environment}.com`,
      },
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
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
        PROJECT_IMAGES_BUCKET_NAME: props.projectImagesBucket?.bucketName || "",
        EVENT_BUS_NAME: props.eventBus?.eventBusName || "",
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
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
          SNS_TOPIC_ARN: props.notificationTopic?.topicArn || "",
          ENVIRONMENT: props.environment,
          FRONTEND_URL: `https://app.sachain-${props.environment}.com`,
          FROM_EMAIL: `no-reply@emmasandjio.com`,
        },
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        tracing: lambda.Tracing.ACTIVE,
      }
    );

    // Project Creation Lambda
    this.projectCreationLambda = new NodejsFunction(
      this,
      "ProjectCreationLambda",
      {
        functionName: `sachain-project-creation-${props.environment}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../../..",
          "backend/src/lambdas/project-creation/index.ts"
        ),
        role: props.securityConstruct?.projectCreationRole,
        bundling: {
          minify: true,
          sourceMap: true,
          target: "node20",
          externalModules: [
            "aws-lambda",
            "@aws-sdk/client-dynamodb",
            "@aws-sdk/lib-dynamodb",
            "@aws-sdk/client-eventbridge",
            "@aws-sdk/client-cloudwatch",
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
        tracing: lambda.Tracing.ACTIVE,
      }
    );

    // Project Query Lambda
    this.projectQueryLambda = new NodejsFunction(this, "ProjectQueryLambda", {
      functionName: `sachain-project-query-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../..",
        "backend/src/lambdas/project-query/index.ts"
      ),
      role: props.securityConstruct?.projectCreationRole, // Reuse project creation role for read operations
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [
          "aws-lambda",
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
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Project Management Lambda
    this.projectManagementLambda = new NodejsFunction(
      this,
      "ProjectManagementLambda",
      {
        functionName: `sachain-project-management-${props.environment}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../../..",
          "backend/src/lambdas/project-management/index.ts"
        ),
        role: props.securityConstruct?.projectCreationRole, // Reuse project creation role for management operations
        bundling: {
          minify: true,
          sourceMap: true,
          target: "node20",
          externalModules: [
            "aws-lambda",
            "@aws-sdk/client-dynamodb",
            "@aws-sdk/lib-dynamodb",
            "@aws-sdk/client-eventbridge",
            "@aws-sdk/client-cloudwatch",
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
        tracing: lambda.Tracing.ACTIVE,
      }
    );

    // Stock Minting Lambda
    this.stockMintingLambda = new NodejsFunction(this, "StockMintingLambda", {
      functionName: `sachain-stock-minting-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../..",
        "backend/src/lambdas/stock-minting/index.ts"
      ),
      role: props.stockMintingRole || props.securityConstruct?.stockMintingRole,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [
          "aws-lambda",
          "@aws-sdk/client-dynamodb",
          "@aws-sdk/lib-dynamodb",
          "@aws-sdk/client-eventbridge",
          "@aws-sdk/client-cloudwatch",
        ],
      },
      projectRoot: path.join(__dirname, "../../.."),
      environment: {
        TABLE_NAME: props.table.tableName,
        EVENT_BUS_NAME: props.eventBus?.eventBusName || "",
        ENVIRONMENT: props.environment,
        FRONTEND_URL: `https://app.sachain-${props.environment}.com`,
        // Hedera configuration from environment variables
        HEDERA_OPERATOR_ID: "0.0.6621818",
        HEDERA_OPERATOR_KEY:
          "3030020100300706052b8104000a04220420d0be273e8cc795c37696efeee5c06a3b7755f3229601b4b3d8681d44fca63152",
        HEDERA_NETWORK: "testnet",
        HEDERA_MAX_TRANSACTION_FEE: "100",
        HEDERA_MAX_QUERY_PAYMENT: "1",
        // Legacy environment variables for backward compatibility
        OPERATION_ID: "0.0.6621818",
        OPERATION_KEY:
          "3030020100300706052b8104000a04220420d0be273e8cc795c37696efeee5c06a3b7755f3229601b4b3d8681d44fca63152",
        NETWORK: "testnet",
      },
      timeout: cdk.Duration.minutes(15), // Longer timeout for minting operations
      memorySize: 1024, // More memory for batch operations
      tracing: lambda.Tracing.ACTIVE,
    });

    // Stock Minting Status Lambda
    this.stockMintingStatusLambda = new NodejsFunction(
      this,
      "StockMintingStatusLambda",
      {
        functionName: `sachain-stock-minting-status-${props.environment}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../../..",
          "backend/src/lambdas/stock-minting-status/index.ts"
        ),
        role:
          props.stockMintingStatusRole ||
          props.securityConstruct?.stockMintingStatusRole,
        bundling: {
          minify: true,
          sourceMap: true,
          target: "node20",
          externalModules: [
            "aws-lambda",
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
        timeout: cdk.Duration.minutes(2),
        memorySize: 512,
        tracing: lambda.Tracing.ACTIVE,
      }
    );

    // Orange Money Payments Lambda
    this.omPaymentsLambda = new NodejsFunction(this, "OMPaymentsLambda", {
      functionName: `sachain-om-payments-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../..",
        "backend/src/lambdas/om-payments/index.ts"
      ),
      role: props.securityConstruct?.omPaymentsRole,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [
          "aws-lambda",
          "@aws-sdk/client-dynamodb",
          "@aws-sdk/lib-dynamodb",
          "@aws-sdk/client-cloudwatch",
          "node-fetch", // Include node-fetch as an external module
        ],
      },
      projectRoot: path.join(__dirname, "../../.."),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environment,
        // Add other necessary environment variables here
      },
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Create unified API Gateway
    this.api = new apigateway.RestApi(this, "SachainApi", {
      restApiName: `sachain-api-${props.environment}`,
      description: "Unified API for Sachain platform",
      binaryMediaTypes: ["*/*"],
      deployOptions: {
        stageName: props.environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

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

    // Projects creation Integration
    const projectCreationIntegration = new apigateway.LambdaIntegration(
      this.projectCreationLambda,
      { proxy: true }
    );

    // Project Query Integration
    const projectQueryIntegration = new apigateway.LambdaIntegration(
      this.projectQueryLambda,
      { proxy: true }
    );

    // Project Management Integration
    const projectManagementIntegration = new apigateway.LambdaIntegration(
      this.projectManagementLambda,
      { proxy: true }
    );

    // Stock Minting Integration
    const stockMintingIntegration = new apigateway.LambdaIntegration(
      this.stockMintingLambda,
      { proxy: true }
    );

    // Stock Minting Status Integration
    const stockMintingStatusIntegration = new apigateway.LambdaIntegration(
      this.stockMintingStatusLambda,
      { proxy: true }
    );

    // Orange Money Payments Integration
    const omPaymentsIntegration = new apigateway.LambdaIntegration(
      this.omPaymentsLambda,
      { proxy: true }
    );

    // Add KYC endpoints with authorization
    const uploadResource = this.kycResource.addResource("upload");
    uploadResource.addMethod("POST", kycUploadIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Add OPTIONS method without authorization (handled by Lambda)
    uploadResource.addMethod("OPTIONS", kycUploadIntegration);

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

    // Add project endpoints with authorization
    const projectsResource = this.api.root.addResource("projects");

    // POST /projects - Create project
    projectsResource.addMethod("POST", projectCreationIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /projects - List projects with query parameters
    projectsResource.addMethod("GET", projectQueryIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestParameters: {
        "method.request.querystring.status": false,
        "method.request.querystring.limit": false,
        "method.request.querystring.sortBy": false,
        "method.request.querystring.sortOrder": false,
        "method.request.querystring.exclusiveStartKey": false,
        "method.request.querystring.includeStats": false,
        "method.request.querystring.entrepreneurId": false,
        "method.request.querystring.category": false,
      },
    });

    // Add project-specific endpoints
    const projectIdResource = projectsResource.addResource("{projectId}");

    // GET /projects/{projectId} - Get single project
    projectIdResource.addMethod("GET", projectQueryIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /projects/{projectId} - Update project
    projectIdResource.addMethod("PUT", projectManagementIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // DELETE /projects/{projectId} - Delete project
    projectIdResource.addMethod("DELETE", projectManagementIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /projects/{projectId}/status - Update project status
    const projectStatusResource = projectIdResource.addResource("status");
    projectStatusResource.addMethod("PUT", projectManagementIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Add stock minting endpoints
    const mintStocksResource = projectIdResource.addResource("mint-stocks");

    // POST /projects/{projectId}/mint-stocks
    mintStocksResource.addMethod("POST", stockMintingIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /projects/{projectId}/mint-stocks/status
    const mintStocksStatusResource = mintStocksResource.addResource("status");
    mintStocksStatusResource.addMethod("GET", stockMintingStatusIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Add Orange Money payments endpoint
    const omPaymentsResource = this.api.root.addResource("om-payments");
    omPaymentsResource.addMethod("POST", omPaymentsIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
  }
}
