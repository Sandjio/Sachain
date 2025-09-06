/**
 * Admin Dashboard Construct
 * Infrastructure for admin dashboard and management tools
 */

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as sns from "aws-cdk-lib/aws-sns";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";

export interface AdminDashboardConstructProps {
  environment: string;
  table: dynamodb.Table;
  api: apigateway.RestApi;
  userPool: cognito.UserPool;
  notificationTopic: sns.Topic;
  adminResource?: apigateway.Resource;
}

export class AdminDashboardConstruct extends Construct {
  public readonly adminDashboardLambda: lambda.Function;
  public readonly adminAlertTopic: sns.Topic;
  public adminDashboard: cloudwatch.Dashboard;

  constructor(
    scope: Construct,
    id: string,
    props: AdminDashboardConstructProps
  ) {
    super(scope, id);

    // Create admin alert SNS topic
    this.adminAlertTopic = new sns.Topic(this, "AdminAlertTopic", {
      topicName: `sachain-admin-alerts-${props.environment}`,
      displayName: "Sachain Admin Alerts",
    });

    // Create admin dashboard Lambda
    this.adminDashboardLambda = new lambda.Function(
      this,
      "AdminDashboardLambda",
      {
        functionName: `sachain-admin-dashboard-${props.environment}`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          "../backend/src/lambdas/admin-dashboard"
        ),
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: {
          DYNAMODB_TABLE_NAME: props.table.tableName,
          COGNITO_USER_POOL_ID: props.userPool.userPoolId,
          COGNITO_CLIENT_ID: "", // Will be set after client creation
          ADMIN_ALERT_TOPIC_ARN: this.adminAlertTopic.topicArn,
          ADMIN_EMAIL_ADDRESSES: process.env.ADMIN_EMAIL_ADDRESSES || "",
          ADMIN_EMAIL_FROM:
            process.env.ADMIN_EMAIL_FROM || "noreply@sachain.com",
          TREASURY_LOW_BALANCE_THRESHOLD:
            process.env.TREASURY_LOW_BALANCE_THRESHOLD || "1000",
          TREASURY_CRITICAL_BALANCE_THRESHOLD:
            process.env.TREASURY_CRITICAL_BALANCE_THRESHOLD || "100",
          PLATFORM_FEE_PERCENTAGE: process.env.PLATFORM_FEE_PERCENTAGE || "2",
          ORANGE_MONEY_FEE_PERCENTAGE:
            process.env.ORANGE_MONEY_FEE_PERCENTAGE || "1",
          HEDERA_ACCOUNT_ID: process.env.HEDERA_ACCOUNT_ID || "",
          HEDERA_PRIVATE_KEY: process.env.HEDERA_PRIVATE_KEY || "",
          HEDERA_NETWORK: process.env.HEDERA_NETWORK || "testnet",
        },
        tracing: lambda.Tracing.ACTIVE,
      }
    );

    // Grant permissions
    this.grantPermissions(props);

    // Add API endpoints
    this.addApiEndpoints(props);

    // Create CloudWatch dashboard
    this.createAdminDashboard(props);

