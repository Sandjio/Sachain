/**
 * Structured logging utility for comprehensive operation tracking
 * Provides consistent logging format across all Lambda functions
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

export interface LogContext {
  operation: string;
  service: string;
  userId?: string;
  documentId?: string;
  s3Key?: string;
  tableName?: string;
  duration?: number;
  attempt?: number;
  maxRetries?: number;
  errorCode?: string;
  httpStatusCode?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

export class StructuredLogger {
  private static instance: StructuredLogger;
  private readonly environment: string;
  private readonly service: string;

  private constructor(service: string, environment: string = "development") {
    this.service = service;
    this.environment = environment;
  }

  static getInstance(service: string, environment?: string): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger(
        service,
        environment || process.env.ENVIRONMENT || "development"
      );
    }
    return StructuredLogger.instance;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context: Partial<LogContext>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        service: this.service,
        environment: this.environment,
        ...context,
      },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return entry;
  }

  private log(entry: LogEntry): void {
    const logString = JSON.stringify(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logString);
        break;
      case LogLevel.INFO:
        console.log(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logString);
        break;
    }
  }

  debug(message: string, context: Partial<LogContext> = {}): void {
    this.log(this.createLogEntry(LogLevel.DEBUG, message, context));
  }

  info(message: string, context: Partial<LogContext> = {}): void {
    this.log(this.createLogEntry(LogLevel.INFO, message, context));
  }

  warn(message: string, context: Partial<LogContext> = {}, error?: Error): void {
    this.log(this.createLogEntry(LogLevel.WARN, message, context, error));
  }

  error(message: string, context: Partial<LogContext> = {}, error?: Error): void {
    this.log(this.createLogEntry(LogLevel.ERROR, message, context, error));
  }

  fatal(message: string, context: Partial<LogContext> = {}, error?: Error): void {
    this.log(this.createLogEntry(LogLevel.FATAL, message, context, error));
  }

  // Operation-specific logging methods
  logOperationStart(operation: string, context: Partial<LogContext> = {}): void {
    this.info(`${operation} started`, {
      operation,
      ...context,
    });
  }

  logOperationSuccess(
    operation: string,
    duration: number,
    context: Partial<LogContext> = {}
  ): void {
    this.info(`${operation} completed successfully`, {
      operation,
      duration,
      ...context,
    });
  }

  logOperationError(
    operation: string,
    error: Error,
    context: Partial<LogContext> = {}
  ): void {
    this.error(`${operation} failed`, {
      operation,
      ...context,
    }, error);
  }

  logRetryAttempt(
    operation: string,
    attempt: number,
    maxRetries: number,
    delay: number,
    error: Error,
    context: Partial<LogContext> = {}
  ): void {
    this.warn(`${operation} retry attempt ${attempt}/${maxRetries}`, {
      operation,
      attempt,
      maxRetries,
      delay,
      ...context,
    }, error);
  }

  logS3Upload(
    operation: "start" | "success" | "error",
    s3Key: string,
    context: Partial<LogContext> = {},
    error?: Error
  ): void {
    const message = `S3 upload ${operation}`;
    const logContext = { operation: "S3Upload", s3Key, ...context };

    switch (operation) {
      case "start":
        this.info(message, logContext);
        break;
      case "success":
        this.info(message, logContext);
        break;
      case "error":
        this.error(message, logContext, error);
        break;
    }
  }

  logDynamoDBOperation(
    operation: "start" | "success" | "error",
    tableName: string,
    key: Record<string, any>,
    context: Partial<LogContext> = {},
    error?: Error
  ): void {
    const message = `DynamoDB ${operation}`;
    const logContext = { 
      operation: "DynamoDBOperation", 
      tableName, 
      key: JSON.stringify(key),
      ...context 
    };

    switch (operation) {
      case "start":
        this.info(message, logContext);
        break;
      case "success":
        this.info(message, logContext);
        break;
      case "error":
        this.error(message, logContext, error);
        break;
    }
  }

  logMetricPublication(
    metricName: string,
    value: number,
    success: boolean,
    error?: Error
  ): void {
    if (success) {
      this.debug("CloudWatch metric published", {
        operation: "PublishMetric",
        metricName,
        value,
      });
    } else {
      this.warn("Failed to publish CloudWatch metric", {
        operation: "PublishMetric",
        metricName,
        value,
      }, error);
    }
  }
}

// Factory functions for common services
export const createKYCLogger = (): StructuredLogger => 
  StructuredLogger.getInstance("KYCService");

export const createS3Logger = (): StructuredLogger => 
  StructuredLogger.getInstance("S3Service");

export const createDynamoDBLogger = (): StructuredLogger => 
  StructuredLogger.getInstance("DynamoDBService");