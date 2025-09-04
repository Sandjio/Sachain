/**
 * HBAR Recharge Request Validator
 * Validates recharge requests against business rules and constraints
 */

import {
  validateHBARRechargeRequest,
  validateDailyLimit,
  areAllValidationsValid,
  getFirstValidationError,
  ValidationResult,
  RechargeValidationConfig,
} from "../../utils/hbar-recharge-validation";
import { HBARRechargeRequest } from "../../types/hbar-recharge";
import { ValidationResult as ServiceValidationResult } from "./types";

export class RechargeValidator {
  private readonly config: RechargeValidationConfig;

  constructor(config?: Partial<RechargeValidationConfig>) {
    this.config = {
      minAmount: 1000, // 1,000 XAF
      maxAmount: 1000000, // 1,000,000 XAF
      dailyLimit: 5000000, // 5,000,000 XAF
      ...config,
    };
  }

  /**
   * Validates a complete HBAR recharge request
   */
  validateRequest(request: HBARRechargeRequest): ServiceValidationResult {
    const validationResults = validateHBARRechargeRequest(
      {
        userId: request.userId,
        xafAmount: request.xafAmount,
        userHederaAccountId: request.userHederaAccountId,
        customerNumber: this.extractPhoneNumber(request),
        pin: request.pin,
        transactionId: this.generateTransactionId(), // We'll generate this
      },
      this.config
    );

    if (areAllValidationsValid(validationResults)) {
      return {
        isValid: true,
        errors: [],
      };
    }

    const firstError = getFirstValidationError(validationResults);
    return {
      isValid: false,
      errors: [
        {
          field: this.getFieldFromError(firstError),
          code: firstError?.errorCode || "VALIDATION_ERROR",
          message: firstError?.errorMessage || "Validation failed",
        },
      ],
    };
  }

  /**
   * Validates daily spending limit
   */
  validateDailyLimit(
    currentDailySpent: number,
    newAmount: number
  ): ServiceValidationResult {
    const validationResult = validateDailyLimit(
      currentDailySpent,
      newAmount,
      this.config
    );

    if (validationResult.isValid) {
      return {
        isValid: true,
        errors: [],
      };
    }

    return {
      isValid: false,
      errors: [
        {
          field: "xafAmount",
          code: validationResult.errorCode || "DAILY_LIMIT_EXCEEDED",
          message: validationResult.errorMessage || "Daily limit exceeded",
        },
      ],
    };
  }

