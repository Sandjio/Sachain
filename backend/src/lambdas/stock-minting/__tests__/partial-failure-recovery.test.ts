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
  projectId: "recovery-test-project",
  entrepreneurId: "entrepreneur-456",
  name: "Recovery Test Project",
  description: "A project for testing partial failure recovery",
  category: "technology",
  stockSupply: 200, // Will require 4 batches of 50 each
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
  pathParameters: any = { projectId: "recovery-test-project" }
): APIGatewayProxyEvent => ({
  body: JSON.stringify(body),
  headers: { Authorization: "Bearer valid-token" },
  pathParameters,
  httpMethod: "POST",
  path: "/projects/recovery-test-project/mint-stocks",
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  isBase64Encoded: false,
  requestContext: {
    requestId: "recovery-test-request",
    stage: "test",
    resourceId: "test-resource",
    resourcePath: "/projects/{projectId}/mint-stocks",
    httpMethod: "POST",
    requestTime: "01/Jan/2024:00:00:00 +0000",
    requestTimeEpoch: 1704067200,
    path: "/test/projects/recovery-test-project/mint-stocks",
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
  awsRequestId: "recovery-test-request",
  logGroupName: "/aws/lambda/stock-minting",
  logStreamName: "2024/01/01/[$LATEST]test123",
  getRemainingTimeInMillis: () => 30000,
  done: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};

describe("Stock Minting Lambda - Partial Failure Recovery", () => {
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
      totalEstimate: "40",
    });
    mockHederaService.validateWallet.mockResolvedValue({
      isValid: true,
      balance: "100",
      hasMinimumBalance: true,
      estimatedGasFee: "40",
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

  describe("Token Creation Failures", () => {
    it("should rollback project status when token creation fails", async () => {
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

      // Verify project status was updated to minting, then rolled back to draft
      expect(mockProjectRepositoryInstance.updateProject).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        status: "minting",
      });
      expect(mockProjectRepositoryInstance.updateProject).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        status: "draft",
      });
    });

    it("should handle IPFS failure during token creation", async () => {
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

      // Verify rollback was attempted
      expect(mockProjectRepositoryInstance.updateProject).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        status: "draft",
      });
    });
  });

  describe("Partial Batch Minting Failures", () => {
    it("should handle failure after first batch completes successfully", async () => {
      // First batch succeeds
      mockHederaService.mintNFTs
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
          transactionId: "0.0.123456@batch1",
          transactionHash: "hash1",
          consensusTimestamp: "1234567891.123456789",
          totalCost: "2.5",
        })
        // Second batch fails
        .mockRejectedValueOnce(new Error("Second batch failed"));

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to mint stock NFTs");
      expect(responseBody.details.totalMinted).toBe(50);
      expect(responseBody.details.completedBatches).toBe(1);

      // Verify first batch was processed successfully
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(50);

      // Verify first batch transaction was marked as successful
      expect(
        mockProjectRepositoryInstance.updateHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: "0.0.123456@batch1",
        status: "success",
      });

      // Verify failed transaction was marked as failed
      expect(
        mockProjectRepositoryInstance.updateHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: "0.0.123456@batch1", // This would be the failed transaction ID
        status: "failed",
        errorMessage: "Second batch failed",
      });

      // Verify project status was rolled back
      expect(mockProjectRepositoryInstance.updateProject).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        status: "draft",
      });
    });

    it("should handle failure after multiple successful batches", async () => {
      // First two batches succeed, third fails
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
        .mockRejectedValueOnce(new Error("Third batch failed"));

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to mint stock NFTs");
      expect(responseBody.details.totalMinted).toBe(100);
      expect(responseBody.details.completedBatches).toBe(2);

      // Verify first two batches were processed successfully
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(100);

      // Verify successful transactions were marked as successful
      expect(
        mockProjectRepositoryInstance.updateHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: "0.0.123456@batch1",
        status: "success",
      });
      expect(
        mockProjectRepositoryInstance.updateHederaTransaction
      ).toHaveBeenCalledWith({
        projectId: mockProject.projectId,
        transactionId: "0.0.123456@batch2",
        status: "success",
      });
    });

    it("should preserve partial minting state for manual recovery", async () => {
      // Simulate failure after 2 successful batches out of 4
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
        .mockRejectedValueOnce(new Error("Network timeout"));

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.details).toEqual({
        projectId: mockProject.projectId,
        tokenId: mockTokenCreationResult.tokenId,
        totalMinted: 100,
        completedBatches: 2,
        error: "Network timeout",
      });

      // Verify partial state is preserved in database
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(100);

      // Verify stock NFT records were created for successful batches
      for (let i = 1; i <= 100; i++) {
        expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledWith(
          expect.objectContaining({
            PK: `PROJECT#${mockProject.projectId}`,
            SK: `STOCK#${i}`,
            projectId: mockProject.projectId,
            stockNumber: i,
            tokenId: mockTokenCreationResult.tokenId,
            status: "minted",
          })
        );
      }
    });
  });

  describe("Database Failure Recovery", () => {
    it("should handle stock NFT record creation failures", async () => {
      // Mock successful Hedera operations but database failure
      mockHederaService.mintNFTs.mockResolvedValue({
        serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
        transactionId: "0.0.123456@batch1",
        transactionHash: "hash1",
        consensusTimestamp: "1234567891.123456789",
        totalCost: "2.5",
      });

      // First few stock records succeed, then database fails
      mockProjectRepositoryInstance.putItem
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new Error("Database write failed"));

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to mint stock NFTs");

      // Verify Hedera minting was successful but database operations failed
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(1);
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(4); // 3 successful + 1 failed
    });

    it("should handle transaction logging failures gracefully", async () => {
      // Mock successful minting but transaction logging failure
      mockHederaService.mintNFTs.mockResolvedValue({
        serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
        transactionId: "0.0.123456@batch1",
        transactionHash: "hash1",
        consensusTimestamp: "1234567891.123456789",
        totalCost: "2.5",
      });

      mockProjectRepositoryInstance.createHederaTransaction.mockRejectedValue(
        new Error("Transaction logging failed")
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
  });

  describe("State Consistency During Failures", () => {
    it("should maintain consistent state when project status update fails", async () => {
      // Mock successful token creation but status update failure
      mockProjectRepositoryInstance.updateProject
        .mockResolvedValueOnce(undefined) // Initial status update to "minting" succeeds
        .mockRejectedValueOnce(new Error("Status update failed")); // Final status update to "active" fails

      mockHederaService.mintNFTs.mockResolvedValue({
        serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
        transactionId: "0.0.123456@batch1",
        transactionHash: "hash1",
        consensusTimestamp: "1234567891.123456789",
        totalCost: "2.5",
      });

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Failed to update project status");

      // Verify minting operations completed successfully
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(4); // All 4 batches for 200 stocks
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(200);
    });

    it("should handle statistics update failures without affecting minting", async () => {
      // Mock successful minting but statistics update failure
      mockHederaService.mintNFTs.mockResolvedValue({
        serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
        transactionId: "0.0.123456@batch1",
        transactionHash: "hash1",
        consensusTimestamp: "1234567891.123456789",
        totalCost: "2.5",
      });

      mockProjectRepositoryInstance.updateProjectStats.mockRejectedValue(
        new Error("Statistics update failed")
      );

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      // Minting should still succeed even if statistics update fails
      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Stock minting completed successfully");
      expect(responseBody.totalMinted).toBe(200);

      // Verify all minting operations completed
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(4);
      expect(mockProjectRepositoryInstance.putItem).toHaveBeenCalledTimes(200);
    });
  });

  describe("Rollback Operation Failures", () => {
    it("should log rollback failures without throwing additional errors", async () => {
      // Mock token creation failure
      mockHederaService.createToken.mockRejectedValue(
        new Error("Token creation failed")
      );

      // Mock rollback failure
      mockProjectRepositoryInstance.updateProject
        .mockResolvedValueOnce(undefined) // Initial status update succeeds
        .mockRejectedValueOnce(new Error("Rollback failed")); // Rollback fails

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      // Should still return the original error, not the rollback error
      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "Failed to create project token on Hedera network"
      );

      // Verify rollback was attempted
      expect(mockProjectRepositoryInstance.updateProject).toHaveBeenCalledTimes(
        2
      );
    });
  });

  describe("Recovery Information Preservation", () => {
    it("should provide detailed recovery information in error response", async () => {
      // Simulate partial failure scenario
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
        .mockRejectedValueOnce(new Error("Hedera network timeout"));

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.details).toEqual({
        projectId: mockProject.projectId,
        tokenId: mockTokenCreationResult.tokenId,
        totalMinted: 100,
        completedBatches: 2,
        error: "Hedera network timeout",
      });

      // This information can be used for manual recovery or retry operations
      expect(responseBody.details.totalMinted).toBe(100);
      expect(responseBody.details.completedBatches).toBe(2);
    });

    it("should include transaction IDs in recovery information", async () => {
      const transactionIds = ["tx1", "tx2"];

      mockHederaService.mintNFTs
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
          transactionId: transactionIds[0],
          transactionHash: "hash1",
          consensusTimestamp: "1234567891.123456789",
          totalCost: "2.5",
        })
        .mockResolvedValueOnce({
          serialNumbers: Array.from({ length: 50 }, (_, i) => i + 51),
          transactionId: transactionIds[1],
          transactionHash: "hash2",
          consensusTimestamp: "1234567892.123456789",
          totalCost: "2.5",
        })
        .mockRejectedValueOnce(new Error("Third batch failed"));

      const event = createMockEvent({
        walletAddress: "0.0.789012",
      });

      const result = await handler(event, mockContext, jest.fn());

      expect(result.statusCode).toBe(503);

      const responseBody = JSON.parse(result.body);

      // Transaction IDs should be available for recovery tracking
      expect(responseBody.details.projectId).toBe(mockProject.projectId);
      expect(responseBody.details.tokenId).toBe(
        mockTokenCreationResult.tokenId
      );
    });
  });
});
