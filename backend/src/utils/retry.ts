/**
 * Exponential backoff utility with jitter for DynamoDB operations
 * Implements retry logic for transient errors with configurable parameters
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  jitterType: "none" | "full" | "equal" | "decorrelated";
  retryableErrors: string[];
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalDelay: number;
}

export class RetryError extends Error {
  public readonly attempts: number;
  public readonly lastError: Error;
  public readonly totalDelay: number;

  constructor(
    message: string,
    attempts: number,
    lastError: Error,
    totalDelay: number
  ) {
    super(message);
    this.name = "RetryError";
    this.attempts = attempts;
    this.lastError = lastError;
    this.totalDelay = totalDelay;
  }
}

export class ExponentialBackoff {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      baseDelay: config.baseDelay ?? 100,
      maxDelay: config.maxDelay ?? 5000,
      jitterType: config.jitterType ?? "full",
      retryableErrors: config.retryableErrors ?? [
        "ProvisionedThroughputExceededException",
        "ThrottlingException",
        "ServiceUnavailable",
        "InternalServerError",
        "RequestTimeout",
        "NetworkingError",
        "UnknownError",
      ],
    };
  }

  /**
   * Execute a function with exponential backoff retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<RetryResult<T>> {
    let lastError: Error;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        const result = await operation();

        if (attempt > 1) {
          console.log(
            `Operation ${
              operationName || "unknown"
            } succeeded on attempt ${attempt}`
          );
        }

        return {
          result,
          attempts: attempt,
          totalDelay,
        };
      } catch (error) {
        lastError = error as Error;

        // Log the error
        console.error(
          `Operation ${
            operationName || "unknown"
          } failed on attempt ${attempt}:`,
          {
            error: lastError.message,
            errorName: lastError.name,
            attempt,
            maxRetries: this.config.maxRetries,
          }
        );

        // Check if this is the last attempt
        if (attempt > this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          console.error(`Non-retryable error encountered: ${lastError.name}`);
          break;
        }

        // Calculate delay with jitter
        const delay = this.calculateDelay(attempt);
        totalDelay += delay;

        console.log(
          `Retrying operation ${
            operationName || "unknown"
          } in ${delay}ms (attempt ${attempt + 1}/${
            this.config.maxRetries + 1
          })`
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    throw new RetryError(
      `Operation ${operationName || "unknown"} failed after ${
        this.config.maxRetries + 1
      } attempts`,
      this.config.maxRetries + 1,
      lastError!,
      totalDelay
    );
  }

  /**
   * Check if an error is retryable based on configuration
   */
  private isRetryableError(error: Error): boolean {
    // Check by error name
    if (this.config.retryableErrors.includes(error.name)) {
      return true;
    }

    // Check by error message patterns
    const retryablePatterns = [
      /throttl/i,
      /timeout/i,
      /network/i,
      /connection/i,
      /service unavailable/i,
      /internal server error/i,
      /provisioned throughput exceeded/i,
    ];

    return retryablePatterns.some(
      (pattern) => pattern.test(error.message) || pattern.test(error.name)
    );
  }

  /**
   * Calculate delay with jitter
   */
  private calculateDelay(attempt: number): number {
    // Calculate base exponential delay
    const exponentialDelay = Math.min(
      this.config.baseDelay * Math.pow(2, attempt - 1),
      this.config.maxDelay
    );

    // Apply jitter based on type
    switch (this.config.jitterType) {
      case "none":
        return exponentialDelay;

      case "full":
        // Random delay between 0 and exponentialDelay
        return Math.random() * exponentialDelay;

      case "equal":
        // Random delay between exponentialDelay/2 and exponentialDelay
        return exponentialDelay / 2 + Math.random() * (exponentialDelay / 2);

      case "decorrelated":
        // Decorrelated jitter - more complex but better distribution
        const previousDelay =
          attempt > 1
            ? this.config.baseDelay * Math.pow(2, attempt - 2)
            : this.config.baseDelay;
        return Math.min(
          this.config.maxDelay,
          Math.random() * (exponentialDelay * 3 - previousDelay) + previousDelay
        );

      default:
        return exponentialDelay;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

/**
 * Default retry instance for DynamoDB operations
 */
export const defaultRetry = new ExponentialBackoff({
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 5000,
  jitterType: "full",
  retryableErrors: [
    "ProvisionedThroughputExceededException",
    "ThrottlingException",
    "ServiceUnavailable",
    "InternalServerError",
    "RequestTimeout",
    "NetworkingError",
    "UnknownError",
  ],
});

/**
 * Retry decorator for methods
 */
export function withRetry<T extends any[], R>(
  retryConfig?: Partial<RetryConfig>
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const method = descriptor.value!;
    const retry = new ExponentialBackoff(retryConfig);

    descriptor.value = async function (...args: T): Promise<R> {
      const result = await retry.execute(
        () => method.apply(this, args),
        `${target.constructor.name}.${propertyName}`
      );
      return result.result;
    };
  };
}
