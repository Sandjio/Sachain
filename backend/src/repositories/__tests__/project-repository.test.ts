import { ProjectRepository } from "../project-repository";
import {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStats,
  HederaTransaction,
  CreateHederaTransactionInput,
  UpdateHederaTransactionInput,
} from "../../models";

// Create a mock class that extends the actual ProjectRepository
class MockProjectRepository extends ProjectRepository {
  public mockPutItem = jest.fn();
  public mockGetItem = jest.fn();
  public mockUpdateItem = jest.fn();
  public mockDeleteItem = jest.fn();
  public mockQueryItems = jest.fn();
  public mockScanItems = jest.fn();
  public mockBatchGetItems = jest.fn();
  public mockGenerateId = jest.fn();
  public mockGenerateTimestamp = jest.fn();

  constructor() {
    super({ tableName: "test-table", region: "us-east-1" });
  }

  protected async putItem<T extends Record<string, any>>(
    item: T
  ): Promise<void> {
    return this.mockPutItem(item);
  }

  protected async getItem<T>(pk: string, sk: string): Promise<T | null> {
    return this.mockGetItem(pk, sk);
  }

  protected async updateItem(
    pk: string,
    sk: string,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<void> {
    return this.mockUpdateItem(
      pk,
      sk,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );
  }

  protected async deleteItem(pk: string, sk: string): Promise<void> {
    return this.mockDeleteItem(pk, sk);
  }

  protected async queryItems<T>(
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    indexName?: string,
    options?: any
  ): Promise<any> {
    return this.mockQueryItems(
      keyConditionExpression,
      expressionAttributeNames,
      expressionAttributeValues,
      indexName,
      options
    );
  }

  protected async scanItems<T>(
    filterExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    options?: any
  ): Promise<any> {
    return this.mockScanItems(
      filterExpression,
      expressionAttributeNames,
      expressionAttributeValues,
      options
    );
  }

  protected async batchGetItems<T>(
    keys: Array<{ PK: string; SK: string }>
  ): Promise<T[]> {
    return this.mockBatchGetItems(keys);
  }

  protected generateId(): string {
    return this.mockGenerateId();
  }

  protected generateTimestamp(): string {
    return this.mockGenerateTimestamp();
  }
}

describe("ProjectRepository", () => {
  let repository: MockProjectRepository;

  beforeEach(() => {
    repository = new MockProjectRepository();

    // Set up default mock implementations
    repository.mockGenerateId.mockReturnValue("test-project-id");
    repository.mockGenerateTimestamp.mockReturnValue(
      "2024-01-01T00:00:00.000Z"
    );
  });

  describe("createProject", () => {
    it("should create a new project with correct structure", async () => {
      const input: CreateProjectInput = {
        entrepreneurId: "entrepreneur-123",
        name: "Test Project",
        description:
          "A test project for unit testing with sufficient length to meet requirements",
        category: "technology",
        targetFundingGoal: 100000,
        stockSupply: 1000,
        pricePerStock: 100,
        coverImageUrl: "https://example.com/image.jpg",
      };

      const result = await repository.createProject(input);

      expect(repository.mockPutItem).toHaveBeenCalledWith({
        PK: "PROJECT#test-project-id",
        SK: "METADATA",
        projectId: "test-project-id",
        entrepreneurId: "entrepreneur-123",
        name: "Test Project",
        description:
          "A test project for unit testing with sufficient length to meet requirements",
        category: "technology",
        targetFundingGoal: 100000,
        stockSupply: 1000,
        pricePerStock: 100,
        coverImageUrl: "https://example.com/image.jpg",
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-01T00:00:00.000Z",
      });

      expect(result.projectId).toBe("test-project-id");
      expect(result.status).toBe("draft");
    });

    it("should create project without optional fields", async () => {
      const input: CreateProjectInput = {
        entrepreneurId: "entrepreneur-123",
        name: "Minimal Project",
        description:
          "A minimal project for testing with sufficient description length to meet requirements",
        category: "technology",
        stockSupply: 100,
      };

      await repository.createProject(input);

      expect(repository.mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          entrepreneurId: "entrepreneur-123",
          name: "Minimal Project",
          stockSupply: 100,
          targetFundingGoal: undefined,
          pricePerStock: undefined,
          coverImageUrl: undefined,
        })
      );
    });
  });

