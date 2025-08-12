import { APIGatewayProxyHandler, ScheduledEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { ComplianceRepository } from "../../repositories/compliance-repository";
import { AuditLogRepository } from "../../repositories/audit-log-repository";
import { UserRepository } from "../../repositories/user-repository";
import { KYCDocumentRepository } from "../../repositories/kyc-document-repository";
import { StructuredLogger, createKYCLogger } from "../../utils/structured-logger";
import { ExponentialBackoff } from "../../utils/retry";

const dynamoClient = new DynamoDBClient({});
const s3Client = new S3Client({});

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

const logger = createKYCLogger();
const retry = new ExponentialBackoff({
  maxRetries: 3,
  baseDelay: 200,
  maxDelay: 5000,
  jitterType: "full",
});

const complianceRepo = new ComplianceRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const auditRepo = new AuditLogRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const userRepo = new UserRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const kycRepo = new KYCDocumentRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

// API Gateway handler for compliance operations
export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext.requestId;
  const path = event.path;
  const method = event.httpMethod;
  const userId = extractUserId(event);
  const clientIP = getClientIP(event);
  const userAgent = event.headers["User-Agent"];

  logger.info("Compliance API invoked", {
    operation: "ComplianceAPI",
    requestId,
    path,
    method,
    userId,
  });

  try {
    let result;

    switch (true) {
      case path.includes("/consent") && method === "POST":
        result = await handleConsentUpdate(event);
        break;
      case path.includes("/consent") && method === "GET":
        result = await handleGetConsents(event);
        break;
      case path.includes("/data-export") && method === "POST":
        result = await handleDataExport(event);
        break;
      case path.includes("/data-deletion") && method === "POST":
        result = await handleDataDeletionRequest(event);
        break;
      case path.includes("/retention-policies") && method === "GET":
        result = await handleGetRetentionPolicies(event);
        break;
      default:
        result = {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Endpoint not found" }),
        };
    }

    // Log successful compliance operation
    await auditRepo.createAuditLog({
      userId: userId || "anonymous",
      action: `compliance_${path.replace("/", "").replace("-", "_")}`,
      resource: "compliance_api",
      result: "success",
      ipAddress: clientIP,
      userAgent,
      details: {
        requestId,
        path,
        method,
        statusCode: result.statusCode,
      },
    });

    return result;
  } catch (error) {
    logger.error("Compliance API error", {
      operation: "ComplianceAPI",
      requestId,
      path,
      method,
      userId,
    }, error as Error);

    // Log failed compliance operation
    await auditRepo.createAuditLog({
      userId: userId || "anonymous",
      action: `compliance_${path.replace("/", "").replace("-", "_")}`,
      resource: "compliance_api",
      result: "failure",
      ipAddress: clientIP,
      userAgent,
      errorMessage: (error as Error).message,
      details: {
        requestId,
        path,
        method,
      },
    });

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Internal server error",
        requestId,
      }),
    };
  }
};

async function handleConsentUpdate(event: any) {
  const request = JSON.parse(event.body || "{}");
  const userId = extractUserId(event);
  const clientIP = getClientIP(event);
  const userAgent = event.headers["User-Agent"];

  if (!userId || !request.consentType || typeof request.granted !== "boolean") {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Missing required fields" }),
    };
  }

  const consent = await complianceRepo.updateConsent(
    userId,
    request.consentType,
    request.granted,
    clientIP,
    userAgent
  );

  // Log compliance event
  await complianceRepo.createComplianceEvent({
    eventType: request.granted ? "consent_granted" : "consent_revoked",
    userId,
    details: {
      consentType: request.consentType,
      version: request.version || "1.0",
    },
    ipAddress: clientIP,
    userAgent,
    legalBasis: "consent",
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Consent updated successfully",
      consent,
    }),
  };
}

async function handleGetConsents(event: any) {
  const userId = extractUserId(event);

  if (!userId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "User ID required" }),
    };
  }

  const consents = await complianceRepo.getUserConsents(userId);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consents }),
  };
}

async function handleDataExport(event: any) {
  const userId = extractUserId(event);
  const clientIP = getClientIP(event);
  const userAgent = event.headers["User-Agent"];

  if (!userId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "User ID required" }),
    };
  }

  const userData = await complianceRepo.exportUserData(userId);

  // Log data access event
  await complianceRepo.createComplianceEvent({
    eventType: "data_exported",
    userId,
    details: {
      exportedDataTypes: Object.keys(userData),
      recordCounts: {
        profile: userData.profile ? 1 : 0,
        consents: userData.consents.length,
        kycDocuments: userData.kycDocuments.length,
        auditLogs: userData.auditLogs.length,
        complianceEvents: userData.complianceEvents.length,
      },
    },
    ipAddress: clientIP,
    userAgent,
    legalBasis: "legitimate_interest",
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Data exported successfully",
      data: userData,
    }),
  };
}

