# Project Creation & Stock Minting Error Codes

This document provides detailed error codes and troubleshooting guidance specific to project creation and stock minting operations in the Sachain API.

## Project Creation Error Codes

### PROJECT_INVALID_DATA
```json
{
  "message": "Project validation failed",
  "requestId": "req-140",
  "details": {
    "code": "PROJECT_INVALID_DATA",
    "errors": [
      "Project name must be between 3-100 characters",
      "Stock supply must be between 1 and 1,000,000"
    ]
  }
}
```
**Cause**: Invalid project data provided  
**Solution**: Fix validation errors and resubmit

### PROJECT_KYC_NOT_VERIFIED
```json
{
  "message": "KYC verification must be completed before creating projects",
  "requestId": "req-141",
  "details": {
    "code": "PROJECT_KYC_NOT_VERIFIED",
    "kycStatus": "pending",
    "requiredStatus": "approved"
  }
}
```
**Cause**: User's KYC status is not approved  
**Solution**: Complete KYC verification process

### PROJECT_NAME_EXISTS
```json
{
  "message": "A project with this name already exists for your account",
  "requestId": "req-142",
  "details": {
    "code": "PROJECT_NAME_EXISTS",
    "existingProjectId": "proj-123",
    "attemptedName": "EcoTech Solutions"
  }
}
```
**Cause**: Duplicate project name for the same entrepreneur  
**Solution**: Choose a different project name

### PROJECT_NOT_FOUND
```json
{
  "message": "Project not found",
  "requestId": "req-143",
  "details": {
    "code": "PROJECT_NOT_FOUND",
    "projectId": "proj-nonexistent"
  }
}
```
**Cause**: Project doesn't exist or user doesn't have access  
**Solution**: Verify project ID and user permissions

### PROJECT_UNAUTHORIZED_ACCESS
```json
{
  "message": "You are not authorized to access this project",
  "requestId": "req-144",
  "details": {
    "code": "PROJECT_UNAUTHORIZED_ACCESS",
    "projectId": "proj-789",
    "entrepreneurId": "user-123",
    "projectOwner": "user-456"
  }
}
```
**Cause**: User is not the project owner  
**Solution**: Only project owners can perform this operation

## Stock Minting Error Codes

### PROJECT_INVALID_STATUS
```json
{
  "message": "Cannot mint stocks for project in active status",
  "requestId": "req-145",
  "details": {
    "code": "PROJECT_INVALID_STATUS",
    "projectId": "proj-789",
    "currentStatus": "active",
    "requiredStatus": "draft"
  }
}
```
**Cause**: Operation not allowed for current project status  
**Solution**: Check project status before operation

### PROJECT_INSUFFICIENT_BALANCE
```json
{
  "message": "Insufficient wallet balance for minting operation",
  "requestId": "req-146",
  "details": {
    "code": "PROJECT_INSUFFICIENT_BALANCE",
    "walletAddress": "0.0.123456",
    "currentBalance": "50.0",
    "requiredAmount": "100.0",
    "estimatedGasFee": "100.0"
  }
}
```
**Cause**: Insufficient HBAR balance for transaction fees  
**Solution**: Add more HBAR to wallet

### PROJECT_INVALID_WALLET_ADDRESS
```json
{
  "message": "Invalid Hedera wallet address format",
  "requestId": "req-147",
  "details": {
    "code": "PROJECT_INVALID_WALLET_ADDRESS",
    "walletAddress": "invalid-address",
    "expectedFormat": "0.0.accountId"
  }
}
```
**Cause**: Wallet address doesn't match Hedera format  
**Solution**: Use valid Hedera account format (0.0.123456)

### PROJECT_TOKEN_CREATION_FAILED
```json
{
  "message": "Failed to create project token on Hedera network",
  "requestId": "req-148",
  "details": {
    "code": "PROJECT_TOKEN_CREATION_FAILED",
    "projectId": "proj-789",
    "error": "Network timeout",
    "retryable": true
  }
}
```
**Cause**: Hedera network error during token creation  
**Solution**: Retry the operation

