/**
 * Unit tests for error response formatter
 */

import {
  ErrorResponseFormatter,
  ErrorResponse,
  ValidationErrorResponse,
  ValidationErrorDetail,
  withErrorFormatting
} from '../error-response-formatter';
import { ProjectError, ProjectErrorCategory } from '../enhanced-error-handler';
import { APIGatewayProxyResult } from 'aws-lambda';

// Mock the logger
jest.mock('../structured-logger', () => ({
  createProjectLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  })
}));

describe('ErrorResponseFormatter', () => {
  describe('formatErrorResponse', () => {
    it('should format ProjectError into API Gateway response', () => {
      const projectError = new ProjectError({
        category: ProjectErrorCategory.VALIDATION,
        severity: 'low' as any,
        retryable: false,
        recoveryStrategy: 'none' as any,
        userMessage: 'Invalid input provided',
        technicalMessage: 'Validation failed for field: name',
        errorCode: 'VALIDATION_ERROR',
        httpStatusCode: 400,
        context: {
          operation: 'test-operation',
          requestId: 'test-request-id',
          timestamp: '2023-01-01T00:00:00.000Z',
          environment: 'test',
          service: 'test-service'
        },
        suggestedActions: ['Check input format', 'Verify required fields']
      });

      const result = ErrorResponseFormatter.formatErrorResponse(projectError);

      expect(result.statusCode).toBe(400);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(result.body) as ErrorResponse;
      expect(body.message).toBe('Invalid input provided');
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.requestId).toBe('test-request-id');
      expect(body.timestamp).toBe('2023-01-01T00:00:00.000Z');
      expect(body.details).toBeDefined();
      expect(body.details!.category).toBe(ProjectErrorCategory.VALIDATION);
      expect(body.details!.severity).toBe('low');
      expect(body.details!.suggestedActions).toEqual(['Check input format', 'Verify required fields']);
    });

    it('should format error response without details when specified', () => {
      const projectError = new ProjectError({
        category: ProjectErrorCategory.SYSTEM,
        severity: 'high' as any,
        retryable: false,
        recoveryStrategy: 'none' as any,
        userMessage: 'System error occurred',
        technicalMessage: 'Database connection failed',
        errorCode: 'SYSTEM_ERROR',
        httpStatusCode: 500,
        context: {
          operation: 'test-operation',
          requestId: 'test-request-id',
          timestamp: '2023-01-01T00:00:00.000Z',
          environment: 'test',
          service: 'test-service'
        }
      });

      const result = ErrorResponseFormatter.formatErrorResponse(projectError, false);

      const body = JSON.parse(result.body) as ErrorResponse;
      expect(body.details).toBeUndefined();
    });

    it('should sanitize sensitive information in context', () => {
      const projectError = new ProjectError({
        category: ProjectErrorCategory.AUTHENTICATION,
        severity: 'medium' as any,
        retryable: false,
        recoveryStrategy: 'none' as any,
        userMessage: 'Authentication failed',
        technicalMessage: 'Invalid token',
        errorCode: 'AUTH_ERROR',
        httpStatusCode: 401,
        context: {
          operation: 'test-operation',
          requestId: 'test-request-id',
          timestamp: '2023-01-01T00:00:00.000Z',
          environment: 'test',
          service: 'test-service',
          metadata: {
            token: 'secret-token',
            password: 'secret-password',
            walletAddress: '0x123456789',
            normalField: 'normal-value'
          }
        }
      });

      const result = ErrorResponseFormatter.formatErrorResponse(projectError);

      const body = JSON.parse(result.body) as ErrorResponse;
      expect(body.details!.context!.metadata.token).toBe('[REDACTED]');
      expect(body.details!.context!.metadata.password).toBe('[REDACTED]');
      expect(body.details!.context!.metadata.walletAddress).toBe('[REDACTED]');
      expect(body.details!.context!.metadata.normalField).toBe('normal-value');
    });

    it('should handle missing requestId gracefully', () => {
      const projectError = new ProjectError({
        category: ProjectErrorCategory.VALIDATION,
        severity: 'low' as any,
        retryable: false,
        recoveryStrategy: 'none' as any,
        userMessage: 'Invalid input',
        technicalMessage: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        httpStatusCode: 400,
        context: {
          operation: 'test-operation',
          timestamp: '2023-01-01T00:00:00.000Z',
          environment: 'test',
          service: 'test-service'
        }
      });

      const result = ErrorResponseFormatter.formatErrorResponse(projectError);

      const body = JSON.parse(result.body) as ErrorResponse;
      expect(body.requestId).toBe('unknown');
    });
  });

  describe('formatValidationErrorResponse', () => {
    it('should format validation errors with field details', () => {
      const validationErrors: ValidationErrorDetail[] = [
        {
          field: 'name',
          message: 'Name is required',
          value: null,
          constraint: 'required'
        },
        {
          field: 'email',
          message: 'Invalid email format',
          value: 'invalid-email',
          constraint: 'email'
        }
      ];

      const result = ErrorResponseFormatter.formatValidationErrorResponse(
        validationErrors,
        'test-request-id',
        'Input validation failed'
      );

      expect(result.statusCode).toBe(400);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body) as ValidationErrorResponse;
      expect(body.message).toBe('Input validation failed');
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.requestId).toBe('test-request-id');
      expect(body.validationErrors).toHaveLength(2);
      expect(body.validationErrors[0]).toEqual({
        field: 'name',
        message: 'Name is required',
        value: null,
        constraint: 'required'
      });
      expect(body.details!.category).toBe(ProjectErrorCategory.VALIDATION);
      expect(body.details!.suggestedActions).toContain('Review the validation errors below');
    });

    it('should use default message when not provided', () => {
      const validationErrors: ValidationErrorDetail[] = [
        {
          field: 'name',
          message: 'Name is required'
        }
      ];

      const result = ErrorResponseFormatter.formatValidationErrorResponse(
        validationErrors,
        'test-request-id'
      );

      const body = JSON.parse(result.body) as ValidationErrorResponse;
      expect(body.message).toBe('Validation failed');
    });
  });

  describe('formatSuccessResponse', () => {
    it('should format success response with data', () => {
      const data = { id: '123', name: 'Test Project' };
      const result = ErrorResponseFormatter.formatSuccessResponse(data);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.timestamp).toBeDefined();
      expect(body.message).toBeUndefined();
    });

    it('should format success response with custom status code and message', () => {
      const data = { id: '123' };
      const result = ErrorResponseFormatter.formatSuccessResponse(
        data,
        201,
        'Resource created successfully'
      );

      expect(result.statusCode).toBe(201);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.message).toBe('Resource created successfully');
    });
  });

  describe('formatGenericErrorResponse', () => {
    it('should format generic error into response', () => {
      const error = new Error('Unexpected error occurred');
      const result = ErrorResponseFormatter.formatGenericErrorResponse(
        error,
        'test-request-id',
        500
      );

      expect(result.statusCode).toBe(500);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body) as ErrorResponse;
      expect(body.message).toBe('An unexpected error occurred. Please try again or contact support.');
      expect(body.code).toBe('INTERNAL_ERROR');
      expect(body.requestId).toBe('test-request-id');
      expect(body.details!.category).toBe(ProjectErrorCategory.SYSTEM);
      expect(body.details!.severity).toBe('high');
    });

    it('should use default status code when not provided', () => {
      const error = new Error('Test error');
      const result = ErrorResponseFormatter.formatGenericErrorResponse(
        error,
        'test-request-id'
      );

      expect(result.statusCode).toBe(500);
    });
  });

  describe('createValidationError', () => {
    it('should create validation error detail with all fields', () => {
      const error = ErrorResponseFormatter.createValidationError(
        'email',
        'Invalid email format',
        'invalid-email',
        'email'
      );

      expect(error).toEqual({
        field: 'email',
        message: 'Invalid email format',
        value: 'invalid-email',
        constraint: 'email'
      });
    });

    it('should create validation error detail with minimal fields', () => {
      const error = ErrorResponseFormatter.createValidationError(
        'name',
        'Name is required'
      );

      expect(error).toEqual({
        field: 'name',
        message: 'Name is required',
        value: undefined,
        constraint: undefined
      });
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return appropriate message for each category', () => {
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.VALIDATION))
        .toBe('Please check your input and try again.');
      
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.AUTHENTICATION))
        .toBe('Please log in again to continue.');
      
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.AUTHORIZATION))
        .toBe('You do not have permission to perform this action.');
      
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.BUSINESS_LOGIC))
        .toBe('This operation cannot be completed due to business rules.');
      
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.EXTERNAL_SERVICE))
        .toBe('External service is temporarily unavailable. Please try again.');
      
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.SYSTEM))
        .toBe('A system error occurred. Please try again or contact support.');
      
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.NETWORK))
        .toBe('Network connection error. Please check your connection and try again.');
      
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.RATE_LIMIT))
        .toBe('Too many requests. Please wait a moment and try again.');
      
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.RESOURCE_NOT_FOUND))
        .toBe('The requested resource was not found.');
      
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.CONFLICT))
        .toBe('A conflict occurred. Please check your data and try again.');
      
      expect(ErrorResponseFormatter.getUserFriendlyMessage(ProjectErrorCategory.TIMEOUT))
        .toBe('Request timed out. Please try again.');
    });

    it('should return original message when category not found', () => {
      const originalMessage = 'Custom error message';
      expect(ErrorResponseFormatter.getUserFriendlyMessage(
        'unknown' as ProjectErrorCategory,
        originalMessage
      )).toBe(originalMessage);
    });

    it('should return default message when no original message provided', () => {
      expect(ErrorResponseFormatter.getUserFriendlyMessage(
        'unknown' as ProjectErrorCategory
      )).toBe('An unexpected error occurred.');
    });
  });

  describe('getHttpStatusCode', () => {
    it('should return correct status codes for each category', () => {
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.VALIDATION)).toBe(400);
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.AUTHENTICATION)).toBe(401);
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.AUTHORIZATION)).toBe(403);
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.RESOURCE_NOT_FOUND)).toBe(404);
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.CONFLICT)).toBe(409);
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.BUSINESS_LOGIC)).toBe(422);
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.RATE_LIMIT)).toBe(429);
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.SYSTEM)).toBe(500);
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.EXTERNAL_SERVICE)).toBe(503);
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.NETWORK)).toBe(503);
      expect(ErrorResponseFormatter.getHttpStatusCode(ProjectErrorCategory.TIMEOUT)).toBe(504);
    });

    it('should return 500 for unknown categories', () => {
      expect(ErrorResponseFormatter.getHttpStatusCode('unknown' as ProjectErrorCategory)).toBe(500);
    });
  });
});

