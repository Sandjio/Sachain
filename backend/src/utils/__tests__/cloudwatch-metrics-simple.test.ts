/**
 * Simplified unit tests for CloudWatch Custom Metrics Utility
 */

import * as AWS from "aws-sdk";
import { CloudWatchMetrics } from "../cloudwatch-metrics";

// Mock AWS SDK
const mockPutMetricData = jest.fn();
jest.mock("aws-sdk", () => ({
  CloudWatch: jest.fn(() => ({
    putMetricData: jest.fn(() => ({
      promise: mockPutMetricData,
    })),
  })),
}));

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

describe("CloudWatchMetrics - Basic Functionality", () => {
  let metrics: CloudWatchMetrics;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPutMetricData.mockResolvedValue({});

    // Reset singleton instance
    (CloudWatchMetrics as any).instance = null;
    metrics = CloudWatchMetrics.getInstance("TestNamespace", "test");
  });

  describe("Initialization", () => {
    it("should create metrics instance successfully", () => {
      expect(metrics).toBeDefined();
      expect(metrics).toBeInstanceOf(CloudWatchMetrics);
    });

    it("should be a singleton", () => {
      const instance1 = CloudWatchMetrics.getInstance();
      const instance2 = CloudWatchMetrics.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("Metric Publishing", () => {
    it("should call CloudWatch putMetricData when publishing a metric", async () => {
      const metricData = {
        MetricName: "TestMetric",
        Value: 1,
        Unit: "Count" as AWS.CloudWatch.StandardUnit,
      };

      await metrics.publishMetric(metricData);

      expect(mockPutMetricData).toHaveBeenCalled();
    });

    it("should handle CloudWatch API errors gracefully", async () => {
      mockPutMetricData.mockRejectedValue(new Error("CloudWatch API Error"));

      const metricData = {
        MetricName: "TestMetric",
        Value: 1,
        Unit: "Count" as AWS.CloudWatch.StandardUnit,
      };

      await expect(metrics.publishMetric(metricData)).resolves.not.toThrow();
    });

    it("should publish multiple metrics", async () => {
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

      expect(mockPutMetricData).toHaveBeenCalled();
    });
  });

  describe("Business Metrics", () => {
    it("should record user registration metrics", async () => {
      await metrics.recordUserRegistration(true, "entrepreneur");
      expect(mockPutMetricData).toHaveBeenCalled();
    });

    it("should record authentication metrics", async () => {
      await metrics.recordAuthentication(true, 250);
      expect(mockPutMetricData).toHaveBeenCalled();
    });

    it("should record KYC upload metrics", async () => {
      await metrics.recordKYCUpload(true, undefined, 1500, 2048000);
      expect(mockPutMetricData).toHaveBeenCalled();
    });

    it("should record admin review metrics", async () => {
      await metrics.recordKYCReview("approve", true, 800);
      expect(mockPutMetricData).toHaveBeenCalled();
    });

    it("should record system performance metrics", async () => {
      await metrics.recordDatabaseLatency("putItem", 45);
      expect(mockPutMetricData).toHaveBeenCalled();
    });

    it("should record business KPI metrics", async () => {
      await metrics.recordPendingKYCDocuments(25);
      expect(mockPutMetricData).toHaveBeenCalled();
    });

    it("should record error metrics", async () => {
      await metrics.recordError(
        "ValidationError",
        "validation",
        "KYCUpload",
        "uploadDocument"
      );
      expect(mockPutMetricData).toHaveBeenCalled();
    });

    it("should record health check metrics", async () => {
      await metrics.recordHealthCheck("DynamoDB", true, 25);
      expect(mockPutMetricData).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should not throw when CloudWatch API fails", async () => {
      mockPutMetricData.mockRejectedValue(new Error("API Error"));

      await expect(metrics.recordUserRegistration(true)).resolves.not.toThrow();
      await expect(metrics.recordAuthentication(true)).resolves.not.toThrow();
      await expect(metrics.recordKYCUpload(true)).resolves.not.toThrow();
    });
  });

  describe("Configuration", () => {
    it("should use provided namespace and environment", () => {
      (CloudWatchMetrics as any).instance = null;
      const customMetrics = CloudWatchMetrics.getInstance(
        "CustomNamespace",
        "production"
      );

      expect(customMetrics).toBeDefined();
      expect(customMetrics).toBeInstanceOf(CloudWatchMetrics);
    });

    it("should use default values when not provided", () => {
      (CloudWatchMetrics as any).instance = null;
      const defaultMetrics = CloudWatchMetrics.getInstance();

      expect(defaultMetrics).toBeDefined();
      expect(defaultMetrics).toBeInstanceOf(CloudWatchMetrics);
    });
  });
});
