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
import { AdminReviewRequest, AdminReviewResponse } from "./types";

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
  const adminUserId = extractAdminUserId(event);
  const clientIP = getClientIP(event);
  const userAgent = event.headers["User-Agent"];

  // Enhanced audit logging for admin access
  await createAuditLogSafe({
    userId: adminUserId,
    action: "admin_access",
    resource: `admin_endpoint:${event.path}`,
    result: "success",
    ipAddress: clientIP,
    userAgent,
    details: {
      httpMethod: event.httpMethod,
      path: event.path,
      requestId,
    },
  });

  logger.info("Admin Review Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
    adminUserId,
    clientIP,
  });

  try {
    const path = event.path;
    let result;

    if (path === "/admin/approve" && event.httpMethod === "POST") {
      result = await handleApproval(event);
    } else if (path === "/admin/reject" && event.httpMethod === "POST") {
      result = await handleRejection(event);
    } else if (path === "/admin/documents" && event.httpMethod === "GET") {
      result = await handleGetDocuments(event);
    } else {
      // Enhanced audit logging for unknown endpoints
      await createAuditLogSafe({
        userId: adminUserId,
        action: "admin_access",
        resource: `admin_endpoint:${event.path}`,
        result: "failure",
        ipAddress: clientIP,
        userAgent,
        errorMessage: "Endpoint not found",
        details: {
          httpMethod: event.httpMethod,
          path: event.path,
          requestId,
        },
      });

      logger.warn("Endpoint not found", {
        operation: "RouteNotFound",
        requestId,
        path: event.path,
        method: event.httpMethod,
        adminUserId,
      });

      await putMetricSafe("AdminEndpointNotFound", 1, {
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
      adminUserId,
    });

    await putMetricSafe("AdminOperationSuccess", 1, {
      operation: path.replace("/", ""),
      statusCode: result.statusCode.toString(),
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorDetails = ErrorClassifier.classify(error as Error, {
      operation: "LambdaInvocation",
      requestId,
      duration,
      adminUserId,
    });

    // Enhanced audit logging for critical failures
    await createAuditLogSafe({
      userId: adminUserId,
      action: "admin_operation_failure",
      resource: `admin_endpoint:${event.path}`,
      result: "failure",
      ipAddress: clientIP,
      userAgent,
      errorMessage: errorDetails.technicalMessage,
      details: {
        httpMethod: event.httpMethod,
        path: event.path,
        requestId,
        errorCategory: errorDetails.category,
        errorCode: errorDetails.errorCode,
        duration,
      },
    });

    logger.error(
      "Admin Review Lambda failed",
      {
        operation: "LambdaInvocation",
        requestId,
        duration,
        errorCategory: errorDetails.category,
        errorCode: errorDetails.errorCode,
        adminUserId,
      },
      error as Error
    );

    await putMetricSafe("AdminReviewError", 1, {
      errorCategory: errorDetails.category,
      operation: event.path.replace("/", ""),
    });

    // Send critical error alarm for admin operations
    await putMetricSafe("AdminOperationCriticalError", 1, {
      errorCategory: errorDetails.category,
      operation: event.path.replace("/", ""),
      adminUserId,
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
  const adminUserId = extractAdminUserId(event);
  const clientIP = getClientIP(event);
  const userAgent = event.headers["User-Agent"];

  logger.info("KYC approval started", {
    operation: "KYCApproval",
    requestId,
    adminUserId,
  });

  try {
    const request: AdminReviewRequest = parseRequestBody(
      event.body,
      event.isBase64Encoded
    );

    // Enhanced validation with audit logging
    const validation = validateReviewRequest(request);
    if (!validation.isValid) {
      await createAuditLogSafe({
        userId: adminUserId,
        action: "kyc_approve",
        resource: `kyc_document:${request.documentId || "unknown"}`,
        result: "failure",
        ipAddress: clientIP,
        userAgent,
        errorMessage: validation.error!,
        details: { requestId, validationError: validation.error },
      });

      return createErrorResponse(400, validation.error!, requestId);
    }

    // Log approval attempt
    await createAuditLogSafe({
      userId: adminUserId,
      action: "kyc_approve_attempt",
      resource: `kyc_document:${request.documentId}`,
      result: "success",
      ipAddress: clientIP,
      userAgent,
      details: {
        requestId,
        targetUserId: request.userId,
        documentId: request.documentId,
        hasComments: !!request.comments,
      },
    });

    // Get the document with enhanced error handling
    const document = await executeWithRetryAndAudit(
      () => kycRepo.getKYCDocument(request.userId, request.documentId),
      `DynamoDB-GetDocument-${request.documentId}`,
      {
        adminUserId,
        action: "kyc_approve",
        resource: `kyc_document:${request.documentId}`,
        clientIP,
        userAgent,
        requestId,
        step: "get_document",
      }
    );
    // Add this debug log after getting the document
    console.log("Retrieved document:", JSON.stringify(document, null, 2));
    console.log("Document status:", document?.status);
    console.log("Document keys:", Object.keys(document || {}));
    if (!document) {
      await createAuditLogSafe({
        userId: adminUserId,
        action: "kyc_approve",
        resource: `kyc_document:${request.documentId}`,
        result: "failure",
        ipAddress: clientIP,
        userAgent,
        errorMessage: "Document not found",
        details: {
          requestId,
          targetUserId: request.userId,
          documentId: request.documentId,
        },
      });

      return createErrorResponse(404, "Document not found", requestId);
    }

    if (!document.status || document.status !== "pending") {
      const actualStatus = document.status || "undefined";
      await createAuditLogSafe({
        userId: adminUserId,
        action: "kyc_approve",
        resource: `kyc_document:${request.documentId}`,
        result: "failure",
        ipAddress: clientIP,
        userAgent,
        errorMessage: `Document status is ${actualStatus}, not pending`,
        details: {
          requestId,
          targetUserId: request.userId,
          documentId: request.documentId,
          currentStatus: document.status,
        },
      });

      return createErrorResponse(
        400,
        "Document is not in pending status",
        requestId
      );
    }

    // Approve the document with enhanced error handling
    await executeWithRetryAndAudit(
      () =>
        kycRepo.approveDocument(
          request.userId,
          request.documentId,
          adminUserId,
          request.comments
        ),
      `DynamoDB-ApproveDocument-${request.documentId}`,
      {
        adminUserId,
        action: "kyc_approve",
        resource: `kyc_document:${request.documentId}`,
        clientIP,
        userAgent,
        requestId,
        step: "approve_document",
      }
    );

    // Update user KYC status with enhanced error handling
    await executeWithRetryAndAudit(
      () =>
        userRepo.updateUserProfile({
          userId: request.userId,
          kycStatus: "approved",
        }),
      `DynamoDB-UpdateUserKYC-${request.userId}`,
      {
        adminUserId,
        action: "kyc_approve",
        resource: `kyc_document:${request.documentId}`,
        clientIP,
        userAgent,
        requestId,
        step: "update_user_status",
        criticalError: true, // This is critical if it fails
      }
    );

    // Create comprehensive audit log for successful approval
    await createAuditLogSafe({
      userId: adminUserId,
      action: "kyc_approve",
      resource: `kyc_document:${request.documentId}`,
      result: "success",
      ipAddress: clientIP,
      userAgent,
      details: {
        requestId,
        targetUserId: request.userId,
        documentId: request.documentId,
        comments: request.comments,
        documentType: document.documentType,
        originalFileName: document.fileName,
        processingTimeMs: Date.now() - startTime,
      },
    });

    // Get user profile to determine user type
    let userProfile;
    try {
      userProfile = await retry.execute(
        () => userRepo.getUserProfile(request.userId),
        `DynamoDB-GetUserProfile-${request.userId}`
      );
    } catch (error) {
      logger.warn(
        "Failed to get user profile for EventBridge event",
        {
          operation: "GetUserProfile",
          requestId,
          userId: request.userId,
        },
        error as Error
      );
    }
    const userType = (userProfile as any)?.userType || "entrepreneur";

    // Publish EventBridge events with error handling
    try {
      await Promise.all([
        eventBridgeService.publishKYCStatusChangeEvent({
          userId: request.userId,
          documentId: request.documentId,
          previousStatus: "pending",
          newStatus: "approved",
          reviewedBy: adminUserId,
          reviewComments: request.comments,
          documentType: "national_id",
          userType: userType as "entrepreneur" | "investor",
        }),
        eventBridgeService.publishKYCReviewCompletedEvent({
          userId: request.userId,
          documentId: request.documentId,
          reviewedBy: adminUserId,
          reviewResult: "approved",
          reviewComments: request.comments,
          documentType: "national_id",
          processingTimeMs: Date.now() - startTime,
        }),
      ]);
    } catch (error) {
      // EventBridge failures should not fail the approval process
      logger.error(
        "Failed to publish EventBridge events for approval",
        {
          operation: "EventBridgePublish",
          requestId,
          userId: request.userId,
          documentId: request.documentId,
        },
        error as Error
      );

      await putMetricSafe("KYCApprovalEventBridgeError", 1);
    }

    const duration = Date.now() - startTime;
    logger.info("KYC approval completed successfully", {
      operation: "KYCApproval",
      requestId,
      userId: request.userId,
      documentId: request.documentId,
      reviewedBy: adminUserId,
      duration,
    });

    await putMetricSafe("KYCApprovalSuccess", 1, {
      userType,
      hasComments: request.comments ? "true" : "false",
    });

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
      adminUserId,
    });

    // Create comprehensive error audit log
    await createAuditLogSafe({
      userId: adminUserId,
      action: "kyc_approve",
      resource: `kyc_document:unknown`,
      result: "failure",
      ipAddress: clientIP,
      userAgent,
      errorMessage: errorDetails.technicalMessage,
      details: {
        requestId,
        errorCategory: errorDetails.category,
        errorCode: errorDetails.errorCode,
        duration,
        retryable: errorDetails.retryable,
      },
    });

    logger.error(
      "KYC approval failed",
      {
        operation: "KYCApproval",
        requestId,
        duration,
        errorCategory: errorDetails.category,
        adminUserId,
      },
      error as Error
    );

    await putMetricSafe("KYCApprovalError", 1, {
      errorCategory: errorDetails.category,
      retryable: errorDetails.retryable.toString(),
    });

    // Send critical error alarm for retryable errors that might indicate system issues
    if (errorDetails.retryable) {
      await putMetricSafe("KYCApprovalRetryableError", 1, {
        errorCategory: errorDetails.category,
      });
    }

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
  const adminUserId = extractAdminUserId(event);
  const clientIP = getClientIP(event);
  const userAgent = event.headers["User-Agent"];

  logger.info("KYC rejection started", {
    operation: "KYCRejection",
    requestId,
    adminUserId,
  });

  try {
    const request: AdminReviewRequest = parseRequestBody(
      event.body,
      event.isBase64Encoded
    );

    // Enhanced validation with audit logging
    const validation = validateReviewRequest(request);
    if (!validation.isValid) {
      await createAuditLogSafe({
        userId: adminUserId,
        action: "kyc_reject",
        resource: `kyc_document:${request.documentId || "unknown"}`,
        result: "failure",
        ipAddress: clientIP,
        userAgent,
        errorMessage: validation.error!,
        details: { requestId, validationError: validation.error },
      });

      return createErrorResponse(400, validation.error!, requestId);
    }

    if (!request.comments || request.comments.trim().length === 0) {
      await createAuditLogSafe({
        userId: adminUserId,
        action: "kyc_reject",
        resource: `kyc_document:${request.documentId}`,
        result: "failure",
        ipAddress: clientIP,
        userAgent,
        errorMessage: "Comments are required for rejection",
        details: {
          requestId,
          targetUserId: request.userId,
          documentId: request.documentId,
          missingComments: true,
        },
      });

      return createErrorResponse(
        400,
        "Comments are required for rejection",
        requestId
      );
    }

    // Log rejection attempt
    await createAuditLogSafe({
      userId: adminUserId,
      action: "kyc_reject_attempt",
      resource: `kyc_document:${request.documentId}`,
      result: "success",
      ipAddress: clientIP,
      userAgent,
      details: {
        requestId,
        targetUserId: request.userId,
        documentId: request.documentId,
        commentsLength: request.comments.length,
      },
    });

    // Get the document with enhanced error handling
    const document = await executeWithRetryAndAudit(
      () => kycRepo.getKYCDocument(request.userId, request.documentId),
      `DynamoDB-GetDocument-${request.documentId}`,
      {
        adminUserId,
        action: "kyc_reject",
        resource: `kyc_document:${request.documentId}`,
        clientIP,
        userAgent,
        requestId,
        step: "get_document",
      }
    );
    // Add this debug log
    console.log("Retrieved document:", JSON.stringify(document, null, 2));

    if (!document) {
      await createAuditLogSafe({
        userId: adminUserId,
        action: "kyc_reject",
        resource: `kyc_document:${request.documentId}`,
        result: "failure",
        ipAddress: clientIP,
        userAgent,
        errorMessage: "Document not found",
        details: {
          requestId,
          targetUserId: request.userId,
          documentId: request.documentId,
        },
      });

      return createErrorResponse(404, "Document not found", requestId);
    }

    if (!document.status || document.status !== "pending") {
      const actualStatus = document.status || "undefined";
      await createAuditLogSafe({
        userId: adminUserId,
        action: "kyc_reject",
        resource: `kyc_document:${request.documentId}`,
        result: "failure",
        ipAddress: clientIP,
        userAgent,
        errorMessage: `Document status is ${actualStatus}, not pending`,
        details: {
          requestId,
          targetUserId: request.userId,
          documentId: request.documentId,
          currentStatus: document.status,
        },
      });

      return createErrorResponse(
        400,
        "Document is not in pending status",
        requestId
      );
    }

    // Reject the document with enhanced error handling
    await executeWithRetryAndAudit(
      () =>
        kycRepo.rejectDocument(
          request.userId,
          request.documentId,
          adminUserId,
          request.comments
        ),
      `DynamoDB-RejectDocument-${request.documentId}`,
      {
        adminUserId,
        action: "kyc_reject",
        resource: `kyc_document:${request.documentId}`,
        clientIP,
        userAgent,
        requestId,
        step: "reject_document",
      }
    );

    // Update user KYC status with enhanced error handling
    await executeWithRetryAndAudit(
      () =>
        userRepo.updateUserProfile({
          userId: request.userId,
          kycStatus: "rejected",
        }),
      `DynamoDB-UpdateUserKYC-${request.userId}`,
      {
        adminUserId,
        action: "kyc_reject",
        resource: `kyc_document:${request.documentId}`,
        clientIP,
        userAgent,
        requestId,
        step: "update_user_status",
        criticalError: true, // This is critical if it fails
      }
    );

    // Create comprehensive audit log for successful rejection
    await createAuditLogSafe({
      userId: adminUserId,
      action: "kyc_reject",
      resource: `kyc_document:${request.documentId}`,
      result: "success",
      ipAddress: clientIP,
      userAgent,
      details: {
        requestId,
        targetUserId: request.userId,
        documentId: request.documentId,
        comments: request.comments,
        documentType: document.documentType,
        fileName: document.fileName,
        processingTimeMs: Date.now() - startTime,
      },
    });

    // Get user profile to determine user type
    let userProfile;
    try {
      userProfile = await retry.execute(
        () => userRepo.getUserProfile(request.userId),
        `DynamoDB-GetUserProfile-${request.userId}`
      );
    } catch (error) {
      logger.warn(
        "Failed to get user profile for EventBridge event",
        {
          operation: "GetUserProfile",
          requestId,
          userId: request.userId,
        },
        error as Error
      );
    }
    const userType = (userProfile as any)?.userType || "entrepreneur";

    // Publish EventBridge events with error handling
    try {
      await Promise.all([
        eventBridgeService.publishKYCStatusChangeEvent({
          userId: request.userId,
          documentId: request.documentId,
          previousStatus: "pending",
          newStatus: "rejected",
          reviewedBy: adminUserId,
          reviewComments: request.comments,
          documentType: "national_id",
          userType: userType as "entrepreneur" | "investor",
        }),
        eventBridgeService.publishKYCReviewCompletedEvent({
          userId: request.userId,
          documentId: request.documentId,
          reviewedBy: adminUserId,
          reviewResult: "rejected",
          reviewComments: request.comments,
          documentType: "national_id",
          processingTimeMs: Date.now() - startTime,
        }),
      ]);
    } catch (error) {
      // EventBridge failures should not fail the rejection process
      logger.error(
        "Failed to publish EventBridge events for rejection",
        {
          operation: "EventBridgePublish",
          requestId,
          userId: request.userId,
          documentId: request.documentId,
        },
        error as Error
      );

      await putMetricSafe("KYCRejectionEventBridgeError", 1);
    }

    const duration = Date.now() - startTime;
    logger.info("KYC rejection completed successfully", {
      operation: "KYCRejection",
      requestId,
      userId: request.userId,
      documentId: request.documentId,
      reviewedBy: adminUserId,
      duration,
    });

    await putMetricSafe("KYCRejectionSuccess", 1, {
      userType,
      commentsLength: request.comments.length.toString(),
    });

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
      adminUserId,
    });

    // Create comprehensive error audit log
    await createAuditLogSafe({
      userId: adminUserId,
      action: "kyc_reject",
      resource: `kyc_document:unknown`,
      result: "failure",
      ipAddress: clientIP,
      userAgent,
      errorMessage: errorDetails.technicalMessage,
      details: {
        requestId,
        errorCategory: errorDetails.category,
        errorCode: errorDetails.errorCode,
        duration,
        retryable: errorDetails.retryable,
      },
    });

    logger.error(
      "KYC rejection failed",
      {
        operation: "KYCRejection",
        requestId,
        duration,
        errorCategory: errorDetails.category,
        adminUserId,
      },
      error as Error
    );

    await putMetricSafe("KYCRejectionError", 1, {
      errorCategory: errorDetails.category,
      retryable: errorDetails.retryable.toString(),
    });

    // Send critical error alarm for retryable errors that might indicate system issues
    if (errorDetails.retryable) {
      await putMetricSafe("KYCRejectionRetryableError", 1, {
        errorCategory: errorDetails.category,
      });
    }

    return createErrorResponse(
      errorDetails.httpStatusCode || 500,
      errorDetails.userMessage,
      requestId
    );
  }
}

async function handleGetDocuments(event: APIGatewayProxyEvent): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const adminUserId = extractAdminUserId(event);
  const clientIP = getClientIP(event);
  const userAgent = event.headers["User-Agent"];

  logger.info("Get documents request started", {
    operation: "GetDocuments",
    requestId,
    adminUserId,
  });

  try {
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status as
      | "pending"
      | "approved"
      | "rejected"
      | undefined;
    const limit = queryParams.limit ? parseInt(queryParams.limit) : 50;

    // Validate limit parameter
    if (limit < 1 || limit > 100) {
      await createAuditLogSafe({
        userId: adminUserId,
        action: "get_documents",
        resource: "kyc_documents",
        result: "failure",
        ipAddress: clientIP,
        userAgent,
        errorMessage: "Invalid limit parameter",
        details: {
          requestId,
          requestedLimit: limit,
          validRange: "1-100",
        },
      });

      return createErrorResponse(
        400,
        "Limit must be between 1 and 100",
        requestId
      );
    }

    // Log document access attempt
    await createAuditLogSafe({
      userId: adminUserId,
      action: "get_documents_attempt",
      resource: "kyc_documents",
      result: "success",
      ipAddress: clientIP,
      userAgent,
      details: {
        requestId,
        status: status || "all_pending",
        limit,
      },
    });

    let documents;
    try {
      if (status) {
        documents = await retry.execute(
          () => kycRepo.getDocumentsByStatus(status, { limit }),
          `DynamoDB-GetDocumentsByStatus-${status}`
        );
      } else {
        documents = await retry.execute(
          () => kycRepo.getPendingDocuments({ limit }),
          `DynamoDB-GetPendingDocuments`
        );
      }
    } catch (error) {
      const errorDetails = ErrorClassifier.classify(error as Error, {
        operation: "GetDocuments",
        requestId,
        adminUserId,
      });

      await createAuditLogSafe({
        userId: adminUserId,
        action: "get_documents",
        resource: "kyc_documents",
        result: "failure",
        ipAddress: clientIP,
        userAgent,
        errorMessage: `Failed to retrieve documents: ${errorDetails.technicalMessage}`,
        details: {
          requestId,
          status: status || "all_pending",
          limit,
          errorCategory: errorDetails.category,
        },
      });

      await putMetricSafe("GetDocumentsDatabaseError", 1, {
        errorCategory: errorDetails.category,
        status: status || "pending",
      });

      throw error;
    }

    const duration = Date.now() - startTime;
    const documentsResult = documents as any;

    // Log successful document retrieval
    await createAuditLogSafe({
      userId: adminUserId,
      action: "get_documents",
      resource: "kyc_documents",
      result: "success",
      ipAddress: clientIP,
      userAgent,
      details: {
        requestId,
        status: status || "all_pending",
        limit,
        documentsReturned: documentsResult.count,
        processingTimeMs: duration,
      },
    });

    logger.info("Get documents request completed successfully", {
      operation: "GetDocuments",
      requestId,
      adminUserId,
      documentsCount: documentsResult.count,
      duration,
    });

    await putMetricSafe("DocumentsRetrieved", documentsResult.count, {
      status: status || "pending",
      adminUserId,
    });

    await putMetricSafe("GetDocumentsSuccess", 1, {
      status: status || "pending",
      documentsCount: documentsResult.count.toString(),
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        documents: documentsResult.items,
        count: documentsResult.count,
        lastEvaluatedKey: documentsResult.lastEvaluatedKey,
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorDetails = ErrorClassifier.classify(error as Error, {
      operation: "GetDocuments",
      requestId,
      duration,
      adminUserId,
    });

    // Create comprehensive error audit log
    await createAuditLogSafe({
      userId: adminUserId,
      action: "get_documents",
      resource: "kyc_documents",
      result: "failure",
      ipAddress: clientIP,
      userAgent,
      errorMessage: errorDetails.technicalMessage,
      details: {
        requestId,
        errorCategory: errorDetails.category,
        errorCode: errorDetails.errorCode,
        duration,
        retryable: errorDetails.retryable,
      },
    });

    logger.error(
      "Failed to retrieve documents",
      {
        operation: "GetDocuments",
        requestId,
        duration,
        errorCategory: errorDetails.category,
        adminUserId,
      },
      error as Error
    );

    await putMetricSafe("GetDocumentsError", 1, {
      errorCategory: errorDetails.category,
      retryable: errorDetails.retryable.toString(),
    });

    return createErrorResponse(
      errorDetails.httpStatusCode || 500,
      errorDetails.userMessage,
      requestId
    );
  }
}

// Helper function to safely create audit logs without failing the main operation
async function createAuditLogSafe(auditData: any): Promise<void> {
  try {
    await auditRepo.createAuditLog(auditData);
  } catch (error) {
    logger.error(
      "Failed to create audit log",
      {
        operation: "AuditLogging",
        auditAction: auditData.action,
      },
      error as Error
    );
  }
}

// Helper function to execute operations with retry and audit logging
async function executeWithRetryAndAudit<T>(
  operation: () => Promise<T>,
  operationName: string,
  auditContext: {
    adminUserId: string;
    action: string;
    resource: string;
    clientIP?: string;
    userAgent?: string;
    requestId: string;
    step: string;
    criticalError?: boolean;
  }
): Promise<T> {
  try {
    const result = await retry.execute(operation, operationName);
    return (result as any).result; // Explicitly cast and extract result
  } catch (error) {
    const errorDetails = ErrorClassifier.classify(error as Error, {
      operation: operationName,
      requestId: auditContext.requestId,
      adminUserId: auditContext.adminUserId,
    });

    const errorMessage = auditContext.criticalError
      ? `CRITICAL: ${auditContext.step} failed: ${errorDetails.technicalMessage}`
      : `Failed ${auditContext.step}: ${errorDetails.technicalMessage}`;

    await createAuditLogSafe({
      userId: auditContext.adminUserId,
      action: auditContext.action,
      resource: auditContext.resource,
      result: "failure",
      ipAddress: auditContext.clientIP,
      userAgent: auditContext.userAgent,
      errorMessage,
      details: {
        requestId: auditContext.requestId,
        step: auditContext.step,
        errorCategory: errorDetails.category,
        criticalError: auditContext.criticalError,
      },
    });

    if (auditContext.criticalError) {
      await putMetricSafe("AdminOperationCriticalError", 1, {
        errorCategory: errorDetails.category,
        operation: auditContext.step,
        adminUserId: auditContext.adminUserId,
      });
    }

    throw error;
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

function parseRequestBody(body: string | null, isBase64Encoded?: boolean): any {
  if (!body) return {};

  try {
    let bodyString = body;

    // If the body is base64 encoded, decode it first
    if (isBase64Encoded) {
      bodyString = Buffer.from(body, "base64").toString("utf-8");
    }

    return JSON.parse(bodyString);
  } catch (error) {
    // If parsing fails, try to decode as base64 and parse again
    try {
      const decodedBody = Buffer.from(body, "base64").toString("utf-8");
      return JSON.parse(decodedBody);
    } catch (secondError) {
      throw new Error(
        `Failed to parse request body: ${(error as Error).message}`
      );
    }
  }
}
