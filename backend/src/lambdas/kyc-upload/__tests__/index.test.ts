import { handler } from "../index";
import { KYCUploadEvent } from "../types";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SNSClient } from "@aws-sdk/client-sns";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
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

    // Setup default mocks
    dynamoMock.on(PutCommand).resolves({});
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

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

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

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

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

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Invalid file type");
    });

    it("should return 400 for missing user ID", async () => {
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
        }),
      };

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Invalid user ID");
    });
  });

  describe("Direct Upload", () => {
    it("should return 501 for direct upload (not implemented)", async () => {
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
        body: JSON.stringify({}),
      };

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(501);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Direct upload not implemented. Use presigned URL endpoint.");
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

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

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

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Internal server error");
      expect(body.error).toBe("DynamoDB error");

      // Verify error metric was sent
      expect(cloudWatchMock.commandCalls(PutMetricDataCommand)).toHaveLength(1);
      const metricCall = cloudWatchMock.commandCalls(PutMetricDataCommand)[0];
      expect(metricCall.args[0].input.MetricData?.[0]?.MetricName).toBe("UploadError");
    });

    it("should handle invalid JSON in request body", async () => {
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
        body: "invalid json",
      };

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Internal server error");
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

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.headers).toHaveProperty("Access-Control-Allow-Origin", "*");
      expect(result.headers).toHaveProperty("Content-Type", "application/json");
    });
  });
});