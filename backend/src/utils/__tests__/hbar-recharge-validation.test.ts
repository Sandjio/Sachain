/**
 * Unit tests for HBAR recharge validation functions
 */

import {
  validateRechargeAmount,
  validateDailyLimit,
  validateHederaAccountId,
  validateHBARRechargeRequest,
  createValidationError,
  isRetryableError,
  filterErrorsByCode,
  getFirstErrorByCode,
  formatValidationErrors,
  DEFAULT_RECHARGE_CONFIG,
} from "../hbar-recharge-validation";

import {
  HBARRechargeRequest,
  RechargeConfig,
  RECHARGE_ERROR_CODES,
} from "../../types/hbar-recharge";

describe("HBAR Recharge Validation", () => {
  describe("validateRechargeAmount", () => {
    it("should validate valid amounts", () => {
      const result = validateRechargeAmount(5000);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedAmount).toBe(5000);
    });

    it("should normalize decimal amounts", () => {
      const result = validateRechargeAmount(5000.567);
      expect(result.isValid).toBe(true);
      expect(result.normalizedAmount).toBe(5000.57);
    });

    it("should reject negative amounts", () => {
      const result = validateRechargeAmount(-100);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(RECHARGE_ERROR_CODES.INVALID_AMOUNT);
    });

    it("should reject zero amounts", () => {
      const result = validateRechargeAmount(0);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(RECHARGE_ERROR_CODES.INVALID_AMOUNT);
    });

    it("should reject non-finite amounts", () => {
      const result = validateRechargeAmount(NaN);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(RECHARGE_ERROR_CODES.INVALID_AMOUNT);
    });

    it("should reject amounts below minimum", () => {
      const result = validateRechargeAmount(500); // Below 1000 XAF minimum
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW);
      expect(result.errors[0].details?.minAmount).toBe(1000);
    });

    it("should reject amounts above maximum", () => {
      const result = validateRechargeAmount(2000000); // Above 1,000,000 XAF maximum
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(RECHARGE_ERROR_CODES.AMOUNT_TOO_HIGH);
      expect(result.errors[0].details?.maxAmount).toBe(1000000);
    });

    it("should use custom config limits", () => {
      const customConfig: RechargeConfig = {
        ...DEFAULT_RECHARGE_CONFIG,
        limits: {
          ...DEFAULT_RECHARGE_CONFIG.limits,
          minRechargeAmount: 2000,
          maxRechargeAmount: 500000,
        },
      };

      const result = validateRechargeAmount(1500, customConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW);
    });
  });

  describe("validateDailyLimit", () => {
    it("should allow amounts within daily limit", () => {
      const result = validateDailyLimit(10000, 100000); // 110k total, under 5M limit
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject amounts exceeding daily limit", () => {
      const result = validateDailyLimit(1000000, 4500000); // 5.5M total, over 5M limit
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        RECHARGE_ERROR_CODES.DAILY_LIMIT_EXCEEDED
      );
      expect(result.errors[0].details?.remainingLimit).toBe(500000);
    });

    it("should handle zero remaining limit", () => {
      const result = validateDailyLimit(1000, 5000000); // Already at limit
      expect(result.isValid).toBe(false);
      expect(result.errors[0].details?.remainingLimit).toBe(0);
    });
  });

  describe("validateHederaAccountId", () => {
    it("should validate correct Hedera account format", () => {
      const result = validateHederaAccountId("0.0.123456");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedAccountId).toBe("0.0.123456");
    });

    it("should validate different shard/realm combinations", () => {
      const result = validateHederaAccountId("1.2.123456");
      expect(result.isValid).toBe(true);
      expect(result.normalizedAccountId).toBe("1.2.123456");
    });

    it("should trim whitespace", () => {
      const result = validateHederaAccountId("  0.0.123456  ");
      expect(result.isValid).toBe(true);
      expect(result.normalizedAccountId).toBe("0.0.123456");
    });

    it("should reject empty account ID", () => {
      const result = validateHederaAccountId("");
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT
      );
    });

    it("should reject null/undefined account ID", () => {
      const result = validateHederaAccountId(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT
      );
    });

    it("should reject invalid format", () => {
      const result = validateHederaAccountId("invalid-account");
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT
      );
    });

    it("should reject zero account number", () => {
      const result = validateHederaAccountId("0.0.0");
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT
      );
    });

    it("should reject account numbers out of range", () => {
      const result = validateHederaAccountId("0.0.9999999999");
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT
      );
    });
  });

  describe("validateHBARRechargeRequest", () => {
    const validRequest: HBARRechargeRequest = {
      userId: "user123",
      xafAmount: 5000,
      userHederaAccountId: "0.0.123456",
      pin: "1234",
    };

    it("should validate complete valid request", () => {
      const result = validateHBARRechargeRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject missing userId", () => {
      const request = { ...validRequest, userId: "" };
      const result = validateHBARRechargeRequest(request);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === RECHARGE_ERROR_CODES.INVALID_USER)
      ).toBe(true);
    });

    it("should reject missing PIN", () => {
      const request = { ...validRequest, pin: "" };
      const result = validateHBARRechargeRequest(request);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === RECHARGE_ERROR_CODES.INVALID_PIN)
      ).toBe(true);
    });

    it("should reject invalid PIN format", () => {
      const request = { ...validRequest, pin: "12" }; // Too short
      const result = validateHBARRechargeRequest(request);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === RECHARGE_ERROR_CODES.INVALID_PIN)
      ).toBe(true);
    });

    it("should reject non-numeric PIN", () => {
      const request = { ...validRequest, pin: "abcd" };
      const result = validateHBARRechargeRequest(request);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === RECHARGE_ERROR_CODES.INVALID_PIN)
      ).toBe(true);
    });

    it("should reject missing amount", () => {
      const request = { ...validRequest };
      delete (request as any).xafAmount;
      const result = validateHBARRechargeRequest(request);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === RECHARGE_ERROR_CODES.INVALID_AMOUNT
        )
      ).toBe(true);
    });

    it("should reject missing Hedera account", () => {
      const request = { ...validRequest };
      delete (request as any).userHederaAccountId;
      const result = validateHBARRechargeRequest(request);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === RECHARGE_ERROR_CODES.INVALID_HEDERA_ACCOUNT
        )
      ).toBe(true);
    });

    it("should accumulate multiple validation errors", () => {
      const request = {
        userId: "",
        xafAmount: -100,
        userHederaAccountId: "invalid",
        pin: "12",
      };
      const result = validateHBARRechargeRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("Utility Functions", () => {
    describe("createValidationError", () => {
      it("should create error with all properties", () => {
        const error = createValidationError(
          RECHARGE_ERROR_CODES.INVALID_AMOUNT,
          "Test message",
          { test: "data" },
          true
        );

        expect(error.code).toBe(RECHARGE_ERROR_CODES.INVALID_AMOUNT);
        expect(error.message).toBe("Test message");
        expect(error.details).toEqual({ test: "data" });
        expect(error.retryable).toBe(true);
      });

      it("should default retryable to false", () => {
        const error = createValidationError(
          RECHARGE_ERROR_CODES.INVALID_AMOUNT,
          "Test message"
        );
        expect(error.retryable).toBe(false);
      });
    });

    describe("isRetryableError", () => {
      it("should identify retryable errors", () => {
        const error = createValidationError(
          RECHARGE_ERROR_CODES.INVALID_AMOUNT,
          "Test",
          undefined,
          true
        );
        expect(isRetryableError(error)).toBe(true);
      });

      it("should identify non-retryable errors", () => {
        const error = createValidationError(
          RECHARGE_ERROR_CODES.INVALID_AMOUNT,
          "Test",
          undefined,
          false
        );
        expect(isRetryableError(error)).toBe(false);
      });
    });

    describe("filterErrorsByCode", () => {
      it("should filter errors by code", () => {
        const errors = [
          createValidationError(
            RECHARGE_ERROR_CODES.INVALID_AMOUNT,
            "Amount error"
          ),
          createValidationError(RECHARGE_ERROR_CODES.INVALID_PIN, "PIN error"),
          createValidationError(
            RECHARGE_ERROR_CODES.INVALID_USER,
            "User error"
          ),
        ];

        const filtered = filterErrorsByCode(errors, [
          RECHARGE_ERROR_CODES.INVALID_AMOUNT,
          RECHARGE_ERROR_CODES.INVALID_PIN,
        ]);

        expect(filtered).toHaveLength(2);
        expect(filtered[0].code).toBe(RECHARGE_ERROR_CODES.INVALID_AMOUNT);
        expect(filtered[1].code).toBe(RECHARGE_ERROR_CODES.INVALID_PIN);
      });
    });

    describe("getFirstErrorByCode", () => {
      it("should find first error by code", () => {
        const errors = [
          createValidationError(
            RECHARGE_ERROR_CODES.INVALID_AMOUNT,
            "Amount error"
          ),
          createValidationError(RECHARGE_ERROR_CODES.INVALID_PIN, "PIN error"),
        ];

        const error = getFirstErrorByCode(
          errors,
          RECHARGE_ERROR_CODES.INVALID_PIN
        );
        expect(error?.message).toBe("PIN error");
      });

      it("should return undefined if not found", () => {
        const errors = [
          createValidationError(
            RECHARGE_ERROR_CODES.INVALID_AMOUNT,
            "Amount error"
          ),
        ];

        const error = getFirstErrorByCode(
          errors,
          RECHARGE_ERROR_CODES.INVALID_PIN
        );
        expect(error).toBeUndefined();
      });
    });

    describe("formatValidationErrors", () => {
      it("should return empty string for no errors", () => {
        const result = formatValidationErrors([]);
        expect(result).toBe("");
      });

      it("should return single error message", () => {
        const errors = [
          createValidationError(
            RECHARGE_ERROR_CODES.INVALID_AMOUNT,
            "Amount error"
          ),
        ];
        const result = formatValidationErrors(errors);
        expect(result).toBe("Amount error");
      });

      it("should format multiple errors", () => {
        const errors = [
          createValidationError(
            RECHARGE_ERROR_CODES.INVALID_AMOUNT,
            "Amount error"
          ),
          createValidationError(RECHARGE_ERROR_CODES.INVALID_PIN, "PIN error"),
        ];
        const result = formatValidationErrors(errors);
        expect(result).toBe(
          "Multiple validation errors: Amount error; PIN error"
        );
      });
    });
  });
});
