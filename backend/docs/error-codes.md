# Sachain API Error Codes and Response Formats

This document provides a comprehensive reference for all error codes, response formats, and troubleshooting guidance for the Sachain API.

## Standard Error Response Format

All API errors follow a consistent format:

```json
{
  "message": "Human-readable error description",
  "requestId": "unique-request-identifier",
  "details": {
    "field": "fieldName",
    "code": "ERROR_CODE",
    "additionalInfo": "context-specific data"
  }
}
```

## HTTP Status Codes

### 2xx Success Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 202 | Accepted | Request accepted for processing |

### 4xx Client Error Codes

| Code | Description | Common Causes | Action Required |
|------|-------------|---------------|-----------------|
| 400 | Bad Request | Invalid request parameters, malformed JSON | Fix request format/parameters |
| 401 | Unauthorized | Missing or invalid authentication token | Provide valid JWT token |
| 403 | Forbidden | Insufficient permissions | Check user roles/permissions |
| 404 | Not Found | Resource doesn't exist | Verify resource ID |
| 409 | Conflict | Resource already exists or state conflict | Check resource state |
| 413 | Payload Too Large | File size exceeds limits | Reduce file size |
| 422 | Unprocessable Entity | Valid JSON but invalid business logic | Fix business logic errors |
| 429 | Too Many Requests | Rate limit exceeded | Implement backoff strategy |

### 5xx Server Error Codes

| Code | Description | Common Causes | Action Required |
|------|-------------|---------------|-----------------|
| 500 | Internal Server Error | Unexpected server error | Retry request, contact support |
| 502 | Bad Gateway | Upstream service error | Retry request |
| 503 | Service Unavailable | Service temporarily unavailable | Retry with exponential backoff |
| 504 | Gateway Timeout | Request timeout | Retry request |

## Detailed Error Codes

### Authentication Errors (AUTH_*)

#### AUTH_TOKEN_MISSING
```json
{
  "message": "Authentication token is required",
  "requestId": "req-123",
  "details": {
    "code": "AUTH_TOKEN_MISSING",
    "field": "Authorization"
  }
}
```
**Cause**: No Authorization header provided  
**Solution**: Include `Authorization: Bearer <token>` header

#### AUTH_TOKEN_INVALID
```json
{
  "message": "Invalid or expired authentication token",
  "requestId": "req-124",
  "details": {
    "code": "AUTH_TOKEN_INVALID",
    "reason": "Token expired"
  }
}
```
**Cause**: JWT token is malformed, expired, or invalid  
**Solution**: Refresh token or re-authenticate

#### AUTH_INSUFFICIENT_PERMISSIONS
```json
{
  "message": "Insufficient permissions for this operation",
  "requestId": "req-125",
  "details": {
    "code": "AUTH_INSUFFICIENT_PERMISSIONS",
    "requiredRole": "admin",
    "userRole": "user"
  }
}
```
**Cause**: User lacks required permissions  
**Solution**: Contact admin for role assignment

### Validation Errors (VALIDATION_*)

#### VALIDATION_REQUIRED_FIELD
```json
{
  "message": "Missing required field: userId",
  "requestId": "req-126",
  "details": {
    "code": "VALIDATION_REQUIRED_FIELD",
    "field": "userId"
  }
}
```
**Cause**: Required field not provided  
**Solution**: Include all required fields

#### VALIDATION_INVALID_FORMAT
```json
{
  "message": "Invalid file name format",
  "requestId": "req-127",
  "details": {
    "code": "VALIDATION_INVALID_FORMAT",
    "field": "fileName",
    "pattern": "^[a-zA-Z0-9._-]+\\.(jpg|jpeg|png|pdf)$",
    "value": "invalid-file-name"
  }
}
```
**Cause**: Field value doesn't match expected format  
**Solution**: Ensure field matches required pattern

#### VALIDATION_INVALID_ENUM
```json
{
  "message": "Invalid document type",
  "requestId": "req-128",
  "details": {
    "code": "VALIDATION_INVALID_ENUM",
    "field": "documentType",
    "allowedValues": ["passport", "driver_license", "national_id", "utility_bill"],
    "value": "invalid_type"
  }
}
```
**Cause**: Enum field has invalid value  
**Solution**: Use one of the allowed values

#### VALIDATION_FILE_TOO_LARGE
```json
{
  "message": "File size exceeds 10MB limit",
  "requestId": "req-129",
  "details": {
    "code": "VALIDATION_FILE_TOO_LARGE",
    "field": "fileContent",
    "maxSize": 10485760,
    "actualSize": 15728640
  }
}
```
**Cause**: Uploaded file exceeds size limit  
**Solution**: Compress or resize file

