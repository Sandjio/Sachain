/**
 * Integration tests for error handling and retry mechanisms
 * Tests the complete flow of error classification, retry logic, and logging
 */

import { ExponentialBackoff, RetryError } from '../retry';
import { ErrorClassifier, AWSServiceError } from '../error-handler';
import { StructuredLogger } from '../structured-logger';
import { S3UploadUtility, createKYCUploadUtility } from '../s3-upload';

// Mock console for testing
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockConsoleWarn = jest.fn();

beforeAll(() => {
  global.console = {
    ...console,
    log: mockConsoleLog,
    error: mockConsoleError,
    warn: mockConsoleWarn,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Error Handling and Retry Integration', () => {
  describe('Retry with Error Classification', () => {
    it('should retry retryable errors and classify them correctly', async () => {
      const retry = new ExponentialBackoff({
        maxRetries: 2,
        baseDelay: 10, // Short delay for testing
        maxDelay: 100,
        jitterType: 'none', // No jitter for predictable testing
      });

      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          const error = {
            name: 'ProvisionedThroughputExceededException',
            message: 'Throughput exceeded',
            $metadata: { httpStatusCode: 400 },
          };
          throw error;
        }
        return 'success';
      });

      const result = await retry.execute(operation, 'TestOperation');

      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
      
      // Verify error classification was correct (retryable)
      const testError = {
        name: 'ProvisionedThroughputExceededException',
        message: 'Throughput exceeded',
        $metadata: { httpStatusCode: 400 },
      };
      const classification = ErrorClassifier.classify(testError);
      expect(classification.retryable).toBe(true);
    });

    it('should not retry non-retryable errors', async () => {
      const retry = new ExponentialBackoff({
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        jitterType: 'none',
      });

      const operation = jest.fn().mockImplementation(() => {
        const error = {
          name: 'ValidationException',
          message: 'Invalid input',
          $metadata: { httpStatusCode: 400 },
        };
        throw error;
      });

      await expect(retry.execute(operation, 'TestOperation')).rejects.toThrow(RetryError);

      // Should only be called once (no retries for non-retryable error)
      expect(operation).toHaveBeenCalledTimes(1);
      
      // Verify error classification was correct (non-retryable)
      const testError = {
        name: 'ValidationException',
        message: 'Invalid input',
        $metadata: { httpStatusCode: 400 },
      };
      const classification = ErrorClassifier.classify(testError);
      expect(classification.retryable).toBe(false);
    });

    it('should handle mixed error types correctly', async () => {
      const retry = new ExponentialBackoff({
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        jitterType: 'none',
      });

      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          // First attempt: retryable error
          throw {
            name: 'ServiceUnavailable',
            message: 'Service unavailable',
            $metadata: { httpStatusCode: 503, service: 'S3' },
          };
        } else if (attemptCount === 2) {
          // Second attempt: non-retryable error
          throw {
            name: 'AccessDenied',
            message: 'Access denied',
            $metadata: { httpStatusCode: 403, service: 'S3' },
          };
        }
        return 'success';
      });

      await expect(retry.execute(operation, 'TestOperation')).rejects.toThrow(RetryError);

      // Should be called twice (retry after first error, stop after second non-retryable error)
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Structured Logging with Error Handling', () => {
    it('should log retry attempts with proper structure', async () => {
      const logger = StructuredLogger.getInstance('TestService', 'test');
      const retry = new ExponentialBackoff({
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
        jitterType: 'none',
      });

      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        const error = new Error(`Attempt ${attemptCount} failed`);
        error.name = 'ThrottlingException';
        
        if (attemptCount <= 2) {
          logger.logRetryAttempt('TestOperation', attemptCount, 2, 10, error, {
            userId: 'user123',
          });
          throw error;
        }
        return 'success';
      });

      const result = await retry.execute(operation, 'TestOperation');

      expect(result.result).toBe('success');
      expect(mockConsoleWarn).toHaveBeenCalledTimes(2);

      // Verify log structure
      const firstRetryLog = JSON.parse(mockConsoleWarn.mock.calls[0][0]);
      expect(firstRetryLog.level).toBe('WARN');
      expect(firstRetryLog.message).toContain('TestOperation retry attempt 1/2');
      expect(firstRetryLog.context.attempt).toBe(1);
      expect(firstRetryLog.context.maxRetries).toBe(2);
      expect(firstRetryLog.context.userId).toBe('user123');
      expect(firstRetryLog.error.name).toBe('ThrottlingException');
    });

    it('should log operation success after retries', async () => {
      const logger = StructuredLogger.getInstance('TestService', 'test');
      const startTime = Date.now();

      // Simulate operation that succeeds after retries
      logger.logOperationStart('S3Upload', { s3Key: 'test-key' });
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const duration = Date.now() - startTime;
      logger.logOperationSuccess('S3Upload', duration, { 
        s3Key: 'test-key',
        attempts: 3,
      });

      expect(mockConsoleLog).toHaveBeenCalledTimes(2);

      const startLog = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(startLog.message).toBe('S3Upload started');
      expect(startLog.context.s3Key).toBe('test-key');

      const successLog = JSON.parse(mockConsoleLog.mock.calls[1][0]);
      expect(successLog.message).toBe('S3Upload completed successfully');
      expect(successLog.context.duration).toBeGreaterThan(0);
      expect(successLog.context.attempts).toBe(3);
    });
  });

  describe('S3 Upload with Comprehensive Error Handling', () => {
    it('should handle S3 upload with retry and proper error classification', async () => {
      // This test would require mocking AWS SDK, but demonstrates the integration
      const mockS3Upload = jest.fn()
        .mockRejectedValueOnce({
          name: 'SlowDown',
          message: 'Please reduce your request rate',
          $metadata: { httpStatusCode: 503, service: 'S3' },
        })
        .mockRejectedValueOnce({
          name: 'RequestTimeout',
          message: 'Request timeout',
          $metadata: { httpStatusCode: 408, service: 'S3' },
        })
        .mockResolvedValueOnce({
          ETag: '"test-etag"',
          Location: 'https://test-bucket.s3.amazonaws.com/test-key',
        });

      const retry = new ExponentialBackoff({
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        jitterType: 'none',
      });

      const result = await retry.execute(mockS3Upload, 'S3Upload');

      expect(result.result.ETag).toBe('"test-etag"');
      expect(result.attempts).toBe(3);
      expect(mockS3Upload).toHaveBeenCalledTimes(3);

      // Verify both errors were classified as retryable
      const slowDownError = {
        name: 'SlowDown',
        message: 'Please reduce your request rate',
        $metadata: { httpStatusCode: 503, service: 'S3' },
      };
      const timeoutError = {
        name: 'RequestTimeout',
        message: 'Request timeout',
        $metadata: { httpStatusCode: 408, service: 'S3' },
      };

      expect(ErrorClassifier.isRetryable(slowDownError)).toBe(true);
      expect(ErrorClassifier.isRetryable(timeoutError)).toBe(true);
    });

    it('should create AWSServiceError with proper context', async () => {
      const originalError = {
        name: 'AccessDenied',
        message: 'Access denied',
        code: 'AccessDenied',
        $metadata: { httpStatusCode: 403, service: 'S3' },
      };

      const context = {
        operation: 'S3Upload',
        s3Key: 'kyc-documents/user123/test.pdf',
        userId: 'user123',
      };

      const errorDetails = ErrorClassifier.classify(originalError, context);
      const awsError = new AWSServiceError(errorDetails, originalError);

      expect(awsError.name).toBe('AWSServiceError');
      expect(awsError.category).toBe('authorization');
      expect(awsError.retryable).toBe(false);
      expect(awsError.userMessage).toContain('permission');
      expect(awsError.technicalMessage).toBe('S3 access denied');
      expect(awsError.context).toEqual(context);
      expect(awsError.originalError).toBe(originalError);
    });
  });

  describe('End-to-End Error Flow', () => {
    it('should handle complete error flow from operation to logging', async () => {
      const logger = StructuredLogger.getInstance('IntegrationTest', 'test');
      const retry = new ExponentialBackoff({
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
        jitterType: 'none',
      });

      const context = {
        operation: 'FileUpload',
        userId: 'user123',
        documentId: 'doc456',
      };

      let attemptCount = 0;
      const mockOperation = async () => {
        attemptCount++;
        logger.info(`Attempt ${attemptCount} started`, context);

        if (attemptCount <= 1) {
          const error = {
            name: 'ThrottlingException',
            message: 'Request rate exceeded',
            $metadata: { httpStatusCode: 429 },
          };
          
          logger.logRetryAttempt('FileUpload', attemptCount, 2, 10, error, context);
          throw error;
        }

        logger.logOperationSuccess('FileUpload', 100, { ...context, attempts: attemptCount });
        return { success: true, attempts: attemptCount };
      };

      const result = await retry.execute(mockOperation, 'FileUpload');

      expect(result.result.success).toBe(true);
      expect(result.result.attempts).toBe(2);
      expect(result.attempts).toBe(2);

      // Verify logging calls
      expect(mockConsoleLog).toHaveBeenCalledTimes(3); // 2 start logs + 1 success log
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1); // 1 retry log

      // Verify final success log
      const successLog = JSON.parse(mockConsoleLog.mock.calls[2][0]);
      expect(successLog.message).toBe('FileUpload completed successfully');
      expect(successLog.context.attempts).toBe(2);
      expect(successLog.context.userId).toBe('user123');
    });

    it('should handle ultimate failure with proper error classification', async () => {
      const logger = StructuredLogger.getInstance('IntegrationTest', 'test');
      const retry = new ExponentialBackoff({
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
        jitterType: 'none',
      });

      const context = {
        operation: 'FileUpload',
        userId: 'user123',
      };

      const mockOperation = async () => {
        const error = {
          name: 'ServiceUnavailable',
          message: 'Service temporarily unavailable',
          $metadata: { httpStatusCode: 503, service: 'S3' },
        };
        
        logger.error('Operation failed', context, error);
        throw error;
      };

      await expect(retry.execute(mockOperation, 'FileUpload')).rejects.toThrow(RetryError);

      // Verify error was classified correctly
      const testError = {
        name: 'ServiceUnavailable',
        message: 'Service temporarily unavailable',
        $metadata: { httpStatusCode: 503, service: 'S3' },
      };
      const classification = ErrorClassifier.classify(testError, context);
      
      expect(classification.category).toBe('system');
      expect(classification.retryable).toBe(true);
      expect(classification.userMessage).toContain('temporarily unavailable');
      expect(classification.context).toEqual(context);

      // Verify error logging
      expect(mockConsoleError).toHaveBeenCalledTimes(3); // Called for each retry attempt
    });
  });
});