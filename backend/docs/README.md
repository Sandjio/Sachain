# Sachain Backend API Documentation

Welcome to the Sachain API documentation. This comprehensive guide provides everything you need to integrate with the Sachain platform for KYC verification and document management.

## 📚 Documentation Overview

This documentation package includes:

- **[OpenAPI Specification](./openapi.yaml)** - Complete API specification in OpenAPI 3.0 format
- **[Integration Guide](./integration-guide.md)** - Comprehensive examples and patterns
- **[Error Codes Reference](./error-codes.md)** - Detailed error handling guide
- **[Frontend SDK](../sachain-frontend/src/sdk/)** - TypeScript SDK for frontend integration

## 🚀 Quick Start

### 1. Authentication

All API requests require AWS Cognito JWT authentication:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     https://api.sachain.com/v1/kyc/documents
```

### 2. Upload a Document

```bash
curl -X POST https://api.sachain.com/v1/kyc/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "documentType": "national_id",
    "fileName": "national_id.jpg",
    "contentType": "image/jpeg",
    "fileContent": "base64-encoded-content"
  }'
```

### 3. Admin Review

```bash
# Approve document
curl -X POST https://api.sachain.com/v1/admin/approve \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "documentId": "doc-456",
    "comments": "Document verified successfully"
  }'
```

## 📋 API Endpoints

### KYC Upload Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/kyc/presigned-url` | Generate presigned URL for S3 upload |
| POST | `/kyc/upload` | Direct document upload |
| POST | `/kyc/process-upload` | Process uploaded document |

### Admin Review Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/approve` | Approve KYC document |
| POST | `/admin/reject` | Reject KYC document |
| GET | `/admin/documents` | Get documents for review |

## 🔧 SDK Usage

### TypeScript/JavaScript

```typescript
import { SachainApiClient } from '@sachain/sdk';

const client = new SachainApiClient({
  baseUrl: 'https://api.sachain.com/v1'
});

// Set user session
client.setSession(userSession);

// Upload document
const result = await client.uploadDocument(file, 'national_id', {
  onProgress: (progress) => console.log(`${progress}%`)
});
```

### React Hook

```typescript
import { useKycUpload } from '@sachain/sdk';

function UploadComponent() {
  const { uploadDocument, uploading, progress, error } = useKycUpload(client);
  
  const handleUpload = async (file: File) => {
    try {
      await uploadDocument(file, 'national_id');
      console.log('Upload successful!');
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };
  
  return (
    <div>
      {uploading && <div>Progress: {progress}%</div>}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## 🔒 Security

### Authentication
- All endpoints require valid AWS Cognito JWT tokens
- Admin endpoints require additional role-based permissions
- Tokens should be included in the `Authorization` header

### File Upload Security
- Maximum file size: 10MB
- Allowed file types: JPEG, PNG, PDF
- Files are encrypted at rest using AWS KMS
- Presigned URLs expire after 1 hour

### Rate Limiting
- User endpoints: 100 requests/minute
- Admin endpoints: 500 requests/minute
- Upload endpoints: 10 uploads/minute

## 📊 Response Formats

### Success Response
```json
{
  "documentId": "doc-456",
  "message": "Document uploaded successfully",
  "status": "pending"
}
```

### Error Response
```json
{
  "message": "Invalid document type",
  "requestId": "req-123",
  "details": {
    "code": "VALIDATION_INVALID_ENUM",
    "field": "documentType",
    "allowedValues": ["passport", "driver_license", "national_id", "utility_bill"]
  }
}
```

## 🔄 Retry Logic

The API implements automatic retry for transient errors:

```typescript
// Exponential backoff with jitter
const delay = Math.min(
  baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
  maxDelay
);
```

Retryable error codes:
- `SYSTEM_DATABASE_ERROR`
- `SYSTEM_S3_ERROR`
- `SYSTEM_NOTIFICATION_ERROR`
- `RATE_LIMIT_EXCEEDED`

## 📈 Monitoring and Observability

### Request Tracing
- All requests include a unique `requestId`
- AWS X-Ray distributed tracing enabled
- CloudWatch metrics for all operations

### Health Checks
```bash
curl https://api.sachain.com/v1/health
```

### Metrics
- Request latency and throughput
- Error rates by endpoint and error type
- File upload success/failure rates
- Admin review processing times

## 🌍 Environments

| Environment | Base URL | Description |
|-------------|----------|-------------|
| Production | `https://api.sachain.com/v1` | Live production environment |
| Staging | `https://staging-api.sachain.com/v1` | Pre-production testing |
| Development | `http://localhost:3000/v1` | Local development |

## 📝 Changelog

### v1.0.0 (Current)
- Initial API release
- KYC document upload and processing
- Admin review workflow
- Comprehensive error handling
- Rate limiting and security features

## 🆘 Support

### Documentation
- **API Reference**: [OpenAPI Specification](./openapi.yaml)
- **Integration Guide**: [Detailed examples](./integration-guide.md)
- **Error Handling**: [Error codes and troubleshooting](./error-codes.md)

### Contact
- **Technical Support**: support@sachain.com
- **API Issues**: api-support@sachain.com
- **Security Issues**: security@sachain.com
- **Documentation**: docs@sachain.com

### Community
- **GitHub**: [Sachain Repository](https://github.com/sachain/sachain)
- **Discord**: [Developer Community](https://discord.gg/sachain)
- **Stack Overflow**: Tag questions with `sachain-api`

## 🧪 Testing

### Postman Collection
Download our [Postman collection](./postman/sachain-api.json) for easy API testing.

### Test Data
Use these test values for development:

```json
{
  "testUserId": "test-user-123",
  "testDocumentId": "test-doc-456",
  "testAdminId": "test-admin-789"
}
```

### Mock Responses
Enable mock mode by adding header:
```
X-Mock-Response: true
```

## 🔮 Roadmap

### Upcoming Features
- [ ] Bulk document processing
- [ ] Webhook notifications
- [ ] GraphQL API
- [ ] Mobile SDK (React Native)
- [ ] Advanced document validation (OCR)
- [ ] Multi-language support

### API Versioning
- Current version: v1
- Backward compatibility guaranteed for major versions
- Deprecation notices provided 6 months in advance

## 📄 License

This API documentation is licensed under [MIT License](../LICENSE).

---

**Need help?** Check our [Integration Guide](./integration-guide.md) for detailed examples or contact our support team.