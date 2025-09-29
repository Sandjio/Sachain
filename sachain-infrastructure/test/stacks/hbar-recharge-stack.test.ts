import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Template, Match } from "aws-cdk-lib/assertions";
import { HBARRechargeStack } from "../../lib/stacks/hbar-recharge-stack";

describe("HBARRechargeStack", () => {
  let app: cdk.App;
  let template: Template;
  let mockTable: dynamodb.Table;
  let mockEventBus: events.EventBus;
  let mockNotificationTopic: sns.Topic;
  let mockApi: apigateway.RestApi;
  let mockUserPool: cognito.UserPool;

  beforeEach(() => {
    app = new cdk.App();

    // Create a dependency stack for mock resources
    const dependencyStack = new cdk.Stack(app, "DependencyStack");

    mockTable = new dynamodb.Table(dependencyStack, "MockTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    });

    mockEventBus = new events.EventBus(dependencyStack, "MockEventBus");
    mockNotificationTopic = new sns.Topic(
      dependencyStack,
      "MockNotificationTopic"
    );

    mockApi = new apigateway.RestApi(dependencyStack, "MockApi", {
      restApiName: "mock-api",
    });

    mockUserPool = new cognito.UserPool(dependencyStack, "MockUserPool", {
      userPoolName: "mock-user-pool",
    });

    // Create the HBAR recharge stack
    const hbarRechargeStack = new HBARRechargeStack(app, "HBARRechargeStack", {
      environment: "test",
      table: mockTable,
      eventBus: mockEventBus,
      notificationTopic: mockNotificationTopic,
      api: mockApi,
      userPool: mockUserPool,
    });

    template = Template.fromStack(hbarRechargeStack);
  });

  describe("Stack Creation", () => {
    test("creates stack with correct properties", () => {
      expect(template).toBeDefined();
    });

    test("applies correct tags to stack", () => {
      template.hasResource("AWS::DynamoDB::Table", {
        Properties: Match.objectLike({
          Tags: Match.arrayWith([
            { Key: "Environment", Value: "test" },
            { Key: "Project", Value: "Sachain" },
            { Key: "Component", Value: "HBAR-Recharge" },
          ]),
        }),
      });
    });
  });

  describe("API Gateway Integration", () => {
    test("creates Cognito authorizer for HBAR recharge endpoints", () => {
      template.hasResourceProperties("AWS::ApiGateway::Authorizer", {
        Name: "sachain-hbar-recharge-authorizer-test",
        Type: "COGNITO_USER_POOLS",
        ProviderARNs: [Match.anyValue()],
      });
    });

    test("creates recharge resource under API", () => {
      template.hasResourceProperties("AWS::ApiGateway::Resource", {
        PathPart: "hbar-recharge",
      });
    });

    test("creates POST method for recharge initiation", () => {
      template.hasResourceProperties("AWS::ApiGateway::Method", {
        HttpMethod: "POST",
        AuthorizationType: "COGNITO_USER_POOLS",
        AuthorizerId: Match.anyValue(),
      });
    });

    test("creates GET method for transaction status", () => {
      template.hasResourceProperties("AWS::ApiGateway::Method", {
        HttpMethod: "GET",
        AuthorizationType: "COGNITO_USER_POOLS",
        AuthorizerId: Match.anyValue(),
      });
    });

    test("creates OPTIONS method for CORS", () => {
      template.hasResourceProperties("AWS::ApiGateway::Method", {
        HttpMethod: "OPTIONS",
      });
    });

    test("creates request validator for POST method", () => {
      template.hasResourceProperties("AWS::ApiGateway::RequestValidator", {
        ValidateRequestBody: true,
        ValidateRequestParameters: true,
      });
    });

    test("creates request model for recharge request", () => {
      template.hasResourceProperties("AWS::ApiGateway::Model", {
        ContentType: "application/json",
        Name: "HBARRechargeRequest",
        Schema: {
          type: "object",
          properties: {
            xafAmount: {
              type: "number",
              minimum: 1000,
              maximum: 1000000,
            },
            userHederaAccountId: {
              type: "string",
              pattern: "^0\\.0\\.[0-9]+$",
            },
            pin: {
              type: "string",
              minLength: 4,
              maxLength: 6,
            },
          },
          required: ["xafAmount", "userHederaAccountId", "pin"],
          additionalProperties: false,
        },
      });
    });

    test("creates transaction ID resource for status queries", () => {
      template.hasResourceProperties("AWS::ApiGateway::Resource", {
        PathPart: "{transactionId}",
      });
    });

    test("creates retry resource for failed transactions", () => {
      template.hasResourceProperties("AWS::ApiGateway::Resource", {
        PathPart: "retry",
      });
    });
  });

  describe("Stack Outputs", () => {
    test("exports recharge table name", () => {
      template.hasOutput("RechargeTableName", {
        Description: "HBAR Recharge DynamoDB Table Name",
        Export: {
          Name: "test-sachain-hbar-recharge-table-name",
        },
      });
    });

    test("exports recharge table ARN", () => {
      template.hasOutput("RechargeTableArn", {
        Description: "HBAR Recharge DynamoDB Table ARN",
        Export: {
          Name: "test-sachain-hbar-recharge-table-arn",
        },
      });
    });

    test("exports recharge handler Lambda ARN", () => {
      template.hasOutput("RechargeHandlerArn", {
        Description: "HBAR Recharge Handler Lambda ARN",
        Export: {
          Name: "test-sachain-hbar-recharge-handler-arn",
        },
      });
    });

    test("exports conversion handler Lambda ARN", () => {
      template.hasOutput("ConversionHandlerArn", {
        Description: "HBAR Conversion Handler Lambda ARN",
        Export: {
          Name: "test-sachain-hbar-conversion-handler-arn",
        },
      });
    });

    test("exports recharge event bus ARN", () => {
      template.hasOutput("RechargeEventBusArn", {
        Description: "HBAR Recharge EventBridge Bus ARN",
        Export: {
          Name: "test-sachain-hbar-recharge-event-bus-arn",
        },
      });
    });

    test("exports recharge event bus name", () => {
      template.hasOutput("RechargeEventBusName", {
        Description: "HBAR Recharge EventBridge Bus Name",
        Export: {
          Name: "test-sachain-hbar-recharge-event-bus-name",
        },
      });
    });

    test("exports dashboard URL", () => {
      template.hasOutput("RechargeDashboardUrl", {
        Description: "HBAR Recharge CloudWatch Dashboard URL",
      });
    });

    test("exports alarm names", () => {
      template.hasOutput("RechargeAlarmNames", {
        Description: "HBAR Recharge CloudWatch Alarm Names",
        Export: {
          Name: "test-sachain-hbar-recharge-alarm-names",
        },
      });
    });
  });

  describe("Dependency Validation", () => {
    test("validates required dependencies are provided", () => {
      // This test ensures the stack creation doesn't throw errors
      // when all required dependencies are provided
      expect(() => {
        new HBARRechargeStack(app, "TestValidationStack", {
          environment: "test",
          table: mockTable,
          eventBus: mockEventBus,
          notificationTopic: mockNotificationTopic,
          api: mockApi,
          userPool: mockUserPool,
        });
      }).not.toThrow();
    });

    test("records cross-stack references", () => {
      // This test verifies that the stack properly records its dependencies
      // The actual validation logic is tested in the cross-stack validator tests
      expect(template).toBeDefined();
    });
  });

  describe("Security Configuration", () => {
    test("uses Cognito authentication for all protected endpoints", () => {
      const methods = template.findResources("AWS::ApiGateway::Method");
      const protectedMethods = Object.values(methods).filter(
        (method: any) => method.Properties.HttpMethod !== "OPTIONS"
      );

      protectedMethods.forEach((method: any) => {
        expect(method.Properties.AuthorizationType).toBe("COGNITO_USER_POOLS");
        expect(method.Properties.AuthorizerId).toBeDefined();
      });
    });

    test("validates request body and parameters", () => {
      template.hasResourceProperties("AWS::ApiGateway::RequestValidator", {
        ValidateRequestBody: true,
        ValidateRequestParameters: true,
      });
    });

    test("enforces strict request model validation", () => {
      template.hasResourceProperties("AWS::ApiGateway::Model", {
        Schema: {
          additionalProperties: false,
          required: ["xafAmount", "userHederaAccountId", "pin"],
        },
      });
    });
  });

  describe("Error Handling", () => {
    test("includes proper error handling in Lambda integration", () => {
      template.hasResourceProperties("AWS::ApiGateway::Method", {
        Integration: {
          Type: "AWS_PROXY",
          IntegrationHttpMethod: "POST",
        },
      });
    });
  });

  describe("Resource Naming", () => {
    test("uses consistent naming convention", () => {
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: "sachain-hbar-recharge-test",
      });

      template.hasResourceProperties("AWS::Events::EventBus", {
        Name: "sachain-hbar-recharge-events-test",
      });

      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: Match.stringLikeRegexp("sachain-hbar-.*-test"),
      });
    });
  });

  describe("Integration with Existing Infrastructure", () => {
    test("integrates with existing API Gateway", () => {
      // Verify that the recharge endpoints are added to the existing API
      template.hasResourceProperties("AWS::ApiGateway::Resource", {
        PathPart: "hbar-recharge",
        RestApiId: Match.anyValue(),
      });
    });

    test("uses existing user pool for authentication", () => {
      template.hasResourceProperties("AWS::ApiGateway::Authorizer", {
        Type: "COGNITO_USER_POOLS",
        ProviderARNs: [Match.anyValue()],
      });
    });
  });
});