### PROJECT_NFT_MINTING_FAILED
```json
{
  "message": "Failed to mint stock NFTs",
  "requestId": "req-149",
  "details": {
    "code": "PROJECT_NFT_MINTING_FAILED",
    "projectId": "proj-789",
    "tokenId": "0.0.123456",
    "totalMinted": 5000,
    "completedBatches": 100,
    "error": "Batch minting timeout"
  }
}
```
**Cause**: NFT minting process failed  
**Solution**: Check wallet and network, then retry

### PROJECT_MINTING_IN_PROGRESS
```json
{
  "message": "Stock minting is already in progress for this project",
  "requestId": "req-150",
  "details": {
    "code": "PROJECT_MINTING_IN_PROGRESS",
    "projectId": "proj-789",
    "currentProgress": 45,
    "estimatedCompletion": "2024-01-15T15:30:00Z"
  }
}
```
**Cause**: Minting operation already running  
**Solution**: Wait for current minting to complete

## Project Management Error Codes

### PROJECT_INVALID_STATUS_TRANSITION
```json
{
  "message": "Invalid status transition from 'completed' to 'active'",
  "requestId": "req-151",
  "details": {
    "code": "PROJECT_INVALID_STATUS_TRANSITION",
    "projectId": "proj-789",
    "currentStatus": "completed",
    "requestedStatus": "active",
    "allowedTransitions": []
  }
}
```
**Cause**: Invalid status transition requested  
**Solution**: Check allowed status transitions

### PROJECT_CASCADE_DELETION_FAILED
```json
{
  "message": "Failed to delete associated project data",
  "requestId": "req-152",
  "details": {
    "code": "PROJECT_CASCADE_DELETION_FAILED",
    "projectId": "proj-789",
    "failedOperations": ["stocks", "statistics"]
  }
}
```
**Cause**: Error during cascade deletion  
**Solution**: Contact support for manual cleanup

## Stock Query Error Codes

### STOCK_NOT_FOUND
```json
{
  "message": "Stock not found",
  "requestId": "req-153",
  "details": {
    "code": "STOCK_NOT_FOUND",
    "projectId": "proj-789",
    "stockNumber": 42
  }
}
```
**Cause**: Stock doesn't exist  
**Solution**: Verify stock number and project ID

### STOCK_UNAUTHORIZED_ACCESS
```json
{
  "message": "Unauthorized access to stock information",
  "requestId": "req-154",
  "details": {
    "code": "STOCK_UNAUTHORIZED_ACCESS",
    "projectId": "proj-789",
    "stockNumber": 42,
    "projectStatus": "draft"
  }
}
```
**Cause**: Cannot access stocks of non-active projects  
**Solution**: Only active project stocks are publicly accessible

### PORTFOLIO_INVALID_WALLET
```json
{
  "message": "Invalid wallet address for portfolio query",
  "requestId": "req-155",
  "details": {
    "code": "PORTFOLIO_INVALID_WALLET",
    "walletAddress": "invalid-wallet",
    "expectedFormat": "0.0.accountId"
  }
}
```
**Cause**: Invalid wallet address format  
**Solution**: Use valid Hedera account format

## Error Handling Best Practices

### Project Error Classification

```typescript
enum ProjectErrorCategory {
  VALIDATION = 'validation',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  HEDERA_NETWORK = 'hedera_network',
  SYSTEM = 'system'
}

function classifyProjectError(error: any): ProjectErrorCategory {
  const code = error.details?.code;
  
  if (code?.includes('INVALID_DATA') || code?.includes('INVALID_WALLET')) {
    return ProjectErrorCategory.VALIDATION;
  } else if (code?.includes('UNAUTHORIZED') || code?.includes('KYC_NOT_VERIFIED')) {
    return ProjectErrorCategory.AUTHORIZATION;
  } else if (code?.includes('INVALID_STATUS') || code?.includes('NAME_EXISTS')) {
    return ProjectErrorCategory.BUSINESS_LOGIC;
  } else if (code?.includes('TOKEN_CREATION') || code?.includes('NFT_MINTING')) {
    return ProjectErrorCategory.HEDERA_NETWORK;
  } else {
    return ProjectErrorCategory.SYSTEM;
  }
}
```

### Retry Logic for Project Operations

