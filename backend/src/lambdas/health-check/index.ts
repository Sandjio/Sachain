/**
 * Health Check Lambda Function
 * Provides health status for all project-related services
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { HealthCheckService } from "../../utils/health-check";
import { StructuredLogger } from "../../utils/structured-logger";

const logger = StructuredLogger.getInstance("health-check");

/**
 * Lambda handler for health check endpoint
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext?.requestId || "unknown";

  logger.info("Health check requested", { requestId });

  try {
    const healthCheckService = new HealthCheckService();
    const healthCheck = await healthCheckService.performHealthCheck();

    const statusCode =
      healthCheck.overall === "healthy"
        ? 200
        : healthCheck.overall === "degraded"
        ? 200
        : 503;

    logger.info("Health check completed", {
      requestId,
      overall: healthCheck.overall,
      statusCode,
      serviceCount: healthCheck.services.length,
    });

    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      body: JSON.stringify(healthCheck),
    };
  } catch (error) {
    logger.error("Health check failed", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        overall: "unhealthy",
        services: [],
        timestamp: new Date().toISOString(),
        error: "Health check service unavailable",
      }),
    };
  }
};
