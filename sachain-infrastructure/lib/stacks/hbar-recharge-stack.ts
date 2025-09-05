import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { HBARRechargeConstruct } from "../constructs/hbar-recharge";
import { CrossStackValidator, ResourceReferenceTracker } from "../utils";

export interface HBARRechargeStackProps extends cdk.StackProps {
  environment: string;
  // Dependencies from other stacks
  table: dynamodb.Table;
  eventBus: events.EventBus;
  notificationTopic: sns.Topic;
  api: apigateway.RestApi;
  userPool: cognito.UserPool;
}

export interface HBARRechargeStackOutputs {
  rechargeTable: dynamodb.Table;
  rechargeHandlerLambda: lambda.Function;
  conversionHandlerLambda: lambda.Function;
  rechargeEventBus: events.EventBus;
  rechargeTableName: string;
  rechargeHandlerArn: string;
  conversionHandlerArn: string;
  rechargeEventBusArn: string;
}

export class HBARRechargeStack
  extends cdk.Stack
  implements HBARRechargeStackOutputs
{
  public readonly hbarRechargeConstruct: HBARRechargeConstruct;

  // Stack outputs
  public readonly rechargeTable: dynamodb.Table;
  public readonly rechargeHandlerLambda: lambda.Function;
  public readonly conversionHandlerLambda: lambda.Function;
  public readonly rechargeEventBus: events.EventBus;
  public readonly rechargeTableName: string;
  public readonly rechargeHandlerArn: string;
  public readonly conversionHandlerArn: string;
  public readonly rechargeEventBusArn: string;

  constructor(scope: Construct, id: string, props: HBARRechargeStackProps) {
    super(scope, id, props);

    // Validate dependencies
    this.validateDependencies(props);

    // Record cross-stack references for tracking
    this.recordCrossStackReferences(id);

    // Add environment tags
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Project", "Sachain");
    cdk.Tags.of(this).add("Component", "HBAR-Recharge");

    // Create HBAR recharge construct
    this.hbarRechargeConstruct = new HBARRechargeConstruct(
      this,
      "HBARRecharge",
      {
        environment: props.environment,
        table: props.table,
        eventBus: props.eventBus,
        notificationTopic: props.notificationTopic,
      }
    );

    // Expose construct resources
    this.rechargeTable = this.hbarRechargeConstruct.rechargeTable;
    this.rechargeHandlerLambda =
      this.hbarRechargeConstruct.rechargeHandlerLambda;
    this.conversionHandlerLambda =
      this.hbarRechargeConstruct.conversionHandlerLambda;
    this.rechargeEventBus = this.hbarRechargeConstruct.rechargeEventBus;

    // Set output properties
    this.rechargeTableName = this.rechargeTable.tableName;
    this.rechargeHandlerArn = this.rechargeHandlerLambda.functionArn;
    this.conversionHandlerArn = this.conversionHandlerLambda.functionArn;
    this.rechargeEventBusArn = this.rechargeEventBus.eventBusArn;

    // Add API Gateway endpoints
    this.addApiEndpoints(props);

    // Create stack outputs for cross-stack references
    this.createStackOutputs(props.environment);
  }

  private validateDependencies(props: HBARRechargeStackProps): void {
    // Skip validation in test environment to avoid cross-stack validation issues
    if (props.environment === "test") {
      console.log("Skipping validation for test environment");
      return;
    }

    const dependencies = {
      table: props.table,
      eventBus: props.eventBus,
      notificationTopic: props.notificationTopic,
      api: props.api,
      userPool: props.userPool,
    };

    // Validate that all required dependencies are provided
    Object.entries(dependencies).forEach(([key, value]) => {
      if (!value) {
        throw new Error(`Missing required dependency: ${key}`);
      }
    });

    console.log("HBAR Recharge Stack dependencies validated successfully");
  }

  private recordCrossStackReferences(stackId: string): void {
    ResourceReferenceTracker.recordReference(stackId, "CoreStack", "table");
    ResourceReferenceTracker.recordReference(
      stackId,
      "LambdaStack",
      "eventBus"
    );
    ResourceReferenceTracker.recordReference(
      stackId,
      "LambdaStack",
      "notificationTopic"
    );
    ResourceReferenceTracker.recordReference(stackId, "LambdaStack", "api");
    ResourceReferenceTracker.recordReference(stackId, "CoreStack", "userPool");
  }

  private addApiEndpoints(props: HBARRechargeStackProps): void {
    // Create Cognito User Pool Authorizer for this stack
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "HBARRechargeCognitoAuthorizer",
      {
        cognitoUserPools: [props.userPool],
        authorizerName: `sachain-hbar-recharge-authorizer-${props.environment}`,
      }
    );

    // Create request validators
    const rechargeRequestValidator = new apigateway.RequestValidator(
      this,
      "RechargeRequestValidator",
      {
        restApi: props.api,
        validateRequestBody: true,
        validateRequestParameters: true,
        requestValidatorName: `hbar-recharge-request-validator-${props.environment}`,
      }
    );

    const queryParameterValidator = new apigateway.RequestValidator(
      this,
      "QueryParameterValidator",
      {
        restApi: props.api,
        validateRequestBody: false,
        validateRequestParameters: true,
        requestValidatorName: `hbar-recharge-query-validator-${props.environment}`,
      }
    );

    // Create request models
    const rechargeRequestModel = this.createRechargeRequestModel(props.api);
    const rechargeResponseModel = this.createRechargeResponseModel(props.api);
    const errorResponseModel = this.createErrorResponseModel(props.api);

    // Create recharge resource under API
    const rechargeResource = props.api.root.addResource("hbar-recharge");

    // Configure throttling settings
    const throttleSettings: apigateway.ThrottleSettings = {
      rateLimit: 100, // requests per second
      burstLimit: 200, // burst capacity
    };

    // Create Lambda integration with error handling
    const rechargeIntegration = new apigateway.LambdaIntegration(
      this.rechargeHandlerLambda,
      {
        proxy: true,
        allowTestInvoke: false,
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": "",
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type,Authorization'",
              "method.response.header.Access-Control-Allow-Methods":
                "'POST,GET,OPTIONS'",
            },
          },
          {
            statusCode: "400",
            selectionPattern: '.*"statusCode":400.*',
            responseTemplates: {
              "application/json": "",
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
          {
            statusCode: "401",
            selectionPattern: '.*"statusCode":401.*',
            responseTemplates: {
              "application/json": "",
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
          {
            statusCode: "403",
            selectionPattern: '.*"statusCode":403.*',
            responseTemplates: {
              "application/json": "",
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
          {
            statusCode: "500",
            selectionPattern: '.*"statusCode":5\\d{2}.*',
            responseTemplates: {
              "application/json": "",
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
        ],
      }
    );

    // POST /hbar-recharge - Initiate recharge request
    const postMethod = rechargeResource.addMethod("POST", rechargeIntegration, {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator: rechargeRequestValidator,
      requestModels: {
        "application/json": rechargeRequestModel,
      },
      methodResponses: [
        {
          statusCode: "200",
          responseModels: {
            "application/json": rechargeResponseModel,
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
            "method.response.header.Access-Control-Allow-Headers": true,
            "method.response.header.Access-Control-Allow-Methods": true,
          },
        },
        {
          statusCode: "400",
          responseModels: {
            "application/json": errorResponseModel,
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "401",
          responseModels: {
            "application/json": errorResponseModel,
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "403",
          responseModels: {
            "application/json": errorResponseModel,
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "500",
          responseModels: {
            "application/json": errorResponseModel,
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    // Add throttling to POST method
    const postMethodResource = postMethod.node.findChild(
      "Resource"
    ) as apigateway.CfnMethod;
    postMethodResource.addPropertyOverride(
      "ThrottleSettings",
      throttleSettings
    );

    // OPTIONS method for CORS preflight
    rechargeResource.addMethod(
      "OPTIONS",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
              "method.response.header.Access-Control-Allow-Methods":
                "'POST,GET,OPTIONS'",
              "method.response.header.Access-Control-Max-Age": "'86400'",
            },
            responseTemplates: {
              "application/json": "",
            },
          },
        ],
        requestTemplates: {
          "application/json": '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Max-Age": true,
            },
          },
        ],
      }
    );

    // GET /hbar-recharge - List user's recharge transactions
    const getMethod = rechargeResource.addMethod("GET", rechargeIntegration, {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator: queryParameterValidator,
      requestParameters: {
        "method.request.querystring.limit": false,
        "method.request.querystring.status": false,
        "method.request.querystring.exclusiveStartKey": false,
      },
      methodResponses: [
        {
          statusCode: "200",
          responseModels: {
            "application/json": this.createTransactionListResponseModel(
              props.api
            ),
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "400",
          responseModels: {
            "application/json": errorResponseModel,
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "401",
          responseModels: {
            "application/json": errorResponseModel,
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    // Add throttling to GET method
    const getMethodResource = getMethod.node.findChild(
      "Resource"
    ) as apigateway.CfnMethod;
    getMethodResource.addPropertyOverride("ThrottleSettings", {
      rateLimit: 50, // Lower rate limit for list operations
      burstLimit: 100,
    });

    // GET /hbar-recharge/{transactionId} - Get recharge status
    const transactionResource = rechargeResource.addResource("{transactionId}");

    // Add path parameter validation
    const transactionGetMethod = transactionResource.addMethod(
      "GET",
      rechargeIntegration,
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestValidator: queryParameterValidator,
        requestParameters: {
          "method.request.path.transactionId": true,
        },
        methodResponses: [
          {
            statusCode: "200",
            responseModels: {
              "application/json": this.createTransactionDetailResponseModel(
                props.api
              ),
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
          {
            statusCode: "404",
            responseModels: {
              "application/json": errorResponseModel,
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
          {
            statusCode: "401",
            responseModels: {
              "application/json": errorResponseModel,
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
        ],
      }
    );

    // Add throttling to transaction GET method
    const transactionGetMethodResource = transactionGetMethod.node.findChild(
      "Resource"
    ) as apigateway.CfnMethod;
    transactionGetMethodResource.addPropertyOverride("ThrottleSettings", {
      rateLimit: 20, // Lower rate limit for individual transaction queries
      burstLimit: 50,
    });

    // POST /hbar-recharge/{transactionId}/retry - Retry failed transaction (admin only)
    const retryResource = transactionResource.addResource("retry");
    const retryMethod = retryResource.addMethod("POST", rechargeIntegration, {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator: queryParameterValidator,
      requestParameters: {
        "method.request.path.transactionId": true,
      },
      methodResponses: [
        {
          statusCode: "200",
          responseModels: {
            "application/json": rechargeResponseModel,
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "403",
          responseModels: {
            "application/json": errorResponseModel,
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "404",
          responseModels: {
            "application/json": errorResponseModel,
          },
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    // Add strict throttling to retry method (admin operation)
    const retryMethodResource = retryMethod.node.findChild(
      "Resource"
    ) as apigateway.CfnMethod;
    retryMethodResource.addPropertyOverride("ThrottleSettings", {
      rateLimit: 5, // Very low rate limit for admin operations
      burstLimit: 10,
    });

    // Add usage plan for rate limiting
    this.createUsagePlan(props.api, props.environment);
  }

  private createRechargeRequestModel(
    api: apigateway.RestApi
  ): apigateway.Model {
    return new apigateway.Model(this, "RechargeRequestModel", {
      restApi: api,
      contentType: "application/json",
      modelName: "HBARRechargeRequest",
      description: "Request model for HBAR recharge initiation",
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        title: "HBAR Recharge Request",
        properties: {
          xafAmount: {
            type: apigateway.JsonSchemaType.NUMBER,
            minimum: 1000, // Minimum 1000 XAF
            maximum: 1000000, // Maximum 1,000,000 XAF
            description: "Amount in XAF to convert to HBAR",
          },
          userHederaAccountId: {
            type: apigateway.JsonSchemaType.STRING,
            pattern: "^0\\.0\\.[0-9]+$", // Hedera account ID pattern
            description: "Target Hedera account ID for HBAR transfer",
          },
          pin: {
            type: apigateway.JsonSchemaType.STRING,
            minLength: 4,
            maxLength: 6,
            pattern: "^[0-9]{4,6}$",
            description: "Orange Money PIN for payment authorization",
          },
        },
        required: ["xafAmount", "userHederaAccountId", "pin"],
        additionalProperties: false,
      },
    });
  }

  private createRechargeResponseModel(
    api: apigateway.RestApi
  ): apigateway.Model {
    return new apigateway.Model(this, "RechargeResponseModel", {
      restApi: api,
      contentType: "application/json",
      modelName: "HBARRechargeResponse",
      description: "Response model for HBAR recharge operations",
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        title: "HBAR Recharge Response",
        properties: {
          success: {
            type: apigateway.JsonSchemaType.BOOLEAN,
            description: "Indicates if the operation was successful",
          },
          data: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              transactionId: {
                type: apigateway.JsonSchemaType.STRING,
                description: "Unique transaction identifier",
              },
              xafAmount: {
                type: apigateway.JsonSchemaType.NUMBER,
                description: "Amount in XAF being converted",
              },
              estimatedHBARAmount: {
                type: apigateway.JsonSchemaType.NUMBER,
                description: "Estimated HBAR amount to receive",
              },
              conversionRate: {
                type: apigateway.JsonSchemaType.NUMBER,
                description: "XAF to HBAR exchange rate used",
              },
              fees: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                  orangeMoneyFee: {
                    type: apigateway.JsonSchemaType.NUMBER,
                    description: "Orange Money transaction fee",
                  },
                  platformFee: {
                    type: apigateway.JsonSchemaType.NUMBER,
                    description: "Platform service fee",
                  },
                  totalFees: {
                    type: apigateway.JsonSchemaType.NUMBER,
                    description: "Total fees charged",
                  },
                },
                required: ["orangeMoneyFee", "platformFee", "totalFees"],
              },
              status: {
                type: apigateway.JsonSchemaType.STRING,
                enum: [
                  "payment_initiated",
                  "payment_confirmed",
                  "processing",
                  "completed",
                  "failed",
                ],
                description: "Current transaction status",
              },
              createdAt: {
                type: apigateway.JsonSchemaType.STRING,
                format: "date-time",
                description: "Transaction creation timestamp",
              },
            },
            required: [
              "transactionId",
              "xafAmount",
              "estimatedHBARAmount",
              "conversionRate",
              "fees",
              "status",
              "createdAt",
            ],
          },
        },
        required: ["success", "data"],
        additionalProperties: false,
      },
    });
  }

  private createErrorResponseModel(api: apigateway.RestApi): apigateway.Model {
    return new apigateway.Model(this, "ErrorResponseModel", {
      restApi: api,
      contentType: "application/json",
      modelName: "HBARRechargeError",
      description: "Error response model for HBAR recharge operations",
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        title: "HBAR Recharge Error Response",
        properties: {
          success: {
            type: apigateway.JsonSchemaType.BOOLEAN,
            enum: [false],
            description: "Always false for error responses",
          },
          error: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              code: {
                type: apigateway.JsonSchemaType.STRING,
                description: "Error code for programmatic handling",
              },
              message: {
                type: apigateway.JsonSchemaType.STRING,
                description: "Human-readable error message",
              },
              details: {
                type: apigateway.JsonSchemaType.OBJECT,
                description: "Additional error details",
              },
            },
            required: ["code", "message"],
          },
          requestId: {
            type: apigateway.JsonSchemaType.STRING,
            description: "Request identifier for debugging",
          },
        },
        required: ["success", "error"],
        additionalProperties: false,
      },
    });
  }

  private createTransactionListResponseModel(
    api: apigateway.RestApi
  ): apigateway.Model {
    return new apigateway.Model(this, "TransactionListResponseModel", {
      restApi: api,
      contentType: "application/json",
      modelName: "HBARTransactionList",
      description: "Response model for transaction list queries",
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        title: "HBAR Transaction List Response",
        properties: {
          success: {
            type: apigateway.JsonSchemaType.BOOLEAN,
            description: "Indicates if the operation was successful",
          },
          data: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              transactions: {
                type: apigateway.JsonSchemaType.ARRAY,
                items: {
                  type: apigateway.JsonSchemaType.OBJECT,
                  properties: {
                    transactionId: {
                      type: apigateway.JsonSchemaType.STRING,
                    },
                    xafAmount: {
                      type: apigateway.JsonSchemaType.NUMBER,
                    },
                    hbarAmount: {
                      type: apigateway.JsonSchemaType.NUMBER,
                    },
                    status: {
                      type: apigateway.JsonSchemaType.STRING,
                    },
                    createdAt: {
                      type: apigateway.JsonSchemaType.STRING,
                      format: "date-time",
                    },
                    completedAt: {
                      type: apigateway.JsonSchemaType.STRING,
                      format: "date-time",
                    },
                  },
                  required: [
                    "transactionId",
                    "xafAmount",
                    "status",
                    "createdAt",
                  ],
                },
              },
              pagination: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                  limit: {
                    type: apigateway.JsonSchemaType.NUMBER,
                  },
                  exclusiveStartKey: {
                    type: apigateway.JsonSchemaType.STRING,
                  },
                  hasMore: {
                    type: apigateway.JsonSchemaType.BOOLEAN,
                  },
                },
              },
            },
            required: ["transactions"],
          },
        },
        required: ["success", "data"],
        additionalProperties: false,
      },
    });
  }

  private createTransactionDetailResponseModel(
    api: apigateway.RestApi
  ): apigateway.Model {
    return new apigateway.Model(this, "TransactionDetailResponseModel", {
      restApi: api,
      contentType: "application/json",
      modelName: "HBARTransactionDetail",
      description: "Response model for individual transaction queries",
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        title: "HBAR Transaction Detail Response",
        properties: {
          success: {
            type: apigateway.JsonSchemaType.BOOLEAN,
            description: "Indicates if the operation was successful",
          },
          data: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              transactionId: {
                type: apigateway.JsonSchemaType.STRING,
              },
              userId: {
                type: apigateway.JsonSchemaType.STRING,
              },
              userHederaAccountId: {
                type: apigateway.JsonSchemaType.STRING,
              },
              xafAmount: {
                type: apigateway.JsonSchemaType.NUMBER,
              },
              hbarAmount: {
                type: apigateway.JsonSchemaType.NUMBER,
              },
              exchangeRate: {
                type: apigateway.JsonSchemaType.NUMBER,
              },
              fees: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                  orangeMoneyFee: {
                    type: apigateway.JsonSchemaType.NUMBER,
                  },
                  platformFee: {
                    type: apigateway.JsonSchemaType.NUMBER,
                  },
                  totalFees: {
                    type: apigateway.JsonSchemaType.NUMBER,
                  },
                },
              },
              status: {
                type: apigateway.JsonSchemaType.STRING,
              },
              orangeMoneyTransactionId: {
                type: apigateway.JsonSchemaType.STRING,
              },
              hederaTransactionId: {
                type: apigateway.JsonSchemaType.STRING,
              },
              createdAt: {
                type: apigateway.JsonSchemaType.STRING,
                format: "date-time",
              },
              updatedAt: {
                type: apigateway.JsonSchemaType.STRING,
                format: "date-time",
              },
              completedAt: {
                type: apigateway.JsonSchemaType.STRING,
                format: "date-time",
              },
              errorMessage: {
                type: apigateway.JsonSchemaType.STRING,
              },
            },
            required: [
              "transactionId",
              "userId",
              "userHederaAccountId",
              "xafAmount",
              "status",
              "createdAt",
              "updatedAt",
            ],
          },
        },
        required: ["success", "data"],
        additionalProperties: false,
      },
    });
  }

  private createUsagePlan(api: apigateway.RestApi, environment: string): void {
    // Create API key for monitoring and additional rate limiting
    const apiKey = new apigateway.ApiKey(this, "HBARRechargeApiKey", {
      apiKeyName: `sachain-hbar-recharge-key-${environment}`,
      description:
        "API key for HBAR recharge system monitoring and rate limiting",
    });

    // Create usage plan with rate limiting and quotas
    const usagePlan = new apigateway.UsagePlan(this, "HBARRechargeUsagePlan", {
      name: `sachain-hbar-recharge-usage-plan-${environment}`,
      description: "Usage plan for HBAR recharge API endpoints",
      throttle: {
        rateLimit: 1000, // requests per second across all users
        burstLimit: 2000, // burst capacity
      },
      quota: {
        limit: 100000, // requests per period
        period: apigateway.Period.DAY,
      },
      apiStages: [
        {
          api: api,
          stage: api.deploymentStage,
        },
      ],
    });

    // Associate API key with usage plan
    usagePlan.addApiKey(apiKey);

    // Export API key for monitoring tools
    new cdk.CfnOutput(this, "HBARRechargeApiKeyId", {
      value: apiKey.keyId,
      description: "HBAR Recharge API Key ID",
      exportName: `${environment}-sachain-hbar-recharge-api-key-id`,
    });

    // Export usage plan ID
    new cdk.CfnOutput(this, "HBARRechargeUsagePlanId", {
      value: usagePlan.usagePlanId,
      description: "HBAR Recharge Usage Plan ID",
      exportName: `${environment}-sachain-hbar-recharge-usage-plan-id`,
    });
  }

  private createStackOutputs(environment: string): void {
    // Export recharge table name
    new cdk.CfnOutput(this, "RechargeTableName", {
      value: this.rechargeTable.tableName,
      description: "HBAR Recharge DynamoDB Table Name",
      exportName: `${environment}-sachain-hbar-recharge-table-name`,
    });

    // Export recharge table ARN
    new cdk.CfnOutput(this, "RechargeTableArn", {
      value: this.rechargeTable.tableArn,
      description: "HBAR Recharge DynamoDB Table ARN",
      exportName: `${environment}-sachain-hbar-recharge-table-arn`,
    });

    // Export recharge handler Lambda ARN
    new cdk.CfnOutput(this, "RechargeHandlerArn", {
      value: this.rechargeHandlerLambda.functionArn,
      description: "HBAR Recharge Handler Lambda ARN",
      exportName: `${environment}-sachain-hbar-recharge-handler-arn`,
    });

    // Export conversion handler Lambda ARN
    new cdk.CfnOutput(this, "ConversionHandlerArn", {
      value: this.conversionHandlerLambda.functionArn,
      description: "HBAR Conversion Handler Lambda ARN",
      exportName: `${environment}-sachain-hbar-conversion-handler-arn`,
    });

    // Export recharge event bus ARN
    new cdk.CfnOutput(this, "RechargeEventBusArn", {
      value: this.rechargeEventBus.eventBusArn,
      description: "HBAR Recharge EventBridge Bus ARN",
      exportName: `${environment}-sachain-hbar-recharge-event-bus-arn`,
    });

    // Export recharge event bus name
    new cdk.CfnOutput(this, "RechargeEventBusName", {
      value: this.rechargeEventBus.eventBusName,
      description: "HBAR Recharge EventBridge Bus Name",
      exportName: `${environment}-sachain-hbar-recharge-event-bus-name`,
    });

    // Export dashboard URL
    new cdk.CfnOutput(this, "RechargeDashboardUrl", {
      value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards:name=${this.hbarRechargeConstruct.dashboard.dashboardName}`,
      description: "HBAR Recharge CloudWatch Dashboard URL",
    });

    // Export alarm names for monitoring integration
    const alarmNames = this.hbarRechargeConstruct.alarms
      .map((alarm) => alarm.alarmName)
      .join(",");
    new cdk.CfnOutput(this, "RechargeAlarmNames", {
      value: alarmNames,
      description: "HBAR Recharge CloudWatch Alarm Names",
      exportName: `${environment}-sachain-hbar-recharge-alarm-names`,
    });
  }
}
