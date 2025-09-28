# Sachain API Changelog

This document tracks all changes, additions, and improvements to the Sachain API.

## Version 1.2.0 (Current) - Project Creation & Stock Minting

**Release Date**: January 2024

### 🚀 New Features

#### Project Creation Endpoints
- **POST /projects** - Create new tokenized projects
- **GET /projects** - List projects with advanced filtering and pagination
- **GET /projects/{id}** - Get detailed project information
- **PUT /projects/{id}** - Update draft projects
- **DELETE /projects/{id}** - Delete draft projects
- **PUT /projects/{id}/status** - Manage project status transitions

#### Stock Minting & Management
- **POST /projects/{id}/mint-stocks** - Mint stock NFTs using Hedera Token Service
- **GET /projects/{id}/mint-stocks/status** - Track minting progress in real-time
- **GET /projects/{id}/stocks** - Query project stocks with filtering
- **GET /projects/{id}/stocks/{number}** - Get individual stock details
- **GET /stocks/portfolio** - View investor stock portfolios

#### Cover Image Management
- **POST /projects/{id}/cover-image** - Upload project cover images
- Support for PNG, JPG, JPEG formats up to 5MB
- Automatic image processing and thumbnail generation

### 🔧 Enhancements

#### Authentication & Authorization
- Enhanced JWT token validation for project operations
- Role-based access control for entrepreneurs vs investors
- KYC status verification for project creation

#### Data Models
- New Project entity with comprehensive metadata
- StockNFT entity for individual stock tracking
- ProjectStats for real-time analytics
- HederaTransaction records for audit trails

#### Error Handling
- 50+ new project-specific error codes
- Detailed error responses with actionable guidance
- Retry logic for Hedera network operations
- Comprehensive validation error messages

#### Performance Optimizations
- GSI-optimized DynamoDB queries for project listings
- Batch NFT minting (50 NFTs per batch)
- Caching headers for frequently accessed data
- Pagination support for large datasets

### 🌐 Hedera Integration

#### Token Service Features
- Automatic HTS token creation for projects
- Batch NFT minting with progress tracking
- IPFS metadata storage for tokens and NFTs
- Gas fee estimation and balance validation

#### Supported Operations
- Token creation with project-specific metadata
- Serial number-based NFT minting
- Ownership tracking and transfer history
- Treasury account management

### 📊 New Response Formats

#### Project Responses
```json
{
  "projectId": "proj-789",
  "name": "EcoTech Solutions",
  "status": "active",
  "stockSupply": 10000,
  "stats": {
    "totalStocks": 10000,
    "mintedStocks": 10000,
    "availableStocks": 8500,
    "soldStocks": 1500,
    "totalRaised": 75000
  }
}
```

#### Minting Progress
```json
{
  "progress": {
    "completed": 5000,
    "total": 10000,
    "percentage": 50,
    "status": "in_progress",
    "currentBatch": 100,
    "totalBatches": 200
  }
}
```

### 🔒 Security Improvements
- Input sanitization for all project fields
- File upload validation and virus scanning
- Rate limiting for minting operations (10 per minute)
- Audit logging for all project operations

### 📈 Monitoring & Analytics
- CloudWatch metrics for project operations
- Custom metrics for minting success rates
- Performance monitoring for Hedera operations
- Business metrics tracking

---

## Version 1.1.0 - Enhanced KYC & Admin Features

**Release Date**: December 2023

### 🚀 New Features

#### Enhanced Admin Workflow
- **GET /admin/documents** - Paginated document listing with filters
- Bulk approval/rejection capabilities
- Advanced document status tracking
- Admin notification system

#### Improved KYC Process
- **POST /kyc/process-upload** - Process presigned URL uploads
- Enhanced document validation
- Automatic admin notifications
- Compliance audit trails

### 🔧 Enhancements

#### Error Handling
- Standardized error response format
- 30+ new error codes with detailed descriptions
- User-friendly error messages
- Retry guidance for transient errors

#### Performance
- Optimized DynamoDB queries
- Reduced API response times by 40%
- Improved file upload reliability
- Enhanced caching strategies

#### Security
- Enhanced JWT token validation
- Improved input sanitization
- Rate limiting implementation
- Security headers enforcement

---

## Version 1.0.0 - Initial Release

**Release Date**: November 2023

### 🚀 Initial Features

#### KYC Document Upload
- **POST /kyc/presigned-url** - Generate secure upload URLs
- **POST /kyc/upload** - Direct document upload
- Support for passport, driver license, national ID, utility bills
- File validation (type, size, format)

