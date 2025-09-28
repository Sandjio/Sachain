import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { AuditLogRepository } from "../../repositories/audit-log-repository";
import { ComplianceRepository } from "../../repositories/compliance-repository";
import { ProjectAuditService } from "../../utils/project-audit-service";
import { ComplianceService } from "../../utils/compliance-service";
import { StructuredLogger } from "../../utils/structured-logger";

// Mock AWS SDK
jest.mock("@aws-sdk/client-dynamodb");
jest.mock("../../utils/structured-logger");

describe("Audit and Compliance Workflow Integration", () => {
  let auditRepo: AuditLogRepository;
  let complianceRepo: ComplianceRepository;
  let projectAuditService: ProjectAuditService;
  let complianceService: ComplianceService;
  let logger: StructuredLogger;

  beforeEach(() => {
    const mockDynamoClient = new DynamoDBClient({}) as jest.Mocked<DynamoDBClient>;
    logger = new StructuredLogger("test") as jest.Mocked<StructuredLogger>;
    
    auditRepo = new AuditLogRepository({
      client: mockDynamoClient,
      tableName: "test-table",
    });
    
    complianceRepo = new ComplianceRepository({
      client: mockDynamoClient,
      tableName: "test-table",
    });
    
    projectAuditService = new ProjectAuditService(auditRepo, complianceRepo, logger);
    complianceService = new ComplianceService(complianceRepo, auditRepo, logger);

    // Mock repository methods
    jest.spyOn(auditRepo, "createAuditLog").mockResolvedValue({
      PK: "AUDIT#2024-01-01",
      SK: "2024-01-01T10:00:00.000Z#user123#project_creation",
      userId: "user123",
      action: "project_creation",
      resource: "project:proj123",
      timestamp: "2024-01-01T10:00:00.000Z",
      result: "success",
    });

    jest.spyOn(complianceRepo, "createComplianceEvent").mockResolvedValue({
      PK: "COMPLIANCE#2024-01-01",
      SK: "2024-01-01T10:00:00.000Z#data_created#user123",
      eventType: "data_created",
      userId: "user123",
      timestamp: "2024-01-01T10:00:00.000Z",
      details: {},
    });

    jest.spyOn(auditRepo, "getAuditStats").mockResolvedValue({
      total: 100,
      successful: 95,
      failed: 5,
      byAction: {
        project_creation: 20,
        stock_minting: 15,
        authentication: 60,
      },
    });

    jest.spyOn(auditRepo, "cleanupOldLogs").mockResolvedValue(10);
    jest.spyOn(auditRepo, "getAuditLogsByDateRange").mockResolvedValue({
      items: [],
      count: 0,
    });
    jest.spyOn(auditRepo, "getFailedAuditLogs").mockResolvedValue({
      items: [],
      count: 0,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Project Lifecycle Audit", () => {
    it("should audit complete project creation to stock minting workflow", async () => {
      const userId = "entrepreneur123";
      const projectId = "proj123";
      const auditContext = {
        userId,
        projectId,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        sessionId: "session123",
        requestId: "req123",
      };

      // 1. Log project creation
      const creationResult = await projectAuditService.logProjectCreation(
        auditContext,
        {
          name: "Test Project",
          category: "technology",
          stockSupply: 1000,
          targetFundingGoal: 50000,
        },
        "success"
      );

      expect(creationResult.success).toBe(true);
      expect(creationResult.auditLogId).toBeDefined();
      expect(creationResult.complianceEventId).toBeDefined();

      // 2. Log cover image upload
      const imageResult = await projectAuditService.logCoverImageUpload(
        auditContext,
        {
          fileName: "cover.jpg",
          fileSize: 1024000,
          s3Key: "projects/proj123/cover.jpg",
        },
        "success"
      );

      expect(imageResult.success).toBe(true);

      // 3. Log project status change to minting
      const statusResult = await projectAuditService.logProjectStatusChange(
        auditContext,
        "draft",
        "minting",
        "success"
      );

      expect(statusResult.success).toBe(true);

      // 4. Log stock minting
      const mintingResult = await projectAuditService.logStockMinting(
        auditContext,
        {
          tokenId: "token123",
          quantity: 1000,
          gasUsed: 500000,
        },
        "success"
      );

      expect(mintingResult.success).toBe(true);

      // 5. Log final status change to active
      const finalStatusResult = await projectAuditService.logProjectStatusChange(
        auditContext,
        "minting",
        "active",
        "success"
      );

      expect(finalStatusResult.success).toBe(true);

      // Verify all audit logs were created
      expect(auditRepo.createAuditLog).toHaveBeenCalledTimes(5);
      expect(complianceRepo.createComplianceEvent).toHaveBeenCalledTimes(4); // Only sensitive actions
    });

    it("should handle partial failures in project workflow", async () => {
      const userId = "entrepreneur123";
      const projectId = "proj123";
      const auditContext = {
        userId,
        projectId,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      };

      // 1. Successful project creation
      const creationResult = await projectAuditService.logProjectCreation(
        auditContext,
        {
          name: "Test Project",
          category: "technology",
          stockSupply: 1000,
        },
        "success"
      );

      expect(creationResult.success).toBe(true);

      // 2. Failed stock minting
      const mintingResult = await projectAuditService.logStockMinting(
        auditContext,
        {
          tokenId: "token123",
          quantity: 1000,
          gasUsed: 0,
        },
        "failure",
        "Insufficient gas for transaction"
      );

      expect(mintingResult.success).toBe(true);

      // Verify both success and failure were logged
      expect(auditRepo.createAuditLog).toHaveBeenCalledTimes(2);
      expect(auditRepo.createAuditLog).toHaveBeenNthCalledWith(1, expect.objectContaining({
        result: "success",
        action: "project_creation",
      }));
      expect(auditRepo.createAuditLog).toHaveBeenNthCalledWith(2, expect.objectContaining({
        result: "failure",
        action: "stock_minting",
        errorMessage: "Insufficient gas for transaction",
      }));
    });
  });

  describe("Compliance Reporting and Data Retention", () => {
    it("should generate comprehensive compliance report", async () => {
      const startDate = "2024-01-01";
      const endDate = "2024-01-02";

      const report = await complianceService.generateComplianceReport(startDate, endDate);

      expect(report.period.startDate).toBe(startDate);
      expect(report.period.endDate).toBe(endDate);
      expect(report.metrics.totalAuditLogs).toBe(200); // 100 per day * 2 days
      expect(report.metrics.successfulOperations).toBe(190);
      expect(report.metrics.failedOperations).toBe(10);
      expect(report.riskIndicators.highFailureRate).toBe(false); // 5% failure rate

      expect(auditRepo.getAuditStats).toHaveBeenCalledTimes(2);
    });

    it("should enforce data retention policies", async () => {
      const results = await complianceService.enforceDataRetention();

      expect(results.auditLogsDeleted).toBe(10);
      expect(results.complianceEventsDeleted).toBe(0);
      expect(results.errors).toHaveLength(0);

      expect(auditRepo.cleanupOldLogs).toHaveBeenCalledWith(2555); // 7 years default
    });

    it("should validate retention compliance", async () => {
      const validation = await complianceService.validateRetentionCompliance();

      expect(validation.compliant).toBe(true);
      expect(validation.violations).toHaveLength(0);

      expect(auditRepo.getAuditLogsByDateRange).toHaveBeenCalled();
    });

    it("should track data access for GDPR compliance", async () => {
      await complianceService.trackDataAccess(
        "user123",
        "project_data",
        "user_dashboard_view",
        "192.168.1.1",
        "Mozilla/5.0"
      );

      expect(complianceRepo.createComplianceEvent).toHaveBeenCalledWith({
        eventType: "data_accessed",
        userId: "user123",
        details: {
          dataType: "project_data",
          accessReason: "user_dashboard_view",
          timestamp: expect.any(String),
        },
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        legalBasis: "legitimate_interest",
      });
    });
  });

  describe("Risk Detection and Monitoring", () => {
    it("should detect high failure rate risk", async () => {
      // Mock high failure rate
      jest.spyOn(auditRepo, "getAuditStats").mockResolvedValue({
        total: 100,
        successful: 80,
        failed: 20, // 20% failure rate
        byAction: {},
      });

      const report = await complianceService.generateComplianceReport("2024-01-01", "2024-01-01");

      expect(report.riskIndicators.highFailureRate).toBe(true);
    });

    it("should detect suspicious activity patterns", async () => {
      // Mock suspicious failed logs
      const suspiciousLogs = Array.from({ length: 60 }, (_, i) => ({
        PK: "AUDIT#2024-01-01",
        SK: `2024-01-01T10:${i.toString().padStart(2, '0')}:00.000Z#user123#action`,
        userId: "user123",
        action: "authentication",
        resource: "user_session",
        timestamp: `2024-01-01T10:${i.toString().padStart(2, '0')}:00.000Z`,
        result: "failure" as const,
        ipAddress: "192.168.1.1",
      }));

      jest.spyOn(auditRepo, "getFailedAuditLogs").mockResolvedValue({
        items: suspiciousLogs,
        count: suspiciousLogs.length,
      });

      const report = await complianceService.generateComplianceReport("2024-01-01", "2024-01-01");

      expect(report.riskIndicators.suspiciousActivity).toBe(true);
    });

    it("should detect data retention violations", async () => {
      // Mock old audit logs that should have been deleted
      const oldLogs = [
        {
          PK: "AUDIT#2020-01-01",
          SK: "2020-01-01T10:00:00.000Z#user123#action",
          userId: "user123",
          action: "test_action",
          resource: "test_resource",
          timestamp: "2020-01-01T10:00:00.000Z",
          result: "success" as const,
        },
      ];

      jest.spyOn(auditRepo, "getAuditLogsByDateRange").mockResolvedValue({
        items: oldLogs,
        count: oldLogs.length,
      });

      const validation = await complianceService.validateRetentionCompliance();

      expect(validation.compliant).toBe(false);
      expect(validation.violations).toHaveLength(1);
      expect(validation.violations[0]).toEqual({
        dataType: "audit_logs",
        issue: "1 audit logs exceed retention period",
        recommendedAction: "Run data retention cleanup process",
      });
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle audit logging failures gracefully", async () => {
      jest.spyOn(auditRepo, "createAuditLog").mockRejectedValue(new Error("Database connection failed"));

      const result = await projectAuditService.logProjectCreation(
        {
          userId: "user123",
          projectId: "proj123",
        },
        {
          name: "Test Project",
          category: "technology",
          stockSupply: 1000,
        },
        "success"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle compliance service failures", async () => {
      jest.spyOn(auditRepo, "getAuditStats").mockRejectedValue(new Error("Database error"));

      await expect(
        complianceService.generateComplianceReport("2024-01-01", "2024-01-01")
      ).rejects.toThrow("Database error");

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to generate compliance report",
        expect.objectContaining({
          operation: "ComplianceService",
        }),
        expect.any(Error)
      );
    });

    it("should continue operation when compliance event creation fails", async () => {
      jest.spyOn(complianceRepo, "createComplianceEvent").mockRejectedValue(new Error("Compliance DB error"));

      const result = await projectAuditService.logProjectCreation(
        {
          userId: "user123",
          projectId: "proj123",
        },
        {
          name: "Test Project",
          category: "technology",
          stockSupply: 1000,
        },
        "success"
      );

      // Should still succeed even if compliance event fails
      expect(result.success).toBe(true);
      expect(result.auditLogId).toBeDefined();
      expect(result.complianceEventId).toBeUndefined();
    });
  });
});