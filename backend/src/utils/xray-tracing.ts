/**
 * AWS X-Ray Distributed Tracing Utility
 * Provides standardized tracing capabilities for Lambda functions
 */

import * as AWSXRay from "aws-xray-sdk-core";
import * as AWS from "aws-sdk";
import { StructuredLogger } from "./structured-logger";

// Capture AWS SDK calls
const capturedAWS = AWSXRay.captureAWS(AWS);

const logger = StructuredLogger.getInstance("XRayTracing");

export interface TraceMetadata {
  userId?: string;
  documentId?: string;
  operation: string;
  service: string;
  version?: string;
  environment?: string;
  attempt?: number;
  maxRetries?: number;
  [key: string]: any; // Allow additional properties
}

export interface CustomSegmentData {
  segmentName: string;
  metadata: TraceMetadata;
  annotations?: Record<string, string | number | boolean>;
  subsegments?: CustomSegmentData[];
}

export class XRayTracer {
  private static instance: XRayTracer;
  private readonly environment: string;
  private readonly serviceName: string;

  private constructor(
    serviceName: string,
    environment: string = "development"
  ) {
    this.serviceName = serviceName;
    this.environment = environment || process.env.ENVIRONMENT || "development";

    // Configure X-Ray
    this.configureXRay();
  }

  static getInstance(serviceName: string, environment?: string): XRayTracer {
    if (!XRayTracer.instance) {
      XRayTracer.instance = new XRayTracer(serviceName, environment);
    }
    return XRayTracer.instance;
  }

  /**
   * Configure X-Ray settings
   */
  private configureXRay(): void {
    // Set tracing config
    AWSXRay.config([AWSXRay.plugins.ECSPlugin, AWSXRay.plugins.EC2Plugin]);

    // Configure sampling rules (can be overridden by X-Ray service)
    AWSXRay.middleware.setSamplingRules({
      version: 2,
      default: {
        fixed_target: 1,
        rate: 0.1, // 10% sampling rate
      },
      rules: [
        {
          description: "KYC Upload Operations",
          service_name: "sachain-kyc-upload",
          http_method: "*",
          url_path: "/upload/*",
          fixed_target: 2,
          rate: 0.5, // 50% sampling for upload operations
        },
        {
          description: "Admin Review Operations",
          service_name: "sachain-admin-review",
          http_method: "*",
          url_path: "/admin/*",
          fixed_target: 2,
          rate: 0.8, // 80% sampling for admin operations
        },
        {
          description: "Authentication Operations",
          service_name: "sachain-auth",
          http_method: "*",
          url_path: "/auth/*",
          fixed_target: 1,
          rate: 0.3, // 30% sampling for auth operations
        },
        {
          description: "Error Traces",
          service_name: "*",
          http_method: "*",
          url_path: "*",
          fixed_target: 1,
          rate: 1.0, // 100% sampling for errors
        },
      ],
    });

    logger.info("X-Ray tracing configured", {
      operation: "ConfigureXRay",
      service: this.serviceName,
      environment: this.environment,
    });
  }

  /**
   * Create a custom subsegment for business operations
   */
  async traceOperation<T>(
    operationName: string,
    metadata: TraceMetadata,
    operation: () => Promise<T>,
    annotations?: Record<string, string | number | boolean>
  ): Promise<T> {
    const segment = AWSXRay.getSegment();

    if (!segment) {
      logger.warn(
        "No active X-Ray segment found, executing operation without tracing",
        {
          operation: operationName,
          service: this.serviceName,
        }
      );
      return await operation();
    }

    const subsegment = segment.addNewSubsegment(operationName);

    try {
      // Add metadata
      subsegment.addMetadata("business", {
        ...metadata,
        service: this.serviceName,
        environment: this.environment,
        timestamp: new Date().toISOString(),
      });

      // Add annotations for filtering
      const defaultAnnotations = {
        service: this.serviceName,
        operation: operationName,
        environment: this.environment,
        userId: metadata.userId || "unknown",
      };

      const allAnnotations = { ...defaultAnnotations, ...annotations };
      Object.entries(allAnnotations).forEach(([key, value]) => {
        subsegment.addAnnotation(key, value);
      });

      logger.debug("Starting traced operation", {
        operationName,
        traceId: (segment as any).trace_id,
        segmentId: subsegment.id,
        ...metadata,
      });

      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      // Add performance metrics
      subsegment.addMetadata("performance", {
        duration,
        success: true,
      });

      subsegment.addAnnotation("duration", duration);
      subsegment.addAnnotation("success", true);

      logger.info("Traced operation completed successfully", {
        operationName,
        duration,
        traceId: (segment as any).trace_id,
        segmentId: subsegment.id,
        ...metadata,
      });

      subsegment.close();
      return result;
    } catch (error) {
      const duration = Date.now() - subsegment.start_time * 1000;

      // Add error information
      subsegment.addError(error as Error);
      subsegment.addMetadata("error", {
        message: (error as Error).message,
        stack: (error as Error).stack,
        duration,
      });

      subsegment.addAnnotation("success", false);
      subsegment.addAnnotation("error", true);

      logger.error(
        "Traced operation failed",
        {
          operationName,
          duration,
          traceId: (segment as any).trace_id,
          segmentId: subsegment.id,
          ...metadata,
        },
        error as Error
      );

      subsegment.close(error as Error);
      throw error;
    }
  }

