import { AuditEnhancer } from "../audit-enhancer";
import { AuditLogRepository } from "../../repositories/audit-log-repository";
import { ComplianceRepository } from "../../repositories/compliance-repository";
import { StructuredLogger } from "../structured-logger";

// Mock the repositories and logger
jest.mock("../../repositories/audit-log-repository");
jest.mock("../../repositories/compliance-repository");
jest.mock("../structured-logger");

const mockAuditRepo = AuditLogRepository as jest.MockedClass<typeof AuditLogRepository>;
const mockComplianceRepo = ComplianceRepository as jest.MockedClass<typeof ComplianceRepository>;
const mockLogger = StructuredLogger as jest.MockedClass<typeof StructuredLogger>;

describe("AuditEnhancer", () => {
  let auditEnhancer: AuditEnhancer;
  let auditRepo: jest.Mocked<AuditLogRepository>;
  let complianceRepo: jest.Mocked<ComplianceRepository>;
  let logger: jest.Mocked<StructuredLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    auditRepo = new mockAuditRepo({} as any) as jest.Mocked<AuditLogRepository>;
    complianceRepo = new mockComplianceRepo({} as any) as jest.Mocked<ComplianceRepository>;
    logger = new mockLogger() as jest.Mocked<StructuredLogger>;

    auditEnhancer = new AuditEnhancer(auditRepo, complianceRepo, logger);

    // Setup default mocks
    auditRepo.createAuditLog = jest.fn().mockResolvedValue({
      PK: "AUDIT#2024-01-01",
      SK: "2024-01-01T00:00:00.000Z#user123#login",
      userId: "user123",
      action: "login",
    });

    complianceRepo.createComplianceEvent = jest.fn().mockResolvedValue({
      PK: "COMPLIANCE#2024-01-01",
      SK: "2024-01-01T00:00:00.000Z#data_accessed#user123",
      eventType: "data_accessed",
      userId: "user123",
    });

    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe("logUserAction", () => {
    it("should create audit log for non-sensitive action", async () => {
      const context = {
        userId: "user123",
        action: "login",
        resource: "user_session",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        requestId: "req123",
      };

      const result = await auditEnhancer.logUserAction(
        context,
        "success",
        { loginMethod: "password" }
      );

      expect(result.success).toBe(true);
      expect(result.auditLogId).toBeDefined();
      expect(result.complianceEventId).toBeUndefined(); // Non-sensitive action
      expect(auditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "user123",
        action: "login",
        resource: "user_session",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        errorMessage: undefined,
        details: {
          loginMethod: "password",
          requestId: "req123",
        },
      });
      expect(complianceRepo.createComplianceEvent).not.toHaveBeenCalled();
    });

    it("should create both audit log and compliance event for sensitive action", async () => {
      const context = {
        userId: "user123",
        action: "data_access",
        resource: "user_profile",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      };

      const result = await auditEnhancer.logUserAction(
        context,
        "success",
        { dataType: "profile" }
      );

      expect(result.success).toBe(true);
      expect(result.auditLogId).toBeDefined();
      expect(result.complianceEventId).toBeDefined();
      expect(auditRepo.createAuditLog).toHaveBeenCalled();
      expect(complianceRepo.createComplianceEvent).toHaveBeenCalledWith({
        eventType: "data_accessed",
        userId: "user123",
        details: {
          action: "data_access",
          resource: "user_profile",
          result: "success",
          dataType: "profile",
        },
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        legalBasis: "legitimate_interest",
      });
    });

    it("should handle audit log creation failure", async () => {
      auditRepo.createAuditLog = jest.fn().mockRejectedValue(new Error("Database error"));

      const context = {
        userId: "user123",
        action: "login",
        resource: "user_session",
      };

      const result = await auditEnhancer.logUserAction(context, "success");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to create enhanced audit log",
        expect.objectContaining({
          operation: "AuditEnhancer",
          userId: "user123",
          action: "login",
        }),
        expect.any(Error)
      );
    });
  });

  describe("logDataAccess", () => {
    it("should log data access event", async () => {
      const result = await auditEnhancer.logDataAccess(
        "user123",
        "user_profile",
        "profile_view",
        "192.168.1.1",
        "Mozilla/5.0",
        { section: "personal_info" }
      );

      expect(result.success).toBe(true);
      expect(auditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "user123",
        action: "data_access",
        resource: "user_profile",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        errorMessage: undefined,
        details: {
          dataType: "user_profile",
          accessReason: "profile_view",
          section: "personal_info",
        },
      });
    });
  });

  describe("logAuthentication", () => {
    it("should log successful authentication", async () => {
      const result = await auditEnhancer.logAuthentication(
        "user123",
        "password",
        "success",
        "192.168.1.1",
        "Mozilla/5.0",
        { mfaUsed: true }
      );

      expect(result.success).toBe(true);
      expect(auditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "user123",
        action: "authentication",
        resource: "user_session",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        errorMessage: undefined,
        details: {
          authMethod: "password",
          mfaUsed: true,
        },
      });
    });

    it("should log failed authentication with error message", async () => {
      const result = await auditEnhancer.logAuthentication(
        "user123",
        "password",
        "failure",
        "192.168.1.1",
        "Mozilla/5.0",
        { errorMessage: "Invalid password", attempts: 3 }
      );

      expect(result.success).toBe(true);
      expect(auditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "user123",
        action: "authentication",
        resource: "user_session",
        result: "failure",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        errorMessage: "Invalid password",
        details: {
          authMethod: "password",
          errorMessage: "Invalid password",
          attempts: 3,
        },
      });
    });
  });

  describe("logAdminAction", () => {
    it("should log admin action with target user", async () => {
      const result = await auditEnhancer.logAdminAction(
        "admin123",
        "user456",
        "approve_kyc",
        "kyc_document",
        "success",
        "192.168.1.1",
        "Mozilla/5.0",
        { documentId: "doc123" }
      );

      expect(result.success).toBe(true);
      expect(auditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "admin123",
        action: "admin_approve_kyc",
        resource: "kyc_document",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        errorMessage: undefined,
        details: {
          targetUserId: "user456",
          adminAction: "approve_kyc",
          documentId: "doc123",
        },
      });
    });
  });

  describe("logBulkOperation", () => {
    it("should log multiple operations in bulk", async () => {
      const items = [
        { resource: "user1", result: "success" as const, details: { action: "delete" } },
        { resource: "user2", result: "failure" as const, details: { error: "Not found" } },
      ];

      const results = await auditEnhancer.logBulkOperation(
        "admin123",
        "user_deletion",
        items,
        "192.168.1.1",
        "Mozilla/5.0"
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(auditRepo.createAuditLog).toHaveBeenCalledTimes(2);
      expect(auditRepo.createAuditLog).toHaveBeenNthCalledWith(1, {
        userId: "admin123",
        action: "bulk_user_deletion",
        resource: "user1",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        errorMessage: undefined,
        details: {
          bulkOperation: "user_deletion",
          action: "delete",
        },
      });
    });
  });

  describe("Private methods", () => {
    it("should identify sensitive actions correctly", async () => {
      // Test sensitive action
      const sensitiveContext = {
        userId: "user123",
        action: "kyc_upload",
        resource: "kyc_document",
      };

      await auditEnhancer.logUserAction(sensitiveContext, "success");
      expect(complianceRepo.createComplianceEvent).toHaveBeenCalled();

      // Reset mocks
      jest.clearAllMocks();
      auditRepo.createAuditLog = jest.fn().mockResolvedValue({ SK: "audit123" });

      // Test non-sensitive action
      const nonSensitiveContext = {
        userId: "user123",
        action: "view_dashboard",
        resource: "dashboard",
      };

      await auditEnhancer.logUserAction(nonSensitiveContext, "success");
      expect(complianceRepo.createComplianceEvent).not.toHaveBeenCalled();
    });

    it("should map actions to compliance events correctly", async () => {
      const testCases = [
        { action: "data_export", expectedEvent: "data_exported" },
        { action: "consent_granted", expectedEvent: "consent_granted" },
        { action: "unknown_action", expectedEvent: "data_accessed" },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        auditRepo.createAuditLog = jest.fn().mockResolvedValue({ SK: "audit123" });
        complianceRepo.createComplianceEvent = jest.fn().mockResolvedValue({ SK: "compliance123" });

        await auditEnhancer.logUserAction(
          {
            userId: "user123",
            action: testCase.action,
            resource: "test_resource",
          },
          "success"
        );

        if (testCase.action.includes("data_") || testCase.action.includes("consent_")) {
          expect(complianceRepo.createComplianceEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              eventType: testCase.expectedEvent,
            })
          );
        }
      }
    });

    it("should determine legal basis correctly", async () => {
      const testCases = [
        { action: "authentication", expectedBasis: "contract" },
        { action: "kyc_upload", expectedBasis: "legal_obligation" },
        { action: "data_export", expectedBasis: "legitimate_interest" },
        { action: "consent_granted", expectedBasis: "consent" },
        { action: "unknown_action", expectedBasis: "legitimate_interest" },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        auditRepo.createAuditLog = jest.fn().mockResolvedValue({ SK: "audit123" });
        complianceRepo.createComplianceEvent = jest.fn().mockResolvedValue({ SK: "compliance123" });

        await auditEnhancer.logUserAction(
          {
            userId: "user123",
            action: testCase.action,
            resource: "test_resource",
          },
          "success"
        );

        if (testCase.action === "kyc_upload" || testCase.action === "data_export" || testCase.action === "consent_granted") {
          expect(complianceRepo.createComplianceEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              legalBasis: testCase.expectedBasis,
            })
          );
        }
      }
    });
  });
});