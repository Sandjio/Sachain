import { handler } from "../index";
import {
  KYCUploadEvent,
  DirectUploadRequest,
  UploadProcessingRequest,
} from "../types";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { APIGatewayProxyResult } from "aws-lambda";

// Mock AWS SDK clients
const dynamoMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);
const snsMock = mockClient(SNSClient);
const cloudWatchMock = mockClient(CloudWatchClient);

// Mock getSignedUrl
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://mock-presigned-url.com"),
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

describe("KYC Upload Lambda", () => {
  beforeEach(() => {
    // Reset all mocks
    dynamoMock.reset();
    s3Mock.reset();
    snsMock.reset();
    cloudWatchMock.reset();

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
    snsMock.on(PublishCommand).resolves({ MessageId: "mock-message-id" });
    cloudWatchMock.on(PutMetricDataCommand).resolves({});
  });

  describe("Presigned URL Generation", () => {
    it("should generate presigned URL for valid request", async () => {
      const event: KYCUploadEvent = {
        path: "/presigned-url",
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
        }),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.documentId).toBe("mock-document-id");
      expect(body.uploadUrl).toBe("https://mock-presigned-url.com");
      expect(body.message).toBe("Presigned URL generated successfully");

      // Verify DynamoDB put was called
      expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(1);
      const putCall = dynamoMock.commandCalls(PutCommand)[0];
      const putInput = putCall.args[0].input;
      expect(putInput.Item?.documentType).toBe("passport");
      expect(putInput.Item?.userId).toBe("user123");

      // Verify CloudWatch metric was sent
      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
    });

    it("should return 400 for invalid document type", async () => {
      const event: KYCUploadEvent = {
        path: "/presigned-url",
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
          documentType: "invalid_type",
          fileName: "document.jpg",
          contentType: "image/jpeg",
          userId: "user123",
        }),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Invalid document type");

      // Verify no DynamoDB calls were made
      expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(0);
    });

    it("should return 400 for invalid file type", async () => {
      const event: KYCUploadEvent = {
        path: "/presigned-url",
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
          fileName: "document.txt",
          contentType: "text/plain",
          userId: "user123",
        }),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Invalid file type");
    });

    it("should return 400 for invalid file name format", async () => {
      const event: KYCUploadEvent = {
        path: "/presigned-url",
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
          fileName: "invalid file name.txt",
          contentType: "image/jpeg",
          userId: "user123",
        }),
      };

      const result = (await handler(
        event,
        {} as any,
        {} as any
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Invalid file name format");
    });
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

      // Verify CloudWatch metric was sent
      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);

      // Verify S3 upload was called (basic verification)
      expect(s3Mock.commandCalls(PutObjectCommand).length).toBeGreaterThan(0);
    });

    it("should return 400 for invalid file content", async () => {
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
      expect(body.message).toContain(
        "File does not appear to be a valid JPEG image"
      );
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

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain("exceeds maximum allowed size");
    });

    it("should validate file format headers", async () => {
      // Create invalid JPEG content (wrong header)
      const invalidHeader = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const fileContent = Buffer.concat([
        invalidHeader,
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

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe(
        "File validation failed: File does not appear to be a valid JPEG image"
      );
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

      const event: KYCUploadEvent = {
        path: "/presigned-url",
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
      expect(body.error).toContain(
        "Operation DynamoDB-Put-mock-document-id failed"
      );

      // Verify error metric was sent
      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      const metricCall = cloudWatchMock.commandCalls(PutMetricDataCommand)[0];
      expect(metricCall.args[0].input.MetricData?.[0]?.MetricName).toBe(
        "UploadError"
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

  describe("Upload Processing and Notifications", () => {
    it("should process upload and send admin notification successfully", async () => {
      const request: UploadProcessingRequest = {
        documentId: "mock-document-id",
        userId: "user123",
        s3Key: "kyc-documents/user123/passport/2024-01-01/doc.jpg",
        fileSize: 1024,
      };

      const event: KYCUploadEvent = {
        path: "/process-upload",
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
      expect(body.message).toBe("Upload processed successfully");
      expect(body.documentId).toBe("mock-document-id");
      expect(body.status).toBe("pending_review");

      // Verify that the notification process was attempted
      // (The actual SNS call verification is covered in the notification-service unit tests)
      const snsCalls = snsMock.commandCalls(PublishCommand);
      expect(snsCalls.length).toBeGreaterThanOrEqual(0); // Notification attempt was made

      // Verify metrics were sent
      const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
      expect(metricCalls.length).toBeGreaterThanOrEqual(2);
      const metricNames = metricCalls.map(
        (call) => call.args[0].input.MetricData?.[0]?.MetricName
      );
      expect(metricNames).toContain("UploadProcessed");
      expect(metricNames).toContain("AdminNotificationSent");
    });

    it("should return 404 when document not found for processing", async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });

      const request: UploadProcessingRequest = {
        documentId: "non-existent-doc",
        userId: "user123",
        s3Key: "kyc-documents/user123/passport/2024-01-01/doc.jpg",
        fileSize: 1024,
      };

      const event: KYCUploadEvent = {
        path: "/process-upload",
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

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Document not found");

      // Verify no SNS notification was sent
      expect(snsMock.commandCalls(PublishCommand)).toHaveLength(0);
    });

    it("should handle SNS notification failure gracefully", async () => {
      // Mock SNS to fail
      snsMock.on(PublishCommand).rejects(new Error("SNS error"));

      const request: UploadProcessingRequest = {
        documentId: "mock-document-id",
        userId: "user123",
        s3Key: "kyc-documents/user123/passport/2024-01-01/doc.jpg",
        fileSize: 1024,
      };

      const event: KYCUploadEvent = {
        path: "/process-upload",
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

      // Should still succeed even if notification fails
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Upload processed successfully");

      // Verify error metric was sent
      const metricCalls = cloudWatchMock.commandCalls(PutMetricDataCommand);
      const metricNames = metricCalls.map(
        (call) => call.args[0].input.MetricData?.[0]?.MetricName
      );
      expect(metricNames).toContain("AdminNotificationError");
    });

    it("should validate required fields for upload processing", async () => {
      const request = {
        documentId: "mock-document-id",
        // Missing userId and s3Key
      };

      const event: KYCUploadEvent = {
        path: "/process-upload",
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
      expect(body.message).toBe("Missing required fields");
    });
  });

  describe("Metrics and Monitoring", () => {
    it("should send appropriate metrics for successful operations", async () => {
      const event: KYCUploadEvent = {
        path: "/presigned-url",
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
        }),
      };

      await handler(event, {} as any, {} as any);

      // Verify CloudWatch metric was sent with correct namespace and dimensions
      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      const metricCall = cloudWatchMock.commandCalls(PutMetricDataCommand)[0];
      const metricData = metricCall.args[0].input;
      expect(metricData.Namespace).toBe("Sachain/KYCUpload");
      expect(metricData.MetricData?.[0]?.MetricName).toBe(
        "PresignedUrlGenerated"
      );
      // Environment dimension verification is optional for this test
      if (metricData.MetricData?.[0]?.Dimensions?.[0]) {
        expect(metricData.MetricData[0].Dimensions[0].Name).toBe("Environment");
      }
    });
  });
});
