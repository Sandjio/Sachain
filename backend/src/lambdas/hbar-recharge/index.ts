/**
 * HBAR Recharge Request Handler Lambda
 * Handles user recharge requests and initiates Orange Money payments
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { SecureHBARRechargeService } from "./secure-recharge-service";
import {
  HBARRechargeRequest,
  HBARRechargeResponse,
} from "../../types/hbar-recharge";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { StructuredLogger } from "../../utils/structured-logger";

// Initialize secure services
const rechargeService = new SecureHBARRechargeService({
  tableName: process.env.RECHARGE_TABLE_NAME || "sachain-main-table",
  eventBusName: process.env.EVENT_BUS_NAME || "sachain-events",

  // Security configuration from environment variables
  encryptionEnabled: process.env.ENCRYPTION_ENABLED !== "false",
  fraudDetectionEnabled: process.env.FRAUD_DETECTION_ENABLED !== "false",
  kycVerificationEnabled: process.env.KYC_VERIFICATION_ENABLED !== "false",
  auditLoggingEnabled: process.env.AUDIT_LOGGING_ENABLED !== "false",
  complianceReportingEnabled:
    process.env.COMPLIANCE_REPORTING_ENABLED !== "false",

  // Thresholds from environment variables
  kycRequiredThreshold: parseInt(
    process.env.KYC_REQUIRED_THRESHOLD || "500000"
  ),
  enhancedKycThreshold: parseInt(
    process.env.ENHANCED_KYC_THRESHOLD || "2000000"
  ),
  suspiciousAmountThreshold: parseInt(
    process.env.SUSPICIOUS_AMOUNT_THRESHOLD || "2000000"
  ),

  // Rate limiting from environment variables
  maxRequestsPerHour: parseInt(process.env.MAX_REQUESTS_PER_HOUR || "10"),
  maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY || "50"),
  maxAmountPerHour: parseInt(process.env.MAX_AMOUNT_PER_HOUR || "1000000"),
  maxAmountPerDay: parseInt(process.env.MAX_AMOUNT_PER_DAY || "5000000"),
});

const logger = new StructuredLogger("HBARRechargeHandler");

/**
 * Main Lambda handler for HBAR recharge requests
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = uuidv4();

  logger.info("HBAR recharge request received", {
    operation: "HBARRechargeRequest",
    requestId,
    httpMethod: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
  });

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === "OPTIONS") {
      return createCorsResponse();
    }

    // Route to appropriate handler based on HTTP method and path
    switch (event.httpMethod) {
      case "POST":
        if (event.path === "/hbar-recharge") {
          return await handleRechargeRequest(event, requestId);
        } else if (event.path.includes("/retry")) {
          return await handleRetryRequest(event, requestId);
        }
        break;
      case "GET":
        return await handleGetRequest(event, requestId);
      default:
        return createErrorResponse(
          405,
          "METHOD_NOT_ALLOWED",
          "Method not allowed"
        );
    }

    return createErrorResponse(404, "NOT_FOUND", "Endpoint not found");
  } catch (error) {
    logger.error(
      "Unexpected error in HBAR recharge handler",
      {
        operation: "HBARRechargeHandler",
        requestId,
      },
      error as Error
    );

    return createErrorResponse(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred"
    );
  }
};

/**
 * Creates CORS response for preflight requests
 */
function createCorsResponse(): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
    body: "",
  };
}

/**
 * Handles POST /hbar-recharge - Initiate recharge request
 */
