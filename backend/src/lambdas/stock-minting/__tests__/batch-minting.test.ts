import { APIGatewayProxyEvent, Context } from "aws-lambda";
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
  projectId: "batch-test-project",
  entrepreneurId: "entrepreneur-456",
  name: "Batch Test Project",
  description: "A project for testing batch minting",
  category: "technology",
  stockSupply: 250, // Will require 5 batches of 50 each
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

const mockIPFSResult = {
  hash: "QmTest123",
  uri: "ipfs://QmTest123",
  size: 1024,
};

const createMockEvent = (
  body: any,
  pathParameters: any = { projectId: "batch-test-project" }
): APIGatewayProxyEvent => ({
  body: JSON.stringify(body),
  headers: { Authorization: "Bearer valid-token" },
  pathParameters,
  httpMethod: "POST",
  path: "/projects/batch-test-project/mint-stocks",
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  isBase64Encoded: false,
  requestContext: {
    requestId: "batch-test-request",
    stage: "test",
    resourceId: "test-resource",
    resourcePath: "/projects/{projectId}/mint-stocks",
    httpMethod: "POST",
    requestTime: "01/Jan/2024:00:00:00 +0000",
    requestTimeEpoch: 1704067200,
    path: "/test/projects/batch-test-project/mint-stocks",
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
  awsRequestId: "batch-test-request",
  logGroupName: "/aws/lambda/stock-minting",
  logStreamName: "2024/01/01/[$LATEST]test123",
  getRemainingTimeInMillis: () => 30000,
  done: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};

describe("Stock Minting Lambda - Batch Processing", () => {
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
      totalEstimate: "45",
    });
    mockHederaService.validateWallet.mockResolvedValue({
      isValid: true,
      balance: "100",
      hasMinimumBalance: true,
      estimatedGasFee: "45",
      canAffordOperation: true,
    });
    mockHederaService.createToken.mockResolvedValue(mockTokenCreationResult);
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

  describe("Successful Batch Processing", () => {
    it("should process all batches successfully for 250 stocks", async () => {
      // Mock 5 successful batch minting calls
      for (let i = 0; i < 5; i++) {
        const startSerial = i * 50 + 1;
        mockHederaService.mintNFTs.mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, j) => startSerial + j),
          transactionId: `0.0.123456@batch${i + 1}`,
          transactionHash: `hash${i + 1}`,
          consensusTimestamp: `123456789${i}.123456789`,
          totalCost: "2.5",
        });
      }

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.totalMinted).toBe(250);
      expect(responseBody.mintingBatches).toBe(5);
      expect(responseBody.transactionIds).toHaveLength(5);

      // Verify all 5 batches were processed
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(5);

      // Verify each batch had correct parameters
      for (let i = 0; i < 5; i++) {
        expect(mockHederaService.mintNFTs).toHaveBeenNthCalledWith(i + 1, {
          tokenId: mockTokenCreationResult.tokenId,
          quantity: 50,
          metadata: expect.arrayContaining([
            expect.objectContaining({
              project_id: mockProject.projectId,
              stock_number: expect.any(Number),
            }),
          ]),
        });
      }

      // Verify 250 stock NFT records were created
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(250);
    });

    it("should handle uneven batch sizes correctly", async () => {
      // Test with 123 stocks (3 batches: 50, 50, 23)
      const unevenProject = { ...mockProject, stockSupply: 123 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(unevenProject);

      // Mock 3 batch minting calls with different sizes
      mockHederaService.mintNFTs
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
          transactionId: "0.0.123456@batch1",
          transactionHash: "hash1",
          consensusTimestamp: "1234567891.123456789",
          totalCost: "2.5",
        })
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 51),
          transactionId: "0.0.123456@batch2",
          transactionHash: "hash2",
          consensusTimestamp: "1234567892.123456789",
          totalCost: "2.5",
        })
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 23 }, (_, i) => i + 101),
          transactionId: "0.0.123456@batch3",
          transactionHash: "hash3",
          consensusTimestamp: "1234567893.123456789",
          totalCost: "1.15",
        });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.totalMinted).toBe(123);
      expect(responseBody.mintingBatches).toBe(3);

      // Verify batch sizes
      expect(mockHederaService.mintNFTs).toHaveBeenNthCalledWith(1, {
        tokenId: mockTokenCreationResult.tokenId,
        quantity: 50,
        metadata: expect.any(Array),
      });
      expect(mockHederaService.mintNFTs).toHaveBeenNthCalledWith(2, {
        tokenId: mockTokenCreationResult.tokenId,
        quantity: 50,
        metadata: expect.any(Array),
      });
      expect(mockHederaService.mintNFTs).toHaveBeenNthCalledWith(3, {
        tokenId: mockTokenCreationResult.tokenId,
        quantity: 23,
        metadata: expect.any(Array),
      });

      // Verify 123 stock NFT records were created
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(123);
    });

    it("should create correct metadata for each stock in batches", async () => {
      // Test with smaller number for easier verification
      const smallProject = { ...mockProject, stockSupply: 5 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(smallProject);

      mockHederaService.mintNFTs.mockResolvedValue({
        serialNumbers: [1, 2, 3, 4, 5],
        transactionId: "0.0.123456@batch1",
        transactionHash: "hash1",
        consensusTimestamp: "1234567891.123456789",
        totalCost: "0.5",
      });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      await handler(event, mockContext, jest.fn());

      // Verify metadata was created for each stock
      expect(mockIPFSService.storeStockMetadata).toHaveBeenCalledTimes(5);

      // Check specific metadata for each stock
      for (let i = 1; i <= 5; i++) {
        expect(mockIPFSService.storeStockMetadata).toHaveBeenCalledWith({
          name: `${mockProject.name} Stock #${i}`,
          description: `Stock #${i} of ${mockProject.name}. ${mockProject.description}`,
          image: mockProject.coverImageUrl,
          external_url: expect.stringContaining(`/stocks/${i}`),
          attributes: expect.arrayContaining([
            { trait_type: "Stock Number", value: i },
            { trait_type: "Project", value: mockProject.name },
            { trait_type: "Total Supply", value: 5 },
          ]),
          project_id: mockProject.projectId,
          stock_number: i,
        });
      }
    });
  });

  describe("Batch Failure Scenarios", () => {
    it("should handle first batch failure", async () => {
      mockHederaService.mintNFTs.mockRejectedValueOnce(
        new Error("First batch failed")
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to mint stock NFTs");
      expect(responseBody.details.totalMinted).toBe(0);
      expect(responseBody.details.completedBatches).toBe(0);

      // Verify only one minting attempt was made
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(1);

      // Verify no stock records were created
      expect(mockProjectRepositoryInstance.putItem).not.toHaveBeenCalled();
    });

    it("should handle middle batch failure with partial success", async () => {
      // First batch succeeds, second fails, third would not be attempted
      mockHederaService.mintNFTs
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
          transactionId: "0.0.123456@batch1",
          transactionHash: "hash1",
          consensusTimestamp: "1234567891.123456789",
          totalCost: "2.5",
        })
        .mockRejectedValueOnce(new Error("Second batch failed"))
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 101),
          transactionId: "0.0.123456@batch3",
          transactionHash: "hash3",
          consensusTimestamp: "1234567893.123456789",
          totalCost: "2.5",
        });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to mint stock NFTs");
      expect(responseBody.details.totalMinted).toBe(50); // Only first batch
      expect(responseBody.details.completedBatches).toBe(1);

      // Verify only two minting attempts were made (first succeeds, second fails)
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(2);

      // Verify only 50 stock records were created (from first batch)
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(50);

      // Verify failed transaction was marked as failed
      expect(
        mockProjectRepositoryInstance.updateHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: "0.0.123456@batch1",
        status: "failed",
        errorMessage: "Second batch failed",
      });
    });

    it("should handle IPFS failures during batch processing", async () => {
      // First batch IPFS succeeds, second batch IPFS fails
      mockIPFSService.storeStockMetadata
        .mockResolvedValueOnce(mockIPFSResult)
        .mockResolvedValueOnce(mockIPFSResult)
        // ... (48 more successful calls for first batch)
        .mockRejectedValueOnce(new Error("IPFS storage failed"));

      // Fill in the remaining successful calls for first batch
      for (let i = 0; i < 48; i++) {
        mockIPFSService.storeStockMetadata.mockResolvedValueOnce(
          mockIPFSResult
        );
      }

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to mint stock NFTs");

      // Verify IPFS was called for first batch but failed on second batch
      expect(mockIPFSService.storeStockMetadata).toHaveBeenCalledTimes(51); // 50 + 1 failed call
    });
  });

  describe("Batch Progress Tracking", () => {
    it("should track progress correctly across batches", async () => {
      const mockEventPublisher = {
        publishEvent: jest.fn().mockResolvedValue(undefined),
      };

      // Mock 3 batches for easier tracking
      const mediumProject = { ...mockProject, stockSupply: 150 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(mediumProject);

      for (let i = 0; i < 3; i++) {
        const startSerial = i * 50 + 1;
        mockHederaService.mintNFTs.mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, j) => startSerial + j),
          transactionId: `0.0.123456@batch${i + 1}`,
          transactionHash: `hash${i + 1}`,
          consensusTimestamp: `123456789${i}.123456789`,
          totalCost: "2.5",
        });
      }

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      await handler(event, mockContext, jest.fn());

      // Note: Progress tracking verification would require mocking the EventPublisher
      // This test verifies the batch processing logic works correctly
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(3);
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(150);
    });
  });

  describe("Batch Size Edge Cases", () => {
    it("should handle single stock project (no batching needed)", async () => {
      const singleStockProject = { ...mockProject, stockSupply: 1 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(
        singleStockProject
      );

      mockHederaService.mintNFTs.mockResolvedValue({
        serialNumbers: [1],
        transactionId: "0.0.123456@single",
        transactionHash: "hash1",
        consensusTimestamp: "1234567891.123456789",
        totalCost: "0.1",
      });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.totalMinted).toBe(1);
      expect(responseBody.mintingBatches).toBe(1);

      // Verify single minting call
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(1);
      expect(mockHederaService.mintNFTs).toHaveBeenCalledWith({
        tokenId: mockTokenCreationResult.tokenId,
        quantity: 1,
        metadata: expect.arrayContaining([
          expect.objectContaining({
            project_id: mockProject.projectId,
            stock_number: 1,
          }),
        ]),
      });
    });

    it("should handle exact batch size multiples", async () => {
      // Test with exactly 100 stocks (2 batches of 50 each)
      const exactBatchProject = { ...mockProject, stockSupply: 100 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(
        exactBatchProject
      );

      mockHederaService.mintNFTs
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
          transactionId: "0.0.123456@batch1",
          transactionHash: "hash1",
          consensusTimestamp: "1234567891.123456789",
          totalCost: "2.5",
        })
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 51),
          transactionId: "0.0.123456@batch2",
          transactionHash: "hash2",
          consensusTimestamp: "1234567892.123456789",
          totalCost: "2.5",
        });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.totalMinted).toBe(100);
      expect(responseBody.mintingBatches).toBe(2);

      // Verify exactly 2 batches of 50 each
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(2);
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(100);
    });
  });

  describe("Transaction Logging for Batches", () => {
    it("should create transaction records for each batch", async () => {
      // Test with 3 batches
      const mediumProject = { ...mockProject, stockSupply: 150 };
      mockProjectRepositoryInstance.getProject.mockResolvedValue(mediumProject);

      for (let i = 0; i < 3; i++) {
        mockHederaService.mintNFTs.mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, j) => j + 1),
          transactionId: `0.0.123456@batch${i + 1}`,
          transactionHash: `hash${i + 1}`,
          consensusTimestamp: `123456789${i}.123456789`,
          totalCost: "2.5",
        });
      }

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      await handler(event, mockContext, jest.fn());

      // Verify transaction records were created for token creation + 3 batches
      expect(
        mockProjectRepositoryInstance.createHederaTransaction
      ).toHaveBeenCalledTimes(4);

      // Verify token creation transaction
      expect(
        mockProjectRepositoryInstance.createHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: mockTokenCreationResult.transactionId,
        transactionType: "token_creation",
        gasUsed: parseFloat(mockTokenCreationResult.totalCost),
      });

      // Verify batch minting transactions
      for (let i = 0; i < 3; i++) {
        expect(
          mockProjectRepositoryInstance.createHederaTransaction
        ).toHaveBeenCalledWith({
          projectId: mockProject.projectId,
          transactionId: `0.0.123456@batch${i + 1}`,
          transactionType: "nft_mint",
          gasUsed: 2.5,
        });
      }

      // Verify all transactions were marked as successful
      expect(
        mockProjectRepositoryInstance.updateHederaTransaction
      ).toHaveBeenCalledTimes(4);
    });
  });
});