#### VALIDATION_INVALID_FILE_TYPE
```json
{
  "message": "Invalid file type. Only JPEG, PNG, and PDF are allowed",
  "requestId": "req-130",
  "details": {
    "code": "VALIDATION_INVALID_FILE_TYPE",
    "field": "contentType",
    "allowedTypes": ["image/jpeg", "image/png", "application/pdf"],
    "actualType": "image/gif"
  }
}
```
**Cause**: File type not supported  
**Solution**: Convert file to supported format

### Business Logic Errors (BUSINESS_*)

#### BUSINESS_DOCUMENT_NOT_FOUND
```json
{
  "message": "Document not found",
  "requestId": "req-131",
  "details": {
    "code": "BUSINESS_DOCUMENT_NOT_FOUND",
    "documentId": "doc-456",
    "userId": "user-123"
  }
}
```
**Cause**: Document doesn't exist or user doesn't have access  
**Solution**: Verify document ID and user permissions

#### BUSINESS_INVALID_DOCUMENT_STATUS
```json
{
  "message": "Document is not in pending status",
  "requestId": "req-132",
  "details": {
    "code": "BUSINESS_INVALID_DOCUMENT_STATUS",
    "documentId": "doc-456",
    "currentStatus": "approved",
    "requiredStatus": "pending"
  }
}
```
**Cause**: Operation not allowed for current document status  
**Solution**: Check document status before operation

#### BUSINESS_COMMENTS_REQUIRED
```json
{
  "message": "Comments are required for rejection",
  "requestId": "req-133",
  "details": {
    "code": "BUSINESS_COMMENTS_REQUIRED",
    "operation": "reject"
  }
}
```
**Cause**: Required field missing for specific operation  
**Solution**: Provide required comments for rejection

#### BUSINESS_DUPLICATE_UPLOAD
```json
{
  "message": "Document already exists for this user",
  "requestId": "req-134",
  "details": {
    "code": "BUSINESS_DUPLICATE_UPLOAD",
    "userId": "user-123",
    "documentType": "national_id",
    "existingDocumentId": "doc-789"
  }
}
```
**Cause**: User already has document of this type  
**Solution**: Update existing document or delete first

### System Errors (SYSTEM_*)

#### SYSTEM_DATABASE_ERROR
```json
{
  "message": "Database operation failed",
  "requestId": "req-135",
  "details": {
    "code": "SYSTEM_DATABASE_ERROR",
    "operation": "putItem",
    "retryable": true
  }
}
```
**Cause**: Database connectivity or operation error  
**Solution**: Retry request with exponential backoff

#### SYSTEM_S3_ERROR
```json
{
  "message": "File storage operation failed",
  "requestId": "req-136",
  "details": {
    "code": "SYSTEM_S3_ERROR",
    "operation": "putObject",
    "bucket": "sachain-documents",
    "retryable": true
  }
}
```
**Cause**: S3 storage error  
**Solution**: Retry request

#### SYSTEM_EVENTBRIDGE_ERROR
```json
{
  "message": "Event publishing failed",
  "requestId": "req-137",
  "details": {
    "code": "SYSTEM_EVENTBRIDGE_ERROR",
    "eventType": "KYC_STATUS_CHANGED",
    "retryable": false
  }
}
```
**Cause**: EventBridge publishing error  
**Solution**: Operation succeeded but notifications may be delayed

#### SYSTEM_NOTIFICATION_ERROR
```json
{
  "message": "Notification delivery failed",
  "requestId": "req-138",
  "details": {
    "code": "SYSTEM_NOTIFICATION_ERROR",
    "notificationType": "email",
    "recipient": "admin@sachain.com",
    "retryable": true
  }
}
```
**Cause**: SNS or email delivery error  
**Solution**: Operation succeeded but notifications may be delayed

### Rate Limiting Errors (RATE_LIMIT_*)

#### RATE_LIMIT_EXCEEDED
```json
{
  "message": "Rate limit exceeded. Try again later",
  "requestId": "req-139",
  "details": {
    "code": "RATE_LIMIT_EXCEEDED",
    "limit": 100,
    "window": "1 minute",
    "retryAfter": 45
  }
}
```
**Cause**: Too many requests in time window  
**Solution**: Wait and retry after specified time

## Error Handling Best Practices

### 1. Implement Proper Error Classification

