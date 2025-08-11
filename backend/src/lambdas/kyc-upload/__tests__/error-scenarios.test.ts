/**
 * Unit tests for KYC upload Lambda error scenarios and retry mechanisms
 */

import { handler } from '../index';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { SNSClient } from '@aws-sdk/client-sns';

// Mock AWS clients
const dynamoMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);
const cloudWatchMock = mockClient(CloudWatchClient);
const snsMock = mockClient(SNSClient);

// Mock environment variables
process.env.TABLE_NAME = 'test-table';
process.env.BUCKET_NAME = 'test-bucket';
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-topic';
process.env.ENVIRONMENT = 'test';
process.env.AWS_REGION = 'us-east-1';

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test-function',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
  memoryLimitInMB: '128',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/test-function',
  logStreamName: '2023/01/01/[$LATEST]test-stream',
  getRemainingTimeInMillis: () => 30000,
  done: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};

beforeEach(() => {
  dynamoMock.reset();
  s3Mock.reset();
  cloudWatchMock.reset();
  snsMock.reset();
  jest.clearAllMocks();
});

describe('KYC Upload Lambda Error Scenarios', () => {
  describe('Direct Upload Error Handling', () => {
    const createDirectUploadEvent = (body: any): APIGatewayProxyEvent => ({
      httpMethod: 'POST',
      path: '/upload',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      requestContext: {
        requestId: 'test-request-id',
        accountId: '123456789012',
        apiId: 'test-api',
        stage: 'test',
        requestTime: '2023-01-01T00:00:00Z',
        requestTimeEpoch: 1672531200000,
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
        },
        httpMethod: 'POST',
        resourcePath: '/upload',
        protocol: 'HTTP/1.1',
        resourceId: 'test-resource',
      },
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      multiValueHeaders: {},
      isBase64Encoded: false,
      resource: '/upload',
    });

    it('should handle validation errors gracefully', async () => {
      const event = createDirectUploadEvent({
        userId: 'user123',
        documentType: 'invalid_type', // Invalid document type
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileContent: Buffer.from('test content').toString('base64'),
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('Invalid document type');
      expect(body.requestId).toBe('test-request-id');
    });

    it('should handle file size validation errors', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB content
      const event = createDirectUploadEvent({
        userId: 'user123',
        documentType: 'national_id',
        fileName: 'large-file.pdf',
        contentType: 'application/pdf',
        fileContent: Buffer.from(largeContent).toString('base64'),
      });

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('exceeds maximum allowed size');
    });

    it('should handle S3 upload failures with retry', async () => {
      const event = createDirectUploadEvent({
        userId: 'user123',
        documentType: 'national_id',
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileContent: Buffer.from('%PDF-1.4 test content').toString('base64'),
      });

      // Mock S3 to fail with retryable error
      s3Mock.on(PutObjectCommand).rejects({
        name: 'ServiceUnavailable',
        message: 'Service is temporarily unavailable',
        $metadata: { httpStatusCode: 503, service: 'S3' },
      });

      // Mock CloudWatch to succeed
      cloudWatchMock.on(PutMetricDataCommand).resolves({});

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('temporarily unavailable');
      
      // Verify S3 was called multiple times (retry attempts)
      expect(s3Mock.commandCalls(PutObjectCommand).length).toBeGreaterThan(1);
    });

    it('should handle DynamoDB failures with retry', async () => {
      const event = createDirectUploadEvent({
        userId: 'user123',
        documentType: 'national_id',
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileContent: Buffer.from('%PDF-1.4 test content').toString('base64'),
      });

      // Mock S3 to succeed
      s3Mock.on(PutObjectCommand).resolves({
        ETag: '"test-etag"',
        VersionId: 'test-version',
      });

      // Mock DynamoDB to fail with retryable error
      dynamoMock.on(PutCommand).rejects({
        name: 'ProvisionedThroughputExceededException',
        message: 'The level of configured provisioned throughput for the table was exceeded',
        $metadata: { httpStatusCode: 400 },
      });

      // Mock CloudWatch to succeed
      cloudWatchMock.on(PutMetricDataCommand).resolves({});

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('temporarily busy');
      
      // Verify DynamoDB was called multiple times (retry attempts)
      expect(dynamoMock.commandCalls(PutCommand).length).toBeGreaterThan(1);
    });

    it('should handle non-retryable errors without retry', async () => {
      const event = createDirectUploadEvent({
        userId: 'user123',
        documentType: 'national_id',
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileContent: Buffer.from('%PDF-1.4 test content').toString('base64'),
      });

      // Mock S3 to fail with non-retryable error
      s3Mock.on(PutObjectCommand).rejects({
        name: 'AccessDenied',
        message: 'Access Denied',
        $metadata: { httpStatusCode: 403, service: 'S3' },
      });

      // Mock CloudWatch to succeed
      cloudWatchMock.on(PutMetricDataCommand).resolves({});

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('permission');
      
      // Verify S3 was called only once (no retry for non-retryable error)
      expect(s3Mock.commandCalls(PutObjectCommand).length).toBe(1);
    });

    it('should handle successful upload after retries', async () => {
      const event = createDirectUploadEvent({
        userId: 'user123',
        documentType: 'national_id',
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileContent: Buffer.from('%PDF-1.4 test content').toString('base64'),
      });

      // Mock S3 to fail twice then succeed
      s3Mock.on(PutObjectCommand)
        .rejectsOnce({
          name: 'RequestTimeout',
          message: 'Request timeout',
          $metadata: { httpStatusCode: 408, service: 'S3' },
        })
        .rejectsOnce({
          name: 'RequestTimeout',
          message: 'Request timeout',
          $metadata: { httpStatusCode: 408, service: 'S3' },
        })
        .resolves({
          ETag: '"test-etag"',
          VersionId: 'test-version',
        });

      // Mock DynamoDB to succeed
      dynamoMock.on(PutCommand).resolves({});

      // Mock CloudWatch to succeed
      cloudWatchMock.on(PutMetricDataCommand).resolves({});

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('File uploaded successfully');
      
      // Verify S3 was called 3 times (2 failures + 1 success)
      expect(s3Mock.commandCalls(PutObjectCommand).length).toBe(3);
    });
  });

  describe('CloudWatch Metrics Error Handling', () => {
    it('should continue processing even if CloudWatch metrics fail', async () => {
      const event = createDirectUploadEvent({
        userId: 'user123',
        documentType: 'national_id',
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileContent: Buffer.from('%PDF-1.4 test content').toString('base64'),
      });

      // Mock S3 and DynamoDB to succeed
      s3Mock.on(PutObjectCommand).resolves({
        ETag: '"test-etag"',
        VersionId: 'test-version',
      });
      dynamoMock.on(PutCommand).resolves({});

      // Mock CloudWatch to fail
      cloudWatchMock.on(PutMetricDataCommand).rejects({
        name: 'AccessDenied',
        message: 'Access denied to CloudWatch',
      });

      const result = await handler(event, mockContext);

      // Upload should still succeed despite CloudWatch failure
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('File uploaded successfully');
    });
  });

  describe('Malformed Request Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/upload',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
        requestContext: {
          requestId: 'test-request-id',
          accountId: '123456789012',
          apiId: 'test-api',
          stage: 'test',
          requestTime: '2023-01-01T00:00:00Z',
          requestTimeEpoch: 1672531200000,
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
          httpMethod: 'POST',
          resourcePath: '/upload',
          protocol: 'HTTP/1.1',
          resourceId: 'test-resource',
        },
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        multiValueHeaders: {},
        isBase64Encoded: false,
        resource: '/upload',
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('unexpected error');
      expect(body.requestId).toBe('test-request-id');
    });

    it('should handle missing request body', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/upload',
        headers: { 'Content-Type': 'application/json' },
        body: null,
        requestContext: {
          requestId: 'test-request-id',
          accountId: '123456789012',
          apiId: 'test-api',
          stage: 'test',
          requestTime: '2023-01-01T00:00:00Z',
          requestTimeEpoch: 1672531200000,
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
          httpMethod: 'POST',
          resourcePath: '/upload',
          protocol: 'HTTP/1.1',
          resourceId: 'test-resource',
        },
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        multiValueHeaders: {},
        isBase64Encoded: false,
        resource: '/upload',
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('Invalid document type');
    });
  });

  describe('Route Not Found', () => {
    it('should handle unknown routes gracefully', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/unknown-route',
        headers: {},
        body: null,
        requestContext: {
          requestId: 'test-request-id',
          accountId: '123456789012',
          apiId: 'test-api',
          stage: 'test',
          requestTime: '2023-01-01T00:00:00Z',
          requestTimeEpoch: 1672531200000,
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
          httpMethod: 'GET',
          resourcePath: '/unknown-route',
          protocol: 'HTTP/1.1',
          resourceId: 'test-resource',
        },
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        multiValueHeaders: {},
        isBase64Encoded: false,
        resource: '/unknown-route',
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Endpoint not found');
    });
  });
});