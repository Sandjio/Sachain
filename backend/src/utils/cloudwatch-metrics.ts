/**
 * CloudWatch Custom Metrics Utility
 * Refactored to AWS SDK v3
 */

import {
  CloudWatchClient,
  PutMetricDataCommand,
  StandardUnit,
} from "@aws-sdk/client-cloudwatch";
import { StructuredLogger } from "./structured-logger";

const cloudwatch = new CloudWatchClient({});
const logger = StructuredLogger.getInstance(
  "CloudWatchMetrics",
  process.env.ENVIRONMENT || "development"
);

export interface MetricDimension {
  Name: string;
  Value: string;
}

export interface CustomMetricData {
  MetricName: string;
  Value: number;
  Unit: StandardUnit;
  Dimensions?: MetricDimension[];
  Timestamp?: Date;
}

export interface BusinessMetrics {
  userRegistrationSuccess: number;
  userRegistrationFailure: number;
  emailVerificationSuccess: number;
  emailVerificationFailure: number;
  authenticationSuccess: number;
  authenticationFailure: number;
  authenticationLatency: number;
  kycUploadAttempts: number;
  kycUploadSuccess: number;
  kycUploadFailure: number;
  kycUploadLatency: number;
  kycDocumentSize: number;
  kycApprovalSuccess: number;
  kycRejectionSuccess: number;
  adminReviewLatency: number;
  pendingKycDocuments: number;
  databaseLatency: number;
  s3UploadLatency: number;
  eventBridgeLatency: number;
}

export class CloudWatchMetrics {
  private static instance: CloudWatchMetrics;
  private readonly namespace: string;
  private readonly environment: string;

  private constructor(
    namespace: string = "Sachain/KYC",
    environment: string = "development"
  ) {
    this.namespace = namespace;
    this.environment = environment || process.env.ENVIRONMENT || "development";
  }

  static getInstance(
    namespace?: string,
    environment?: string
  ): CloudWatchMetrics {
    if (!CloudWatchMetrics.instance) {
      CloudWatchMetrics.instance = new CloudWatchMetrics(
        namespace,
        environment
      );
    }
    return CloudWatchMetrics.instance;
  }

  /**
   * Publish a single custom metric to CloudWatch
   */
  async publishMetric(metricData: CustomMetricData): Promise<void> {
    try {
      const params = {
        Namespace: this.namespace,
        MetricData: [
          {
            MetricName: metricData.MetricName,
            Value: metricData.Value,
            Unit: metricData.Unit,
            Timestamp: metricData.Timestamp || new Date(),
            Dimensions: [
              ...(metricData.Dimensions || []),
              { Name: "Environment", Value: this.environment },
            ],
          },
        ],
      };

      await cloudwatch.send(new PutMetricDataCommand(params));

      logger.logMetricPublication(
        metricData.MetricName,
        metricData.Value,
        true
      );
    } catch (error) {
      logger.logMetricPublication(
        metricData.MetricName,
        metricData.Value,
        false,
        error as Error
      );
      // Don't throw error to avoid breaking main application flow
    }
  }

  /**
   * Publish multiple metrics in a single API call (more efficient)
   */
  async publishMetrics(metrics: CustomMetricData[]): Promise<void> {
    try {
      const metricData = metrics.map((metric) => ({
        MetricName: metric.MetricName,
        Value: metric.Value,
        Unit: metric.Unit,
        Timestamp: metric.Timestamp || new Date(),
        Dimensions: [
          ...(metric.Dimensions || []),
          { Name: "Environment", Value: this.environment },
        ],
      }));

      const params = {
        Namespace: this.namespace,
        MetricData: metricData,
      };

      await cloudwatch.send(new PutMetricDataCommand(params));

      logger.info("Multiple metrics published successfully", {
        operation: "PublishMetrics",
        metricCount: metrics.length,
        namespace: this.namespace,
      });
    } catch (error) {
      logger.error(
        "Failed to publish multiple metrics",
        {
          operation: "PublishMetrics",
          metricCount: metrics.length,
          namespace: this.namespace,
        },
        error as Error
      );
    }
  }