  describe("getProject", () => {
    it("should retrieve project by ID", async () => {
      const mockProject: Project = {
        PK: "PROJECT#test-id",
        SK: "METADATA",
        projectId: "test-id",
        entrepreneurId: "entrepreneur-123",
        name: "Test Project",
        description: "Test description with sufficient length for requirements",
        category: "technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-01T00:00:00.000Z",
      };

      repository.mockGetItem.mockResolvedValue(mockProject);

      const result = await repository.getProject("test-id");

      expect(repository.mockGetItem).toHaveBeenCalledWith(
        "PROJECT#test-id",
        "METADATA"
      );
      expect(result).toEqual(mockProject);
    });

    it("should return null when project not found", async () => {
      repository.mockGetItem.mockResolvedValue(null);

      const result = await repository.getProject("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("updateProject", () => {
    it("should update project with all fields", async () => {
      const input: UpdateProjectInput = {
        projectId: "test-id",
        name: "Updated Project",
        description:
          "Updated description with sufficient length to meet requirements",
        category: "healthcare",
        targetFundingGoal: 200000,
        pricePerStock: 150,
        coverImageUrl: "https://example.com/new-image.jpg",
        status: "active",
      };

      await repository.updateProject(input);

      expect(repository.mockUpdateItem).toHaveBeenCalledWith(
        "PROJECT#test-id",
        "METADATA",
        "SET #updatedAt = :updatedAt, #name = :name, #description = :description, #category = :category, #targetFundingGoal = :targetFundingGoal, #pricePerStock = :pricePerStock, #coverImageUrl = :coverImageUrl, #status = :status, #GSI3PK = :GSI3PK, #GSI3SK = :GSI3SK",
        {
          "#updatedAt": "updatedAt",
          "#name": "name",
          "#description": "description",
          "#category": "category",
          "#targetFundingGoal": "targetFundingGoal",
          "#pricePerStock": "pricePerStock",
          "#coverImageUrl": "coverImageUrl",
          "#status": "status",
          "#GSI3PK": "GSI3PK",
          "#GSI3SK": "GSI3SK",
        },
        {
          ":updatedAt": "2024-01-01T00:00:00.000Z",
          ":name": "Updated Project",
          ":description":
            "Updated description with sufficient length to meet requirements",
          ":category": "healthcare",
          ":targetFundingGoal": 200000,
          ":pricePerStock": 150,
          ":coverImageUrl": "https://example.com/new-image.jpg",
          ":status": "active",
          ":GSI3PK": "PROJECT_STATUS#active",
          ":GSI3SK": "2024-01-01T00:00:00.000Z",
        }
      );
    });

    it("should update only specified fields", async () => {
      const input: UpdateProjectInput = {
        projectId: "test-id",
        name: "Updated Name Only",
      };

      await repository.updateProject(input);

      expect(repository.mockUpdateItem).toHaveBeenCalledWith(
        "PROJECT#test-id",
        "METADATA",
        "SET #updatedAt = :updatedAt, #name = :name",
        {
          "#updatedAt": "updatedAt",
          "#name": "name",
        },
        {
          ":updatedAt": "2024-01-01T00:00:00.000Z",
          ":name": "Updated Name Only",
        }
      );
    });
  });

  describe("deleteProject", () => {
    it("should delete project by ID", async () => {
      await repository.deleteProject("test-id");

      expect(repository.mockDeleteItem).toHaveBeenCalledWith(
        "PROJECT#test-id",
        "METADATA"
      );
    });
  });

  describe("getProjectsByStatus", () => {
    it("should query projects by status using GSI3", async () => {
      const mockProjects = [
        {
          projectId: "project-1",
          status: "active",
        },
        {
          projectId: "project-2",
          status: "active",
        },
      ];

      repository.mockQueryItems.mockResolvedValue({
        items: mockProjects,
        lastEvaluatedKey: undefined,
        count: 2,
      });

      const result = await repository.getProjectsByStatus("active", {
        limit: 10,
      });

      expect(repository.mockQueryItems).toHaveBeenCalledWith(
        "#GSI3PK = :gsi3pk",
        {
          "#GSI3PK": "GSI3PK",
        },
        {
          ":gsi3pk": "PROJECT_STATUS#active",
        },
        "GSI3",
        { limit: 10 }
      );

      expect(result.items).toEqual(mockProjects);
      expect(result.count).toBe(2);
    });
  });

  describe("getProjectsByEntrepreneur", () => {
    it("should scan projects by entrepreneur ID", async () => {
      const mockProjects = [
        {
          projectId: "project-1",
          entrepreneurId: "entrepreneur-123",
        },
      ];

      repository.mockScanItems.mockResolvedValue({
        items: mockProjects,
        lastEvaluatedKey: undefined,
        count: 1,
      });

      const result = await repository.getProjectsByEntrepreneur(
        "entrepreneur-123"
      );

      expect(repository.mockScanItems).toHaveBeenCalledWith(
        "#entrepreneurId = :entrepreneurId AND #SK = :sk",
        {
          "#entrepreneurId": "entrepreneurId",
          "#SK": "SK",
        },
        {
          ":entrepreneurId": "entrepreneur-123",
          ":sk": "METADATA",
        },
        undefined
      );

      expect(result.items).toEqual(mockProjects);
    });
  });

  describe("getProjects", () => {
    it("should use GSI3 when status is specified", async () => {
      repository.mockQueryItems.mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined,
        count: 0,
      });

      await repository.getProjects({ status: "draft" });

      expect(repository.mockQueryItems).toHaveBeenCalledWith(
        "#GSI3PK = :gsi3pk",
        {
          "#GSI3PK": "GSI3PK",
        },
        {
          ":gsi3pk": "PROJECT_STATUS#draft",
        },
        "GSI3",
        {
          limit: undefined,
          exclusiveStartKey: undefined,
        }
      );
    });

    it("should scan by entrepreneur when entrepreneurId is specified", async () => {
      repository.mockScanItems.mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined,
        count: 0,
      });

      await repository.getProjects({ entrepreneurId: "entrepreneur-123" });

      expect(repository.mockScanItems).toHaveBeenCalledWith(
        "#entrepreneurId = :entrepreneurId AND #SK = :sk",
        {
          "#entrepreneurId": "entrepreneurId",
          "#SK": "SK",
        },
        {
          ":entrepreneurId": "entrepreneur-123",
          ":sk": "METADATA",
        },
        {
          limit: undefined,
          exclusiveStartKey: undefined,
        }
      );
    });

    it("should scan all projects when no filters specified", async () => {
      repository.mockScanItems.mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined,
        count: 0,
      });

      await repository.getProjects({});

      expect(repository.mockScanItems).toHaveBeenCalledWith(
        "#SK = :sk",
        {
          "#SK": "SK",
        },
        {
          ":sk": "METADATA",
        },
        {
          limit: undefined,
          exclusiveStartKey: undefined,
        }
      );
    });
  });

  describe("projectExists", () => {
    it("should return true when project exists", async () => {
      repository.mockGetItem.mockResolvedValue({ projectId: "test-id" });

      const result = await repository.projectExists("test-id");

      expect(result).toBe(true);
    });

    it("should return false when project does not exist", async () => {
      repository.mockGetItem.mockResolvedValue(null);

      const result = await repository.projectExists("test-id");

      expect(result).toBe(false);
    });
  });

  describe("getProjectStats", () => {
    it("should retrieve project statistics", async () => {
      const mockStats: ProjectStats = {
        PK: "PROJECT#test-id",
        SK: "STATS",
        projectId: "test-id",
        totalStocks: 1000,
        mintedStocks: 500,
        availableStocks: 500,
        soldStocks: 0,
        totalRaised: 0,
        lastUpdated: "2024-01-01T00:00:00.000Z",
      };

      repository.mockGetItem.mockResolvedValue(mockStats);

      const result = await repository.getProjectStats("test-id");

      expect(repository.mockGetItem).toHaveBeenCalledWith(
        "PROJECT#test-id",
        "STATS"
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe("updateProjectStats", () => {
    it("should update project statistics with timestamp", async () => {
      const stats: ProjectStats = {
        PK: "PROJECT#test-id",
        SK: "STATS",
        projectId: "test-id",
        totalStocks: 1000,
        mintedStocks: 600,
        availableStocks: 400,
        soldStocks: 100,
        totalRaised: 10000,
        lastUpdated: "old-timestamp",
      };

      await repository.updateProjectStats(stats);

      expect(repository.mockPutItem).toHaveBeenCalledWith({
        ...stats,
        lastUpdated: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("createHederaTransaction", () => {
    it("should create Hedera transaction record", async () => {
      const input: CreateHederaTransactionInput = {
        projectId: "test-id",
        transactionId: "hedera-tx-123",
        transactionType: "token_creation",
        gasUsed: 1000,
      };

      const result = await repository.createHederaTransaction(input);

      expect(repository.mockPutItem).toHaveBeenCalledWith({
        PK: "PROJECT#test-id",
        SK: "HEDERA_TX#hedera-tx-123",
        projectId: "test-id",
        transactionId: "hedera-tx-123",
        transactionType: "token_creation",
        status: "pending",
        gasUsed: 1000,
        timestamp: "2024-01-01T00:00:00.000Z",
      });

      expect(result.status).toBe("pending");
    });
  });

  describe("updateHederaTransaction", () => {
    it("should update Hedera transaction with all fields", async () => {
      const input: UpdateHederaTransactionInput = {
        projectId: "test-id",
        transactionId: "hedera-tx-123",
        status: "success",
        gasUsed: 1200,
        errorMessage: undefined,
      };

      await repository.updateHederaTransaction(input);

      expect(repository.mockUpdateItem).toHaveBeenCalledWith(
        "PROJECT#test-id",
        "HEDERA_TX#hedera-tx-123",
        "SET #status = :status, #gasUsed = :gasUsed",
        {
          "#status": "status",
          "#gasUsed": "gasUsed",
        },
        {
          ":status": "success",
          ":gasUsed": 1200,
        }
      );
    });

    it("should handle error message updates", async () => {
      const input: UpdateHederaTransactionInput = {
        projectId: "test-id",
        transactionId: "hedera-tx-123",
        status: "failed",
        errorMessage: "Insufficient balance",
      };

      await repository.updateHederaTransaction(input);

      expect(repository.mockUpdateItem).toHaveBeenCalledWith(
        "PROJECT#test-id",
        "HEDERA_TX#hedera-tx-123",
        "SET #status = :status, #errorMessage = :errorMessage",
        {
          "#status": "status",
          "#errorMessage": "errorMessage",
        },
        {
          ":status": "failed",
          ":errorMessage": "Insufficient balance",
        }
      );
    });

    it("should not update when no fields provided", async () => {
      const input: UpdateHederaTransactionInput = {
        projectId: "test-id",
        transactionId: "hedera-tx-123",
      };

      await repository.updateHederaTransaction(input);

      expect(repository.mockUpdateItem).not.toHaveBeenCalled();
    });
  });

  describe("getHederaTransaction", () => {
    it("should retrieve Hedera transaction", async () => {
      const mockTransaction: HederaTransaction = {
        PK: "PROJECT#test-id",
        SK: "HEDERA_TX#hedera-tx-123",
        projectId: "test-id",
        transactionId: "hedera-tx-123",
        transactionType: "token_creation",
        status: "success",
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      repository.mockGetItem.mockResolvedValue(mockTransaction);

      const result = await repository.getHederaTransaction(
        "test-id",
        "hedera-tx-123"
      );

      expect(repository.mockGetItem).toHaveBeenCalledWith(
        "PROJECT#test-id",
        "HEDERA_TX#hedera-tx-123"
      );
      expect(result).toEqual(mockTransaction);
    });
  });

  describe("getProjectHederaTransactions", () => {
    it("should query all Hedera transactions for a project", async () => {
      const mockTransactions = [
        {
          transactionId: "tx-1",
          transactionType: "token_creation",
        },
        {
          transactionId: "tx-2",
          transactionType: "nft_mint",
        },
      ];

      repository.mockQueryItems.mockResolvedValue({
        items: mockTransactions,
        lastEvaluatedKey: undefined,
        count: 2,
      });

      const result = await repository.getProjectHederaTransactions("test-id");

      expect(repository.mockQueryItems).toHaveBeenCalledWith(
        "#PK = :pk AND begins_with(#SK, :skPrefix)",
        {
          "#PK": "PK",
          "#SK": "SK",
        },
        {
          ":pk": "PROJECT#test-id",
          ":skPrefix": "HEDERA_TX#",
        },
        undefined,
        undefined
      );

      expect(result.items).toEqual(mockTransactions);
    });
  });

  describe("batchGetProjects", () => {
    it("should batch retrieve multiple projects", async () => {
      const projectIds = ["project-1", "project-2"];
      const mockProjects = [
        { projectId: "project-1" },
        { projectId: "project-2" },
      ];

      repository.mockBatchGetItems.mockResolvedValue(mockProjects);

      const result = await repository.batchGetProjects(projectIds);

      expect(repository.mockBatchGetItems).toHaveBeenCalledWith([
        { PK: "PROJECT#project-1", SK: "METADATA" },
        { PK: "PROJECT#project-2", SK: "METADATA" },
      ]);

      expect(result).toEqual(mockProjects);
    });
  });

  describe("getProjectsCountByStatus", () => {
    it("should return count of projects by status", async () => {
      repository.mockQueryItems.mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined,
        count: 5,
      });

      const result = await repository.getProjectsCountByStatus("active");

      expect(repository.mockQueryItems).toHaveBeenCalledWith(
        "#GSI3PK = :gsi3pk",
        {
          "#GSI3PK": "GSI3PK",
        },
        {
          ":gsi3pk": "PROJECT_STATUS#active",
        },
        "GSI3",
        undefined
      );

      expect(result).toBe(5);
    });
  });

  describe("isProjectOwner", () => {
    it("should return true when entrepreneur owns project", async () => {
      const mockProject: Project = {
        PK: "PROJECT#test-id",
        SK: "METADATA",
        projectId: "test-id",
        entrepreneurId: "entrepreneur-123",
        name: "Test Project",
        description: "Test description",
        category: "technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-01T00:00:00.000Z",
      };

      repository.mockGetItem.mockResolvedValue(mockProject);

      const result = await repository.isProjectOwner(
        "test-id",
        "entrepreneur-123"
      );

      expect(result).toBe(true);
    });

    it("should return false when entrepreneur does not own project", async () => {
      const mockProject: Project = {
        PK: "PROJECT#test-id",
        SK: "METADATA",
        projectId: "test-id",
        entrepreneurId: "entrepreneur-123",
        name: "Test Project",
        description: "Test description",
        category: "technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-01T00:00:00.000Z",
      };

      repository.mockGetItem.mockResolvedValue(mockProject);

      const result = await repository.isProjectOwner(
        "test-id",
        "different-entrepreneur"
      );

      expect(result).toBe(false);
    });

    it("should return false when project does not exist", async () => {
      repository.mockGetItem.mockResolvedValue(null);

      const result = await repository.isProjectOwner(
        "non-existent-id",
        "entrepreneur-123"
      );

      expect(result).toBe(false);
    });
  });

  describe("Error scenarios", () => {
    it("should handle DynamoDB errors in createProject", async () => {
      const error = new Error("DynamoDB error");
      repository.mockPutItem.mockRejectedValue(error);

      const input: CreateProjectInput = {
        entrepreneurId: "entrepreneur-123",
        name: "Test Project",
        description: "Test description with sufficient length for requirements",
        category: "technology",
        stockSupply: 1000,
      };

      await expect(repository.createProject(input)).rejects.toThrow(
        "DynamoDB error"
      );
    });

    it("should handle DynamoDB errors in getProject", async () => {
      const error = new Error("DynamoDB error");
      repository.mockGetItem.mockRejectedValue(error);

      await expect(repository.getProject("test-id")).rejects.toThrow(
        "DynamoDB error"
      );
    });

    it("should handle DynamoDB errors in updateProject", async () => {
      const error = new Error("DynamoDB error");
      repository.mockUpdateItem.mockRejectedValue(error);

      const input: UpdateProjectInput = {
        projectId: "test-id",
        name: "Updated Name",
      };

      await expect(repository.updateProject(input)).rejects.toThrow(
        "DynamoDB error"
      );
    });

    it("should handle DynamoDB errors in deleteProject", async () => {
      const error = new Error("DynamoDB error");
      repository.mockDeleteItem.mockRejectedValue(error);

      await expect(repository.deleteProject("test-id")).rejects.toThrow(
        "DynamoDB error"
      );
    });

    it("should handle DynamoDB errors in query operations", async () => {
      const error = new Error("DynamoDB error");
      repository.mockQueryItems.mockRejectedValue(error);

      await expect(repository.getProjectsByStatus("active")).rejects.toThrow(
        "DynamoDB error"
      );
    });

    it("should handle DynamoDB errors in scan operations", async () => {
      const error = new Error("DynamoDB error");
      repository.mockScanItems.mockRejectedValue(error);

      await expect(
        repository.getProjectsByEntrepreneur("entrepreneur-123")
      ).rejects.toThrow("DynamoDB error");
    });
  });
});
