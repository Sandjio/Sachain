/**
 * HBAR Conversion Service
 * Handles the conversion of successful Orange Money payments to HBAR transfers
 */

import { v4 as uuidv4 } from "uuid";
import {
  PaymentSuccessEvent,
  RechargeTransaction,
  RECHARGE_ERROR_CODES,
  HBARTransferParams,
  HBARTransferResult,
  ConversionResult,
} from "../../types/hbar-recharge";
import { ConversionRepository } from "./conversion-repository";
import { ConversionEventPublisher } from "./event-publisher";
import { ExponentialBackoff, RetryError } from "../../utils/retry";
import { createExchangeRateService } from "../../utils/exchange-rate-service";
import { HederaService } from "../../utils/hedera-service";
import { StructuredLogger } from "../../utils/structured-logger";

export interface ConversionServiceConfig {
  tableName: string;
  eventBusName: string;
  treasuryAccountId: string;
  region?: string;
}

export interface ConversionServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
}

export interface ConversionCompletionResult {
  transactionId: string;
  hbarAmount: number;
  hederaTransactionId: string;
  exchangeRate: number;
  actualCost: string;
}

export interface ConversionHealthCheck {
  database: boolean;
  eventBridge: boolean;
  exchangeRate: boolean;
  hederaNetwork: boolean;
}

export class HBARConversionService {
  private readonly config: ConversionServiceConfig;
  private readonly repository: ConversionRepository;
  private readonly eventPublisher: ConversionEventPublisher;
  private readonly exchangeRateService: any;
  private readonly hederaService: HederaService;
  private readonly logger: StructuredLogger;
  private readonly retry: ExponentialBackoff;

  constructor(config: ConversionServiceConfig) {
    this.config = config;
    this.repository = new ConversionRepository({ tableName: config.tableName });
    this.eventPublisher = new ConversionEventPublisher({
      eventBusName: config.eventBusName,
    });
    this.exchangeRateService = createExchangeRateService(config.tableName);

    // Initialize Hedera service with environment configuration
    this.hederaService = new HederaService({
      operatorId: process.env.HEDERA_OPERATOR_ID!,
      operatorKey: process.env.HEDERA_OPERATOR_KEY!,
      network:
        (process.env.HEDERA_NETWORK as "testnet" | "mainnet") || "testnet",
      maxTransactionFee: 10, // 10 HBAR max fee
      maxQueryPayment: 1, // 1 HBAR max query payment
    });

    this.logger = StructuredLogger.getInstance("HBARConversionService");

    // Configure retry logic for conversion operations
    this.retry = new ExponentialBackoff({
      maxRetries: 5,
      baseDelay: 2000, // Start with 2 seconds
      maxDelay: 60000, // Max 1 minute
      backoffMultiplier: 2,
      jitterType: "full",
      retryableErrors: [
        RECHARGE_ERROR_CODES.HEDERA_NETWORK_ERROR,
        RECHARGE_ERROR_CODES.EXCHANGE_RATE_UNAVAILABLE,
        "BUSY",
        "PLATFORM_TRANSACTION_NOT_CREATED",
        "PLATFORM_NOT_ACTIVE",
        "RECEIPT_NOT_FOUND",
        "RECORD_NOT_FOUND",
        "TIMEOUT",
        "NetworkingError",
        "ConnectionError",
      ],
    });
  }