async function handleRechargeRequest(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Extract user ID from JWT token
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success || !tokenResult.userId) {
      return createErrorResponse(
        401,
        "INVALID_USER",
        tokenResult.error || "Invalid or missing authentication token"
      );
    }
    const userId = tokenResult.userId;

    // Parse and validate request body
    if (!event.body) {
      return createErrorResponse(
        400,
        "INVALID_REQUEST",
        "Request body is required"
      );
    }

    let requestBody: HBARRechargeRequest;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(
        400,
        "INVALID_JSON",
        "Invalid JSON in request body"
      );
    }

    // Validate required fields
    const validationError = validateRechargeRequest(requestBody);
    if (validationError) {
      return createErrorResponse(400, "VALIDATION_ERROR", validationError);
    }

    // Process recharge request
    const result = await rechargeService.initiateSecureRecharge(
      {
        userId,
        xafAmount: requestBody.xafAmount,
        userHederaAccountId: requestBody.userHederaAccountId,
        pin: requestBody.pin,
      },
      {
        requestId,
      }
    );

    logger.info("Recharge request processed successfully", {
      operation: "InitiateRecharge",
      requestId,
      userId,
      transactionId: result.transactionId,
      xafAmount: requestBody.xafAmount,
    });

    return createSuccessResponse(result);
  } catch (error) {
    logger.error(
      "Error processing recharge request",
      {
        operation: "InitiateRecharge",
        requestId,
      },
      error as Error
    );

    const errorCode = (error as any).code || "INTERNAL_ERROR";
    const statusCode = getStatusCodeFromError(errorCode);
    return createErrorResponse(statusCode, errorCode, (error as Error).message);
  }
}

/**
 * Handles GET requests for transaction status and listing
 */
async function handleGetRequest(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Extract user ID from JWT token
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success || !tokenResult.userId) {
      return createErrorResponse(
        401,
        "INVALID_USER",
        tokenResult.error || "Invalid or missing authentication token"
      );
    }
    const userId = tokenResult.userId;

    // Check if this is a specific transaction query
    const transactionId = event.pathParameters?.transactionId;

    if (transactionId) {
      // GET /hbar-recharge/{transactionId}
      const transaction = await rechargeService.getSecureTransactionStatus(
        transactionId,
        userId
      );

      if (!transaction) {
        return createErrorResponse(
          404,
          "TRANSACTION_NOT_FOUND",
          "Transaction not found"
        );
      }

      return createSuccessResponse(transaction);
    } else {
      // GET /hbar-recharge - List transactions
      const queryParams = event.queryStringParameters || {};
      const limit = parseInt(queryParams.limit || "20");
      const status = queryParams.status;
      const exclusiveStartKey = queryParams.exclusiveStartKey;

      const result = await rechargeService.listUserTransactions(userId, {
        limit: Math.min(limit, 100), // Cap at 100
        status,
        exclusiveStartKey,
      });

      return createSuccessResponse(result);
    }
  } catch (error) {
    logger.error(
      "Error processing GET request",
      {
        operation: "GetTransactions",
        requestId,
      },
      error as Error
    );

    const errorCode = (error as any).code || "INTERNAL_ERROR";
    const statusCode = getStatusCodeFromError(errorCode);
    return createErrorResponse(statusCode, errorCode, (error as Error).message);
  }
}

/**
 * Handles POST /hbar-recharge/{transactionId}/retry - Retry failed transaction
 */
async function handleRetryRequest(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Extract user ID from JWT token
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success || !tokenResult.userId) {
      return createErrorResponse(
        401,
        "INVALID_USER",
        tokenResult.error || "Invalid or missing authentication token"
      );
    }
    const userId = tokenResult.userId;

    const transactionId = event.pathParameters?.transactionId;
    if (!transactionId) {
      return createErrorResponse(
        400,
        "INVALID_REQUEST",
        "Transaction ID is required"
      );
    }

    // Check if user has admin privileges for retry operations
    const hasAdminAccess = await rechargeService.checkAdminAccess(userId);
    if (!hasAdminAccess) {
      return createErrorResponse(
        403,
        "INSUFFICIENT_PRIVILEGES",
        "Admin access required for retry operations"
      );
    }

    // Retry the transaction
    const result = await rechargeService.retryTransaction(
      transactionId,
      userId
    );

    logger.info("Transaction retry initiated", {
      operation: "RetryTransaction",
      requestId,
      userId,
      transactionId,
    });

    return createSuccessResponse(result);
  } catch (error) {
    logger.error(
      "Error processing retry request",
      {
        operation: "RetryTransaction",
        requestId,
      },
      error as Error
    );

    const errorCode = (error as any).code || "INTERNAL_ERROR";
    const statusCode = getStatusCodeFromError(errorCode);
    return createErrorResponse(statusCode, errorCode, (error as Error).message);
  }
}

