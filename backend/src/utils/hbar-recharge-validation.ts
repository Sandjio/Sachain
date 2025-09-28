/**
 * HBAR Recharge Validation Utilities
 * Provides validation functions for HBAR recharge operations
 */

import {
  RECHARGE_ERROR_CODES,
  RechargeErrorCode,
} from "../types/hbar-recharge";

export interface ValidationResult {
  isValid: boolean;
  errorCode?: RechargeErrorCode;
  errorMessage?: string;
}

export interface RechargeValidationConfig {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
}

// Default validation configuration
const DEFAULT_CONFIG: RechargeValidationConfig = {
  minAmount: 1000, // 1,000 XAF
  maxAmount: 1000000, // 1,000,000 XAF
  dailyLimit: 5000000, // 5,000,000 XAF
};

/**
 * Validates XAF amount for recharge
 */
export function validateRechargeAmount(
  amount: number,
  config: RechargeValidationConfig = DEFAULT_CONFIG
): ValidationResult {
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
      errorMessage: "Amount must be a positive number",
    };
  }

  if (amount < config.minAmount) {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW,
      errorMessage: `Amount must be at least ${config.minAmount.toLocaleString()} XAF`,
    };
  }

  if (amount > config.maxAmount) {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.AMOUNT_TOO_HIGH,
      errorMessage: `Amount cannot exceed ${config.maxAmount.toLocaleString()} XAF`,
    };
  }

  return { isValid: true };
}

/**
 * Validates daily spending limit for user
 */
export function validateDailyLimit(
  currentDailySpent: number,
  newAmount: number,
  config: RechargeValidationConfig = DEFAULT_CONFIG
): ValidationResult {
  const totalAfterTransaction = currentDailySpent + newAmount;

  if (totalAfterTransaction > config.dailyLimit) {
    const remainingLimit = config.dailyLimit - currentDailySpent;
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.DAILY_LIMIT_EXCEEDED,
      errorMessage: `Daily limit exceeded. You can still recharge up to ${remainingLimit.toLocaleString()} XAF today`,
    };
  }

  return { isValid: true };
}

/**
 * Validates Hedera account ID format
 */
export function validateHederaAccountId(accountId: string): ValidationResult {
  if (!accountId || typeof accountId !== "string") {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT,
      errorMessage: "Hedera account ID is required",
    };
  }

  // Hedera account ID format: 0.0.XXXXXX
  const pattern = /^0\.0\.\d+$/;
  if (!pattern.test(accountId)) {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT,
      errorMessage:
        "Invalid Hedera account ID format. Expected format: 0.0.XXXXXX",
    };
  }

  return { isValid: true };
}

/**
 * Validates Cameroon phone number format for Orange Money
 */
export function validateCameroonPhoneNumber(
  phoneNumber: string
): ValidationResult {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_AMOUNT, // Using generic code as no specific phone validation code exists
      errorMessage: "Phone number is required",
    };
  }

  // Cameroon phone number patterns
  const patterns = [
    /^\+237[67]\d{8}$/, // +237 followed by 6 or 7 and 8 digits
    /^237[67]\d{8}$/, // 237 followed by 6 or 7 and 8 digits
    /^[67]\d{8}$/, // 6 or 7 followed by 8 digits
  ];

  const isValid = patterns.some((pattern) => pattern.test(phoneNumber));

  if (!isValid) {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
      errorMessage:
        "Invalid Cameroon phone number format. Expected formats: 677123456, 237677123456, or +237677123456",
    };
  }

  return { isValid: true };
}

/**
 * Validates Orange Money PIN format
 */
export function validateOrangeMoneyPin(pin: string): ValidationResult {
  if (!pin || typeof pin !== "string") {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
      errorMessage: "Orange Money PIN is required",
    };
  }

  // PIN should be 4-6 digits
  const pattern = /^\d{4,6}$/;
  if (!pattern.test(pin)) {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
      errorMessage: "Orange Money PIN must be 4-6 digits",
    };
  }

  return { isValid: true };
}

/**
 * Validates user ID format
 */
export function validateUserId(userId: string): ValidationResult {
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_USER,
      errorMessage: "User ID is required",
    };
  }

  // Basic format validation - should be non-empty string
  if (userId.length < 3) {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_USER,
      errorMessage: "Invalid user ID format",
    };
  }

  return { isValid: true };
}

/**
 * Validates transaction ID format
 */
export function validateTransactionId(transactionId: string): ValidationResult {
  if (
    !transactionId ||
    typeof transactionId !== "string" ||
    transactionId.trim().length === 0
  ) {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
      errorMessage: "Transaction ID is required",
    };
  }

  // Basic format validation - should be non-empty string
  if (transactionId.length < 5) {
    return {
      isValid: false,
      errorCode: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
      errorMessage: "Invalid transaction ID format",
    };
  }

  return { isValid: true };
}

/**
 * Comprehensive validation for HBAR recharge request
 */
export function validateHBARRechargeRequest(
  request: {
    userId: string;
    xafAmount: number;
    userHederaAccountId: string;
    customerNumber: string;
    pin: string;
    transactionId: string;
  },
  config?: RechargeValidationConfig
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Validate all fields
  results.push(validateUserId(request.userId));
  results.push(validateTransactionId(request.transactionId));
  results.push(validateRechargeAmount(request.xafAmount, config));
  results.push(validateHederaAccountId(request.userHederaAccountId));
  results.push(validateCameroonPhoneNumber(request.customerNumber));
  results.push(validateOrangeMoneyPin(request.pin));

  return results;
}

/**
 * Gets the first validation error from a list of validation results
 */
export function getFirstValidationError(
  results: ValidationResult[]
): ValidationResult | null {
  const firstError = results.find((result) => !result.isValid);
  return firstError || null;
}

/**
 * Checks if all validation results are valid
 */
export function areAllValidationsValid(results: ValidationResult[]): boolean {
  return results.every((result) => result.isValid);
}

/**
 * Formats validation errors for user display
 */
export function formatValidationErrors(results: ValidationResult[]): string[] {
  return results
    .filter((result) => !result.isValid)
    .map((result) => result.errorMessage || "Unknown validation error");
}

/**
 * Creates a user-friendly error message for recharge validation failures
 */
export function createRechargeValidationErrorMessage(
  results: ValidationResult[]
): string {
  const errors = formatValidationErrors(results);

  if (errors.length === 0) {
    return "";
  }

  if (errors.length === 1) {
    return errors[0];
  }

  return `Multiple validation errors: ${errors.join("; ")}`;
}
