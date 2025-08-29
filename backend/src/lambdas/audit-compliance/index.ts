import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { AuditLogRepository } from "../../repositories/audit-log-repository";
import { ComplianceRepository } from "../../repositories/compliance-repository";
import { ComplianceService } from "../../utils/compliance-service";
import { StructuredLogger } from "../../utils/structured-logger";
import { enhancedErrorHandler } from "../../utils/enhanced-error-handler";
import { validateJWT } from "../../utils/jwt-utils";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.DYNAMODB_TABLE_NAME!;

const auditRepo = new AuditLogRepository({ client: dynamoClient, tableName });
const complianceRepo = new ComplianceRepository({ client: dynamoClient, tableName });
const logger = new StructuredLogger("audit-compliance");
const complianceService = new ComplianceService(complianceRepo, auditRepo, logger);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return enhancedErrorHandler(async () => {
    logger.info("Audit compliance request received", {
      operation: "audit-compliance",
      httpMethod: event.httpMethod,
      path: event.path,
    });

    // Validate JWT token
    const authResult = await validateJWT(event.headers.Authorization);
    if (!authResult.isValid || !authResult.payload) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const { sub: userId, "custom:user_type": userType } = authResult.payload;

    // Only allow admin users to access compliance endpoints
    if (userType !== "admin") {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Insufficient permissions" }),
      };
    }

    const method = event.httpMethod;
    const pathSegments = event.path.split("/").filter(Boolean);

    switch (method) {
      case "GET":
        return await handleGetRequest(pathSegments, event.queryStringParameters, userId);
      case "POST":
        return await handlePostRequest(pathSegments, event.body, userId);
      default:
        return {
          statusCode: 405,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }
  }, logger);
};

async function handleGetRequest(
  pathSegments: string[],
  queryParams: Record<string, string> | null,
  userId: string
): Promise<APIGatewayProxyResult> {
  const endpoint = pathSegments[pathSegments.length - 1];

  switch (endpoint) {
    case "report":
      return await generateComplianceReport(queryParams, userId);
    case "retention-status":
      return await getRetentionStatus(userId);
    case "audit-logs":
      return await getAuditLogs(queryParams, userId);
    default:
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Endpoint not found" }),
      };
  }
}

async function handlePostRequest(
  pathSegments: string[],
  body: string | null,
  userId: string
): Promise<APIGatewayProxyResult> {
  const endpoint = pathSegments[pathSegments.length - 1];

  switch (endpoint) {
    case "enforce-retention":
      return await enforceDataRetention(userId);
    case "track-access":
      return await trackDataAccess(body, userId);
    default:
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Endpoint not found" }),
      };
  }
}

async function generateComplianceReport(
  queryParams: Record<string, string> | null,
  userId: string
): Promise<APIGatewayProxyResult> {
  const startDate = queryParams?.startDate;
  const endDate = queryParams?.endDate;

  if (!startDate || !endDate) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "startDate and endDate query parameters are required",
      }),
    };
  }

  try {
    const report = await complianceService.generateComplianceReport(startDate, endDate);

    // Log the compliance report generation
    await auditRepo.createAuditLog({
      userId,
      action: "compliance_report_generated",
      resource: "compliance_report",
      result: "success",
      details: {
        reportPeriod: { startDate, endDate },
        totalAuditLogs: report.metrics.totalAuditLogs,
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report }),
    };
  } catch (error) {
    logger.error("Failed to generate compliance report", {
      operation: "generateComplianceReport",
      userId,
      startDate,
      endDate,
    }, error as Error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to generate compliance report" }),
    };
  }
}

async function getRetentionStatus(userId: string): Promise<APIGatewayProxyResult> {
  try {
    const validation = await complianceService.validateRetentionCompliance();

    // Log the retention status check
    await auditRepo.createAuditLog({
      userId,
      action: "retention_status_checked",
      resource: "data_retention",
      result: "success",
      details: {
        compliant: validation.compliant,
        violationsCount: validation.violations.length,
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retentionStatus: validation }),
    };
  } catch (error) {
    logger.error("Failed to get retention status", {
      operation: "getRetentionStatus",
      userId,
    }, error as Error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to get retention status" }),
    };
  }
}

async function getAuditLogs(
  queryParams: Record<string, string> | null,
  userId: string
): Promise<APIGatewayProxyResult> {
  try {
    const date = queryParams?.date;
    const action = queryParams?.action;
    const targetUserId = queryParams?.userId;
    const limit = queryParams?.limit ? parseInt(queryParams.limit) : 50;

    let auditLogs;

    if (date) {
      auditLogs = await auditRepo.getAuditLogsByDate(date, { limit });
    } else if (action) {
      auditLogs = await auditRepo.getAuditLogsByAction(action, { limit });
    } else if (targetUserId) {
      auditLogs = await auditRepo.getAuditLogsByUser(targetUserId, { limit });
    } else {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "At least one filter parameter (date, action, or userId) is required",
        }),
      };
    }

    // Log the audit log access
    await auditRepo.createAuditLog({
      userId,
      action: "audit_logs_accessed",
      resource: "audit_logs",
      result: "success",
      details: {
        filters: { date, action, targetUserId },
        resultCount: auditLogs.count,
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditLogs }),
    };
  } catch (error) {
    logger.error("Failed to get audit logs", {
      operation: "getAuditLogs",
      userId,
    }, error as Error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to get audit logs" }),
    };
  }
}

async function enforceDataRetention(userId: string): Promise<APIGatewayProxyResult> {
  try {
    const results = await complianceService.enforceDataRetention();

    // Log the data retention enforcement
    await auditRepo.createAuditLog({
      userId,
      action: "data_retention_enforced",
      resource: "data_retention",
      result: results.errors.length === 0 ? "success" : "failure",
      errorMessage: results.errors.join("; "),
      details: {
        auditLogsDeleted: results.auditLogsDeleted,
        complianceEventsDeleted: results.complianceEventsDeleted,
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retentionResults: results }),
    };
  } catch (error) {
    logger.error("Failed to enforce data retention", {
      operation: "enforceDataRetention",
      userId,
    }, error as Error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to enforce data retention" }),
    };
  }
}

async function trackDataAccess(
  body: string | null,
  userId: string
): Promise<APIGatewayProxyResult> {
  if (!body) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Request body is required" }),
    };
  }

  try {
    const { dataType, accessReason, ipAddress, userAgent } = JSON.parse(body);

    if (!dataType || !accessReason) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "dataType and accessReason are required",
        }),
      };
    }

    await complianceService.trackDataAccess(
      userId,
      dataType,
      accessReason,
      ipAddress,
      userAgent
    );

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Data access tracked successfully" }),
    };
  } catch (error) {
    logger.error("Failed to track data access", {
      operation: "trackDataAccess",
      userId,
    }, error as Error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to track data access" }),
    };
  }
}