  /**
   * Validates user authentication context
   */
  validateUserContext(
    request: HBARRechargeRequest,
    authenticatedUserId: string
  ): ServiceValidationResult {
    const errors: Array<{ field: string; code: string; message: string }> = [];

    // Check if request user matches authenticated user
    if (request.userId !== authenticatedUserId) {
      errors.push({
        field: "userId",
        code: "USER_MISMATCH",
        message: "Request user ID does not match authenticated user",
      });
    }

    // Validate user ID format
    if (!this.isValidUserId(request.userId)) {
      errors.push({
        field: "userId",
        code: "INVALID_USER_ID",
        message: "Invalid user ID format",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates business rules for recharge
   */
  validateBusinessRules(request: HBARRechargeRequest): ServiceValidationResult {
    const errors: Array<{ field: string; code: string; message: string }> = [];

    // Check for suspicious patterns
    if (this.isSuspiciousAmount(request.xafAmount)) {
      errors.push({
        field: "xafAmount",
        code: "SUSPICIOUS_AMOUNT",
        message: "Amount flagged for review",
      });
    }

    // Check for rapid successive requests (would need additional context)
    // This would typically check against recent transaction history

    // Validate Hedera account ownership (would need additional verification)
    if (!this.isValidHederaAccountFormat(request.userHederaAccountId)) {
      errors.push({
        field: "userHederaAccountId",
        code: "INVALID_HEDERA_ACCOUNT",
        message: "Invalid Hedera account ID format",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates KYC requirements for the amount
   */
  validateKYCRequirements(
    request: HBARRechargeRequest,
    userKYCStatus?: string
  ): ServiceValidationResult {
    const errors: Array<{ field: string; code: string; message: string }> = [];

    // Large amounts require KYC verification
    const kycRequiredThreshold = 500000; // 500,000 XAF

    if (request.xafAmount >= kycRequiredThreshold) {
      if (!userKYCStatus || userKYCStatus !== "approved") {
        errors.push({
          field: "xafAmount",
          code: "KYC_REQUIRED",
          message: `KYC verification required for amounts above ${kycRequiredThreshold.toLocaleString()} XAF`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates rate limiting constraints
   */
  validateRateLimit(
    userId: string,
    recentRequestCount: number
  ): ServiceValidationResult {
    const maxRequestsPerHour = 10;

    if (recentRequestCount >= maxRequestsPerHour) {
      return {
        isValid: false,
        errors: [
          {
            field: "userId",
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many requests. Maximum ${maxRequestsPerHour} requests per hour allowed`,
          },
        ],
      };
    }

    return {
      isValid: true,
      errors: [],
    };
  }

  /**
   * Comprehensive validation combining all checks
   */
  validateComplete(
    request: HBARRechargeRequest,
    context: {
      authenticatedUserId: string;
      currentDailySpent: number;
      userKYCStatus?: string;
      recentRequestCount?: number;
    }
  ): ServiceValidationResult {
    const allErrors: Array<{ field: string; code: string; message: string }> =
      [];

    // Basic request validation
    const basicValidation = this.validateRequest(request);
    if (!basicValidation.isValid) {
      allErrors.push(...basicValidation.errors);
    }

    // User context validation
    const userValidation = this.validateUserContext(
      request,
      context.authenticatedUserId
    );
    if (!userValidation.isValid) {
      allErrors.push(...userValidation.errors);
    }

    // Daily limit validation
    const dailyLimitValidation = this.validateDailyLimit(
      context.currentDailySpent,
      request.xafAmount
    );
    if (!dailyLimitValidation.isValid) {
      allErrors.push(...dailyLimitValidation.errors);
    }

    // Business rules validation
    const businessValidation = this.validateBusinessRules(request);
    if (!businessValidation.isValid) {
      allErrors.push(...businessValidation.errors);
    }

    // KYC validation
    const kycValidation = this.validateKYCRequirements(
      request,
      context.userKYCStatus
    );
    if (!kycValidation.isValid) {
      allErrors.push(...kycValidation.errors);
    }

    // Rate limiting validation
    if (context.recentRequestCount !== undefined) {
      const rateLimitValidation = this.validateRateLimit(
        request.userId,
        context.recentRequestCount
      );
      if (!rateLimitValidation.isValid) {
        allErrors.push(...rateLimitValidation.errors);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * Helper methods
   */

  private extractPhoneNumber(request: HBARRechargeRequest): string {
    // In a real implementation, this would extract the phone number
    // from the request or user profile. For now, we'll use a placeholder
    return "677123456"; // Placeholder
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getFieldFromError(error: ValidationResult | null): string {
    if (!error) return "unknown";

    // Map error codes to field names
    const errorFieldMap: Record<string, string> = {
      INVALID_AMOUNT: "xafAmount",
      AMOUNT_TOO_LOW: "xafAmount",
      AMOUNT_TOO_HIGH: "xafAmount",
      INVALID_HEDERA_ACCOUNT: "userHederaAccountId",
      INVALID_USER: "userId",
      DAILY_LIMIT_EXCEEDED: "xafAmount",
    };

    return errorFieldMap[error.errorCode || ""] || "unknown";
  }

  private isValidUserId(userId: string): boolean {
    // Basic user ID validation
    return userId && userId.length >= 3 && userId.length <= 50;
  }

  private isSuspiciousAmount(amount: number): boolean {
    // Flag amounts that are exactly round numbers above a threshold
    const suspiciousThreshold = 100000; // 100,000 XAF
    const roundNumberThreshold = 50000; // 50,000 XAF

    if (amount >= suspiciousThreshold && amount % roundNumberThreshold === 0) {
      return true;
    }

    return false;
  }

  private isValidHederaAccountFormat(accountId: string): boolean {
    // Hedera account ID format: 0.0.XXXXXX
    const pattern = /^0\.0\.\d+$/;
    return pattern.test(accountId);
  }

  /**
   * Gets current validation configuration
   */
  getConfig(): RechargeValidationConfig {
    return { ...this.config };
  }

  /**
   * Updates validation configuration
   */
  updateConfig(newConfig: Partial<RechargeValidationConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Validates configuration values
   */
  validateConfig(config: RechargeValidationConfig): ServiceValidationResult {
    const errors: Array<{ field: string; code: string; message: string }> = [];

    if (config.minAmount <= 0) {
      errors.push({
        field: "minAmount",
        code: "INVALID_CONFIG",
        message: "Minimum amount must be greater than 0",
      });
    }

    if (config.maxAmount <= config.minAmount) {
      errors.push({
        field: "maxAmount",
        code: "INVALID_CONFIG",
        message: "Maximum amount must be greater than minimum amount",
      });
    }

    if (config.dailyLimit <= config.maxAmount) {
      errors.push({
        field: "dailyLimit",
        code: "INVALID_CONFIG",
        message:
          "Daily limit must be greater than maximum single transaction amount",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
