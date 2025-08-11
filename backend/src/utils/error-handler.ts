/**
 * Error classification and handling utilities for AWS operations
 * Provides structured error handling with proper categorization for DynamoDB, S3, and other AWS services
 */

export enum ErrorCategory {
  TRANSIENT = "transient",
  PERMANENT = "permanent",
  VALIDATION = "validation",
  AUTHORIZATION = "authorization",
  RESOURCE_NOT_FOUND = "resource_not_found",
  RATE_LIMIT = "rate_limit",
  SYSTEM = "system",
}

export interface ErrorDetails {
  category: ErrorCategory;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  errorCode?: string;
  httpStatusCode?: number;
  context?: Record<string, any>;
}

export class AWSServiceError extends Error {
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly technicalMessage: string;
  public readonly errorCode?: string;
  public readonly httpStatusCode?: number;
  public readonly context?: Record<string, any>;
  public readonly originalError?: Error;

  constructor(details: ErrorDetails, originalError?: Error) {
    super(details.technicalMessage);
    this.name = "AWSServiceError";
    this.category = details.category;
    this.retryable = details.retryable;
    this.userMessage = details.userMessage;
    this.technicalMessage = details.technicalMessage;
    this.errorCode = details.errorCode;
    this.httpStatusCode = details.httpStatusCode;
    this.context = details.context;
    this.originalError = originalError;
  }
}

export class ErrorClassifier {
  /**
   * Classify an error and return structured error details
   */
  static classify(error: any, context?: Record<string, any>): ErrorDetails {
    // Check if it's an S3 error first
    if (this.isS3Error(error)) {
      return this.classifyS3Error(error, context);
    }
    
    // Default to DynamoDB error classification
    return this.classifyDynamoDBError(error, context);
  }

  /**
   * Check if error is from S3 service
   */
  private static isS3Error(error: any): boolean {
    const errorName = error.name || "";
    const errorCode = error.code || "";
    const serviceName = error.$metadata?.service || "";
    
    return serviceName === "S3" || 
           errorName.includes("S3") ||
           errorCode.includes("S3") ||
           ["NoSuchBucket", "NoSuchKey", "EntityTooLarge", "SlowDown"].includes(errorName);
  }

  /**
   * Classify S3-specific errors
   */
  private static classifyS3Error(error: any, context?: Record<string, any>): ErrorDetails {
    const errorName = error.name || "UnknownError";
    const errorMessage = error.message || "Unknown error occurred";
    const errorCode = error.code || error.$metadata?.errorCode;
    const httpStatusCode = error.$metadata?.httpStatusCode;

    switch (errorName) {
      case "NoSuchBucket":
        return {
          category: ErrorCategory.SYSTEM,
          retryable: false,
          userMessage: "Storage service configuration error. Please contact support.",
          technicalMessage: "S3 bucket does not exist",
          errorCode,
          httpStatusCode,
          context,
        };

      case "NoSuchKey":
        return {
          category: ErrorCategory.RESOURCE_NOT_FOUND,
          retryable: false,
          userMessage: "The requested file was not found.",
          technicalMessage: "S3 object does not exist",
          errorCode,
          httpStatusCode,
          context,
        };

      case "AccessDenied":
        return {
          category: ErrorCategory.AUTHORIZATION,
          retryable: false,
          userMessage: "You do not have permission to access this file.",
          technicalMessage: "S3 access denied",
          errorCode,
          httpStatusCode,
          context,
        };

      case "EntityTooLarge":
        return {
          category: ErrorCategory.VALIDATION,
          retryable: false,
          userMessage: "File is too large to upload.",
          technicalMessage: "S3 entity too large",
          errorCode,
          httpStatusCode,
          context,
        };

      case "SlowDown":
        return {
          category: ErrorCategory.RATE_LIMIT,
          retryable: true,
          userMessage: "Upload service is busy. Please try again in a moment.",
          technicalMessage: "S3 slow down error",
          errorCode,
          httpStatusCode,
          context,
        };

      case "ServiceUnavailable":
      case "InternalError":
        return {
          category: ErrorCategory.SYSTEM,
          retryable: true,
          userMessage: "Upload service is temporarily unavailable. Please try again.",
          technicalMessage: "S3 service unavailable",
          errorCode,
          httpStatusCode,
          context,
        };

      case "RequestTimeout":
        return {
          category: ErrorCategory.TRANSIENT,
          retryable: true,
          userMessage: "Upload timed out. Please try again.",
          technicalMessage: "S3 request timeout",
          errorCode,
          httpStatusCode,
          context,
        };

      default:
        return this.classifyGenericError(error, context, "S3");
    }
  }

