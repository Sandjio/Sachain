import { ComplianceService } from "../compliance-service";
import { ComplianceRepository } from "../../repositories/compliance-repository";
import { AuditLogRepository } from "../../repositories/audit-log-repository";
import { StructuredLogger } from "../structured-logger";

// Mock dependencies
jest.mock("../../repositories/compliance-repository");
jest.mock("../../repositories/audit-log-repository");
jest.mock("../structured-logger");

describe("ComplianceService", () => {
  let complianceService: ComplianceService;
  let mockComplianceRepo: jest.Mocked<ComplianceRepository>;
  let mockAuditRepo: jest.Mocked<AuditLogRepository>;
  let mockLogger: jest.Mocked<StructuredLogger>;

  beforeEach(() => {
    mockComplianceRepo = new ComplianceRepository({} as any) as jest.Mocked<ComplianceRepository>;
    mockAuditRepo = new AuditLogRepository({} as any) as jest.Mocked<AuditLogRepository>;
    mockLogger = new StructuredLogger("test") as jest.Mocked<StructuredLogger>;

    complianceService = new ComplianceService(
      mockComplianceRepo,
      mockAuditRepo,
      mockLogger
    );

    // Setup default mocks
    mockAuditRepo.cleanupOldLogs.mockResolvedValue(10);
    mockAuditRepo.getAuditStats.mockResolvedValue({
      total: 100,
      successful: 95,
      failed: 5,
      byAction: {
        project_creation: 20,
        stock_minting: 15,
        authentication: 60,
      },
    });
    mockAuditRepo.getFailedAuditLogs.mockResolvedValue({
      items: [],
      count: 0,
    });
    mockComplianceRepo.createComplianceEvent.mockResolvedValue({
      PK: "COMPLIANCE#2024-01-01",
      SK: "2024-01-01T10:00:00.000Z#data_accessed#user123",
      eventType: "data_accessed",
      userId: "user123",
      timestamp: "2024-01-01T10:00:00.000Z",
      details: {},
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("enforceDataRetention", () => {
    it("should successfully enforce data retention", async () => {
      const result = await complianceService.enforceDataRetention();

      expect(result.auditLogsDeleted).toBe(10);
      expect(result.complianceEventsDeleted).toBe(0);
      expect(result.errors).toHaveLength(0);

      expect(mockAuditRepo.cleanupOldLogs).toHaveBeenCalledWith(2555); // 7 years default
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Data retention enforcement completed",
        expect.objectContaining({
          operation: "ComplianceService",
          auditLogsDeleted: 10,
        })
      );
    });

    it("should handle errors during data retention enforcement", async () => {
      mockAuditRepo.cleanupOldLogs.mockRejectedValue(new Error("Database error"));

      const result = await complianceService.enforceDataRetention();

      expect(result.auditLogsDeleted).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Data retention enforcement failed");
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("generateComplianceReport", () => {
    it("should generate a comprehensive compliance report", async () => {
      const startDate = "2024-01-01";
      const endDate = "2024-01-02";

      const report = await complianceService.generateComplianceReport(startDate, endDate);

      expect(report.period.startDate).toBe(startDate);
      expect(report.period.endDate).toBe(endDate);
      expect(report.metrics.totalAuditLogs).toBe(200); // 100 per day * 2 days
      expect(report.metrics.successfulOperations).toBe(190);
      expect(report.metrics.failedOperations).toBe(10);
      expect(report.metrics.projectsCreated).toBe(40);
      expect(report.metrics.stocksMinted).toBe(30);

      expect(mockAuditRepo.getAuditStats).toHaveBeenCalledTimes(2); // Once per day
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Compliance report generated",
        expect.objectContaining({
          operation: "ComplianceService",
          totalAuditLogs: 200,
        })
      );
    });

    it("should detect high failure rate risk indicator", async () => {
      mockAuditRepo.getAuditStats.mockResolvedValue({
        total: 100,
        successful: 80,
        failed: 20, // 20% failure rate
        byAction: {},
      });

      const report = await complianceService.generateComplianceReport("2024-01-01", "2024-01-01");

      expect(report.riskIndicators.highFailureRate).toBe(true);
    });

    it("should handle errors during report generation", async () => {
      mockAuditRepo.getAuditStats.mockRejectedValue(new Error("Database error"));

      await expect(
        complianceService.generateComplianceReport("2024-01-01", "2024-01-01")
      ).rejects.toThrow("Database error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to generate compliance report",
        expect.objectContaining({
          operation: "ComplianceService",
        }),
        expect.any(Error)
      );
    });
  });

  describe("trackDataAccess", () => {
    it("should successfully track data access", async () => {
      await complianceService.trackDataAccess(
        "user123",
        "project_data",
        "user_request",
        "192.168.1.1",
        "Mozilla/5.0"
      );

      expect(mockComplianceRepo.createComplianceEvent).toHaveBeenCalledWith({
        eventType: "data_accessed",
        userId: "user123",
        details: {
          dataType: "project_data",
          accessReason: "user_request",
          timestamp: expect.any(String),
        },
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        legalBasis: "legitimate_interest",
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Data access tracked",
        expect.objectContaining({
          operation: "ComplianceService",
          userId: "user123",
          dataType: "project_data",
          accessReason: "user_request",
        })
      );
    });

    it("should handle errors during data access tracking", async () => {
      mockComplianceRepo.createComplianceEvent.mockRejectedValue(new Error("Database error"));

      await expect(
        complianceService.trackDataAccess("user123", "project_data", "user_request")
      ).rejects.toThrow("Database error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to track data access",
        expect.objectContaining({
          operation: "ComplianceService",
          userId: "user123",
          dataType: "project_data",
        }),
        expect.any(Error)
      );
    });
  });

  describe("validateRetentionCompliance", () => {
    it("should return compliant status when no violations found", async () => {
      mockAuditRepo.getAuditLogsByDateRange.mockResolvedValue({
        items: [],
        count: 0,
      });

      const result = await complianceService.validateRetentionCompliance();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should detect retention violations", async () => {
      mockAuditRepo.getAuditLogsByDateRange.mockResolvedValue({
        items: [
          {
            PK: "AUDIT#2020-01-01",
            SK: "2020-01-01T10:00:00.000Z#user123#action",
            userId: "user123",
            action: "test_action",
            resource: "test_resource",
            timestamp: "2020-01-01T10:00:00.000Z",
            result: "success",
          },
        ],
        count: 1,
      });

      const result = await complianceService.validateRetentionCompliance();

      expect(result.compliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toEqual({
        dataType: "audit_logs",
        issue: "1 audit logs exceed retention period",
        recommendedAction: "Run data retention cleanup process",
      });
    });

    it("should handle errors during validation", async () => {
      mockAuditRepo.getAuditLogsByDateRange.mockRejectedValue(new Error("Database error"));

      await expect(complianceService.validateRetentionCompliance()).rejects.toThrow("Database error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to validate retention compliance",
        expect.objectContaining({
          operation: "ComplianceService",
        }),
        expect.any(Error)
      );
    });
  });

  describe("custom retention configuration", () => {
    it("should use custom retention periods", async () => {
      const customConfig = {
        auditLogs: 365, // 1 year
        projectData: 1825, // 5 years
        userProfiles: 2555, // 7 years
        kycDocuments: 1825, // 5 years
        complianceEvents: 3650, // 10 years
      };

      const customComplianceService = new ComplianceService(
        mockComplianceRepo,
        mockAuditRepo,
        mockLogger,
        customConfig
      );

      await customComplianceService.enforceDataRetention();

      expect(mockAuditRepo.cleanupOldLogs).toHaveBeenCalledWith(365);
    });
  });
});