describe('withErrorFormatting decorator', () => {
  it('should format ProjectError responses automatically', async () => {
    class TestClass {
      @withErrorFormatting()
      async testMethod(): Promise<APIGatewayProxyResult> {
        const error = new ProjectError({
          category: ProjectErrorCategory.VALIDATION,
          severity: 'low' as any,
          retryable: false,
          recoveryStrategy: 'none' as any,
          userMessage: 'Validation failed',
          technicalMessage: 'Invalid input',
          errorCode: 'VALIDATION_ERROR',
          httpStatusCode: 400,
          context: {
            operation: 'test',
            timestamp: new Date().toISOString(),
            environment: 'test',
            service: 'test'
          }
        });
        throw error;
      }
    }

    const instance = new TestClass();
    const result = await instance.testMethod();

    expect(result.statusCode).toBe(400);
    expect(result.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(result.body) as ErrorResponse;
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.message).toBe('Validation failed');
  });

  it('should format generic errors automatically', async () => {
    class TestClass {
      @withErrorFormatting()
      async testMethod(event: { requestContext: { requestId: string } }): Promise<APIGatewayProxyResult> {
        throw new Error('Unexpected error');
      }
    }

    const instance = new TestClass();
    const mockEvent = {
      requestContext: { requestId: 'test-request-id' }
    };

    const result = await instance.testMethod(mockEvent);

    expect(result.statusCode).toBe(500);
    expect(result.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(result.body) as ErrorResponse;
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.requestId).toBe('test-request-id');
  });

  it('should pass through successful responses', async () => {
    class TestClass {
      @withErrorFormatting()
      async testMethod(): Promise<APIGatewayProxyResult> {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      }
    }

    const instance = new TestClass();
    const result = await instance.testMethod();

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify({ success: true }));
  });

  it('should handle missing requestId gracefully', async () => {
    class TestClass {
      @withErrorFormatting()
      async testMethod(): Promise<APIGatewayProxyResult> {
        throw new Error('Test error');
      }
    }

    const instance = new TestClass();
    const result = await instance.testMethod();

    expect(result.statusCode).toBe(500);

    const body = JSON.parse(result.body) as ErrorResponse;
    expect(body.requestId).toBe('unknown');
  });

  it('should respect includeDetails parameter', async () => {
    class TestClass {
      @withErrorFormatting(false)
      async testMethod(): Promise<APIGatewayProxyResult> {
        const error = new ProjectError({
          category: ProjectErrorCategory.VALIDATION,
          severity: 'low' as any,
          retryable: false,
          recoveryStrategy: 'none' as any,
          userMessage: 'Validation failed',
          technicalMessage: 'Invalid input',
          errorCode: 'VALIDATION_ERROR',
          httpStatusCode: 400,
          context: {
            operation: 'test',
            timestamp: new Date().toISOString(),
            environment: 'test',
            service: 'test'
          }
        });
        throw error;
      }
    }

    const instance = new TestClass();
    const result = await instance.testMethod();

    const body = JSON.parse(result.body) as ErrorResponse;
    expect(body.details).toBeUndefined();
  });
});