  /**
   * Classify DynamoDB-specific errors
   */
  private static classifyDynamoDBError(error: any, context?: Record<string, any>): ErrorDetails {
    const errorName = error.name || "UnknownError";
    const errorMessage = error.message || "Unknown error occurred";
    const errorCode = error.code || error.$metadata?.errorCode;
    const httpStatusCode = error.$metadata?.httpStatusCode;

    // DynamoDB specific errors
    switch (errorName) {
      case "ProvisionedThroughputExceededException":
        return {
          category: ErrorCategory.RATE_LIMIT,
          retryable: true,
          userMessage:
            "Service is temporarily busy. Please try again in a moment.",
          technicalMessage: "DynamoDB provisioned throughput exceeded",
          errorCode,
          httpStatusCode,
          context,
        };

      case "ThrottlingException":
        return {
          category: ErrorCategory.RATE_LIMIT,
          retryable: true,
          userMessage: "Too many requests. Please try again in a moment.",
          technicalMessage: "DynamoDB throttling exception",
          errorCode,
          httpStatusCode,
          context,
        };

      case "ResourceNotFoundException":
        return {
          category: ErrorCategory.RESOURCE_NOT_FOUND,
          retryable: false,
          userMessage: "The requested resource was not found.",
          technicalMessage: "DynamoDB resource not found",
          errorCode,
          httpStatusCode,
          context,
        };

      case "ConditionalCheckFailedException":
        return {
          category: ErrorCategory.VALIDATION,
          retryable: false,
          userMessage:
            "The operation could not be completed due to a conflict.",
          technicalMessage: "DynamoDB conditional check failed",
          errorCode,
          httpStatusCode,
          context,
        };

      case "ValidationException":
        return {
          category: ErrorCategory.VALIDATION,
          retryable: false,
          userMessage:
            "Invalid input provided. Please check your data and try again.",
          technicalMessage: `DynamoDB validation error: ${errorMessage}`,
          errorCode,
          httpStatusCode,
          context,
        };

      case "AccessDeniedException":
      case "UnauthorizedException":
        return {
          category: ErrorCategory.AUTHORIZATION,
          retryable: false,
          userMessage: "You do not have permission to perform this operation.",
          technicalMessage: "DynamoDB access denied",
          errorCode,
          httpStatusCode,
          context,
        };

      case "ServiceUnavailable":
      case "InternalServerError":
        return {
          category: ErrorCategory.SYSTEM,
          retryable: true,
          userMessage:
            "Service is temporarily unavailable. Please try again later.",
          technicalMessage: "DynamoDB service unavailable",
          errorCode,
          httpStatusCode,
          context,
        };

      case "RequestTimeout":
      case "TimeoutError":
        return {
          category: ErrorCategory.TRANSIENT,
          retryable: true,
          userMessage: "Request timed out. Please try again.",
          technicalMessage: "DynamoDB request timeout",
          errorCode,
          httpStatusCode,
          context,
        };

      case "NetworkingError":
      case "ConnectionError":
        return {
          category: ErrorCategory.TRANSIENT,
          retryable: true,
          userMessage:
            "Network connection error. Please check your connection and try again.",
          technicalMessage: "DynamoDB networking error",
          errorCode,
          httpStatusCode,
          context,
        };

      default:
        // Check HTTP status codes for additional classification
        if (httpStatusCode) {
          if (httpStatusCode >= 500) {
            return {
              category: ErrorCategory.SYSTEM,
              retryable: true,
              userMessage:
                "Service is temporarily unavailable. Please try again later.",
              technicalMessage: `DynamoDB server error: ${errorMessage}`,
              errorCode,
              httpStatusCode,
              context,
            };
          } else if (httpStatusCode === 429) {
            return {
              category: ErrorCategory.RATE_LIMIT,
              retryable: true,
              userMessage: "Too many requests. Please try again in a moment.",
              technicalMessage: "DynamoDB rate limit exceeded",
              errorCode,
              httpStatusCode,
              context,
            };
          } else if (httpStatusCode >= 400 && httpStatusCode < 500) {
            return {
              category: ErrorCategory.VALIDATION,
              retryable: false,
              userMessage:
                "Invalid request. Please check your input and try again.",
              technicalMessage: `DynamoDB client error: ${errorMessage}`,
              errorCode,
              httpStatusCode,
              context,
            };
          }
        }

        return this.classifyGenericError(error, context, "DynamoDB");
    }
  }

