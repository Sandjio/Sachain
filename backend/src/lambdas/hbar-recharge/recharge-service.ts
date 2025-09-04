/**
 * HBAR Recharge Service
 * Main business logic for handling HBAR recharge requests
 */

import { v4 as uuidv4 } from "uuid";
import {
  HBARRechargeServiceConfig,
  RechargeServiceResult,
  RechargeInitiationResult,
  RechargeValidationContext,
  HealthCheckResult,
  OrangeMoneyPaymentRequest,
} from "./types";
import {
  HBARRechargeRequest,
  RechargeTransaction,
  RECHARGE_ERROR_CODES,
  FeeBreakdown,
} from "../../types/hbar-recharge";
import { RechargeRepository } from "./recharge-repository";
import { RechargeEventPublisher } from "./event-publisher";
import { RechargeValidator } from "./validator";
import { FeeCalculator } from "./fee-calculator";
import { createExchangeRateService } from "../../utils/exchange-rate-service";
import { OrangeMoneyRechargeService } from "../om-payments/recharge-service";
import { StructuredLogger } from "../../utils/structured-logger";

export class HBARRechargeService {
  private readonly config: HBARRechargeServiceConfig;
  private readonly repository: RechargeRepository;
  private readonly eventPublisher: RechargeEventPublisher;
  private readonly validator: RechargeValidator;
  private readonly feeCalculator: FeeCalculator;
  private readonly exchangeRateService: any;
  private readonly orangeMoneyService: OrangeMoneyRechargeService;
  private readonly logger: StructuredLogger;

  constructor(config: HBARRechargeServiceConfig) {
    this.config = config;
    this.repository = new RechargeRepository({ tableName: config.tableName });
    this.eventPublisher = new RechargeEventPublisher({
      eventBusName: config.eventBusName,
    });
    this.validator = new RechargeValidator();
    this.feeCalculator = new FeeCalculator();
    this.exchangeRateService = createExchangeRateService(config.tableName);
    this.orangeMoneyService = new OrangeMoneyRechargeService();
    this.logger = new StructuredLogger("HBARRechargeService");
  }

