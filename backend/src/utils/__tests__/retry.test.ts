import { ExponentialBackoff, RetryError, defaultRetry } from "../retry";

describe("ExponentialBackoff", () => {
  let retry: ExponentialBackoff;

  beforeEach(() => {
    retry = new ExponentialBackoff({
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 1000,
      jitterType: "none", // Use 'none' for predictable testing
      retryableErrors: [
        "TestError",
        "RetryableError",
        "ProvisionedThroughputExceededException",
      ],
    });

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("execute", () => {
    it("should succeed on first attempt", async () => {
      // Arrange
      const mockOperation = jest.fn().mockResolvedValue("success");

      // Act
      const result = await retry.execute(mockOperation, "testOperation");

      // Assert
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(1);
      expect(result.totalDelay).toBe(0);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors and eventually succeed", async () => {
      // Arrange
      const testError1 = new Error("First attempt failed");
      testError1.name = "TestError";
      const testError2 = new Error("Second attempt failed");
      testError2.name = "TestError";

      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(testError1)
        .mockRejectedValueOnce(testError2)
        .mockResolvedValue("success");

      // Act
      const result = await retry.execute(mockOperation, "testOperation");

      // Assert
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(3);
      expect(result.totalDelay).toBeGreaterThan(0);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries with retryable error", async () => {
      // Arrange
      const testError = new Error("Persistent failure");
      testError.name = "TestError";
      const mockOperation = jest.fn().mockRejectedValue(testError);

      // Act & Assert
      await expect(
        retry.execute(mockOperation, "testOperation")
      ).rejects.toThrow(RetryError);
      expect(mockOperation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it("should not retry on non-retryable errors", async () => {
      // Arrange
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error("NonRetryableError"));

      // Act & Assert
      await expect(
        retry.execute(mockOperation, "testOperation")
      ).rejects.toThrow(RetryError);
      expect(mockOperation).toHaveBeenCalledTimes(1); // Only initial attempt
    });

    it("should handle DynamoDB specific errors", async () => {
      // Arrange
      const throttlingError = new Error("Throttling detected");
      throttlingError.name = "ThrottlingException";

      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(throttlingError)
        .mockResolvedValue("success");

      // Act
      const result = await retry.execute(mockOperation, "testOperation");

      // Assert
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(2);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it("should respect max delay configuration", async () => {
      // Arrange
      const shortMaxDelayRetry = new ExponentialBackoff({
        maxRetries: 5,
        baseDelay: 100,
        maxDelay: 200, // Low max delay
        jitterType: "none",
        retryableErrors: ["TestError"],
      });

      const testError1 = new Error("First failure");
      testError1.name = "TestError";
      const testError2 = new Error("Second failure");
      testError2.name = "TestError";
      const testError3 = new Error("Third failure");
      testError3.name = "TestError";

      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(testError1)
        .mockRejectedValueOnce(testError2)
        .mockRejectedValueOnce(testError3)
        .mockResolvedValue("success");

      // Act
      const result = await shortMaxDelayRetry.execute(
        mockOperation,
        "testOperation"
      );

      // Assert
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(4);
      // Total delay should not exceed maxDelay * attempts due to capping
      expect(result.totalDelay).toBeLessThanOrEqual(200 * 3);
    });
  });

  describe("jitter types", () => {
    it("should apply full jitter correctly", async () => {
      // Arrange
      const fullJitterRetry = new ExponentialBackoff({
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 1000,
        jitterType: "full",
        retryableErrors: ["TestError"],
      });

      const testError1 = new Error("First jitter failure");
      testError1.name = "TestError";
      const testError2 = new Error("Second jitter failure");
      testError2.name = "TestError";

      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(testError1)
        .mockRejectedValueOnce(testError2)
        .mockResolvedValue("success");

      // Act
      const result = await fullJitterRetry.execute(
        mockOperation,
        "testOperation"
      );

      // Assert
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(3);
      expect(result.totalDelay).toBeGreaterThan(0);
    });

    it("should apply equal jitter correctly", async () => {
      // Arrange
      const equalJitterRetry = new ExponentialBackoff({
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 1000,
        jitterType: "equal",
        retryableErrors: ["TestError"],
      });

      const testError1 = new Error("First equal jitter failure");
      testError1.name = "TestError";
      const testError2 = new Error("Second equal jitter failure");
      testError2.name = "TestError";

      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(testError1)
        .mockRejectedValueOnce(testError2)
        .mockResolvedValue("success");

      // Act
      const result = await equalJitterRetry.execute(
        mockOperation,
        "testOperation"
      );

      // Assert
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(3);
      expect(result.totalDelay).toBeGreaterThan(0);
    });
  });

  describe("error classification", () => {
    it("should identify retryable errors by name", async () => {
      // Arrange
      const retryableError = new Error("Some message");
      retryableError.name = "ProvisionedThroughputExceededException";

      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue("success");

      // Act
      const result = await retry.execute(mockOperation, "testOperation");

      // Assert
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(2);
    });

    it("should identify retryable errors by message patterns", async () => {
      // Arrange
      const networkError = new Error("Network connection failed");

      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue("success");

      // Act
      const result = await retry.execute(mockOperation, "testOperation");

      // Assert
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(2);
    });

    it("should not retry validation errors", async () => {
      // Arrange
      const validationError = new Error("Invalid input provided");

      const mockOperation = jest.fn().mockRejectedValue(validationError);

      // Act & Assert
      await expect(
        retry.execute(mockOperation, "testOperation")
      ).rejects.toThrow(RetryError);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe("configuration", () => {
    it("should use default configuration", () => {
      // Act
      const config = defaultRetry.getConfig();

      // Assert
      expect(config.maxRetries).toBe(3);
      expect(config.baseDelay).toBe(100);
      expect(config.maxDelay).toBe(5000);
      expect(config.jitterType).toBe("full");
      expect(config.retryableErrors).toContain(
        "ProvisionedThroughputExceededException"
      );
    });

    it("should allow configuration updates", () => {
      // Arrange
      const customRetry = new ExponentialBackoff();

      // Act
      customRetry.updateConfig({
        maxRetries: 5,
        baseDelay: 200,
      });

      const config = customRetry.getConfig();

      // Assert
      expect(config.maxRetries).toBe(5);
      expect(config.baseDelay).toBe(200);
      expect(config.maxDelay).toBe(5000); // Should keep original value
    });
  });

  describe("RetryError", () => {
    it("should create RetryError with correct properties", async () => {
      // Arrange
      const testError = new Error("TestError message");
      testError.name = "TestError";
      const mockOperation = jest.fn().mockRejectedValue(testError);

      // Act & Assert
      try {
        await retry.execute(mockOperation, "testOperation");
      } catch (error) {
        expect(error).toBeInstanceOf(RetryError);
        expect((error as RetryError).attempts).toBe(4);
        expect((error as RetryError).lastError.message).toBe(
          "TestError message"
        );
        expect((error as RetryError).totalDelay).toBeGreaterThan(0);
        expect((error as RetryError).message).toContain(
          "testOperation failed after 4 attempts"
        );
      }
    });
  });

  describe("logging", () => {
    it("should log retry attempts", async () => {
      // Arrange
      const testError = new Error("TestError message");
      testError.name = "TestError";
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(testError)
        .mockResolvedValue("success");

      // Act
      await retry.execute(mockOperation, "testOperation");

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        "Operation testOperation failed on attempt 1:",
        expect.objectContaining({
          error: "TestError message",
          errorName: "TestError",
          attempt: 1,
          maxRetries: 3,
        })
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Retrying operation testOperation")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Operation testOperation succeeded on attempt 2"
        )
      );
    });

    it("should log non-retryable errors", async () => {
      // Arrange
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error("NonRetryableError"));

      // Act & Assert
      try {
        await retry.execute(mockOperation, "testOperation");
      } catch (error) {
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("Non-retryable error encountered")
        );
      }
    });
  });
});
