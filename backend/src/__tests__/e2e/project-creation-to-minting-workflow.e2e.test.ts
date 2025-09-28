import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler as projectCreationHandler } from "../../lambdas/project-creation/index";
import { handler as stockMintingHandler } from "../../lambdas/stock-minting/index";
import { handler as projectQueryHandler } from "../../lambdas/project-query/index";
import { handler as stockQueryHandler } from "../../lambdas/stock-query/index";

// Mock all external dependencies
jest.mock("../../repositories/project-repository");
jest.mock("../../repositories/stock-repository");
jest.mock("../../utils/hedera-service");
jest.mock("../../utils/ipfs-service");
jest.mock("../../utils/s3-direct-upload");
jest.mock("../../utils/event-publisher");
jest.mock("../../utils/jwt-utils");

const mockExtractUserIdFromToken = require("../../utils/jwt-utils").extractUserIdFromToken as jest.MockedFunction<any>;

describe("E2E: Complete Project Creation to Stock Minting Workflow", () => {
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
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET_NAME = "test-bucket";
  });

  const createMockEvent = (method: string, path: string, body?: any, pathParams?: any): APIGatewayProxyEvent => ({
    httpMethod: method,
    path,
    pathParameters: pathParams || null,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    requestContext: {
      requestId: "test-request",
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

  it("should complete full workflow: create project → mint stocks → query results", async () => {
    // Setup authentication
    mockExtractUserIdFromToken.mockReturnValue({
      success: true,
      userId: "user-123",
    });

    // Step 1: Create Project
    const projectData = {
      name: "E2E Test Project",
      description: "A comprehensive test project for end-to-end workflow validation",
      category: "Technology",
      stockSupply: 100,
      targetFundingGoal: 50000,
      pricePerStock: 500,
    };

    const createEvent = createMockEvent("POST", "/projects", projectData);
    const createResult = await projectCreationHandler(createEvent, mockContext);
    
    expect(createResult.statusCode).toBe(201);
    const createdProject = JSON.parse(createResult.body);
    expect(createdProject.projectId).toBeDefined();
    const projectId = createdProject.projectId;

    // Step 2: Query Created Project
    const queryEvent = createMockEvent("GET", `/projects/${projectId}`, null, { projectId });
    const queryResult = await projectQueryHandler(queryEvent, mockContext);
    
    expect(queryResult.statusCode).toBe(200);
    const queriedProject = JSON.parse(queryResult.body);
    expect(queriedProject.name).toBe(projectData.name);
    expect(queriedProject.status).toBe("draft");

    // Step 3: Mint Stocks
    const mintingData = {
      walletAddress: "0.0.123456",
    };

    const mintEvent = createMockEvent("POST", `/projects/${projectId}/mint-stocks`, mintingData, { projectId });
    const mintResult = await stockMintingHandler(mintEvent, mockContext);
    
    expect(mintResult.statusCode).toBe(200);
    const mintingResponse = JSON.parse(mintResult.body);
    expect(mintingResponse.tokenId).toBeDefined();
    expect(mintingResponse.totalMinted).toBe(100);

    // Step 4: Query Minted Stocks
    const stockQueryEvent = createMockEvent("GET", `/projects/${projectId}/stocks`, null, { projectId });
    const stockQueryResult = await stockQueryHandler(stockQueryEvent, mockContext);
    
    expect(stockQueryResult.statusCode).toBe(200);
    const stocks = JSON.parse(stockQueryResult.body);
    expect(stocks.items).toHaveLength(100);
    expect(stocks.items[0].status).toBe("minted");

    // Step 5: Verify Final Project State
    const finalQueryResult = await projectQueryHandler(queryEvent, mockContext);
    expect(finalQueryResult.statusCode).toBe(200);
    const finalProject = JSON.parse(finalQueryResult.body);
    expect(finalProject.status).toBe("active");
  });
});