  /**
   * Trace AWS SDK operations
   */
  getCapturedAWS(): typeof AWS {
    return capturedAWS;
  }

  /**
   * Trace DynamoDB operations
   */
  async traceDynamoDBOperation<T>(
    operation: string,
    tableName: string,
    key: Record<string, any>,
    dbOperation: () => Promise<T>,
    metadata?: Partial<TraceMetadata>
  ): Promise<T> {
    return this.traceOperation(
      `DynamoDB-${operation}`,
      {
        operation: `DynamoDB-${operation}`,
        service: "DynamoDB",
        ...metadata,
      },
      dbOperation,
      {
        tableName,
        key: JSON.stringify(key),
        awsService: "DynamoDB",
      }
    );
  }

  /**
   * Trace S3 operations
   */
  async traceS3Operation<T>(
    operation: string,
    bucket: string,
    key: string,
    s3Operation: () => Promise<T>,
    metadata?: Partial<TraceMetadata>
  ): Promise<T> {
    return this.traceOperation(
      `S3-${operation}`,
      {
        operation: `S3-${operation}`,
        service: "S3",
        ...metadata,
      },
      s3Operation,
      {
        bucket,
        key,
        awsService: "S3",
      }
    );
  }

  /**
   * Trace EventBridge operations
   */
  async traceEventBridgeOperation<T>(
    operation: string,
    eventBusName: string,
    eventType: string,
    eventOperation: () => Promise<T>,
    metadata?: Partial<TraceMetadata>
  ): Promise<T> {
    return this.traceOperation(
      `EventBridge-${operation}`,
      {
        operation: `EventBridge-${operation}`,
        service: "EventBridge",
        ...metadata,
      },
      eventOperation,
      {
        eventBusName,
        eventType,
        awsService: "EventBridge",
      }
    );
  }

  /**
   * Trace SNS operations
   */
  async traceSNSOperation<T>(
    operation: string,
    topicArn: string,
    snsOperation: () => Promise<T>,
    metadata?: Partial<TraceMetadata>
  ): Promise<T> {
    return this.traceOperation(
      `SNS-${operation}`,
      {
        operation: `SNS-${operation}`,
        service: "SNS",
        ...metadata,
      },
      snsOperation,
      {
        topicArn,
        awsService: "SNS",
      }
    );
  }

  /**
   * Add custom annotation to current segment
   */
  addAnnotation(key: string, value: string | number | boolean): void {
    const segment = AWSXRay.getSegment();
    if (segment) {
      segment.addAnnotation(key, value);
    }
  }

  /**
   * Add custom metadata to current segment
   */
  addMetadata(namespace: string, data: Record<string, any>): void {
    const segment = AWSXRay.getSegment();
    if (segment) {
      segment.addMetadata(namespace, data);
    }
  }

  /**
   * Get current trace ID
   */
  getCurrentTraceId(): string | undefined {
    const segment = AWSXRay.getSegment();
    return (segment as any)?.trace_id;
  }

  /**
   * Get current segment ID
   */
  getCurrentSegmentId(): string | undefined {
    const segment = AWSXRay.getSegment();
    return segment?.id;
  }

  /**
   * Create a manual segment (for non-Lambda environments)
   */
  async createManualSegment<T>(
    segmentName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const segment = new AWSXRay.Segment(segmentName);

    try {
      AWSXRay.setSegment(segment);
      const result = await operation();
      segment.close();
      return result;
    } catch (error) {
      segment.close(error as Error);
      throw error;
    }
  }

  /**
   * Trace HTTP requests (for external API calls)
   */
  async traceHttpRequest<T>(
    url: string,
    method: string,
    httpOperation: () => Promise<T>,
    metadata?: Partial<TraceMetadata>
  ): Promise<T> {
    return this.traceOperation(
      `HTTP-${method}`,
      {
        operation: `HTTP-${method}`,
        service: "HTTP",
        ...metadata,
      },
      httpOperation,
      {
        url,
        method,
        requestType: "HTTP",
      }
    );
  }

  /**
   * Trace business logic operations
   */
  async traceBusinessOperation<T>(
    businessOperation: string,
    operation: () => Promise<T>,
    metadata: TraceMetadata,
    annotations?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.traceOperation(businessOperation, metadata, operation, {
      businessLogic: true,
      ...annotations,
    });
  }
}

// Factory functions for different services
export const createKYCTracer = (): XRayTracer =>
  XRayTracer.getInstance("KYCService");

export const createAdminTracer = (): XRayTracer =>
  XRayTracer.getInstance("AdminService");

export const createAuthTracer = (): XRayTracer =>
  XRayTracer.getInstance("AuthService");

export const createNotificationTracer = (): XRayTracer =>
  XRayTracer.getInstance("NotificationService");

// Export captured AWS SDK
export { capturedAWS as AWS };
