/**
 * Enhanced error handling system for comprehensive error classification,
 * recovery mechanisms, and user-friendly error messages
 */

import { createProjectLogger } from './structured-logger';
import { ExponentialBackoff } from './retry';

const logger = createProjectLogger();

// Enhanced error categories for project operations
export enum ProjectErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  SYSTEM = 'system',
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  CONFLICT = 'conflict',
  TIMEOUT = 'timeout'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Recovery strategies
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  ROLLBACK = 'rollback',
  MANUAL_INTERVENTION = 'manual_intervention',
  NONE = 'none'
}

export interface ErrorContext {
  operation: string;
  requestId?: string;
  userId?: string;
  projectId?: string;
  timestamp: string;
  environment: string;
  service: string;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  category: ProjectErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  recoveryStrategy: RecoveryStrategy;
  userMessage: string;
  technicalMessage: string;
  errorCode: string;
  httpStatusCode: number;
  context: ErrorContext;
  suggestedActions?: string[];
  rollbackRequired?: boolean;
}

export class ProjectError extends Error {
  public readonly category: ProjectErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly userMessage: string;
  public readonly technicalMessage: string;
  public readonly errorCode: string;
  public readonly httpStatusCode: number;
  public readonly context: ErrorContext;
  public readonly suggestedActions?: string[];
  public readonly rollbackRequired?: boolean;
  public readonly originalError?: Error;

  constructor(details: ErrorDetails, originalError?: Error) {
    super(details.technicalMessage);
    this.name = 'ProjectError';
    this.category = details.category;
    this.severity = details.severity;
    this.retryable = details.retryable;
    this.recoveryStrategy = details.recoveryStrategy;
    this.userMessage = details.userMessage;
    this.technicalMessage = details.technicalMessage;
    this.errorCode = details.errorCode;
    this.httpStatusCode = details.httpStatusCode;
    this.context = details.context;
    this.suggestedActions = details.suggestedActions;
    this.rollbackRequired = details.rollbackRequired;
    this.originalError = originalError;
  }
}

export class ProjectErrorClassifier {
  /**
   * Classify any error into a structured ProjectError
   */
  static classify(error: any, context: Partial<ErrorContext>): ProjectError {
    const fullContext: ErrorContext = {
      operation: context.operation || 'unknown',
      requestId: context.requestId,
      userId: context.userId,
      projectId: context.projectId,
      timestamp: new Date().toISOString(),
      environment: process.env.ENVIRONMENT || 'development',
      service: 'ProjectService',
      metadata: context.metadata
    };

    // Check if it's already a ProjectError
    if (error instanceof ProjectError) {
      return error;
    }

    // Classify based on error type and properties
    if (this.isValidationError(error)) {
      return this.createValidationError(error, fullContext);
    }

    if (this.isAuthenticationError(error)) {
      return this.createAuthenticationError(error, fullContext);
    }

    if (this.isAuthorizationError(error)) {
      return this.createAuthorizationError(error, fullContext);
    }

    if (this.isBusinessLogicError(error)) {
      return this.createBusinessLogicError(error, fullContext);
    }

    if (this.isHederaError(error)) {
      return this.createHederaError(error, fullContext);
    }

    if (this.isIPFSError(error)) {
      return this.createIPFSError(error, fullContext);
    }

    if (this.isDynamoDBError(error)) {
      return this.createDynamoDBError(error, fullContext);
    }

    if (this.isS3Error(error)) {
      return this.createS3Error(error, fullContext);
    }

    if (this.isNetworkError(error)) {
      return this.createNetworkError(error, fullContext);
    }

    if (this.isTimeoutError(error)) {
      return this.createTimeoutError(error, fullContext);
    }

    // Default to system error
    return this.createSystemError(error, fullContext);
  }

