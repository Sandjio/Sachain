import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index";
import { ProjectRepository } from "../../../repositories/project-repository";

// Mock dependencies
jest.mock("../../../repositories/project-repository");
jest.mock("../../../utils/jwt-utils");

const mockProjectRepository = ProjectRepository as jest.MockedClass<
  typeof ProjectRepository
>;

// Mock JWT utils
const mockExtractUserIdFromToken = require("../../../utils/jwt-utils")
  .extractUserIdFromToken as jest.MockedFunction<any>;

// Helper function to handle callback-based handler
const callHandler = async (event: APIGatewayProxyEvent, context: Context) => {
  return new Promise((resolve) => {
    handler(event, context, (error, result) => {
      resolve(result);
    });
  }) as any;
};

describe("Stock Minting Status API Integration Tests", () => {
  let mockContext: Context;
  let mockProjectRepo: jest.Mocked<ProjectRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "stock-minting-status",
      functionVersion: "1",
      invokedFunctionArn:
        "arn:aws:lambda:us-east-1:123456789012:function:stock-minting-status",
      memoryLimitInMB: "512",
      awsRequestId: "test-request-id",
      logGroupName: "/aws/lambda/stock-minting-status",
      logStreamName: "2024/01/15/[$LATEST]test-stream",
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    // Setup mocks
    mockProjectRepo = {
      getProject: jest.fn(),
      getProjectStats: jest.fn(),
      getHederaTransactions: jest.fn(),
    } as any;

    mockProjectRepository.mockImplementation(() => mockProjectRepo);

    // Setup environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.AWS_REGION = "us-east-1";
  });

  describe("GET /projects/{projectId}/mint-stocks/status", () => {
    const createMockEvent = (
      projectId: string,
      authToken?: string
    ): APIGatewayProxyEvent => ({
      httpMethod: "GET",
      path: `/projects/${projectId}/mint-stocks/status`,
      pathParameters: { projectId },
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken || "Bearer valid-token",
        "User-Agent": "test-client/1.0",
      },
      body: null,
      isBase64Encoded: false,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      requestContext: {
        requestId: "test-request-123",
        stage: "test",
        resourceId: "resource-id",
        resourcePath: "/projects/{projectId}/mint-stocks/status",
        httpMethod: "GET",
        requestTime: "15/Jan/2024:14:30:00 +0000",
        requestTimeEpoch: 1705329000,
        path: `/projects/${projectId}/mint-stocks/status`,
        accountId: "123456789012",
        protocol: "HTTP/1.1",
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: "127.0.0.1",
          user: null,
          userAgent: "test-client/1.0",
          userArn: null,
          clientCert: null,
        },
        apiId: "test-api-id",
        domainName: "test-domain",
        domainPrefix: "test",
      },
      resource: "/projects/{projectId}/mint-stocks/status",
      stageVariables: null,
      multiValueHeaders: {},
    });

    const mockProject = {
      PK: "PROJECT#proj-123",
      SK: "METADATA",
      projectId: "proj-123",
      entrepreneurId: "user-456",
      name: "Test Project",
      description: "A test project for minting",
      category: "Technology",
      stockSupply: 1000,
      status: "draft",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
      GSI3PK: "PROJECT_STATUS#draft",
      GSI3SK: "2024-01-15T10:00:00Z",
    };

    it("should return draft status for project not yet minted", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      const event = createMockEvent("proj-123");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.projectId).toBe("proj-123");
      expect(responseBody.status).toBe("draft");
      expect(responseBody.progress.completed).toBe(0);
      expect(responseBody.progress.total).toBe(1000);
      expect(responseBody.progress.percentage).toBe(0);
      expect(responseBody.progress.status).toBe("in_progress");
    });

    it("should return minting status with progress for project being minted", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      const mintingProject = { ...mockProject, status: "minting" };
      mockProjectRepo.getProject.mockResolvedValue(mintingProject);

      const mockStats = {
        PK: "PROJECT#proj-123",
        SK: "STATS",
        projectId: "proj-123",
        totalStocks: 1000,
        mintedStocks: 500,
        availableStocks: 500,
        soldStocks: 0,
        totalRaised: 0,
        lastUpdated: "2024-01-15T14:30:00Z",
      };

      const mockTransactions = [
        {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#0.0.123456@1234567890.123456789",
          projectId: "proj-123",
          transactionId: "0.0.123456@1234567890.123456789",
          transactionType: "token_creation",
          status: "success",
          timestamp: "2024-01-15T14:00:00Z",
        },
        {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#0.0.123456@1234567891.123456789",
          projectId: "proj-123",
          transactionId: "0.0.123456@1234567891.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T14:15:00Z",
        },
        {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#0.0.123456@1234567892.123456789",
          projectId: "proj-123",
          transactionId: "0.0.123456@1234567892.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T14:20:00Z",
        },
      ];

      mockProjectRepo.getProjectStats.mockResolvedValue(mockStats);
      mockProjectRepo.getHederaTransactions.mockResolvedValue(mockTransactions);

      const event = createMockEvent("proj-123");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.projectId).toBe("proj-123");
      expect(responseBody.status).toBe("minting");
      expect(responseBody.progress.completed).toBe(500);
      expect(responseBody.progress.total).toBe(1000);
      expect(responseBody.progress.percentage).toBe(50);
      expect(responseBody.progress.status).toBe("in_progress");
      expect(responseBody.tokenId).toBe("0.0.123456@1234567890.123456789");
      expect(responseBody.startedAt).toBe("2024-01-15T14:00:00Z");
      expect(responseBody.estimatedCompletion).toBeDefined();
    });

    it("should return completed status for active project", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      const activeProject = { ...mockProject, status: "active" };
      mockProjectRepo.getProject.mockResolvedValue(activeProject);

      const mockStats = {
        PK: "PROJECT#proj-123",
        SK: "STATS",
        projectId: "proj-123",
        totalStocks: 1000,
        mintedStocks: 1000,
        availableStocks: 1000,
        soldStocks: 0,
        totalRaised: 0,
        lastUpdated: "2024-01-15T15:00:00Z",
      };

      const mockTransactions = [
        {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#0.0.123456@1234567890.123456789",
          projectId: "proj-123",
          transactionId: "0.0.123456@1234567890.123456789",
          transactionType: "token_creation",
          status: "success",
          timestamp: "2024-01-15T14:00:00Z",
        },
        {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#0.0.123456@1234567891.123456789",
          projectId: "proj-123",
          transactionId: "0.0.123456@1234567891.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T14:45:00Z",
        },
        {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#0.0.123456@1234567892.123456789",
          projectId: "proj-123",
          transactionId: "0.0.123456@1234567892.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T15:00:00Z",
        },
      ];

      mockProjectRepo.getProjectStats.mockResolvedValue(mockStats);
      mockProjectRepo.getHederaTransactions.mockResolvedValue(mockTransactions);

      const event = createMockEvent("proj-123");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.projectId).toBe("proj-123");
      expect(responseBody.status).toBe("active");
      expect(responseBody.progress.completed).toBe(1000);
      expect(responseBody.progress.total).toBe(1000);
      expect(responseBody.progress.percentage).toBe(100);
      expect(responseBody.progress.status).toBe("completed");
      expect(responseBody.tokenId).toBe("0.0.123456@1234567890.123456789");
      expect(responseBody.totalMinted).toBe(1000);
      expect(responseBody.mintingBatches).toBe(2);
      expect(responseBody.transactionIds).toHaveLength(2);
      expect(responseBody.startedAt).toBe("2024-01-15T14:00:00Z");
      expect(responseBody.completedAt).toBe("2024-01-15T15:00:00Z");
    });

    it("should return 401 for invalid authentication", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const event = createMockEvent("proj-123");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(401);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Authentication failed");
    });

    it("should return 400 for missing project ID", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      const event = createMockEvent("");
      event.pathParameters = null;

      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(400);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Project ID is required");
    });

    it("should return 404 for non-existent project", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockResolvedValue(null);

      const event = createMockEvent("proj-nonexistent");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(404);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Project not found");
      expect(responseBody.code).toBe("PROJECT_NOT_FOUND");
    });

    it("should return 403 for unauthorized access", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-different",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      const event = createMockEvent("proj-123");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(403);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "You are not authorized to view minting status for this project"
      );
      expect(responseBody.code).toBe("UNAUTHORIZED_ACCESS");
    });

    it("should handle database errors gracefully", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockRejectedValue(
        new Error("Database connection failed")
      );

      const event = createMockEvent("proj-123");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Unable to validate project access at this time"
      );
      expect(responseBody.code).toBe("DATABASE_ERROR");
    });

    it("should handle missing stats gracefully", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      const mintingProject = { ...mockProject, status: "minting" };
      mockProjectRepo.getProject.mockResolvedValue(mintingProject);

      // No stats available
      mockProjectRepo.getProjectStats.mockResolvedValue(null);
      mockProjectRepo.getHederaTransactions.mockResolvedValue([]);

      const event = createMockEvent("proj-123");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.projectId).toBe("proj-123");
      expect(responseBody.status).toBe("minting");
      expect(responseBody.progress.completed).toBe(0);
      expect(responseBody.progress.total).toBe(0);
      expect(responseBody.progress.percentage).toBe(0);
    });

    it("should calculate progress correctly with partial minting", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      const mintingProject = {
        ...mockProject,
        status: "minting",
        stockSupply: 250,
      };
      mockProjectRepo.getProject.mockResolvedValue(mintingProject);

      const mockStats = {
        PK: "PROJECT#proj-123",
        SK: "STATS",
        projectId: "proj-123",
        totalStocks: 250,
        mintedStocks: 150, // 3 batches of 50 completed
        availableStocks: 150,
        soldStocks: 0,
        totalRaised: 0,
        lastUpdated: "2024-01-15T14:30:00Z",
      };

      const mockTransactions = [
        {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#0.0.123456@1234567890.123456789",
          projectId: "proj-123",
          transactionId: "0.0.123456@1234567890.123456789",
          transactionType: "token_creation",
          status: "success",
          timestamp: "2024-01-15T14:00:00Z",
        },
        {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#0.0.123456@1234567891.123456789",
          projectId: "proj-123",
          transactionId: "0.0.123456@1234567891.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T14:10:00Z",
        },
        {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#0.0.123456@1234567892.123456789",
          projectId: "proj-123",
          transactionId: "0.0.123456@1234567892.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T14:20:00Z",
        },
        {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#0.0.123456@1234567893.123456789",
          projectId: "proj-123",
          transactionId: "0.0.123456@1234567893.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T14:30:00Z",
        },
      ];

      mockProjectRepo.getProjectStats.mockResolvedValue(mockStats);
      mockProjectRepo.getHederaTransactions.mockResolvedValue(mockTransactions);

      const event = createMockEvent("proj-123");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.progress.completed).toBe(150);
      expect(responseBody.progress.total).toBe(250);
      expect(responseBody.progress.percentage).toBe(60); // 150/250 * 100
      expect(responseBody.progress.currentBatch).toBe(4); // 3 completed + 1 current
      expect(responseBody.progress.totalBatches).toBe(5); // ceil(250/50)
    });

    it("should handle unknown project status", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      const unknownStatusProject = { ...mockProject, status: "unknown" };
      mockProjectRepo.getProject.mockResolvedValue(unknownStatusProject);

      const event = createMockEvent("proj-123");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(422);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Unknown project status: unknown");
      expect(responseBody.code).toBe("INVALID_PROJECT_STATUS");
    });
  });

  describe("Performance and Caching", () => {
    const createMockEvent = (
      projectId: string,
      authToken?: string
    ): APIGatewayProxyEvent => ({
      httpMethod: "GET",
      path: `/projects/${projectId}/mint-stocks/status`,
      pathParameters: { projectId },
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken || "Bearer valid-token",
        "User-Agent": "test-client/1.0",
      },
      body: null,
      isBase64Encoded: false,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      requestContext: {
        requestId: "test-request-123",
        stage: "test",
        resourceId: "resource-id",
        resourcePath: "/projects/{projectId}/mint-stocks/status",
        httpMethod: "GET",
        requestTime: "15/Jan/2024:14:30:00 +0000",
        requestTimeEpoch: 1705329000,
        path: `/projects/${projectId}/mint-stocks/status`,
        accountId: "123456789012",
        protocol: "HTTP/1.1",
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: "127.0.0.1",
          user: null,
          userAgent: "test-client/1.0",
          userArn: null,
          clientCert: null,
        },
        apiId: "test-api-id",
        domainName: "test-domain",
        domainPrefix: "test",
      },
      resource: "/projects/{projectId}/mint-stocks/status",
      stageVariables: null,
      multiValueHeaders: {},
    });

    const mockProject = {
      PK: "PROJECT#proj-123",
      SK: "METADATA",
      projectId: "proj-123",
      entrepreneurId: "user-456",
      name: "Test Project",
      description: "A test project for minting",
      category: "Technology",
      stockSupply: 1000,
      status: "draft",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
      GSI3PK: "PROJECT_STATUS#draft",
      GSI3SK: "2024-01-15T10:00:00Z",
    };

    it("should complete requests within reasonable time", async () => {
      const startTime = Date.now();

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      const event = createMockEvent("proj-123");
      const result = await callHandler(event, mockContext);

      const duration = Date.now() - startTime;

      expect(result.statusCode).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should handle concurrent requests", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      const event = createMockEvent("proj-123");

      // Simulate concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        callHandler(event, mockContext)
      );
      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach((result) => {
        expect(result.statusCode).toBe(200);
      });
    });
  });

  describe("Error Recovery", () => {
    const createMockEvent = (
      projectId: string,
      authToken?: string
    ): APIGatewayProxyEvent => ({
      httpMethod: "GET",
      path: `/projects/${projectId}/mint-stocks/status`,
      pathParameters: { projectId },
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken || "Bearer valid-token",
        "User-Agent": "test-client/1.0",
      },
      body: null,
      isBase64Encoded: false,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      requestContext: {
        requestId: "test-request-123",
        stage: "test",
        resourceId: "resource-id",
        resourcePath: "/projects/{projectId}/mint-stocks/status",
        httpMethod: "GET",
        requestTime: "15/Jan/2024:14:30:00 +0000",
        requestTimeEpoch: 1705329000,
        path: `/projects/${projectId}/mint-stocks/status`,
        accountId: "123456789012",
        protocol: "HTTP/1.1",
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: "127.0.0.1",
          user: null,
          userAgent: "test-client/1.0",
          userArn: null,
          clientCert: null,
        },
        apiId: "test-api-id",
        domainName: "test-domain",
        domainPrefix: "test",
      },
      resource: "/projects/{projectId}/mint-stocks/status",
      stageVariables: null,
      multiValueHeaders: {},
    });

    const mockProject = {
      PK: "PROJECT#proj-123",
      SK: "METADATA",
      projectId: "proj-123",
      entrepreneurId: "user-456",
      name: "Test Project",
      description: "A test project for minting",
      category: "Technology",
      stockSupply: 1000,
      status: "draft",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
      GSI3PK: "PROJECT_STATUS#draft",
      GSI3SK: "2024-01-15T10:00:00Z",
    };

    it("should recover from transient database errors", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      // First call fails, second succeeds
      mockProjectRepo.getProject
        .mockRejectedValueOnce(new Error("Temporary database error"))
        .mockResolvedValueOnce(mockProject);

      const event = createMockEvent("proj-123");

      // First request should fail
      const result1 = await callHandler(event, mockContext);
      expect(result1.statusCode).toBe(503);

      // Second request should succeed
      const result2 = await callHandler(event, mockContext);
      expect(result2.statusCode).toBe(200);
    });
  });
});
