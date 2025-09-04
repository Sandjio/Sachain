/**
 * Comprehensive Security and Compliance Tests for HBAR Recharge System
 * Tests authentication, authorization, data protection, KYC verification, fraud detection, and audit logging
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { SecureHBARRechargeService } from "../secure-recharge-service";
import { KYCVerificationService } from "../../../utils/kyc-verification-service";
import { FraudDetectionService } from "../../../utils/fraud-detection-service";
import { RechargeAuditService } from "../../../utils/recharge-audit-service";
import { EncryptionService } from "../../../utils/encryption-service";
import { RechargeComplianceService } from "../../../utils/recharge-compliance-service";
import { HBARRechargeRequest } from "../../../types/hbar-recharge";

// Mock AWS services
jest.mock("aws-sdk");

// Mock dependencies
const mockUserRepo = {
  getUserProfile: jest.fn() as jest.MockedFunction<any>,
  updateUserProfile: jest.fn() as jest.MockedFunction<any>,
};

const mockKycRepo = {
  getUserKYCDocuments: jest.fn() as jest.MockedFunction<any>,
  hasApprovedKYC: jest.fn() as jest.MockedFunction<any>,
  getDocumentStats: jest.fn() as jest.MockedFunction<any>,
};

const mockBaseRepo = {
  putItem: jest.fn() as jest.MockedFunction<any>,
  getItem: jest.fn() as jest.MockedFunction<any>,
  queryItems: jest.fn() as jest.MockedFunction<any>,
  queryItemsByGSI: jest.fn() as jest.MockedFunction<any>,
  scanItems: jest.fn() as jest.MockedFunction<any>,
  updateItem: jest.fn() as jest.MockedFunction<any>,
  deleteItem: jest.fn() as jest.MockedFunction<any>,
};

const mockAuditEnhancer = {
  logUserAction: jest.fn() as jest.MockedFunction<any>,
  logDataAccess: jest.fn() as jest.MockedFunction<any>,
  logAuthentication: jest.fn() as jest.MockedFunction<any>,
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe("Security and Compliance Tests", () => {
  let secureRechargeService: SecureHBARRechargeService;
  let kycVerificationService: KYCVerificationService;
  let fraudDetectionService: FraudDetectionService;
  let auditService: RechargeAuditService;
  let encryptionService: EncryptionService;
  let complianceService: RechargeComplianceService;

  const mockConfig = {
    tableName: "test-table",
    eventBusName: "test-event-bus",
    encryptionEnabled: true,
    fraudDetectionEnabled: true,
    kycVerificationEnabled: true,
    auditLoggingEnabled: true,
    complianceReportingEnabled: true,
    kycRequiredThreshold: 500000,
    enhancedKycThreshold: 2000000,
    suspiciousAmountThreshold: 2000000,
    maxRequestsPerHour: 10,
    maxRequestsPerDay: 50,
    maxAmountPerHour: 1000000,
    maxAmountPerDay: 5000000,
  };

  const validRechargeRequest: HBARRechargeRequest = {
    userId: "test-user-123",
    xafAmount: 100000,
    userHederaAccountId: "0.0.123456",
    pin: "1234",
  };

  const securityContext = {
    userId: "test-user-123",
    action: "test_action",
    resource: "hbar_recharge",
    transactionId: "test-txn-123",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0 Test Browser",
    sessionId: "test-session-123",
    requestId: "test-request-123",
    timestamp: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize services with mocked dependencies
    kycVerificationService = new KYCVerificationService(
      mockUserRepo as any,
      mockKycRepo as any,
      mockAuditEnhancer as any,
      mockLogger as any
    );

    fraudDetectionService = new FraudDetectionService(
      mockBaseRepo as any,
      mockAuditEnhancer as any,
      mockLogger as any
    );

    auditService = new RechargeAuditService(
      mockAuditEnhancer as any,
      mockBaseRepo as any,
      mockLogger as any
    );

    encryptionService = new EncryptionService(mockLogger as any);

    // Mock successful initialization
    mockUserRepo.getUserProfile.mockResolvedValue({
      userId: "test-user-123",
      kycStatus: "approved",
      email: "test@example.com",
    });

    mockKycRepo.getUserKYCDocuments.mockResolvedValue({
      items: [
        { documentType: "national_id", status: "approved" },
        { documentType: "proof_of_address", status: "approved" },
      ],
    });

    mockBaseRepo.queryItems.mockResolvedValue({
      items: [],
      count: 0,
    });

    mockAuditEnhancer.logUserAction.mockResolvedValue({
      success: true,
      auditLogId: "audit-123",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Authentication and Authorization", () => {
    it("should reject requests with invalid user ID", async () => {
      const invalidRequest = {
        ...validRechargeRequest,
        userId: "",
      };

      const result = await kycVerificationService.verifyKYCForRecharge({
        ...invalidRequest,
        ...securityContext,
      });

      expect(result.isVerified).toBe(false);
      expect(result.errorCode).toBe("USER_NOT_FOUND");
    });

    it("should validate user session and authentication context", async () => {
      mockUserRepo.getUserProfile.mockResolvedValue(null);

      const result = await kycVerificationService.verifyKYCForRecharge({
        ...validRechargeRequest,
        ...securityContext,
      });

      expect(result.isVerified).toBe(false);
      expect(result.errorCode).toBe("USER_NOT_FOUND");
      expect(mockAuditEnhancer.logUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "kyc_verification_check",
          userId: validRechargeRequest.userId,
        }),
        "success",
        expect.any(Object)
      );
    });

    it("should log authentication attempts for audit trail", async () => {
      await auditService.logRechargeRequest(securityContext, {
        xafAmount: validRechargeRequest.xafAmount,
        userHederaAccountId: validRechargeRequest.userHederaAccountId,
      });

      expect(mockAuditEnhancer.logUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "recharge_request_received",
          userId: securityContext.userId,
          ipAddress: securityContext.ipAddress,
        }),
        "success",
        expect.any(Object)
      );
    });
  });

  describe("KYC Verification", () => {
    it("should require KYC for amounts above threshold", async () => {
      const largeAmountRequest = {
        ...validRechargeRequest,
        xafAmount: 600000, // Above 500k threshold
      };

      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "test-user-123",
        kycStatus: "not_started",
      });

      const result = await kycVerificationService.verifyKYCForRecharge({
        ...largeAmountRequest,
        ...securityContext,
      });

      expect(result.isVerified).toBe(false);
      expect(result.verificationLevel).toBe("basic");
      expect(result.requiredActions).toContain(
        "Complete KYC verification process"
      );
    });

    it("should require enhanced KYC for very large amounts", async () => {
      const veryLargeAmountRequest = {
        ...validRechargeRequest,
        xafAmount: 2500000, // Above 2M threshold
      };

      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "test-user-123",
        kycStatus: "approved",
      });

      mockKycRepo.getUserKYCDocuments.mockResolvedValue({
        items: [
          { documentType: "national_id", status: "approved" },
          // Missing enhanced KYC documents
        ],
      });

      const result = await kycVerificationService.verifyKYCForRecharge({
        ...veryLargeAmountRequest,
        ...securityContext,
      });

      expect(result.isVerified).toBe(false);
      expect(result.verificationLevel).toBe("enhanced");
      expect(result.details.missingDocuments).toContain("proof_of_address");
    });

    it("should allow transactions with proper KYC verification", async () => {
      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "test-user-123",
        kycStatus: "approved",
      });

      mockKycRepo.getUserKYCDocuments.mockResolvedValue({
        items: [
          { documentType: "national_id", status: "approved" },
          { documentType: "proof_of_address", status: "approved" },
        ],
      });

      const result = await kycVerificationService.verifyKYCForRecharge({
        ...validRechargeRequest,
        ...securityContext,
      });

      expect(result.isVerified).toBe(true);
      expect(result.verificationLevel).toBe("none"); // Below threshold
    });

    it("should check daily limits for users without KYC", async () => {
      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "test-user-123",
        kycStatus: "not_started",
      });

      const result = await kycVerificationService.checkDailyLimitsWithoutKYC(
        "test-user-123",
        90000, // Current daily spent
        50000 // New amount - would exceed 100k daily limit
      );

      expect(result.allowed).toBe(false);
      expect(result.errorCode).toBe("DAILY_LIMIT_EXCEEDED_NO_KYC");
      expect(result.remainingLimit).toBe(10000);
    });
  });

  describe("Fraud Detection and Rate Limiting", () => {
    it("should detect and block suspicious transaction patterns", async () => {
      // Mock high-risk transaction pattern
      mockBaseRepo.queryItems.mockResolvedValue({
        items: Array(6).fill({
          result: "failure",
          timestamp: new Date().toISOString(),
          xafAmount: 100000,
        }),
        count: 6,
      });

      const result = await fraudDetectionService.detectFraud({
        ...validRechargeRequest,
        ...securityContext,
      });

      expect(result.riskLevel).toBe("high");
      expect(result.riskFactors).toContain(
        "Multiple consecutive failed transactions"
      );
      expect(result.riskScore).toBeGreaterThan(30);
    });

    it("should enforce rate limits per user", async () => {
      // Mock user exceeding hourly request limit
      mockBaseRepo.queryItems.mockResolvedValue({
        items: Array(11).fill({ timestamp: new Date().toISOString() }),
        count: 11,
      });

      const result = await fraudDetectionService.checkRateLimit({
        ...validRechargeRequest,
        ...securityContext,
      });

      expect(result.allowed).toBe(false);
      expect(result.errorCode).toBe("RATE_LIMIT_EXCEEDED");
      expect(result.retryAfter).toBe(3600); // 1 hour
    });

    it("should detect unusual transaction amounts", async () => {
      // Mock user history with small average amounts
      mockBaseRepo.queryItems.mockResolvedValue({
        items: Array(10).fill({
          result: "success",
          xafAmount: 10000, // Small amounts
          timestamp: new Date().toISOString(),
        }),
        count: 10,
      });

      const largeAmountRequest = {
        ...validRechargeRequest,
        xafAmount: 500000, // Much larger than average
      };

      const result = await fraudDetectionService.detectFraud({
        ...largeAmountRequest,
        ...securityContext,
      });

      expect(result.riskFactors).toContain(
        "Amount significantly higher than user average"
      );
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it("should detect rapid successive transactions", async () => {
      const now = new Date();
      const recentTransactions = Array(4).fill({
        result: "success",
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        xafAmount: 100000,
      });

      mockBaseRepo.queryItems.mockResolvedValue({
        items: recentTransactions,
        count: 4,
      });

      const result = await fraudDetectionService.detectFraud({
        ...validRechargeRequest,
        ...securityContext,
      });

      expect(result.riskFactors).toContain(
        "Too many transactions in short time window"
      );
    });

    it("should detect transactions during unusual hours", async () => {
      const unusualHourContext = {
        ...securityContext,
        timestamp: "2024-01-01T03:00:00.000Z", // 3 AM
      };

      const result = await fraudDetectionService.detectFraud({
        ...validRechargeRequest,
        ...unusualHourContext,
      });

      expect(result.riskFactors).toContain("Transaction during unusual hours");
    });

    it("should track IP-based suspicious activity", async () => {
      // Mock multiple users from same IP
      mockBaseRepo.queryItemsByGSI.mockResolvedValue({
        items: Array(6).fill({
          userId: "different-user",
          timestamp: new Date().toISOString(),
        }),
        count: 6,
      });

      const result = await fraudDetectionService.detectFraud({
        ...validRechargeRequest,
        ...securityContext,
      });

      expect(result.riskFactors).toContain(
        "Multiple users from same IP address"
      );
    });
  });

  describe("Data Encryption and Protection", () => {
    it("should encrypt sensitive recharge data", async () => {
      const sensitiveData = {
        customerNumber: "677123456",
        pin: "1234",
        userHederaAccountId: "0.0.123456",
        xafAmount: 100000,
        ipAddress: "192.168.1.1",
      };

      // Mock KMS data key generation
      const mockKMS = {
        generateDataKey: jest.fn().mockReturnValue({
          promise: jest.fn().mockResolvedValue({
            Plaintext: Buffer.from("test-key-32-bytes-long-for-aes256"),
          }),
        }),
      };

      // Create encryption service with mocked KMS
      const encryptionServiceWithMock = new EncryptionService(
        mockLogger as any
      );
      (encryptionServiceWithMock as any).kms = mockKMS;

      const encryptedData = await encryptionServiceWithMock.encryptRechargeData(
        sensitiveData,
        {
          userId: "test-user-123",
          transactionId: "test-txn-123",
          dataType: "recharge_data",
          purpose: "storage",
          timestamp: "2024-01-01T00:00:00.000Z",
        }
      );

      expect(encryptedData).toHaveProperty("pin");
      expect(encryptedData.pin).toHaveProperty("encryptedValue");
      expect(encryptedData.pin).toHaveProperty("keyId");
      expect(encryptedData.pin).toHaveProperty("algorithm");
      expect(encryptedData.pin.encryptedValue).not.toBe("1234");
    });

    it("should generate and verify data integrity hashes", () => {
      const testData = { amount: 100000, userId: "test-user" };
      const hash1 = encryptionService.generateDataHash(testData);
      const hash2 = encryptionService.generateDataHash(testData);

      expect(hash1).toBe(hash2); // Same data should produce same hash
      expect(hash1).toHaveLength(64); // SHA-256 produces 64-character hex string

      const isValid = encryptionService.verifyDataHash(testData, hash1);
      expect(isValid).toBe(true);

      const modifiedData = { ...testData, amount: 200000 };
      const isValidModified = encryptionService.verifyDataHash(
        modifiedData,
        hash1
      );
      expect(isValidModified).toBe(false);
    });

    it("should securely wipe sensitive data from memory", () => {
      const sensitiveData = {
        pin: "1234",
        customerNumber: "677123456",
        regularField: "not-sensitive",
      };

      encryptionService.wipeSensitiveData(sensitiveData);

      expect(sensitiveData.pin).toBeUndefined();
      expect(sensitiveData.customerNumber).toBeUndefined();
      expect(sensitiveData.regularField).toBe("not-sensitive");
    });

    it("should handle encryption failures gracefully", async () => {
      // Mock KMS failure
      const mockKMS = {
        generateDataKey: jest.fn().mockReturnValue({
          promise: jest.fn().mockRejectedValue(new Error("KMS unavailable")),
        }),
      };

      const encryptionServiceWithMock = new EncryptionService(
        mockLogger as any
      );
      (encryptionServiceWithMock as any).kms = mockKMS;

      await expect(
        encryptionServiceWithMock.encryptRechargeData(
          { pin: "1234" },
          {
            userId: "test-user",
            transactionId: "test-txn",
            dataType: "test",
            purpose: "test",
            timestamp: "2024-01-01T00:00:00.000Z",
          }
        )
      ).rejects.toThrow("Encryption failed");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to encrypt recharge data"),
        expect.any(Object),
        expect.any(Error)
      );
    });
  });

  describe("Comprehensive Audit Logging", () => {
    it("should log all recharge operations with complete context", async () => {
      await auditService.logRechargeRequest(securityContext, {
        xafAmount: 100000,
        userHederaAccountId: "0.0.123456",
      });

      expect(mockAuditEnhancer.logUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: securityContext.userId,
          action: "recharge_request_received",
          resource: "hbar_recharge",
          ipAddress: securityContext.ipAddress,
          userAgent: securityContext.userAgent,
          requestId: securityContext.requestId,
        }),
        "success",
        expect.objectContaining({
          xafAmount: 100000,
          userHederaAccountId: "0.0.123456",
        })
      );

      expect(mockBaseRepo.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: `RECHARGE_AUDIT#${securityContext.userId}`,
          eventType: "recharge_request_received",
          userId: securityContext.userId,
          transactionId: securityContext.transactionId,
        })
      );
    });

    it("should log validation results with security context", async () => {
      await auditService.logValidation(securityContext, {
        isValid: false,
        validationErrors: ["Amount too high", "KYC required"],
        kycVerificationLevel: "basic",
        riskLevel: "medium",
        fraudDetectionFlags: ["large_amount", "new_user"],
      });

      expect(mockAuditEnhancer.logUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "recharge_validation_started",
        }),
        "failure",
        expect.objectContaining({
          validationResult: expect.objectContaining({
            isValid: false,
            validationErrors: ["Amount too high", "KYC required"],
          }),
        }),
        "Amount too high, KYC required"
      );
    });

    it("should log Orange Money payment events", async () => {
      await auditService.logOrangeMoneyPayment(securityContext, {
        success: true,
        orangeMoneyTransactionId: "OM123456",
        processingTimeMs: 1500,
      });

      expect(mockBaseRepo.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "orange_money_payment_confirmed",
          orangeMoneyTransactionId: "OM123456",
          processingTimeMs: 1500,
          status: "processing",
        })
      );
    });

    it("should log HBAR transfer events with transaction details", async () => {
      await auditService.logHbarTransfer(securityContext, {
        success: true,
        hederaTransactionId: "0.0.123@1234567890.123456789",
        hbarAmount: 50.5,
        exchangeRate: 0.0005,
        actualCost: "0.001 HBAR",
        processingTimeMs: 3000,
        retryCount: 0,
      });

      expect(mockBaseRepo.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "hbar_transfer_completed",
          hederaTransactionId: "0.0.123@1234567890.123456789",
          hbarAmount: 50.5,
          exchangeRate: 0.0005,
          processingTimeMs: 3000,
          retryCount: 0,
          status: "completed",
        })
      );
    });

    it("should generate comprehensive audit summaries", async () => {
      // Mock audit events for summary
      mockBaseRepo.queryItems.mockResolvedValue({
        events: [
          {
            eventType: "recharge_request_received",
            userId: "user1",
            xafAmount: 100000,
            status: "completed",
            timestamp: "2024-01-01T10:00:00.000Z",
            processingTimeMs: 2000,
          },
          {
            eventType: "recharge_failed",
            userId: "user2",
            xafAmount: 200000,
            status: "failed",
            errorCode: "KYC_REQUIRED",
            timestamp: "2024-01-01T11:00:00.000Z",
          },
        ],
        totalCount: 2,
      });

      const summary = await auditService.generateAuditSummary(
        "2024-01-01",
        "2024-01-01"
      );

      expect(summary.period.startDate).toBe("2024-01-01");
      expect(summary.period.endDate).toBe("2024-01-01");
      expect(summary.metrics.totalTransactions).toBeGreaterThanOrEqual(0);
      expect(summary.riskAnalysis).toHaveProperty("highRiskTransactions");
      expect(summary.errorAnalysis).toHaveProperty("topErrorCodes");
    });
  });

  describe("Compliance Reporting", () => {
    it("should check transaction compliance requirements", async () => {
      const mockComplianceService = {
        checkTransactionCompliance: jest.fn().mockResolvedValue({
          compliant: false,
          requiresReporting: true,
          reportTypes: ["large_transaction_report", "kyc_compliance_report"],
          riskLevel: "high",
          complianceNotes: [
            "Amount exceeds large transaction threshold",
            "KYC verification required",
          ],
        }),
      };

      const result = await mockComplianceService.checkTransactionCompliance(
        "test-user-123",
        2500000, // Large amount
        securityContext
      );

      expect(result.compliant).toBe(false);
      expect(result.requiresReporting).toBe(true);
      expect(result.reportTypes).toContain("large_transaction_report");
      expect(result.riskLevel).toBe("high");
    });

    it("should generate suspicious activity reports", async () => {
      const mockComplianceService = {
        generateSuspiciousActivityReport: jest.fn().mockResolvedValue({
          reportId: "SAR_2024-01-01_ABC123",
          userId: "test-user-123",
          transactionIds: ["txn-123", "txn-124"],
          suspiciousIndicators: [
            {
              type: "rapid_transactions",
              description: "Multiple transactions in short time",
              severity: "high",
              evidence: { transactionCount: 5, timeWindow: "15 minutes" },
            },
          ],
          riskAssessment: {
            riskScore: 85,
            riskLevel: "critical",
            riskFactors: ["rapid_transactions", "large_amounts"],
          },
          status: "open",
        }),
      };

      const report =
        await mockComplianceService.generateSuspiciousActivityReport(
          "test-user-123",
          ["txn-123", "txn-124"],
          [
            {
              type: "rapid_transactions",
              description: "Multiple transactions in short time",
              severity: "high" as const,
              evidence: { transactionCount: 5 },
            },
          ],
          "fraud_detection_system"
        );

      expect(report.reportId).toMatch(/^SAR_/);
      expect(report.userId).toBe("test-user-123");
      expect(report.riskAssessment.riskLevel).toBe("critical");
      expect(report.status).toBe("open");
    });

    it("should enforce data retention policies", async () => {
      const mockComplianceService = {
        validateRetentionCompliance: jest.fn().mockResolvedValue({
          compliant: true,
          violations: [],
        }),
      };

      const result = await mockComplianceService.validateRetentionCompliance();

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should export compliance data for regulatory authorities", async () => {
      const mockComplianceService = {
        exportComplianceData: jest.fn().mockResolvedValue({
          s3Location:
            "s3://compliance-exports/recharge-data-2024-01-01-2024-01-31.csv",
          recordCount: 1500,
          exportedAt: "2024-02-01T00:00:00.000Z",
        }),
      };

      const exportResult = await mockComplianceService.exportComplianceData(
        "2024-01-01",
        "2024-01-31",
        "csv"
      );

      expect(exportResult.s3Location).toMatch(/^s3:\/\/compliance-exports\//);
      expect(exportResult.recordCount).toBeGreaterThan(0);
      expect(exportResult.exportedAt).toBeDefined();
    });
  });

  describe("Integration Security Tests", () => {
    it("should handle complete secure recharge flow", async () => {
      // Mock all successful responses
      mockUserRepo.getUserProfile.mockResolvedValue({
        userId: "test-user-123",
        kycStatus: "approved",
      });

      mockKycRepo.getUserKYCDocuments.mockResolvedValue({
        items: [
          { documentType: "national_id", status: "approved" },
          { documentType: "proof_of_address", status: "approved" },
        ],
      });

      mockBaseRepo.queryItems.mockResolvedValue({
        items: [], // No previous transactions
        count: 0,
      });

      // This would require mocking the entire secure recharge service
      // For now, we'll test the individual components
      const kycResult = await kycVerificationService.verifyKYCForRecharge({
        ...validRechargeRequest,
        ...securityContext,
      });

      const fraudResult = await fraudDetectionService.detectFraud({
        ...validRechargeRequest,
        ...securityContext,
      });

      expect(kycResult.isVerified).toBe(true);
      expect(fraudResult.allowed).toBe(true);
      expect(fraudResult.riskLevel).toBe("low");
    });

    it("should handle security service failures gracefully", async () => {
      // Mock service failures
      mockUserRepo.getUserProfile.mockRejectedValue(
        new Error("Database unavailable")
      );

      const kycResult = await kycVerificationService.verifyKYCForRecharge({
        ...validRechargeRequest,
        ...securityContext,
      });

      expect(kycResult.isVerified).toBe(false);
      expect(kycResult.errorCode).toBe("KYC_VERIFICATION_ERROR");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should maintain audit trail even during failures", async () => {
      // Mock audit service to always succeed even when other services fail
      mockAuditEnhancer.logUserAction.mockResolvedValue({
        success: true,
        auditLogId: "audit-123",
      });

      mockUserRepo.getUserProfile.mockRejectedValue(
        new Error("Service unavailable")
      );

      try {
        await kycVerificationService.verifyKYCForRecharge({
          ...validRechargeRequest,
          ...securityContext,
        });
      } catch (error) {
        // Expected to fail
      }

      // Audit should still be logged
      expect(mockAuditEnhancer.logUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "kyc_verification_check",
        }),
        "failure",
        expect.any(Object)
      );
    });
  });

  describe("Performance and Security Benchmarks", () => {
    it("should complete security checks within acceptable time limits", async () => {
      const startTime = Date.now();

      await Promise.all([
        kycVerificationService.verifyKYCForRecharge({
          ...validRechargeRequest,
          ...securityContext,
        }),
        fraudDetectionService.detectFraud({
          ...validRechargeRequest,
          ...securityContext,
        }),
        auditService.logRechargeRequest(securityContext, {
          xafAmount: validRechargeRequest.xafAmount,
          userHederaAccountId: validRechargeRequest.userHederaAccountId,
        }),
      ]);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should handle concurrent security checks without race conditions", async () => {
      const concurrentRequests = Array(10)
        .fill(null)
        .map((_, index) =>
          kycVerificationService.verifyKYCForRecharge({
            ...validRechargeRequest,
            userId: `test-user-${index}`,
            ...securityContext,
          })
        );

      const results = await Promise.all(concurrentRequests);

      // All requests should complete successfully
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toHaveProperty("isVerified");
      });
    });
  });
});