  private static isValidationError(error: any): boolean {
    const validationPatterns = [
      /validation/i,
      /invalid.*input/i,
      /required.*field/i,
      /invalid.*format/i,
      /out of range/i
    ];
    
    return validationPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.name) ||
      error.name === 'ValidationException'
    );
  }

  private static isAuthenticationError(error: any): boolean {
    const authPatterns = [
      /authentication/i,
      /unauthorized/i,
      /invalid.*token/i,
      /token.*expired/i,
      /missing.*token/i
    ];
    
    return authPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.name)
    ) || error.name === 'UnauthorizedException';
  }

  private static isAuthorizationError(error: any): boolean {
    const authzPatterns = [
      /authorization/i,
      /forbidden/i,
      /access.*denied/i,
      /insufficient.*permission/i,
      /not.*allowed/i
    ];
    
    return authzPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.name)
    ) || error.name === 'AccessDeniedException';
  }

  private static isBusinessLogicError(error: any): boolean {
    const businessPatterns = [
      /kyc.*not.*verified/i,
      /project.*already.*exists/i,
      /invalid.*project.*status/i,
      /insufficient.*balance/i,
      /duplicate/i,
      /conflict/i
    ];
    
    return businessPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.name)
    );
  }

  private static isHederaError(error: any): boolean {
    const hederaPatterns = [
      /hedera/i,
      /hts/i,
      /token.*service/i,
      /nft.*mint/i,
      /gas.*fee/i,
      /wallet.*connection/i
    ];
    
    return hederaPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.name)
    );
  }

  private static isIPFSError(error: any): boolean {
    const ipfsPatterns = [
      /ipfs/i,
      /metadata.*storage/i,
      /pin.*failed/i,
      /upload.*failed/i
    ];
    
    return ipfsPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.name)
    );
  }

  private static isDynamoDBError(error: any): boolean {
    const dynamoPatterns = [
      'ProvisionedThroughputExceededException',
      'ThrottlingException',
      'ResourceNotFoundException',
      'ConditionalCheckFailedException',
      'ValidationException'
    ];
    
    return dynamoPatterns.includes(error.name) || 
           error.message?.includes('DynamoDB');
  }

  private static isS3Error(error: any): boolean {
    const s3Patterns = [
      'NoSuchBucket',
      'NoSuchKey',
      'AccessDenied',
      'EntityTooLarge',
      'SlowDown'
    ];
    
    return s3Patterns.includes(error.name) || 
           error.message?.includes('S3');
  }

  private static isNetworkError(error: any): boolean {
    const networkPatterns = [
      /network/i,
      /connection/i,
      /timeout/i,
      /econnreset/i,
      /enotfound/i
    ];
    
    return networkPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.name)
    );
  }

  private static isTimeoutError(error: any): boolean {
    const timeoutPatterns = [
      /timeout/i,
      /timed.*out/i,
      'RequestTimeout',
      'TimeoutError'
    ];
    
    return timeoutPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.name)
    );
  }

  private static createValidationError(error: any, context: ErrorContext): ProjectError {
    return new ProjectError({
      category: ProjectErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      retryable: false,
      recoveryStrategy: RecoveryStrategy.NONE,
      userMessage: 'Please check your input and try again.',
      technicalMessage: `Validation error: ${error.message}`,
      errorCode: 'VALIDATION_ERROR',
      httpStatusCode: 400,
      context,
      suggestedActions: [
        'Verify all required fields are provided',
        'Check field formats and constraints',
        'Review API documentation for valid values'
      ]
    }, error);
  }

  private static createAuthenticationError(error: any, context: ErrorContext): ProjectError {
    return new ProjectError({
      category: ProjectErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoveryStrategy: RecoveryStrategy.NONE,
      userMessage: 'Please log in again to continue.',
      technicalMessage: `Authentication error: ${error.message}`,
      errorCode: 'AUTHENTICATION_ERROR',
      httpStatusCode: 401,
      context,
      suggestedActions: [
        'Refresh your authentication token',
        'Log in again',
        'Check token expiration'
      ]
    }, error);
  }

  private static createAuthorizationError(error: any, context: ErrorContext): ProjectError {
    return new ProjectError({
      category: ProjectErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoveryStrategy: RecoveryStrategy.NONE,
      userMessage: 'You do not have permission to perform this action.',
      technicalMessage: `Authorization error: ${error.message}`,
      errorCode: 'AUTHORIZATION_ERROR',
      httpStatusCode: 403,
      context,
      suggestedActions: [
        'Complete KYC verification if required',
        'Contact support for permission issues',
        'Verify project ownership'
      ]
    }, error);
  }

  private static createBusinessLogicError(error: any, context: ErrorContext): ProjectError {
    return new ProjectError({
      category: ProjectErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoveryStrategy: RecoveryStrategy.NONE,
      userMessage: 'This operation cannot be completed due to business rules.',
      technicalMessage: `Business logic error: ${error.message}`,
      errorCode: 'BUSINESS_LOGIC_ERROR',
      httpStatusCode: 422,
      context,
      suggestedActions: [
        'Check project status and requirements',
        'Verify KYC completion',
        'Review operation prerequisites'
      ]
    }, error);
  }

  private static createHederaError(error: any, context: ErrorContext): ProjectError {
    return new ProjectError({
      category: ProjectErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'Blockchain service is temporarily unavailable. Please try again.',
      technicalMessage: `Hedera service error: ${error.message}`,
      errorCode: 'HEDERA_SERVICE_ERROR',
      httpStatusCode: 503,
      context,
      suggestedActions: [
        'Check wallet balance for gas fees',
        'Verify wallet connection',
        'Try again in a few minutes'
      ]
    }, error);
  }

  private static createIPFSError(error: any, context: ErrorContext): ProjectError {
    return new ProjectError({
      category: ProjectErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'Metadata storage service is temporarily unavailable.',
      technicalMessage: `IPFS service error: ${error.message}`,
      errorCode: 'IPFS_SERVICE_ERROR',
      httpStatusCode: 503,
      context,
      suggestedActions: [
        'Try again in a few minutes',
        'Check network connectivity',
        'Contact support if issue persists'
      ]
    }, error);
  }

  private static createDynamoDBError(error: any, context: ErrorContext): ProjectError {
    const isThrottling = error.name === 'ProvisionedThroughputExceededException' || 
                        error.name === 'ThrottlingException';
    
    return new ProjectError({
      category: isThrottling ? ProjectErrorCategory.RATE_LIMIT : ProjectErrorCategory.SYSTEM,
      severity: isThrottling ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH,
      retryable: true,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: isThrottling ? 
        'Service is busy. Please try again in a moment.' :
        'Database service is temporarily unavailable.',
      technicalMessage: `DynamoDB error: ${error.message}`,
      errorCode: 'DATABASE_ERROR',
      httpStatusCode: isThrottling ? 429 : 503,
      context,
      suggestedActions: [
        'Wait a moment and try again',
        'Check service status',
        'Contact support if issue persists'
      ]
    }, error);
  }

  private static createS3Error(error: any, context: ErrorContext): ProjectError {
    return new ProjectError({
      category: ProjectErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'File storage service is temporarily unavailable.',
      technicalMessage: `S3 error: ${error.message}`,
      errorCode: 'STORAGE_ERROR',
      httpStatusCode: 503,
      context,
      suggestedActions: [
        'Try uploading again',
        'Check file size and format',
        'Contact support if issue persists'
      ]
    }, error);
  }

  private static createNetworkError(error: any, context: ErrorContext): ProjectError {
    return new ProjectError({
      category: ProjectErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'Network connection error. Please check your connection and try again.',
      technicalMessage: `Network error: ${error.message}`,
      errorCode: 'NETWORK_ERROR',
      httpStatusCode: 503,
      context,
      suggestedActions: [
        'Check internet connection',
        'Try again in a few minutes',
        'Contact support if issue persists'
      ]
    }, error);
  }

  private static createTimeoutError(error: any, context: ErrorContext): ProjectError {
    return new ProjectError({
      category: ProjectErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'Request timed out. Please try again.',
      technicalMessage: `Timeout error: ${error.message}`,
      errorCode: 'TIMEOUT_ERROR',
      httpStatusCode: 504,
      context,
      suggestedActions: [
        'Try again with a smaller request',
        'Check network connectivity',
        'Contact support if issue persists'
      ]
    }, error);
  }

  private static createSystemError(error: any, context: ErrorContext): ProjectError {
    return new ProjectError({
      category: ProjectErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      recoveryStrategy: RecoveryStrategy.MANUAL_INTERVENTION,
      userMessage: 'An unexpected error occurred. Please contact support.',
      technicalMessage: `System error: ${error.message}`,
      errorCode: 'SYSTEM_ERROR',
      httpStatusCode: 500,
      context,
      suggestedActions: [
        'Contact technical support',
        'Provide request ID for investigation',
        'Try again later'
      ]
    }, error);
  }
}

