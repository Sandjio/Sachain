# Sachain API Integration Guide

This guide provides comprehensive examples and patterns for integrating with the Sachain API.

## Table of Contents

- [Authentication](#authentication)
- [KYC Document Upload](#kyc-document-upload)
- [Admin Review Workflow](#admin-review-workflow)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [SDK Usage](#sdk-usage)

## Authentication

### AWS Cognito JWT Token

All API requests require authentication using AWS Cognito JWT tokens.

```typescript
// Example: Adding authentication header
const headers = {
  'Authorization': `Bearer ${cognitoJwtToken}`,
  'Content-Type': 'application/json'
};
```

### Admin Authentication

Admin endpoints require additional permissions in the JWT token:

```typescript
// Admin token should include admin group membership
const adminHeaders = {
  'Authorization': `Bearer ${adminJwtToken}`,
  'Content-Type': 'application/json'
};
```

## KYC Document Upload

### Method 1: Direct Upload

Upload documents directly through the API using base64 encoding:

```typescript
async function uploadDocumentDirect(
  userId: string,
  file: File,
  documentType: 'national_id' | 'passport' | 'driver_license' | 'utility_bill'
) {
  // Convert file to base64
  const fileContent = await fileToBase64(file);
  
  const response = await fetch('/api/v1/kyc/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      documentType,
      fileName: file.name,
      contentType: file.type,
      fileContent
    })
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data:mime/type;base64, prefix
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
  });
}
```

### Method 2: Presigned URL Upload

For larger files or better performance, use presigned URLs:

```typescript
async function uploadDocumentPresigned(
  userId: string,
  file: File,
  documentType: 'national_id' | 'passport' | 'driver_license' | 'utility_bill'
) {
  // Step 1: Get presigned URL
  const presignedResponse = await fetch('/api/v1/kyc/presigned-url', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      documentType,
      fileName: file.name,
      contentType: file.type
    })
  });
  
  if (!presignedResponse.ok) {
    throw new Error('Failed to get presigned URL');
  }
  
  const { documentId, uploadUrl } = await presignedResponse.json();
  
  // Step 2: Upload to S3 using presigned URL
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
  
  if (!uploadResponse.ok) {
    throw new Error('Failed to upload to S3');
  }
  
  // Step 3: Process the upload
  const processResponse = await fetch('/api/v1/kyc/process-upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      documentId,
      userId,
      s3Key: extractS3KeyFromUrl(uploadUrl),
      fileSize: file.size
    })
  });
  
  if (!processResponse.ok) {
    throw new Error('Failed to process upload');
  }
  
  return await processResponse.json();
}

function extractS3KeyFromUrl(url: string): string {
  const urlObj = new URL(url);
  return urlObj.pathname.substring(1); // Remove leading slash
}
```

### File Validation

Always validate files before upload:

```typescript
interface FileValidation {
  isValid: boolean;
  errors: string[];
}

function validateFile(file: File): FileValidation {
  const errors: string[] = [];
  
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size exceeds 10MB limit');
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Only JPEG, PNG, and PDF are allowed');
  }
  
  // Check file name
  const fileNameRegex = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|pdf)$/i;
  if (!fileNameRegex.test(file.name)) {
    errors.push('Invalid file name format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## Admin Review Workflow

### Get Pending Documents

```typescript
async function getPendingDocuments(limit: number = 50) {
  const response = await fetch(`/api/v1/admin/documents?status=pending&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }
  
  return await response.json();
}
```

### Approve Document

```typescript
async function approveDocument(
  userId: string,
  documentId: string,
  comments?: string
) {
  const response = await fetch('/api/v1/admin/approve', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      documentId,
      comments
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Approval failed: ${error.message}`);
  }
  
  return await response.json();
}
```

### Reject Document

```typescript
async function rejectDocument(
  userId: string,
  documentId: string,
  comments: string // Required for rejection
) {
  if (!comments || comments.trim().length === 0) {
    throw new Error('Comments are required for document rejection');
  }
  
  const response = await fetch('/api/v1/admin/reject', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      documentId,
      comments
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Rejection failed: ${error.message}`);
  }
  
  return await response.json();
}
```

## Error Handling

### Standard Error Response Format

All API errors follow this format:

```typescript
interface ApiError {
  message: string;
  requestId?: string;
  details?: {
    field?: string;
    code?: string;
    [key: string]: any;
  };
}
```

### Error Handling Best Practices

```typescript
async function handleApiCall<T>(apiCall: () => Promise<Response>): Promise<T> {
  try {
    const response = await apiCall();
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      
      switch (response.status) {
        case 400:
          throw new ValidationError(error.message, error.details);
        case 401:
          throw new AuthenticationError(error.message);
        case 403:
          throw new AuthorizationError(error.message);
        case 404:
          throw new NotFoundError(error.message);
        case 413:
          throw new FileTooLargeError(error.message);
        case 429:
          throw new RateLimitError(error.message);
        case 500:
          throw new ServerError(error.message, error.requestId);
        default:
          throw new ApiError(error.message);
      }
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('Network connection failed');
    }
    throw error;
  }
}

// Custom error classes
class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class FileTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileTooLargeError';
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

class ServerError extends Error {
  constructor(message: string, public requestId?: string) {
    super(message);
    this.name = 'ServerError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

### Retry Logic

Implement exponential backoff for retryable errors:

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof ValidationError || 
          error instanceof AuthenticationError || 
          error instanceof AuthorizationError || 
          error instanceof NotFoundError) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **User endpoints**: 100 requests per minute per user
- **Admin endpoints**: 500 requests per minute per admin
- **Upload endpoints**: 10 uploads per minute per user

### Handling Rate Limits

```typescript
async function handleRateLimit(response: Response) {
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 1 minute
    
    console.warn(`Rate limited. Retrying after ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry the request
    return true;
  }
  return false;
}
```

## SDK Usage

### TypeScript SDK

```typescript
import { SachainSDK } from '@sachain/sdk';

// Initialize SDK
const sdk = new SachainSDK({
  baseUrl: 'https://api.sachain.com/v1',
  cognitoConfig: {
    userPoolId: 'us-east-1_xxxxxxxxx',
    clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    region: 'us-east-1'
  }
});

// Authenticate user
await sdk.auth.signIn('user@example.com', 'password');

// Upload document
const uploadResult = await sdk.kyc.uploadDocument({
  file: documentFile,
  documentType: 'national_id'
});

// Admin operations (requires admin privileges)
const pendingDocs = await sdk.admin.getPendingDocuments();
await sdk.admin.approveDocument(userId, documentId, 'Verified successfully');
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react';
import { SachainSDK } from '@sachain/sdk';

export function useKYCUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const uploadDocument = useCallback(async (
    file: File,
    documentType: 'national_id' | 'passport' | 'driver_license' | 'utility_bill'
  ) => {
    setUploading(true);
    setError(null);
    
    try {
      const result = await sdk.kyc.uploadDocument({
        file,
        documentType
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);
  
  return {
    uploadDocument,
    uploading,
    error
  };
}
```

## Common Integration Patterns

### File Upload with Progress

```typescript
async function uploadWithProgress(
  file: File,
  onProgress: (progress: number) => void
) {
  // For presigned URL uploads, you can track progress
  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    // Get presigned URL first, then upload
    // ... implementation details
  });
}
```

### Batch Operations

```typescript
async function batchApproveDocuments(
  documents: Array<{ userId: string; documentId: string; comments?: string }>
) {
  const results = await Promise.allSettled(
    documents.map(doc => 
      sdk.admin.approveDocument(doc.userId, doc.documentId, doc.comments)
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  return { successful, failed, results };
}
```

This integration guide provides comprehensive examples for working with the Sachain API. For additional support, please refer to the OpenAPI specification or contact the development team.