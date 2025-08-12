import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { KYCDocumentRepository } from "../../repositories/kyc-document-repository";
import { UserRepository } from "../../repositories/user-repository";
import { AuditLogRepository } from "../../repositories/audit-log-repository";
import { ExponentialBackoff } from "../../utils/retry";
import {
  StructuredLogger,
  createKYCLogger,
} from "../../utils/structured-logger";
import { ErrorClassifier } from "../../utils/error-handler";
import {
  EventBridgeService,
  createEventBridgeService,
} from "../../utils/eventbridge-service";
import { AdminReviewRequest, AdminReviewResponse, AdminAction } from "./types";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cloudWatchClient = new CloudWatchClient({});

const TABLE_NAME = process.env.TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;
const ENVIRONMENT = process.env.ENVIRONMENT!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Initialize services
const logger = createKYCLogger();
const retry = new ExponentialBackoff({
  maxRetries: 3,
  baseDelay: 200,
  maxDelay: 5000,
  jitterType: "full",
});

const kycRepo = new KYCDocumentRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const userRepo = new UserRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const auditRepo = new AuditLogRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const eventBridgeService = createEventBridgeService({
  eventBusName: EVENT_BUS_NAME,
  region: AWS_REGION,
  maxRetries: 3,
});

export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Admin Review Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
  });

  try {
    const path = event.path;
    let result;

    if (path === "/approve" && event.httpMethod === "POST") {
      result = await handleApproval(event);
    } else if (path === "/reject" && event.httpMethod === "POST") {
      result = await handleRejection(event);
    } else if (path === "/documents" && event.httpMethod === "GET") {
      result = await handleGetDocuments(event);
    } else {
      logger.warn("Endpoint not found", {
        operation: "RouteNotFound",
        requestId,
        path: event.path,
        method: event.httpMethod,
      });

      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Endpoint not found" }),
      };
    }

    const duration = Date.now() - startTime;
    logger.info("Admin Review Lambda completed successfully", {
      operation: "LambdaInvocation",
      requestId,
      duration,
      statusCode: result.statusCode,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorDetails = ErrorClassifier.classify(error as Error, {
      operation: "LambdaInvocation",
      requestId,
      duration,
    });

    logger.error(
      "Admin Review Lambda failed",
      {
        operation: "LambdaInvocation",
        requestId,
        duration,
        errorCategory: errorDetails.category,
        errorCode: errorDetails.errorCode,
      },
      error as Error
    );

    await putMetricSafe("AdminReviewError", 1, {
      errorCategory: errorDetails.category,
    });

    return {
      statusCode: errorDetails.httpStatusCode || 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: errorDetails.userMessage,
        requestId,
      }),
    };
  }
};

