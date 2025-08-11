import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { KYCDocumentRepository } from "../kyc-document-repository";
import { CreateKYCDocumentInput, KYCDocument } from "../../models";

// Mock the DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe("KYCDocumentRepository", () => {
  let kycRepository: KYCDocumentRepository;

  beforeEach(() => {
    ddbMock.reset();
    kycRepository = new KYCDocumentRepository({
      tableName: "test-table",
      region: "us-east-1",
    });
  });

  describe("createKYCDocument", () => {
    it("should create a KYC document successfully", async () => {
      // Arrange
      const input: CreateKYCDocumentInput = {
        userId: "user-123",
        documentType: "national_id",
        s3Bucket: "test-bucket",
        s3Key: "documents/user-123/id.jpg",
        originalFileName: "national_id.jpg",
        fileSize: 1024000,
        mimeType: "image/jpeg",
      };

      ddbMock.on(PutCommand).resolves({});

      // Act
      const result = await kycRepository.createKYCDocument(input);

      // Assert
      expect(result).toMatchObject({
        PK: "USER#user-123",
        userId: "user-123",
        documentType: "national_id",
        s3Bucket: "test-bucket",
        s3Key: "documents/user-123/id.jpg",
        originalFileName: "national_id.jpg",
        fileSize: 1024000,
        mimeType: "image/jpeg",
        status: "pending",
        GSI2PK: "DOCUMENT_STATUS#pending",
      });

      expect(result.SK).toMatch(/^KYC#/);
      expect(result.documentId).toBeDefined();
      expect(result.uploadedAt).toBeDefined();
      expect(result.GSI2SK).toBeDefined();

      // Verify DynamoDB was called
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
    });
  });

  describe("getKYCDocument", () => {
    it("should return KYC document when found", async () => {
      // Arrange
      const mockDocument: KYCDocument = {
        PK: "USER#user-123",
        SK: "KYC#doc-456",
        documentId: "doc-456",
        userId: "user-123",
        documentType: "national_id",
        s3Bucket: "test-bucket",
        s3Key: "documents/user-123/id.jpg",
        originalFileName: "national_id.jpg",
        fileSize: 1024000,
        mimeType: "image/jpeg",
        status: "approved",
        uploadedAt: "2023-01-01T00:00:00.000Z",
        reviewedAt: "2023-01-02T00:00:00.000Z",
        reviewedBy: "admin-123",
        reviewComments: "Document approved",
        GSI2PK: "DOCUMENT_STATUS#approved",
        GSI2SK: "2023-01-02T00:00:00.000Z",
      };

      ddbMock.on(GetCommand).resolves({ Item: mockDocument });

      // Act
      const result = await kycRepository.getKYCDocument("user-123", "doc-456");

      // Assert
      expect(result).toEqual(mockDocument);

      // Verify DynamoDB was called with correct parameters
      const getCall = ddbMock.commandCalls(GetCommand)[0];
      expect(getCall.args[0].input.Key).toEqual({
        PK: "USER#user-123",
        SK: "KYC#doc-456",
      });
    });

    it("should return null when document not found", async () => {
      // Arrange
      ddbMock.on(GetCommand).resolves({});

      // Act
      const result = await kycRepository.getKYCDocument(
        "user-123",
        "nonexistent-doc"
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getUserKYCDocuments", () => {
    it("should return all KYC documents for a user", async () => {
      // Arrange
      const mockDocuments: KYCDocument[] = [
        {
          PK: "USER#user-123",
          SK: "KYC#doc-1",
          documentId: "doc-1",
          userId: "user-123",
          documentType: "national_id",
          s3Bucket: "test-bucket",
          s3Key: "documents/user-123/id1.jpg",
          originalFileName: "id1.jpg",
          fileSize: 1024000,
          mimeType: "image/jpeg",
          status: "pending",
          uploadedAt: "2023-01-01T00:00:00.000Z",
          GSI2PK: "DOCUMENT_STATUS#pending",
          GSI2SK: "2023-01-01T00:00:00.000Z",
        },
        {
          PK: "USER#user-123",
          SK: "KYC#doc-2",
          documentId: "doc-2",
          userId: "user-123",
          documentType: "national_id",
          s3Bucket: "test-bucket",
          s3Key: "documents/user-123/id2.jpg",
          originalFileName: "id2.jpg",
          fileSize: 2048000,
          mimeType: "image/jpeg",
          status: "approved",
          uploadedAt: "2023-01-02T00:00:00.000Z",
          GSI2PK: "DOCUMENT_STATUS#approved",
          GSI2SK: "2023-01-02T00:00:00.000Z",
        },
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockDocuments,
        Count: 2,
      });

      // Act
      const result = await kycRepository.getUserKYCDocuments("user-123");

      // Assert
      expect(result.items).toEqual(mockDocuments);
      expect(result.count).toBe(2);

      // Verify query parameters
      const queryCall = ddbMock.commandCalls(QueryCommand)[0];
      expect(queryCall.args[0].input.KeyConditionExpression).toBe(
        "#PK = :pk AND begins_with(#SK, :skPrefix)"
      );
      expect(queryCall.args[0].input.ExpressionAttributeValues).toEqual({
        ":pk": "USER#user-123",
        ":skPrefix": "KYC#",
      });
    });
  });

  describe("updateKYCDocument", () => {
    it("should update KYC document status", async () => {
      // Arrange
      const updateInput = {
        userId: "user-123",
        documentId: "doc-456",
        status: "approved" as const,
        reviewedBy: "admin-123",
        reviewComments: "Document looks good",
      };

      ddbMock.on(UpdateCommand).resolves({});

      // Act
      await kycRepository.updateKYCDocument(updateInput);

      // Assert
      expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
      const updateCall = ddbMock.commandCalls(UpdateCommand)[0];

      expect(updateCall.args[0].input.Key).toEqual({
        PK: "USER#user-123",
        SK: "KYC#doc-456",
      });

      const updateExpression = updateCall.args[0].input.UpdateExpression;
      expect(updateExpression).toContain("#status = :status");
      expect(updateExpression).toContain("#reviewedBy = :reviewedBy");
      expect(updateExpression).toContain("#reviewComments = :reviewComments");
      expect(updateExpression).toContain("#GSI2PK = :GSI2PK");
    });

    it("should handle partial updates", async () => {
      // Arrange
      const updateInput = {
        userId: "user-123",
        documentId: "doc-456",
        reviewComments: "Additional comments",
      };

      ddbMock.on(UpdateCommand).resolves({});

      // Act
      await kycRepository.updateKYCDocument(updateInput);

      // Assert
      const updateCall = ddbMock.commandCalls(UpdateCommand)[0];
      const updateExpression = updateCall.args[0].input.UpdateExpression;

      expect(updateExpression).toContain("#reviewComments = :reviewComments");
      expect(updateExpression).not.toContain("#status");
      expect(updateExpression).not.toContain("#reviewedBy");
    });
  });

  describe("getDocumentsByStatus", () => {
    it("should return documents with specified status", async () => {
      // Arrange
      const mockDocuments: KYCDocument[] = [
        {
          PK: "USER#user-1",
          SK: "KYC#doc-1",
          documentId: "doc-1",
          userId: "user-1",
          documentType: "national_id",
          s3Bucket: "test-bucket",
          s3Key: "documents/user-1/id.jpg",
          originalFileName: "id.jpg",
          fileSize: 1024000,
          mimeType: "image/jpeg",
          status: "pending",
          uploadedAt: "2023-01-01T00:00:00.000Z",
          GSI2PK: "DOCUMENT_STATUS#pending",
          GSI2SK: "2023-01-01T00:00:00.000Z",
        },
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockDocuments,
        Count: 1,
      });

      // Act
      const result = await kycRepository.getDocumentsByStatus("pending");

      // Assert
      expect(result.items).toEqual(mockDocuments);
      expect(result.count).toBe(1);

      // Verify query used GSI2
      const queryCall = ddbMock.commandCalls(QueryCommand)[0];
      expect(queryCall.args[0].input.IndexName).toBe("GSI2");
      expect(queryCall.args[0].input.KeyConditionExpression).toBe(
        "#GSI2PK = :gsi2pk"
      );
      expect(queryCall.args[0].input.ExpressionAttributeValues).toEqual({
        ":gsi2pk": "DOCUMENT_STATUS#pending",
      });
    });
  });

  describe("approveDocument", () => {
    it("should approve a document", async () => {
      // Arrange
      ddbMock.on(UpdateCommand).resolves({});

      // Act
      await kycRepository.approveDocument(
        "user-123",
        "doc-456",
        "admin-123",
        "Approved"
      );

      // Assert
      expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
      const updateCall = ddbMock.commandCalls(UpdateCommand)[0];

      expect(updateCall.args[0].input.ExpressionAttributeValues).toMatchObject({
        ":status": "approved",
        ":reviewedBy": "admin-123",
        ":reviewComments": "Approved",
      });
    });
  });

  describe("rejectDocument", () => {
    it("should reject a document", async () => {
      // Arrange
      ddbMock.on(UpdateCommand).resolves({});

      // Act
      await kycRepository.rejectDocument(
        "user-123",
        "doc-456",
        "admin-123",
        "Invalid document"
      );

      // Assert
      expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
      const updateCall = ddbMock.commandCalls(UpdateCommand)[0];

      expect(updateCall.args[0].input.ExpressionAttributeValues).toMatchObject({
        ":status": "rejected",
        ":reviewedBy": "admin-123",
        ":reviewComments": "Invalid document",
      });
    });
  });

  describe("hasApprovedKYC", () => {
    it("should return true when user has approved KYC", async () => {
      // Arrange
      const mockDocuments: KYCDocument[] = [
        {
          PK: "USER#user-123",
          SK: "KYC#doc-1",
          documentId: "doc-1",
          userId: "user-123",
          documentType: "national_id",
          s3Bucket: "test-bucket",
          s3Key: "documents/user-123/id.jpg",
          originalFileName: "id.jpg",
          fileSize: 1024000,
          mimeType: "image/jpeg",
          status: "approved",
          uploadedAt: "2023-01-01T00:00:00.000Z",
          GSI2PK: "DOCUMENT_STATUS#approved",
          GSI2SK: "2023-01-01T00:00:00.000Z",
        },
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockDocuments,
        Count: 1,
      });

      // Act
      const result = await kycRepository.hasApprovedKYC("user-123");

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when user has no approved KYC", async () => {
      // Arrange
      const mockDocuments: KYCDocument[] = [
        {
          PK: "USER#user-123",
          SK: "KYC#doc-1",
          documentId: "doc-1",
          userId: "user-123",
          documentType: "national_id",
          s3Bucket: "test-bucket",
          s3Key: "documents/user-123/id.jpg",
          originalFileName: "id.jpg",
          fileSize: 1024000,
          mimeType: "image/jpeg",
          status: "pending",
          uploadedAt: "2023-01-01T00:00:00.000Z",
          GSI2PK: "DOCUMENT_STATUS#pending",
          GSI2SK: "2023-01-01T00:00:00.000Z",
        },
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockDocuments,
        Count: 1,
      });

      // Act
      const result = await kycRepository.hasApprovedKYC("user-123");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getDocumentStats", () => {
    it("should return document statistics", async () => {
      // Arrange
      ddbMock
        .on(QueryCommand, {
          IndexName: "GSI2",
          ExpressionAttributeValues: { ":gsi2pk": "DOCUMENT_STATUS#pending" },
        })
        .resolves({ Items: [], Count: 5 })
        .on(QueryCommand, {
          IndexName: "GSI2",
          ExpressionAttributeValues: { ":gsi2pk": "DOCUMENT_STATUS#approved" },
        })
        .resolves({ Items: [], Count: 10 })
        .on(QueryCommand, {
          IndexName: "GSI2",
          ExpressionAttributeValues: { ":gsi2pk": "DOCUMENT_STATUS#rejected" },
        })
        .resolves({ Items: [], Count: 3 });

      // Act
      const result = await kycRepository.getDocumentStats();

      // Assert
      expect(result).toEqual({
        pending: 5,
        approved: 10,
        rejected: 3,
      });

      expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(3);
    });
  });
});
