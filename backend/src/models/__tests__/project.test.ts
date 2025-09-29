// Unit tests for project data models

import {
  Project,
  StockNFT,
  ProjectStats,
  HederaTransaction,
  CreateProjectInput,
  CreateStockNFTInput,
  CreateHederaTransactionInput,
  UpdateProjectInput,
  UpdateStockNFTInput,
  UpdateHederaTransactionInput,
  PROJECT_CATEGORIES,
  PROJECT_VALIDATION_RULES,
  ProjectCategory,
} from "../project";

describe("Project Data Models", () => {
  describe("Project interface", () => {
    it("should have all required properties", () => {
      const project: Project = {
        PK: "PROJECT#proj-123",
        SK: "METADATA",
        projectId: "proj-123",
        entrepreneurId: "user-456",
        name: "My Startup",
        description:
          "A comprehensive description of our innovative startup that aims to revolutionize the industry.",
        category: "technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-01T00:00:00.000Z",
      };

      expect(project.PK).toBe("PROJECT#proj-123");
      expect(project.SK).toBe("METADATA");
      expect(project.projectId).toBe("proj-123");
      expect(project.entrepreneurId).toBe("user-456");
      expect(project.name).toBe("My Startup");
      expect(project.category).toBe("technology");
      expect(project.stockSupply).toBe(1000);
      expect(project.status).toBe("draft");
    });

    it("should support optional properties", () => {
      const project: Project = {
        PK: "PROJECT#proj-123",
        SK: "METADATA",
        projectId: "proj-123",
        entrepreneurId: "user-456",
        name: "My Startup",
        description: "A comprehensive description of our innovative startup.",
        category: "technology",
        stockSupply: 1000,
        targetFundingGoal: 50000,
        pricePerStock: 50.0,
        coverImageUrl: "https://example.com/image.jpg",
        status: "active",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#active",
        GSI3SK: "2024-01-01T00:00:00.000Z",
      };

      expect(project.targetFundingGoal).toBe(50000);
      expect(project.pricePerStock).toBe(50.0);
      expect(project.coverImageUrl).toBe("https://example.com/image.jpg");
    });

    it("should support all valid status values", () => {
      const statuses: Array<Project["status"]> = [
        "draft",
        "minting",
        "active",
        "paused",
        "completed",
      ];

      statuses.forEach((status) => {
        const project: Project = {
          PK: "PROJECT#proj-123",
          SK: "METADATA",
          projectId: "proj-123",
          entrepreneurId: "user-456",
          name: "My Startup",
          description: "A comprehensive description.",
          category: "technology",
          stockSupply: 1000,
          status,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          GSI3PK: `PROJECT_STATUS#${status}`,
          GSI3SK: "2024-01-01T00:00:00.000Z",
        };

        expect(project.status).toBe(status);
      });
    });
  });

  describe("StockNFT interface", () => {
    it("should have all required properties", () => {
      const stock: StockNFT = {
        PK: "PROJECT#proj-123",
        SK: "STOCK#1",
        projectId: "proj-123",
        stockNumber: 1,
        tokenId: "token-456",
        serialNumber: 1,
        ownerWalletAddress: "0x1234567890abcdef",
        mintedAt: "2024-01-01T00:00:00.000Z",
        metadataUri: "ipfs://QmHash123",
        status: "minted",
        GSI4PK: "OWNER#0x1234567890abcdef",
        GSI4SK: "2024-01-01T00:00:00.000Z",
      };

      expect(stock.PK).toBe("PROJECT#proj-123");
      expect(stock.SK).toBe("STOCK#1");
      expect(stock.projectId).toBe("proj-123");
      expect(stock.stockNumber).toBe(1);
      expect(stock.tokenId).toBe("token-456");
      expect(stock.serialNumber).toBe(1);
      expect(stock.ownerWalletAddress).toBe("0x1234567890abcdef");
      expect(stock.metadataUri).toBe("ipfs://QmHash123");
      expect(stock.status).toBe("minted");
    });

    it("should support all valid status values", () => {
      const statuses: Array<StockNFT["status"]> = [
        "minted",
        "listed",
        "sold",
        "transferred",
      ];

      statuses.forEach((status) => {
        const stock: StockNFT = {
          PK: "PROJECT#proj-123",
          SK: "STOCK#1",
          projectId: "proj-123",
          stockNumber: 1,
          tokenId: "token-456",
          serialNumber: 1,
          ownerWalletAddress: "0x1234567890abcdef",
          mintedAt: "2024-01-01T00:00:00.000Z",
          metadataUri: "ipfs://QmHash123",
          status,
          GSI4PK: "OWNER#0x1234567890abcdef",
          GSI4SK: "2024-01-01T00:00:00.000Z",
        };

        expect(stock.status).toBe(status);
      });
    });
  });

  describe("ProjectStats interface", () => {
    it("should have all required properties", () => {
      const stats: ProjectStats = {
        PK: "PROJECT#proj-123",
        SK: "STATS",
        projectId: "proj-123",
        totalStocks: 1000,
        mintedStocks: 500,
        availableStocks: 300,
        soldStocks: 200,
        totalRaised: 10000,
        lastUpdated: "2024-01-01T00:00:00.000Z",
      };

      expect(stats.PK).toBe("PROJECT#proj-123");
      expect(stats.SK).toBe("STATS");
      expect(stats.projectId).toBe("proj-123");
      expect(stats.totalStocks).toBe(1000);
      expect(stats.mintedStocks).toBe(500);
      expect(stats.availableStocks).toBe(300);
      expect(stats.soldStocks).toBe(200);
      expect(stats.totalRaised).toBe(10000);
    });
  });

  describe("HederaTransaction interface", () => {
    it("should have all required properties", () => {
      const transaction: HederaTransaction = {
        PK: "PROJECT#proj-123",
        SK: "HEDERA_TX#tx-456",
        projectId: "proj-123",
        transactionId: "tx-456",
        transactionType: "token_creation",
        status: "success",
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      expect(transaction.PK).toBe("PROJECT#proj-123");
      expect(transaction.SK).toBe("HEDERA_TX#tx-456");
      expect(transaction.projectId).toBe("proj-123");
      expect(transaction.transactionId).toBe("tx-456");
      expect(transaction.transactionType).toBe("token_creation");
      expect(transaction.status).toBe("success");
    });

    it("should support all valid transaction types", () => {
      const types: Array<HederaTransaction["transactionType"]> = [
        "token_creation",
        "nft_mint",
        "nft_transfer",
      ];

      types.forEach((transactionType) => {
        const transaction: HederaTransaction = {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#tx-456",
          projectId: "proj-123",
          transactionId: "tx-456",
          transactionType,
          status: "pending",
          timestamp: "2024-01-01T00:00:00.000Z",
        };

        expect(transaction.transactionType).toBe(transactionType);
      });
    });

    it("should support all valid status values", () => {
      const statuses: Array<HederaTransaction["status"]> = [
        "pending",
        "success",
        "failed",
      ];

      statuses.forEach((status) => {
        const transaction: HederaTransaction = {
          PK: "PROJECT#proj-123",
          SK: "HEDERA_TX#tx-456",
          projectId: "proj-123",
          transactionId: "tx-456",
          transactionType: "token_creation",
          status,
          timestamp: "2024-01-01T00:00:00.000Z",
        };

        expect(transaction.status).toBe(status);
      });
    });

    it("should support optional properties", () => {
      const transaction: HederaTransaction = {
        PK: "PROJECT#proj-123",
        SK: "HEDERA_TX#tx-456",
        projectId: "proj-123",
        transactionId: "tx-456",
        transactionType: "nft_mint",
        status: "failed",
        gasUsed: 100000,
        timestamp: "2024-01-01T00:00:00.000Z",
        errorMessage: "Insufficient balance",
      };

      expect(transaction.gasUsed).toBe(100000);
      expect(transaction.errorMessage).toBe("Insufficient balance");
    });
  });

  describe("Input types", () => {
    it("should support CreateProjectInput", () => {
      const input: CreateProjectInput = {
        entrepreneurId: "user-123",
        name: "My Startup",
        description: "A comprehensive description of our innovative startup.",
        category: "technology",
        stockSupply: 1000,
        targetFundingGoal: 50000,
        pricePerStock: 50.0,
        coverImageUrl: "https://example.com/image.jpg",
      };

      expect(input.entrepreneurId).toBe("user-123");
      expect(input.name).toBe("My Startup");
      expect(input.category).toBe("technology");
      expect(input.stockSupply).toBe(1000);
    });

    it("should support CreateStockNFTInput", () => {
      const input: CreateStockNFTInput = {
        projectId: "proj-123",
        stockNumber: 1,
        tokenId: "token-456",
        serialNumber: 1,
        ownerWalletAddress: "0x1234567890abcdef",
        metadataUri: "ipfs://QmHash123",
      };

      expect(input.projectId).toBe("proj-123");
      expect(input.stockNumber).toBe(1);
      expect(input.tokenId).toBe("token-456");
    });

    it("should support CreateHederaTransactionInput", () => {
      const input: CreateHederaTransactionInput = {
        projectId: "proj-123",
        transactionId: "tx-456",
        transactionType: "token_creation",
        gasUsed: 100000,
      };

      expect(input.projectId).toBe("proj-123");
      expect(input.transactionId).toBe("tx-456");
      expect(input.transactionType).toBe("token_creation");
      expect(input.gasUsed).toBe(100000);
    });
  });

  describe("Update types", () => {
    it("should support UpdateProjectInput", () => {
      const input: UpdateProjectInput = {
        projectId: "proj-123",
        name: "Updated Name",
        status: "active",
      };

      expect(input.projectId).toBe("proj-123");
      expect(input.name).toBe("Updated Name");
      expect(input.status).toBe("active");
    });

    it("should support UpdateStockNFTInput", () => {
      const input: UpdateStockNFTInput = {
        projectId: "proj-123",
        stockNumber: 1,
        ownerWalletAddress: "0xnewowner",
        status: "sold",
      };

      expect(input.projectId).toBe("proj-123");
      expect(input.stockNumber).toBe(1);
      expect(input.ownerWalletAddress).toBe("0xnewowner");
      expect(input.status).toBe("sold");
    });

    it("should support UpdateHederaTransactionInput", () => {
      const input: UpdateHederaTransactionInput = {
        projectId: "proj-123",
        transactionId: "tx-456",
        status: "success",
        gasUsed: 95000,
      };

      expect(input.projectId).toBe("proj-123");
      expect(input.transactionId).toBe("tx-456");
      expect(input.status).toBe("success");
      expect(input.gasUsed).toBe(95000);
    });
  });

  describe("Constants", () => {
    it("should have all project categories", () => {
      expect(PROJECT_CATEGORIES).toContain("technology");
      expect(PROJECT_CATEGORIES).toContain("healthcare");
      expect(PROJECT_CATEGORIES).toContain("finance");
      expect(PROJECT_CATEGORIES).toContain("education");
      expect(PROJECT_CATEGORIES).toContain("retail");
      expect(PROJECT_CATEGORIES).toContain("manufacturing");
      expect(PROJECT_CATEGORIES).toContain("agriculture");
      expect(PROJECT_CATEGORIES).toContain("energy");
      expect(PROJECT_CATEGORIES).toContain("real_estate");
      expect(PROJECT_CATEGORIES).toContain("entertainment");
      expect(PROJECT_CATEGORIES).toContain("transportation");
      expect(PROJECT_CATEGORIES).toContain("food_beverage");
      expect(PROJECT_CATEGORIES).toContain("other");
    });

    it("should have validation rules", () => {
      expect(PROJECT_VALIDATION_RULES.NAME_MIN_LENGTH).toBe(3);
      expect(PROJECT_VALIDATION_RULES.NAME_MAX_LENGTH).toBe(100);
      expect(PROJECT_VALIDATION_RULES.DESCRIPTION_MIN_LENGTH).toBe(50);
      expect(PROJECT_VALIDATION_RULES.DESCRIPTION_MAX_LENGTH).toBe(2000);
      expect(PROJECT_VALIDATION_RULES.MIN_STOCK_SUPPLY).toBe(1);
      expect(PROJECT_VALIDATION_RULES.MAX_STOCK_SUPPLY).toBe(1000000);
      expect(PROJECT_VALIDATION_RULES.MAX_DECIMAL_PLACES).toBe(8);
      expect(PROJECT_VALIDATION_RULES.MAX_FUNDING_GOAL_DECIMAL_PLACES).toBe(2);
    });

    it("should support ProjectCategory type", () => {
      const category: ProjectCategory = "technology";
      expect(category).toBe("technology");

      // This should compile without errors
      const validCategories: ProjectCategory[] = [
        "technology",
        "healthcare",
        "finance",
        "education",
        "retail",
        "manufacturing",
        "agriculture",
        "energy",
        "real_estate",
        "entertainment",
        "transportation",
        "food_beverage",
        "other",
      ];

      expect(validCategories).toHaveLength(13);
    });
  });
});
