import { StockRepository } from "../stock-repository";
import { StockNFT, CreateStockNFTInput, UpdateStockNFTInput } from "../../models";

// Mock the base repository
jest.mock("../base-repository");

describe("StockRepository", () => {
  let stockRepository: StockRepository;
  let mockPutItem: jest.Mock;
  let mockGetItem: jest.Mock;
  let mockUpdateItem: jest.Mock;
  let mockDeleteItem: jest.Mock;
  let mockQueryItems: jest.Mock;
  let mockScanItems: jest.Mock;
  let mockBatchGetItems: jest.Mock;
  let mockBatchWriteItems: jest.Mock;
  let mockGenerateTimestamp: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock functions
    mockPutItem = jest.fn();
    mockGetItem = jest.fn();
    mockUpdateItem = jest.fn();
    mockDeleteItem = jest.fn();
    mockQueryItems = jest.fn();
    mockScanItems = jest.fn();
    mockBatchGetItems = jest.fn();
    mockBatchWriteItems = jest.fn();
    mockGenerateTimestamp = jest.fn().mockReturnValue("2024-01-01T00:00:00.000Z");

    // Mock the BaseRepository methods
    const BaseRepository = require("../base-repository").BaseRepository;
    BaseRepository.prototype.putItem = mockPutItem;
    BaseRepository.prototype.getItem = mockGetItem;
    BaseRepository.prototype.updateItem = mockUpdateItem;
    BaseRepository.prototype.deleteItem = mockDeleteItem;
    BaseRepository.prototype.queryItems = mockQueryItems;
    BaseRepository.prototype.scanItems = mockScanItems;
    BaseRepository.prototype.batchGetItems = mockBatchGetItems;
    BaseRepository.prototype.batchWriteItems = mockBatchWriteItems;
    BaseRepository.prototype.generateTimestamp = mockGenerateTimestamp;

    stockRepository = new StockRepository({
      tableName: "test-table",
      region: "us-east-1",
    });
  });

  describe("createStockNFT", () => {
    it("should create a stock NFT with correct structure", async () => {
      const input: CreateStockNFTInput = {
        projectId: "project-123",
        stockNumber: 1,
        tokenId: "0.0.123456",
        serialNumber: 1,
        ownerWalletAddress: "0x123...abc",
        metadataUri: "ipfs://QmHash123",
      };

      const result = await stockRepository.createStockNFT(input);

      expect(mockPutItem).toHaveBeenCalledWith({
        PK: "PROJECT#project-123",
        SK: "STOCK#1",
        projectId: "project-123",
        stockNumber: 1,
        tokenId: "0.0.123456",
        serialNumber: 1,
        ownerWalletAddress: "0x123...abc",
        mintedAt: "2024-01-01T00:00:00.000Z",
        metadataUri: "ipfs://QmHash123",
        status: "minted",
        GSI4PK: "OWNER#0x123...abc",
        GSI4SK: "2024-01-01T00:00:00.000Z",
      });

      expect(result).toEqual({
        PK: "PROJECT#project-123",
        SK: "STOCK#1",
        projectId: "project-123",
        stockNumber: 1,
        tokenId: "0.0.123456",
        serialNumber: 1,
        ownerWalletAddress: "0x123...abc",
        mintedAt: "2024-01-01T00:00:00.000Z",
        metadataUri: "ipfs://QmHash123",
        status: "minted",
        GSI4PK: "OWNER#0x123...abc",
        GSI4SK: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("getStockNFT", () => {
    it("should get stock NFT by project ID and stock number", async () => {
      const mockStock: StockNFT = {
        PK: "PROJECT#project-123",
        SK: "STOCK#1",
        projectId: "project-123",
        stockNumber: 1,
        tokenId: "0.0.123456",
        serialNumber: 1,
        ownerWalletAddress: "0x123...abc",
        mintedAt: "2024-01-01T00:00:00.000Z",
        metadataUri: "ipfs://QmHash123",
        status: "minted",
        GSI4PK: "OWNER#0x123...abc",
        GSI4SK: "2024-01-01T00:00:00.000Z",
      };

      mockGetItem.mockResolvedValue(mockStock);

      const result = await stockRepository.getStockNFT("project-123", 1);

      expect(mockGetItem).toHaveBeenCalledWith("PROJECT#project-123", "STOCK#1");
      expect(result).toEqual(mockStock);
    });

    it("should return null when stock does not exist", async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await stockRepository.getStockNFT("project-123", 999);

      expect(result).toBeNull();
    });
  });

  describe("updateStockNFT", () => {
    it("should update stock owner and GSI4 attributes", async () => {
      const input: UpdateStockNFTInput = {
        projectId: "project-123",
        stockNumber: 1,
        ownerWalletAddress: "0x456...def",
      };

      await stockRepository.updateStockNFT(input);

      expect(mockUpdateItem).toHaveBeenCalledWith(
        "PROJECT#project-123",
        "STOCK#1",
        "SET #ownerWalletAddress = :ownerWalletAddress, #GSI4PK = :GSI4PK, #GSI4SK = :GSI4SK",
        {
          "#ownerWalletAddress": "ownerWalletAddress",
          "#GSI4PK": "GSI4PK",
          "#GSI4SK": "GSI4SK",
        },
        {
          ":ownerWalletAddress": "0x456...def",
          ":GSI4PK": "OWNER#0x456...def",
          ":GSI4SK": "2024-01-01T00:00:00.000Z",
        }
      );
    });

    it("should update stock status", async () => {
      const input: UpdateStockNFTInput = {
        projectId: "project-123",
        stockNumber: 1,
        status: "sold",
      };

      await stockRepository.updateStockNFT(input);

      expect(mockUpdateItem).toHaveBeenCalledWith(
        "PROJECT#project-123",
        "STOCK#1",
        "SET #status = :status",
        {
          "#status": "status",
        },
        {
          ":status": "sold",
        }
      );
    });

    it("should not update when no fields provided", async () => {
      const input: UpdateStockNFTInput = {
        projectId: "project-123",
        stockNumber: 1,
      };

      await stockRepository.updateStockNFT(input);

      expect(mockUpdateItem).not.toHaveBeenCalled();
    });
  });

  describe("getProjectStocks", () => {
    it("should get all stocks for a project", async () => {
      const mockResult = {
        items: [
          {
            PK: "PROJECT#project-123",
            SK: "STOCK#1",
            projectId: "project-123",
            stockNumber: 1,
            status: "minted",
          },
        ],
        count: 1,
        lastEvaluatedKey: undefined,
      };

      mockQueryItems.mockResolvedValue(mockResult);

      const result = await stockRepository.getProjectStocks("project-123");

      expect(mockQueryItems).toHaveBeenCalledWith(
        "#PK = :pk AND begins_with(#SK, :skPrefix)",
        {
          "#PK": "PK",
          "#SK": "SK",
        },
        {
          ":pk": "PROJECT#project-123",
          ":skPrefix": "STOCK#",
        },
        undefined,
        {
          limit: undefined,
          exclusiveStartKey: undefined,
        }
      );

      expect(result).toEqual(mockResult);
    });

    it("should filter stocks by status", async () => {
      const mockResult = {
        items: [
          {
            PK: "PROJECT#project-123",
            SK: "STOCK#1",
            projectId: "project-123",
            stockNumber: 1,
            status: "sold",
          },
        ],
        count: 1,
        lastEvaluatedKey: undefined,
      };

      mockQueryItems.mockResolvedValue(mockResult);

      const result = await stockRepository.getProjectStocks("project-123", {
        status: "sold",
      });

      expect(mockQueryItems).toHaveBeenCalledWith(
        "#PK = :pk AND begins_with(#SK, :skPrefix)",
        {
          "#PK": "PK",
          "#SK": "SK",
          "#status": "status",
        },
        {
          ":pk": "PROJECT#project-123",
          ":skPrefix": "STOCK#",
          ":status": "sold",
        },
        undefined,
        {
          limit: undefined,
          exclusiveStartKey: undefined,
        }
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe("getStocksByOwner", () => {
    it("should get stocks by owner using GSI4", async () => {
      const mockResult = {
        items: [
          {
            PK: "PROJECT#project-123",
            SK: "STOCK#1",
            projectId: "project-123",
            stockNumber: 1,
            ownerWalletAddress: "0x123...abc",
            GSI4PK: "OWNER#0x123...abc",
          },
        ],
        count: 1,
        lastEvaluatedKey: undefined,
      };

      mockQueryItems.mockResolvedValue(mockResult);

      const result = await stockRepository.getStocksByOwner("0x123...abc");

      expect(mockQueryItems).toHaveBeenCalledWith(
        "#GSI4PK = :gsi4pk",
        {
          "#GSI4PK": "GSI4PK",
        },
        {
          ":gsi4pk": "OWNER#0x123...abc",
        },
        "GSI4",
        undefined
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe("getOwnerPortfolio", () => {
    it("should aggregate portfolio statistics", async () => {
      const mockStocks = [
        {
          projectId: "project-123",
          status: "minted",
        },
        {
          projectId: "project-123",
          status: "sold",
        },
        {
          projectId: "project-456",
          status: "minted",
        },
      ];

      mockQueryItems.mockResolvedValue({
        items: mockStocks,
        count: 3,
      });

      const result = await stockRepository.getOwnerPortfolio("0x123...abc");

      expect(result).toEqual({
        totalStocks: 3,
        stocksByProject: {
          "project-123": 2,
          "project-456": 1,
        },
        stocksByStatus: {
          minted: 2,
          sold: 1,
        },
      });
    });
  });

  describe("batchCreateStockNFTs", () => {
    it("should batch create multiple stock NFTs", async () => {
      const inputs: CreateStockNFTInput[] = [
        {
          projectId: "project-123",
          stockNumber: 1,
          tokenId: "0.0.123456",
          serialNumber: 1,
          ownerWalletAddress: "0x123...abc",
          metadataUri: "ipfs://QmHash1",
        },
        {
          projectId: "project-123",
          stockNumber: 2,
          tokenId: "0.0.123456",
          serialNumber: 2,
          ownerWalletAddress: "0x123...abc",
          metadataUri: "ipfs://QmHash2",
        },
      ];

      await stockRepository.batchCreateStockNFTs(inputs);

      expect(mockBatchWriteItems).toHaveBeenCalledWith([
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
          status: "minted",
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
          ownerWalletAddress: "0x123...abc",
          mintedAt: "2024-01-01T00:00:00.000Z",
          metadataUri: "ipfs://QmHash2",
          status: "minted",
          GSI4PK: "OWNER#0x123...abc",
          GSI4SK: "2024-01-01T00:00:00.000Z",
        },
      ]);
    });
  });

  describe("stockExists", () => {
    it("should return true when stock exists", async () => {
      mockGetItem.mockResolvedValue({ projectId: "project-123" });

      const result = await stockRepository.stockExists("project-123", 1);

      expect(result).toBe(true);
    });

    it("should return false when stock does not exist", async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await stockRepository.stockExists("project-123", 999);

      expect(result).toBe(false);
    });
  });

  describe("getProjectStockCount", () => {
    it("should return stock count for project", async () => {
      mockQueryItems.mockResolvedValue({ count: 5, items: [] });

      const result = await stockRepository.getProjectStockCount("project-123");

      expect(result).toBe(5);
    });

    it("should return stock count for project with status filter", async () => {
      mockQueryItems.mockResolvedValue({ count: 3, items: [] });

      const result = await stockRepository.getProjectStockCount("project-123", "sold");

      expect(result).toBe(3);
    });
  });

  describe("getOwnerStockCount", () => {
    it("should return stock count for owner", async () => {
      mockQueryItems.mockResolvedValue({ count: 10, items: [] });

      const result = await stockRepository.getOwnerStockCount("0x123...abc");

      expect(result).toBe(10);
    });
  });
});