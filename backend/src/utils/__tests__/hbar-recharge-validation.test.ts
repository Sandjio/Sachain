/**
 * Unit tests for HBAR Recharge Validation Utilities
 */

import {
  validateRechargeAmount,
  validateDailyLimit,
  validateHederaAccountId,
  validateCameroonPhoneNumber,
  validateOrangeMoneyPin,
  validateUserId,
  validateTransactionId,
  validateHBARRechargeRequest,
  getFirstValidationError,
  areAllValidationsValid,
  formatValidationErrors,
  createRechargeValidationErrorMessage,
  RechargeValidationConfig,
} from "../hbar-recharge-validation";
import { RECHARGE_ERROR_CODES } from "../../types/hbar-recharge";

describe("HBAR Recharge Validation Utilities", () => {
  const defaultConfig: RechargeValidationConfig = {
    minAmount: 1000,
    maxAmount: 1000000,
    dailyLimit: 5000000,
  };

  describe("validateRechargeAmount", () => {
    it("should accept valid amounts", () => {
      const validAmounts = [1000, 50000, 500000, 1000000];

      validAmounts.forEach((amount) => {
        const result = validateRechargeAmount(amount);
        expect(result.isValid).toBe(true);
        expect(result.errorCode).toBeUndefined();
      });
    });

    it("should reject invalid amounts", () => {
      const invalidAmounts = [0, -100, null, undefined, NaN];

      invalidAmounts.forEach((amount) => {
        const result = validateRechargeAmount(amount as number);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(RECHARGE_ERROR_CODES.INVALID_AMOUNT);
      });
    });

    it("should reject amounts below minimum", () => {
      const result = validateRechargeAmount(500);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW);
      expect(result.errorMessage).toContain("1,000 XAF");
    });

    it("should reject amounts above maximum", () => {
      const result = validateRechargeAmount(2000000);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(RECHARGE_ERROR_CODES.AMOUNT_TOO_HIGH);
      expect(result.errorMessage).toContain("1,000,000 XAF");
    });

    it("should use custom config", () => {
      const customConfig: RechargeValidationConfig = {
        minAmount: 2000,
        maxAmount: 500000,
        dailyLimit: 1000000,
      };

      const result1 = validateRechargeAmount(1500, customConfig);
      expect(result1.isValid).toBe(false);
      expect(result1.errorCode).toBe(RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW);

      const result2 = validateRechargeAmount(600000, customConfig);
      expect(result2.isValid).toBe(false);
      expect(result2.errorCode).toBe(RECHARGE_ERROR_CODES.AMOUNT_TOO_HIGH);
    });
  });

  describe("validateDailyLimit", () => {
    it("should accept amounts within daily limit", () => {
      const result = validateDailyLimit(1000000, 500000);
      expect(result.isValid).toBe(true);
    });

    it("should reject amounts exceeding daily limit", () => {
      const result = validateDailyLimit(4000000, 2000000);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(RECHARGE_ERROR_CODES.DAILY_LIMIT_EXCEEDED);
      expect(result.errorMessage).toContain("1,000,000 XAF today");
    });

    it("should handle edge case at exact limit", () => {
      const result = validateDailyLimit(4000000, 1000000);
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateHederaAccountId", () => {
    it("should accept valid Hedera account IDs", () => {
      const validIds = ["0.0.123456", "0.0.1", "0.0.999999999"];

      validIds.forEach((id) => {
        const result = validateHederaAccountId(id);
        expect(result.isValid).toBe(true);
      });
    });

    it("should reject invalid Hedera account IDs", () => {
      const invalidIds = [
        "",
        null,
        undefined,
        "123456",
        "0.123456",
        "0.0",
        "1.0.123456",
        "0.1.123456",
        "abc.def.ghi",
      ];

      invalidIds.forEach((id) => {
        const result = validateHederaAccountId(id as string);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(
          RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT
        );
      });
    });
  });

  describe("validateCameroonPhoneNumber", () => {
    it("should accept valid Cameroon phone numbers", () => {
      const validNumbers = [
        "677123456",
        "697123456",
        "237677123456",
        "+237677123456",
        "237697123456",
        "+237697123456",
      ];

      validNumbers.forEach((number) => {
        const result = validateCameroonPhoneNumber(number);
        expect(result.isValid).toBe(true);
      });
    });

    it("should reject invalid phone numbers", () => {
      const invalidNumbers = [
        "",
        null,
        undefined,
        "123456789",
        "12345678901",
        "577123456",
        "+33677123456",
        "abc123456",
      ];

      invalidNumbers.forEach((number) => {
        const result = validateCameroonPhoneNumber(number as string);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe("validateOrangeMoneyPin", () => {
    it("should accept valid PINs", () => {
      const validPins = ["1234", "12345", "123456"];

      validPins.forEach((pin) => {
        const result = validateOrangeMoneyPin(pin);
        expect(result.isValid).toBe(true);
      });
    });

    it("should reject invalid PINs", () => {
      const invalidPins = [
        "",
        null,
        undefined,
        "123",
        "1234567",
        "abcd",
        "12a4",
      ];

      invalidPins.forEach((pin) => {
        const result = validateOrangeMoneyPin(pin as string);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe("validateUserId", () => {
    it("should accept valid user IDs", () => {
      const validIds = ["user123", "abc-def-ghi", "user_456"];

      validIds.forEach((id) => {
        const result = validateUserId(id);
        expect(result.isValid).toBe(true);
      });
    });

    it("should reject invalid user IDs", () => {
      const invalidIds = ["", null, undefined, "ab", "  "];

      invalidIds.forEach((id) => {
        const result = validateUserId(id as string);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(RECHARGE_ERROR_CODES.INVALID_USER);
      });
    });
  });

  describe("validateTransactionId", () => {
    it("should accept valid transaction IDs", () => {
      const validIds = ["txn-123", "transaction_456", "recharge-789"];

      validIds.forEach((id) => {
        const result = validateTransactionId(id);
        expect(result.isValid).toBe(true);
      });
    });

    it("should reject invalid transaction IDs", () => {
      const invalidIds = ["", null, undefined, "abc", "  "];

      invalidIds.forEach((id) => {
        const result = validateTransactionId(id as string);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe("validateHBARRechargeRequest", () => {
    const validRequest = {
      userId: "user-123",
      xafAmount: 50000,
      userHederaAccountId: "0.0.123456",
      customerNumber: "677123456",
      pin: "1234",
      transactionId: "txn-789",
    };

    it("should validate a complete valid request", () => {
      const results = validateHBARRechargeRequest(validRequest);
      expect(areAllValidationsValid(results)).toBe(true);
    });

    it("should return multiple errors for invalid request", () => {
      const invalidRequest = {
        userId: "",
        xafAmount: 500,
        userHederaAccountId: "invalid",
        customerNumber: "123",
        pin: "abc",
        transactionId: "",
      };

      const results = validateHBARRechargeRequest(invalidRequest);
      expect(areAllValidationsValid(results)).toBe(false);
      expect(results.filter((r) => !r.isValid)).toHaveLength(6);
    });
  });

  describe("utility functions", () => {
    it("should get first validation error", () => {
      const results = [
        { isValid: true },
        {
          isValid: false,
          errorCode: RECHARGE_ERROR_CODES.INVALID_AMOUNT,
          errorMessage: "First error",
        },
        {
          isValid: false,
          errorCode: RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW,
          errorMessage: "Second error",
        },
      ];

      const firstError = getFirstValidationError(results);
      expect(firstError?.errorMessage).toBe("First error");
    });

    it("should return null when no errors", () => {
      const results = [{ isValid: true }, { isValid: true }];

      const firstError = getFirstValidationError(results);
      expect(firstError).toBeNull();
    });

    it("should format validation errors", () => {
      const results = [
        { isValid: true },
        { isValid: false, errorMessage: "Error 1" },
        { isValid: false, errorMessage: "Error 2" },
      ];

      const errors = formatValidationErrors(results);
      expect(errors).toEqual(["Error 1", "Error 2"]);
    });

    it("should create user-friendly error messages", () => {
      const singleError = [{ isValid: false, errorMessage: "Single error" }];

      const multipleErrors = [
        { isValid: false, errorMessage: "Error 1" },
        { isValid: false, errorMessage: "Error 2" },
      ];

      expect(createRechargeValidationErrorMessage(singleError)).toBe(
        "Single error"
      );
      expect(createRechargeValidationErrorMessage(multipleErrors)).toBe(
        "Multiple validation errors: Error 1; Error 2"
      );
      expect(createRechargeValidationErrorMessage([])).toBe("");
    });
  });
});
