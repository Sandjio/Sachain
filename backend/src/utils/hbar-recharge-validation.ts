/**
 * Validation functions for HBAR recharge system
 * Validates recharge amounts, Hedera account IDs, and user inputs
 */

import {
  HBARRechargeRequest,
  RechargeConfig,
  RechargeError,
  RECHARGE_ERROR_CODES,
  RechargeErrorCode,
} from "../types/hbar-recharge";

// ============================================================================
// Configuration Constants
// ============================================================================

export const DEFAULT_RECHARGE_CONFIG: RechargeConfig = {
  limits: {
    minRechargeAmount: 1000, // 1,000 XAF minimum
    maxRechargeAmount: 1000000, // 1,000,000 XAF maximum
    dailyUserLimit: 5000000, // 5,000,000 XAF daily limit
  },
  fees: {
    platformFeePercentage: 2.5, // 2.5% platform fee
    orangeMoneyFeePercentage: 1.5, // 1.5% Orange Money fee
  },
  retry: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  exchangeRate: {
    cacheTimeout: 300, // 5 minutes
    staleThreshold: 600, // 10 minutes
  },
};

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: RechargeError[];
}

export interface AmountValidationResult extends ValidationResult {
  normalizedAmount?: number;
}

export interface HederaAccountValidationResult extends ValidationResult {
  normalizedAccountId?: string;
}

// ============================================================================
// Amount Validation Functions
// ============================================================================

/**
 * Validates XAF recharge amount against configured limits
 */
export function validateRechargeAmount(
  amount: number,
  config: RechargeConfig = DEFAULT_RECHARGE_CONFIG
): AmountValidationResult {
  const errors: RechargeError[] = [];

  // Check if amount is a valid number
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push({
      code: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
      message: "Recharge amount must be a positive number",
      retryable: false,
    });
    return { isValid: false, errors };
  }

  // Check minimum amount
  if (amount < config.limits.minRechargeAmount) {
    errors.push({
      code: RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW,
      message: `Minimum recharge amount is ${config.limits.minRechargeAmount} XAF`,
      details: {
        minAmount: config.limits.minRechargeAmount,
        providedAmount: amount,
      },
      retryable: false,
    });
  }

  // Check maximum amount
  if (amount > config.limits.maxRechargeAmount) {
    errors.push({
      code: RECHARGE_ERROR_CODES.AMOUNT_TOO_HIGH,
      message: `Maximum recharge amount is ${config.limits.maxRechargeAmount} XAF`,
      details: {
        maxAmount: config.limits.maxRechargeAmount,
        providedAmount: amount,
      },
      retryable: false,
    });
  }

  const isValid = errors.length === 0;
  const result: AmountValidationResult = { isValid, errors };

  if (isValid) {
    // Round to 2 decimal places for XAF
    result.normalizedAmount = Math.round(amount * 100) / 100;
  }

  return result;
}

/**
 * Validates daily spending limit for a user
 */
export function validateDailyLimit(
  amount: number,
  currentDailySpent: number,
  config: RechargeConfig = DEFAULT_RECHARGE_CONFIG
): ValidationResult {
  const errors: RechargeError[] = [];

  const totalAfterRecharge = currentDailySpent + amount;

  if (totalAfterRecharge > config.limits.dailyUserLimit) {
    const remainingLimit = Math.max(
      0,
      config.limits.dailyUserLimit - currentDailySpent
    );
    errors.push({
      code: RECHARGE_ERROR_CODES.DAILY_LIMIT_EXCEEDED,
      message: `Daily limit exceeded. Remaining limit: ${remainingLimit} XAF`,
      details: {
        dailyLimit: config.limits.dailyUserLimit,
        currentSpent: currentDailySpent,
        requestedAmount: amount,
        remainingLimit,
      },
      retryable: false,
    });
  }

  return { isValid: errors.length === 0, errors };
}

// ============================================================================
// Hedera Account Validation Functions
// ============================================================================

/**
 * Validates Hedera account ID format
 * Format: 0.0.accountNum (e.g., 0.0.123456)
 */
