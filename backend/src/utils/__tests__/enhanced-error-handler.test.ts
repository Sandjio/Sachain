/**
 * Unit tests for enhanced error handler
 */

import {
  ProjectError,
  ProjectErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  ProjectErrorClassifier,
  ErrorRecoveryManager,
  withErrorHandling
} from '../enhanced-error-handler';

describe('ProjectErrorClassifier', () => {
  const mockContext = {
    operation: 'test-operation',
    requestId: 'test-request-id',
    userId: 'test-user-id',
    projectId: 'test-project-id'
  };

  describe('classify', () => {
    it('should classify validation errors correctly', () => {
      const validationError = new Error('Validation failed: required field missing');
      const result = ProjectErrorClassifier.classify(validationError, mockContext);

      expect(result).toBeInstanceOf(ProjectError);
      expect(result.category).toBe(ProjectErrorCategory.VALIDATION);
      expect(result.severity).toBe(ErrorSeverity.LOW);
      expect(result.retryable).toBe(false);
      expect(result.httpStatusCode).toBe(400);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should classify authentication errors correctly', () => {
      const authError = new Error('Invalid token provided');
      const result = ProjectErrorClassifier.classify(authError, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.AUTHENTICATION);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(false);
      expect(result.httpStatusCode).toBe(401);
      expect(result.errorCode).toBe('AUTHENTICATION_ERROR');
    });

    it('should classify authorization errors correctly', () => {
      const authzError = new Error('Access denied to resource');
      const result = ProjectErrorClassifier.classify(authzError, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.AUTHORIZATION);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(false);
      expect(result.httpStatusCode).toBe(403);
      expect(result.errorCode).toBe('AUTHORIZATION_ERROR');
    });

    it('should classify business logic errors correctly', () => {
      const businessError = new Error('KYC not verified for user');
      const result = ProjectErrorClassifier.classify(businessError, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.BUSINESS_LOGIC);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(false);
      expect(result.httpStatusCode).toBe(422);
      expect(result.errorCode).toBe('BUSINESS_LOGIC_ERROR');
    });

    it('should classify Hedera errors correctly', () => {
      const hederaError = new Error('Hedera token service unavailable');
      const result = ProjectErrorClassifier.classify(hederaError, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.EXTERNAL_SERVICE);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.retryable).toBe(true);
      expect(result.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(result.httpStatusCode).toBe(503);
      expect(result.errorCode).toBe('HEDERA_SERVICE_ERROR');
    });

    it('should classify IPFS errors correctly', () => {
      const ipfsError = new Error('IPFS upload failed');
      const result = ProjectErrorClassifier.classify(ipfsError, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.EXTERNAL_SERVICE);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(true);
      expect(result.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(result.httpStatusCode).toBe(503);
      expect(result.errorCode).toBe('IPFS_SERVICE_ERROR');
    });

    it('should classify DynamoDB throttling errors correctly', () => {
      const throttleError = new Error('ProvisionedThroughputExceededException');
      throttleError.name = 'ProvisionedThroughputExceededException';
      const result = ProjectErrorClassifier.classify(throttleError, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.RATE_LIMIT);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(true);
      expect(result.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(result.httpStatusCode).toBe(429);
      expect(result.errorCode).toBe('DATABASE_ERROR');
    });

    it('should classify DynamoDB system errors correctly', () => {
      const systemError = new Error('InternalServerError');
      systemError.name = 'InternalServerError';
      const result = ProjectErrorClassifier.classify(systemError, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.SYSTEM);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.retryable).toBe(true);
      expect(result.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(result.httpStatusCode).toBe(503);
      expect(result.errorCode).toBe('DATABASE_ERROR');
    });

    it('should classify S3 errors correctly', () => {
      const s3Error = new Error('NoSuchBucket');
      s3Error.name = 'NoSuchBucket';
      const result = ProjectErrorClassifier.classify(s3Error, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.SYSTEM);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(true);
      expect(result.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(result.httpStatusCode).toBe(503);
      expect(result.errorCode).toBe('STORAGE_ERROR');
    });

    it('should classify network errors correctly', () => {
      const networkError = new Error('ECONNRESET: Connection reset by peer');
      const result = ProjectErrorClassifier.classify(networkError, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.NETWORK);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(true);
      expect(result.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(result.httpStatusCode).toBe(503);
      expect(result.errorCode).toBe('NETWORK_ERROR');
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Request timed out');
      const result = ProjectErrorClassifier.classify(timeoutError, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.TIMEOUT);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.retryable).toBe(true);
      expect(result.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(result.httpStatusCode).toBe(504);
      expect(result.errorCode).toBe('TIMEOUT_ERROR');
    });

    it('should classify unknown errors as system errors', () => {
      const unknownError = new Error('Some unknown error occurred');
      const result = ProjectErrorClassifier.classify(unknownError, mockContext);

      expect(result.category).toBe(ProjectErrorCategory.SYSTEM);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.retryable).toBe(false);
      expect(result.recoveryStrategy).toBe(RecoveryStrategy.MANUAL_INTERVENTION);
      expect(result.httpStatusCode).toBe(500);
      expect(result.errorCode).toBe('SYSTEM_ERROR');
    });

    it('should return existing ProjectError unchanged', () => {
      const existingError = new ProjectError({
        category: ProjectErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        recoveryStrategy: RecoveryStrategy.NONE,
        userMessage: 'Test error',
        technicalMessage: 'Test technical message',
        errorCode: 'TEST_ERROR',
        httpStatusCode: 400,
        context: {
          operation: 'test',
          timestamp: new Date().toISOString(),
          environment: 'test',
          service: 'test'
        }
      });

      const result = ProjectErrorClassifier.classify(existingError, mockContext);
      expect(result).toBe(existingError);
    });

    it('should include suggested actions in classified errors', () => {
      const validationError = new Error('Invalid input format');
      const result = ProjectErrorClassifier.classify(validationError, mockContext);

      expect(result.suggestedActions).toBeDefined();
      expect(result.suggestedActions).toContain('Verify all required fields are provided');
      expect(result.suggestedActions).toContain('Check field formats and constraints');
    });

    it('should preserve error context', () => {
      const error = new Error('Test error');
      const result = ProjectErrorClassifier.classify(error, mockContext);

      expect(result.context.operation).toBe(mockContext.operation);
      expect(result.context.requestId).toBe(mockContext.requestId);
      expect(result.context.userId).toBe(mockContext.userId);
      expect(result.context.projectId).toBe(mockContext.projectId);
      expect(result.context.timestamp).toBeDefined();
      expect(result.context.environment).toBeDefined();
      expect(result.context.service).toBe('ProjectService');
    });
  });
});

describe('ErrorRecoveryManager', () => {
  describe('executeWithRecovery', () => {
    it('should execute operation successfully without recovery', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const context = { operation: 'test-operation' };

      const result = await ErrorRecoveryManager.executeWithRecovery(
        mockOperation,
        context
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry retryable errors', async () => {
      const retryableError = new Error('Hedera service unavailable');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const context = { operation: 'test-operation' };

      const result = await ErrorRecoveryManager.executeWithRecovery(
        mockOperation,
        context
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should use fallback operation when provided', async () => {
      const nonRetryableError = new Error('Validation failed');
      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);
      const mockFallback = jest.fn().mockResolvedValue('fallback-success');
      const context = { operation: 'test-operation' };

      const result = await ErrorRecoveryManager.executeWithRecovery(
        mockOperation,
        context,
        mockFallback
      );

      expect(result).toBe('fallback-success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockFallback).toHaveBeenCalledTimes(1);
    });

    it('should throw error when retry exhausted', async () => {
      const retryableError = new Error('Network timeout');
      const mockOperation = jest.fn().mockRejectedValue(retryableError);
      const context = { operation: 'test-operation' };

      await expect(
        ErrorRecoveryManager.executeWithRecovery(mockOperation, context)
      ).rejects.toThrow(ProjectError);

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should throw error when fallback fails', async () => {
      const originalError = new Error('Original error');
      const fallbackError = new Error('Fallback failed');
      const mockOperation = jest.fn().mockRejectedValue(originalError);
      const mockFallback = jest.fn().mockRejectedValue(fallbackError);
      const context = { operation: 'test-operation' };

      await expect(
        ErrorRecoveryManager.executeWithRecovery(
          mockOperation,
          context,
          mockFallback
        )
      ).rejects.toThrow(ProjectError);

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockFallback).toHaveBeenCalledTimes(1);
    });
  });
});

describe('withErrorHandling decorator', () => {
  it('should handle errors automatically', async () => {
    class TestClass {
      @withErrorHandling('test-operation')
      async testMethod(): Promise<string> {
        throw new Error('Test error');
      }
    }

    const instance = new TestClass();

    await expect(instance.testMethod()).rejects.toThrow(ProjectError);
  });

  it('should pass through successful operations', async () => {
    class TestClass {
      @withErrorHandling('test-operation')
      async testMethod(): Promise<string> {
        return 'success';
      }
    }

    const instance = new TestClass();
    const result = await instance.testMethod();

    expect(result).toBe('success');
  });

  it('should use fallback operation when provided', async () => {
    const fallbackOperation = jest.fn().mockResolvedValue('fallback-result');

    class TestClass {
      @withErrorHandling('test-operation', fallbackOperation)
      async testMethod(): Promise<string> {
        throw new Error('Test error');
      }
    }

    const instance = new TestClass();
    const result = await instance.testMethod();

    expect(result).toBe('fallback-result');
    expect(fallbackOperation).toHaveBeenCalledTimes(1);
  });
});

describe('ProjectError', () => {
  it('should create error with all properties', () => {
    const context = {
      operation: 'test-operation',
      requestId: 'test-request-id',
      timestamp: new Date().toISOString(),
      environment: 'test',
      service: 'test-service'
    };

    const errorDetails = {
      category: ProjectErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      retryable: false,
      recoveryStrategy: RecoveryStrategy.NONE,
      userMessage: 'User friendly message',
      technicalMessage: 'Technical error message',
      errorCode: 'TEST_ERROR',
      httpStatusCode: 400,
      context,
      suggestedActions: ['Action 1', 'Action 2'],
      rollbackRequired: true
    };

    const originalError = new Error('Original error');
    const projectError = new ProjectError(errorDetails, originalError);

    expect(projectError.name).toBe('ProjectError');
    expect(projectError.category).toBe(ProjectErrorCategory.VALIDATION);
    expect(projectError.severity).toBe(ErrorSeverity.LOW);
    expect(projectError.retryable).toBe(false);
    expect(projectError.recoveryStrategy).toBe(RecoveryStrategy.NONE);
    expect(projectError.userMessage).toBe('User friendly message');
    expect(projectError.technicalMessage).toBe('Technical error message');
    expect(projectError.errorCode).toBe('TEST_ERROR');
    expect(projectError.httpStatusCode).toBe(400);
    expect(projectError.context).toBe(context);
    expect(projectError.suggestedActions).toEqual(['Action 1', 'Action 2']);
    expect(projectError.rollbackRequired).toBe(true);
    expect(projectError.originalError).toBe(originalError);
    expect(projectError.message).toBe('Technical error message');
  });
});