  /**
   * Initiates an HBAR recharge request
   */
  async initiateRecharge(
    request: HBARRechargeRequest
  ): Promise<RechargeServiceResult<RechargeInitiationResult>> {
    const transactionId = uuidv4();
    const startTime = Date.now();

    this.logger.info("Initiating HBAR recharge", {
      operation: "InitiateRecharge",
      transactionId,
      userId: request.userId,
      xafAmount: request.xafAmount,
    });

    try {
      // Step 1: Validate the request
      const validationResult = await this.validateRechargeRequest(request);
      if (!validationResult.success) {
        return validationResult;
      }

      // Step 2: Get current exchange rate and calculate fees
      const conversionResult = await this.calculateConversion(
        request.xafAmount
      );
      if (!conversionResult.success) {
        return conversionResult;
      }

      const { hbarAmount, exchangeRate, platformFee, orangeMoneyFee } =
        conversionResult.data!;
      const fees: FeeBreakdown = {
        platformFee,
        orangeMoneyFee,
        totalFees: platformFee + orangeMoneyFee,
      };

      // Step 3: Create transaction record
      const transaction: RechargeTransaction = {
        PK: `USER#${request.userId}`,
        SK: `RECHARGE#${transactionId}`,
        transactionId,
        userId: request.userId,
        userHederaAccountId: request.userHederaAccountId,
        xafAmount: request.xafAmount,
        hbarAmount,
        exchangeRate,
        orangeMoneyFee,
        platformFee,
        totalFees: fees.totalFees,
        status: "initiated",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0,
        GSI1PK: "RECHARGE_STATUS#initiated",
        GSI1SK: new Date().toISOString(),
      };

      await this.repository.createTransaction(transaction);

      // Step 4: Initiate Orange Money payment
      const paymentRequest: OrangeMoneyPaymentRequest = {
        transactionId,
        userId: request.userId,
        customerNumber: request.pin, // This should be the phone number, not PIN
        xafAmount: request.xafAmount,
        userHederaAccountId: request.userHederaAccountId,
        estimatedHBARAmount: hbarAmount,
        fees,
        pin: request.pin,
      };

      const paymentResult = await this.initiateOrangeMoneyPayment(
        paymentRequest
      );
      if (!paymentResult.success) {
        // Update transaction status to failed
        await this.repository.updateTransactionStatus(
          transactionId,
          request.userId,
          "failed",
          {
            errorMessage: paymentResult.error!.message,
            updatedAt: new Date().toISOString(),
          }
        );
        return paymentResult;
      }

      // Step 5: Update transaction with Orange Money details
      await this.repository.updateTransactionStatus(
        transactionId,
        request.userId,
        "payment_confirmed",
        {
          orangeMoneyTransactionId:
            paymentResult.data!.orangeMoneyTransactionId,
          updatedAt: new Date().toISOString(),
          GSI1PK: "RECHARGE_STATUS#payment_confirmed",
        }
      );

      // Step 6: Publish payment confirmed event
      await this.eventPublisher.publishPaymentConfirmed({
        transactionId,
        userId: request.userId,
        xafAmount: request.xafAmount,
        userHederaAccountId: request.userHederaAccountId,
        fees,
        orangeMoneyTransactionId: paymentResult.data!.orangeMoneyTransactionId!,
        timestamp: new Date().toISOString(),
      });

      // Step 7: Update daily spending
      await this.updateDailySpending(request.userId, request.xafAmount);

      const duration = Date.now() - startTime;
      this.logger.info("HBAR recharge initiated successfully", {
        operation: "InitiateRecharge",
        transactionId,
        userId: request.userId,
        xafAmount: request.xafAmount,
        hbarAmount,
        duration,
      });

      return {
        success: true,
        data: {
          transactionId,
          xafAmount: request.xafAmount,
          estimatedHBARAmount: hbarAmount,
          conversionRate: exchangeRate,
          fees,
          status: "payment_initiated" as const,
          orangeMoneyTransactionId:
            paymentResult.data!.orangeMoneyTransactionId,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        "Failed to initiate HBAR recharge",
        {
          operation: "InitiateRecharge",
          transactionId,
          userId: request.userId,
          xafAmount: request.xafAmount,
          duration,
        },
        error as Error
      );

      return {
        success: false,
        error: {
          code: RECHARGE_ERROR_CODES.INTERNAL_ERROR,
          message:
            "An unexpected error occurred while processing your recharge request",
          details: { originalError: (error as Error).message },
        },
      };
    }
  }

  /**
   * Validates a recharge request
   */
  private async validateRechargeRequest(
    request: HBARRechargeRequest
  ): Promise<RechargeServiceResult> {
    try {
      // Basic validation
      const basicValidation = this.validator.validateRequest(request);
      if (!basicValidation.isValid) {
        return {
          success: false,
          error: {
            code: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
            message: basicValidation.errors[0].message,
          },
        };
      }

      // Check daily spending limit
      const currentDailySpent = await this.repository.getDailySpending(
        request.userId,
        new Date().toISOString().split("T")[0]
      );

      const dailyLimitValidation = this.validator.validateDailyLimit(
        currentDailySpent,
        request.xafAmount
      );

      if (!dailyLimitValidation.isValid) {
        return {
          success: false,
          error: {
            code: RECHARGE_ERROR_CODES.DAILY_LIMIT_EXCEEDED,
            message: dailyLimitValidation.errors[0].message,
          },
        };
      }

      return { success: true };
    } catch (error) {
      this.logger.error(
        "Validation failed",
        {
          operation: "ValidateRechargeRequest",
          userId: request.userId,
        },
        error as Error
      );

      return {
        success: false,
        error: {
          code: RECHARGE_ERROR_CODES.INTERNAL_ERROR,
          message: "Validation failed due to system error",
        },
      };
    }
  }

  /**
   * Calculates conversion rate and fees
   */
  private async calculateConversion(
    xafAmount: number
  ): Promise<RechargeServiceResult> {
    try {
      const conversionResult =
        await this.exchangeRateService.calculateHBARAmount(xafAmount);

      return {
        success: true,
        data: conversionResult,
      };
    } catch (error) {
      this.logger.error(
        "Failed to calculate conversion",
        {
          operation: "CalculateConversion",
          xafAmount,
        },
        error as Error
      );

      return {
        success: false,
        error: {
          code: RECHARGE_ERROR_CODES.EXCHANGE_RATE_UNAVAILABLE,
          message:
            "Unable to get current exchange rate. Please try again later.",
        },
      };
    }
  }

  /**
   * Initiates Orange Money payment
   */
  private async initiateOrangeMoneyPayment(
    request: OrangeMoneyPaymentRequest
  ): Promise<RechargeServiceResult> {
    try {
      // Convert to Orange Money service format
      const omRequest = {
        transactionId: request.transactionId,
        userId: request.userId,
        userHederaAccountId: request.userHederaAccountId,
        xafAmount: request.xafAmount,
        estimatedHBARAmount: request.estimatedHBARAmount,
        fees: request.fees,
        customerNumber: request.customerNumber,
        amount: request.xafAmount.toString(),
        pin: request.pin,
      };

      const result = await this.orangeMoneyService.initiateRechargePayment(
        omRequest
      );

      if (result.success) {
        return {
          success: true,
          data: {
            orangeMoneyTransactionId: result.orangeMoneyTransactionId,
            paymentData: result.paymentData,
          },
        };
      } else {
        return {
          success: false,
          error: {
            code: RECHARGE_ERROR_CODES.ORANGE_MONEY_FAILED,
            message: result.error?.message || "Orange Money payment failed",
            details: result.error,
          },
        };
      }
    } catch (error) {
      this.logger.error(
        "Orange Money payment initiation failed",
        {
          operation: "InitiateOrangeMoneyPayment",
          transactionId: request.transactionId,
          userId: request.userId,
        },
        error as Error
      );

      return {
        success: false,
        error: {
          code: RECHARGE_ERROR_CODES.ORANGE_MONEY_FAILED,
          message: "Failed to initiate Orange Money payment",
          details: { originalError: (error as Error).message },
        },
      };
    }
  }

  /**
   * Updates daily spending for a user
   */
  private async updateDailySpending(
    userId: string,
    amount: number
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0];
      await this.repository.updateDailySpending(userId, today, amount);
    } catch (error) {
      // Log error but don't fail the transaction
      this.logger.error(
        "Failed to update daily spending",
        {
          operation: "UpdateDailySpending",
          userId,
          amount,
        },
        error as Error
      );
    }
  }

  /**
   * Performs health check on all service dependencies
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult = {
      database: false,
      eventBridge: false,
      exchangeRate: false,
      orangeMoney: false,
      timestamp: new Date().toISOString(),
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
      // Check Orange Money service (basic validation)
      const limits = this.orangeMoneyService.getRechargeLimit();
      checks.orangeMoney = limits.minAmount > 0;
    } catch (error) {
      this.logger.warn(
        "Orange Money service health check failed",
        {},
        error as Error
      );
    }

    return checks;
  }

  /**
   * Gets transaction status
   */
  async getTransactionStatus(
    transactionId: string,
    userId: string
  ): Promise<RechargeServiceResult<RechargeTransaction>> {
    try {
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
          },
        };
      }

      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      this.logger.error(
        "Failed to get transaction status",
        {
          operation: "GetTransactionStatus",
          transactionId,
          userId,
        },
        error as Error
      );

      return {
        success: false,
        error: {
          code: RECHARGE_ERROR_CODES.DATABASE_ERROR,
          message: "Failed to retrieve transaction status",
        },
      };
    }
  }
}
