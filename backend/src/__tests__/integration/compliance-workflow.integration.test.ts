import { ComplianceRepository } from "../../repositories/compliance-repository";
import { AuditLogRepository } from "../../repositories/audit-log-repository";
import { AuditEnhancer } from "../../utils/audit-enhancer";
import { StructuredLogger } from "../../utils/structured-logger";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

const dynamoMock = mockClient(DynamoDBDocumentClient);

describe("Compliance Workflow Integration", () => {
  let complianceRepo: ComplianceRepository;
  let auditRepo: AuditLogRepository;
  let auditEnhancer: AuditEnhancer;
  let logger: StructuredLogger;

  beforeEach(() => {
    dynamoMock.reset();
    
    const config = {
      tableName: "test-table",
      region: "us-east-1",
    };

    complianceRepo = new ComplianceRepository(config);
    auditRepo = new AuditLogRepository(config);
    logger = new StructuredLogger();
    auditEnhancer = new AuditEnhancer(auditRepo, complianceRepo, logger);

    // Mock successful DynamoDB operations
    dynamoMock.resolves({});
  });

  describe("Complete GDPR Compliance Workflow", () => {
    it("should handle complete user consent lifecycle", async () => {
      const userId = "user123";
      const ipAddress = "192.168.1.1";
      const userAgent = "Mozilla/5.0";

      // 1. User grants initial consent
      const initialConsent = await complianceRepo.createConsent({
        userId,
        consentType: "data_processing",
        granted: true,
        version: "1.0",
        ipAddress,
        userAgent,
      });

      expect(initialConsent.granted).toBe(true);
      expect(initialConsent.grantedAt).toBeDefined();

      // 2. Log the consent granting with enhanced audit
      const auditResult = await auditEnhancer.logUserAction(
        {
          userId,
          action: "consent_granted",
          resource: "data_processing_consent",
          ipAddress,
          userAgent,
        },
        "success",
        {
          consentType: "data_processing",
          version: "1.0",
        }
      );

      expect(auditResult.success).toBe(true);

      // 3. User later revokes consent
      dynamoMock.resolves({
        Item: {
          ...initialConsent,
          granted: false,
          revokedAt: "2024-01-02T00:00:00.000Z",
        },
      });

      const revokedConsent = await complianceRepo.updateConsent(
        userId,
        "data_processing",
        false,
        ipAddress,
        userAgent
      );

      expect(revokedConsent.granted).toBe(false);

      // 4. Log the consent revocation
      const revokeAuditResult = await auditEnhancer.logUserAction(
        {
          userId,
          action: "consent_revoked",
          resource: "data_processing_consent",
          ipAddress,
          userAgent,
        },
        "success",
        {
          consentType: "data_processing",
          previouslyGranted: true,
        }
      );

      expect(revokeAuditResult.success).toBe(true);
    });

    it("should handle data subject access request workflow", async () => {
      const userId = "user123";
      const ipAddress = "192.168.1.1";
      const userAgent = "Mozilla/5.0";

      // Mock user data for export
      dynamoMock.onCall(0).resolves({
        Item: {
          PK: `USER#${userId}`,
          SK: "PROFILE",
          userId,
          email: "test@example.com",
        },
      });

      // Mock consents
      dynamoMock.onCall(1).resolves({
        Items: [
          {
            PK: `USER#${userId}`,
            SK: "CONSENT#data_processing",
            consentType: "data_processing",
            granted: true,
          },
        ],
        Count: 1,
      });

      // Mock other data (empty)
      dynamoMock.onCall(2).resolves({ Items: [], Count: 0 }); // KYC docs
      dynamoMock.onCall(3).resolves({ Items: [], Count: 0 }); // Audit logs
      dynamoMock.onCall(4).resolves({ Items: [], Count: 0 }); // Compliance events

      // 1. Export user data
      const userData = await complianceRepo.exportUserData(userId);

      expect(userData.profile.userId).toBe(userId);
      expect(userData.consents).toHaveLength(1);

      // 2. Log data access for export
      const accessResult = await auditEnhancer.logDataAccess(
        userId,
        "user_data_export",
        "subject_access_request",
        ipAddress,
        userAgent,
        {
          exportedDataTypes: Object.keys(userData),
          requestType: "gdpr_sar",
        }
      );

      expect(accessResult.success).toBe(true);

      // 3. Create compliance event for data export
      const complianceEvent = await complianceRepo.createComplianceEvent({
        eventType: "data_exported",
        userId,
        details: {
          exportReason: "subject_access_request",
          dataTypes: Object.keys(userData),
        },
        ipAddress,
        userAgent,
        legalBasis: "legitimate_interest",
      });

      expect(complianceEvent.eventType).toBe("data_exported");
      expect(complianceEvent.userId).toBe(userId);
    });

    it("should handle right to be forgotten workflow", async () => {
      const userId = "user123";
      const dataTypes = ["profile", "kyc_documents", "consents"];

      // 1. Create deletion request
      const deletionRequest = await complianceRepo.createDeletionRequest({
        userId,
        requestedBy: userId,
        reason: "user_request",
        dataTypes,
      });

      expect(deletionRequest.status).toBe("pending");
      expect(deletionRequest.dataTypes).toEqual(dataTypes);

      // 2. Log deletion request creation
      const auditResult = await auditEnhancer.logUserAction(
        {
          userId,
          action: "data_deletion_requested",
          resource: "user_data",
        },
        "success",
        {
          requestId: deletionRequest.requestId,
          dataTypes,
          reason: "user_request",
        }
      );

      expect(auditResult.success).toBe(true);

      // 3. Process deletion request (simulate scheduled job)
      await complianceRepo.updateDeletionRequestStatus(
        userId,
        deletionRequest.requestId,
        "processing"
      );

      // 4. Perform actual deletion
      const deletionResult = await complianceRepo.deleteUserData(userId, dataTypes);

      expect(deletionResult.deletedItems).toBeGreaterThan(0);
      expect(deletionResult.errors).toHaveLength(0);

      // 5. Mark deletion as completed
      await complianceRepo.updateDeletionRequestStatus(
        userId,
        deletionRequest.requestId,
        "completed"
      );

      // 6. Log completion
      const completionAuditResult = await auditEnhancer.logUserAction(
        {
          userId: "system",
          action: "data_deletion_completed",
          resource: "user_data",
        },
        "success",
        {
          requestId: deletionRequest.requestId,
          targetUserId: userId,
          deletedItems: deletionResult.deletedItems,
        }
      );

      expect(completionAuditResult.success).toBe(true);
    });

    it("should handle data retention policy enforcement", async () => {
      // 1. Create retention policy
      const policy = await complianceRepo.createRetentionPolicy(
        "audit_logs",
        365,
        "Audit logs must be retained for 1 year for compliance",
        "Legal obligation under financial regulations",
        true,
        "admin123"
      );

      expect(policy.retentionPeriodDays).toBe(365);
      expect(policy.autoDeleteEnabled).toBe(true);

      // 2. Mock old data for deletion
      dynamoMock.onCall(0).resolves({
        Items: [policy],
        Count: 1,
      });

      // Mock old audit logs
      dynamoMock.onCall(1).resolves({
        Items: [
          {
            PK: "AUDIT#2022-01-01",
            SK: "2022-01-01T00:00:00.000Z#user123#login",
            timestamp: "2022-01-01T00:00:00.000Z",
          },
        ],
        Count: 1,
      });

      // Mock deletion
      dynamoMock.onCall(2).resolves({});

      // 3. Apply retention policies
      const retentionResult = await complianceRepo.applyRetentionPolicies();

      expect(retentionResult.processedPolicies).toBe(1);
      expect(retentionResult.deletedItems).toBe(1);
      expect(retentionResult.errors).toHaveLength(0);

      // 4. Log retention enforcement
      const retentionEvent = await complianceRepo.createComplianceEvent({
        eventType: "retention_applied",
        userId: "system",
        details: {
          policyType: "audit_logs",
          retentionPeriodDays: 365,
          deletedItems: retentionResult.deletedItems,
        },
        legalBasis: "legal_obligation",
      });

      expect(retentionEvent.eventType).toBe("retention_applied");
    });

    it("should handle admin KYC review with comprehensive audit trail", async () => {
      const adminUserId = "admin123";
      const targetUserId = "user456";
      const documentId = "doc789";
      const ipAddress = "10.0.0.1";
      const userAgent = "Admin-Browser/1.0";

      // 1. Log admin access to review system
      const accessResult = await auditEnhancer.logAdminAction(
        adminUserId,
        targetUserId,
        "kyc_review_access",
        "kyc_review_system",
        "success",
        ipAddress,
        userAgent,
        {
          documentId,
          reviewType: "national_id",
        }
      );

      expect(accessResult.success).toBe(true);

      // 2. Log document approval
      const approvalResult = await auditEnhancer.logAdminAction(
        adminUserId,
        targetUserId,
        "kyc_approve",
        "kyc_document",
        "success",
        ipAddress,
        userAgent,
        {
          documentId,
          reviewComments: "Document verified successfully",
          processingTimeMs: 45000,
        }
      );

      expect(approvalResult.success).toBe(true);

      // 3. Create compliance event for KYC approval
      const complianceEvent = await complianceRepo.createComplianceEvent({
        eventType: "data_accessed",
        userId: adminUserId,
        details: {
          action: "kyc_document_review",
          targetUserId,
          documentId,
          reviewResult: "approved",
          dataProcessed: ["national_id_image", "personal_details"],
        },
        ipAddress,
        userAgent,
        legalBasis: "legal_obligation",
      });

      expect(complianceEvent.eventType).toBe("data_accessed");
      expect(complianceEvent.details.targetUserId).toBe(targetUserId);
    });
  });

  describe("Audit Trail Integrity", () => {
    it("should maintain chronological audit trail", async () => {
      const userId = "user123";
      const actions = [
        "user_registration",
        "email_verification",
        "kyc_upload",
        "kyc_approval",
        "first_login",
      ];

      // Create sequential audit entries
      for (let i = 0; i < actions.length; i++) {
        await auditEnhancer.logUserAction(
          {
            userId,
            action: actions[i],
            resource: "user_lifecycle",
          },
          "success",
          {
            step: i + 1,
            totalSteps: actions.length,
          }
        );

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify all audit entries were created
      expect(dynamoMock.calls()).toHaveLength(actions.length * 2); // Each action creates audit + compliance event
    });

    it("should handle concurrent audit logging", async () => {
      const userIds = ["user1", "user2", "user3"];
      const promises = userIds.map(userId =>
        auditEnhancer.logUserAction(
          {
            userId,
            action: "concurrent_action",
            resource: "test_resource",
          },
          "success",
          { timestamp: Date.now() }
        )
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle partial failures in compliance workflow", async () => {
      const userId = "user123";

      // Mock audit log success but compliance event failure
      dynamoMock.onCall(0).resolves({}); // Audit log succeeds
      dynamoMock.onCall(1).rejects(new Error("Compliance event failed")); // Compliance event fails

      const result = await auditEnhancer.logUserAction(
        {
          userId,
          action: "data_access",
          resource: "sensitive_data",
        },
        "success"
      );

      // Should still report failure due to compliance event failure
      expect(result.success).toBe(false);
      expect(result.error).toContain("Compliance event failed");
    });

    it("should handle data retention policy failures gracefully", async () => {
      // Mock policy retrieval success
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

      // Mock scan failure
      dynamoMock.onCall(1).rejects(new Error("Scan operation failed"));

      const result = await complianceRepo.applyRetentionPolicies();

      expect(result.processedPolicies).toBe(0);
      expect(result.deletedItems).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Scan operation failed");
    });
  });
});