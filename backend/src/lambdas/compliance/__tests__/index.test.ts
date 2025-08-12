import { handler, retentionHandler, deletionHandler } from "../index";
import { APIGatewayProxyEvent, Context, ScheduledEvent } from "aws-lambda";
import { ComplianceRepository } from "../../../repositories/compliance-repository";
import { AuditLogRepository } from "../../../repositories/audit-log-repository";

// Mock the repositories
jest.mock("../../../repositories/compliance-repository");
jest.mock("../../../repositories/audit-log-repository");
jest.mock("../../../repositories/user-repository");
jest.mock("../../../repositories/kyc-document-repository");

const mockComplianceRepo = ComplianceRepository as jest.MockedClass<typeof ComplianceRepository>;
const mockAuditRepo = AuditLogRepository as jest.MockedClass<typeof AuditLogRepository>;

describe("Compliance Lambda", () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;
  let mockContext: Partial<Context>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEvent = {
      requestContext: {
        requestId: "test-request-id",
        identity: { sourceIp: "192.168.1.1" },
      } as any,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Authorization: "Bearer token",
      },
      httpMethod: "POST",
      path: "/consent",
      body: JSON.stringify({
        consentType: "data_processing",
        granted: true,
        version: "1.0",
      }),
    };

    mockContext = {
      requestId: "test-request-id",
    };

    // Setup default mocks
    mockComplianceRepo.prototype.updateConsent = jest.fn().mockResolvedValue({
      userId: "user-placeholder",
      consentType: "data_processing",
      granted: true,
    });

    mockComplianceRepo.prototype.createComplianceEvent = jest.fn().mockResolvedValue({
      eventType: "consent_granted",
      userId: "user-placeholder",
    });

    mockAuditRepo.prototype.createAuditLog = jest.fn().mockResolvedValue({
      userId: "user-placeholder",
      action: "compliance_consent",
    });
  });

  describe("Consent Management", () => {
    it("should handle consent update successfully", async () => {
      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {});

      expect(result.statusCode).toBe(200);
      expect(mockComplianceRepo.prototype.updateConsent).toHaveBeenCalledWith(
        "user-placeholder",
        "data_processing",
        true,
        "192.168.1.1",
        "Mozilla/5.0"
      );
      expect(mockComplianceRepo.prototype.createComplianceEvent).toHaveBeenCalled();
      expect(mockAuditRepo.prototype.createAuditLog).toHaveBeenCalled();
    });

    it("should handle missing consent type", async () => {
      mockEvent.body = JSON.stringify({ granted: true });

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {});

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Missing required fields");
    });

    it("should get user consents", async () => {
      mockEvent.httpMethod = "GET";
      mockEvent.path = "/consent";
      mockEvent.body = null;

      mockComplianceRepo.prototype.getUserConsents = jest.fn().mockResolvedValue([
        {
          consentType: "data_processing",
          granted: true,
        },
      ]);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {});

      expect(result.statusCode).toBe(200);
      expect(mockComplianceRepo.prototype.getUserConsents).toHaveBeenCalledWith("user-placeholder");
    });
  });

  describe("Data Export", () => {
    it("should handle data export request", async () => {
      mockEvent.path = "/data-export";
      mockEvent.body = JSON.stringify({});

      const mockUserData = {
        profile: { userId: "user-placeholder" },
        consents: [],
        kycDocuments: [],
        auditLogs: [],
        complianceEvents: [],
      };

      mockComplianceRepo.prototype.exportUserData = jest.fn().mockResolvedValue(mockUserData);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {});

      expect(result.statusCode).toBe(200);
      expect(mockComplianceRepo.prototype.exportUserData).toHaveBeenCalledWith("user-placeholder");
      expect(mockComplianceRepo.prototype.createComplianceEvent).toHaveBeenCalledWith({
        eventType: "data_exported",
        userId: "user-placeholder",
        details: expect.objectContaining({
          exportedDataTypes: ["profile", "consents", "kycDocuments", "auditLogs", "complianceEvents"],
        }),
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        legalBasis: "legitimate_interest",
      });
    });
  });

  describe("Data Deletion", () => {
    it("should handle data deletion request", async () => {
      mockEvent.path = "/data-deletion";
      mockEvent.body = JSON.stringify({
        dataTypes: ["profile", "kyc_documents"],
        reason: "user_request",
      });

      const mockDeletionRequest = {
        requestId: "req123",
        userId: "user-placeholder",
        status: "pending",
      };

      mockComplianceRepo.prototype.createDeletionRequest = jest.fn().mockResolvedValue(mockDeletionRequest);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {});

      expect(result.statusCode).toBe(200);
      expect(mockComplianceRepo.prototype.createDeletionRequest).toHaveBeenCalledWith({
        userId: "user-placeholder",
        requestedBy: "user-placeholder",
        reason: "user_request",
        dataTypes: ["profile", "kyc_documents"],
        scheduledFor: undefined,
      });
    });

    it("should handle missing data types", async () => {
      mockEvent.path = "/data-deletion";
      mockEvent.body = JSON.stringify({ reason: "user_request" });

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {});

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Missing required fields");
    });
  });

  describe("Retention Policies", () => {
    it("should get retention policies", async () => {
      mockEvent.httpMethod = "GET";
      mockEvent.path = "/retention-policies";
      mockEvent.body = null;

      const mockPolicies = [
        {
          dataType: "audit_logs",
          retentionPeriodDays: 365,
          autoDeleteEnabled: true,
        },
      ];

      mockComplianceRepo.prototype.getAllRetentionPolicies = jest.fn().mockResolvedValue(mockPolicies);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.policies).toEqual(mockPolicies);
    });
  });

  describe("Error Handling", () => {
    it("should handle repository errors", async () => {
      mockComplianceRepo.prototype.updateConsent = jest.fn().mockRejectedValue(new Error("Database error"));

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {});

      expect(result.statusCode).toBe(500);
      expect(mockAuditRepo.prototype.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          result: "failure",
          errorMessage: "Database error",
        })
      );
    });

    it("should handle unknown endpoints", async () => {
      mockEvent.path = "/unknown";

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext as Context, () => {});

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Endpoint not found");
    });
  });
});

