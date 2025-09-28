import { ProjectAuditService } from "../project-audit-service";
import { AuditLogRepository } from "../../repositories/audit-log-repository";
import { ComplianceRepository } from "../../repositories/compliance-repository";
import { StructuredLogger } from "../structured-logger";

// Mock dependencies
jest.mock("../../repositories/audit-log-repository");
jest.mock("../../repositories/compliance-repository");
jest.mock("../structured-logger");

describe("ProjectAuditService", () => {
  let projectAuditService: ProjectAuditService;
  let mockAuditRepo: jest.Mocked<AuditLogRepository>;
  let mockComplianceRepo: jest.Mocked<ComplianceRepository>;
  let mockLogger: jest.Mocked<StructuredLogger>;

  beforeEach(() => {
    mockAuditRepo = new AuditLogRepository({} as any) as jest.Mocked<AuditLogRepository>;
    mockComplianceRepo = new ComplianceRepository({} as any) as jest.Mocked<ComplianceRepository>;
    mockLogger = new StructuredLogger("test") as jest.Mocked<StructuredLogger>;

    projectAuditService = new ProjectAuditService(
      mockAuditRepo,
      mockComplianceRepo,
      mockLogger
    );

    // Setup default mocks
    mockAuditRepo.createAuditLog.mockResolvedValue({
      PK: "AUDIT#2024-01-01",
      SK: "2024-01-01T10:00:00.000Z#user123#project_creation",
      userId: "user123",
      action: "project_creation",
      resource: "project:proj123",
      timestamp: "2024-01-01T10:00:00.000Z",
      result: "success",
    });

    mockComplianceRepo.createComplianceEvent.mockResolvedValue({
      PK: "COMPLIANCE#2024-01-01",
      SK: "2024-01-01T10:00:00.000Z#data_created#user123",
      eventType: "data_created",
      userId: "user123",
      timestamp: "2024-01-01T10:00:00.000Z",
      details: {},
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("logProjectCreation", () => {
    it("should successfully log project creation", async () => {
      const context = {
        userId: "user123",
        projectId: "proj123",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        sessionId: "session123",
        requestId: "req123",
      };

      const projectData = {
        name: "Test Project",
        category: "technology",
        stockSupply: 1000,
        targetFundingGoal: 50000,
      };

      const result = await projectAuditService.logProjectCreation(
        context,
        projectData,
        "success"
      );

      expect(result.success).toBe(true);
      expect(result.auditLogId).toBeDefined();
      expect(result.complianceEventId).toBeDefined();

      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith({
        userId: "user123",
        action: "project_creation",
        resource: "project:proj123",
        result: "success",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        errorMessage: undefined,
        details: {
          projectName: "Test Project",
          category: "technology",
          stockSupply: 1000,
          targetFundingGoal: 50000,
          sessionId: "session123",
          requestId: "req123",
          projectId: "proj123",
        },
      });

      expect(mockComplianceRepo.createComplianceEvent).toHaveBeenCalledWith({
        eventType: "data_created",
        userId: "user123",
        details: {
          action: "project_creation",
          resource: "project:proj123",
          result: "success",
          projectId: "proj123",
          projectName: "Test Project",
          category: "technology",
          stockSupply: 1000,
          targetFundingGoal: 50000,
        },
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        legalBasis: "contract",
      });
    });

    it("should handle audit logging failure gracefully", async () => {
      mockAuditRepo.createAuditLog.mockRejectedValue(new Error("Database error"));

      const context = {
        userId: "user123",
        projectId: "proj123",
      };

      const projectData = {
        name: "Test Project",
        category: "technology",
        stockSupply: 1000,
      };

      const result = await projectAuditService.logProjectCreation(
        context,
        projectData,
        "success"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("logStockMinting", () => {
    it("should successfully log stock minting", async () => {
      const context = {
        userId: "user123",
        projectId: "proj123",
      };

      const mintingData = {
        tokenId: "token123",
        quantity: 100,
        gasUsed: 50000,
      };

      const result = await projectAuditService.logStockMinting(
        context,
        mintingData,
        "success"
      );

      expect(result.success).toBe(true);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "stock_minting",
          details: expect.objectContaining({
            tokenId: "token123",
            quantity: 100,
            gasUsed: 50000,
          }),
        })
      );
    });
  });

  describe("logProjectUpdate", () => {
    it("should successfully log project update", async () => {
      const context = {
        userId: "user123",
        projectId: "proj123",
      };

      const updatedFields = ["name", "description"];

      const result = await projectAuditService.logProjectUpdate(
        context,
        updatedFields,
        "success"
      );

      expect(result.success).toBe(true);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "project_update",
          details: expect.objectContaining({
            updatedFields: ["name", "description"],
          }),
        })
      );
    });
  });

  describe("logProjectStatusChange", () => {
    it("should successfully log project status change", async () => {
      const context = {
        userId: "user123",
        projectId: "proj123",
      };

      const result = await projectAuditService.logProjectStatusChange(
        context,
        "draft",
        "active",
        "success"
      );

      expect(result.success).toBe(true);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "project_status_change",
          details: expect.objectContaining({
            fromStatus: "draft",
            toStatus: "active",
          }),
        })
      );
    });
  });

  describe("logCoverImageUpload", () => {
    it("should successfully log cover image upload", async () => {
      const context = {
        userId: "user123",
        projectId: "proj123",
      };

      const imageData = {
        fileName: "cover.jpg",
        fileSize: 1024000,
        s3Key: "projects/proj123/cover.jpg",
      };

      const result = await projectAuditService.logCoverImageUpload(
        context,
        imageData,
        "success"
      );

      expect(result.success).toBe(true);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "cover_image_upload",
          details: expect.objectContaining({
            fileName: "cover.jpg",
            fileSize: 1024000,
            s3Key: "projects/proj123/cover.jpg",
          }),
        })
      );
    });
  });

  describe("logProjectDeletion", () => {
    it("should successfully log project deletion", async () => {
      const context = {
        userId: "user123",
        projectId: "proj123",
      };

      const result = await projectAuditService.logProjectDeletion(
        context,
        "success"
      );

      expect(result.success).toBe(true);
      expect(mockAuditRepo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "project_deletion",
          resource: "project:proj123",
        })
      );
    });
  });
});