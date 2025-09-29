/**
 * Unit tests for error classification system
 */

import {
  ErrorClassifier,
  ErrorCategory,
  ErrorSeverity,
} from "../error-classification";

describe("ErrorClassifier", () => {
  describe("classify", () => {
    it("should classify validation errors correctly", () => {
      const error = new Error("Invalid amount specified");
      (error as any).code = "INVALID_AMOUNT";

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.severity).toBe(ErrorSeverity.LOW);
      expect(result.code).toBe("INVALID_AMOUNT");
      expect(result.retryable).toBe(false);
      expect(result.requiresManualIntervention).toBe(false);
      expect(result.alertAdministrators).toBe(false);
      expect(result.originalError).toBe(error);
    });

    it("should classify payment errors correctly", () => {
      const error = new Error("Orange Money service unavailable");
      (error as any).code = "ORANGE_MONEY_SERVICE_UNAVAILABLE";

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.PAYMENT);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.retryable).toBe(true);
      expect(result.alertAdministrators).toBe(true);
    });

    it("should classify conversion errors correctly", () => {
      const error = new Error("Hedera network busy");
      (error as any).code = "HEDERA_NETWORK_BUSY";

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.CONVERSION);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(true);
      expect(result.requiresManualIntervention).toBe(false);
    });

    it("should classify system errors correctly", () => {
      const error = new Error("Database connection failed");
      (error as any).code = "DATABASE_CONNECTION_ERROR";

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.retryable).toBe(true);
      expect(result.alertAdministrators).toBe(true);
    });

    it("should handle unknown errors with default classification", () => {
      const error = new Error("Some unknown error");

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.code).toBe("UNKNOWN_ERROR");
      expect(result.retryable).toBe(true);
      expect(result.alertAdministrators).toBe(true);
    });

    it("should extract error codes from error messages", () => {
      const testCases = [
        {
          message: "Orange Money insufficient balance for transaction",
          expectedCode: "ORANGE_MONEY_INSUFFICIENT_BALANCE",
        },
        {
          message: "Invalid PIN provided",
          expectedCode: "ORANGE_MONEY_INVALID_PIN",
        },
        {
          message: "Orange Money timeout occurred",
          expectedCode: "ORANGE_MONEY_TIMEOUT",
        },
        {
          message: "Orange Money service unavailable at this time",
          expectedCode: "ORANGE_MONEY_SERVICE_UNAVAILABLE",
        },
        {
          message: "Hedera network busy, please retry",
          expectedCode: "HEDERA_NETWORK_BUSY",
        },
        {
          message: "Exchange rate data is stale",
          expectedCode: "EXCHANGE_RATE_STALE",
        },
        {
          message: "Exchange rate service unavailable",
          expectedCode: "EXCHANGE_RATE_UNAVAILABLE",
        },
      ];

      testCases.forEach(({ message, expectedCode }) => {
        const error = new Error(message);
        const result = ErrorClassifier.classify(error);
        expect(result.code).toBe(expectedCode);
      });
    });

    it("should include context in classified error", () => {
      const error = new Error("Test error");
      const context = { transactionId: "test-123", userId: "user-456" };

      const result = ErrorClassifier.classify(error, context);

      expect(result.context).toEqual(context);
    });

    it("should handle errors with existing code property", () => {
      const error = new Error("Custom error message");
      (error as any).code = "INVALID_AMOUNT"; // Use a known error code

      const result = ErrorClassifier.classify(error);

      expect(result.code).toBe("INVALID_AMOUNT");
    });
  });

  describe("shouldRetry", () => {
    it("should return true for retryable errors without manual intervention", () => {
      const classifiedError = {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        code: "NETWORK_TIMEOUT",
        message: "Network timeout",
        retryable: true,
        requiresManualIntervention: false,
        alertAdministrators: false,
      };

      expect(ErrorClassifier.shouldRetry(classifiedError)).toBe(true);
    });

    it("should return false for non-retryable errors", () => {
      const classifiedError = {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        code: "INVALID_AMOUNT",
        message: "Invalid amount",
        retryable: false,
        requiresManualIntervention: false,
        alertAdministrators: false,
      };

      expect(ErrorClassifier.shouldRetry(classifiedError)).toBe(false);
    });

    it("should return false for errors requiring manual intervention", () => {
      const classifiedError = {
        category: ErrorCategory.CONVERSION,
        severity: ErrorSeverity.CRITICAL,
        code: "HEDERA_INSUFFICIENT_BALANCE",
        message: "Insufficient balance",
        retryable: true,
        requiresManualIntervention: true,
        alertAdministrators: true,
      };

      expect(ErrorClassifier.shouldRetry(classifiedError)).toBe(false);
    });
  });

  describe("shouldAlert", () => {
    it("should return true for errors that require administrator alerts", () => {
      const classifiedError = {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
        code: "DATABASE_CONNECTION_ERROR",
        message: "Database connection failed",
        retryable: true,
        requiresManualIntervention: false,
        alertAdministrators: true,
      };

      expect(ErrorClassifier.shouldAlert(classifiedError)).toBe(true);
    });

    it("should return true for critical severity errors", () => {
      const classifiedError = {
        category: ErrorCategory.CONVERSION,
        severity: ErrorSeverity.CRITICAL,
        code: "HEDERA_INSUFFICIENT_BALANCE",
        message: "Insufficient balance",
        retryable: false,
        requiresManualIntervention: true,
        alertAdministrators: false,
      };

      expect(ErrorClassifier.shouldAlert(classifiedError)).toBe(true);
    });

    it("should return false for low severity errors without alert flag", () => {
      const classifiedError = {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        code: "INVALID_AMOUNT",
        message: "Invalid amount",
        retryable: false,
        requiresManualIntervention: false,
        alertAdministrators: false,
      };

      expect(ErrorClassifier.shouldAlert(classifiedError)).toBe(false);
    });
  });
});
