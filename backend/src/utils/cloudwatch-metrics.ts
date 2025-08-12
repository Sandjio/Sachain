/**
 * CloudWatch Custom Metrics Utility
 * Provides standardized metric publishing for business KPIs and operational metrics
 */

import * as AWS from "aws-sdk";
import { StructuredLogger } from "./structured-logger";

const cloudwatch = new AWS.CloudWatch();
const logger = StructuredLogger.getInstance("CloudWatchMetrics");

export interface MetricDimension {
  Name: string;
  Value: string;
}

export interface CustomMetricData {
  MetricName: string;
  Value: number;
  Unit: AWS.CloudWatch.StandardUnit;
  Dimensions?: MetricDimension[];
  Timestamp?: Date;
}

export interface BusinessMetrics {
  // User registration metrics
  userRegistrationSuccess: number;
  userRegistrationFailure: number;
  emailVerificationSuccess: number;
  emailVerificationFailure: number;

  // Authentication metrics
  authenticationSuccess: number;
  authenticationFailure: number;
  authenticationLatency: number;

  // KYC Upload metrics
  kycUploadAttempts: number;
  kycUploadSuccess: number;
  kycUploadFailure: number;
  kycUploadLatency: number;
  kycDocumentSize: number;

  // Admin Review metrics
  kycApprovalSuccess: number;
  kycRejectionSuccess: number;
  adminReviewLatency: number;
  pendingKycDocuments: number;

  // System performance metrics
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

      await cloudwatch.putMetricData(params).promise();

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

      await cloudwatch.putMetricData(params).promise();

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
      Unit: "Count",
      Dimensions: dimensions,
    });
  }

  async recordEmailVerification(success: boolean): Promise<void> {
    await this.publishMetric({
      MetricName: success
        ? "EmailVerificationSuccess"
        : "EmailVerificationFailure",
      Value: 1,
      Unit: "Count",
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
        Unit: "Count",
      },
    ];

    if (latency !== undefined) {
      metrics.push({
        MetricName: "AuthenticationLatency",
        Value: latency,
        Unit: "Milliseconds",
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
      Unit: "Count",
    });

    // Success/failure with error category
    const dimensions: MetricDimension[] = [];
    if (!success && errorCategory) {
      dimensions.push({ Name: "ErrorCategory", Value: errorCategory });
    }

    metrics.push({
      MetricName: success ? "KYCUploadSuccess" : "KYCUploadFailure",
      Value: 1,
      Unit: "Count",
      Dimensions: dimensions,
    });

    // Performance metrics
    if (latency !== undefined) {
      metrics.push({
        MetricName: "KYCUploadLatency",
        Value: latency,
        Unit: "Milliseconds",
      });
    }

    if (fileSize !== undefined) {
      metrics.push({
        MetricName: "KYCDocumentSize",
        Value: fileSize,
        Unit: "Bytes",
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
        Unit: "Count",
      });
    } else {
      const dimensions: MetricDimension[] = [];
      if (errorType) {
        dimensions.push({ Name: "ErrorType", Value: errorType });
      }

      metrics.push({
        MetricName: "AdminReviewError",
        Value: 1,
        Unit: "Count",
        Dimensions: dimensions,
      });
    }

    if (latency !== undefined) {
      metrics.push({
        MetricName: "AdminReviewLatency",
        Value: latency,
        Unit: "Milliseconds",
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
      Unit: "Milliseconds",
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
        Unit: "Milliseconds",
      },
    ];

    if (fileSize !== undefined) {
      metrics.push({
        MetricName: "S3UploadThroughput",
        Value: fileSize / (latency / 1000), // bytes per second
        Unit: "Bytes/Second",
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
      Unit: "Milliseconds",
      Dimensions: [{ Name: "EventType", Value: eventType }],
    });
  }

  // Business KPI Metrics
  async recordPendingKYCDocuments(count: number): Promise<void> {
    await this.publishMetric({
      MetricName: "PendingKYCDocuments",
      Value: count,
      Unit: "Count",
    });
  }

  async recordKYCProcessingTime(processingTime: number): Promise<void> {
    await this.publishMetric({
      MetricName: "KYCProcessingTime",
      Value: processingTime,
      Unit: "Seconds",
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
        Unit: "Count",
      },
      {
        MetricName: "VerifiedUsers",
        Value: verifiedUsers,
        Unit: "Count",
      },
      {
        MetricName: "UserConversionRate",
        Value: conversionRate,
        Unit: "Percent",
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
      Unit: "Count",
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
        Unit: "Count",
        Dimensions: [{ Name: "Service", Value: service }],
      },
    ];

    if (responseTime !== undefined) {
      metrics.push({
        MetricName: "HealthCheckLatency",
        Value: responseTime,
        Unit: "Milliseconds",
        Dimensions: [{ Name: "Service", Value: service }],
      });
    }

    await this.publishMetrics(metrics);
  }
}

// Factory functions for different services
export const createKYCMetrics = (): CloudWatchMetrics =>
  CloudWatchMetrics.getInstance("Sachain/KYCUpload");

export const createAdminMetrics = (): CloudWatchMetrics =>
  CloudWatchMetrics.getInstance("Sachain/AdminReview");

export const createAuthMetrics = (): CloudWatchMetrics =>
  CloudWatchMetrics.getInstance("Sachain/Authentication");

export const createSystemMetrics = (): CloudWatchMetrics =>
  CloudWatchMetrics.getInstance("Sachain/System");
