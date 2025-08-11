/**
 * Unit tests for structured logger
 */

import { StructuredLogger, LogLevel, createKYCLogger } from '../structured-logger';

// Mock console methods
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockConsoleWarn = jest.fn();
const mockConsoleDebug = jest.fn();

beforeAll(() => {
  global.console = {
    ...console,
    log: mockConsoleLog,
    error: mockConsoleError,
    warn: mockConsoleWarn,
    debug: mockConsoleDebug,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    logger = StructuredLogger.getInstance('TestService', 'test');
  });

  describe('Basic logging', () => {
    it('should log info messages with correct structure', () => {
      const message = 'Test info message';
      const context = { operation: 'TestOperation', userId: 'user123' };

      logger.info(message, context);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);

      expect(loggedData).toMatchObject({
        level: LogLevel.INFO,
        message,
        context: {
          service: 'TestService',
          environment: 'test',
          ...context,
        },
      });
      expect(loggedData.timestamp).toBeDefined();
    });

    it('should log error messages with error details', () => {
      const message = 'Test error message';
      const context = { operation: 'TestOperation' };
      const error = new Error('Test error');
      error.name = 'TestError';

      logger.error(message, context, error);

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleError.mock.calls[0][0]);

      expect(loggedData).toMatchObject({
        level: LogLevel.ERROR,
        message,
        context: {
          service: 'TestService',
          environment: 'test',
          ...context,
        },
        error: {
          name: 'TestError',
          message: 'Test error',
          stack: expect.any(String),
        },
      });
    });

    it('should log warnings with optional error', () => {
      const message = 'Test warning';
      const context = { operation: 'TestOperation' };

      logger.warn(message, context);

      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleWarn.mock.calls[0][0]);

      expect(loggedData.level).toBe(LogLevel.WARN);
      expect(loggedData.error).toBeUndefined();
    });
  });

  describe('Operation-specific logging', () => {
    it('should log operation start', () => {
      const operation = 'S3Upload';
      const context = { s3Key: 'test-key' };

      logger.logOperationStart(operation, context);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);

      expect(loggedData.message).toBe(`${operation} started`);
      expect(loggedData.context.operation).toBe(operation);
      expect(loggedData.context.s3Key).toBe('test-key');
    });

    it('should log operation success with duration', () => {
      const operation = 'DynamoDBWrite';
      const duration = 150;
      const context = { tableName: 'test-table' };

      logger.logOperationSuccess(operation, duration, context);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);

      expect(loggedData.message).toBe(`${operation} completed successfully`);
      expect(loggedData.context.duration).toBe(duration);
      expect(loggedData.context.tableName).toBe('test-table');
    });

    it('should log retry attempts', () => {
      const operation = 'S3Upload';
      const attempt = 2;
      const maxRetries = 3;
      const delay = 400;
      const error = new Error('Network timeout');
      const context = { s3Key: 'test-key' };

      logger.logRetryAttempt(operation, attempt, maxRetries, delay, error, context);

      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleWarn.mock.calls[0][0]);

      expect(loggedData.message).toBe(`${operation} retry attempt ${attempt}/${maxRetries}`);
      expect(loggedData.context.attempt).toBe(attempt);
      expect(loggedData.context.maxRetries).toBe(maxRetries);
      expect(loggedData.context.delay).toBe(delay);
      expect(loggedData.error.message).toBe('Network timeout');
    });
  });

  describe('Service-specific logging', () => {
    it('should log S3 upload operations', () => {
      const s3Key = 'kyc-documents/user123/test.pdf';
      const context = { fileSize: 1024 };

      logger.logS3Upload('start', s3Key, context);
      logger.logS3Upload('success', s3Key, context);
      logger.logS3Upload('error', s3Key, context, new Error('Upload failed'));

      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);

      const startLog = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(startLog.message).toBe('S3 upload start');
      expect(startLog.context.s3Key).toBe(s3Key);

      const errorLog = JSON.parse(mockConsoleError.mock.calls[0][0]);
      expect(errorLog.message).toBe('S3 upload error');
      expect(errorLog.error.message).toBe('Upload failed');
    });

    it('should log DynamoDB operations', () => {
      const tableName = 'KYCTable';
      const key = { PK: 'USER#123', SK: 'DOCUMENT#456' };
      const context = { operation: 'PutItem' };

      logger.logDynamoDBOperation('start', tableName, key, context);
      logger.logDynamoDBOperation('success', tableName, key, context);

      expect(mockConsoleLog).toHaveBeenCalledTimes(2);

      const startLog = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(startLog.context.tableName).toBe(tableName);
      expect(startLog.context.key).toBe(JSON.stringify(key));
    });

    it('should log metric publication', () => {
      logger.logMetricPublication('UploadSuccess', 1, true);
      logger.logMetricPublication('UploadError', 1, false, new Error('CloudWatch error'));

      expect(mockConsoleDebug).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);

      const successLog = JSON.parse(mockConsoleDebug.mock.calls[0][0]);
      expect(successLog.context.metricName).toBe('UploadSuccess');
      expect(successLog.context.value).toBe(1);

      const errorLog = JSON.parse(mockConsoleWarn.mock.calls[0][0]);
      expect(errorLog.error.message).toBe('CloudWatch error');
    });
  });

  describe('Factory functions', () => {
    it('should create KYC logger with correct service name', () => {
      const kycLogger = createKYCLogger();
      
      kycLogger.info('Test message');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedData.context.service).toBe('KYCService');
    });
  });

  describe('Singleton behavior', () => {
    it('should return same instance for same service', () => {
      const logger1 = StructuredLogger.getInstance('TestService');
      const logger2 = StructuredLogger.getInstance('TestService');

      expect(logger1).toBe(logger2);
    });
  });
});