export function validateHederaAccountId(
  accountId: string
): HederaAccountValidationResult {
  const errors: RechargeError[] = [];

  if (!accountId || typeof accountId !== "string") {
    errors.push({
      code: RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT,
      message: "Hedera account ID is required",
      retryable: false,
    });
    return { isValid: false, errors };
  }

  // Trim whitespace
  const trimmedAccountId = accountId.trim();

  // Hedera account ID regex: 0.0.number or shard.realm.number
  const hederaAccountRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  const match = trimmedAccountId.match(hederaAccountRegex);

  if (!match) {
    errors.push({
      code: RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT,
      message: "Invalid Hedera account ID format. Expected format: 0.0.123456",
      details: { providedAccountId: accountId },
      retryable: false,
    });
    return { isValid: false, errors };
  }

  const [, shard, realm, accountNum] = match;

  // Validate account number is not zero
  if (accountNum === "0") {
    errors.push({
      code: RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT,
      message: "Account number cannot be zero",
      details: { providedAccountId: accountId },
      retryable: false,
    });
  }

  // Validate reasonable ranges (optional additional validation)
  const accountNumber = parseInt(accountNum, 10);
  if (accountNumber < 1 || accountNumber > 999999999) {
    errors.push({
      code: RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT,
      message: "Account number out of valid range",
      details: {
        providedAccountId: accountId,
        accountNumber,
        validRange: "1-999999999",
      },
      retryable: false,
    });
  }

  const isValid = errors.length === 0;
  const result: HederaAccountValidationResult = { isValid, errors };

  if (isValid) {
    result.normalizedAccountId = trimmedAccountId;
  }

  return result;
}

// ============================================================================
// Request Validation Functions
// ============================================================================

/**
 * Validates complete HBAR recharge request
 */
export function validateHBARRechargeRequest(
  request: Partial<HBARRechargeRequest>,
  config: RechargeConfig = DEFAULT_RECHARGE_CONFIG
): ValidationResult {
  const errors: RechargeError[] = [];

  // Validate required fields
  if (
    !request.userId ||
    typeof request.userId !== "string" ||
    request.userId.trim().length === 0
  ) {
    errors.push({
      code: RECHARGE_ERROR_CODES.INVALID_USER,
      message: "User ID is required",
      retryable: false,
    });
  }

  if (
    !request.pin ||
    typeof request.pin !== "string" ||
    request.pin.trim().length === 0
  ) {
    errors.push({
      code: RECHARGE_ERROR_CODES.INVALID_PIN,
      message: "Orange Money PIN is required",
      retryable: false,
    });
  }

  // Validate PIN format (typically 4-6 digits)
  if (request.pin && !/^\d{4,6}$/.test(request.pin.trim())) {
    errors.push({
      code: RECHARGE_ERROR_CODES.INVALID_PIN,
      message: "Orange Money PIN must be 4-6 digits",
      retryable: false,
    });
  }

  // Validate amount
  if (request.xafAmount !== undefined) {
    const amountValidation = validateRechargeAmount(request.xafAmount, config);
    errors.push(...amountValidation.errors);
  } else {
    errors.push({
      code: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
      message: "XAF amount is required",
      retryable: false,
    });
  }

  // Validate Hedera account ID
  if (request.userHederaAccountId) {
    const accountValidation = validateHederaAccountId(
      request.userHederaAccountId
    );
    errors.push(...accountValidation.errors);
  } else {
    errors.push({
      code: RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT,
      message: "Hedera account ID is required",
      retryable: false,
    });
  }

  return { isValid: errors.length === 0, errors };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a standardized validation error
 */
export function createValidationError(
  code: RechargeErrorCode,
  message: string,
  details?: Record<string, any>,
  retryable: boolean = false
): RechargeError {
  return {
    code,
    message,
    details,
    retryable,
  };
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: RechargeError): boolean {
  return error.retryable;
}

/**
 * Filters validation errors by type
 */
export function filterErrorsByCode(
  errors: RechargeError[],
  codes: RechargeErrorCode[]
): RechargeError[] {
  return errors.filter((error) =>
    codes.includes(error.code as RechargeErrorCode)
  );
}

/**
 * Gets the first error of a specific type
 */
export function getFirstErrorByCode(
  errors: RechargeError[],
  code: RechargeErrorCode
): RechargeError | undefined {
  return errors.find((error) => error.code === code);
}

/**
 * Formats validation errors for API response
 */
export function formatValidationErrors(errors: RechargeError[]): string {
  if (errors.length === 0) return "";
  if (errors.length === 1) return errors[0].message;

  return `Multiple validation errors: ${errors
    .map((e) => e.message)
    .join("; ")}`;
}
