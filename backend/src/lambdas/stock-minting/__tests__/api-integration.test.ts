import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index";
import { ProjectRepository } from "../../../repositories/project-repository";
import { createHederaService } from "../../../utils/hedera-service";
import { defaultIPFSService } from "../../../utils/ipfs-service";
import { EventPublisher } from "../../../utils/event-publisher";

// Mock dependencies
jest.mock("../../../repositories/project-repository");
jest.mock("../../../utils/hedera-service");
jest.mock("../../../utils/ipfs-service");
jest.mock("../../../utils/event-publisher");
jest.mock("../../../utils/jwt-utils");

const mockProjectRepository = ProjectRepository as jest.MockedClass<
  typeof ProjectRepository
>;
const mockHederaService = createHederaService as jest.MockedFunction<
  typeof createHederaService
>;
const mockIPFSService = defaultIPFSService as jest.Mocked<
  typeof defaultIPFSService
>;
const mockEventPublisher = EventPublisher as jest.MockedClass<
  typeof EventPublisher
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

describe("Stock Minting API Integration Tests", () => {
  let mockContext: Context;
  let mockProjectRepo: jest.Mocked<ProjectRepository>;
  let mockHedera: any;
  let mockEventPub: jest.Mocked<EventPublisher>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "stock-minting",
      functionVersion: "1",
      invokedFunctionArn:
        "arn:aws:lambda:us-east-1:123456789012:function:stock-minting",
      memoryLimitInMB: "512",
      awsRequestId: "test-request-id",
      logGroupName: "/aws/lambda/stock-minting",
      logStreamName: "2024/01/15/[$LATEST]test-stream",
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    // Setup mocks
    mockProjectRepo = {
      getProject: jest.fn(),
      updateProject: jest.fn(),
      createHederaTransaction: jest.fn(),
      updateHederaTransaction: jest.fn(),
      updateProjectStats: jest.fn(),
      createStockNFT: jest.fn(),
    } as any;

    mockHedera = {
      calculateGasFees: jest.fn(),
      validateWallet: jest.fn(),
      createToken: jest.fn(),
      mintNFTs: jest.fn(),
    };

    mockEventPub = {
      publishEvent: jest.fn(),
    } as any;

    mockProjectRepository.mockImplementation(() => mockProjectRepo);
    mockHederaService.mockReturnValue(mockHedera);
    mockEventPublisher.mockImplementation(() => mockEventPub);

    // Setup environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.EVENT_BUS_NAME = "test-event-bus";
    process.env.AWS_REGION = "us-east-1";
    process.env.FRONTEND_URL = "https://test.sachain.io";
  });

  describe("POST /projects/{projectId}/mint-stocks", () => {
    const createMockEvent = (
      projectId: string,
      body: any,
      authToken?: string
    ): APIGatewayProxyEvent => ({
      httpMethod: "POST",
      path: `/projects/${projectId}/mint-stocks`,
      pathParameters: { projectId },
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken || "Bearer valid-token",
        "User-Agent": "test-client/1.0",
      },
      body: JSON.stringify(body),
      isBase64Encoded: false,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      requestContext: {
        requestId: "test-request-123",
        stage: "test",
        resourceId: "resource-id",
        resourcePath: "/projects/{projectId}/mint-stocks",
        httpMethod: "POST",
        requestTime: "15/Jan/2024:14:30:00 +0000",
        requestTimeEpoch: 1705329000,
        path: `/projects/${projectId}/mint-stocks`,
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
      resource: "/projects/{projectId}/mint-stocks",
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
      coverImageUrl: "https://example.com/image.jpg",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
      GSI3PK: "PROJECT_STATUS#draft",
      GSI3SK: "2024-01-15T10:00:00Z",
    };

    it("should successfully mint stocks for valid project", async () => {
      // Setup mocks
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      mockHedera.calculateGasFees.mockResolvedValue({
        totalEstimate: "10.0",
      });

      mockHedera.validateWallet.mockResolvedValue({
        isValid: true,
        canAffordOperation: true,
        balance: "100.0",
        estimatedGasFee: "10.0",
      });

      mockHedera.createToken.mockResolvedValue({
        tokenId: "0.0.123456",
        transactionId: "0.0.123456@1234567890.123456789",
        totalCost: "5.0",
      });

      mockHedera.mintNFTs.mockResolvedValue({
        serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
        transactionId: "0.0.123456@1234567891.123456789",
        totalCost: "2.5",
      });

      mockIPFSService.storeProjectMetadata.mockResolvedValue({
        hash: "QmTest123",
        uri: "ipfs://QmTest123",
        size: 1024,
      });

      mockIPFSService.storeStockMetadata.mockResolvedValue({
        hash: "QmStock123",
        uri: "ipfs://QmStock123",
        size: 512,
      });

      mockProjectRepo.createHederaTransaction.mockResolvedValue({} as any);
      mockProjectRepo.updateHederaTransaction.mockResolvedValue();
      mockProjectRepo.updateProject.mockResolvedValue();
      mockProjectRepo.updateProjectStats.mockResolvedValue();
      mockProjectRepo.createStockNFT.mockResolvedValue();

      mockEventPub.publishEvent.mockResolvedValue();

      // Execute test
      const event = createMockEvent("proj-123", {
        walletAddress: "0.0.789012",
      });

      const result = await callHandler(event, mockContext);

      // Verify response
      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Stock minting completed successfully");
      expect(responseBody.tokenId).toBe("0.0.123456");
      expect(responseBody.totalMinted).toBe(1000);
      expect(responseBody.progress.status).toBe("completed");
      expect(responseBody.progress.percentage).toBe(100);

      // Verify repository calls
      expect(mockProjectRepo.getProject).toHaveBeenCalledWith("proj-123");
      expect(mockProjectRepo.updateProject).toHaveBeenCalledWith({
        projectId: "proj-123",
        status: "minting",
      });
      expect(mockProjectRepo.updateProject).toHaveBeenCalledWith({
        projectId: "proj-123",
        status: "active",
      });

      // Verify Hedera service calls
      expect(mockHedera.validateWallet).toHaveBeenCalledWith(
        "0.0.789012",
        10.0
      );
      expect(mockHedera.createToken).toHaveBeenCalled();
      expect(mockHedera.mintNFTs).toHaveBeenCalled();

      // Verify event publishing
      expect(mockEventPub.publishEvent).toHaveBeenCalled();
    });

    it("should return 401 for invalid authentication", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const event = createMockEvent("proj-123", {
        walletAddress: "0.0.789012",
      });

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

      const event = createMockEvent("", {
        walletAddress: "0.0.789012",
      });
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

      const event = createMockEvent("proj-nonexistent", {
        walletAddress: "0.0.789012",
      });

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

      const event = createMockEvent("proj-123", {
        walletAddress: "0.0.789012",
      });

      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(403);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "You are not authorized to mint stocks for this project"
      );
      expect(responseBody.code).toBe("UNAUTHORIZED_ACCESS");
    });

    it("should return 422 for invalid project status", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      const activeProject = { ...mockProject, status: "active" };
      mockProjectRepo.getProject.mockResolvedValue(activeProject);

      const event = createMockEvent("proj-123", {
        walletAddress: "0.0.789012",
      });

      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(422);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Cannot mint stocks for project in active status"
      );
      expect(responseBody.code).toBe("INVALID_PROJECT_STATUS");
    });

    it("should return 400 for invalid wallet address", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      mockHedera.calculateGasFees.mockResolvedValue({
        totalEstimate: "10.0",
      });

      mockHedera.validateWallet.mockResolvedValue({
        isValid: false,
        canAffordOperation: false,
        balance: "0",
        estimatedGasFee: "10.0",
      });

      const event = createMockEvent("proj-123", {
        walletAddress: "invalid-wallet",
      });

      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(400);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Invalid wallet address");
      expect(responseBody.code).toBe("INVALID_WALLET_ADDRESS");
    });

    it("should return 402 for insufficient wallet balance", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      mockHedera.calculateGasFees.mockResolvedValue({
        totalEstimate: "100.0",
      });

      mockHedera.validateWallet.mockResolvedValue({
        isValid: true,
        canAffordOperation: false,
        balance: "50.0",
        estimatedGasFee: "100.0",
      });

      const event = createMockEvent("proj-123", {
        walletAddress: "0.0.789012",
      });

      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(402);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Insufficient wallet balance for minting operation"
      );
      expect(responseBody.code).toBe("INSUFFICIENT_BALANCE");
    });

    it("should return 503 for Hedera service errors", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      mockHedera.calculateGasFees.mockResolvedValue({
        totalEstimate: "10.0",
      });

      mockHedera.validateWallet.mockResolvedValue({
        isValid: true,
        canAffordOperation: true,
        balance: "100.0",
        estimatedGasFee: "10.0",
      });

      mockHedera.createToken.mockRejectedValue(new Error("Network timeout"));

      mockProjectRepo.updateProject.mockResolvedValue();

      const event = createMockEvent("proj-123", {
        walletAddress: "0.0.789012",
      });

      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Failed to create project token on Hedera network"
      );
      expect(responseBody.code).toBe("TOKEN_CREATION_FAILED");
    });

    it("should handle partial minting failures gracefully", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      const largeProject = { ...mockProject, stockSupply: 150 }; // Requires 3 batches
      mockProjectRepo.getProject.mockResolvedValue(largeProject);

      mockHedera.calculateGasFees.mockResolvedValue({
        totalEstimate: "15.0",
      });

      mockHedera.validateWallet.mockResolvedValue({
        isValid: true,
        canAffordOperation: true,
        balance: "100.0",
        estimatedGasFee: "15.0",
      });

      mockHedera.createToken.mockResolvedValue({
        tokenId: "0.0.123456",
        transactionId: "0.0.123456@1234567890.123456789",
        totalCost: "5.0",
      });

      // First two batches succeed, third fails
      mockHedera.mintNFTs
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
          transactionId: "0.0.123456@1234567891.123456789",
          totalCost: "2.5",
        })
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 51),
          transactionId: "0.0.123456@1234567892.123456789",
          totalCost: "2.5",
        })
        .mockRejectedValueOnce(new Error("Batch timeout"));

      mockIPFSService.storeProjectMetadata.mockResolvedValue({
        hash: "QmTest123",
        uri: "ipfs://QmTest123",
        size: 1024,
      });

      mockIPFSService.storeStockMetadata.mockResolvedValue({
        hash: "QmStock123",
        uri: "ipfs://QmStock123",
        size: 512,
      });

      mockProjectRepo.createHederaTransaction.mockResolvedValue({} as any);
      mockProjectRepo.updateHederaTransaction.mockResolvedValue();
      mockProjectRepo.updateProject.mockResolvedValue();
      mockProjectRepo.createStockNFT.mockResolvedValue();

      const event = createMockEvent("proj-123", {
        walletAddress: "0.0.789012",
      });

      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to mint stock NFTs");
      expect(responseBody.code).toBe("NFT_MINTING_FAILED");
      expect(responseBody.details.totalMinted).toBe(100); // Only first two batches
      expect(responseBody.details.completedBatches).toBe(2);
    });

    it("should validate request body format", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      const event = createMockEvent("proj-123", {
        // Missing walletAddress
      });

      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(400);
    });

    it("should handle base64 encoded request body", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      const event = createMockEvent("proj-123", {
        walletAddress: "0.0.789012",
      });

      // Simulate base64 encoded body
      event.body = Buffer.from(
        JSON.stringify({ walletAddress: "0.0.789012" })
      ).toString("base64");
      event.isBase64Encoded = true;

      mockHedera.calculateGasFees.mockResolvedValue({
        totalEstimate: "10.0",
      });

      mockHedera.validateWallet.mockResolvedValue({
        isValid: true,
        canAffordOperation: true,
        balance: "100.0",
        estimatedGasFee: "10.0",
      });

      const result = await callHandler(event, mockContext);

      // Should process the request normally
      expect(mockProjectRepo.getProject).toHaveBeenCalledWith("proj-123");
    });
  });

  describe("Error Handling and Recovery", () => {
    const createMockEvent = (
      projectId: string,
      body: any,
      authToken?: string
    ): APIGatewayProxyEvent => ({
      httpMethod: "POST",
      path: `/projects/${projectId}/mint-stocks`,
      pathParameters: { projectId },
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken || "Bearer valid-token",
        "User-Agent": "test-client/1.0",
      },
      body: JSON.stringify(body),
      isBase64Encoded: false,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      requestContext: {
        requestId: "test-request-123",
        stage: "test",
        resourceId: "resource-id",
        resourcePath: "/projects/{projectId}/mint-stocks",
        httpMethod: "POST",
        requestTime: "15/Jan/2024:14:30:00 +0000",
        requestTimeEpoch: 1705329000,
        path: `/projects/${projectId}/mint-stocks`,
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
      resource: "/projects/{projectId}/mint-stocks",
      stageVariables: null,
      multiValueHeaders: {},
    });

    it("should rollback project status on minting failure", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
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

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      mockHedera.calculateGasFees.mockResolvedValue({
        totalEstimate: "10.0",
      });

      mockHedera.validateWallet.mockResolvedValue({
        isValid: true,
        canAffordOperation: true,
        balance: "100.0",
        estimatedGasFee: "10.0",
      });

      // Update to minting succeeds
      mockProjectRepo.updateProject.mockResolvedValueOnce();

      // Token creation fails
      mockHedera.createToken.mockRejectedValue(new Error("Network error"));

      // Rollback should be called
      mockProjectRepo.updateProject.mockResolvedValueOnce();

      const event = createMockEvent("proj-123", {
        walletAddress: "0.0.789012",
      });

      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(503);

      // Verify rollback was attempted
      expect(mockProjectRepo.updateProject).toHaveBeenCalledWith({
        projectId: "proj-123",
        status: "minting",
      });
      expect(mockProjectRepo.updateProject).toHaveBeenCalledWith({
        projectId: "proj-123",
        status: "draft",
      });
    });
  });

  describe("Performance and Monitoring", () => {
    const createMockEvent = (
      projectId: string,
      body: any,
      authToken?: string
    ): APIGatewayProxyEvent => ({
      httpMethod: "POST",
      path: `/projects/${projectId}/mint-stocks`,
      pathParameters: { projectId },
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken || "Bearer valid-token",
        "User-Agent": "test-client/1.0",
      },
      body: JSON.stringify(body),
      isBase64Encoded: false,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      requestContext: {
        requestId: "test-request-123",
        stage: "test",
        resourceId: "resource-id",
        resourcePath: "/projects/{projectId}/mint-stocks",
        httpMethod: "POST",
        requestTime: "15/Jan/2024:14:30:00 +0000",
        requestTimeEpoch: 1705329000,
        path: `/projects/${projectId}/mint-stocks`,
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
      resource: "/projects/{projectId}/mint-stocks",
      stageVariables: null,
      multiValueHeaders: {},
    });

    it("should log performance metrics", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      const mockProject = {
        PK: "PROJECT#proj-123",
        SK: "METADATA",
        projectId: "proj-123",
        entrepreneurId: "user-456",
        name: "Test Project",
        description: "A test project for minting",
        category: "Technology",
        stockSupply: 100,
        status: "draft",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-15T10:00:00Z",
      };

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      mockHedera.calculateGasFees.mockResolvedValue({
        totalEstimate: "10.0",
      });

      mockHedera.validateWallet.mockResolvedValue({
        isValid: true,
        canAffordOperation: true,
        balance: "100.0",
        estimatedGasFee: "10.0",
      });

      mockHedera.createToken.mockResolvedValue({
        tokenId: "0.0.123456",
        transactionId: "0.0.123456@1234567890.123456789",
        totalCost: "5.0",
      });

      mockHedera.mintNFTs.mockResolvedValue({
        serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
        transactionId: "0.0.123456@1234567891.123456789",
        totalCost: "2.5",
      });

      mockIPFSService.storeProjectMetadata.mockResolvedValue({
        hash: "QmTest123",
        uri: "ipfs://QmTest123",
        size: 1024,
      });

      mockIPFSService.storeStockMetadata.mockResolvedValue({
        hash: "QmStock123",
        uri: "ipfs://QmStock123",
        size: 512,
      });

      mockProjectRepo.createHederaTransaction.mockResolvedValue({} as any);
      mockProjectRepo.updateHederaTransaction.mockResolvedValue();
      mockProjectRepo.updateProject.mockResolvedValue();
      mockProjectRepo.updateProjectStats.mockResolvedValue();
      mockProjectRepo.createStockNFT.mockResolvedValue();
      mockEventPub.publishEvent.mockResolvedValue();

      const event = createMockEvent("proj-123", {
        walletAddress: "0.0.789012",
      });

      await callHandler(event, mockContext);

      // Verify that performance logging occurred
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
