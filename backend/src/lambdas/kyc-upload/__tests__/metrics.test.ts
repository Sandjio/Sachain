import { handler } from "../index";
import { KYCUploadEvent, DirectUploadRequest } from "../types";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { APIGatewayProxyResult } from "aws-lambda";

// Mock AWS SDK clients
const dynamoMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);
const cloudWatchMock = mockClient(CloudWatchClient);

// Mock EventPublisher
jest.mock("../../kyc-processing/event-publisher", () => ({
  EventPublisher: jest.fn().mockImplementation(() => ({
    publishKYCUploadEvent: jest.fn().mockResolvedValue({
      success: true,
      eventId: "mock-event-id",
    }),
  })),
}));

// Mock uuid
jest.mock("uuid", () => ({
  v4: jest.fn().mockReturnValue("mock-document-id"),
}));

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

describe("KYC Upload Lambda - Enhanced Metrics", () => {
  beforeEach(() => {
    // Reset all mocks
    dynamoMock.reset();
    s3Mock.reset();
    cloudWatchMock.reset();
    jest.clearAllMocks();

    // Set environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.BUCKET_NAME = "test-bucket";
    process.env.EVENT_BUS_NAME = "test-event-bus";
    process.env.ENVIRONMENT = "test";
    process.env.AWS_REGION = "us-east-1";

    // Reset CloudWatch metrics singleton to use test environment
    const { CloudWatchMetrics } = require("../../../utils/cloudwatch-metrics");
    (CloudWatchMetrics as any).instance = null;

    // Setup default mocks
    dynamoMock.on(PutCommand).resolves({});
    s3Mock.on(PutObjectCommand).resolves({ ETag: "mock-etag" });
    cloudWatchMock.on(PutMetricDataCommand).resolves({});
  });

  describe("Upload Success Metrics", () => {
    it("should record comprehensive upload success metrics", async () => {
      // Create valid JPEG content
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.alloc(500 * 1024, "a"), // 500KB file
      ]).toString("base64");

      const request: DirectUploadRequest = {
        documentType: "passport",
        fileName: "passport.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent,
      };

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: { requestId: "test-request-id" } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify(request),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);

      // Verify CloudWatch metrics were published
      const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
      expect(metricCalls.length).toBeGreaterThan(0);

      // Check for specific metrics
      const allMetrics = metricCalls.flatMap(
        (call) => call.args[0].input.MetricData || []
      );

      // Upload success metrics
      expect(
        allMetrics.some((metric) => metric.MetricName === "UploadSuccess")
      ).toBe(true);
      expect(
        allMetrics.some((metric) => metric.MetricName === "UploadDuration")
      ).toBe(true);
      expect(
        allMetrics.some((metric) => metric.MetricName === "UploadedFileSize")
      ).toBe(true);

      // File size distribution metrics
      expect(
        allMetrics.some(
          (metric) => metric.MetricName === "FileSizeDistribution"
        )
      ).toBe(true);
      expect(
        allMetrics.some((metric) => metric.MetricName === "FileSize")
      ).toBe(true);

      // Upload throughput metrics
      expect(
        allMetrics.some((metric) => metric.MetricName === "UploadThroughput")
      ).toBe(true);

      // EventBridge publishing metrics
      expect(
        allMetrics.some(
          (metric) => metric.MetricName === "EventBridgePublishSuccess"
        )
      ).toBe(true);
      expect(
        allMetrics.some(
          (metric) => metric.MetricName === "EventBridgePublishLatency"
        )
      ).toBe(true);
    });

    it("should categorize file sizes correctly", async () => {
      const testCases = [
        { size: 50 * 1024, expectedCategory: "Small" }, // 50KB
        { size: 500 * 1024, expectedCategory: "Medium" }, // 500KB
        { size: 3 * 1024 * 1024, expectedCategory: "Large" }, // 3MB
        { size: 8 * 1024 * 1024, expectedCategory: "XLarge" }, // 8MB
      ];

      for (const testCase of testCases) {
        // Reset mocks for each test case
        cloudWatchMock.reset();

        const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
        const fileContent = Buffer.concat([
          jpegHeader,
          Buffer.alloc(testCase.size - 4, "a"),
        ]).toString("base64");

        const request: DirectUploadRequest = {
          documentType: "national_id",
          fileName: "id.jpg",
          contentType: "image/jpeg",
          userId: "user123",
          fileContent,
        };

        const event: KYCUploadEvent = {
          path: "/upload",
          httpMethod: "POST",
          headers: {},
          multiValueHeaders: {},
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          pathParameters: null,
          stageVariables: null,
          requestContext: { requestId: "test-request-id" } as any,
          resource: "",
          isBase64Encoded: false,
          body: JSON.stringify(request),
        };

        await handler(event, {} as any, {} as any);

        // Verify file size category was recorded correctly
        const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
        const allMetrics = metricCalls.flatMap(
          (call) => call.args[0].input.MetricData || []
        );

        const fileSizeDistributionMetric = allMetrics.find(
          (metric) => metric.MetricName === "FileSizeDistribution"
        );

        expect(fileSizeDistributionMetric).toBeDefined();
        expect(
          fileSizeDistributionMetric?.Dimensions?.some(
            (dim) =>
              dim.Name === "SizeCategory" &&
              dim.Value === testCase.expectedCategory
          )
        ).toBe(true);
      }
    });

    it("should record metrics with correct document type dimensions", async () => {
      const documentTypes = [
        "passport",
        "driver_license",
        "national_id",
        "utility_bill",
      ];

      for (const documentType of documentTypes) {
        // Reset mocks for each test case
        cloudWatchMock.reset();

        const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
        const fileContent = Buffer.concat([
          jpegHeader,
          Buffer.from("mock content"),
        ]).toString("base64");

        const request: DirectUploadRequest = {
          documentType: documentType as any,
          fileName: "document.jpg",
          contentType: "image/jpeg",
          userId: "user123",
          fileContent,
        };

        const event: KYCUploadEvent = {
          path: "/upload",
          httpMethod: "POST",
          headers: {},
          multiValueHeaders: {},
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          pathParameters: null,
          stageVariables: null,
          requestContext: { requestId: "test-request-id" } as any,
          resource: "",
          isBase64Encoded: false,
          body: JSON.stringify(request),
        };

        await handler(event, {} as any, {} as any);

        // Verify document type dimension was recorded correctly
        const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
        const allMetrics = metricCalls.flatMap(
          (call) => call.args[0].input.MetricData || []
        );

        const uploadSuccessMetric = allMetrics.find(
          (metric) => metric.MetricName === "UploadSuccess"
        );

        expect(uploadSuccessMetric).toBeDefined();
        expect(
          uploadSuccessMetric?.Dimensions?.some(
            (dim) => dim.Name === "DocumentType" && dim.Value === documentType
          )
        ).toBe(true);
      }
    });
  });

  describe("Upload Failure Metrics", () => {
    it("should record upload failure metrics with error categories", async () => {
      // Mock S3 to fail
      s3Mock.on(PutObjectCommand).rejects(new Error("S3 upload failed"));

      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.from("mock content"),
      ]).toString("base64");

      const request: DirectUploadRequest = {
        documentType: "passport",
        fileName: "passport.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent,
      };

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: { requestId: "test-request-id" } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify(request),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);

      // Verify failure metrics were recorded
      const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
      const allMetrics = metricCalls.flatMap(
        (call) => call.args[0].input.MetricData || []
      );

      expect(
        allMetrics.some((metric) => metric.MetricName === "UploadFailure")
      ).toBe(true);
      expect(
        allMetrics.some((metric) => metric.MetricName === "KYCUploadFailure")
      ).toBe(true);

      // Check for error category dimension
      const uploadFailureMetric = allMetrics.find(
        (metric) => metric.MetricName === "UploadFailure"
      );
      expect(
        uploadFailureMetric?.Dimensions?.some(
          (dim) => dim.Name === "ErrorCategory"
        )
      ).toBe(true);
    });

    it("should record validation failure metrics", async () => {
      const request = {
        documentType: "invalid_type",
        fileName: "document.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent: "invalid-base64",
      };

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: { requestId: "test-request-id" } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify(request),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      // Verify validation failure metrics were recorded
      const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
      const allMetrics = metricCalls.flatMap(
        (call) => call.args[0].input.MetricData || []
      );

      expect(
        allMetrics.some((metric) => metric.MetricName === "UploadFailure")
      ).toBe(true);
    });
  });

  describe("EventBridge Publishing Metrics", () => {
    it("should record EventBridge publishing success metrics", async () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.from("mock content"),
      ]).toString("base64");

      const request: DirectUploadRequest = {
        documentType: "passport",
        fileName: "passport.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent,
      };

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: { requestId: "test-request-id" } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify(request),
      };

      await handler(event, {} as any, {} as any);

      // Verify EventBridge publishing metrics
      const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
      const allMetrics = metricCalls.flatMap(
        (call) => call.args[0].input.MetricData || []
      );

      expect(
        allMetrics.some(
          (metric) => metric.MetricName === "EventBridgePublishAttempts"
        )
      ).toBe(true);
      expect(
        allMetrics.some(
          (metric) => metric.MetricName === "EventBridgePublishSuccess"
        )
      ).toBe(true);
      expect(
        allMetrics.some(
          (metric) => metric.MetricName === "EventBridgePublishLatency"
        )
      ).toBe(true);

      // Check for event type dimension
      const publishSuccessMetric = allMetrics.find(
        (metric) => metric.MetricName === "EventBridgePublishSuccess"
      );
      expect(
        publishSuccessMetric?.Dimensions?.some(
          (dim) =>
            dim.Name === "EventType" && dim.Value === "kyc_document_uploaded"
        )
      ).toBe(true);
    });

    it("should record EventBridge publishing failure metrics", async () => {
      // Mock EventBridge publishing to fail
      const mockEventPublisher = require("../../kyc-processing/event-publisher");
      mockEventPublisher.EventPublisher.mockImplementation(() => ({
        publishKYCUploadEvent: jest
          .fn()
          .mockRejectedValue(new Error("EventBridge publishing failed")),
      }));

      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.from("mock content"),
      ]).toString("base64");

      const request: DirectUploadRequest = {
        documentType: "passport",
        fileName: "passport.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent,
      };

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: { requestId: "test-request-id" } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify(request),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      // Upload should still succeed even if EventBridge fails
      expect(result.statusCode).toBe(200);

      // Verify EventBridge failure metrics were recorded
      const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
      const allMetrics = metricCalls.flatMap(
        (call) => call.args[0].input.MetricData || []
      );

      expect(
        allMetrics.some(
          (metric) => metric.MetricName === "EventBridgePublishAttempts"
        )
      ).toBe(true);
      expect(
        allMetrics.some(
          (metric) => metric.MetricName === "EventBridgePublishFailure"
        )
      ).toBe(true);
      expect(
        allMetrics.some(
          (metric) => metric.MetricName === "EventBridgePublishLatency"
        )
      ).toBe(true);

      // Check for error category dimension
      const publishFailureMetric = allMetrics.find(
        (metric) => metric.MetricName === "EventBridgePublishFailure"
      );
      expect(
        publishFailureMetric?.Dimensions?.some(
          (dim) => dim.Name === "ErrorCategory"
        )
      ).toBe(true);
    });
  });

  describe("Performance Metrics", () => {
    it("should record upload duration and throughput metrics", async () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileSize = 2 * 1024 * 1024; // 2MB
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.alloc(fileSize - 4, "a"),
      ]).toString("base64");

      const request: DirectUploadRequest = {
        documentType: "passport",
        fileName: "passport.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent,
      };

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: { requestId: "test-request-id" } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify(request),
      };

      await handler(event, {} as any, {} as any);

      // Verify performance metrics were recorded
      const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
      const allMetrics = metricCalls.flatMap(
        (call) => call.args[0].input.MetricData || []
      );

      expect(
        allMetrics.some((metric) => metric.MetricName === "UploadDuration")
      ).toBe(true);
      expect(
        allMetrics.some((metric) => metric.MetricName === "UploadThroughput")
      ).toBe(true);
      expect(
        allMetrics.some((metric) => metric.MetricName === "S3UploadLatency")
      ).toBe(true);
      expect(
        allMetrics.some((metric) => metric.MetricName === "DatabaseLatency")
      ).toBe(true);

      // Verify throughput calculation
      const throughputMetric = allMetrics.find(
        (metric) => metric.MetricName === "UploadThroughput"
      );
      expect(throughputMetric).toBeDefined();
      expect(throughputMetric?.Value).toBeGreaterThan(0);
    });
  });

  describe("Metric Dimensions and Environment", () => {
    it("should include environment dimension in all metrics", async () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.from("mock content"),
      ]).toString("base64");

      const request: DirectUploadRequest = {
        documentType: "passport",
        fileName: "passport.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent,
      };

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: { requestId: "test-request-id" } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify(request),
      };

      await handler(event, {} as any, {} as any);

      // Verify all metrics include environment dimension
      const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
      const allMetrics = metricCalls.flatMap(
        (call) => call.args[0].input.MetricData || []
      );

      allMetrics.forEach((metric) => {
        expect(
          metric.Dimensions?.some(
            (dim) => dim.Name === "Environment" && dim.Value === "test"
          )
        ).toBe(true);
      });
    });

    it("should use correct namespace for metrics", async () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.from("mock content"),
      ]).toString("base64");

      const request: DirectUploadRequest = {
        documentType: "passport",
        fileName: "passport.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent,
      };

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: { requestId: "test-request-id" } as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify(request),
      };

      await handler(event, {} as any, {} as any);

      // Verify correct namespace is used
      const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
      metricCalls.forEach((call) => {
        expect(call.args[0].input.Namespace).toBe("Sachain/KYCUpload");
      });
    });
  });
});
