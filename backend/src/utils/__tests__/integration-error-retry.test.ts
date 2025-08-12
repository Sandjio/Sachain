/**
 * Integration tests for X-Ray tracing with error handling and retry logic
 */

import * as AWSXRay from "aws-xray-sdk-core";
import { XRayTracer } from "../xray-tracing";
import { CloudWatchMetrics } from "../cloudwatch-metrics";
import { StructuredLogger } from "../structured-logger";

// Mock AWS X-Ray SDK
jest.mock("aws-xray-sdk-core", () => ({
  captureAWS: jest.fn((aws) => aws),
  getSegment: jest.fn(),
  setSegment: jest.fn(),
  config: jest.fn(),
  middleware: {
    setSamplingRules: jest.fn(),
  },
  plugins: {
    ECSPlugin: "ECSPlugin",
    EC2Plugin: "EC2Plugin",
  },
  Segment: jest.fn(),
}));

// Mock CloudWatch Metrics
jest.mock("../cloudwatch-metrics", () => ({
  CloudWatchMetrics: {
    getInstance: jest.fn(() => ({
      recordKYCUpload: jest.fn(),
      recordError: jest.fn(),
      recordDatabaseLatency: jest.fn(),
    })),
  },
}));

// Mock structured logger
jest.mock("../structured-logger", () => ({
  StructuredLogger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      logOperationStart: jest.fn(),
      logOperationSuccess: jest.fn(),
      logOperationError: jest.fn(),
      logRetryAttempt: jest.fn(),
    })),
  },
}));

