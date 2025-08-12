/**
 * Unit tests for X-Ray Tracing Utility
 */

import * as AWSXRay from "aws-xray-sdk-core";
import { XRayTracer, createKYCTracer } from "../xray-tracing";

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

// Mock structured logger
jest.mock("../structured-logger", () => ({
  StructuredLogger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

describe("XRayTracer", () => {
  let tracer: XRayTracer;
  let mockSegment: any;
  let mockSubsegment: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance
    (XRayTracer as any).instance = null;

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

    tracer = XRayTracer.getInstance("TestService", "test");
  });

  describe("Initialization", () => {
    it("should configure X-Ray on initialization", () => {
      expect(AWSXRay.config).toHaveBeenCalledWith([
        AWSXRay.plugins.ECSPlugin,
        AWSXRay.plugins.EC2Plugin,
      ]);

      expect(AWSXRay.middleware.setSamplingRules).toHaveBeenCalled();
    });

    it("should be a singleton", () => {
      const instance1 = XRayTracer.getInstance("TestService");
      const instance2 = XRayTracer.getInstance("TestService");

      expect(instance1).toBe(instance2);
    });
  });

  describe("traceOperation", () => {
    it("should create subsegment and trace successful operation", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");
      const metadata = {
        operation: "testOperation",
        service: "TestService",
        userId: "user123",
      };

      const result = await tracer.traceOperation(
        "TestOperation",
        metadata,
        mockOperation,
        { customAnnotation: "value" }
      );

      expect(result).toBe("success");
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "TestOperation"
      );
      expect(mockSubsegment.addMetadata).toHaveBeenCalledWith(
        "business",
        expect.objectContaining({
          operation: "testOperation",
          service: "TestService",
          userId: "user123",
          environment: "test",
        })
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "service",
        "TestService"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "customAnnotation",
        "value"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "success",
        true
      );
      expect(mockSubsegment.close).toHaveBeenCalled();
    });

    it("should handle operation errors and add error information", async () => {
      const error = new Error("Test error");
      const mockOperation = jest.fn().mockRejectedValue(error);
      const metadata = {
        operation: "testOperation",
        service: "TestService",
      };

      await expect(
        tracer.traceOperation("TestOperation", metadata, mockOperation)
      ).rejects.toThrow("Test error");

      expect(mockSubsegment.addError).toHaveBeenCalledWith(error);
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "success",
        false
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith("error", true);
      expect(mockSubsegment.close).toHaveBeenCalledWith(error);
    });

    it("should execute operation without tracing when no segment is available", async () => {
      (AWSXRay.getSegment as jest.Mock).mockReturnValue(null);

      const mockOperation = jest.fn().mockResolvedValue("success");
      const metadata = {
        operation: "testOperation",
        service: "TestService",
      };

      const result = await tracer.traceOperation(
        "TestOperation",
        metadata,
        mockOperation
      );

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalled();
      expect(mockSegment.addNewSubsegment).not.toHaveBeenCalled();
    });
  });

  describe("AWS Service Tracing", () => {
    it("should trace DynamoDB operations", async () => {
      const mockDbOperation = jest.fn().mockResolvedValue({ Item: {} });

      const result = await tracer.traceDynamoDBOperation(
        "GetItem",
        "test-table",
        { id: "123" },
        mockDbOperation,
        { userId: "user123" }
      );

      expect(result).toEqual({ Item: {} });
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "DynamoDB-GetItem"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "tableName",
        "test-table"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "key",
        '{"id":"123"}'
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "awsService",
        "DynamoDB"
      );
    });

    it("should trace S3 operations", async () => {
      const mockS3Operation = jest.fn().mockResolvedValue({ ETag: "etag123" });

      const result = await tracer.traceS3Operation(
        "PutObject",
        "test-bucket",
        "test-key",
        mockS3Operation,
        { documentId: "doc123" }
      );

      expect(result).toEqual({ ETag: "etag123" });
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith("S3-PutObject");
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "bucket",
        "test-bucket"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "key",
        "test-key"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "awsService",
        "S3"
      );
    });

    it("should trace EventBridge operations", async () => {
      const mockEventOperation = jest
        .fn()
        .mockResolvedValue({ MessageId: "msg123" });

      const result = await tracer.traceEventBridgeOperation(
        "PutEvents",
        "test-bus",
        "KYCStatusChanged",
        mockEventOperation,
        { userId: "user123" }
      );

      expect(result).toEqual({ MessageId: "msg123" });
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "EventBridge-PutEvents"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "eventBusName",
        "test-bus"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "eventType",
        "KYCStatusChanged"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "awsService",
        "EventBridge"
      );
    });

    it("should trace SNS operations", async () => {
      const mockSnsOperation = jest
        .fn()
        .mockResolvedValue({ MessageId: "msg123" });

      const result = await tracer.traceSNSOperation(
        "Publish",
        "arn:aws:sns:us-east-1:123456789012:test-topic",
        mockSnsOperation,
        { userId: "user123" }
      );

      expect(result).toEqual({ MessageId: "msg123" });
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith("SNS-Publish");
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "topicArn",
        "arn:aws:sns:us-east-1:123456789012:test-topic"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "awsService",
        "SNS"
      );
    });
  });

  describe("HTTP Request Tracing", () => {
    it("should trace HTTP requests", async () => {
      const mockHttpOperation = jest.fn().mockResolvedValue({ status: 200 });

      const result = await tracer.traceHttpRequest(
        "https://api.example.com/users",
        "GET",
        mockHttpOperation,
        { userId: "user123" }
      );

      expect(result).toEqual({ status: 200 });
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith("HTTP-GET");
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "url",
        "https://api.example.com/users"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "method",
        "GET"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "requestType",
        "HTTP"
      );
    });
  });

  describe("Business Operation Tracing", () => {
    it("should trace business logic operations", async () => {
      const mockBusinessOperation = jest
        .fn()
        .mockResolvedValue("business result");
      const metadata = {
        operation: "ProcessKYCDocument",
        service: "KYCService",
        userId: "user123",
        documentId: "doc123",
      };

      const result = await tracer.traceBusinessOperation(
        "ProcessKYCDocument",
        mockBusinessOperation,
        metadata,
        { priority: "high" }
      );

      expect(result).toBe("business result");
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        "ProcessKYCDocument"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "businessLogic",
        true
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "priority",
        "high"
      );
    });
  });

  describe("Segment Utilities", () => {
    it("should add annotations to current segment", () => {
      tracer.addAnnotation("testKey", "testValue");

      expect(mockSegment.addAnnotation).toHaveBeenCalledWith(
        "testKey",
        "testValue"
      );
    });

    it("should add metadata to current segment", () => {
      const metadata = { key1: "value1", key2: 123 };
      tracer.addMetadata("testNamespace", metadata);

      expect(mockSegment.addMetadata).toHaveBeenCalledWith(
        "testNamespace",
        metadata
      );
    });

    it("should return current trace ID", () => {
      const traceId = tracer.getCurrentTraceId();

      expect(traceId).toBe("trace-123");
    });

    it("should return current segment ID", () => {
      const segmentId = tracer.getCurrentSegmentId();

      expect(segmentId).toBe("segment-123");
    });

    it("should handle missing segment gracefully", () => {
      (AWSXRay.getSegment as jest.Mock).mockReturnValue(null);

      tracer.addAnnotation("testKey", "testValue");
      tracer.addMetadata("testNamespace", {});

      const traceId = tracer.getCurrentTraceId();
      const segmentId = tracer.getCurrentSegmentId();

      expect(traceId).toBeUndefined();
      expect(segmentId).toBeUndefined();
    });
  });

  describe("Manual Segment Creation", () => {
    it("should create and manage manual segments", async () => {
      const MockSegment = AWSXRay.Segment as jest.MockedClass<
        typeof AWSXRay.Segment
      >;
      const mockManualSegment = {
        close: jest.fn(),
      };
      MockSegment.mockImplementation(() => mockManualSegment as any);

      const mockOperation = jest.fn().mockResolvedValue("manual result");

      const result = await tracer.createManualSegment(
        "ManualSegment",
        mockOperation
      );

      expect(result).toBe("manual result");
      expect(MockSegment).toHaveBeenCalledWith("ManualSegment");
      expect(AWSXRay.setSegment).toHaveBeenCalledWith(mockManualSegment);
      expect(mockManualSegment.close).toHaveBeenCalled();
    });

    it("should handle errors in manual segments", async () => {
      const MockSegment = AWSXRay.Segment as jest.MockedClass<
        typeof AWSXRay.Segment
      >;
      const mockManualSegment = {
        close: jest.fn(),
      };
      MockSegment.mockImplementation(() => mockManualSegment as any);

      const error = new Error("Manual segment error");
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(
        tracer.createManualSegment("ManualSegment", mockOperation)
      ).rejects.toThrow("Manual segment error");

      expect(mockManualSegment.close).toHaveBeenCalledWith(error);
    });
  });

  describe("Factory Functions", () => {
    it("should create KYC tracer instance", () => {
      (XRayTracer as any).instance = null;
      const kycTracer = createKYCTracer();

      expect(kycTracer).toBeInstanceOf(XRayTracer);
    });
  });

  describe("Captured AWS SDK", () => {
    it("should provide captured AWS SDK", () => {
      const capturedAWS = tracer.getCapturedAWS();

      expect(capturedAWS).toBeDefined();
    });
  });
});