#### Admin Review System
- **POST /admin/approve** - Approve KYC documents
- **POST /admin/reject** - Reject documents with comments
- Role-based access control
- Audit logging for all admin actions

#### Authentication
- AWS Cognito integration
- JWT token-based authentication
- User session management
- Secure password policies

#### Core Infrastructure
- RESTful API design
- OpenAPI 3.0 specification
- Comprehensive error handling
- CloudWatch monitoring

---

## Upcoming Features (Roadmap)

### Version 1.3.0 - Secondary Market (Q2 2024)
- Stock trading marketplace
- Order book management
- Price discovery mechanisms
- Transaction settlement

### Version 1.4.0 - Governance & Dividends (Q3 2024)
- Shareholder voting systems
- Dividend distribution automation
- Governance proposal management
- Voting weight calculations

### Version 1.5.0 - Advanced Analytics (Q4 2024)
- Real-time market data
- Portfolio analytics
- Performance metrics
- Investment insights

### Version 2.0.0 - Multi-Chain Support (2025)
- Ethereum bridge integration
- Polygon network support
- Cross-chain asset transfers
- Unified wallet management

---

## Breaking Changes

### Version 1.2.0
- **New Required Field**: `stockSupply` is now required for project creation
- **Authentication**: All project endpoints require valid JWT tokens
- **Rate Limiting**: New rate limits applied to minting operations
- **Response Format**: Project responses now include additional metadata fields

### Version 1.1.0
- **Error Format**: Standardized error response structure
- **Pagination**: Changed pagination format for admin endpoints
- **Headers**: New required headers for file uploads

---

## Deprecation Notices

### Deprecated in 1.2.0 (Removal in 2.0.0)
- Legacy error response format (use new standardized format)
- Old pagination parameters (use new cursor-based pagination)

### Deprecated in 1.1.0 (Removal in 1.3.0)
- Direct file upload without validation (use validated upload endpoints)

---

## Migration Guides

### Migrating to 1.2.0

#### Update Project Creation Calls
```typescript
// Old (1.1.0)
const project = await api.post('/projects', {
  name: 'My Project',
  description: 'Project description'
});

// New (1.2.0)
const project = await api.post('/projects', {
  name: 'My Project',
  description: 'Project description',
  category: 'Technology',
  stockSupply: 10000  // Now required
});
```

#### Handle New Error Format
```typescript
// Old error handling
if (error.status === 400) {
  console.log(error.message);
}

// New error handling
if (error.status === 400) {
  console.log(error.message);
  console.log('Error code:', error.details?.code);
  console.log('Request ID:', error.requestId);
}
```

### Migrating to 1.1.0

#### Update Admin Document Queries
```typescript
// Old pagination
const docs = await api.get('/admin/documents?page=1&size=20');

// New pagination
const docs = await api.get('/admin/documents?limit=20&exclusiveStartKey=...');
```

---

## API Versioning Strategy

### Version Format
- **Major.Minor.Patch** (e.g., 1.2.0)
- **Major**: Breaking changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

### Backward Compatibility
- Minor versions maintain backward compatibility
- Deprecated features supported for 2 major versions
- 6-month notice for breaking changes
- Migration guides provided for all major updates

### Version Headers
```http
API-Version: 1.2.0
Accept-Version: 1.x
```

---

## Support & Documentation

### Updated Documentation
- [OpenAPI Specification](./openapi.yaml) - Always reflects current version
- [Integration Guide](./integration-guide.md) - Updated with new examples
- [Error Codes](./error-codes.md) - Comprehensive error reference
- [Project API Examples](./project-api-examples.md) - New project workflow examples
- [Hedera Integration](./hedera-integration-guide.md) - Blockchain integration guide
- [SDK Examples](./sdk-integration-examples.md) - Framework-specific examples

### Getting Help
- **API Issues**: api-support@sachain.com
- **Integration Help**: integration@sachain.com
- **Bug Reports**: bugs@sachain.com
- **Feature Requests**: features@sachain.com

### Community Resources
- **GitHub**: [API Examples Repository](https://github.com/sachain/api-examples)
- **Discord**: [Developer Community](https://discord.gg/sachain-dev)
- **Stack Overflow**: Tag questions with `sachain-api`
- **Developer Blog**: [blog.sachain.com](https://blog.sachain.com)

---

*This changelog is updated with each release. Subscribe to our [developer newsletter](https://sachain.com/developers/newsletter) for release notifications.*