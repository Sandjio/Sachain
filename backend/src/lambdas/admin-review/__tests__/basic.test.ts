import { handler } from "../index";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

// Mock all dependencies
jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/lib-dynamodb");
jest.mock("@aws-sdk/client-eventbridge");
jest.mock("@aws-sdk/client-cloudwatch");
jest.mock("../../../repositories/kyc-document-repository");
jest.mock("../../../repositories/user-repository");
jest.mock("../../../repositories/audit-log-repository");
jest.mock("../../../utils/retry", () => ({
  ExponentialBackoff: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockImplementation((fn) => fn()),
  })),
}));
jest.mock("../../../utils/structured-logger", () => ({
  createKYCLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logMetricPublication: jest.fn(),
  }),
}));
jest.mock("../../../utils/error-handler", () => ({
  ErrorClassifier: {
    classify: jest.fn().mockReturnValue({
      category: "ClientError",
      errorCode: "ValidationError",
      httpStatusCode: 400,
      userMessage: "Invalid request",
    }),
  },
}));

// Mock environment variables
process.env.TABLE_NAME = "test-table";
process.env.EVENT_BUS_NAME = "test-event-bus";
process.env.ENVIRONMENT = "test";
process.env.AWS_REGION = "us-east-1";

describe("Admin Review Lambda Basic Tests", () => {
  let mockContext: Context;

  beforeEach(() => {
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "test-function",
      functionVersion: "1",
      invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test-function",
      memoryLimitInMB: "512",
      awsRequestId: "test-request-id",
      logGroupName: "/aws/lambda/test-function",
      logStreamName: "test-stream",
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };
  });

  it("should return 404 for unknown endpoints", async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: "POST",
      path: "/unknown",
      body: "{}",
      headers: {},
      requestContext: {
        requestId: "test-request-id",
        identity: {},
      } as any,
    } as any;

    const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.message).toBe("Endpoint not found");
  });

  it("should handle approve endpoint path", async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: "POST",
      path: "/approve",
      body: JSON.stringify({
        userId: "user-123",
        documentId: "doc-456",
      }),
      headers: {},
      requestContext: {
        requestId: "test-request-id",
        identity: {},
      } as any,
    } as any;

    const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

    // Should not be 404 (endpoint not found)
    expect(result.statusCode).not.toBe(404);
  });

  it("should handle reject endpoint path", async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: "POST",
      path: "/reject",
      body: JSON.stringify({
        userId: "user-123",
        documentId: "doc-456",
        comments: "Test rejection",
      }),
      headers: {},
      requestContext: {
        requestId: "test-request-id",
        identity: {},
      } as any,
    } as any;

    const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

    // Should not be 404 (endpoint not found)
    expect(result.statusCode).not.toBe(404);
  });

  it("should handle documents endpoint path", async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: "GET",
      path: "/documents",
      body: null,
      headers: {},
      queryStringParameters: null,
      requestContext: {
        requestId: "test-request-id",
        identity: {},
      } as any,
    } as any;

    const result = await handler(event, mockContext, jest.fn()) as APIGatewayProxyResult;

    // Should not be 404 (endpoint not found)
    expect(result.statusCode).not.toBe(404);
  });
});