  // User Registration Metrics
  async recordUserRegistration(
    success: boolean,
    userType?: string
  ): Promise<void> {
    const dimensions: MetricDimension[] = [];
    if (userType) {
      dimensions.push({ Name: "UserType", Value: userType });
    }

    await this.publishMetric({
      MetricName: success
        ? "UserRegistrationSuccess"
        : "UserRegistrationFailure",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });
  }

  async recordEmailVerification(success: boolean): Promise<void> {
    await this.publishMetric({
      MetricName: success
        ? "EmailVerificationSuccess"
        : "EmailVerificationFailure",
      Value: 1,
      Unit: StandardUnit.Count,
    });
  }

  // Authentication Metrics
  async recordAuthentication(
    success: boolean,
    latency?: number
  ): Promise<void> {
    const metrics: CustomMetricData[] = [
      {
        MetricName: success ? "AuthenticationSuccess" : "AuthenticationFailure",
        Value: 1,
        Unit: StandardUnit.Count,
      },
    ];

    if (latency !== undefined) {
      metrics.push({
        MetricName: "AuthenticationLatency",
        Value: latency,
        Unit: StandardUnit.Milliseconds,
      });
    }

    await this.publishMetrics(metrics);
  }

  // KYC Upload Metrics
  async recordKYCUpload(
    success: boolean,
    errorCategory?: string,
    latency?: number,
    fileSize?: number
  ): Promise<void> {
    const metrics: CustomMetricData[] = [];

    // Upload attempt
    metrics.push({
      MetricName: "KYCUploadAttempts",
      Value: 1,
      Unit: StandardUnit.Count,
    });

    // Success/failure with error category
    const dimensions: MetricDimension[] = [];
    if (!success && errorCategory) {
      dimensions.push({ Name: "ErrorCategory", Value: errorCategory });
    }

    metrics.push({
      MetricName: success ? "KYCUploadSuccess" : "KYCUploadFailure",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });

    // Performance metrics
    if (latency !== undefined) {
      metrics.push({
        MetricName: "KYCUploadLatency",
        Value: latency,
        Unit: StandardUnit.Milliseconds,
      });
    }

    if (fileSize !== undefined) {
      metrics.push({
        MetricName: "KYCDocumentSize",
        Value: fileSize,
        Unit: StandardUnit.Bytes,
      });
    }

    await this.publishMetrics(metrics);
  }

  // Admin Review Metrics
  async recordKYCReview(
    action: "approve" | "reject",
    success: boolean,
    latency?: number,
    errorType?: string
  ): Promise<void> {
    const metrics: CustomMetricData[] = [];

    if (success) {
      metrics.push({
        MetricName:
          action === "approve" ? "KYCApprovalSuccess" : "KYCRejectionSuccess",
        Value: 1,
        Unit: StandardUnit.Count,
      });
    } else {
      const dimensions: MetricDimension[] = [];
      if (errorType) {
        dimensions.push({ Name: "ErrorType", Value: errorType });
      }

      metrics.push({
        MetricName: "AdminReviewError",
        Value: 1,
        Unit: StandardUnit.Count,
        Dimensions: dimensions,
      });
    }

    if (latency !== undefined) {
      metrics.push({
        MetricName: "AdminReviewLatency",
        Value: latency,
        Unit: StandardUnit.Milliseconds,
      });
    }

    await this.publishMetrics(metrics);
  }

  // System Performance Metrics
  async recordDatabaseLatency(
    operation: string,
    latency: number
  ): Promise<void> {
    await this.publishMetric({
      MetricName: "DatabaseLatency",
      Value: latency,
      Unit: StandardUnit.Milliseconds,
      Dimensions: [{ Name: "Operation", Value: operation }],
    });
  }