async function handleApproval(event: APIGatewayProxyEvent): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("KYC approval started", {
    operation: "KYCApproval",
    requestId,
  });

  try {
    const request: AdminReviewRequest = JSON.parse(event.body || "{}");
    const adminUserId = extractAdminUserId(event);

    // Validate request
    const validation = validateReviewRequest(request);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    // Get the document
    const document = await kycRepo.getKYCDocument(
      request.userId,
      request.documentId
    );
    if (!document) {
      return createErrorResponse(404, "Document not found");
    }

    if (document.status !== "pending") {
      return createErrorResponse(400, "Document is not in pending status");
    }

    // Approve the document with retry logic
    await retry.execute(
      () =>
        kycRepo.approveDocument(
          request.userId,
          request.documentId,
          adminUserId,
          request.comments
        ),
      `DynamoDB-ApproveDocument-${request.documentId}`
    );

    // Update user KYC status to approved
    await retry.execute(
      () =>
        userRepo.updateUserProfile({
          userId: request.userId,
          kycStatus: "approved",
        }),
      `DynamoDB-UpdateUserKYC-${request.userId}`
    );

    // Create audit log
    await auditRepo.logKYCReview(
      adminUserId,
      request.userId,
      request.documentId,
      "approve",
      "success",
      getClientIP(event),
      event.headers["User-Agent"]
    );

    // Get user profile to determine user type
    const userProfile = await userRepo.getUserProfile(request.userId);
    const userType = userProfile?.userType || "entrepreneur";

    // Publish EventBridge events
    await eventBridgeService.publishKYCStatusChangeEvent({
      userId: request.userId,
      documentId: request.documentId,
      previousStatus: "pending",
      newStatus: "approved",
      reviewedBy: adminUserId,
      reviewComments: request.comments,
      documentType: "national_id",
      userType: userType as "entrepreneur" | "investor",
    });

    await eventBridgeService.publishKYCReviewCompletedEvent({
      userId: request.userId,
      documentId: request.documentId,
      reviewedBy: adminUserId,
      reviewResult: "approved",
      reviewComments: request.comments,
      documentType: "national_id",
      processingTimeMs: Date.now() - startTime,
    });

    const duration = Date.now() - startTime;
    logger.info("KYC approval completed successfully", {
      operation: "KYCApproval",
      requestId,
      userId: request.userId,
      documentId: request.documentId,
      reviewedBy: adminUserId,
      duration,
    });

    await putMetricSafe("KYCApprovalSuccess", 1);

    const response: AdminReviewResponse = {
      message: "Document approved successfully",
      documentId: request.documentId,
      status: "approved",
      reviewedBy: adminUserId,
      reviewedAt: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorDetails = ErrorClassifier.classify(error as Error, {
      operation: "KYCApproval",
      requestId,
      duration,
    });

    logger.error(
      "KYC approval failed",
      {
        operation: "KYCApproval",
        requestId,
        duration,
        errorCategory: errorDetails.category,
      },
      error as Error
    );

    await putMetricSafe("KYCApprovalError", 1, {
      errorCategory: errorDetails.category,
    });

    return createErrorResponse(
      errorDetails.httpStatusCode || 500,
      errorDetails.userMessage,
      requestId
    );
  }
}

async function handleRejection(event: APIGatewayProxyEvent): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("KYC rejection started", {
    operation: "KYCRejection",
    requestId,
  });

  try {
    const request: AdminReviewRequest = JSON.parse(event.body || "{}");
    const adminUserId = extractAdminUserId(event);

    // Validate request
    const validation = validateReviewRequest(request);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    if (!request.comments || request.comments.trim().length === 0) {
      return createErrorResponse(400, "Comments are required for rejection");
    }

    // Get the document
    const document = await kycRepo.getKYCDocument(
      request.userId,
      request.documentId
    );
    if (!document) {
      return createErrorResponse(404, "Document not found");
    }

    if (document.status !== "pending") {
      return createErrorResponse(400, "Document is not in pending status");
    }

    // Reject the document with retry logic
    await retry.execute(
      () =>
        kycRepo.rejectDocument(
          request.userId,
          request.documentId,
          adminUserId,
          request.comments
        ),
      `DynamoDB-RejectDocument-${request.documentId}`
    );

    // Update user KYC status to rejected
    await retry.execute(
      () =>
        userRepo.updateUserProfile({
          userId: request.userId,
          kycStatus: "rejected",
        }),
      `DynamoDB-UpdateUserKYC-${request.userId}`
    );

    // Create audit log
    await auditRepo.logKYCReview(
      adminUserId,
      request.userId,
      request.documentId,
      "reject",
      "success",
      getClientIP(event),
      event.headers["User-Agent"]
    );

    // Get user profile to determine user type
    const userProfile = await userRepo.getUserProfile(request.userId);
    const userType = userProfile?.userType || "entrepreneur";

    // Publish EventBridge events
    await eventBridgeService.publishKYCStatusChangeEvent({
      userId: request.userId,
      documentId: request.documentId,
      previousStatus: "pending",
      newStatus: "rejected",
      reviewedBy: adminUserId,
      reviewComments: request.comments,
      documentType: "national_id",
      userType: userType as "entrepreneur" | "investor",
    });

    await eventBridgeService.publishKYCReviewCompletedEvent({
      userId: request.userId,
      documentId: request.documentId,
      reviewedBy: adminUserId,
      reviewResult: "rejected",
      reviewComments: request.comments,
      documentType: "national_id",
      processingTimeMs: Date.now() - startTime,
    });

    const duration = Date.now() - startTime;
    logger.info("KYC rejection completed successfully", {
      operation: "KYCRejection",
      requestId,
      userId: request.userId,
      documentId: request.documentId,
      reviewedBy: adminUserId,
      duration,
    });

    await putMetricSafe("KYCRejectionSuccess", 1);

    const response: AdminReviewResponse = {
      message: "Document rejected successfully",
      documentId: request.documentId,
      status: "rejected",
      reviewedBy: adminUserId,
      reviewedAt: new Date().toISOString(),
      comments: request.comments,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorDetails = ErrorClassifier.classify(error as Error, {
      operation: "KYCRejection",
      requestId,
      duration,
    });

    logger.error(
      "KYC rejection failed",
      {
        operation: "KYCRejection",
        requestId,
        duration,
        errorCategory: errorDetails.category,
      },
      error as Error
    );

    await putMetricSafe("KYCRejectionError", 1, {
      errorCategory: errorDetails.category,
    });

    return createErrorResponse(
      errorDetails.httpStatusCode || 500,
      errorDetails.userMessage,
      requestId
    );
  }
}

