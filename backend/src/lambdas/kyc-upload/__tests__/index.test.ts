import { handler } from "../index";
import { KYCUploadEvent, DirectUploadRequest } from "../types";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyResult } from "aws-lambda";

// Mock AWS SDK clients
const dynamoMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);

// Mock EventPublisher
jest.mock("../../kyc-processing/event-publisher", () => ({
  EventPublisher: jest.fn().mockImplementation(() => ({
    publishKYCUploadEvent: jest.fn().mockResolvedValue({
      success: true,
      eventId: "mock-event-id",
      retryCount: 0,
      duration: 100,
    }),
  })),
}));

// Mock CloudWatch metrics utility - temporarily disabled to debug
// const mockMetrics = {
//   recordKYCUpload: jest.fn().mockResolvedValue(undefined),
//   recordS3UploadLatency: jest.fn().mockResolvedValue(undefined),
//   recordDatabaseLatency: jest.fn().mockResolvedValue(undefined),
//   recordEventBridgeLatency: jest.fn().mockResolvedValue(undefined),
//   recordError: jest.fn().mockResolvedValue(undefined),
// };

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

describe("KYC Upload Lambda", () => {
  beforeEach(() => {
    // Reset all mocks
    dynamoMock.reset();
    s3Mock.reset();
    jest.clearAllMocks();

    // Set environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.BUCKET_NAME = "test-bucket";
    process.env.SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:test-topic";
    process.env.ENVIRONMENT = "test";
    process.env.AWS_REGION = "us-east-1";
    process.env.ADMIN_PORTAL_URL = "https://admin.sachain.com";

    // Setup default mocks
    dynamoMock.on(PutCommand).resolves({});
    dynamoMock.on(GetCommand).resolves({
      Item: {
        documentId: "mock-document-id",
        userId: "user123",
        documentType: "passport",
        originalFileName: "passport.jpg",
        status: "uploaded",
        uploadedAt: "2024-01-01T00:00:00.000Z",
      },
    });
    dynamoMock.on(UpdateCommand).resolves({});
    s3Mock.on(PutObjectCommand).resolves({ ETag: "mock-etag" });
  });

  describe("Direct Upload", () => {
    it("should handle direct file upload successfully", async () => {
      // Create valid JPEG content
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.from("mock file content"),
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
        requestContext: {} as any,
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
      const body = JSON.parse(result.body);
      expect(body.documentId).toBe("mock-document-id");
      expect(body.message).toBe("File uploaded successfully");

      // Verify metrics were recorded
      expect(mockMetrics.recordKYCUpload).toHaveBeenCalledWith(
        true,
        undefined,
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockMetrics.recordS3UploadLatency).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockMetrics.recordDatabaseLatency).toHaveBeenCalledWith(
        "putItem",
        expect.any(Number)
      );

      // Verify S3 upload was called (basic verification)
      expect(s3Mock.commandCalls(PutObjectCommand).length).toBeGreaterThan(0);
    });

    it("should return 400 for invalid base64 file content", async () => {
      const request = {
        documentType: "passport",
        fileName: "passport.jpg",
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
        requestContext: {} as any,
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
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Invalid base64 file content");
    });

    it("should validate file size limits in direct upload", async () => {
      // Create a large file content (over 10MB) with valid JPEG header
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const largeContent = Buffer.alloc(11 * 1024 * 1024 - 4, "a");
      const largeFileContent = Buffer.concat([
        jpegHeader,
        largeContent,
      ]).toString("base64");
      const request: DirectUploadRequest = {
        documentType: "passport",
        fileName: "passport.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent: largeFileContent,
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
        requestContext: {} as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify(request),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(413);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("File exceeds max size of 10 MB.");
    });

    it("should return 400 for invalid document type", async () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.from("mock file content"),
      ]).toString("base64");

      const request = {
        documentType: "invalid_type",
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
        requestContext: {} as any,
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
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Invalid document type");
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown endpoint", async () => {
      const event: KYCUploadEvent = {
        path: "/unknown",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify({}),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Endpoint not found");
    });

    it("should handle DynamoDB errors gracefully", async () => {
      dynamoMock.on(PutCommand).rejects(new Error("DynamoDB error"));

      // Create valid JPEG content for direct upload
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.from("mock file content"),
      ]).toString("base64");

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify({
          documentType: "passport",
          fileName: "passport.jpg",
          contentType: "image/jpeg",
          userId: "user123",
          fileContent,
        }),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toBe(
        "An unexpected error occurred. Please try again or contact support."
      );

      // Verify error metric was recorded
      expect(mockMetrics.recordKYCUpload).toHaveBeenCalledWith(
        false,
        "system",
        expect.any(Number)
      );
    });
  });

  describe("CORS Headers", () => {
    it("should include CORS headers in all responses", async () => {
      const event: KYCUploadEvent = {
        path: "/unknown",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify({}),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.headers).toHaveProperty("Access-Control-Allow-Origin", "*");
      expect(result.headers).toHaveProperty("Content-Type", "application/json");
    });
  });

  describe("Metrics and Monitoring", () => {
    it("should send appropriate metrics for successful operations", async () => {
      // Create valid JPEG content for direct upload
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.from("mock file content"),
      ]).toString("base64");

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify({
          documentType: "passport",
          fileName: "passport.jpg",
          contentType: "image/jpeg",
          userId: "user123",
          fileContent,
        }),
      };

      await handler(event, {} as any, {} as any);

      // Verify comprehensive metrics were recorded
      expect(mockMetrics.recordKYCUpload).toHaveBeenCalledWith(
        true,
        undefined,
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockMetrics.recordS3UploadLatency).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockMetrics.recordDatabaseLatency).toHaveBeenCalledWith(
        "putItem",
        expect.any(Number)
      );
      expect(mockMetrics.recordEventBridgeLatency).toHaveBeenCalledWith(
        "kyc_document_uploaded",
        expect.any(Number)
      );
    });

    it("should record file size distribution metrics", async () => {
      // Create valid JPEG content with specific size
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.alloc(1024 * 1024, "a"), // 1MB file
      ]).toString("base64");

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify({
          documentType: "national_id",
          fileName: "id.jpg",
          contentType: "image/jpeg",
          userId: "user123",
          fileContent,
        }),
      };

      await handler(event, {} as any, {} as any);

      // Verify file size was recorded in metrics
      expect(mockMetrics.recordKYCUpload).toHaveBeenCalledWith(
        true,
        undefined,
        expect.any(Number),
        expect.any(Number) // File size should be recorded
      );
    });

    it("should record EventBridge publishing failure metrics", async () => {
      // Mock EventBridge publishing to fail
      const mockEventPublisher = require("../../kyc-processing/event-publisher");
      mockEventPublisher.EventPublisher.mockImplementation(() => ({
        publishKYCUploadEvent: jest
          .fn()
          .mockRejectedValue(new Error("EventBridge error")),
      }));

      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const fileContent = Buffer.concat([
        jpegHeader,
        Buffer.from("mock file content"),
      ]).toString("base64");

      const event: KYCUploadEvent = {
        path: "/upload",
        httpMethod: "POST",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
        isBase64Encoded: false,
        body: JSON.stringify({
          documentType: "passport",
          fileName: "passport.jpg",
          contentType: "image/jpeg",
          userId: "user123",
          fileContent,
        }),
      };

      await handler(event, {} as any, {} as any);

      // Verify error metric was recorded for EventBridge failure
      expect(mockMetrics.recordError).toHaveBeenCalledWith(
        "EventPublishError",
        "system",
        "KYCUpload",
        "publishEvent"
      );
    });
  });
});