```typescript
function isRetryableProjectError(error: any): boolean {
  const retryableCodes = [
    'PROJECT_TOKEN_CREATION_FAILED',
    'PROJECT_NFT_MINTING_FAILED',
    'SYSTEM_DATABASE_ERROR',
    'SYSTEM_HEDERA_ERROR'
  ];
  
  return retryableCodes.includes(error.details?.code) || 
         error.details?.retryable === true;
}

async function retryProjectOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!isRetryableProjectError(error) || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff for Hedera operations
      const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

### User-Friendly Error Messages

```typescript
function getProjectErrorMessage(error: any): string {
  const code = error.details?.code;
  
  switch (code) {
    case 'PROJECT_INVALID_DATA':
      return 'Please check your project information and fix any validation errors.';
    
    case 'PROJECT_KYC_NOT_VERIFIED':
      return 'Please complete KYC verification before creating projects.';
    
    case 'PROJECT_NAME_EXISTS':
      return 'A project with this name already exists. Please choose a different name.';
    
    case 'PROJECT_INVALID_STATUS':
      return 'This operation is not allowed for the current project status.';
    
    case 'PROJECT_INSUFFICIENT_BALANCE':
      const required = error.details?.requiredAmount;
      return `Insufficient wallet balance. You need ${required} HBAR for this operation.`;
    
    case 'PROJECT_TOKEN_CREATION_FAILED':
      return 'Failed to create token on Hedera network. Please try again.';
    
    case 'PROJECT_NFT_MINTING_FAILED':
      return 'Stock minting failed. Please check your wallet and try again.';
    
    case 'PROJECT_MINTING_IN_PROGRESS':
      return 'Stock minting is already in progress. Please wait for completion.';
    
    case 'PROJECT_UNAUTHORIZED_ACCESS':
      return 'You are not authorized to access this project.';
    
    case 'STOCK_NOT_FOUND':
      return 'Stock not found. Please verify the stock number.';
    
    default:
      return error.message || 'An unexpected error occurred.';
  }
}
```

## Troubleshooting Guide

### Common Project Issues

#### Issue: "Project creation failed"
**Symptoms**: 400 error with PROJECT_INVALID_DATA  
**Solutions**:
1. Validate all required fields are provided
2. Check field length and format requirements
3. Ensure category is from allowed list
4. Verify stock supply is within limits (1-1,000,000)

#### Issue: "KYC not verified"
**Symptoms**: 403 error with PROJECT_KYC_NOT_VERIFIED  
**Solutions**:
1. Complete KYC document upload
2. Wait for admin approval
3. Check KYC status in user profile
4. Contact support if KYC is stuck

#### Issue: "Stock minting failed"
**Symptoms**: 503 error with PROJECT_NFT_MINTING_FAILED  
**Solutions**:
1. Check Hedera wallet balance (need ~$2 + $0.05 per stock)
2. Verify wallet address format (0.0.123456)
3. Ensure project is in draft status
4. Retry after network issues resolve

#### Issue: "Insufficient balance"
**Symptoms**: 402 error with PROJECT_INSUFFICIENT_BALANCE  
**Solutions**:
1. Add more HBAR to wallet
2. Check estimated gas fees before minting
3. Verify wallet address is correct
4. Use testnet for development/testing

#### Issue: "Minting timeout"
**Symptoms**: Minting process hangs or times out  
**Solutions**:
1. Reduce batch size for large stock supplies
2. Check Hedera network status
3. Verify wallet connection
4. Contact support if issue persists

### Debug Information for Project Issues

When reporting project-related issues, include:

1. **Request ID**: Found in error response
2. **Project ID**: Unique project identifier
3. **Project Status**: Current status (draft, minting, active, etc.)
4. **Stock Supply**: Total number of stocks
5. **Wallet Address**: Hedera account ID
6. **Wallet Balance**: Current HBAR balance
7. **Network**: Mainnet or Testnet
8. **User ID**: Entrepreneur's user ID
9. **KYC Status**: Current KYC verification status
10. **Error Details**: Complete error response

### Support Contacts

- **Project Issues**: projects@sachain.com
- **Minting Issues**: minting@sachain.com
- **Hedera Integration**: hedera@sachain.com
- **General Support**: support@sachain.com

This document provides comprehensive error handling guidance for project creation and stock minting operations. For additional support, refer to the main error codes documentation or contact the development team.