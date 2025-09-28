import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from "aws-lambda";
import { handler } from "../index";
import { ProjectRepository } from "../../../repositories/project-repository";
import { createHederaService } from "../../../utils/hedera-service";
import { defaultIPFSService } from "../../../utils/ipfs-service";
import { EventPublisher } from "../../../utils/event-publisher";
import { extractUserIdFromToken } from "../../../utils/jwt-utils";
import { StockMintingError, ErrorCodes } from "../types";

// Mock all external dependencies
jest.mock("../../../repositories/project-repository");
jest.mock("../../../utils/hedera-service");
jest.mock("../../../utils/ipfs-service");
jest.mock("../../../utils/event-publisher");
jest.mock("../../../utils/jwt-utils");
jest.mock("../../../utils/structured-logger", () => ({
  createProjectLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockProjectRepository = ProjectRepository as jest.MockedClass<
  typeof ProjectRepository
>;
const mockCreateHederaService = createHederaService as jest.MockedFunction<
  typeof createHederaService
>;
const mockExtractUserIdFromToken =
  extractUserIdFromToken as jest.MockedFunction<typeof extractUserIdFromToken>;

// Mock implementations
const mockHederaService = {
  calculateGasFees: jest.fn(),
  validateWallet: jest.fn(),
  createToken: jest.fn(),
  mintNFTs: jest.fn(),
};

const mockIPFSService = {
  storeProjectMetadata: jest.fn(),
  storeStockMetadata: jest.fn(),
};

const mockEventPublisher = {
  publishEvent: jest.fn(),
};

const mockProjectRepositoryInstance = {
  getProject: jest.fn(),
  updateProject: jest.fn(),
  createHederaTransaction: jest.fn(),
  updateHederaTransaction: jest.fn(),
  updateProjectStats: jest.fn(),
  putItem: jest.fn(),
};

// Test data
const mockProject = {
  projectId: "test-project-123",
  entrepreneurId: "entrepreneur-456",
  name: "Test Project",
  description: "A test project for unit testing",
  category: "technology",
  stockSupply: 100,
  status: "draft",
  coverImageUrl: "https://example.com/image.jpg",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockTokenCreationResult = {
  tokenId: "0.0.123456",
  transactionId: "0.0.123456@1234567890.123456789",
  transactionHash: "abc123def456",
  consensusTimestamp: "1234567890.123456789",
  totalCost: "20.5",
};

const mockNFTMintingResult = {
  serialNumbers: [1, 2, 3, 4, 5],
  transactionId: "0.0.123456@1234567891.123456789",
  transactionHash: "def456ghi789",
  consensusTimestamp: "1234567891.123456789",
  totalCost: "2.5",
};

const mockIPFSResult = {
  hash: "QmTest123",
  uri: "ipfs://QmTest123",
  size: 1024,
};

const createMockEvent = (
  body: any,
  pathParameters: any = { projectId: "test-project-123" },
  headers: any = { Authorization: "Bearer valid-token" }
): APIGatewayProxyEvent => ({
  body: JSON.stringify(body),
  headers,
  pathParameters,
  httpMethod: "POST",
  path: "/projects/test-project-123/mint-stocks",
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  isBase64Encoded: false,
  requestContext: {
    requestId: "test-request-123",
    stage: "test",
    resourceId: "test-resource",
    resourcePath: "/projects/{projectId}/mint-stocks",
    httpMethod: "POST",
    requestTime: "01/Jan/2024:00:00:00 +0000",
    requestTimeEpoch: 1704067200,
    path: "/test/projects/test-project-123/mint-stocks",
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
      userAgent: "test-agent",
      userArn: null,
      clientCert: null,
    },
    authorizer: {},
    apiId: "test-api-id",
  },
  resource: "/projects/{projectId}/mint-stocks",
  stageVariables: null,
  multiValueHeaders: {},
});

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "stock-minting",
  functionVersion: "$LATEST",
  invokedFunctionArn:
    "arn:aws:lambda:us-east-1:123456789012:function:stock-minting",
  memoryLimitInMB: "256",
  awsRequestId: "test-request-123",
  logGroupName: "/aws/lambda/stock-minting",
  logStreamName: "2024/01/01/[$LATEST]test123",
  getRemainingTimeInMillis: () => 30000,
  done: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};

// Helper function to properly type handler calls
const callHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const result = await handler(event, mockContext, jest.fn());
  return result as APIGatewayProxyResult;
};

describe("Stock Minting Lambda", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockCreateHederaService.mockReturnValue(mockHederaService as any);
    mockProjectRepository.mockImplementation(
      () => mockProjectRepositoryInstance as any
    );

    (defaultIPFSService as any).storeProjectMetadata =
      mockIPFSService.storeProjectMetadata;
    (defaultIPFSService as any).storeStockMetadata =
      mockIPFSService.storeStockMetadata;

    mockExtractUserIdFromToken.mockReturnValue({
      success: true,
      userId: "entrepreneur-456",
    });

    mockProjectRepositoryInstance.getProject.mockResolvedValue(mockProject);
    mockHederaService.calculateGasFees.mockResolvedValue({
      tokenCreation: "20",
      nftMinting: "0.1",
      totalEstimate: "30",
    });
    mockHederaService.validateWallet.mockResolvedValue({
      isValid: true,
      balance: "100",
      hasMinimumBalance: true,
      estimatedGasFee: "30",
      canAffordOperation: true,
    });
    mockHederaService.createToken.mockResolvedValue(mockTokenCreationResult);
    mockHederaService.mintNFTs.mockResolvedValue(mockNFTMintingResult);
    mockIPFSService.storeProjectMetadata.mockResolvedValue(mockIPFSResult);
    mockIPFSService.storeStockMetadata.mockResolvedValue(mockIPFSResult);
    mockEventPublisher.publishEvent = jest.fn().mockResolvedValue(undefined);

    // Setup repository mocks
    mockProjectRepositoryInstance.updateProject.mockResolvedValue(undefined);
    mockProjectRepositoryInstance.createHederaTransaction.mockResolvedValue({
      projectId: mockProject.projectId,
      transactionId: mockTokenCreationResult.transactionId,
      transactionType: "token_creation",
      status: "pending",
      timestamp: "2024-01-01T00:00:00.000Z",
    });
    mockProjectRepositoryInstance.updateHederaTransaction.mockResolvedValue(
      undefined
    );
    mockProjectRepositoryInstance.updateProjectStats.mockResolvedValue(
      undefined
    );
    mockProjectRepositoryInstance.putItem.mockResolvedValue(undefined);
  });

  describe("Successful Stock Minting", () => {
    it("should successfully mint stocks for a valid project", async () => {
      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Stock minting completed successfully");
      expect(responseBody.tokenId).toBe(mockTokenCreationResult.tokenId);
      expect(responseBody.totalMinted).toBe(mockProject.stockSupply);
      expect(responseBody.progress.status).toBe("completed");
      expect(responseBody.progress.percentage).toBe(100);

      // Verify project validation
      expect(mockProjectRepositoryInstance.getProject).toHaveBeenCalledWith(
        mockProject.projectId
      );

      // Verify wallet validation
      expect(mockHederaService.calculateGasFees).toHaveBeenCalledWith({
        tokenCreation: true,
        nftQuantity: mockProject.stockSupply,
      });
      expect(mockHederaService.validateWallet).toHaveBeenCalledWith(
        "0.0.789012",
        30
      );

      // Verify project status updates
      expect(mockProjectRepositoryInstance.updateProject).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        status: "minting",
      });
      expect(mockProjectRepositoryInstance.updateProject).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        status: "active",
      });

      // Verify token creation
      expect(mockHederaService.createToken).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        tokenName: `${mockProject.name} Stock`,
        tokenSymbol: expect.stringMatching(/^[A-Z0-9]+STK$/),
        totalSupply: mockProject.stockSupply,
        metadata: expect.objectContaining({
          name: mockProject.name,
          description: mockProject.description,
        }),
      });

      // Verify NFT minting
      expect(mockHederaService.mintNFTs).toHaveBeenCalled();

      // Verify statistics update
      expect(
        mockProjectRepositoryInstance.updateProjectStats
      ).toHaveBeenCalledWith({
        PK: `PROJECT#${mockProject.projectId}`,
        SK: "STATS",
        projectId: mockProject.projectId,
        totalStocks: mockProject.stockSupply,
        mintedStocks: mockProject.stockSupply,
        availableStocks: mockProject.stockSupply,
        soldStocks: 0,
        totalRaised: 0,
        lastUpdated: expect.any(String),
      });
    });

    it("should handle large stock supply with batch minting", async () => {
      const largeProject = { ...mockProject, stockSupply: 150 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(largeProject);

      // Mock multiple batch minting calls
      mockHederaService.mintNFTs
        .mockResolvedValueOnce({
          ...mockNFTMintingResult,
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
        })
        .mockResolvedValueOnce({
          ...mockNFTMintingResult,
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 51),
        })
        .mockResolvedValueOnce({
          ...mockNFTMintingResult,
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 101),
        });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.totalMinted).toBe(150);
      expect(responseBody.mintingBatches).toBe(3);

      // Verify multiple minting calls
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(3);
    });
  });

  describe("Authentication and Authorization", () => {
    it("should reject requests with invalid authentication", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(401);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Authentication failed");
    });

    it("should reject requests from non-project owners", async () => {
      const unauthorizedProject = {
        ...mockProject,
        entrepreneurId: "different-entrepreneur",
      };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(
        unauthorizedProject
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(403);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "You are not authorized to mint stocks for this project"
      );
    });
  });

  describe("Project Validation", () => {
    it("should reject minting for non-existent project", async () => {
      mockProjectRepositoryInstance.getProject.mockResolvedValue(null);

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(404);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Project not found");
    });

    it("should reject minting for projects not in draft status", async () => {
      const activeProject = { ...mockProject, status: "active" };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(activeProject);

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(422);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Cannot mint stocks for project in active status"
      );
    });

    it("should reject minting for projects with invalid stock supply", async () => {
      const invalidProject = { ...mockProject, stockSupply: 0 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(
        invalidProject
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(422);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Project must have a positive stock supply"
      );
    });
  });

  describe("Wallet Validation", () => {
    it("should reject minting with invalid wallet address", async () => {
      mockHederaService.validateWallet.mockResolvedValue({
        isValid: false,
        balance: "0",
        hasMinimumBalance: false,
        estimatedGasFee: "30",
        canAffordOperation: false,
      });

      const event = createMockEvent({
        walletAddress: "invalid-wallet",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(400);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Invalid wallet address");
    });

    it("should reject minting with insufficient wallet balance", async () => {
      mockHederaService.validateWallet.mockResolvedValue({
        isValid: true,
        balance: "10",
        hasMinimumBalance: false,
        estimatedGasFee: "30",
        canAffordOperation: false,
      });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(402);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Insufficient wallet balance for minting operation"
      );
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle token creation failures", async () => {
      mockHederaService.createToken.mockRejectedValue(
        new Error("Token creation failed")
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Failed to create project token on Hedera network"
      );

      // Verify rollback was attempted
      expect(mockProjectRepositoryInstance.updateProject).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        status: "draft",
      });
    });

    it("should handle NFT minting failures", async () => {
      mockHederaService.mintNFTs.mockRejectedValue(
        new Error("NFT minting failed")
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to mint stock NFTs");

      // Verify transaction status was updated to failed
      expect(
        mockProjectRepositoryInstance.updateHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: expect.any(String),
        status: "failed",
        errorMessage: "NFT minting failed",
      });
    });

    it("should handle IPFS metadata storage failures gracefully", async () => {
      mockIPFSService.storeProjectMetadata.mockRejectedValue(
        new Error("IPFS storage failed")
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Failed to create project token on Hedera network"
      );
    });

    it("should handle database errors during project status updates", async () => {
      mockProjectRepositoryInstance.updateProject.mockRejectedValue(
        new Error("Database error")
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to update project status");
    });
  });

  describe("Partial Failure Recovery", () => {
    it("should handle partial batch minting failures", async () => {
      const largeProject = { ...mockProject, stockSupply: 150 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(largeProject);

      // First batch succeeds, second batch fails, third batch not reached
      mockHederaService.mintNFTs
        .mockResolvedValueOnce({
          ...mockNFTMintingResult,
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
        })
        .mockRejectedValueOnce(new Error("Second batch failed"))
        .mockResolvedValueOnce({
          ...mockNFTMintingResult,
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 101),
        });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to mint stock NFTs");
      expect(responseBody.details.totalMinted).toBe(50); // Only first batch completed
      expect(responseBody.details.completedBatches).toBe(1);

      // Verify failed transaction was marked as failed
      expect(
        mockProjectRepositoryInstance.updateHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: expect.any(String),
        status: "failed",
        errorMessage: "Second batch failed",
      });
    });
  });

  describe("Request Validation", () => {
    it("should reject requests without project ID in path", async () => {
      const event = createMockEvent(
        { walletAddress: "0.0.789012" },
        {} // No projectId in pathParameters
      );

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(400);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Project ID is required");
    });

    it("should handle malformed request body", async () => {
      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });
      event.body = "invalid-json";

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(500); // JSON parse error handled by main error handler
    });

    it("should handle base64 encoded request body", async () => {
      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });
      event.body = Buffer.from(
        JSON.stringify({ walletAddress: "0.0.789012" })
      ).toString("base64");
      event.isBase64Encoded = true;

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Stock minting completed successfully");
    });
  });

  describe("Event Publishing", () => {
    it("should publish progress events during minting", async () => {
      const largeProject = { ...mockProject, stockSupply: 100 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(largeProject);

      // Mock two batches
      mockHederaService.mintNFTs
        .mockResolvedValueOnce({
          ...mockNFTMintingResult,
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
        })
        .mockResolvedValueOnce({
          ...mockNFTMintingResult,
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 51),
        });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      await handler(event, mockContext, jest.fn());

      // Verify progress events were published
      expect(mockEventPublisher.publishEvent).toHaveBeenCalledWith(
        "StockMintingProgress",
        expect.objectContaining({
          eventType: "STOCK_MINTING_PROGRESS",
          projectId: mockProject.projectId,
          progress: expect.objectContaining({
            completed: 50,
            total: 100,
            percentage: 50,
            status: "in_progress",
          }),
        })
      );

      expect(mockEventPublisher.publishEvent).toHaveBeenCalledWith(
        "StockMintingProgress",
        expect.objectContaining({
          eventType: "STOCK_MINTING_PROGRESS",
          projectId: mockProject.projectId,
          progress: expect.objectContaining({
            completed: 100,
            total: 100,
            percentage: 100,
            status: "completed",
          }),
        })
      );

      // Verify completion event was published
      expect(mockEventPublisher.publishEvent).toHaveBeenCalledWith(
        "StockMintingCompleted",
        expect.objectContaining({
          eventType: "STOCK_MINTING_COMPLETED",
          projectId: mockProject.projectId,
          entrepreneurId: mockProject.entrepreneurId,
          totalMinted: 100,
        })
      );
    });

    it("should continue minting even if event publishing fails", async () => {
      mockEventPublisher.publishEvent.mockRejectedValue(
        new Error("Event publishing failed")
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      // Minting should still succeed despite event publishing failure
      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Stock minting completed successfully");
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle maximum stock supply efficiently", async () => {
      const maxProject = { ...mockProject, stockSupply: 1000000 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(maxProject);

      // Mock successful minting for all batches (this would be 20,000 batches of 50 each)
      mockHederaService.mintNFTs.mockResolvedValue({
        ...mockNFTMintingResult,
        serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
      });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.totalMinted).toBe(1000000);
      expect(responseBody.mintingBatches).toBe(20000); // 1,000,000 / 50 = 20,000 batches

      // Verify all batches were processed
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(20000);
    });
  });
});