    // Add tags
    cdk.Tags.of(this).add("Component", "AdminDashboard");
    cdk.Tags.of(this).add("Environment", props.environment);
  }

  private grantPermissions(props: AdminDashboardConstructProps): void {
    // Grant DynamoDB permissions
    props.table.grantReadWriteData(this.adminDashboardLambda);

    // Grant SNS permissions
    this.adminAlertTopic.grantPublish(this.adminDashboardLambda);
    props.notificationTopic.grantPublish(this.adminDashboardLambda);

    // Grant SES permissions for email alerts
    this.adminDashboardLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      })
    );

    // Grant CloudWatch permissions for metrics
    this.adminDashboardLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
          "cloudwatch:GetMetricData",
        ],
        resources: ["*"],
      })
    );

    // Grant EventBridge permissions
    this.adminDashboardLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["events:PutEvents"],
        resources: ["*"],
      })
    );
  }

  private addApiEndpoints(props: AdminDashboardConstructProps): void {
    // Create admin authorizer
    const adminAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "AdminAuthorizer",
      {
        cognitoUserPools: [props.userPool],
        authorizerName: `sachain-admin-authorizer-${props.environment}`,
      }
    );

    // Create request validators
    const requestValidator = new apigateway.RequestValidator(
      this,
      "AdminRequestValidator",
      {
        restApi: props.api,
        validateRequestBody: true,
        validateRequestParameters: true,
        requestValidatorName: `admin-request-validator-${props.environment}`,
      }
    );

    // Use existing admin resource or create new one
    const adminResource = props.adminResource || props.api.root.addResource("admin");

    // Dashboard endpoints
    const dashboardResource = adminResource.addResource("dashboard");

    // GET /admin/dashboard/metrics
    const metricsResource = dashboardResource.addResource("metrics");
    metricsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(this.adminDashboardLambda),
      {
        authorizer: adminAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // GET /admin/dashboard/health
    const healthResource = dashboardResource.addResource("health");
    healthResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(this.adminDashboardLambda),
      {
        authorizer: adminAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Transaction management endpoints
    const transactionsResource = adminResource.addResource("transactions");

    // GET /admin/transactions
    transactionsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(this.adminDashboardLambda),
      {
        authorizer: adminAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          "method.request.querystring.status": false,
          "method.request.querystring.userId": false,
          "method.request.querystring.dateFrom": false,
          "method.request.querystring.dateTo": false,
          "method.request.querystring.limit": false,
          "method.request.querystring.exclusiveStartKey": false,
        },
      }
    );

    // GET /admin/transactions/{transactionId}
    const transactionResource =
      transactionsResource.addResource("{transactionId}");
    transactionResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(this.adminDashboardLambda),
      {
        authorizer: adminAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          "method.request.path.transactionId": true,
        },
      }
    );

    // POST /admin/transactions/{transactionId}/retry
    const retryResource = transactionResource.addResource("retry");
    retryResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(this.adminDashboardLambda),
      {
        authorizer: adminAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestValidator: requestValidator,
        requestParameters: {
          "method.request.path.transactionId": true,
        },
      }
    );

    // Treasury management endpoints
    const treasuryResource = adminResource.addResource("treasury");

    // GET /admin/treasury/balance
    const balanceResource = treasuryResource.addResource("balance");
    balanceResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(this.adminDashboardLambda),
      {
        authorizer: adminAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // GET /admin/treasury/alerts
    const alertsResource = treasuryResource.addResource("alerts");
    alertsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(this.adminDashboardLambda),
      {
        authorizer: adminAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Dispute management endpoints
    const disputesResource = adminResource.addResource("disputes");
    disputesResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(this.adminDashboardLambda),
      {
        authorizer: adminAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Reporting endpoints
    const reportsResource = adminResource.addResource("reports");

    // POST /admin/reports/compliance
    const complianceResource = reportsResource.addResource("compliance");
    complianceResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(this.adminDashboardLambda),
      {
        authorizer: adminAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestValidator: requestValidator,
      }
    );

    // POST /admin/reports/financial
    const financialResource = reportsResource.addResource("financial");
    financialResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(this.adminDashboardLambda),
      {
        authorizer: adminAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestValidator: requestValidator,
      }
    );

    // Add CORS to all admin endpoints
    this.addCorsToResource(adminResource);
  }

  private addCorsToResource(resource: apigateway.Resource): void {
    resource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS,
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "X-Amz-Date",
        "X-Api-Key",
        "X-Amz-Security-Token",
      ],
      maxAge: cdk.Duration.hours(1),
    });

    // Recursively add CORS to child resources
    for (const child of Object.values(resource.node.children)) {
      if (child instanceof apigateway.Resource) {
        this.addCorsToResource(child);
      }
    }
  }

  private createAdminDashboard(props: AdminDashboardConstructProps): void {
    this.adminDashboard = new cloudwatch.Dashboard(this, "AdminDashboard", {
      dashboardName: `sachain-admin-dashboard-${props.environment}`,
    });

    // Lambda metrics
    const lambdaMetrics = [
      new cloudwatch.Metric({
        namespace: "AWS/Lambda",
        metricName: "Invocations",
        dimensionsMap: {
          FunctionName: this.adminDashboardLambda.functionName,
        },
        statistic: "Sum",
      }),
      new cloudwatch.Metric({
        namespace: "AWS/Lambda",
        metricName: "Errors",
        dimensionsMap: {
          FunctionName: this.adminDashboardLambda.functionName,
        },
        statistic: "Sum",
      }),
      new cloudwatch.Metric({
        namespace: "AWS/Lambda",
        metricName: "Duration",
        dimensionsMap: {
          FunctionName: this.adminDashboardLambda.functionName,
        },
        statistic: "Average",
      }),
    ];

    // API Gateway metrics
    const apiMetrics = [
      new cloudwatch.Metric({
        namespace: "AWS/ApiGateway",
        metricName: "4XXError",
        dimensionsMap: {
          ApiName: props.api.restApiName,
        },
        statistic: "Sum",
      }),
      new cloudwatch.Metric({
        namespace: "AWS/ApiGateway",
        metricName: "5XXError",
        dimensionsMap: {
          ApiName: props.api.restApiName,
        },
        statistic: "Sum",
      }),
    ];

    // DynamoDB metrics
    const dynamoMetrics = [
      new cloudwatch.Metric({
        namespace: "AWS/DynamoDB",
        metricName: "ConsumedReadCapacityUnits",
        dimensionsMap: {
          TableName: props.table.tableName,
        },
        statistic: "Sum",
      }),
      new cloudwatch.Metric({
        namespace: "AWS/DynamoDB",
        metricName: "ConsumedWriteCapacityUnits",
        dimensionsMap: {
          TableName: props.table.tableName,
        },
        statistic: "Sum",
      }),
    ];

    // Add widgets to dashboard
    this.adminDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Admin Lambda Metrics",
        left: lambdaMetrics,
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "API Gateway Errors",
        left: apiMetrics,
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "DynamoDB Capacity",
        left: dynamoMetrics,
        width: 24,
        height: 6,
      })
    );
  }
}
