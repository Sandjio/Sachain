import { BaseRepository, DynamoDBConfig } from "./base-repository";
import {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectQueryOptions,
  QueryResult,
  PaginationOptions,
  ProjectStats,
  HederaTransaction,
  CreateHederaTransactionInput,
  UpdateHederaTransactionInput,
} from "../models";

export class ProjectRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const projectId = this.generateId();
    const timestamp = this.generateTimestamp();

    const project: Project = {
      PK: `PROJECT#${projectId}`,
      SK: "METADATA",
      projectId,
      entrepreneurId: input.entrepreneurId,
      name: input.name,
      description: input.description,
      category: input.category,
      targetFundingGoal: input.targetFundingGoal,
      stockSupply: input.stockSupply,
      pricePerStock: input.pricePerStock,
      coverImageUrl: input.coverImageUrl,
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,

      // GSI3 attributes for project status queries
      GSI3PK: "PROJECT_STATUS#draft",
      GSI3SK: timestamp,
    };

    await this.putItem(project);
    return project;
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<Project | null> {
    return await this.getItem<Project>(`PROJECT#${projectId}`, "METADATA");
  }

  /**
   * Update project (only draft projects can be updated)
   */
  async updateProject(input: UpdateProjectInput): Promise<void> {
    const timestamp = this.generateTimestamp();
    const pk = `PROJECT#${input.projectId}`;
    const sk = "METADATA";

    // Build update expression dynamically
    const updateExpressions: string[] = ["#updatedAt = :updatedAt"];
    const expressionAttributeNames: Record<string, string> = {
      "#updatedAt": "updatedAt",
    };
    const expressionAttributeValues: Record<string, any> = {
      ":updatedAt": timestamp,
    };

    if (input.name !== undefined) {
      updateExpressions.push("#name = :name");
      expressionAttributeNames["#name"] = "name";
      expressionAttributeValues[":name"] = input.name;
    }

    if (input.description !== undefined) {
      updateExpressions.push("#description = :description");
      expressionAttributeNames["#description"] = "description";
      expressionAttributeValues[":description"] = input.description;
    }

    if (input.category !== undefined) {
      updateExpressions.push("#category = :category");
      expressionAttributeNames["#category"] = "category";
      expressionAttributeValues[":category"] = input.category;
    }

    if (input.targetFundingGoal !== undefined) {
      updateExpressions.push("#targetFundingGoal = :targetFundingGoal");
      expressionAttributeNames["#targetFundingGoal"] = "targetFundingGoal";
      expressionAttributeValues[":targetFundingGoal"] = input.targetFundingGoal;
    }

    if (input.pricePerStock !== undefined) {
      updateExpressions.push("#pricePerStock = :pricePerStock");
      expressionAttributeNames["#pricePerStock"] = "pricePerStock";
      expressionAttributeValues[":pricePerStock"] = input.pricePerStock;
    }

    if (input.coverImageUrl !== undefined) {
      updateExpressions.push("#coverImageUrl = :coverImageUrl");
      expressionAttributeNames["#coverImageUrl"] = "coverImageUrl";
      expressionAttributeValues[":coverImageUrl"] = input.coverImageUrl;
    }

    if (input.status !== undefined) {
      updateExpressions.push("#status = :status");
      updateExpressions.push("#GSI3PK = :GSI3PK");
      updateExpressions.push("#GSI3SK = :GSI3SK");

      expressionAttributeNames["#status"] = "status";
      expressionAttributeNames["#GSI3PK"] = "GSI3PK";
      expressionAttributeNames["#GSI3SK"] = "GSI3SK";

      expressionAttributeValues[":status"] = input.status;
      expressionAttributeValues[":GSI3PK"] = `PROJECT_STATUS#${input.status}`;
      expressionAttributeValues[":GSI3SK"] = timestamp;
    }

    const updateExpression = `SET ${updateExpressions.join(", ")}`;

    await this.updateItem(
      pk,
      sk,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.deleteItem(`PROJECT#${projectId}`, "METADATA");
  }

  /**
   * Get projects by status using GSI3
   */
  async getProjectsByStatus(
    status: "draft" | "minting" | "active" | "paused" | "completed",
    options?: PaginationOptions
  ): Promise<QueryResult<Project>> {
    return await this.queryItems<Project>(
      "#GSI3PK = :gsi3pk",
      {
        "#GSI3PK": "GSI3PK",
      },
      {
        ":gsi3pk": `PROJECT_STATUS#${status}`,
      },
      "GSI3", // Index name
      options
    );
  }

  /**
   * Get projects for a specific entrepreneur
   */
  async getProjectsByEntrepreneur(
    entrepreneurId: string,
    options?: PaginationOptions
  ): Promise<QueryResult<Project>> {
    return await this.scanItems<Project>(
      "#entrepreneurId = :entrepreneurId AND #SK = :sk",
      {
        "#entrepreneurId": "entrepreneurId",
        "#SK": "SK",
      },
      {
        ":entrepreneurId": entrepreneurId,
        ":sk": "METADATA",
      },
      options
    );
  }

  /**
   * Get projects with filtering and pagination
   */
  async getProjects(
    options?: ProjectQueryOptions
  ): Promise<QueryResult<Project>> {
    // If status is specified, use GSI3 for efficient querying
    if (options?.status) {
      return await this.getProjectsByStatus(options.status, {
        limit: options.limit,
        exclusiveStartKey: options.exclusiveStartKey,
      });
    }

    // If entrepreneur ID is specified, filter by entrepreneur
    if (options?.entrepreneurId) {
      return await this.getProjectsByEntrepreneur(options.entrepreneurId, {
        limit: options.limit,
        exclusiveStartKey: options.exclusiveStartKey,
      });
    }

    // Otherwise, scan all projects (use sparingly)
    return await this.scanItems<Project>(
      "#SK = :sk",
      {
        "#SK": "SK",
      },
      {
        ":sk": "METADATA",
      },
      {
        limit: options?.limit,
        exclusiveStartKey: options?.exclusiveStartKey,
      }
    );
  }

  /**
   * Check if project exists
   */
  async projectExists(projectId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    return project !== null;
  }

  /**
   * Get project statistics
   */
  async getProjectStats(projectId: string): Promise<ProjectStats | null> {
    return await this.getItem<ProjectStats>(`PROJECT#${projectId}`, "STATS");
  }

  /**
   * Create or update project statistics
   */
  async updateProjectStats(stats: ProjectStats): Promise<void> {
    const timestamp = this.generateTimestamp();
    const statsWithTimestamp = {
      ...stats,
      lastUpdated: timestamp,
    };

    await this.putItem(statsWithTimestamp);
  }

  /**
   * Create Hedera transaction record
   */
  async createHederaTransaction(
    input: CreateHederaTransactionInput
  ): Promise<HederaTransaction> {
    const timestamp = this.generateTimestamp();

    const transaction: HederaTransaction = {
      PK: `PROJECT#${input.projectId}`,
      SK: `HEDERA_TX#${input.transactionId}`,
      projectId: input.projectId,
      transactionId: input.transactionId,
      transactionType: input.transactionType,
      status: "pending",
      gasUsed: input.gasUsed,
      timestamp,
    };

    await this.putItem(transaction);
    return transaction;
  }

  /**
   * Update Hedera transaction
   */
  async updateHederaTransaction(
    input: UpdateHederaTransactionInput
  ): Promise<void> {
    const pk = `PROJECT#${input.projectId}`;
    const sk = `HEDERA_TX#${input.transactionId}`;

    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (input.status !== undefined) {
      updateExpressions.push("#status = :status");
      expressionAttributeNames["#status"] = "status";
      expressionAttributeValues[":status"] = input.status;
    }

    if (input.gasUsed !== undefined) {
      updateExpressions.push("#gasUsed = :gasUsed");
      expressionAttributeNames["#gasUsed"] = "gasUsed";
      expressionAttributeValues[":gasUsed"] = input.gasUsed;
    }

    if (input.errorMessage !== undefined) {
      updateExpressions.push("#errorMessage = :errorMessage");
      expressionAttributeNames["#errorMessage"] = "errorMessage";
      expressionAttributeValues[":errorMessage"] = input.errorMessage;
    }

    if (updateExpressions.length === 0) {
      return; // No updates to make
    }

    const updateExpression = `SET ${updateExpressions.join(", ")}`;

    await this.updateItem(
      pk,
      sk,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );
  }

  /**
   * Get Hedera transaction
   */
  async getHederaTransaction(
    projectId: string,
    transactionId: string
  ): Promise<HederaTransaction | null> {
    return await this.getItem<HederaTransaction>(
      `PROJECT#${projectId}`,
      `HEDERA_TX#${transactionId}`
    );
  }

  /**
   * Get all Hedera transactions for a project
   */
  async getProjectHederaTransactions(
    projectId: string,
    options?: PaginationOptions
  ): Promise<QueryResult<HederaTransaction>> {
    return await this.queryItems<HederaTransaction>(
      "#PK = :pk AND begins_with(#SK, :skPrefix)",
      {
        "#PK": "PK",
        "#SK": "SK",
      },
      {
        ":pk": `PROJECT#${projectId}`,
        ":skPrefix": "HEDERA_TX#",
      },
      undefined, // No index needed for this query
      options
    );
  }

  /**
   * Batch get projects
   */
  async batchGetProjects(projectIds: string[]): Promise<Project[]> {
    const keys = projectIds.map((projectId) => ({
      PK: `PROJECT#${projectId}`,
      SK: "METADATA",
    }));

    return await this.batchGetItems<Project>(keys);
  }

  /**
   * Get projects count by status
   */
  async getProjectsCountByStatus(
    status: "draft" | "minting" | "active" | "paused" | "completed"
  ): Promise<number> {
    const result = await this.queryItems<Project>(
      "#GSI3PK = :gsi3pk",
      {
        "#GSI3PK": "GSI3PK",
      },
      {
        ":gsi3pk": `PROJECT_STATUS#${status}`,
      },
      "GSI3"
    );

    return result.count;
  }

  /**
   * Check if entrepreneur owns project
   */
  async isProjectOwner(
    projectId: string,
    entrepreneurId: string
  ): Promise<boolean> {
    const project = await this.getProject(projectId);
    return project?.entrepreneurId === entrepreneurId;
  }

  /**
   * Create stock NFT record
   */
  async createStockNFT(stockNFT: any): Promise<void> {
    await this.putItem(stockNFT);
  }

  /**
   * Get all Hedera transactions for a project (alias for compatibility)
   */
  async getHederaTransactions(
    projectId: string,
    options?: PaginationOptions
  ): Promise<HederaTransaction[]> {
    const result = await this.getProjectHederaTransactions(projectId, options);
    return result.items;
  }

  /**
   * Delete a specific item by PK and SK (public method for cascade deletion)
   */
  async deleteItemByKey(pk: string, sk: string): Promise<void> {
    await this.deleteItem(pk, sk);
  }
}
