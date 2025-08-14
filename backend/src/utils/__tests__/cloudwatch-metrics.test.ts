/**
 * Unit tests for CloudWatch Custom Metrics Utility
 */

import { mockClient } from "aws-sdk-client-mock";
import {
  CloudWatchClient,
  PutMetricDataCommand,
  StandardUnit,
} from "@aws-sdk/client-cloudwatch";
import {
  CloudWatchMetrics,
  createKYCMetrics,
  createAdminMetrics,
} from "../cloudwatch-metrics";

// Mock AWS SDK v3
const cloudWatchMock = mockClient(CloudWatchClient);

// Mock console methods to avoid test output noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe("CloudWatchMetrics", () => {
  let metrics: CloudWatchMetrics;

  beforeEach(() => {
    jest.clearAllMocks();
    cloudWatchMock.reset();
    cloudWatchMock.on(PutMetricDataCommand).resolves({});

    // Reset singleton instance
    (CloudWatchMetrics as any).instance = null;
    metrics = CloudWatchMetrics.getInstance("TestNamespace", "test");
  });

  describe("publishMetric", () => {
    it("should publish a single metric with correct parameters", async () => {
      const metricData = {
        MetricName: "TestMetric",
        Value: 1,
        Unit: StandardUnit.Count,
        Dimensions: [{ Name: "TestDimension", Value: "TestValue" }],
      };

      await metrics.publishMetric(metricData);

      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      expect(
        cloudWatchMock.commandCalls(PutMetricDataCommand)[0].args[0].input
      ).toEqual({
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
        Unit: StandardUnit.Count,
      };

      await metrics.publishMetric(metricData);

      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      expect(
        cloudWatchMock.commandCalls(PutMetricDataCommand)[0].args[0].input
      ).toEqual({
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

    it("should handle CloudWatch errors gracefully", async () => {
      cloudWatchMock
        .on(PutMetricDataCommand)
        .rejects(new Error("CloudWatch error"));

      const metricData = {
        MetricName: "TestMetric",
        Value: 1,
        Unit: StandardUnit.Count,
      };

      // Should not throw error
      await expect(metrics.publishMetric(metricData)).resolves.not.toThrow();
    });
  });

  describe("publishMetrics", () => {
    it("should publish multiple metrics in a single API call", async () => {
      const metricsData = [
        {
          MetricName: "Metric1",
          Value: 1,
          Unit: StandardUnit.Count,
        },
        {
          MetricName: "Metric2",
          Value: 2,
          Unit: StandardUnit.Milliseconds,
        },
      ];

      await metrics.publishMetrics(metricsData);

      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      expect(
        cloudWatchMock.commandCalls(PutMetricDataCommand)[0].args[0].input
      ).toEqual({
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

      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      expect(
        cloudWatchMock.commandCalls(PutMetricDataCommand)[0].args[0].input
      ).toEqual({
        Namespace: "TestNamespace",
        MetricData: [],
      });
    });
  });

  describe("Enhanced Upload Metrics", () => {
    it("should record upload success rate metrics", async () => {
      await metrics.recordUploadSuccessRate(
        true,
        "passport",
        undefined,
        1000,
        500000
      );

      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      const metricData =
        cloudWatchMock.commandCalls(PutMetricDataCommand)[0].args[0].input
          .MetricData;

      expect(metricData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "UploadSuccess",
            Value: 1,
            Dimensions: expect.arrayContaining([
              { Name: "DocumentType", Value: "passport" },
              { Name: "Environment", Value: "test" },
            ]),
          }),
          expect.objectContaining({
            MetricName: "UploadDuration",
            Value: 1000,
          }),
          expect.objectContaining({
            MetricName: "UploadedFileSize",
            Value: 500000,
          }),
        ])
      );
    });

    it("should record upload failure metrics with error category", async () => {
      await metrics.recordUploadSuccessRate(
        false,
        "passport",
        "validation",
        500
      );

      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      const metricData =
        cloudWatchMock.commandCalls(PutMetricDataCommand)[0].args[0].input
          .MetricData;

      expect(metricData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "UploadFailure",
            Value: 1,
            Dimensions: expect.arrayContaining([
              { Name: "DocumentType", Value: "passport" },
              { Name: "ErrorCategory", Value: "validation" },
              { Name: "Environment", Value: "test" },
            ]),
          }),
        ])
      );
    });

    it("should record file size distribution metrics", async () => {
      await metrics.recordFileSizeDistribution(500000, "national_id"); // 500KB

      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      const metricData =
        cloudWatchMock.commandCalls(PutMetricDataCommand)[0].args[0].input
          .MetricData;

      expect(metricData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "FileSizeDistribution",
            Value: 1,
            Dimensions: expect.arrayContaining([
              { Name: "SizeCategory", Value: "Medium" },
              { Name: "DocumentType", Value: "national_id" },
              { Name: "Environment", Value: "test" },
            ]),
          }),
          expect.objectContaining({
            MetricName: "FileSize",
            Value: 500000,
            Dimensions: expect.arrayContaining([
              { Name: "DocumentType", Value: "national_id" },
              { Name: "Environment", Value: "test" },
            ]),
          }),
        ])
      );
    });

    it("should record upload duration with throughput", async () => {
      await metrics.recordUploadDuration(2000, "passport", 1000000); // 2 seconds, 1MB

      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      const metricData =
        cloudWatchMock.commandCalls(PutMetricDataCommand)[0].args[0].input
          .MetricData;

      expect(metricData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "UploadDuration",
            Value: 2000,
            Dimensions: expect.arrayContaining([
              { Name: "DocumentType", Value: "passport" },
              { Name: "Environment", Value: "test" },
            ]),
          }),
          expect.objectContaining({
            MetricName: "UploadThroughput",
            Value: 500000, // 1MB / 2 seconds = 500KB/s
            Unit: "Bytes/Second",
          }),
        ])
      );
    });

    it("should record EventBridge publishing success", async () => {
      await metrics.recordEventBridgePublishing(
        "kyc_document_uploaded",
        true,
        150
      );

      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      const metricData =
        cloudWatchMock.commandCalls(PutMetricDataCommand)[0].args[0].input
          .MetricData;

      expect(metricData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "EventBridgePublishAttempts",
            Value: 1,
            Dimensions: expect.arrayContaining([
              { Name: "EventType", Value: "kyc_document_uploaded" },
              { Name: "Environment", Value: "test" },
            ]),
          }),
          expect.objectContaining({
            MetricName: "EventBridgePublishSuccess",
            Value: 1,
          }),
          expect.objectContaining({
            MetricName: "EventBridgePublishLatency",
            Value: 150,
          }),
        ])
      );
    });

    it("should record EventBridge publishing failure", async () => {
      await metrics.recordEventBridgePublishing(
        "kyc_document_uploaded",
        false,
        200,
        "system"
      );

      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      const metricData =
        cloudWatchMock.commandCalls(PutMetricDataCommand)[0].args[0].input
          .MetricData;

      expect(metricData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "EventBridgePublishAttempts",
            Value: 1,
          }),
          expect.objectContaining({
            MetricName: "EventBridgePublishFailure",
            Value: 1,
            Dimensions: expect.arrayContaining([
              { Name: "EventType", Value: "kyc_document_uploaded" },
              { Name: "ErrorCategory", Value: "system" },
              { Name: "Environment", Value: "test" },
            ]),
          }),
          expect.objectContaining({
            MetricName: "EventBridgePublishLatency",
            Value: 200,
          }),
        ])
      );
    });
  });

  describe("Factory Functions", () => {
    it("should create KYC metrics instance with correct namespace", () => {
      const kycMetrics = createKYCMetrics();
      expect(kycMetrics).toBeInstanceOf(CloudWatchMetrics);
    });

    it("should create Admin metrics instance with correct namespace", () => {
      const adminMetrics = createAdminMetrics();
      expect(adminMetrics).toBeInstanceOf(CloudWatchMetrics);
    });
  });
});
