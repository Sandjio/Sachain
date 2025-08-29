import { handler } from "../index";
import { APIGatewayProxyEvent } from "aws-lambda";
import { AuditLogRepository } from "../../../repositories/audit-log-repository";
import { ComplianceRepository } from "../../../repositories/compliance-repository";
import { ComplianceService } from "../../../utils/compliance-service";
import { validateJWT } from "../../../utils/jwt-utils";

// Mock dependencies
jest.mock("../../../repositories/audit-log-repository");
jest.mock("../../../repositories/compliance-repository");
jest.mock("../../../utils/compliance-service");
jest.mock("../../../utils/jwt-utils");
jest.mock("../../../utils/structured-logger");

const mockValidateJWT = validateJWT as jest.MockedFunction<typeof validateJWT>;

describe("Audit Compliance Lambda", () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockComplianceService: jest.Mocked<ComplianceService>;

  beforeEach(() => {
    // Setup base event
    mockEvent = {
      httpMethod: "GET",
      path: "/compliance/report",
      headers: {
        Authorization: "Bearer valid-token",
      },
      queryStringParameters: null,
      body: null,
      requestContext: {
        requestId: "test-request-id",
        identity: {
          sourceIp: "192.168.1.1",
        },
      },
    } as any;

    // Setup JWT validation mock
    mockValidateJWT.mockResolvedValue({
      isValid: true,
      payload: {
        sub: "admin123",
        "custom:user_type": "admin",
      },
    });

    // Setup ComplianceService mock
    mockComplianceService = {
      generateComplianceReport: jest.fn(),
      validateRetentionCompliance: jest.fn(),
      enforceDataRetention: jest.fn(),
      trackDataAccess: jest.fn(),
    } as any;

    // Mock the ComplianceService constructor
    (ComplianceService as jest.Mock).mockImplementation(() => mockComplianceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication and Authorization", () => {
    it("should return 401 for invalid JWT token", async () => {
      mockValidateJWT.mockResolvedValue({
        isValid: false,
        payload: null,
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 for non-admin users", async () => {
      mockValidateJWT.mockResolvedValue({
        isValid: true,
        payload: {
          sub: "user123",
          "custom:user_type": "entrepreneur",
        },
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({ error: "Insufficient permissions" });
    });
  });

  describe("GET /compliance/report", () => {
    it("should generate compliance report successfully", async () => {
      mockEvent.queryStringParameters = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      };

      const mockReport = {
        period: { startDate: "2024-01-01", endDate: "2024-01-31" },
        metrics: {
          totalAuditLogs: 1000,
          successfulOperations: 950,
          failedOperations: 50,
          projectsCreated: 100,
          stocksMinted: 80,
          complianceEvents: 200,
        },
        riskIndicators: {
          highFailureRate: false,
          suspiciousActivity: false,
          dataRetentionViolations: false,
        },
      };

      mockComplianceService.generateComplianceReport.mockResolvedValue(mockReport);

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({ report: mockReport });
      expect(mockComplianceService.generateComplianceReport).toHaveBeenCalledWith(
        "2024-01-01",
        "2024-01-31"
      );
    });

    it("should return 400 for missing date parameters", async () => {
      mockEvent.queryStringParameters = { startDate: "2024-01-01" }; // Missing endDate

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "startDate and endDate query parameters are required",
      });
    });

    it("should handle report generation errors", async () => {
      mockEvent.queryStringParameters = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      };

      mockComplianceService.generateComplianceReport.mockRejectedValue(
        new Error("Database error")
      );

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Failed to generate compliance report",
      });
    });
  });

  describe("GET /compliance/retention-status", () => {
    it("should return retention status successfully", async () => {
      mockEvent.path = "/compliance/retention-status";

      const mockValidation = {
        compliant: true,
        violations: [],
      };

      mockComplianceService.validateRetentionCompliance.mockResolvedValue(mockValidation);

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({ retentionStatus: mockValidation });
    });

    it("should handle retention status check errors", async () => {
      mockEvent.path = "/compliance/retention-status";

      mockComplianceService.validateRetentionCompliance.mockRejectedValue(
        new Error("Database error")
      );

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Failed to get retention status",
      });
    });
  });

  describe("GET /compliance/audit-logs", () => {
    it("should return audit logs by date", async () => {
      mockEvent.path = "/compliance/audit-logs";
      mockEvent.queryStringParameters = { date: "2024-01-01" };

      // Mock AuditLogRepository
      const mockAuditRepo = {
        getAuditLogsByDate: jest.fn().mockResolvedValue({
          items: [
            {
              PK: "AUDIT#2024-01-01",
              SK: "2024-01-01T10:00:00.000Z#user123#action",
              userId: "user123",
              action: "project_creation",
              resource: "project:proj123",
              timestamp: "2024-01-01T10:00:00.000Z",
              result: "success",
            },
          ],
          count: 1,
        }),
        createAuditLog: jest.fn(),
      };

      (AuditLogRepository as jest.Mock).mockImplementation(() => mockAuditRepo);

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(mockAuditRepo.getAuditLogsByDate).toHaveBeenCalledWith("2024-01-01", { limit: 50 });
    });

    it("should return 400 for missing filter parameters", async () => {
      mockEvent.path = "/compliance/audit-logs";
      mockEvent.queryStringParameters = {}; // No filters

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "At least one filter parameter (date, action, or userId) is required",
      });
    });
  });

  describe("POST /compliance/enforce-retention", () => {
    it("should enforce data retention successfully", async () => {
      mockEvent.httpMethod = "POST";
      mockEvent.path = "/compliance/enforce-retention";

      const mockResults = {
        auditLogsDeleted: 100,
        complianceEventsDeleted: 50,
        errors: [],
      };

      mockComplianceService.enforceDataRetention.mockResolvedValue(mockResults);

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({ retentionResults: mockResults });
    });

    it("should handle retention enforcement errors", async () => {
      mockEvent.httpMethod = "POST";
      mockEvent.path = "/compliance/enforce-retention";

      mockComplianceService.enforceDataRetention.mockRejectedValue(
        new Error("Database error")
      );

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Failed to enforce data retention",
      });
    });
  });

  describe("POST /compliance/track-access", () => {
    it("should track data access successfully", async () => {
      mockEvent.httpMethod = "POST";
      mockEvent.path = "/compliance/track-access";
      mockEvent.body = JSON.stringify({
        dataType: "project_data",
        accessReason: "user_request",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      });

      mockComplianceService.trackDataAccess.mockResolvedValue(undefined);

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual({
        message: "Data access tracked successfully",
      });
      expect(mockComplianceService.trackDataAccess).toHaveBeenCalledWith(
        "admin123",
        "project_data",
        "user_request",
        "192.168.1.1",
        "Mozilla/5.0"
      );
    });

    it("should return 400 for missing required fields", async () => {
      mockEvent.httpMethod = "POST";
      mockEvent.path = "/compliance/track-access";
      mockEvent.body = JSON.stringify({
        dataType: "project_data",
        // Missing accessReason
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "dataType and accessReason are required",
      });
    });

    it("should return 400 for missing request body", async () => {
      mockEvent.httpMethod = "POST";
      mockEvent.path = "/compliance/track-access";
      mockEvent.body = null;

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "Request body is required",
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 405 for unsupported HTTP methods", async () => {
      mockEvent.httpMethod = "DELETE";

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body)).toEqual({ error: "Method not allowed" });
    });

    it("should return 404 for unknown endpoints", async () => {
      mockEvent.path = "/compliance/unknown-endpoint";

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({ error: "Endpoint not found" });
    });
  });
});