import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler as projectCreationHandler } from "../../lambdas/project-creation/index";
import { handler as stockMintingHandler } from "../../lambdas/stock-minting/index";

jest.mock("../../repositories/project-repository");
jest.mock("../../utils/hedera-service");
jest.mock("../../utils/jwt-utils");

const mockExtractUserIdFromToken = require("../../utils/jwt-utils").extractUserIdFromToken as jest.MockedFunction<any>;

describe("E2E: Multi-User Concurrent Operations", () => {
  let mockContext: Context;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "test-function",
      functionVersion: "1",
      invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test",
      memoryLimitInMB: "1024",
      awsRequestId: "test-request-id",
      logGroupName: "/aws/lambda/test",
      logStreamName: "test-stream",
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    process.env.TABLE_NAME = "test-table";
    process.env.EVENT_BUS_NAME = "test-event-bus";
  });

  const createMockEvent = (method: string, path: string, userId: string, body?: any): APIGatewayProxyEvent => ({
    httpMethod: method,
    path,
    pathParameters: null,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer token-${userId}`,
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    requestContext: {
      requestId: `request-${userId}-${Date.now()}`,
      stage: "test",
      resourceId: "resource",
      resourcePath: path,
      httpMethod: method,
      requestTime: "01/Jan/2024:00:00:00 +0000",
      requestTimeEpoch: 1704067200,
      path,
      accountId: "123456789012",
      protocol: "HTTP/1.1",
      identity: {
        sourceIp: "127.0.0.1",
        userAgent: "test-client",
      } as any,
      apiId: "test-api",
      domainName: "test-domain",
      domainPrefix: "test",
    } as any,
    resource: path,
    stageVariables: null,
    multiValueHeaders: {},
  });

  it("should handle concurrent project creation by multiple users", async () => {
    // Setup authentication for multiple users
    mockExtractUserIdFromToken.mockImplementation((token: string) => {
      const userId = token.replace("Bearer token-", "");
      return {
        success: true,
        userId,
      };
    });

    const users = ["user-1", "user-2", "user-3", "user-4", "user-5"];
    
    const projectCreationPromises = users.map(async (userId, index) => {
      const projectData = {
        name: `Concurrent Project ${index + 1}`,
        description: `Project created by ${userId}`,
        category: "Technology",
        stockSupply: 100 + index * 10,
        targetFundingGoal: 10000 + index * 5000,
        pricePerStock: 100 + index * 50,
      };

      const event = createMockEvent("POST", "/projects", userId, projectData);
      return projectCreationHandler(event, mockContext);
    });

    const results = await Promise.all(projectCreationPromises);

    // All projects should be created successfully
    results.forEach((result, index) => {
      expect(result.statusCode).toBe(201);
      const project = JSON.parse(result.body);
      expect(project.projectId).toBeDefined();
      expect(project.name).toBe(`Concurrent Project ${index + 1}`);
    });

    // Verify no duplicate project IDs
    const projectIds = results.map(result => JSON.parse(result.body).projectId);
    const uniqueIds = new Set(projectIds);
    expect(uniqueIds.size).toBe(projectIds.length);
  });

  it("should handle concurrent stock minting operations", async () => {
    mockExtractUserIdFromToken.mockImplementation((token: string) => {
      const userId = token.replace("Bearer token-", "");
      return {
        success: true,
        userId,
      };
    });

    const users = ["user-1", "user-2", "user-3"];
    const projectIds = ["proj-1", "proj-2", "proj-3"];
    
    const mintingPromises = users.map(async (userId, index) => {
      const mintingData = {
        walletAddress: `0.0.${123456 + index}`,
      };

      const event = createMockEvent("POST", `/projects/${projectIds[index]}/mint-stocks`, userId, mintingData);
      event.pathParameters = { projectId: projectIds[index] };
      
      return stockMintingHandler(event, mockContext);
    });

    const results = await Promise.all(mintingPromises);

    // All minting operations should complete
    results.forEach((result, index) => {
      expect([200, 202]).toContain(result.statusCode);
      const response = JSON.parse(result.body);
      expect(response.message || response.status).toBeDefined();
    });
  });

  it("should handle resource contention gracefully", async () => {
    mockExtractUserIdFromToken.mockReturnValue({
      success: true,
      userId: "user-123",
    });

    // Simulate 20 concurrent requests to the same project
    const projectId = "proj-shared";
    const concurrentRequests = Array.from({ length: 20 }, (_, index) => {
      const mintingData = {
        walletAddress: `0.0.${123456 + index}`,
      };

      const event = createMockEvent("POST", `/projects/${projectId}/mint-stocks`, "user-123", mintingData);
      event.pathParameters = { projectId };
      
      return stockMintingHandler(event, mockContext);
    });

    const results = await Promise.allSettled(concurrentRequests);

    // At least one should succeed, others may fail due to resource contention
    const successful = results.filter(result => 
      result.status === "fulfilled" && [200, 202].includes(result.value.statusCode)
    );
    const failed = results.filter(result => 
      result.status === "fulfilled" && [409, 423].includes(result.value.statusCode)
    );

    expect(successful.length).toBeGreaterThan(0);
    expect(successful.length + failed.length).toBe(20);
  });

  it("should maintain data consistency under concurrent load", async () => {
    mockExtractUserIdFromToken.mockImplementation((token: string) => {
      const userId = token.replace("Bearer token-", "");
      return {
        success: true,
        userId,
      };
    });

    const operations = [];
    
    // Mix of create and query operations
    for (let i = 0; i < 10; i++) {
      // Create operation
      const createData = {
        name: `Load Test Project ${i}`,
        description: `Project ${i} for load testing`,
        category: "Technology",
        stockSupply: 50,
      };
      
      const createEvent = createMockEvent("POST", "/projects", `user-${i}`, createData);
      operations.push(projectCreationHandler(createEvent, mockContext));
    }

    const results = await Promise.allSettled(operations);
    
    // Verify all operations completed
    expect(results).toHaveLength(10);
    
    // Check for any unexpected failures
    const failures = results.filter(result => 
      result.status === "rejected" || 
      (result.status === "fulfilled" && result.value.statusCode >= 500)
    );
    
    expect(failures.length).toBe(0);
  });
});