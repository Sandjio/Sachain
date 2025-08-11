/**
 * Unit tests for enhanced error handler with S3 and DynamoDB error classification
 */

import { ErrorClassifier, AWSServiceError, ErrorCategory } from '../error-handler';

describe('ErrorClassifier', () => {
  describe('S3 Error Classification', () => {
    it('should classify NoSuchBucket as system error', () => {
      const error = {
        name: 'NoSuchBucket',
        message: 'The specified bucket does not exist',
        code: 'NoSuchBucket',
        $metadata: { httpStatusCode: 404, service: 'S3' },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('Storage service configuration error');
      expect(result.technicalMessage).toBe('S3 bucket does not exist');
    });

    it('should classify AccessDenied as authorization error', () => {
      const error = {
        name: 'AccessDenied',
        message: 'Access Denied',
        code: 'AccessDenied',
        $metadata: { httpStatusCode: 403, service: 'S3' },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('permission');
      expect(result.technicalMessage).toBe('S3 access denied');
    });

    it('should classify EntityTooLarge as validation error', () => {
      const error = {
        name: 'EntityTooLarge',
        message: 'Your proposed upload exceeds the maximum allowed size',
        code: 'EntityTooLarge',
        $metadata: { httpStatusCode: 400, service: 'S3' },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('too large');
      expect(result.technicalMessage).toBe('S3 entity too large');
    });

    it('should classify SlowDown as rate limit error', () => {
      const error = {
        name: 'SlowDown',
        message: 'Please reduce your request rate',
        code: 'SlowDown',
        $metadata: { httpStatusCode: 503, service: 'S3' },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('busy');
      expect(result.technicalMessage).toBe('S3 slow down error');
    });

    it('should classify ServiceUnavailable as retryable system error', () => {
      const error = {
        name: 'ServiceUnavailable',
        message: 'Service is temporarily unavailable',
        code: 'ServiceUnavailable',
        $metadata: { httpStatusCode: 503, service: 'S3' },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('temporarily unavailable');
      expect(result.technicalMessage).toBe('S3 service unavailable');
    });
  });

  describe('DynamoDB Error Classification', () => {
    it('should classify ProvisionedThroughputExceededException as rate limit', () => {
      const error = {
        name: 'ProvisionedThroughputExceededException',
        message: 'The level of configured provisioned throughput for the table was exceeded',
        code: 'ProvisionedThroughputExceededException',
        $metadata: { httpStatusCode: 400 },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('temporarily busy');
      expect(result.technicalMessage).toBe('DynamoDB provisioned throughput exceeded');
    });

    it('should classify ConditionalCheckFailedException as validation error', () => {
      const error = {
        name: 'ConditionalCheckFailedException',
        message: 'The conditional request failed',
        code: 'ConditionalCheckFailedException',
        $metadata: { httpStatusCode: 400 },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('conflict');
      expect(result.technicalMessage).toBe('DynamoDB conditional check failed');
    });

    it('should classify ResourceNotFoundException as resource not found', () => {
      const error = {
        name: 'ResourceNotFoundException',
        message: 'Requested resource not found',
        code: 'ResourceNotFoundException',
        $metadata: { httpStatusCode: 400 },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.RESOURCE_NOT_FOUND);
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('not found');
      expect(result.technicalMessage).toBe('DynamoDB resource not found');
    });
  });

  describe('Generic Error Classification', () => {
    it('should classify 500 errors as retryable system errors', () => {
      const error = {
        name: 'InternalServerError',
        message: 'Internal server error',
        $metadata: { httpStatusCode: 500 },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('temporarily unavailable');
    });

    it('should classify 429 errors as rate limit', () => {
      const error = {
        name: 'TooManyRequests',
        message: 'Too many requests',
        $metadata: { httpStatusCode: 429 },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('Too many requests');
    });

    it('should classify 400 errors as validation errors', () => {
      const error = {
        name: 'BadRequest',
        message: 'Bad request',
        $metadata: { httpStatusCode: 400 },
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('Invalid request');
    });

    it('should handle unknown errors gracefully', () => {
      const error = {
        name: 'UnknownError',
        message: 'Something went wrong',
      };

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('unexpected error');
      expect(result.technicalMessage).toContain('Unknown AWS error');
    });
  });

  describe('Context handling', () => {
    it('should include context in error details', () => {
      const error = {
        name: 'TestError',
        message: 'Test error message',
      };
      const context = {
        operation: 'TestOperation',
        userId: 'user123',
        documentId: 'doc456',
      };

      const result = ErrorClassifier.classify(error, context);

      expect(result.context).toEqual(context);
    });
  });

  describe('Utility methods', () => {
    it('should correctly identify retryable errors', () => {
      const retryableError = {
        name: 'ThrottlingException',
        message: 'Rate exceeded',
      };
      const nonRetryableError = {
        name: 'ValidationException',
        message: 'Invalid input',
      };

      expect(ErrorClassifier.isRetryable(retryableError)).toBe(true);
      expect(ErrorClassifier.isRetryable(nonRetryableError)).toBe(false);
    });

    it('should return appropriate user messages', () => {
      const error = {
        name: 'AccessDenied',
        message: 'Access denied',
        $metadata: { service: 'S3' },
      };

      const userMessage = ErrorClassifier.getUserMessage(error);
      expect(userMessage).toContain('permission');
    });

    it('should return technical messages for logging', () => {
      const error = {
        name: 'ServiceUnavailable',
        message: 'Service unavailable',
        $metadata: { service: 'S3' },
      };

      const technicalMessage = ErrorClassifier.getTechnicalMessage(error);
      expect(technicalMessage).toBe('S3 service unavailable');
    });
  });
});

describe('AWSServiceError', () => {
  it('should create error with all properties', () => {
    const errorDetails = {
      category: ErrorCategory.VALIDATION,
      retryable: false,
      userMessage: 'Invalid input',
      technicalMessage: 'Validation failed',
      errorCode: 'ValidationException',
      httpStatusCode: 400,
      context: { operation: 'TestOp' },
    };
    const originalError = new Error('Original error');

    const awsError = new AWSServiceError(errorDetails, originalError);

    expect(awsError.name).toBe('AWSServiceError');
    expect(awsError.category).toBe(ErrorCategory.VALIDATION);
    expect(awsError.retryable).toBe(false);
    expect(awsError.userMessage).toBe('Invalid input');
    expect(awsError.technicalMessage).toBe('Validation failed');
    expect(awsError.errorCode).toBe('ValidationException');
    expect(awsError.httpStatusCode).toBe(400);
    expect(awsError.context).toEqual({ operation: 'TestOp' });
    expect(awsError.originalError).toBe(originalError);
    expect(awsError.message).toBe('Validation failed');
  });
});