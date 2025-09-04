/**
 * HBAR Conversion Handler Lambda
 * Event-driven handler that processes Orange Money payment success events
 * and converts XAF payments to HBAR transfers using Hedera network
 */

import { EventBridgeEvent, Context } from "aws-lambda";
import { PaymentSuccessEvent } from "../../types/hbar-recharge";
import { HBARConversionService } from "./conversion-service";
import { StructuredLogger } from "../../utils/structured-logger";
import { projectMetrics } from "../../utils/project-metrics";

// Initialize logger
const logger = StructuredLogger.getInstance("HBARConversionHandler");

// Initialize conversion service
const conversionService = new HBARConversionService({
  tableName: process.env.DYNAMODB_TABLE_NAME!,
  eventBusName: process.env.EVENT_BUS_NAME!,
  treasuryAccountId: process.env.HEDERA_TREASURY_ACCOUNT_ID!,
  region: process.env.AWS_REGION,
});

/**
 * Lambda handler for processing Orange Money payment success events
 */
export const handler = async (
  event: EventBridgeEvent<
    "Orange Money Payment Success",
    PaymentSuccessEvent["detail"]
  >,
  context: Context
): Promise<void> => {
  const startTime = Date.now();
  const requestId = context.awsRequestId;

  logger.info("Processing HBAR conversion event", {
    operation: "ProcessConversionEvent",
    requestId,
    eventSource: event.source,
    eventType: event["detail-type"],
    transactionId: event.detail.transactionId,
  });

  try {
    // Validate event structure
    if (!event.detail || !event.detail.transactionId) {
      throw new Error("Invalid event structure: missing transaction details");
    }

    // Process the conversion
    const result = await conversionService.processPaymentSuccess(event.detail);

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info("HBAR conversion completed successfully", {
        operation: "ProcessConversionEvent",
        requestId,
        transactionId: event.detail.transactionId,
        userId: event.detail.userId,
        xafAmount: event.detail.xafAmount,
        hbarAmount: result.data?.hbarAmount,
        hederaTransactionId: result.data?.hederaTransactionId,
        duration,
      });

      // Record successful conversion metrics
      await projectMetrics.recordHederaNetworkHealth(
        true,
        duration,
        "hbarConversion"
      );
    } else {
      logger.error("HBAR conversion failed", {
        operation: "ProcessConversionEvent",
        requestId,
        transactionId: event.detail.transactionId,
        userId: event.detail.userId,
        error: result.error,
        duration,
      });

      // Record failed conversion metrics
      await projectMetrics.recordHederaNetworkHealth(
        false,
        duration,
        "hbarConversion"
      );

      // Don't throw error here - let the service handle retries
      // The conversion service will handle retry logic and dead letter queues
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Unexpected error in HBAR conversion handler",
      {
        operation: "ProcessConversionEvent",
        requestId,
        transactionId: event.detail?.transactionId,
        duration,
      },
      error as Error
    );

    // Record error metrics
    await projectMetrics.recordHederaNetworkHealth(
      false,
      duration,
      "hbarConversion"
    );

    // Re-throw to trigger Lambda retry mechanism
    throw error;
  }
};

/**
 * Health check handler for monitoring
 */
export const healthCheck = async (): Promise<{
  status: string;
  timestamp: string;
  dependencies: Record<string, boolean>;
}> => {
  try {
    const healthResult = await conversionService.healthCheck();

    return {
      status: Object.values(healthResult).every(Boolean)
        ? "healthy"
        : "degraded",
      timestamp: new Date().toISOString(),
      dependencies: healthResult,
    };
  } catch (error) {
    logger.error("Health check failed", {}, error as Error);

    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: false,
        eventBridge: false,
        exchangeRate: false,
        hederaNetwork: false,
      },
    };
  }
};