```typescript
function classifyError(error: ApiError): ErrorCategory {
  const code = error.details?.code;
  
  if (code?.startsWith('AUTH_')) {
    return 'authentication';
  } else if (code?.startsWith('VALIDATION_')) {
    return 'validation';
  } else if (code?.startsWith('BUSINESS_')) {
    return 'business_logic';
  } else if (code?.startsWith('SYSTEM_')) {
    return 'system';
  } else if (code?.startsWith('RATE_LIMIT_')) {
    return 'rate_limit';
  }
  
  return 'unknown';
}
```

### 2. Implement Retry Logic for Retryable Errors

```typescript
function isRetryableError(error: ApiError): boolean {
  const retryableCodes = [
    'SYSTEM_DATABASE_ERROR',
    'SYSTEM_S3_ERROR',
    'SYSTEM_NOTIFICATION_ERROR',
    'RATE_LIMIT_EXCEEDED'
  ];
  
  return retryableCodes.includes(error.details?.code) || 
         error.details?.retryable === true;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: ApiError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as ApiError;
      
      if (!isRetryableError(lastError) || attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000) + 
                   Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

### 3. User-Friendly Error Messages

```typescript
function getUserFriendlyMessage(error: ApiError): string {
  const code = error.details?.code;
  
  switch (code) {
    case 'AUTH_TOKEN_MISSING':
    case 'AUTH_TOKEN_INVALID':
      return 'Please log in again to continue.';
    
    case 'AUTH_INSUFFICIENT_PERMISSIONS':
      return 'You don\'t have permission to perform this action.';
    
    case 'VALIDATION_FILE_TOO_LARGE':
      return 'File is too large. Please choose a file smaller than 10MB.';
    
    case 'VALIDATION_INVALID_FILE_TYPE':
      return 'Invalid file type. Please upload a JPEG, PNG, or PDF file.';
    
    case 'BUSINESS_DOCUMENT_NOT_FOUND':
      return 'Document not found. It may have been deleted or you may not have access.';
    
    case 'BUSINESS_INVALID_DOCUMENT_STATUS':
      return 'This document has already been processed and cannot be modified.';
    
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many requests. Please wait a moment and try again.';
    
    case 'SYSTEM_DATABASE_ERROR':
    case 'SYSTEM_S3_ERROR':
      return 'A temporary error occurred. Please try again.';
    
    default:
      return error.message || 'An unexpected error occurred.';
  }
}
```

### 4. Logging and Monitoring

```typescript
function logError(error: ApiError, context: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: error.requestId,
    errorCode: error.details?.code,
    message: error.message,
    context,
    retryable: error.details?.retryable
  };
  
  // Send to logging service
  console.error('API Error:', logData);
  
  // Send to monitoring service for alerts
  if (error.details?.code?.startsWith('SYSTEM_')) {
    // Alert on system errors
    sendAlert('system_error', logData);
  }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: "Authentication token is required"
**Symptoms**: 401 error with AUTH_TOKEN_MISSING  
**Solutions**:
1. Ensure Authorization header is included
2. Check header format: `Authorization: Bearer <token>`
3. Verify token is not empty or null

#### Issue: "Invalid or expired authentication token"
**Symptoms**: 401 error with AUTH_TOKEN_INVALID  
**Solutions**:
1. Refresh the JWT token
2. Re-authenticate the user
3. Check token expiration time
4. Verify token signature

#### Issue: "File size exceeds 10MB limit"
**Symptoms**: 413 error or VALIDATION_FILE_TOO_LARGE  
**Solutions**:
1. Compress the file
2. Resize images to lower resolution
3. Use PDF compression tools
4. Split large documents

#### Issue: "Rate limit exceeded"
**Symptoms**: 429 error with RATE_LIMIT_EXCEEDED  
**Solutions**:
1. Implement exponential backoff
2. Reduce request frequency
3. Cache responses when possible
4. Use batch operations

#### Issue: "Document not found"
**Symptoms**: 404 error with BUSINESS_DOCUMENT_NOT_FOUND  
**Solutions**:
1. Verify document ID is correct
2. Check user has access to document
3. Ensure document wasn't deleted
4. Verify user ID matches document owner

### Debug Information

When reporting issues, include:

1. **Request ID**: Found in error response
2. **Timestamp**: When error occurred
3. **Request details**: Method, URL, headers (excluding sensitive data)
4. **User context**: User ID, role, permissions
5. **Error response**: Complete error object
6. **Steps to reproduce**: Detailed reproduction steps

### Support Contacts

- **Technical Support**: support@sachain.com
- **API Issues**: api-support@sachain.com
- **Security Issues**: security@sachain.com
- **Documentation**: docs@sachain.com