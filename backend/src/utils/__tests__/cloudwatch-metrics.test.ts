/**
 * Unit tests for CloudWatch Custom Metrics Utility
 */

import * as AWS from "aws-sdk";
import {
  CloudWatchMetrics,
  createKYCMetrics,
  createAdminMetrics,
} from "../cloudwatch-metrics";

// Mock AWS SDK
const mockPutMetricData = jest.fn();

jest.mock("aws-sdk", () => ({
  CloudWatch: jest.fn(() => ({
    putMetricData: jest.fn(() => ({
      promise: mockPutMetricData,
    })),
  })),
}));

const mockCloudWatch = {
  putMetricData: jest.fn(() => ({
    promise: mockPutMetricData,
  })),
};

// Mock structured logger
jest.mock("../structured-logger", () => ({
  StructuredLogger: {
    getInstance: jest.fn(() => ({
      logMetricPublication: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

describe("CloudWatchMetrics", () => {
  let metrics: CloudWatchMetrics;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPutMetricData.mockResolvedValue({});

    // Reset singleton instance
    (CloudWatchMetrics as any).instance = null;
    metrics = CloudWatchMetrics.getInstance("TestNamespace", "test");
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance when called multiple times", () => {
      const instance1 = CloudWatchMetrics.getInstance();
      const instance2 = CloudWatchMetrics.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should use default values when no parameters provided", () => {
      (CloudWatchMetrics as any).instance = null;
      const instance = CloudWatchMetrics.getInstance();

      expect(instance).toBeDefined();
    });
  });

  describe("publishMetric", () => {
    it("should publish a single metric with correct parameters", async () => {
      const metricData = {
        MetricName: "TestMetric",
        Value: 1,
        Unit: "Count" as AWS.CloudWatch.StandardUnit,
        Dimensions: [{ Name: "TestDimension", Value: "TestValue" }],
      };

      await metrics.publishMetric(metricData);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "TestMetric",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [
              { Name: "TestDimension", Value: "TestValue" },
              { Name: "Environment", Value: "test" },
            ],
          },
        ],
      });
    });

    it("should handle metrics without custom dimensions", async () => {
      const metricData = {
        MetricName: "TestMetric",
        Value: 5,
        Unit: "Count" as AWS.CloudWatch.StandardUnit,
      };

      await metrics.publishMetric(metricData);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "TestMetric",
            Value: 5,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });

    it("should not throw error when CloudWatch API fails", async () => {
      mockPutMetricData.mockRejectedValue(new Error("CloudWatch API Error"));

      const metricData = {
        MetricName: "TestMetric",
        Value: 1,
        Unit: "Count" as AWS.CloudWatch.StandardUnit,
      };

      await expect(metrics.publishMetric(metricData)).resolves.not.toThrow();
    });
  });

  describe("publishMetrics", () => {
    it("should publish multiple metrics in a single API call", async () => {
      const metricsData = [
        {
          MetricName: "Metric1",
          Value: 1,
          Unit: "Count" as AWS.CloudWatch.StandardUnit,
        },
        {
          MetricName: "Metric2",
          Value: 2,
          Unit: "Milliseconds" as AWS.CloudWatch.StandardUnit,
        },
      ];

      await metrics.publishMetrics(metricsData);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "Metric1",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
          {
            MetricName: "Metric2",
            Value: 2,
            Unit: "Milliseconds",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });

    it("should handle empty metrics array", async () => {
      await metrics.publishMetrics([]);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [],
      });
    });
  });

  describe("User Registration Metrics", () => {
    it("should record successful user registration", async () => {
      await metrics.recordUserRegistration(true, "entrepreneur");

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "UserRegistrationSuccess",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [
              { Name: "UserType", Value: "entrepreneur" },
              { Name: "Environment", Value: "test" },
            ],
          },
        ],
      });
    });

    it("should record failed user registration", async () => {
      await metrics.recordUserRegistration(false);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "UserRegistrationFailure",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });

    it("should record email verification", async () => {
      await metrics.recordEmailVerification(true);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "EmailVerificationSuccess",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });
  });

  describe("Authentication Metrics", () => {
    it("should record successful authentication with latency", async () => {
      await metrics.recordAuthentication(true, 250);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "AuthenticationSuccess",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
          {
            MetricName: "AuthenticationLatency",
            Value: 250,
            Unit: "Milliseconds",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });

    it("should record failed authentication without latency", async () => {
      await metrics.recordAuthentication(false);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "AuthenticationFailure",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });
  });

  describe("KYC Upload Metrics", () => {
    it("should record successful KYC upload with all metrics", async () => {
      await metrics.recordKYCUpload(true, undefined, 1500, 2048000);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "KYCUploadAttempts",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
          {
            MetricName: "KYCUploadSuccess",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
          {
            MetricName: "KYCUploadLatency",
            Value: 1500,
            Unit: "Milliseconds",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
          {
            MetricName: "KYCDocumentSize",
            Value: 2048000,
            Unit: "Bytes",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });

    it("should record failed KYC upload with error category", async () => {
      await metrics.recordKYCUpload(false, "validation");

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "KYCUploadAttempts",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
          {
            MetricName: "KYCUploadFailure",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [
              { Name: "ErrorCategory", Value: "validation" },
              { Name: "Environment", Value: "test" },
            ],
          },
        ],
      });
    });
  });

  describe("Admin Review Metrics", () => {
    it("should record successful KYC approval", async () => {
      await metrics.recordKYCReview("approve", true, 800);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "KYCApprovalSuccess",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
          {
            MetricName: "AdminReviewLatency",
            Value: 800,
            Unit: "Milliseconds",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });

    it("should record successful KYC rejection", async () => {
      await metrics.recordKYCReview("reject", true);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "KYCRejectionSuccess",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });

    it("should record failed admin review with error type", async () => {
      await metrics.recordKYCReview(
        "approve",
        false,
        undefined,
        "database_error"
      );

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "AdminReviewError",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [
              { Name: "ErrorType", Value: "database_error" },
              { Name: "Environment", Value: "test" },
            ],
          },
        ],
      });
    });
  });

  describe("System Performance Metrics", () => {
    it("should record database latency with operation", async () => {
      await metrics.recordDatabaseLatency("putItem", 45);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "DatabaseLatency",
            Value: 45,
            Unit: "Milliseconds",
            Timestamp: expect.any(Date),
            Dimensions: [
              { Name: "Operation", Value: "putItem" },
              { Name: "Environment", Value: "test" },
            ],
          },
        ],
      });
    });

    it("should record S3 upload latency with throughput calculation", async () => {
      await metrics.recordS3UploadLatency(2000, 1000000); // 2 seconds, 1MB

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "S3UploadLatency",
            Value: 2000,
            Unit: "Milliseconds",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
          {
            MetricName: "S3UploadThroughput",
            Value: 500000, // 1MB / 2s = 500KB/s
            Unit: "Bytes/Second",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });

    it("should record EventBridge latency with event type", async () => {
      await metrics.recordEventBridgeLatency("kyc_status_changed", 150);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "EventBridgeLatency",
            Value: 150,
            Unit: "Milliseconds",
            Timestamp: expect.any(Date),
            Dimensions: [
              { Name: "EventType", Value: "kyc_status_changed" },
              { Name: "Environment", Value: "test" },
            ],
          },
        ],
      });
    });
  });

  describe("Business KPI Metrics", () => {
    it("should record pending KYC documents count", async () => {
      await metrics.recordPendingKYCDocuments(25);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "PendingKYCDocuments",
            Value: 25,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });

    it("should record user conversion rate", async () => {
      await metrics.recordUserConversionRate(100, 75);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "TotalRegisteredUsers",
            Value: 100,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
          {
            MetricName: "VerifiedUsers",
            Value: 75,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
          {
            MetricName: "UserConversionRate",
            Value: 75,
            Unit: "Percent",
            Timestamp: expect.any(Date),
            Dimensions: [{ Name: "Environment", Value: "test" }],
          },
        ],
      });
    });

    it("should handle zero total users for conversion rate", async () => {
      await metrics.recordUserConversionRate(0, 0);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: "UserConversionRate",
            Value: 0,
          }),
        ]),
      });
    });
  });

  describe("Error Tracking", () => {
    it("should record application error with detailed dimensions", async () => {
      await metrics.recordError(
        "ValidationError",
        "validation",
        "KYCUpload",
        "uploadDocument"
      );

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "ApplicationError",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [
              { Name: "ErrorType", Value: "ValidationError" },
              { Name: "ErrorCategory", Value: "validation" },
              { Name: "Service", Value: "KYCUpload" },
              { Name: "Operation", Value: "uploadDocument" },
              { Name: "Environment", Value: "test" },
            ],
          },
        ],
      });
    });
  });

  describe("Health Check Metrics", () => {
    it("should record healthy service with response time", async () => {
      await metrics.recordHealthCheck("DynamoDB", true, 25);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "ServiceHealth",
            Value: 1,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [
              { Name: "Service", Value: "DynamoDB" },
              { Name: "Environment", Value: "test" },
            ],
          },
          {
            MetricName: "HealthCheckLatency",
            Value: 25,
            Unit: "Milliseconds",
            Timestamp: expect.any(Date),
            Dimensions: [
              { Name: "Service", Value: "DynamoDB" },
              { Name: "Environment", Value: "test" },
            ],
          },
        ],
      });
    });

    it("should record unhealthy service", async () => {
      await metrics.recordHealthCheck("S3", false);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "TestNamespace",
        MetricData: [
          {
            MetricName: "ServiceHealth",
            Value: 0,
            Unit: "Count",
            Timestamp: expect.any(Date),
            Dimensions: [
              { Name: "Service", Value: "S3" },
              { Name: "Environment", Value: "test" },
            ],
          },
        ],
      });
    });
  });

  describe("Factory Functions", () => {
    it("should create KYC metrics instance with correct namespace", () => {
      (CloudWatchMetrics as any).instance = null;
      const kycMetrics = createKYCMetrics();

      expect(kycMetrics).toBeInstanceOf(CloudWatchMetrics);
    });

    it("should create admin metrics instance with correct namespace", () => {
      (CloudWatchMetrics as any).instance = null;
      const adminMetrics = createAdminMetrics();

      expect(adminMetrics).toBeInstanceOf(CloudWatchMetrics);
    });
  });
});
