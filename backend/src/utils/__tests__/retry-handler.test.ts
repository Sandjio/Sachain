/**
 * Unit tests for retry handler
 */

import { RetryHandler, withRetry } from "../retry-handler";
import { ErrorCategory } from "../error-classification";

// Mock the structured logger
jest.mock("../structured-logger", () => ({
  structuredLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("RetryHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock sleep to make tests faster
    jest
      .spyOn(RetryHandler as any, "sleep")
      .mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("executeWithRetry", () => {
    it("should return success on first attempt when operation succeeds", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "test_operation",
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(1);
      expect(result.shouldDeadLetter).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors and eventually succeed", async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error("Network timeout");
          (error as any).code = "NETWORK_TIMEOUT";
          throw error;
        }
        return Promise.resolve("success after retries");
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "test_operation",
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe("success after retries");
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it("should not retry non-retryable errors", async () => {
      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Invalid amount");
        (error as any).code = "INVALID_AMOUNT";
        throw error;
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "test_operation",
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.shouldDeadLetter).toBe(false);
      expect(result.error?.code).toBe("INVALID_AMOUNT");
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should exhaust retries and return failure for persistent retryable errors", async () => {
      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Persistent network error");
        (error as any).code = "NETWORK_TIMEOUT";
        throw error;
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "test_operation",
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBeGreaterThan(1);
      expect(result.shouldDeadLetter).toBe(true);
      expect(result.error?.code).toBe("NETWORK_TIMEOUT");
    });

    it("should use operation-specific configuration", async () => {
      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Orange Money timeout");
        (error as any).code = "ORANGE_MONEY_TIMEOUT";
        throw error;
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "orange_money_payment",
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(4); // 3 retries + 1 initial attempt for orange_money_payment
    });

    it("should handle errors requiring manual intervention", async () => {
      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Insufficient KYC verification");
        (error as any).code = "INSUFFICIENT_KYC";
        throw error;
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "test_operation",
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.shouldDeadLetter).toBe(true); // Manual intervention required
      expect(result.error?.requiresManualIntervention).toBe(true);
    });

    it("should calculate exponential backoff delays correctly", async () => {
      const delays: number[] = [];
      const originalSleep = (RetryHandler as any).sleep;

      (RetryHandler as any).sleep = jest
        .fn()
        .mockImplementation((ms: number) => {
          delays.push(ms);
          return Promise.resolve();
        });

      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Network timeout");
        (error as any).code = "NETWORK_TIMEOUT";
        throw error;
      });

      await RetryHandler.executeWithRetry(mockOperation, "test_operation", {
        transactionId: "test-123",
      });

      expect(delays.length).toBeGreaterThan(0);

      // Verify exponential backoff pattern
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThan(delays[i - 1]);
      }

      // Restore original sleep function
      (RetryHandler as any).sleep = originalSleep;
    });

    it("should respect maximum delay configuration", async () => {
      const delays: number[] = [];
      const originalSleep = (RetryHandler as any).sleep;

      (RetryHandler as any).sleep = jest
        .fn()
        .mockImplementation((ms: number) => {
          delays.push(ms);
          return Promise.resolve();
        });

      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Network timeout");
        (error as any).code = "NETWORK_TIMEOUT";
        throw error;
      });

      await RetryHandler.executeWithRetry(mockOperation, "test_operation", {
        transactionId: "test-123",
      });

      // No delay should exceed the maximum configured delay (30000ms for default config)
      delays.forEach((delay) => {
        expect(delay).toBeLessThanOrEqual(30000);
      });

      (RetryHandler as any).sleep = originalSleep;
    });

    it("should include jitter in delay calculations when enabled", async () => {
      const delays: number[] = [];
      const originalSleep = (RetryHandler as any).sleep;

      (RetryHandler as any).sleep = jest
        .fn()
        .mockImplementation((ms: number) => {
          delays.push(ms);
          return Promise.resolve();
        });

      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Network timeout");
        (error as any).code = "NETWORK_TIMEOUT";
        throw error;
      });

      // Run multiple times to check for jitter variation
      const allDelays: number[][] = [];
      for (let i = 0; i < 3; i++) {
        delays.length = 0; // Clear delays array
        await RetryHandler.executeWithRetry(mockOperation, "test_operation", {
          transactionId: `test-${i}`,
        });
        allDelays.push([...delays]);
      }

      // With jitter enabled, delays should vary between runs
      if (allDelays.length > 1 && allDelays[0].length > 0) {
        const hasVariation = allDelays.some((delaySet, index) => {
          if (index === 0) return false;
          return delaySet.some(
            (delay, delayIndex) =>
              Math.abs(delay - allDelays[0][delayIndex]) > 0
          );
        });
        expect(hasVariation).toBe(true);
      }

      (RetryHandler as any).sleep = originalSleep;
    });
  });

  describe("createContext", () => {
    it("should create retry context with provided parameters", () => {
      const context = RetryHandler.createContext(
        "test_operation",
        "test-transaction-123",
        "user-456"
      );

      expect(context.operation).toBe("test_operation");
      expect(context.transactionId).toBe("test-transaction-123");
      expect(context.userId).toBe("user-456");
      expect(context.startTime).toBeCloseTo(Date.now(), -2); // Within 100ms
    });

    it("should create context with optional parameters", () => {
      const context = RetryHandler.createContext("test_operation");

      expect(context.operation).toBe("test_operation");
      expect(context.transactionId).toBeUndefined();
      expect(context.userId).toBeUndefined();
      expect(context.startTime).toBeDefined();
    });
  });

  describe("withRetry decorator", () => {
    it("should be available as a static method", () => {
      expect(typeof RetryHandler.withRetry).toBe("function");
    });

    it("should be available as a standalone function", () => {
      expect(typeof withRetry).toBe("function");
    });
  });

  describe("error category filtering", () => {
    it("should not retry errors from non-retryable categories", async () => {
      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Validation error");
        (error as any).code = "INVALID_AMOUNT";
        throw error;
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "orange_money_payment", // This operation only retries NETWORK and PAYMENT categories
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should retry errors from retryable categories", async () => {
      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Orange Money timeout");
        (error as any).code = "ORANGE_MONEY_TIMEOUT";
        throw error;
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "orange_money_payment", // This operation retries PAYMENT category
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBeGreaterThan(1);
    });
  });
});