  /**
   * Process Orange Money payment success event and convert to HBAR
   */
  async processPaymentSuccess(
    eventDetail: PaymentSuccessEvent["detail"]
  ): Promise<ConversionServiceResult<ConversionCompletionResult>> {
    const { transactionId, userId } = eventDetail;
    const startTime = Date.now();

    this.logger.info("Starting HBAR conversion process", {
      operation: "ProcessPaymentSuccess",
      transactionId,
      userId,
      xafAmount: eventDetail.xafAmount,
    });

    try {
      // Step 1: Get and validate transaction
      const transaction = await this.repository.getTransaction(
        transactionId,
        userId
      );
      if (!transaction) {
        return {
          success: false,
          error: {
            code: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
            message: "Transaction not found",
            retryable: false,
          },
        };
      }

      // Check if already processed
      if (transaction.status === "completed") {
        this.logger.info("Transaction already completed", {
          operation: "ProcessPaymentSuccess",
          transactionId,
          userId,
        });
        return {
          success: true,
          data: {
            transactionId,
            hbarAmount: transaction.hbarAmount!,
            hederaTransactionId: transaction.hederaTransactionId!,
            exchangeRate: transaction.exchangeRate!,
            actualCost: "0", // Already completed
          },
        };
      }

      // Check if transaction is in correct state
      if (transaction.status !== "payment_confirmed") {
        return {
          success: false,
          error: {
            code: RECHARGE_ERROR_CODES.INTERNAL_ERROR,
            message: `Invalid transaction status: ${transaction.status}`,
            retryable: false,
          },
        };
      }

      // Step 2: Update status to converting
      await this.repository.updateTransactionStatus(
        transactionId,
        userId,
        "converting",
        {
          updatedAt: new Date().toISOString(),
          GSI1PK: "RECHARGE_STATUS#converting",
        }
      );

      // Step 3: Publish conversion started event
      await this.eventPublisher.publishConversionStarted({
        transactionId,
        userId,
        xafAmount: eventDetail.xafAmount,
        exchangeRate: transaction.exchangeRate || 0,
        estimatedHBARAmount: transaction.hbarAmount || 0,
      });

      // Step 4: Perform conversion with retry logic
      const conversionResult = await this.performConversionWithRetry(
        transaction,
        eventDetail
      );

      if (!conversionResult.success) {
        // Update transaction status to failed
        await this.repository.updateTransactionStatus(
          transactionId,
          userId,
          "failed",
          {
            errorMessage: conversionResult.error!.message,
            updatedAt: new Date().toISOString(),
            retryCount: transaction.retryCount + 1,
            GSI1PK: "RECHARGE_STATUS#failed",
          }
        );

        // Publish conversion failed event
        await this.eventPublisher.publishConversionFailed({
          transactionId,
          userId,
          xafAmount: eventDetail.xafAmount,
          errorMessage: conversionResult.error!.message,
          retryCount: transaction.retryCount + 1,
          willRetry:
            conversionResult.error!.retryable && transaction.retryCount < 5,
        });

        return conversionResult;
      }

      // Step 5: Update transaction as completed
      await this.repository.updateTransactionStatus(
        transactionId,
        userId,
        "completed",
        {
          hederaTransactionId: conversionResult.data!.hederaTransactionId,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          GSI1PK: "RECHARGE_STATUS#completed",
        }
      );

      // Step 6: Publish conversion completed event
      await this.eventPublisher.publishConversionCompleted({
        transactionId,
        userId,
        xafAmount: eventDetail.xafAmount,
        hbarAmount: conversionResult.data!.hbarAmount,
        exchangeRate: conversionResult.data!.exchangeRate,
        hederaTransactionId: conversionResult.data!.hederaTransactionId,
        fees: eventDetail.fees,
      });

      const duration = Date.now() - startTime;
      this.logger.info("HBAR conversion completed successfully", {
        operation: "ProcessPaymentSuccess",
        transactionId,
        userId,
        xafAmount: eventDetail.xafAmount,
        hbarAmount: conversionResult.data!.hbarAmount,
        hederaTransactionId: conversionResult.data!.hederaTransactionId,
        duration,
      });

      return conversionResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        "Failed to process payment success",
        {
          operation: "ProcessPaymentSuccess",
          transactionId,
          userId,
          duration,
        },
        error as Error
      );

      return {
        success: false,
        error: {
          code: RECHARGE_ERROR_CODES.INTERNAL_ERROR,
          message: "Unexpected error during conversion process",
          details: { originalError: (error as Error).message },
          retryable: true,
        },
      };
    }
  }

  /**
   * Perform HBAR conversion with retry logic
   */
  private async performConversionWithRetry(
    transaction: RechargeTransaction,
    eventDetail: PaymentSuccessEvent["detail"]
  ): Promise<ConversionServiceResult<ConversionCompletionResult>> {
    try {
      const result = await this.retry.execute(async () => {
        return await this.performConversion(transaction, eventDetail);
      }, "performConversion");

      return {
        success: true,
        data: result.result,
      };
    } catch (error) {
      if (error instanceof RetryError) {
        this.logger.error(
          "HBAR conversion failed after all retries",
          {
            operation: "PerformConversionWithRetry",
            transactionId: transaction.transactionId,
            attempts: error.attempts,
          },
          error.lastError
        );

        return {
          success: false,
          error: {
            code: RECHARGE_ERROR_CODES.HEDERA_NETWORK_ERROR,
            message:
              "Failed to complete HBAR conversion after multiple attempts",
            details: {
              attempts: error.attempts,
              lastError: error.lastError.message,
            },
            retryable: false, // Don't retry after exhausting all attempts
          },
        };
      }

      return {
        success: false,
        error: {
          code: RECHARGE_ERROR_CODES.INTERNAL_ERROR,
          message: "Unexpected error during conversion",
          details: { originalError: (error as Error).message },
          retryable: true,
        },
      };
    }
  }

  /**
   * Perform the actual HBAR conversion
   */
  private async performConversion(
    transaction: RechargeTransaction,
    eventDetail: PaymentSuccessEvent["detail"]
  ): Promise<ConversionCompletionResult> {
    // Step 1: Get current exchange rate and calculate HBAR amount
    const conversionResult = await this.calculateHBARAmount(
      eventDetail.xafAmount
    );

    // Step 2: Validate Hedera account
    const isValidAccount = await this.hederaService.validateHederaAccount(
      transaction.userHederaAccountId
    );
    if (!isValidAccount) {
      throw new Error(
        `Invalid Hedera account: ${transaction.userHederaAccountId}`
      );
    }

    // Step 3: Check treasury balance
    const treasuryBalance = await this.hederaService.getAccountBalance(
      this.config.treasuryAccountId
    );
    const requiredAmount = conversionResult.hbarAmount + 1; // Add 1 HBAR buffer for fees

    if (treasuryBalance < requiredAmount) {
      throw new Error(
        `Insufficient treasury balance. Required: ${requiredAmount} HBAR, Available: ${treasuryBalance} HBAR`
      );
    }

    // Step 4: Execute HBAR transfer
    const transferParams: HBARTransferParams = {
      fromAccountId: this.config.treasuryAccountId,
      toAccountId: transaction.userHederaAccountId,
      amount: conversionResult.hbarAmount,
      memo: `Recharge: ${transaction.transactionId}`,
    };

    const transferResult = await this.hederaService.transferHBAR(
      transferParams
    );

    if (transferResult.status !== "success") {
      throw new Error(`HBAR transfer failed: ${transferResult.transactionId}`);
    }

    return {
      transactionId: transaction.transactionId,
      hbarAmount: conversionResult.hbarAmount,
      hederaTransactionId: transferResult.transactionId,
      exchangeRate: conversionResult.exchangeRate,
      actualCost: transferResult.actualCost,
    };
  }

  /**
   * Calculate HBAR amount from XAF using current exchange rate
   */
  private async calculateHBARAmount(
    xafAmount: number
  ): Promise<ConversionResult> {
    try {
      return await this.exchangeRateService.calculateHBARAmount(xafAmount);
    } catch (error) {
      this.logger.error(
        "Failed to calculate HBAR amount",
        { operation: "CalculateHBARAmount", xafAmount },
        error as Error
      );
      throw new Error(RECHARGE_ERROR_CODES.EXCHANGE_RATE_UNAVAILABLE);
    }
  }

  /**
   * Health check for all service dependencies
   */
  async healthCheck(): Promise<ConversionHealthCheck> {
    const checks: ConversionHealthCheck = {
      database: false,
      eventBridge: false,
      exchangeRate: false,
      hederaNetwork: false,
    };

    try {
      // Check database connectivity
      await this.repository.healthCheck();
      checks.database = true;
    } catch (error) {
      this.logger.warn("Database health check failed", {}, error as Error);
    }

    try {
      // Check EventBridge connectivity
      await this.eventPublisher.healthCheck();
      checks.eventBridge = true;
    } catch (error) {
      this.logger.warn("EventBridge health check failed", {}, error as Error);
    }

    try {
      // Check exchange rate service
      await this.exchangeRateService.getCurrentRate();
      checks.exchangeRate = true;
    } catch (error) {
      this.logger.warn(
        "Exchange rate service health check failed",
        {},
        error as Error
      );
    }

    try {
      // Check Hedera network connectivity
      await this.hederaService.getAccountBalance(this.config.treasuryAccountId);
      checks.hederaNetwork = true;
    } catch (error) {
      this.logger.warn(
        "Hedera network health check failed",
        {},
        error as Error
      );
    }

    return checks;
  }

  /**
   * Get conversion statistics
   */
  async getConversionStats(timeRange: "1h" | "24h" | "7d" = "24h"): Promise<{
    totalConversions: number;
    successfulConversions: number;
    failedConversions: number;
    totalXAFProcessed: number;
    totalHBARTransferred: number;
    averageConversionTime: number;
  }> {
    // This would typically query DynamoDB for statistics
    // For now, return placeholder data
    return {
      totalConversions: 0,
      successfulConversions: 0,
      failedConversions: 0,
      totalXAFProcessed: 0,
      totalHBARTransferred: 0,
      averageConversionTime: 0,
    };
  }
}
