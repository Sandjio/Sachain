# Comprehensive Error Handling and Logging

This document describes the comprehensive error handling and logging implementation for the Sachain KYC system.

## Overview

The error handling system provides:
- **Structured Error Classification**: Categorizes AWS service errors (DynamoDB, S3, etc.)
- **Intelligent Retry Logic**: Exponential backoff with jitter for transient errors
- **Comprehensive Logging**: Structured JSON logging for all operations
- **CloudWatch Integration**: Metrics and alarms for monitoring failures
- **Unit Testing**: Complete test coverage for error scenarios

## Components

### 1. Structured Logger (`structured-logger.ts`)

Provides consistent, structured logging across all Lambda functions.

```typescript
import { createKYCLogger } from '../utils/structured-logger';

const logger = createKYCLogger();

// Log operation start
logger.logOperationStart('S3Upload', { s3Key: 'test-key', userId: 'user123' });

// Log successful completion
logger.logOperationSuccess('S3Upload', duration, { s3Key: 'test-key' });

// Log errors with context
logger.error('Upload failed', { s3Key: 'test-key' }, error);

// Log retry attempts
logger.logRetryAttempt('S3Upload', attempt, maxRetries, delay, error, context);
```

**Features:**
- Consistent JSON log format
- Operation-specific logging methods
- Error context preservation
- Service-specific loggers (KYC, S3, DynamoDB)

### 2. Enhanced Error Handler (`error-handler.ts`)

Classifies AWS service errors and provides structured error details.

```typescript
import { ErrorClassifier, AWSServiceError } from '../utils/error-handler';

try {
  // AWS operation
} catch (error) {
  const errorDetails = ErrorClassifier.classify(error, context);
  
  if (errorDetails.retryable) {
    // Retry the operation
  } else {
    // Handle non-retryable error
    throw new AWSServiceError(errorDetails, error);
  }
}
```

**Supported Error Categories:**
- `TRANSIENT`: Network timeouts, temporary failures
- `RATE_LIMIT`: Throttling, provisioned throughput exceeded
- `VALIDATION`: Invalid input, conditional check failures
- `AUTHORIZATION`: Access denied, permission errors
- `RESOURCE_NOT_FOUND`: Missing resources
- `SYSTEM`: Service unavailable, internal errors

**Supported Services:**
- **DynamoDB**: Throughput exceptions, validation errors, resource not found
- **S3**: Access denied, entity too large, slow down, service unavailable
- **Generic AWS**: HTTP status code-based classification

### 3. Exponential Backoff Retry (`retry.ts`)

Implements intelligent retry logic with configurable parameters.

```typescript
import { ExponentialBackoff } from '../utils/retry';

const retry = new ExponentialBackoff({
  maxRetries: 3,
  baseDelay: 200,
  maxDelay: 10000,
  jitterType: 'full',
});

const result = await retry.execute(
  () => s3Client.send(putObjectCommand),
  'S3Upload-documentId'
);
```

**Features:**
- Configurable retry parameters
- Multiple jitter types (none, full, equal, decorrelated)
- Automatic error classification
- Detailed retry logging
- Operation naming for debugging

### 4. S3 Upload Utility (`s3-upload.ts`)

Enhanced S3 upload utility with comprehensive error handling.

```typescript
import { createKYCUploadUtility } from '../utils/s3-upload';

const s3Utility = createKYCUploadUtility(bucketName, region, kmsKeyId);

const result = await s3Utility.uploadFile({
  fileBuffer,
  fileName: 'document.pdf',
  mimeType: 'application/pdf',
  userId: 'user123',
  documentType: 'national_id',
});

if (!result.success) {
  // Handle upload failure
  console.error('Upload failed:', result.error);
}
```

**Features:**
- File validation (size, type, format)
- Automatic retry with exponential backoff
- Secure file naming and tagging
- Presigned URL generation
- Comprehensive error classification

### 5. CloudWatch Monitoring (`monitoring.ts`)

Comprehensive monitoring with alarms and dashboards.

**Alarms Created:**
- **Lambda Function Alarms**:
  - Error rate > 5 errors in 10 minutes
  - Average duration > 30 seconds
  - Any throttling detected

- **KYC-Specific Alarms**:
  - Upload failure rate > 10 failures in 10 minutes
  - S3 upload errors > 3 errors in 5 minutes
  - DynamoDB errors > 5 errors in 10 minutes

**Dashboard Widgets:**
- Lambda error and duration metrics
- KYC upload success/failure rates
- Error categorization breakdown

## Usage Examples

### 1. KYC Upload Lambda with Error Handling