export class ErrorRecoveryManager {
  private static retry = new ExponentialBackoff({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    jitterType: 'full'
  });

  /**
   * Execute operation with automatic error recovery
   */
  static async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const projectError = ProjectErrorClassifier.classify(error, context);
      
      logger.error('Operation failed, attempting recovery', {
        operation: context.operation || 'unknown',
        errorCategory: projectError.category,
        recoveryStrategy: projectError.recoveryStrategy,
        retryable: projectError.retryable
      }, projectError);

      return await this.handleRecovery(
        projectError,
        operation,
        fallbackOperation
      );
    }
  }

  private static async handleRecovery<T>(
    error: ProjectError,
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    switch (error.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        if (error.retryable) {
          try {
            const result = await this.retry.execute(operation, error.context.operation);
            logger.info('Operation recovered after retry', {
              operation: error.context.operation,
              attempts: result.attempts
            });
            return result.result;
          } catch (retryError) {
            logger.error('Retry recovery failed', {
              operation: error.context.operation
            }, retryError as Error);
            throw error;
          }
        }
        throw error;

      case RecoveryStrategy.FALLBACK:
        if (fallbackOperation) {
          try {
            const result = await fallbackOperation();
            logger.info('Operation recovered using fallback', {
              operation: error.context.operation
            });
            return result;
          } catch (fallbackError) {
            logger.error('Fallback recovery failed', {
              operation: error.context.operation
            }, fallbackError as Error);
            throw error;
          }
        }
        throw error;

      case RecoveryStrategy.ROLLBACK:
        // Rollback logic would be implemented here
        logger.warn('Rollback recovery not implemented', {
          operation: error.context.operation
        });
        throw error;

      default:
        throw error;
    }
  }
}

/**
 * Error handler decorator for automatic error classification and recovery
 */
export function withErrorHandling(
  operation?: string,
  fallbackOperation?: () => Promise<any>
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const context: Partial<ErrorContext> = {
        operation: operationName,
        service: target.constructor.name
      };

      return await ErrorRecoveryManager.executeWithRecovery(
        () => originalMethod.apply(this, args),
        context,
        fallbackOperation
      );
    };

    return descriptor;
  };
}