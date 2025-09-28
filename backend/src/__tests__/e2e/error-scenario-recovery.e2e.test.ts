import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler as projectCreationHandler } from "../../lambdas/project-creation/index";
import { handler as stockMintingHandler } from "../../lambdas/stock-minting/index";

jest.mock("../../repositories/project-repository");
jest.mock("../../utils/hedera-service");
jest.mock("../../utils/ipfs-service");
jest.mock("../../utils/jwt-utils");

const mockExtractUserIdFromToken = require("../../utils/jwt-utils").extractUserIdFromToken as jest.MockedFunction<any>;

describe("E2E: Error Scenario and Recovery Testing", () => {
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

  describe("Network Failure Recovery", () => {
    it("should handle Hedera network timeouts with retry", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      const { createHederaService } = require("../../utils/hedera-service");
      const mockHederaService = {
        validateWallet: jest.fn()
          .mockRejectedValueOnce(new Error("Network timeout"))
          .mockRejectedValueOnce(new Error("Network timeout"))
          .mockResolvedValueOnce({
            isValid: true,
            canAffordOperation: true,
            balance: "100.0",
          }),
        createToken: jest.fn().mockResolvedValue({
          tokenId: "0.0.123456",
          transactionId: "tx-123",
        }),
        mintNFTs: jest.fn().mockResolvedValue({
          serialNumbers: [1, 2, 3],
          transactionId: "tx-456",
        }),
      };

      createHederaService.mockReturnValue(mockHederaService);

      const mintingData = {
        walletAddress: "0.0.789012",
      };

      const event = createMockEvent("POST", "/projects/proj-123/mint-stocks", mintingData, { projectId: "proj-123" });
      const result = await stockMintingHandler(event, mockContext);

      // Should eventually succeed after retries
      expect([200, 202]).toContain(result.statusCode);
      expect(mockHederaService.validateWallet).toHaveBeenCalledTimes(3);
    });

    it("should handle IPFS service failures gracefully", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      const { defaultIPFSService } = require("../../utils/ipfs-service");
      defaultIPFSService.storeProjectMetadata
        .mockRejectedValueOnce(new Error("IPFS node unavailable"))
        .mockResolvedValueOnce({
          hash: "QmTest123",
          uri: "ipfs://QmTest123",
        });

      const mintingData = {
        walletAddress: "0.0.789012",
      };

      const event = createMockEvent("POST", "/projects/proj-123/mint-stocks", mintingData, { projectId: "proj-123" });
      const result = await stockMintingHandler(event, mockContext);

      // Should handle IPFS failure and retry
      expect(result.statusCode).toBeLessThan(500);
    });
  });

  describe("Partial Failure Recovery", () => {
    it("should recover from partial stock minting failure", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      const { createHederaService } = require("../../utils/hedera-service");
      const mockHederaService = {
        validateWallet: jest.fn().mockResolvedValue({
          isValid: true,
          canAffordOperation: true,
          balance: "100.0",
        }),
        createToken: jest.fn().mockResolvedValue({
          tokenId: "0.0.123456",
          transactionId: "tx-123",
        }),
        mintNFTs: jest.fn()
          .mockResolvedValueOnce({
            serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
            transactionId: "tx-batch-1",
          })
          .mockRejectedValueOnce(new Error("Batch 2 failed"))
          .mockResolvedValueOnce({
            serialNumbers: Array.from({ length: 50 }, (_, i) => i + 51),
            transactionId: "tx-batch-2-retry",
          }),
      };

      createHederaService.mockReturnValue(mockHederaService);

      const mintingData = {
        walletAddress: "0.0.789012",
      };

      const event = createMockEvent("POST", "/projects/proj-123/mint-stocks", mintingData, { projectId: "proj-123" });
      const result = await stockMintingHandler(event, mockContext);

      // Should complete successfully despite partial failure
      expect([200, 202]).toContain(result.statusCode);
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(3);
    });

    it("should handle database transaction rollback", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      const { ProjectRepository } = require("../../repositories/project-repository");
      const mockProjectRepo = {
        getProject: jest.fn().mockResolvedValue({
          projectId: "proj-123",
          status: "draft",
          stockSupply: 100,
        }),
        updateProject: jest.fn()
          .mockResolvedValueOnce() // First update succeeds
          .mockRejectedValueOnce(new Error("Database error")) // Second update fails
          .mockResolvedValueOnce(), // Rollback succeeds
        createHederaTransaction: jest.fn().mockResolvedValue({}),
      };

      ProjectRepository.mockImplementation(() => mockProjectRepo);

      const projectData = {
        name: "Test Project",
        description: "Test description",
        category: "Technology",
        stockSupply: 100,
      };

      const event = createMockEvent("POST", "/projects", projectData);
      const result = await projectCreationHandler(event, mockContext);

      // Should handle rollback gracefully
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      const response = JSON.parse(result.body);
      expect(response.message).toContain("error");
    });
  });

  describe("Resource Exhaustion Recovery", () => {
    it("should handle insufficient wallet balance gracefully", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      const { createHederaService } = require("../../utils/hedera-service");
      const mockHederaService = {
        validateWallet: jest.fn().mockResolvedValue({
          isValid: true,
          canAffordOperation: false,
          balance: "1.0",
          estimatedGasFee: "10.0",
        }),
      };

      createHederaService.mockReturnValue(mockHederaService);

      const mintingData = {
        walletAddress: "0.0.789012",
      };

      const event = createMockEvent("POST", "/projects/proj-123/mint-stocks", mintingData, { projectId: "proj-123" });
      const result = await stockMintingHandler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const response = JSON.parse(result.body);
      expect(response.code).toBe("INSUFFICIENT_BALANCE");
      expect(response.details.requiredBalance).toBe("10.0");
      expect(response.details.currentBalance).toBe("1.0");
    });

    it("should handle DynamoDB throttling with backoff", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      const { ProjectRepository } = require("../../repositories/project-repository");
      const mockProjectRepo = {
        getProject: jest.fn()
          .mockRejectedValueOnce({ name: "ProvisionedThroughputExceededException" })
          .mockRejectedValueOnce({ name: "ProvisionedThroughputExceededException" })
          .mockResolvedValueOnce({
            projectId: "proj-123",
            status: "draft",
            stockSupply: 100,
          }),
      };

      ProjectRepository.mockImplementation(() => mockProjectRepo);

      const projectData = {
        name: "Test Project",
        description: "Test description",
        category: "Technology",
        stockSupply: 100,
      };

      const event = createMockEvent("POST", "/projects", projectData);
      const result = await projectCreationHandler(event, mockContext);

      // Should eventually succeed after throttling recovery
      expect([200, 201]).toContain(result.statusCode);
      expect(mockProjectRepo.getProject).toHaveBeenCalledTimes(3);
    });
  });

  describe("Data Consistency Recovery", () => {
    it("should maintain consistency during concurrent modifications", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      // Simulate concurrent project updates
      const updatePromises = Array.from({ length: 5 }, (_, index) => {
        const updateData = {
          description: `Updated description ${index}`,
        };

        const event = createMockEvent("PUT", "/projects/proj-123", updateData, { projectId: "proj-123" });
        return projectCreationHandler(event, mockContext);
      });

      const results = await Promise.allSettled(updatePromises);

      // Only one update should succeed, others should fail with conflict
      const successful = results.filter(result => 
        result.status === "fulfilled" && result.value.statusCode === 200
      );
      const conflicts = results.filter(result => 
        result.status === "fulfilled" && result.value.statusCode === 409
      );

      expect(successful.length).toBe(1);
      expect(conflicts.length).toBe(4);
    });

    it("should handle orphaned resources cleanup", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      // Simulate scenario where token is created but project update fails
      const { createHederaService } = require("../../utils/hedera-service");
      const { ProjectRepository } = require("../../repositories/project-repository");

      const mockHederaService = {
        validateWallet: jest.fn().mockResolvedValue({
          isValid: true,
          canAffordOperation: true,
          balance: "100.0",
        }),
        createToken: jest.fn().mockResolvedValue({
          tokenId: "0.0.123456",
          transactionId: "tx-123",
        }),
      };

      const mockProjectRepo = {
        getProject: jest.fn().mockResolvedValue({
          projectId: "proj-123",
          status: "draft",
          stockSupply: 100,
        }),
        updateProject: jest.fn().mockRejectedValue(new Error("Update failed")),
        createHederaTransaction: jest.fn().mockResolvedValue({}),
      };

      createHederaService.mockReturnValue(mockHederaService);
      ProjectRepository.mockImplementation(() => mockProjectRepo);

      const mintingData = {
        walletAddress: "0.0.789012",
      };

      const event = createMockEvent("POST", "/projects/proj-123/mint-stocks", mintingData, { projectId: "proj-123" });
      const result = await stockMintingHandler(event, mockContext);

      // Should handle cleanup of orphaned token
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      expect(mockHederaService.createToken).toHaveBeenCalled();
      expect(mockProjectRepo.updateProject).toHaveBeenCalled();
    });
  });
});