  async recordS3UploadLatency(
    latency: number,
    fileSize?: number
  ): Promise<void> {
    const metrics: CustomMetricData[] = [
      {
        MetricName: "S3UploadLatency",
        Value: latency,
        Unit: StandardUnit.Milliseconds,
      },
    ];

    if (fileSize !== undefined) {
      metrics.push({
        MetricName: "S3UploadThroughput",
        Value: fileSize / (latency / 1000), // bytes per second
        Unit: StandardUnit.Bytes_Second,
      });
    }

    await this.publishMetrics(metrics);
  }

  async recordEventBridgeLatency(
    eventType: string,
    latency: number
  ): Promise<void> {
    await this.publishMetric({
      MetricName: "EventBridgeLatency",
      Value: latency,
      Unit: StandardUnit.Milliseconds,
      Dimensions: [{ Name: "EventType", Value: eventType }],
    });
  }

  // Enhanced EventBridge Metrics for Upload Lambda
  async recordEventBridgePublishing(
    eventType: string,
    success: boolean,
    latency?: number,
    errorCategory?: string
  ): Promise<void> {
    const metrics: CustomMetricData[] = [];

    // Publishing attempt
    metrics.push({
      MetricName: "EventBridgePublishAttempts",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: [{ Name: "EventType", Value: eventType }],
    });

    // Success/failure with error category
    const dimensions: MetricDimension[] = [
      { Name: "EventType", Value: eventType },
    ];
    if (!success && errorCategory) {
      dimensions.push({ Name: "ErrorCategory", Value: errorCategory });
    }

    metrics.push({
      MetricName: success
        ? "EventBridgePublishSuccess"
        : "EventBridgePublishFailure",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });

    // Publishing latency
    if (latency !== undefined) {
      metrics.push({
        MetricName: "EventBridgePublishLatency",
        Value: latency,
        Unit: StandardUnit.Milliseconds,
        Dimensions: [{ Name: "EventType", Value: eventType }],
      });
    }

    await this.publishMetrics(metrics);
  }

  // File Size Distribution Metrics
  async recordFileSizeDistribution(
    fileSize: number,
    documentType: string
  ): Promise<void> {
    const sizeCategory = this.categorizeFileSize(fileSize);

    await this.publishMetrics([
      {
        MetricName: "FileSizeDistribution",
        Value: 1,
        Unit: StandardUnit.Count,
        Dimensions: [
          { Name: "SizeCategory", Value: sizeCategory },
          { Name: "DocumentType", Value: documentType },
        ],
      },
      {
        MetricName: "FileSize",
        Value: fileSize,
        Unit: StandardUnit.Bytes,
        Dimensions: [{ Name: "DocumentType", Value: documentType }],
      },
    ]);
  }

  // Upload Duration Metrics with percentiles
  async recordUploadDuration(
    duration: number,
    documentType: string,
    fileSize?: number
  ): Promise<void> {
    const metrics: CustomMetricData[] = [
      {
        MetricName: "UploadDuration",
        Value: duration,
        Unit: StandardUnit.Milliseconds,
        Dimensions: [{ Name: "DocumentType", Value: documentType }],
      },
    ];

    // Add throughput metric if file size is available
    if (fileSize !== undefined && duration > 0) {
      const throughput = fileSize / (duration / 1000); // bytes per second
      metrics.push({
        MetricName: "UploadThroughput",
        Value: throughput,
        Unit: StandardUnit.Bytes_Second,
        Dimensions: [{ Name: "DocumentType", Value: documentType }],
      });
    }

    await this.publishMetrics(metrics);
  }