async function handleDataDeletionRequest(event: any) {
  const request = JSON.parse(event.body || "{}");
  const userId = extractUserId(event);

  if (!userId || !request.dataTypes || !Array.isArray(request.dataTypes)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Missing required fields" }),
    };
  }

  const deletionRequest = await complianceRepo.createDeletionRequest({
    userId,
    requestedBy: userId,
    reason: request.reason || "user_request",
    dataTypes: request.dataTypes,
    scheduledFor: request.scheduledFor,
  });

  // Log compliance event
  await complianceRepo.createComplianceEvent({
    eventType: "data_deleted",
    userId,
    details: {
      requestId: deletionRequest.requestId,
      dataTypes: request.dataTypes,
      reason: request.reason || "user_request",
    },
    legalBasis: "consent",
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Data deletion request created",
      requestId: deletionRequest.requestId,
    }),
  };
}

async function handleGetRetentionPolicies(event: any) {
  const policies = await complianceRepo.getAllRetentionPolicies();

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policies }),
  };
}

// Scheduled handler for data retention enforcement
export const retentionHandler = async (event: ScheduledEvent) => {
  logger.info("Data retention enforcement started", {
    operation: "DataRetention",
    scheduledTime: event.time,
  });

  try {
    const result = await complianceRepo.applyRetentionPolicies();

    logger.info("Data retention enforcement completed", {
      operation: "DataRetention",
      processedPolicies: result.processedPolicies,
      deletedItems: result.deletedItems,
      errors: result.errors,
    });

    // Log retention enforcement event
    await complianceRepo.createComplianceEvent({
      eventType: "retention_applied",
      userId: "system",
      details: {
        processedPolicies: result.processedPolicies,
        deletedItems: result.deletedItems,
        errors: result.errors,
      },
      legalBasis: "legal_obligation",
    });

    return {
      statusCode: 200,
      message: "Data retention policies applied successfully",
      result,
    };
  } catch (error) {
    logger.error("Data retention enforcement failed", {
      operation: "DataRetention",
    }, error as Error);

    throw error;
  }
};

// Scheduled handler for processing data deletion requests
export const deletionHandler = async (event: ScheduledEvent) => {
  logger.info("Data deletion processing started", {
    operation: "DataDeletion",
    scheduledTime: event.time,
  });

  try {
    const pendingRequests = await complianceRepo.getPendingDeletionRequests({ limit: 10 });

    for (const request of pendingRequests.items) {
      try {
        // Update status to processing
        await complianceRepo.updateDeletionRequestStatus(
          request.userId,
          request.requestId,
          "processing"
        );

        // Delete S3 objects for KYC documents if included
        if (request.dataTypes.includes("kyc_documents")) {
          const kycDocs = await kycRepo.getUserKYCDocuments(request.userId);
          for (const doc of kycDocs.items) {
            try {
              await s3Client.send(new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: doc.s3Key,
              }));
            } catch (s3Error) {
              logger.warn("Failed to delete S3 object", {
                operation: "DataDeletion",
                s3Key: doc.s3Key,
                error: (s3Error as Error).message,
              });
            }
          }
        }

        // Delete data from DynamoDB
        const deletionResult = await complianceRepo.deleteUserData(
          request.userId,
          request.dataTypes
        );

        if (deletionResult.errors.length > 0) {
          await complianceRepo.updateDeletionRequestStatus(
            request.userId,
            request.requestId,
            "failed",
            deletionResult.errors.join("; ")
          );
        } else {
          await complianceRepo.updateDeletionRequestStatus(
            request.userId,
            request.requestId,
            "completed"
          );
        }

        logger.info("Data deletion request processed", {
          operation: "DataDeletion",
          requestId: request.requestId,
          userId: request.userId,
          deletedItems: deletionResult.deletedItems,
          errors: deletionResult.errors,
        });

      } catch (error) {
        logger.error("Failed to process deletion request", {
          operation: "DataDeletion",
          requestId: request.requestId,
          userId: request.userId,
        }, error as Error);

        await complianceRepo.updateDeletionRequestStatus(
          request.userId,
          request.requestId,
          "failed",
          (error as Error).message
        );
      }
    }

    return {
      statusCode: 200,
      message: "Data deletion requests processed",
      processedRequests: pendingRequests.items.length,
    };
  } catch (error) {
    logger.error("Data deletion processing failed", {
      operation: "DataDeletion",
    }, error as Error);

    throw error;
  }
};

function extractUserId(event: any): string | null {
  // Extract user ID from JWT token or request context
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (authHeader) {
    // In production, decode JWT and extract user ID
    return "user-placeholder";
  }
  return null;
}

function getClientIP(event: any): string | undefined {
  return event.requestContext.identity?.sourceIp;
}