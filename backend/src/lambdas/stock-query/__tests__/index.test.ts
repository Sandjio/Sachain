import { handler } from "../index";
import { StockQueryEvent } from "../types";
import { StockRepository } from "../../../repositories/stock-repository";
import { ProjectRepository } from "../../../repositories/project-repository";
import { UserRepository } from "../../../repositories/user-repository";
import { APIGatewayProxyResult } from "aws-lambda";

// Mock dependencies
jest.mock("../../../repositories/stock-repository");
jest.mock("../../../repositories/project-repository");
jest.mock("../../../repositories/user-repository");
jest.mock("../../../utils/structured-logger", () => ({
  createProjectLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));
jest.mock("../../../utils/jwt-utils");

const mockStockRepository = StockRepository as jest.MockedClass<typeof StockRepository>;
const mockProjectRepository = ProjectRepository as jest.MockedClass<typeof ProjectRepository>;
const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;

// Mock JWT utils
const mockExtractUserIdFromToken = require("../../../utils/jwt-utils").extractUserIdFromToken as jest.Mock;

describe("Stock Query Lambda", () => {
  let mockStockRepo: jest.Mocked<StockRepository>;
  let mockProjectRepo: jest.Mocked<ProjectRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository mocks
    mockStockRepo = {
      getStockNFT: jest.fn(),
      getStocks: jest.fn(),
      getStocksByOwner: jest.fn(),
      getOwnerPortfolio: jest.fn(),
    } as any;

    mockProjectRepo = {
      getProject: jest.fn(),
      batchGetProjects: jest.fn(),
    } as any;

    mockUserRepo = {
      getUserProfile: jest.fn(),
    } as any;

    mockStockRepository.mockImplementation(() => mockStockRepo);
    mockProjectRepository.mockImplementation(() => mockProjectRepo);
    mockUserRepository.mockImplementation(() => mockUserRepo);

    // Mock successful authentication by default
    mockExtractUserIdFromToken.mockReturnValue({
      success: true,
      userId: "user-123",
    });

    // Mock user profile - will be overridden in individual tests as needed
    mockUserRepo.getUserProfile.mockResolvedValue({
      PK: "USER#user-123",
      SK: "PROFILE",
      userId: "user-123",
      email: "test@example.com",
      userType: "investor",
      kycStatus: "approved",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      emailVerified: true,
      GSI1PK: "KYC_STATUS#approved",
      GSI1SK: "2024-01-01T00:00:00.000Z",
    });

    // Set environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.ENVIRONMENT = "test";
    process.env.AWS_REGION = "us-east-1";
  });

  describe("GET /projects/{projectId}/stocks/{stockId}", () => {
    const createStockEvent = (projectId: string, stockId: string): StockQueryEvent => ({
      httpMethod: "GET",
      path: `/projects/${projectId}/stocks/${stockId}`,
      pathParameters: { projectId, stockId },
      queryStringParameters: {},
      headers: {
        Authorization: "Bearer valid-token",
      },
      requestContext: {
        requestId: "test-request-id",
      },
    } as any);

    it("should return stock details successfully", async () => {
      const mockStock = {
        PK: "PROJECT#project-123",
        SK: "STOCK#1",
        projectId: "project-123",
        stockNumber: 1,
        tokenId: "0.0.123456",
        serialNumber: 1,
        ownerWalletAddress: "0x123...abc",
        mintedAt: "2024-01-01T00:00:00.000Z",
        metadataUri: "ipfs://QmHash123",
        status: "minted" as const,
        GSI4PK: "OWNER#0x123...abc",
        GSI4SK: "2024-01-01T00:00:00.000Z",
      };

      const mockProject = {
        PK: "PROJECT#project-123",
        SK: "METADATA",
        projectId: "project-123",
        entrepreneurId: "entrepreneur-123",
        name: "Test Project",
        description: "Test project description",
        category: "technology",
        stockSupply: 100,
        status: "active" as const,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#active",
        GSI3SK: "2024-01-01T00:00:00.000Z",
      };

      mockStockRepo.getStockNFT.mockResolvedValue(mockStock);
      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      const event = createStockEvent("project-123", "1");
      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.stock).toEqual({
        ...mockStock,
        project: {
          name: "Test Project",
          category: "technology",
          status: "active",
        },
      });
    });

    it("should return 404 when stock not found", async () => {
      mockStockRepo.getStockNFT.mockResolvedValue(null);

      const event = createStockEvent("project-123", "999");
      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("STOCK_NOT_FOUND");
    });

    it("should return 403 for unauthorized access", async () => {
      const mockStock = {
        PK: "PROJECT#project-123",
        SK: "STOCK#1",
        projectId: "project-123",
        stockNumber: 1,
        tokenId: "0.0.123456",
        serialNumber: 1,
        ownerWalletAddress: "0x123...abc",
        mintedAt: "2024-01-01T00:00:00.000Z",
        metadataUri: "ipfs://QmHash123",
        status: "minted" as const,
        GSI4PK: "OWNER#0x123...abc",
        GSI4SK: "2024-01-01T00:00:00.000Z",
      };

      const mockProject = {
        PK: "PROJECT#project-123",
        SK: "METADATA",
        projectId: "project-123",
        entrepreneurId: "other-user",
        name: "Test Project",
        description: "Test project description",
        category: "technology",
        stockSupply: 100,
        status: "draft" as const,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-01T00:00:00.000Z",
      };

      mockStockRepo.getStockNFT.mockResolvedValue(mockStock);
      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      const event = createStockEvent("project-123", "1");
      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("UNAUTHORIZED_ACCESS");
    });
  });

  describe("GET /projects/{projectId}/stocks", () => {
    const createProjectStocksEvent = (projectId: string, queryParams = {}): StockQueryEvent => ({
      httpMethod: "GET",
      path: `/projects/${projectId}/stocks`,
      pathParameters: { projectId },
      queryStringParameters: queryParams,
      headers: {
        Authorization: "Bearer valid-token",
      },
      requestContext: {
        requestId: "test-request-id",
      },
    } as any);

    it("should return project stocks successfully", async () => {
      const mockStocks = [
        {
          PK: "PROJECT#project-123",
          SK: "STOCK#1",
          projectId: "project-123",
          stockNumber: 1,
          tokenId: "0.0.123456",
          serialNumber: 1,
          ownerWalletAddress: "0x123...abc",
          mintedAt: "2024-01-01T00:00:00.000Z",
          metadataUri: "ipfs://QmHash1",
          status: "minted" as const,
          GSI4PK: "OWNER#0x123...abc",
          GSI4SK: "2024-01-01T00:00:00.000Z",
        },
        {
          PK: "PROJECT#project-123",
          SK: "STOCK#2",
          projectId: "project-123",
          stockNumber: 2,
          tokenId: "0.0.123456",
          serialNumber: 2,
          ownerWalletAddress: "0x456...def",
          mintedAt: "2024-01-01T00:00:00.000Z",
          metadataUri: "ipfs://QmHash2",
          status: "sold" as const,
          GSI4PK: "OWNER#0x456...def",
          GSI4SK: "2024-01-01T00:00:00.000Z",
        },
      ];

      const mockProject = {
        PK: "PROJECT#project-123",
        SK: "METADATA",
        projectId: "project-123",
        entrepreneurId: "entrepreneur-123",
        name: "Test Project",
        description: "Test project description",
        category: "technology",
        stockSupply: 100,
        status: "active" as const,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#active",
        GSI3SK: "2024-01-01T00:00:00.000Z",
      };

      mockProjectRepo.getProject.mockResolvedValue(mockProject);
      mockStockRepo.getStocks.mockResolvedValue({
        items: mockStocks,
        count: 2,
        lastEvaluatedKey: undefined,
      });

      const event = createProjectStocksEvent("project-123");
      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.stocks).toHaveLength(2);
      expect(body.pagination.count).toBe(2);
    });

    it("should return 404 when project not found", async () => {
      mockProjectRepo.getProject.mockResolvedValue(null);

      const event = createProjectStocksEvent("nonexistent-project");
      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("PROJECT_NOT_FOUND");
    });
  });

  describe("GET /stocks/portfolio", () => {
    const createPortfolioEvent = (queryParams = {}): StockQueryEvent => ({
      httpMethod: "GET",
      path: "/stocks/portfolio",
      pathParameters: {},
      queryStringParameters: queryParams,
      headers: {
        Authorization: "Bearer valid-token",
      },
      requestContext: {
        requestId: "test-request-id",
      },
    } as any);

    it("should return portfolio successfully", async () => {
      const mockPortfolio = {
        totalStocks: 5,
        stocksByProject: {
          "project-123": 3,
          "project-456": 2,
        },
        stocksByStatus: {
          minted: 3,
          sold: 2,
        },
      };

      const mockStocks = [
        {
          PK: "PROJECT#project-123",
          SK: "STOCK#1",
          projectId: "project-123",
          stockNumber: 1,
          tokenId: "0.0.123456",
          serialNumber: 1,
          ownerWalletAddress: "0x123...abc",
          mintedAt: "2024-01-01T00:00:00.000Z",
          metadataUri: "ipfs://QmHash1",
          status: "minted" as const,
          GSI4PK: "OWNER#0x123...abc",
          GSI4SK: "2024-01-01T00:00:00.000Z",
        },
      ];

      mockStockRepo.getOwnerPortfolio.mockResolvedValue(mockPortfolio);
      mockStockRepo.getStocksByOwner.mockResolvedValue({
        items: mockStocks,
        count: 3,
      });

      const event = createPortfolioEvent({ walletAddress: "0x123...abc" });
      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.portfolio.totalStocks).toBe(5);
      expect(body.portfolio.stocks).toHaveLength(1);
    });

    it("should return 400 when wallet address is missing", async () => {
      // Override user profile for this test to ensure proper user type
      mockUserRepo.getUserProfile.mockResolvedValueOnce({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "test@example.com",
        userType: "investor",
        kycStatus: "approved",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        emailVerified: true,
        GSI1PK: "KYC_STATUS#approved",
        GSI1SK: "2024-01-01T00:00:00.000Z",
      });

      const event = createPortfolioEvent({});
      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("INVALID_QUERY_PARAMETERS");
    });
  });

  describe("Query parameter validation", () => {
    const createStocksEvent = (queryParams: any): StockQueryEvent => ({
      httpMethod: "GET",
      path: "/stocks",
      pathParameters: {},
      queryStringParameters: queryParams,
      headers: {
        Authorization: "Bearer valid-token",
      },
      requestContext: {
        requestId: "test-request-id",
      },
    } as any);

    it("should validate status parameter", async () => {
      const event = createStocksEvent({ status: "invalid-status" });
      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("INVALID_QUERY_PARAMETERS");
      expect(body.details.errors).toContain(
        "Invalid status. Must be one of: minted, listed, sold, transferred"
      );
    });

    it("should validate limit parameter", async () => {
      const event = createStocksEvent({ limit: "150" });
      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("INVALID_QUERY_PARAMETERS");
      expect(body.details.errors).toContain(
        "Limit must be a number between 1 and 100"
      );
    });
  });

  describe("Authentication", () => {
    it("should return 401 for missing authentication", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Missing token",
      });

      const event = {
        httpMethod: "GET",
        path: "/stocks",
        pathParameters: {},
        queryStringParameters: {},
        headers: {},
        requestContext: {
          requestId: "test-request-id",
        },
      } as any;

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Authentication failed");
    });
  });

  describe("Error handling", () => {
    it("should handle database errors gracefully", async () => {
      mockStockRepo.getStocks.mockRejectedValue(new Error("Database connection failed"));

      const event = {
        httpMethod: "GET",
        path: "/stocks",
        pathParameters: {},
        queryStringParameters: {},
        headers: {
          Authorization: "Bearer valid-token",
        },
        requestContext: {
          requestId: "test-request-id",
        },
      } as any;

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("DATABASE_ERROR");
    });
  });
});