async function handleGetDocuments(event: APIGatewayProxyEvent): Promise<any> {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status as
      | "pending"
      | "approved"
      | "rejected"
      | undefined;
    const limit = queryParams.limit ? parseInt(queryParams.limit) : 50;

    let documents;
    if (status) {
      documents = await kycRepo.getDocumentsByStatus(status, { limit });
    } else {
      documents = await kycRepo.getPendingDocuments({ limit });
    }

    await putMetricSafe("DocumentsRetrieved", documents.count);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        documents: documents.items,
        count: documents.count,
        lastEvaluatedKey: documents.lastEvaluatedKey,
      }),
    };
  } catch (error) {
    logger.error(
      "Failed to retrieve documents",
      {
        operation: "GetDocuments",
        requestId,
      },
      error as Error
    );

    return createErrorResponse(500, "Failed to retrieve documents", requestId);
  }
}

function validateReviewRequest(request: any): {
  isValid: boolean;
  error?: string;
} {
  if (!request.userId || typeof request.userId !== "string") {
    return { isValid: false, error: "Invalid user ID" };
  }

  if (!request.documentId || typeof request.documentId !== "string") {
    return { isValid: false, error: "Invalid document ID" };
  }

  return { isValid: true };
}

function extractAdminUserId(event: APIGatewayProxyEvent): string {
  // Extract admin user ID from JWT token or request context
  // For now, using a placeholder - in production, this would extract from Cognito JWT
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (authHeader) {
    // In production, decode JWT and extract user ID
    return "admin-user-placeholder";
  }
  return "system-admin";
}

function getClientIP(event: APIGatewayProxyEvent): string | undefined {
  return event.requestContext.identity?.sourceIp;
}

function createErrorResponse(
  statusCode: number,
  message: string,
  requestId?: string
): any {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      message,
      ...(requestId && { requestId }),
    }),
  };
}

async function putMetricSafe(
  metricName: string,
  value: number,
  dimensions: Record<string, string> = {}
): Promise<void> {
  try {
    const metricDimensions = [
      { Name: "Environment", Value: ENVIRONMENT },
      ...Object.entries(dimensions).map(([name, value]) => ({
        Name: name,
        Value: value,
      })),
    ];

    await retry.execute(
      () =>
        cloudWatchClient.send(
          new PutMetricDataCommand({
            Namespace: "Sachain/AdminReview",
            MetricData: [
              {
                MetricName: metricName,
                Value: value,
                Unit: "Count",
                Dimensions: metricDimensions,
                Timestamp: new Date(),
              },
            ],
          })
        ),
      `CloudWatch-${metricName}`
    );

    logger.logMetricPublication(metricName, value, true);
  } catch (error) {
    logger.logMetricPublication(metricName, value, false, error as Error);
  }
}