```typescript
export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  
  logger.info("KYC Upload Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
  });

  try {
    // Process upload with retry logic
    const result = await s3UploadUtility.uploadFile(uploadRequest);
    
    if (!result.success) {
      logger.error("S3 upload failed", { requestId }, new Error(result.error));
      await putMetricSafe("DirectUploadError", 1, { errorType: "S3Upload" });
      
      return {
        statusCode: 400,
        body: JSON.stringify({ message: result.error }),
      };
    }

    // Create DynamoDB record with retry
    await retry.execute(
      () => kycRepo.createKYCDocument(documentData),
      `DynamoDB-CreateDocument-${documentId}`
    );

    const duration = Date.now() - startTime;
    logger.info("Upload completed successfully", { requestId, duration });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Upload successful" }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorDetails = ErrorClassifier.classify(error, { requestId, duration });

    logger.error("Upload failed", { requestId, errorCategory: errorDetails.category }, error);
    await putMetricSafe("DirectUploadError", 1, { errorCategory: errorDetails.category });
    
    return {
      statusCode: errorDetails.httpStatusCode || 500,
      body: JSON.stringify({ 
        message: errorDetails.userMessage,
        requestId,
      }),
    };
  }
};
```

### 2. Repository with Error Handling Decorator

```typescript
import { handleDynamoDBErrors } from '../utils/error-handler';

export class KYCDocumentRepository {
  @handleDynamoDBErrors
  async createKYCDocument(data: CreateKYCDocumentRequest): Promise<KYCDocument> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: document,
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    await this.docClient.send(command);
    return document;
  }
}
```

## Testing

### Unit Tests

Run specific error scenario tests:
```bash
npm run test:error-scenarios
```

Run all tests with coverage:
```bash
npm run test:coverage
```

### Test Categories

1. **Structured Logger Tests** (`structured-logger.test.ts`)
   - Log format validation
   - Operation-specific logging
   - Error context preservation

2. **Error Handler Tests** (`enhanced-error-handler.test.ts`)
   - S3 error classification
   - DynamoDB error classification
   - Generic error handling

3. **Lambda Error Scenarios** (`error-scenarios.test.ts`)
   - Validation errors
   - AWS service failures
   - Retry mechanisms
   - Malformed requests

4. **Integration Tests** (`integration-error-retry.test.ts`)
   - End-to-end error flows
   - Retry with logging
   - Error classification integration

## Monitoring and Alerting

### CloudWatch Metrics

Custom metrics published:
- `Sachain/KYCUpload/DirectUploadSuccess`
- `Sachain/KYCUpload/DirectUploadError`
- `Sachain/KYCUpload/PresignedUrlGenerated`
- `Sachain/KYCUpload/AdminNotificationSent`

### Alarms

All alarms send notifications to SNS topic for immediate alerting:
- Email notifications to administrators
- Integration with incident management systems

### Dashboard

Access the CloudWatch dashboard:
- Dashboard name: `sachain-kyc-dashboard-{environment}`
- Widgets for errors, duration, upload metrics, error categories

## Configuration

### Environment Variables

Required environment variables for error handling:
```bash
ENVIRONMENT=production
TABLE_NAME=sachain-kyc-table
BUCKET_NAME=sachain-kyc-documents
SNS_TOPIC_ARN=arn:aws:sns:region:account:alerts
KMS_KEY_ID=alias/sachain-kyc-key
AWS_REGION=us-east-1
```

### Retry Configuration

Default retry settings (configurable per operation):
```typescript
{
  maxRetries: 3,
  baseDelay: 200,      // milliseconds
  maxDelay: 10000,     // milliseconds
  jitterType: 'full',  // none, full, equal, decorrelated
}
```

### File Upload Limits

```typescript
{
  maxFileSize: 10 * 1024 * 1024,  // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
}
```

## Best Practices

1. **Always use structured logging** with consistent context
2. **Classify errors properly** before deciding on retry strategy
3. **Include request IDs** in all log entries for traceability
4. **Monitor error rates** and set up appropriate alarms
5. **Test error scenarios** thoroughly with unit and integration tests
6. **Use appropriate retry delays** to avoid overwhelming services
7. **Preserve error context** throughout the error handling chain

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check CloudWatch alarms and dashboard
   - Review error categories in logs
   - Verify AWS service limits and quotas

2. **Retry Exhaustion**
   - Increase retry limits if appropriate
   - Check for non-retryable errors being retried
   - Review error classification logic

3. **Missing Logs**
   - Verify CloudWatch log group permissions
   - Check log retention settings
   - Ensure structured logger is properly initialized

### Log Analysis

Search CloudWatch logs using structured fields:
```json
{
  "level": "ERROR",
  "context.operation": "S3Upload",
  "context.errorCategory": "rate_limit"
}
```

Filter by request ID for complete request tracing:
```json
{
  "context.requestId": "abc123-def456"
}
```