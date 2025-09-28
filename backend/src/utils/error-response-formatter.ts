/**
 * Error response formatter for consistent API error responses
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { ProjectError, ProjectErrorCategory } from './enhanced-error-handler';
import { createProjectLogger } from './structured-logger';

const logger = createProjectLogger();

export interface ErrorResponse {
  message: string;
  code: string;
  requestId: string;
  timestamp: string;
  details?: {
    category: string;
    severity: string;
    suggestedActions?: string[];
    context?: Record<string, any>;
  };
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

export interface ValidationErrorResponse extends ErrorResponse {
  validationErrors: ValidationErrorDetail[];
}

export class ErrorResponseFormatter {
  /**
   * Format ProjectError into API Gateway response
   */
  static formatErrorResponse(
    error: ProjectError,
    includeDetails: boolean = true
  ): APIGatewayProxyResult {
    const response: ErrorResponse = {
      message: error.userMessage,
      code: error.errorCode,
      requestId: error.context.requestId || 'unknown',
      timestamp: error.context.timestamp
    };

    if (includeDetails) {
      response.details = {
        category: error.category,
        severity: error.severity,
        suggestedActions: error.suggestedActions,
        context: this.sanitizeContext(error.context)
      };
    }

    // Log error for monitoring
    logger.error('API error response generated', {
      operation: 'ErrorResponse',
      requestId: response.requestId,
      errorCode: error.errorCode,
      category: error.category,
      severity: error.severity,
      httpStatusCode: error.httpStatusCode
    }, error);

    return {
      statusCode: error.httpStatusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(response)
    };
  }

  /**
   * Format validation errors with field-specific details
   */
  static formatValidationErrorResponse(
    validationErrors: ValidationErrorDetail[],
    requestId: string,
    message: string = 'Validation failed'
  ): APIGatewayProxyResult {
    const response: ValidationErrorResponse = {
      message,
      code: 'VALIDATION_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      validationErrors,
      details: {
        category: ProjectErrorCategory.VALIDATION,
        severity: 'low',
        suggestedActions: [
          'Review the validation errors below',
          'Correct the invalid fields',
          'Ensure all required fields are provided'
        ]
      }
    };

    logger.warn('Validation error response generated', {
      operation: 'ValidationErrorResponse',
      requestId,
      errorCount: validationErrors.length,
      fields: validationErrors.map(e => e.field)
    });

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(response)
    };
  }

  /**
   * Format success response with consistent structure
   */
  static formatSuccessResponse(
    data: any,
    statusCode: number = 200,
    message?: string
  ): APIGatewayProxyResult {
    const response = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...(message && { message })
    };

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(response)
    };
  }

  /**
   * Format generic error (non-ProjectError) into response
   */
  static formatGenericErrorResponse(
    error: Error,
    requestId: string,
    statusCode: number = 500
  ): APIGatewayProxyResult {
    const response: ErrorResponse = {
      message: 'An unexpected error occurred. Please try again or contact support.',
      code: 'INTERNAL_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      details: {
        category: ProjectErrorCategory.SYSTEM,
        severity: 'high',
        suggestedActions: [
          'Try the request again',
          'Contact support if the issue persists',
          'Provide the request ID for faster resolution'
        ]
      }
    };

    logger.error('Generic error response generated', {
      operation: 'GenericErrorResponse',
      requestId,
      errorName: error.name,
      errorMessage: error.message
    }, error);

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(response)
    };
  }

  /**
   * Sanitize error context to remove sensitive information
   */
  private static sanitizeContext(context: any): Record<string, any> {
    const sanitized = { ...context };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'credential',
      'authorization',
      'wallet',
      'privateKey'
    ];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveFields.some(field => 
          lowerKey.includes(field)
        );

        if (isSensitive) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Create validation error detail
   */
  static createValidationError(
    field: string,
    message: string,
    value?: any,
    constraint?: string
  ): ValidationErrorDetail {
    return {
      field,
      message,
      value,
      constraint
    };
  }

  /**
   * Get user-friendly error message based on error category
   */
  static getUserFriendlyMessage(category: ProjectErrorCategory, originalMessage?: string): string {
    const messages = {
      [ProjectErrorCategory.VALIDATION]: 'Please check your input and try again.',
      [ProjectErrorCategory.AUTHENTICATION]: 'Please log in again to continue.',
      [ProjectErrorCategory.AUTHORIZATION]: 'You do not have permission to perform this action.',
      [ProjectErrorCategory.BUSINESS_LOGIC]: 'This operation cannot be completed due to business rules.',
      [ProjectErrorCategory.EXTERNAL_SERVICE]: 'External service is temporarily unavailable. Please try again.',
      [ProjectErrorCategory.SYSTEM]: 'A system error occurred. Please try again or contact support.',
      [ProjectErrorCategory.NETWORK]: 'Network connection error. Please check your connection and try again.',
      [ProjectErrorCategory.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
      [ProjectErrorCategory.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
      [ProjectErrorCategory.CONFLICT]: 'A conflict occurred. Please check your data and try again.',
      [ProjectErrorCategory.TIMEOUT]: 'Request timed out. Please try again.'
    };

    return messages[category] || originalMessage || 'An unexpected error occurred.';
  }

  /**
   * Get HTTP status code based on error category
   */
  static getHttpStatusCode(category: ProjectErrorCategory): number {
    const statusCodes = {
      [ProjectErrorCategory.VALIDATION]: 400,
      [ProjectErrorCategory.AUTHENTICATION]: 401,
      [ProjectErrorCategory.AUTHORIZATION]: 403,
      [ProjectErrorCategory.RESOURCE_NOT_FOUND]: 404,
      [ProjectErrorCategory.CONFLICT]: 409,
      [ProjectErrorCategory.BUSINESS_LOGIC]: 422,
      [ProjectErrorCategory.RATE_LIMIT]: 429,
      [ProjectErrorCategory.SYSTEM]: 500,
      [ProjectErrorCategory.EXTERNAL_SERVICE]: 503,
      [ProjectErrorCategory.NETWORK]: 503,
      [ProjectErrorCategory.TIMEOUT]: 504
    };

    return statusCodes[category] || 500;
  }
}

/**
 * Decorator for automatic error response formatting
 */
export function withErrorFormatting(includeDetails: boolean = true) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<APIGatewayProxyResult> {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const requestId = args[0]?.requestContext?.requestId || 'unknown';

        if (error instanceof ProjectError) {
          return ErrorResponseFormatter.formatErrorResponse(error, includeDetails);
        } else {
          return ErrorResponseFormatter.formatGenericErrorResponse(
            error as Error,
            requestId
          );
        }
      }
    };

    return descriptor;
  };
}