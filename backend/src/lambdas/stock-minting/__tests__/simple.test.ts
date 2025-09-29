import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from "aws-lambda";
import { handler } from "../index";
import { ProjectRepository } from "../../../repositories/project-repository";
import { createHederaService } from "../../../utils/hedera-service";
import { defaultIPFSService } from "../../../utils/ipfs-service";
import { extractUserIdFromToken } from "../../../utils/jwt-utils";

// Mock all external dependencies
jest.mock("../../../repositories/project-repository");
jest.mock("../../../utils/hedera-service");
jest.mock("../../../utils/ipfs-service");
jest.mock("../../../utils/event-publisher");
jest.mock("../../../utils/jwt-utils");
jest.mock("../../../utils/structured-logger", () => ({
  StructuredLogger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      logOperationStart: jest.fn(),
      logOperationSuccess: jest.fn(),
      logOperationError: jest.fn(),
    })),
  },
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
  stockSupply: 5, // Small number for simple testing
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
  totalCost: "0.5",
};

const mockIPFSResult = {
  hash: "QmTest123",
  uri: "ipfs://QmTest123",
  size: 1024,
};

const createMockEvent = (
  body: any,
  pathParameters: any = { projectId: "test-project-123" }
): APIGatewayProxyEvent => ({
  body: JSON.stringify(body),
  headers: { Authorization: "Bearer valid-token" },
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

describe("Stock Minting Lambda - Simple Tests", () => {
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
      totalEstimate: "25",
    });
    mockHederaService.validateWallet.mockResolvedValue({
      isValid: true,
      balance: "100",
      hasMinimumBalance: true,
      estimatedGasFee: "25",
      canAffordOperation: true,
    });
    mockHederaService.createToken.mockResolvedValue(mockTokenCreationResult);
    mockHederaService.mintNFTs.mockResolvedValue(mockNFTMintingResult);
    mockIPFSService.storeProjectMetadata.mockResolvedValue(mockIPFSResult);
    mockIPFSService.storeStockMetadata.mockResolvedValue(mockIPFSResult);

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

  describe("Basic Functionality", () => {
    it("should successfully mint stocks for a small project", async () => {
      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      console.log("Test result:", result.statusCode, result.body);
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
        25
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
      expect(mockHederaService.mintNFTs).toHaveBeenCalledWith({
        tokenId: mockTokenCreationResult.tokenId,
        quantity: mockProject.stockSupply,
        metadata: expect.any(Array),
      });

      // Verify stock NFT records were created
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(
        mockProject.stockSupply
      );
    });

    it("should reject requests with invalid authentication", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Authentication failed");
    });

    it("should reject requests for non-existent project", async () => {
      mockProjectRepositoryInstance.getProject.mockResolvedValue(null);

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Project not found");
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

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(403);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "You are not authorized to mint stocks for this project"
      );
    });

    it("should reject minting for projects not in draft status", async () => {
      const activeProject = { ...mockProject, status: "active" };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(activeProject);

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(422);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Cannot mint stocks for project in active status"
      );
    });

    it("should reject minting with insufficient wallet balance", async () => {
      mockHederaService.validateWallet.mockResolvedValue({
        isValid: true,
        balance: "10",
        hasMinimumBalance: false,
        estimatedGasFee: "25",
        canAffordOperation: false,
      });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(402);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Insufficient wallet balance for minting operation"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle token creation failures with rollback", async () => {
      mockHederaService.createToken.mockRejectedValue(
        new Error("Token creation failed")
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

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

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

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

    it("should handle missing project ID in path", async () => {
      const event = createMockEvent(
        { walletAddress: "0.0.789012" },
        {} // No projectId in pathParameters
      );

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Project ID is required");
    });
  });

  describe("Validation", () => {
    it("should validate project stock supply", async () => {
      const invalidProject = { ...mockProject, stockSupply: 0 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(
        invalidProject
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(422);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Project must have a positive stock supply"
      );
    });

    it("should validate wallet address format", async () => {
      mockHederaService.validateWallet.mockResolvedValue({
        isValid: false,
        balance: "0",
        hasMinimumBalance: false,
        estimatedGasFee: "25",
        canAffordOperation: false,
      });

      const event = createMockEvent({
        walletAddress: "invalid-wallet",
      });

      const result = (await handler(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Invalid wallet address");
    });
  });

  describe("State Management", () => {
    it("should create stock NFT records with correct data", async () => {
      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      await handler(event, mockContext, jest.fn());

      // Verify stock NFT records were created with correct structure
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(
        mockProject.stockSupply
      );

      // Check the structure of the first stock NFT record
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: `PROJECT#${mockProject.projectId}`,
          SK: `STOCK#1`,
          projectId: mockProject.projectId,
          stockNumber: 1,
          tokenId: mockTokenCreationResult.tokenId,
          serialNumber: 1,
          ownerWalletAddress: "0.0.789012",
          status: "minted",
          metadataUri: mockIPFSResult.uri,
          GSI4PK: "OWNER#0.0.789012",
        })
      );
    });

    it("should update project statistics after successful minting", async () => {
      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      await handler(event, mockContext, jest.fn());

      // Verify statistics were updated
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

    it("should create transaction records for token creation and minting", async () => {
      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      await handler(event, mockContext, jest.fn());

      // Verify token creation transaction was recorded
      expect(
        mockProjectRepositoryInstance.createHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: mockTokenCreationResult.transactionId,
        transactionType: "token_creation",
        gasUsed: parseFloat(mockTokenCreationResult.totalCost),
      });

      // Verify NFT minting transaction was recorded
      expect(
        mockProjectRepositoryInstance.createHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: mockNFTMintingResult.transactionId,
        transactionType: "nft_mint",
        gasUsed: parseFloat(mockNFTMintingResult.totalCost),
      });

      // Verify transactions were marked as successful
      expect(
        mockProjectRepositoryInstance.updateHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: mockTokenCreationResult.transactionId,
        status: "success",
      });

      expect(
        mockProjectRepositoryInstance.updateHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: mockNFTMintingResult.transactionId,
        status: "success",
      });
    });
  });
});