  // Upload Success Rate Metrics
  async recordUploadSuccessRate(
    success: boolean,
    documentType: string,
    errorCategory?: string,
    duration?: number,
    fileSize?: number
  ): Promise<void> {
    const metrics: CustomMetricData[] = [];

    // Basic success/failure count
    const dimensions: MetricDimension[] = [
      { Name: "DocumentType", Value: documentType },
    ];
    if (!success && errorCategory) {
      dimensions.push({ Name: "ErrorCategory", Value: errorCategory });
    }

    metrics.push({
      MetricName: success ? "UploadSuccess" : "UploadFailure",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });

    // Duration metrics
    if (duration !== undefined) {
      metrics.push({
        MetricName: "UploadDuration",
        Value: duration,
        Unit: StandardUnit.Milliseconds,
        Dimensions: [{ Name: "DocumentType", Value: documentType }],
      });
    }

    // File size metrics
    if (fileSize !== undefined) {
      metrics.push({
        MetricName: "UploadedFileSize",
        Value: fileSize,
        Unit: StandardUnit.Bytes,
        Dimensions: [{ Name: "DocumentType", Value: documentType }],
      });
    }

    await this.publishMetrics(metrics);
  }

  private categorizeFileSize(fileSize: number): string {
    if (fileSize < 100 * 1024) return "Small"; // < 100KB
    if (fileSize < 1024 * 1024) return "Medium"; // < 1MB
    if (fileSize < 5 * 1024 * 1024) return "Large"; // < 5MB
    return "XLarge"; // >= 5MB
  }

  // Business KPI Metrics
  async recordPendingKYCDocuments(count: number): Promise<void> {
    await this.publishMetric({
      MetricName: "PendingKYCDocuments",
      Value: count,
      Unit: StandardUnit.Count,
    });
  }

  async recordKYCProcessingTime(processingTime: number): Promise<void> {
    await this.publishMetric({
      MetricName: "KYCProcessingTime",
      Value: processingTime,
      Unit: StandardUnit.Seconds,
    });
  }

  async recordUserConversionRate(
    totalUsers: number,
    verifiedUsers: number
  ): Promise<void> {
    const conversionRate =
      totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;

    await this.publishMetrics([
      {
        MetricName: "TotalRegisteredUsers",
        Value: totalUsers,
        Unit: StandardUnit.Count,
      },
      {
        MetricName: "VerifiedUsers",
        Value: verifiedUsers,
        Unit: StandardUnit.Count,
      },
      {
        MetricName: "UserConversionRate",
        Value: conversionRate,
        Unit: StandardUnit.Percent,
      },
    ]);
  }

  // Error tracking with detailed categorization
  async recordError(
    errorType: string,
    errorCategory: "validation" | "system" | "rate_limit" | "authorization",
    service: string,
    operation: string
  ): Promise<void> {
    await this.publishMetric({
      MetricName: "ApplicationError",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: [
        { Name: "ErrorType", Value: errorType },
        { Name: "ErrorCategory", Value: errorCategory },
        { Name: "Service", Value: service },
        { Name: "Operation", Value: operation },
      ],
    });
  }

  // Health check metrics
  async recordHealthCheck(
    service: string,
    healthy: boolean,
    responseTime?: number
  ): Promise<void> {
    const metrics: CustomMetricData[] = [
      {
        MetricName: "ServiceHealth",
        Value: healthy ? 1 : 0,
        Unit: StandardUnit.Count,
        Dimensions: [{ Name: "Service", Value: service }],
      },
    ];

    if (responseTime !== undefined) {
      metrics.push({
        MetricName: "HealthCheckLatency",
        Value: responseTime,
        Unit: StandardUnit.Milliseconds,
        Dimensions: [{ Name: "Service", Value: service }],
      });
    }

    await this.publishMetrics(metrics);
  }
}

// Factory functions
export const createKYCMetrics = (): CloudWatchMetrics =>
  CloudWatchMetrics.getInstance("Sachain/KYCUpload");

export const createAdminMetrics = (): CloudWatchMetrics =>
  CloudWatchMetrics.getInstance("Sachain/AdminReview");

export const createAuthMetrics = (): CloudWatchMetrics =>
  CloudWatchMetrics.getInstance("Sachain/Authentication");

export const createSystemMetrics = (): CloudWatchMetrics =>
  CloudWatchMetrics.getInstance("Sachain/System");