describe("X-Ray Integration with Error Handling and Retry Logic", () => {
  let tracer: XRayTracer;
  let metrics: CloudWatchMetrics;
  let logger: StructuredLogger;
  let mockSegment: any;
  let mockSubsegment: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instances
    (XRayTracer as any).instance = null;
    (CloudWatchMetrics as any).instance = null;

    // Create mock segment and subsegment
    mockSubsegment = {
      id: "subsegment-123",
      start_time: Date.now() / 1000,
      addMetadata: jest.fn(),
      addAnnotation: jest.fn(),
      addError: jest.fn(),
      close: jest.fn(),
    };

    mockSegment = {
      trace_id: "trace-123",
      id: "segment-123",
      addNewSubsegment: jest.fn(() => mockSubsegment),
      addAnnotation: jest.fn(),
      addMetadata: jest.fn(),
      close: jest.fn(),
    };

    (AWSXRay.getSegment as jest.Mock).mockReturnValue(mockSegment);

    tracer = XRayTracer.getInstance("IntegrationTestService", "test");
    metrics = CloudWatchMetrics.getInstance("TestNamespace", "test");
    logger = StructuredLogger.getInstance("IntegrationTest", "test");
  });

  describe("KYC Upload with Tracing and Metrics", () => {
    it("should trace successful KYC upload with metrics and logging", async () => {
      const mockS3Upload = jest.fn().mockResolvedValue({ ETag: "etag123" });
      const mockDynamoWrite = jest.fn().mockResolvedValue({ Attributes: {} });

      const uploadKYCDocument = async () => {
        // Simulate KYC upload operation
        const s3Result = await tracer.traceS3Operation(
          "PutObject",
          "kyc-documents",
          "user123/document.pdf",
          mockS3Upload,
          { userId: "user123", documentId: "doc123" }
        );

        const dbResult = await tracer.traceDynamoDBOperation(
          "PutItem",
          "kyc-table",
          { userId: "user123", documentId: "doc123" },
          mockDynamoWrite,
          { userId: "user123", documentId: "doc123" }
        );

        return { s3Result, dbResult };
      };

      const result = await tracer.traceBusinessOperation(
        "UploadKYCDocument",
        uploadKYCDocument,
        {
          operation: "UploadKYCDocument",
          service: "KYCService",
          userId: "user123",
          documentId: "doc123",
        },
        { priority: "high", fileSize: 2048000 }
      );

      // Verify tracing
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "UploadKYCDocument"
      );
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith("S3-PutObject");
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "DynamoDB-PutItem"
      );

      // Verify annotations
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "businessLogic",
        true
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "priority",
        "high"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "fileSize",
        2048000
      );

      // Verify operations were called
      expect(mockS3Upload).toHaveBeenCalled();
      expect(mockDynamoWrite).toHaveBeenCalled();

      // Verify result
      expect(result.s3Result).toEqual({ ETag: "etag123" });
      expect(result.dbResult).toEqual({ Attributes: {} });
    });

    it("should handle errors with proper tracing and metrics", async () => {
      const s3Error = new Error("S3 upload failed");
      const mockS3Upload = jest.fn().mockRejectedValue(s3Error);

      const uploadKYCDocument = async () => {
        await tracer.traceS3Operation(
          "PutObject",
          "kyc-documents",
          "user123/document.pdf",
          mockS3Upload,
          { userId: "user123", documentId: "doc123" }
        );
      };

      await expect(
        tracer.traceBusinessOperation("UploadKYCDocument", uploadKYCDocument, {
          operation: "UploadKYCDocument",
          service: "KYCService",
          userId: "user123",
          documentId: "doc123",
        })
      ).rejects.toThrow("S3 upload failed");

      // Verify error tracing
      expect(mockSubsegment.addError).toHaveBeenCalledWith(s3Error);
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "success",
        false
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith("error", true);
      expect(mockSubsegment.close).toHaveBeenCalledWith(s3Error);
    });
  });

  describe("Retry Logic with Tracing", () => {
    it("should trace retry attempts with exponential backoff", async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return Promise.resolve("success");
      });

      const retryWithBackoff = async (
        operation: () => Promise<any>,
        maxRetries: number = 3
      ) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await tracer.traceOperation(
              `RetryAttempt-${attempt}`,
              {
                operation: "RetryOperation",
                service: "RetryService",
                attempt,
                maxRetries,
              },
              operation,
              { attempt, maxRetries }
            );
          } catch (error) {
            if (attempt === maxRetries) {
              throw error;
            }

            // Add delay for exponential backoff (mocked in test)
            const delay = Math.pow(2, attempt) * 100;
            await new Promise((resolve) => setTimeout(resolve, 0)); // Mock delay

            logger.logRetryAttempt(
              "RetryOperation",
              attempt,
              maxRetries,
              delay,
              error as Error,
              { userId: "user123" }
            );
          }
        }
      };

      const result = await retryWithBackoff(mockOperation);

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(3);

      // Verify multiple subsegments were created for retry attempts
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "RetryAttempt-1"
      );
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "RetryAttempt-2"
      );
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "RetryAttempt-3"
      );
    });
  });

  describe("Complex Business Flow Tracing", () => {
    it("should trace complex KYC approval workflow", async () => {
      const mockGetDocument = jest.fn().mockResolvedValue({
        Item: { userId: "user123", status: "pending" },
      });
      const mockUpdateStatus = jest.fn().mockResolvedValue({ Attributes: {} });
      const mockPublishEvent = jest
        .fn()
        .mockResolvedValue({ MessageId: "msg123" });
      const mockSendNotification = jest
        .fn()
        .mockResolvedValue({ MessageId: "notif123" });

      const approveKYCDocument = async () => {
        // Step 1: Get document
        const document = await tracer.traceDynamoDBOperation(
          "GetItem",
          "kyc-table",
          { userId: "user123", documentId: "doc123" },
          mockGetDocument,
          { userId: "user123", documentId: "doc123" }
        );

        // Step 2: Update status
        const updateResult = await tracer.traceDynamoDBOperation(
          "UpdateItem",
          "kyc-table",
          { userId: "user123", documentId: "doc123" },
          mockUpdateStatus,
          { userId: "user123", documentId: "doc123" }
        );

        // Step 3: Publish event
        const eventResult = await tracer.traceEventBridgeOperation(
          "PutEvents",
          "kyc-events",
          "KYCApproved",
          mockPublishEvent,
          { userId: "user123", documentId: "doc123" }
        );

        // Step 4: Send notification
        const notificationResult = await tracer.traceSNSOperation(
          "Publish",
          "arn:aws:sns:us-east-1:123456789012:kyc-notifications",
          mockSendNotification,
          { userId: "user123", documentId: "doc123" }
        );

        return { document, updateResult, eventResult, notificationResult };
      };

      const result = await tracer.traceBusinessOperation(
        "ApproveKYCDocument",
        approveKYCDocument,
        {
          operation: "ApproveKYCDocument",
          service: "AdminService",
          userId: "user123",
          documentId: "doc123",
        },
        { adminId: "admin456", action: "approve" }
      );

      // Verify all operations were traced
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "ApproveKYCDocument"
      );
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "DynamoDB-GetItem"
      );
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "DynamoDB-UpdateItem"
      );
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "EventBridge-PutEvents"
      );
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith("SNS-Publish");

      // Verify all operations were called
      expect(mockGetDocument).toHaveBeenCalled();
      expect(mockUpdateStatus).toHaveBeenCalled();
      expect(mockPublishEvent).toHaveBeenCalled();
      expect(mockSendNotification).toHaveBeenCalled();

      // Verify result structure
      expect(result.document).toBeDefined();
      expect(result.updateResult).toBeDefined();
      expect(result.eventResult).toBeDefined();
      expect(result.notificationResult).toBeDefined();
    });
  });

  describe("Performance Monitoring Integration", () => {
    it("should combine tracing with performance metrics", async () => {
      const mockDatabaseOperation = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ Items: [] }), 100); // Simulate 100ms latency
        });
      });

      const performDatabaseQuery = async () => {
        const startTime = Date.now();

        const result = await tracer.traceDynamoDBOperation(
          "Query",
          "kyc-table",
          { userId: "user123" },
          mockDatabaseOperation,
          { userId: "user123" }
        );

        const duration = Date.now() - startTime;

        // Record performance metrics
        await metrics.recordDatabaseLatency("Query", duration);

        return result;
      };

      const result = await tracer.traceBusinessOperation(
        "QueryUserDocuments",
        performDatabaseQuery,
        {
          operation: "QueryUserDocuments",
          service: "KYCService",
          userId: "user123",
        }
      );

      expect(result).toEqual({ Items: [] });
      expect(mockDatabaseOperation).toHaveBeenCalled();

      // Verify tracing annotations include performance data
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "success",
        true
      );
      expect(mockSubsegment.addMetadata).toHaveBeenCalledWith(
        "performance",
        expect.objectContaining({
          success: true,
          duration: expect.any(Number),
        })
      );
    });
  });
});
