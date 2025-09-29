import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler as stockMintingHandler } from "../index";
import { handler as stockMintingStatusHandler } from "../../stock-minting-status/index";
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

describe("Stock Minting API Workflow Integration Tests", () => {
  let mockContext: Context;
  let mockProjectRepo: jest.Mocked<ProjectRepository>;
  let mockHedera: any;
  let mockEventPub: jest.Mocked<EventPublisher>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "stock-minting-workflow",
      functionVersion: "1",
      invokedFunctionArn:
        "arn:aws:lambda:us-east-1:123456789012:function:stock-minting-workflow",
      memoryLimitInMB: "1024",
      awsRequestId: "test-request-id",
      logGroupName: "/aws/lambda/stock-minting-workflow",
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
      getProjectStats: jest.fn(),
      getHederaTransactions: jest.fn(),
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

  const createMockEvent = (
    method: string,
    path: string,
    projectId: string,
    body?: any,
    authToken?: string
  ): APIGatewayProxyEvent => ({
    httpMethod: method,
    path,
    pathParameters: { projectId },
    headers: {
      "Content-Type": "application/json",
      Authorization: authToken || "Bearer valid-token",
      "User-Agent": "test-client/1.0",
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    requestContext: {
      requestId: "test-request-123",
      stage: "test",
      resourceId: "resource-id",
      resourcePath: path,
      httpMethod: method,
      requestTime: "15/Jan/2024:14:30:00 +0000",
      requestTimeEpoch: 1705329000,
      path,
      accountId: "123456789012",
      protocol: "HTTP/1.1",
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: "127.0.0.1",
        user: null,
        userAgent: "test-client/1.0",
        userArn: null,
      },
      apiId: "test-api-id",
      domainName: "test-domain",
      domainPrefix: "test",
    },
    resource: path,
    stageVariables: null,
    multiValueHeaders: {},
  });

  const mockProject = {
    PK: "PROJECT#proj-123",
    SK: "METADATA",
    projectId: "proj-123",
    entrepreneurId: "user-456",
    name: "Test Project",
    description: "A test project for minting workflow",
    category: "Technology",
    stockSupply: 100,
    status: "draft" as const,
    coverImageUrl: "https://example.com/image.jpg",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    GSI3PK: "PROJECT_STATUS#draft",
    GSI3SK: "2024-01-15T10:00:00Z",
  };

  describe("Complete Stock Minting Workflow", () => {
    it("should complete full minting workflow with status polling", async () => {
      // Setup authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      // Setup project data
      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      // Setup Hedera service mocks
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
        });

      // Setup IPFS mocks
      mockIPFSService.storeProjectMetadata.mockResolvedValue({
        hash: "QmTest123",
        uri: "ipfs://QmTest123",
      });

      mockIPFSService.storeStockMetadata.mockResolvedValue({
        hash: "QmStock123",
        uri: "ipfs://QmStock123",
      });

      // Setup repository mocks
      mockProjectRepo.createHederaTransaction.mockResolvedValue({} as any);
      mockProjectRepo.updateHederaTransaction.mockResolvedValue();
      mockProjectRepo.updateProject.mockResolvedValue();
      mockProjectRepo.updateProjectStats.mockResolvedValue();
      mockProjectRepo.createStockNFT.mockResolvedValue();

      // Setup event publisher
      mockEventPub.publishEvent.mockResolvedValue();

      // Step 1: Check initial status (should be draft)
      const initialStatusEvent = createMockEvent(
        "GET",
        "/projects/proj-123/mint-stocks/status",
        "proj-123"
      );

      const initialStatusResult = await stockMintingStatusHandler(
        initialStatusEvent,
        mockContext
      );

      expect(initialStatusResult.statusCode).toBe(200);
      const initialStatus = JSON.parse(initialStatusResult.body);
      expect(initialStatus.status).toBe("draft");
      expect(initialStatus.progress.completed).toBe(0);
      expect(initialStatus.progress.total).toBe(100);

      // Step 2: Initiate stock minting
      const mintingEvent = createMockEvent(
        "POST",
        "/projects/proj-123/mint-stocks",
        "proj-123",
        { walletAddress: "0.0.789012" }
      );

      const mintingResult = await stockMintingHandler(
        mintingEvent,
        mockContext
      );

      expect(mintingResult.statusCode).toBe(200);
      const mintingResponse = JSON.parse(mintingResult.body);
      expect(mintingResponse.message).toBe(
        "Stock minting completed successfully"
      );
      expect(mintingResponse.tokenId).toBe("0.0.123456");
      expect(mintingResponse.totalMinted).toBe(100);
      expect(mintingResponse.progress.status).toBe("completed");

      // Step 3: Check final status (should be active/completed)
      // Update mocks for completed state
      const completedProject = { ...mockProject, status: "active" };
      mockProjectRepo.getProject.mockResolvedValue(completedProject);

      const mockStats = {
        totalStocks: 100,
        mintedStocks: 100,
        availableStocks: 100,
        soldStocks: 0,
        totalRaised: 0,
        lastUpdated: "2024-01-15T15:00:00Z",
      };

      const mockTransactions = [
        {
          transactionId: "0.0.123456@1234567890.123456789",
          transactionType: "token_creation",
          status: "success",
          timestamp: "2024-01-15T14:00:00Z",
        },
        {
          transactionId: "0.0.123456@1234567891.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T14:30:00Z",
        },
        {
          transactionId: "0.0.123456@1234567892.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T15:00:00Z",
        },
      ];

      mockProjectRepo.getProjectStats.mockResolvedValue(mockStats);
      mockProjectRepo.getHederaTransactions.mockResolvedValue(mockTransactions);

      const finalStatusEvent = createMockEvent(
        "GET",
        "/projects/proj-123/mint-stocks/status",
        "proj-123"
      );

      const finalStatusResult = await stockMintingStatusHandler(
        finalStatusEvent,
        mockContext
      );

      expect(finalStatusResult.statusCode).toBe(200);
      const finalStatus = JSON.parse(finalStatusResult.body);
      expect(finalStatus.status).toBe("active");
      expect(finalStatus.progress.completed).toBe(100);
      expect(finalStatus.progress.total).toBe(100);
      expect(finalStatus.progress.percentage).toBe(100);
      expect(finalStatus.progress.status).toBe("completed");
      expect(finalStatus.tokenId).toBe("0.0.123456@1234567890.123456789");
      expect(finalStatus.totalMinted).toBe(100);
      expect(finalStatus.mintingBatches).toBe(2);
      expect(finalStatus.transactionIds).toHaveLength(2);

      // Verify all expected calls were made
      expect(mockProjectRepo.getProject).toHaveBeenCalledWith("proj-123");
      expect(mockHedera.createToken).toHaveBeenCalled();
      expect(mockHedera.mintNFTs).toHaveBeenCalledTimes(2); // 2 batches for 100 stocks
      expect(mockProjectRepo.updateProject).toHaveBeenCalledWith({
        projectId: "proj-123",
        status: "minting",
      });
      expect(mockProjectRepo.updateProject).toHaveBeenCalledWith({
        projectId: "proj-123",
        status: "active",
      });
      expect(mockEventPub.publishEvent).toHaveBeenCalled();
    });

    it("should handle minting progress tracking correctly", async () => {
      // Setup authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      // Setup project in minting state
      const mintingProject = {
        ...mockProject,
        status: "minting",
        stockSupply: 250,
      };
      mockProjectRepo.getProject.mockResolvedValue(mintingProject);

      // Setup partial progress
      const mockStats = {
        totalStocks: 250,
        mintedStocks: 150, // 3 batches completed out of 5
        availableStocks: 150,
        soldStocks: 0,
        totalRaised: 0,
        lastUpdated: "2024-01-15T14:30:00Z",
      };

      const mockTransactions = [
        {
          transactionId: "0.0.123456@1234567890.123456789",
          transactionType: "token_creation",
          status: "success",
          timestamp: "2024-01-15T14:00:00Z",
        },
        {
          transactionId: "0.0.123456@1234567891.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T14:10:00Z",
        },
        {
          transactionId: "0.0.123456@1234567892.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T14:20:00Z",
        },
        {
          transactionId: "0.0.123456@1234567893.123456789",
          transactionType: "nft_mint",
          status: "success",
          timestamp: "2024-01-15T14:30:00Z",
        },
      ];

      mockProjectRepo.getProjectStats.mockResolvedValue(mockStats);
      mockProjectRepo.getHederaTransactions.mockResolvedValue(mockTransactions);

      // Check minting progress
      const progressEvent = createMockEvent(
        "GET",
        "/projects/proj-123/mint-stocks/status",
        "proj-123"
      );

      const progressResult = await stockMintingStatusHandler(
        progressEvent,
        mockContext
      );

      expect(progressResult.statusCode).toBe(200);
      const progressStatus = JSON.parse(progressResult.body);

      expect(progressStatus.status).toBe("minting");
      expect(progressStatus.progress.completed).toBe(150);
      expect(progressStatus.progress.total).toBe(250);
      expect(progressStatus.progress.percentage).toBe(60); // 150/250 * 100
      expect(progressStatus.progress.status).toBe("in_progress");
      expect(progressStatus.progress.currentBatch).toBe(4); // 3 completed + 1 current
      expect(progressStatus.progress.totalBatches).toBe(5); // ceil(250/50)
      expect(progressStatus.tokenId).toBe("0.0.123456@1234567890.123456789");
      expect(progressStatus.startedAt).toBe("2024-01-15T14:00:00Z");
      expect(progressStatus.estimatedCompletion).toBeDefined();
    });

    it("should handle error scenarios with proper rollback", async () => {
      // Setup authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      // Setup project data
      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      // Setup Hedera service mocks - wallet validation passes
      mockHedera.calculateGasFees.mockResolvedValue({
        totalEstimate: "10.0",
      });

      mockHedera.validateWallet.mockResolvedValue({
        isValid: true,
        canAffordOperation: true,
        balance: "100.0",
        estimatedGasFee: "10.0",
      });

      // Token creation fails
      mockHedera.createToken.mockRejectedValue(new Error("Network timeout"));

      // Project status update succeeds (for minting state)
      mockProjectRepo.updateProject.mockResolvedValue();

      // Initiate minting (should fail and rollback)
      const mintingEvent = createMockEvent(
        "POST",
        "/projects/proj-123/mint-stocks",
        "proj-123",
        { walletAddress: "0.0.789012" }
      );

      const mintingResult = await stockMintingHandler(
        mintingEvent,
        mockContext
      );

      expect(mintingResult.statusCode).toBe(503);
      const errorResponse = JSON.parse(mintingResult.body);
      expect(errorResponse.message).toBe(
        "Failed to create project token on Hedera network"
      );
      expect(errorResponse.code).toBe("TOKEN_CREATION_FAILED");

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

    it("should handle concurrent status requests efficiently", async () => {
      // Setup authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      // Setup project data
      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      // Create multiple concurrent status requests
      const statusEvent = createMockEvent(
        "GET",
        "/projects/proj-123/mint-stocks/status",
        "proj-123"
      );

      const concurrentRequests = Array.from({ length: 10 }, () =>
        stockMintingStatusHandler(statusEvent, mockContext)
      );

      const results = await Promise.all(concurrentRequests);

      // All requests should succeed
      results.forEach((result) => {
        expect(result.statusCode).toBe(200);
        const status = JSON.parse(result.body);
        expect(status.projectId).toBe("proj-123");
        expect(status.status).toBe("draft");
      });

      // Repository should be called for each request (no caching in this implementation)
      expect(mockProjectRepo.getProject).toHaveBeenCalledTimes(10);
    });

    it("should validate authentication for all endpoints", async () => {
      // Test invalid authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      // Test minting endpoint
      const mintingEvent = createMockEvent(
        "POST",
        "/projects/proj-123/mint-stocks",
        "proj-123",
        { walletAddress: "0.0.789012" }
      );

      const mintingResult = await stockMintingHandler(
        mintingEvent,
        mockContext
      );
      expect(mintingResult.statusCode).toBe(401);

      // Test status endpoint
      const statusEvent = createMockEvent(
        "GET",
        "/projects/proj-123/mint-stocks/status",
        "proj-123"
      );

      const statusResult = await stockMintingStatusHandler(
        statusEvent,
        mockContext
      );
      expect(statusResult.statusCode).toBe(401);
    });

    it("should validate project ownership for all endpoints", async () => {
      // Setup authentication with different user
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-different",
      });

      // Setup project data
      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      // Test minting endpoint
      const mintingEvent = createMockEvent(
        "POST",
        "/projects/proj-123/mint-stocks",
        "proj-123",
        { walletAddress: "0.0.789012" }
      );

      const mintingResult = await stockMintingHandler(
        mintingEvent,
        mockContext
      );
      expect(mintingResult.statusCode).toBe(403);

      // Test status endpoint
      const statusEvent = createMockEvent(
        "GET",
        "/projects/proj-123/mint-stocks/status",
        "proj-123"
      );

      const statusResult = await stockMintingStatusHandler(
        statusEvent,
        mockContext
      );
      expect(statusResult.statusCode).toBe(403);
    });
  });

  describe("Performance and Monitoring", () => {
    it("should complete minting operations within timeout limits", async () => {
      const startTime = Date.now();

      // Setup successful minting scenario
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
      });

      mockIPFSService.storeStockMetadata.mockResolvedValue({
        hash: "QmStock123",
        uri: "ipfs://QmStock123",
      });

      mockProjectRepo.createHederaTransaction.mockResolvedValue({} as any);
      mockProjectRepo.updateHederaTransaction.mockResolvedValue();
      mockProjectRepo.updateProject.mockResolvedValue();
      mockProjectRepo.updateProjectStats.mockResolvedValue();
      mockProjectRepo.createStockNFT.mockResolvedValue();
      mockEventPub.publishEvent.mockResolvedValue();

      const mintingEvent = createMockEvent(
        "POST",
        "/projects/proj-123/mint-stocks",
        "proj-123",
        { walletAddress: "0.0.789012" }
      );

      const result = await stockMintingHandler(mintingEvent, mockContext);
      const duration = Date.now() - startTime;

      expect(result.statusCode).toBe(200);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds for small project
    });

    it("should handle large projects efficiently", async () => {
      // Setup large project (10,000 stocks = 200 batches)
      const largeProject = { ...mockProject, stockSupply: 10000 };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-456",
      });

      mockProjectRepo.getProject.mockResolvedValue(largeProject);

      mockHedera.calculateGasFees.mockResolvedValue({
        totalEstimate: "100.0",
      });

      mockHedera.validateWallet.mockResolvedValue({
        isValid: true,
        canAffordOperation: true,
        balance: "1000.0",
        estimatedGasFee: "100.0",
      });

      mockHedera.createToken.mockResolvedValue({
        tokenId: "0.0.123456",
        transactionId: "0.0.123456@1234567890.123456789",
        totalCost: "50.0",
      });

      // Mock successful batch minting (simulate 200 batches)
      mockHedera.mintNFTs.mockImplementation(() =>
        Promise.resolve({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
          transactionId: `0.0.123456@${Date.now()}.123456789`,
          totalCost: "0.5",
        })
      );

      mockIPFSService.storeProjectMetadata.mockResolvedValue({
        hash: "QmTest123",
        uri: "ipfs://QmTest123",
      });

      mockIPFSService.storeStockMetadata.mockResolvedValue({
        hash: "QmStock123",
        uri: "ipfs://QmStock123",
      });

      mockProjectRepo.createHederaTransaction.mockResolvedValue({} as any);
      mockProjectRepo.updateHederaTransaction.mockResolvedValue();
      mockProjectRepo.updateProject.mockResolvedValue();
      mockProjectRepo.updateProjectStats.mockResolvedValue();
      mockProjectRepo.createStockNFT.mockResolvedValue();
      mockEventPub.publishEvent.mockResolvedValue();

      const mintingEvent = createMockEvent(
        "POST",
        "/projects/proj-123/mint-stocks",
        "proj-123",
        { walletAddress: "0.0.789012" }
      );

      const result = await stockMintingHandler(mintingEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const response = JSON.parse(result.body);
      expect(response.totalMinted).toBe(10000);
      expect(response.mintingBatches).toBe(200);

      // Verify batch operations were called correctly
      expect(mockHedera.mintNFTs).toHaveBeenCalledTimes(200);
      expect(mockProjectRepo.createStockNFT).toHaveBeenCalledTimes(10000);
    });
  });
});