/**
 * Validates recharge request data
 */
function validateRechargeRequest(request: any): string | null {
  if (!request.xafAmount || typeof request.xafAmount !== "number") {
    return "xafAmount is required and must be a number";
  }

  if (request.xafAmount < 1000) {
    return "xafAmount must be at least 1000 XAF";
  }

  if (request.xafAmount > 1000000) {
    return "xafAmount cannot exceed 1,000,000 XAF";
  }

  if (
    !request.userHederaAccountId ||
    typeof request.userHederaAccountId !== "string"
  ) {
    return "userHederaAccountId is required and must be a string";
  }

  // Validate Hedera account ID format
  const hederaAccountPattern = /^0\.0\.[0-9]+$/;
  if (!hederaAccountPattern.test(request.userHederaAccountId)) {
    return "userHederaAccountId must be in format 0.0.XXXXXX";
  }

  if (!request.pin || typeof request.pin !== "string") {
    return "pin is required and must be a string";
  }

  // Validate PIN format (4-6 digits)
  const pinPattern = /^[0-9]{4,6}$/;
  if (!pinPattern.test(request.pin)) {
    return "pin must be 4-6 digits";
  }

  return null;
}

/**
 * Creates a standardized success response
 */
function createSuccessResponse(data: any): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
    },
    body: JSON.stringify({
      success: true,
      data,
    }),
  };
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(
  statusCode: number,
  errorCode: string,
  message: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
    body: JSON.stringify({
      success: false,
      error: {
        code: errorCode,
        message,
      },
    }),
  };
}

/**
 * Maps error codes to HTTP status codes
 */
function getStatusCodeFromError(errorCode: string): number {
  const errorCodeMap: Record<string, number> = {
    // Validation errors (400)
    INVALID_AMOUNT: 400,
    AMOUNT_TOO_LOW: 400,
    AMOUNT_TOO_HIGH: 400,
    INVALID_HEDERA_ACCOUNT: 400,
    INVALID_REQUEST: 400,
    VALIDATION_ERROR: 400,
    INVALID_JSON: 400,

    // Authentication/Authorization errors (401/403)
    INVALID_USER: 401,
    INSUFFICIENT_KYC: 403,
    DAILY_LIMIT_EXCEEDED: 403,
    INSUFFICIENT_PRIVILEGES: 403,

    // Payment errors (402)
    ORANGE_MONEY_FAILED: 402,
    INSUFFICIENT_BALANCE: 402,
    INVALID_PIN: 402,

    // Not found errors (404)
    TRANSACTION_NOT_FOUND: 404,
    NOT_FOUND: 404,

    // Method not allowed (405)
    METHOD_NOT_ALLOWED: 405,

    // Rate limiting (429)
    RATE_LIMIT_EXCEEDED: 429,

    // Service errors (503)
    EXCHANGE_RATE_UNAVAILABLE: 503,
    HEDERA_NETWORK_ERROR: 503,
    INSUFFICIENT_TREASURY_BALANCE: 503,

    // System errors (500)
    DATABASE_ERROR: 500,
    EVENT_PUBLISHING_FAILED: 500,
    INTERNAL_ERROR: 500,
  };

  return errorCodeMap[errorCode] || 500;
}

/**
 * Health check handler for the recharge service
 */
export const healthCheck = async (): Promise<APIGatewayProxyResult> => {
  try {
    // Perform basic health checks
    const healthStatus = await rechargeService.healthCheck();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "hbar-recharge",
        checks: healthStatus,
      }),
    };
  } catch (error) {
    return {
      statusCode: 503,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        service: "hbar-recharge",
        error: (error as Error).message,
      }),
    };
  }
};