describe("Retention Handler", () => {
  let mockScheduledEvent: ScheduledEvent;

  beforeEach(() => {
    mockScheduledEvent = {
      version: "0",
      id: "test-id",
      "detail-type": "Scheduled Event",
      source: "aws.events",
      account: "123456789012",
      time: "2024-01-01T00:00:00Z",
      region: "us-east-1",
      detail: {},
      resources: [],
    };

    mockComplianceRepo.prototype.applyRetentionPolicies = jest.fn().mockResolvedValue({
      processedPolicies: 2,
      deletedItems: 10,
      errors: [],
    });

    mockComplianceRepo.prototype.createComplianceEvent = jest.fn().mockResolvedValue({});
  });

  it("should apply retention policies successfully", async () => {
    const result = await retentionHandler(mockScheduledEvent);

    expect(result.statusCode).toBe(200);
    expect(result.result.processedPolicies).toBe(2);
    expect(result.result.deletedItems).toBe(10);
    expect(mockComplianceRepo.prototype.applyRetentionPolicies).toHaveBeenCalled();
    expect(mockComplianceRepo.prototype.createComplianceEvent).toHaveBeenCalledWith({
      eventType: "retention_applied",
      userId: "system",
      details: {
        processedPolicies: 2,
        deletedItems: 10,
        errors: [],
      },
      legalBasis: "legal_obligation",
    });
  });

  it("should handle retention policy errors", async () => {
    mockComplianceRepo.prototype.applyRetentionPolicies = jest.fn().mockRejectedValue(new Error("Retention error"));

    await expect(retentionHandler(mockScheduledEvent)).rejects.toThrow("Retention error");
  });
});

describe("Deletion Handler", () => {
  let mockScheduledEvent: ScheduledEvent;

  beforeEach(() => {
    mockScheduledEvent = {
      version: "0",
      id: "test-id",
      "detail-type": "Scheduled Event",
      source: "aws.events",
      account: "123456789012",
      time: "2024-01-01T00:00:00Z",
      region: "us-east-1",
      detail: {},
      resources: [],
    };

    mockComplianceRepo.prototype.getPendingDeletionRequests = jest.fn().mockResolvedValue({
      items: [
        {
          requestId: "req123",
          userId: "user123",
          dataTypes: ["profile"],
        },
      ],
      count: 1,
    });

    mockComplianceRepo.prototype.updateDeletionRequestStatus = jest.fn().mockResolvedValue(undefined);
    mockComplianceRepo.prototype.deleteUserData = jest.fn().mockResolvedValue({
      deletedItems: 1,
      errors: [],
    });
  });

  it("should process deletion requests successfully", async () => {
    const result = await deletionHandler(mockScheduledEvent);

    expect(result.statusCode).toBe(200);
    expect(result.processedRequests).toBe(1);
    expect(mockComplianceRepo.prototype.getPendingDeletionRequests).toHaveBeenCalled();
    expect(mockComplianceRepo.prototype.updateDeletionRequestStatus).toHaveBeenCalledWith(
      "user123",
      "req123",
      "processing"
    );
    expect(mockComplianceRepo.prototype.deleteUserData).toHaveBeenCalledWith("user123", ["profile"]);
    expect(mockComplianceRepo.prototype.updateDeletionRequestStatus).toHaveBeenCalledWith(
      "user123",
      "req123",
      "completed"
    );
  });

  it("should handle deletion errors", async () => {
    mockComplianceRepo.prototype.deleteUserData = jest.fn().mockResolvedValue({
      deletedItems: 0,
      errors: ["Deletion failed"],
    });

    const result = await deletionHandler(mockScheduledEvent);

    expect(result.statusCode).toBe(200);
    expect(mockComplianceRepo.prototype.updateDeletionRequestStatus).toHaveBeenCalledWith(
      "user123",
      "req123",
      "failed",
      "Deletion failed"
    );
  });
});