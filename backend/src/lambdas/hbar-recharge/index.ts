/**
 * HBAR Recharge Request Handler Lambda
 * Handles user recharge requests and initiates Orange Money payments
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { HBARRechargeService } from "./recharge-service";
import {
  HBARRechargeRequest,
  HBARRechargeResponse,
} from "../../types/hbar-recharge";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { StructuredLogger } from "../../utils/structured-logger";

// Initialize services
const rechargeService = new HBARRechargeService({
  tableName: process.env.DYNAMODB_TABLE_NAME || "sachain-main-table",
  eventBusName: process.env.EVENT_BUS_NAME || "sachain-events",
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
  });

  try {
    // Validate HTTP method
    if (event.httpMethod !== "POST") {
      return createErrorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "Method not allowed"
      );
    }

    // Extract and validate user authentication
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      logger.warn("Authentication failed", {
        operation: "Authentication",
        requestId,
        error: tokenResult.error,
      });
      return createErrorResponse(
        401,
        "UNAUTHORIZED",
        tokenResult.error || "Authentication failed"
      );
    }

    const authenticatedUserId = tokenResult.userId!;

    // Parse request body
    if (!event.body) {
      return createErrorResponse(
        400,
        "MISSING_BODY",
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

    // Validate that the authenticated user matches the request user
    if (requestBody.userId !== authenticatedUserId) {
      logger.warn("User ID mismatch", {
        operation: "Authorization",
        requestId,
        authenticatedUserId,
        requestUserId: requestBody.userId,
      });
      return createErrorResponse(403, "FORBIDDEN", "User ID mismatch");
    }

    // Process the recharge request
    const result = await rechargeService.initiateRecharge(requestBody);

    if (result.success) {
      logger.info("HBAR recharge initiated successfully", {
        operation: "HBARRechargeInitiated",
        requestId,
        userId: requestBody.userId,
        transactionId: result.data!.transactionId,
        xafAmount: requestBody.xafAmount,
      });

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        body: JSON.stringify({
          success: true,
          data: result.data,
        }),
      };
    } else {
      logger.warn("HBAR recharge failed", {
        operation: "HBARRechargeFailed",
        requestId,
        userId: requestBody.userId,
        error: result.error,
      });

      const statusCode = getStatusCodeFromError(result.error!.code);
      return createErrorResponse(
        statusCode,
        result.error!.code,
        result.error!.message
      );
    }
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

    // Authentication/Authorization errors (401/403)
    INVALID_USER: 401,
    INSUFFICIENT_KYC: 403,
    DAILY_LIMIT_EXCEEDED: 403,

    // Payment errors (402)
    ORANGE_MONEY_FAILED: 402,
    INSUFFICIENT_BALANCE: 402,
    INVALID_PIN: 402,

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
