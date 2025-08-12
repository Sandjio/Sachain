import { ComplianceRepository } from "../compliance-repository";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

const dynamoMock = mockClient(DynamoDBDocumentClient);

describe("ComplianceRepository", () => {
  let repository: ComplianceRepository;

  beforeEach(() => {
    dynamoMock.reset();
    repository = new ComplianceRepository({
      tableName: "test-table",
      region: "us-east-1",
    });
  });

  describe("Consent Management", () => {
    it("should create consent record", async () => {
      dynamoMock.resolves({});

      const result = await repository.createConsent({
        userId: "user123",
        consentType: "data_processing",
        granted: true,
        version: "1.0",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      });

      expect(result.userId).toBe("user123");
      expect(result.consentType).toBe("data_processing");
      expect(result.granted).toBe(true);
      expect(result.grantedAt).toBeDefined();
      expect(result.revokedAt).toBeUndefined();
    });

    it("should create revoked consent record", async () => {
      dynamoMock.resolves({});

      const result = await repository.createConsent({
        userId: "user123",
        consentType: "marketing",
        granted: false,
        version: "1.0",
      });

      expect(result.granted).toBe(false);
      expect(result.grantedAt).toBeUndefined();
      expect(result.revokedAt).toBeDefined();
    });

    it("should get user consents", async () => {
      const mockConsents = [
        {
          PK: "USER#user123",
          SK: "CONSENT#data_processing",
          userId: "user123",
          consentType: "data_processing",
          granted: true,
        },
      ];

      dynamoMock.resolves({ Items: mockConsents, Count: 1 });

      const result = await repository.getUserConsents("user123");

      expect(result).toHaveLength(1);
      expect(result[0].consentType).toBe("data_processing");
    });

    it("should update consent", async () => {
      dynamoMock.resolves({});
      dynamoMock.resolves({
        Item: {
          PK: "USER#user123",
          SK: "CONSENT#data_processing",
          userId: "user123",
          consentType: "data_processing",
          granted: false,
          revokedAt: "2024-01-01T00:00:00.000Z",
        },
      });

      const result = await repository.updateConsent(
        "user123",
        "data_processing",
        false,
        "192.168.1.1",
        "Mozilla/5.0"
      );

      expect(result.granted).toBe(false);
      expect(result.revokedAt).toBeDefined();
    });
  });

  describe("Data Deletion Requests", () => {
    it("should create deletion request", async () => {
      dynamoMock.resolves({});

      const result = await repository.createDeletionRequest({
        userId: "user123",
        requestedBy: "user123",
        reason: "user_request",
        dataTypes: ["profile", "kyc_documents"],
      });

      expect(result.userId).toBe("user123");
      expect(result.status).toBe("pending");
      expect(result.dataTypes).toEqual(["profile", "kyc_documents"]);
      expect(result.requestId).toBeDefined();
    });

    it("should get pending deletion requests", async () => {
      const mockRequests = [
        {
          PK: "USER#user123",
          SK: "DELETION_REQUEST#req123",
          requestId: "req123",
          userId: "user123",
          status: "pending",
        },
      ];

      dynamoMock.resolves({ Items: mockRequests, Count: 1 });

      const result = await repository.getPendingDeletionRequests();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe("pending");
    });

    it("should update deletion request status", async () => {
      dynamoMock.resolves({});

      await repository.updateDeletionRequestStatus(
        "user123",
        "req123",
        "completed"
      );

      expect(dynamoMock.calls()).toHaveLength(1);
    });
  });

  describe("Data Retention Policies", () => {
    it("should create retention policy", async () => {
      dynamoMock.resolves({});

      const result = await repository.createRetentionPolicy(
        "audit_logs",
        365,
        "Audit logs retention",
        "Legal obligation",
        true,
        "admin123"
      );

      expect(result.dataType).toBe("audit_logs");
      expect(result.retentionPeriodDays).toBe(365);
      expect(result.autoDeleteEnabled).toBe(true);
    });

    it("should get all retention policies", async () => {
      const mockPolicies = [
        {
          PK: "POLICY#DATA_RETENTION",
          SK: "audit_logs",
          dataType: "audit_logs",
          retentionPeriodDays: 365,
        },
      ];

      dynamoMock.resolves({ Items: mockPolicies, Count: 1 });

      const result = await repository.getAllRetentionPolicies();

      expect(result).toHaveLength(1);
      expect(result[0].dataType).toBe("audit_logs");
    });
  });

  describe("Compliance Events", () => {
    it("should create compliance event", async () => {
      dynamoMock.resolves({});

      const result = await repository.createComplianceEvent({
        eventType: "consent_granted",
        userId: "user123",
        details: { consentType: "data_processing" },
        ipAddress: "192.168.1.1",
        legalBasis: "consent",
      });

      expect(result.eventType).toBe("consent_granted");
      expect(result.userId).toBe("user123");
      expect(result.details.consentType).toBe("data_processing");
    });

    it("should get compliance events by date", async () => {
      const mockEvents = [
        {
          PK: "COMPLIANCE#2024-01-01",
          SK: "2024-01-01T00:00:00.000Z#consent_granted#user123",
          eventType: "consent_granted",
          userId: "user123",
        },
      ];

      dynamoMock.resolves({ Items: mockEvents, Count: 1 });

      const result = await repository.getComplianceEventsByDate("2024-01-01");

      expect(result.items).toHaveLength(1);
      expect(result.items[0].eventType).toBe("consent_granted");
    });
  });

  describe("Data Export", () => {
    it("should export user data", async () => {
      // Mock profile
      dynamoMock.onCall(0).resolves({
        Item: {
          PK: "USER#user123",
          SK: "PROFILE",
          userId: "user123",
          email: "test@example.com",
        },
      });

      // Mock consents
      dynamoMock.onCall(1).resolves({
        Items: [
          {
            PK: "USER#user123",
            SK: "CONSENT#data_processing",
            consentType: "data_processing",
            granted: true,
          },
        ],
        Count: 1,
      });

      // Mock KYC documents
      dynamoMock.onCall(2).resolves({ Items: [], Count: 0 });

      // Mock audit logs
      dynamoMock.onCall(3).resolves({ Items: [], Count: 0 });

      // Mock compliance events
      dynamoMock.onCall(4).resolves({ Items: [], Count: 0 });

      const result = await repository.exportUserData("user123");

      expect(result.profile.userId).toBe("user123");
      expect(result.consents).toHaveLength(1);
      expect(result.kycDocuments).toHaveLength(0);
      expect(result.auditLogs).toHaveLength(0);
      expect(result.complianceEvents).toHaveLength(0);
    });
  });

  describe("Data Deletion", () => {
    it("should delete user data", async () => {
      // Mock successful deletions
      dynamoMock.resolves({});

      const result = await repository.deleteUserData("user123", ["profile"]);

      expect(result.deletedItems).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle deletion errors", async () => {
      // Mock deletion error
      dynamoMock.rejects(new Error("DynamoDB error"));

      const result = await repository.deleteUserData("user123", ["profile"]);

      expect(result.deletedItems).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("DynamoDB error");
    });
  });

  describe("Retention Policy Enforcement", () => {
    it("should apply retention policies", async () => {
      // Mock policies
      dynamoMock.onCall(0).resolves({
        Items: [
          {
            PK: "POLICY#DATA_RETENTION",
            SK: "audit_logs",
            dataType: "audit_logs",
            retentionPeriodDays: 365,
            autoDeleteEnabled: true,
          },
        ],
        Count: 1,
      });

      // Mock old logs to delete
      dynamoMock.onCall(1).resolves({
        Items: [
          {
            PK: "AUDIT#2023-01-01",
            SK: "2023-01-01T00:00:00.000Z#user123#login",
            timestamp: "2023-01-01T00:00:00.000Z",
          },
        ],
        Count: 1,
      });

      // Mock deletion
      dynamoMock.onCall(2).resolves({});

      const result = await repository.applyRetentionPolicies();

      expect(result.processedPolicies).toBe(1);
      expect(result.deletedItems).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });
});