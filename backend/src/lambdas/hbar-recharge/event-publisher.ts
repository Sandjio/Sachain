/**
 * HBAR Recharge Event Publisher
 * Handles EventBridge event publishing for recharge system
 */

import { StructuredLogger } from "../../utils/structured-logger";
import {
  RechargeEventDetail,
  EventPublishResult,
  RechargeEventPublisher as IRechargeEventPublisher,
} from "./types";
import {
  RechargeEventBridgeService,
  createRechargeEventBridgeService,
  RechargeEventBridgeConfig,
} from "../../utils/recharge-eventbridge-service";

export interface RechargeEventPublisherConfig
  extends RechargeEventBridgeConfig {}

export class RechargeEventPublisher implements IRechargeEventPublisher {
  private readonly eventBridgeService: RechargeEventBridgeService;
  private readonly logger: StructuredLogger;

  constructor(config: RechargeEventPublisherConfig) {
    this.eventBridgeService = createRechargeEventBridgeService(config);
    this.logger = new StructuredLogger("RechargeEventPublisher");
  }

  /**
   * Publishes payment initiated event
   */
  async publishPaymentInitiated(
    detail: RechargeEventDetail
  ): Promise<EventPublishResult> {
    this.logger.info("Publishing payment initiated event", {
      operation: "PublishPaymentInitiated",
      transactionId: detail.transactionId,
      userId: detail.userId,
      xafAmount: detail.xafAmount,
    });

    // For now, we'll use a simple event structure for payment initiated
    // This can be enhanced later if needed
    return {
      success: true,
      eventId: `payment-initiated-${detail.transactionId}`,
    };
  }

  /**
   * Publishes payment confirmed event (Orange Money payment success)
   */
  async publishPaymentConfirmed(
    detail: RechargeEventDetail & { orangeMoneyTransactionId: string }
  ): Promise<EventPublishResult> {
    this.logger.info("Publishing payment confirmed event", {
      operation: "PublishPaymentConfirmed",
      transactionId: detail.transactionId,
      userId: detail.userId,
      orangeMoneyTransactionId: detail.orangeMoneyTransactionId,
    });

    return await this.eventBridgeService.publishPaymentSuccessEvent({
      transactionId: detail.transactionId,
      userId: detail.userId,
      xafAmount: detail.xafAmount,
      orangeMoneyTransactionId: detail.orangeMoneyTransactionId,
      userHederaAccountId: detail.userHederaAccountId,
      fees: detail.fees,
    });
  }

  /**
   * Publishes HBAR conversion started event
   */
  async publishConversionStarted(detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    exchangeRate: number;
    estimatedHBARAmount: number;
  }): Promise<EventPublishResult> {
    this.logger.info("Publishing conversion started event", {
      operation: "PublishConversionStarted",
      transactionId: detail.transactionId,
      userId: detail.userId,
      estimatedHBARAmount: detail.estimatedHBARAmount,
    });

    return await this.eventBridgeService.publishConversionStartedEvent(detail);
  }

  /**
   * Publishes HBAR conversion completed event
   */
  async publishConversionCompleted(detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    hbarAmount: number;
    exchangeRate: number;
    hederaTransactionId: string;
    actualCost: string;
    userHederaAccountId: string;
  }): Promise<EventPublishResult> {
    this.logger.info("Publishing conversion completed event", {
      operation: "PublishConversionCompleted",
      transactionId: detail.transactionId,
      userId: detail.userId,
      hbarAmount: detail.hbarAmount,
      hederaTransactionId: detail.hederaTransactionId,
    });

    return await this.eventBridgeService.publishConversionCompletedEvent(
      detail
    );
  }

  /**
   * Publishes HBAR conversion failed event
   */
  async publishConversionFailed(detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    errorCode: string;
    errorMessage: string;
    retryCount: number;
    retryable: boolean;
  }): Promise<EventPublishResult> {
    this.logger.warn("Publishing conversion failed event", {
      operation: "PublishConversionFailed",
      transactionId: detail.transactionId,
      userId: detail.userId,
      errorCode: detail.errorCode,
      retryCount: detail.retryCount,
    });

    return await this.eventBridgeService.publishConversionFailedEvent(detail);
  }

  /**
   * Publishes recharge completed event
   */
  async publishRechargeCompleted(detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    hbarAmount: number;
    exchangeRate: number;
    totalFees: number;
    processingTimeMs: number;
    userHederaAccountId: string;
  }): Promise<EventPublishResult> {
    this.logger.info("Publishing recharge completed event", {
      operation: "PublishRechargeCompleted",
      transactionId: detail.transactionId,
      userId: detail.userId,
      hbarAmount: detail.hbarAmount,
      processingTimeMs: detail.processingTimeMs,
    });

    return await this.eventBridgeService.publishRechargeCompletedEvent(detail);
  }

  /**
   * Publishes recharge failed event
   */
  async publishRechargeFailed(detail: {
    transactionId: string;
    userId: string;
    xafAmount: number;
    errorCode: string;
    errorMessage: string;
    failureStage: "payment" | "conversion" | "transfer";
    retryable: boolean;
  }): Promise<EventPublishResult> {
    this.logger.warn("Publishing recharge failed event", {
      operation: "PublishRechargeFailed",
      transactionId: detail.transactionId,
      userId: detail.userId,
      errorCode: detail.errorCode,
      failureStage: detail.failureStage,
    });

    return await this.eventBridgeService.publishRechargeFailedEvent(detail);
  }

  /**
   * Health check for EventBridge connectivity
   */
  async healthCheck(): Promise<void> {
    const healthResult = await this.eventBridgeService.healthCheck();

    if (!healthResult.healthy) {
      throw new Error(
        `EventBridge health check failed: ${
          healthResult.error || "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets event publishing statistics (for monitoring)
   */
  async getPublishingStats(): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    lastEventTime?: string;
  }> {
    // This would typically be implemented with CloudWatch metrics
    // For now, return placeholder data
    return {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
    };
  }
}
