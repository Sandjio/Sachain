# Sachain Backend API Documentation

Welcome to the Sachain API documentation. This comprehensive guide provides everything you need to integrate with the Sachain platform for KYC verification, project creation, and tokenized fundraising.

## 📚 Documentation Overview

This documentation package includes:

### Core Documentation
- **[OpenAPI Specification](./openapi.yaml)** - Complete API specification in OpenAPI 3.0 format
- **[API Changelog](./api-changelog.md)** - Version history, breaking changes, and migration guides
- **[Error Codes Reference](./error-codes.md)** - Detailed error handling guide
- **[Project Error Codes](./project-error-codes.md)** - Project-specific error codes and troubleshooting

### Integration Guides
- **[Integration Guide](./integration-guide.md)** - Comprehensive examples and patterns for KYC workflows
- **[Project API Examples](./project-api-examples.md)** - Project creation and stock minting examples
- **[Hedera Integration Guide](./hedera-integration-guide.md)** - Hedera Token Service integration documentation
- **[SDK Integration Examples](./sdk-integration-examples.md)** - SDK usage examples for various frameworks

### SDK & Tools
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

### 3. Create Project

```bash
# Create a new project
curl -X POST https://api.sachain.com/v1/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EcoTech Solutions",
    "description": "Revolutionary solar panel technology that increases efficiency by 40%",
    "category": "CleanTech",
    "stockSupply": 10000,
    "targetFundingGoal": 500000,
    "pricePerStock": 50
  }'
```

### 4. Mint Stocks

```bash
# Mint stock NFTs for a project
curl -X POST https://api.sachain.com/v1/projects/proj-123/mint-stocks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0.0.123456"
  }'
```

### 5. Admin Review

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

### Project Creation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects` | Create new project |
| GET | `/projects` | Get projects with filtering |
| GET | `/projects/{id}` | Get project details |
| PUT | `/projects/{id}` | Update project (draft only) |
| DELETE | `/projects/{id}` | Delete project (draft only) |
| PUT | `/projects/{id}/status` | Update project status |

### Stock Minting Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{id}/mint-stocks` | Mint stock NFTs for project |
| GET | `/projects/{id}/mint-stocks/status` | Get minting progress |
| GET | `/projects/{id}/stocks` | Get project stocks |
| GET | `/projects/{id}/stocks/{number}` | Get specific stock details |
| GET | `/stocks/portfolio` | Get investor portfolio |

## 🔧 SDK Usage

### TypeScript/JavaScript

```typescript
import { SachainSDK } from '@sachain/sdk';

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

// Create project
const project = await sdk.projects.create({
  name: 'My Startup',
  description: 'Innovative solution for...',
  category: 'Technology',
  stockSupply: 5000
});

// Mint stocks
const result = await sdk.projects.mintStocks(project.projectId, {
  walletAddress: '0.0.123456',
  onProgress: (progress) => console.log(`${progress.percentage}%`)
});

// Upload KYC document
const uploadResult = await sdk.kyc.uploadDocument(file, 'national_id', {
  onProgress: (progress) => console.log(`${progress}%`)
});
```

### React Hooks

```typescript
import { useProjectCreation, useStockMinting, useKycUpload } from '@sachain/sdk';

function ProjectComponent() {
  const { createProject, creating, error: createError } = useProjectCreation();
  const { mintStocks, minting, progress, error: mintError } = useStockMinting();
  const { uploadDocument, uploading, error: uploadError } = useKycUpload();
  
  const handleCreateProject = async (projectData) => {
    try {
      const project = await createProject(projectData);
      console.log('Project created:', project.projectId);
    } catch (err) {
      console.error('Project creation failed:', err);
    }
  };

  const handleMintStocks = async (projectId, walletAddress) => {
    try {
      await mintStocks(projectId, walletAddress);
      console.log('Stocks minted successfully!');
    } catch (err) {
      console.error('Minting failed:', err);
    }
  };
  
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
      {creating && <div>Creating project...</div>}
      {minting && <div>Minting progress: {progress}%</div>}
      {uploading && <div>Uploading document...</div>}
      {(createError || mintError || uploadError) && (
        <div>Error: {createError || mintError || uploadError}</div>
      )}
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
- [ ] Secondary market trading
- [ ] Dividend distribution automation
- [ ] Governance voting mechanisms
- [ ] Bulk document processing
- [ ] Webhook notifications
- [ ] GraphQL API
- [ ] Mobile SDK (React Native)
- [ ] Advanced document validation (OCR)
- [ ] Multi-language support
- [ ] Cross-chain bridge integration
- [ ] Advanced analytics dashboard

### API Versioning
- Current version: v1
- Backward compatibility guaranteed for major versions
- Deprecation notices provided 6 months in advance

## 📚 Additional Resources

### Specialized Guides
- **[Project Creation Workflow](./project-api-examples.md#complete-project-workflow-example)** - End-to-end project setup
- **[Hedera Token Service](./hedera-integration-guide.md)** - Blockchain integration details
- **[Error Troubleshooting](./project-error-codes.md#troubleshooting-guide)** - Common issues and solutions
- **[SDK Framework Examples](./sdk-integration-examples.md)** - React, Vue, Node.js integration

### API Reference
- **[All Endpoints](./openapi.yaml)** - Complete OpenAPI specification
- **[Version History](./api-changelog.md)** - Changes and migration guides
- **[Error Codes](./error-codes.md)** - Comprehensive error reference

## 📄 License

This API documentation is licensed under [MIT License](../LICENSE).

---

**Need help?** Check our documentation guides above or contact our support team:
- **General Support**: support@sachain.com
- **Integration Help**: integration@sachain.com
- **Project Issues**: projects@sachain.com
- **Hedera Integration**: hedera@sachain.com