  /**
   * Classify generic AWS errors based on HTTP status codes
   */
  private static classifyGenericError(error: any, context?: Record<string, any>, service: string = "AWS"): ErrorDetails {
    const errorMessage = error.message || "Unknown error occurred";
    const errorCode = error.code || error.$metadata?.errorCode;
    const httpStatusCode = error.$metadata?.httpStatusCode;

    if (httpStatusCode) {
      if (httpStatusCode >= 500) {
        return {
          category: ErrorCategory.SYSTEM,
          retryable: true,
          userMessage: "Service is temporarily unavailable. Please try again later.",
          technicalMessage: `${service} server error: ${errorMessage}`,
          errorCode,
          httpStatusCode,
          context,
        };
      } else if (httpStatusCode === 429) {
        return {
          category: ErrorCategory.RATE_LIMIT,
          retryable: true,
          userMessage: "Too many requests. Please try again in a moment.",
          technicalMessage: `${service} rate limit exceeded`,
          errorCode,
          httpStatusCode,
          context,
        };
      } else if (httpStatusCode >= 400 && httpStatusCode < 500) {
        return {
          category: ErrorCategory.VALIDATION,
          retryable: false,
          userMessage: "Invalid request. Please check your input and try again.",
          technicalMessage: `${service} client error: ${errorMessage}`,
          errorCode,
          httpStatusCode,
          context,
        };
      }
    }

    // Default classification for unknown errors
    return {
      category: ErrorCategory.SYSTEM,
      retryable: false,
      userMessage: "An unexpected error occurred. Please try again or contact support.",
      technicalMessage: `Unknown ${service} error: ${errorMessage}`,
      errorCode,
      httpStatusCode,
      context,
    };
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: any): boolean {
    const details = this.classify(error);
    return details.retryable;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: any): string {
    const details = this.classify(error);
    return details.userMessage;
  }

  /**
   * Get technical error message for logging
   */
  static getTechnicalMessage(error: any): string {
    const details = this.classify(error);
    return details.technicalMessage;
  }
}

/**
 * Enhanced logger for DynamoDB operations
 */
export class DynamoDBLogger {
  private static formatLogEntry(
    level: "info" | "warn" | "error",
    operation: string,
    message: string,
    context?: Record<string, any>
  ): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: "DynamoDB",
      operation,
      message,
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  static logOperation(
    operation: string,
    tableName: string,
    key?: Record<string, any>,
    duration?: number
  ): void {
    const logEntry = this.formatLogEntry(
      "info",
      operation,
      "DynamoDB operation completed",
      {
        tableName,
        key,
        duration: duration ? `${duration}ms` : undefined,
      }
    );
    console.log(logEntry);
  }

  static logError(
    operation: string,
    error: any,
    tableName?: string,
    key?: Record<string, any>,
    context?: Record<string, any>
  ): void {
    const errorDetails = ErrorClassifier.classify(error, context);
    const logEntry = this.formatLogEntry(
      "error",
      operation,
      "DynamoDB operation failed",
      {
        tableName,
        key,
        errorCategory: errorDetails.category,
        errorCode: errorDetails.errorCode,
        httpStatusCode: errorDetails.httpStatusCode,
        retryable: errorDetails.retryable,
        technicalMessage: errorDetails.technicalMessage,
        originalError: error.message,
        context: errorDetails.context,
      }
    );
    console.error(logEntry);
  }

  static logRetry(
    operation: string,
    attempt: number,
    maxRetries: number,
    delay: number,
    error: any
  ): void {
    const logEntry = this.formatLogEntry(
      "warn",
      operation,
      "DynamoDB operation retry",
      {
        attempt,
        maxRetries,
        delay: `${delay}ms`,
        error: error.message,
        errorName: error.name,
      }
    );
    console.warn(logEntry);
  }

  static logSuccess(
    operation: string,
    tableName: string,
    attempts: number,
    totalDuration: number
  ): void {
    const logEntry = this.formatLogEntry(
      "info",
      operation,
      "DynamoDB operation succeeded after retries",
      {
        tableName,
        attempts,
        totalDuration: `${totalDuration}ms`,
      }
    );
    console.log(logEntry);
  }
}

/**
 * Error handler decorator for repository methods
 */
export function handleDynamoDBErrors(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (this: any, ...args: any[]) {
    const startTime = Date.now();
    const operation = `${target.constructor.name}.${propertyName}`;

    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - startTime;

      DynamoDBLogger.logOperation(
        operation,
        this.tableName || "unknown",
        args[0], // Assume first arg might be a key
        duration
      );

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      DynamoDBLogger.logError(
        operation,
        error,
        this.tableName || "unknown",
        args[0], // Assume first arg might be a key
        { duration: `${duration}ms`, args: args.slice(1) }
      );

      // Re-throw as classified error
      const errorDetails = ErrorClassifier.classify(error, {
        operation,
        tableName: this.tableName,
        duration: `${duration}ms`,
      });

      throw new AWSServiceError(errorDetails, error);
    }
  };

  return descriptor;
}
