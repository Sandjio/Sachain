import { BaseRepository, DynamoDBConfig } from "./base-repository";
import {
  KYCDocument,
  CreateKYCDocumentInput,
  UpdateKYCDocumentInput,
  QueryResult,
  PaginationOptions,
} from "../models";

export class KYCDocumentRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }

  /**
   * Create a new KYC document
   */
  async createKYCDocument(input: CreateKYCDocumentInput): Promise<KYCDocument> {
    const timestamp = this.generateTimestamp();
    const documentId = this.generateId();

    const kycDocument: KYCDocument = {
      PK: `USER#${input.userId}`,
      SK: `KYC#${documentId}`,
      documentId,
      userId: input.userId,
      documentType: input.documentType,
      s3Bucket: input.s3Bucket,
      s3Key: input.s3Key,
      originalFileName: input.originalFileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      status: "pending",
      uploadedAt: timestamp,

      // GSI2 attributes for document status queries
      GSI2PK: "DOCUMENT_STATUS#pending",
      GSI2SK: timestamp,
    };

    await this.putItem(kycDocument);
    return kycDocument;
  }

  /**
   * Get KYC document by user ID and document ID
   */
  async getKYCDocument(
    userId: string,
    documentId: string
  ): Promise<KYCDocument | null> {
    return await this.getItem<KYCDocument>(
      `USER#${userId}`,
      `KYC#${documentId}`
    );
  }

  /**
   * Get all KYC documents for a user
   */
  async getUserKYCDocuments(
    userId: string,
    options?: PaginationOptions
  ): Promise<QueryResult<KYCDocument>> {
    return await this.queryItems<KYCDocument>(
      "#PK = :pk AND begins_with(#SK, :skPrefix)",
      {
        "#PK": "PK",
        "#SK": "SK",
      },
      {
        ":pk": `USER#${userId}`,
        ":skPrefix": "KYC#",
      },
      undefined, // No index needed for this query
      options
    );
  }

  /**
   * Update KYC document
   */
  async updateKYCDocument(input: UpdateKYCDocumentInput): Promise<void> {
    const timestamp = this.generateTimestamp();
    const pk = `USER#${input.userId}`;
    const sk = `KYC#${input.documentId}`;

    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (input.status !== undefined) {
      updateExpressions.push("#status = :status");
      updateExpressions.push("#reviewedAt = :reviewedAt");
      updateExpressions.push("#GSI2PK = :GSI2PK");
      updateExpressions.push("#GSI2SK = :GSI2SK");

      expressionAttributeNames["#status"] = "status";
      expressionAttributeNames["#reviewedAt"] = "reviewedAt";
      expressionAttributeNames["#GSI2PK"] = "GSI2PK";
      expressionAttributeNames["#GSI2SK"] = "GSI2SK";

      expressionAttributeValues[":status"] = input.status;
      expressionAttributeValues[":reviewedAt"] = timestamp;
      expressionAttributeValues[":GSI2PK"] = `DOCUMENT_STATUS#${input.status}`;
      expressionAttributeValues[":GSI2SK"] = timestamp;
    }

    if (input.reviewedBy !== undefined) {
      updateExpressions.push("#reviewedBy = :reviewedBy");
      expressionAttributeNames["#reviewedBy"] = "reviewedBy";
      expressionAttributeValues[":reviewedBy"] = input.reviewedBy;
    }

    if (input.reviewComments !== undefined) {
      updateExpressions.push("#reviewComments = :reviewComments");
      expressionAttributeNames["#reviewComments"] = "reviewComments";
      expressionAttributeValues[":reviewComments"] = input.reviewComments;
    }

    if (updateExpressions.length === 0) {
      return; // Nothing to update
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
   * Delete KYC document
   */
  async deleteKYCDocument(userId: string, documentId: string): Promise<void> {
    await this.deleteItem(`USER#${userId}`, `KYC#${documentId}`);
  }

  /**
   * Get documents by status
   */
  async getDocumentsByStatus(
    status: "pending" | "approved" | "rejected",
    options?: PaginationOptions
  ): Promise<QueryResult<KYCDocument>> {
    return await this.queryItems<KYCDocument>(
      "#GSI2PK = :gsi2pk",
      {
        "#GSI2PK": "GSI2PK",
      },
      {
        ":gsi2pk": `DOCUMENT_STATUS#${status}`,
      },
      "GSI2", // Index name
      options
    );
  }

  /**
   * Get pending documents for admin review
   */
  async getPendingDocuments(
    options?: PaginationOptions
  ): Promise<QueryResult<KYCDocument>> {
    return await this.getDocumentsByStatus("pending", options);
  }

  /**
   * Get approved documents
   */
  async getApprovedDocuments(
    options?: PaginationOptions
  ): Promise<QueryResult<KYCDocument>> {
    return await this.getDocumentsByStatus("approved", options);
  }

  /**
   * Get rejected documents
   */
  async getRejectedDocuments(
    options?: PaginationOptions
  ): Promise<QueryResult<KYCDocument>> {
    return await this.getDocumentsByStatus("rejected", options);
  }

  /**
   * Approve KYC document
   */
  async approveDocument(
    userId: string,
    documentId: string,
    reviewedBy: string,
    comments?: string
  ): Promise<void> {
    await this.updateKYCDocument({
      userId,
      documentId,
      status: "approved",
      reviewedBy,
      reviewComments: comments,
    });
  }

  /**
   * Reject KYC document
   */
  async rejectDocument(
    userId: string,
    documentId: string,
    reviewedBy: string,
    comments?: string
  ): Promise<void> {
    await this.updateKYCDocument({
      userId,
      documentId,
      status: "rejected",
      reviewedBy,
      reviewComments: comments,
    });
  }

  /**
   * Get user's latest KYC document
   */
  async getLatestKYCDocument(userId: string): Promise<KYCDocument | null> {
    const result = await this.queryItems<KYCDocument>(
      "#PK = :pk AND begins_with(#SK, :skPrefix)",
      {
        "#PK": "PK",
        "#SK": "SK",
      },
      {
        ":pk": `USER#${userId}`,
        ":skPrefix": "KYC#",
      },
      undefined,
      { limit: 1 }
    );

    return result.items.length > 0 ? result.items[0] : null;
  }

  /**
   * Check if user has any approved KYC documents
   */
  async hasApprovedKYC(userId: string): Promise<boolean> {
    const result = await this.queryItems<KYCDocument>(
      "#PK = :pk AND begins_with(#SK, :skPrefix)",
      {
        "#PK": "PK",
        "#SK": "SK",
      },
      {
        ":pk": `USER#${userId}`,
        ":skPrefix": "KYC#",
      },
      undefined,
      { limit: 50 } // Check up to 50 documents
    );

    return result.items.some((doc) => doc.status === "approved");
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const [pending, approved, rejected] = await Promise.all([
      this.getDocumentsByStatus("pending", { limit: 1000 }),
      this.getDocumentsByStatus("approved", { limit: 1000 }),
      this.getDocumentsByStatus("rejected", { limit: 1000 }),
    ]);

    return {
      pending: pending.count,
      approved: approved.count,
      rejected: rejected.count,
    };
  }
}
