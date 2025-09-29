/**
 * Exponential backoff retry handler for HBAR recharge operations
 * Implements configurable retry strategies based on error classification
 */

import {
  ErrorClassifier,
  ClassifiedError,
  ErrorCategory,
} from "./error-classification";
import { structuredLogger } from "./structured-logger";

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryableCategories: ErrorCategory[];
}

export interface RetryContext {
  operation: string;
  transactionId?: string;
  userId?: string;
  attempt: number;
  totalAttempts: number;
  lastError?: ClassifiedError;
  startTime: number;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: ClassifiedError;
  attempts: number;
  totalDuration: number;
  shouldDeadLetter: boolean;
}

export class RetryHandler {
  static withRetry: typeof withRetry;
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableCategories: [
      ErrorCategory.NETWORK,
      ErrorCategory.SYSTEM,
      ErrorCategory.CONVERSION,
      ErrorCategory.PAYMENT,
    ],
  };

  private static readonly OPERATION_CONFIGS: Record<
    string,
    Partial<RetryConfig>
  > = {
    orange_money_payment: {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 10000,
      retryableCategories: [ErrorCategory.NETWORK, ErrorCategory.PAYMENT],
    },
    hedera_transfer: {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      retryableCategories: [ErrorCategory.NETWORK, ErrorCategory.CONVERSION],
    },
    exchange_rate_fetch: {
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 5000,
      retryableCategories: [ErrorCategory.NETWORK, ErrorCategory.CONVERSION],
    },
    database_operation: {
      maxRetries: 4,
      baseDelay: 1000,
      maxDelay: 15000,
      retryableCategories: [ErrorCategory.SYSTEM, ErrorCategory.NETWORK],
    },
  };

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationType: string,
    context: Partial<RetryContext> = {}
  ): Promise<RetryResult<T>> {
    const config = this.getConfigForOperation(operationType);
    const retryContext: RetryContext = {
      operation: operationType,
      attempt: 0,
      totalAttempts: config.maxRetries + 1,
      startTime: Date.now(),
      ...context,
    };

    let lastError: ClassifiedError | undefined;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      retryContext.attempt = attempt + 1;

      try {
        structuredLogger.info("Executing operation", {
          operation: operationType,
          attempt: retryContext.attempt,
          totalAttempts: retryContext.totalAttempts,
          transactionId: retryContext.transactionId,
        });

        const result = await operation();

        const duration = Date.now() - retryContext.startTime;

        structuredLogger.info("Operation succeeded", {
          operation: operationType,
          attempts: retryContext.attempt,
          duration,
          transactionId: retryContext.transactionId,
        });

        return {
          success: true,
          result,
          attempts: retryContext.attempt,
          totalDuration: duration,
          shouldDeadLetter: false,
        };
      } catch (error) {
        const classifiedError = ErrorClassifier.classify(error as Error, {
          operation: operationType,
          attempt: retryContext.attempt,
        });

        lastError = classifiedError;
        retryContext.lastError = classifiedError;

        structuredLogger.warn("Operation failed", {
          operation: operationType,
          attempt: retryContext.attempt,
          errorCode: classifiedError.code,
          errorCategory: classifiedError.category,
          errorMessage: classifiedError.message,
          retryable: classifiedError.retryable,
          transactionId: retryContext.transactionId,
        });

        // Check if error is retryable
        if (!this.shouldRetryError(classifiedError, config)) {
          structuredLogger.error("Operation failed with non-retryable error", {
            operation: operationType,
            errorCode: classifiedError.code,
            transactionId: retryContext.transactionId,
          });

          return {
            success: false,
            error: classifiedError,
            attempts: retryContext.attempt,
            totalDuration: Date.now() - retryContext.startTime,
            shouldDeadLetter: classifiedError.requiresManualIntervention,
          };
        }

        // Check if we've exhausted retries
        if (attempt >= config.maxRetries) {
          structuredLogger.error(
            "Operation failed after all retries exhausted",
            {
              operation: operationType,
              totalAttempts: retryContext.attempt,
              finalError: classifiedError.code,
              transactionId: retryContext.transactionId,
            }
          );

          return {
            success: false,
            error: classifiedError,
            attempts: retryContext.attempt,
            totalDuration: Date.now() - retryContext.startTime,
            shouldDeadLetter: true,
          };
        }

        // Calculate delay for next retry
        const delay = this.calculateDelay(attempt, config);

        structuredLogger.info("Retrying operation after delay", {
          operation: operationType,
          attempt: retryContext.attempt,
          nextAttempt: retryContext.attempt + 1,
          delay,
          transactionId: retryContext.transactionId,
        });

        await this.sleep(delay);
      }
    }

    // This should never be reached, but included for completeness
    return {
      success: false,
      error: lastError,
      attempts: config.maxRetries + 1,
      totalDuration: Date.now() - retryContext.startTime,
      shouldDeadLetter: true,
    };
  }

  private static getConfigForOperation(operationType: string): RetryConfig {
    const operationConfig = this.OPERATION_CONFIGS[operationType] || {};
    return { ...this.DEFAULT_CONFIG, ...operationConfig };
  }

  private static shouldRetryError(
    error: ClassifiedError,
    config: RetryConfig
  ): boolean {
    return (
      error.retryable &&
      !error.requiresManualIntervention &&
      config.retryableCategories.includes(error.category)
    );
  }

  private static calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay =
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

    if (config.jitterEnabled) {
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * cappedDelay;
      return Math.floor(cappedDelay + jitter);
    }

    return cappedDelay;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Utility method for creating retry contexts
  static createContext(
    operation: string,
    transactionId?: string,
    userId?: string
  ): Partial<RetryContext> {
    return {
      operation,
      transactionId,
      userId,
      startTime: Date.now(),
    };
  }
}

// Decorator for automatic retry functionality
export function withRetry(
  operationType: string,
  config?: Partial<RetryConfig>
) {
  return function <T extends any[], R>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: T): Promise<R> {
      const context = RetryHandler.createContext(
        `${target.constructor.name}.${propertyName}`,
        // Try to extract transactionId from args if available
        args.find((arg) => typeof arg === "object" && arg?.transactionId)
          ?.transactionId
      );

      const result = await RetryHandler.executeWithRetry(
        () => method.apply(this, args),
        operationType,
        context
      );

      if (!result.success) {
        throw (
          result.error?.originalError ||
          new Error(`Operation failed: ${result.error?.message}`)
        );
      }

      return result.result!;
    };

    return descriptor;
  };
}
// Add the decorator as a static method to RetryHandler for easier access
(RetryHandler as any).withRetry = withRetry;
