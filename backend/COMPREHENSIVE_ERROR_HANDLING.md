# Comprehensive Error Handling System

This document describes the comprehensive error handling system implemented for the Sachain project operations, providing structured error classification, recovery mechanisms, and user-friendly error messages.

## Overview

The comprehensive error handling system consists of four main components:

1. **Enhanced Error Handler** - Classifies errors and provides structured error details
2. **Error Recovery Manager** - Handles automatic retry and fallback mechanisms
3. **Error Response Formatter** - Formats consistent API responses
4. **Project Recovery Manager** - Manages rollback operations for data consistency

## Components

### 1. Enhanced Error Handler (`enhanced-error-handler.ts`)

#### Error Categories

```typescript
enum ProjectErrorCategory {
  VALIDATION = 'validation',           // Input validation errors
  AUTHENTICATION = 'authentication',   // Auth token issues
  AUTHORIZATION = 'authorization',     // Permission errors
  BUSINESS_LOGIC = 'business_logic',   // Business rule violations
  EXTERNAL_SERVICE = 'external_service', // Hedera, IPFS errors
  SYSTEM = 'system',                   // Database, S3 errors
  NETWORK = 'network',                 // Connection issues
  RATE_LIMIT = 'rate_limit',          // Throttling errors
  RESOURCE_NOT_FOUND = 'resource_not_found', // Missing resources
  CONFLICT = 'conflict',               // Data conflicts
  TIMEOUT = 'timeout'                  // Request timeouts
}
```

#### Error Severity Levels

```typescript
enum ErrorSeverity {
  LOW = 'low',        // Minor issues, user can resolve
  MEDIUM = 'medium',  // Moderate issues, may need retry
  HIGH = 'high',      // Serious issues, system intervention
  CRITICAL = 'critical' // Critical failures, immediate attention
}
```

#### Recovery Strategies

```typescript
enum RecoveryStrategy {
  RETRY = 'retry',                    // Automatic retry with backoff
  FALLBACK = 'fallback',              // Use alternative approach
  ROLLBACK = 'rollback',              // Undo partial changes
  MANUAL_INTERVENTION = 'manual_intervention', // Human intervention required
  NONE = 'none'                       // No recovery possible
}
```

#### Usage Example

```typescript
import { ProjectErrorClassifier, withErrorHandling } from '../utils/enhanced-error-handler';

// Automatic error classification
try {
  await someOperation();
} catch (error) {
  const projectError = ProjectErrorClassifier.classify(error, {
    operation: 'ProjectCreation',
    requestId: 'req-123',
    projectId: 'proj-456'
  });
  
  console.log(projectError.category);        // ProjectErrorCategory
  console.log(projectError.severity);       // ErrorSeverity
  console.log(projectError.retryable);      // boolean
  console.log(projectError.userMessage);    // User-friendly message
  console.log(projectError.suggestedActions); // Array of suggested actions
}

// Using decorator for automatic error handling
class ProjectService {
  @withErrorHandling('createProject')
  async createProject(data: ProjectData): Promise<Project> {
    // Method implementation
    // Errors are automatically classified and handled
  }
}
```

### 2. Error Recovery Manager (`error-recovery.ts`)

#### Automatic Recovery

```typescript
import { ErrorRecoveryManager } from '../utils/enhanced-error-handler';

// Execute operation with automatic recovery
const result = await ErrorRecoveryManager.executeWithRecovery(
  () => hederaService.createToken(params),
  { operation: 'TokenCreation', requestId: 'req-123' },
  () => fallbackTokenCreation(params) // Optional fallback
);
```

#### Rollback Operations

```typescript
import { ProjectRecoveryManager, ProjectRollbackOperations } from '../utils/error-recovery';

// Initialize recovery context
const context = ProjectRecoveryManager.initializeRecovery(
  requestId,
  'StockMinting',
  projectId
);

// Add rollback operations
const rollbackOps = new ProjectRollbackOperations(projectRepository);
ProjectRecoveryManager.addRollbackOperation(
  requestId,
  rollbackOps.createProjectStatusRollback(projectId, 'draft', requestId)
);

// Execute rollback on failure
try {
  await mintingOperation();
  ProjectRecoveryManager.cleanupRecovery(requestId);
} catch (error) {
  await ProjectRecoveryManager.executeRollback(requestId, error);
  throw error;
}
```

#### Available Rollback Operations

1. **Project Status Rollback** - Restore project to previous status
2. **Project Deletion Rollback** - Delete project if creation failed
3. **Hedera Transaction Rollback** - Mark transactions as failed
4. **Stock NFT Cleanup Rollback** - Remove created NFT records
5. **Project Stats Reset Rollback** - Reset project statistics

### 3. Error Response Formatter (`error-response-formatter.ts`)

#### Consistent API Responses

```typescript
import { ErrorResponseFormatter, withErrorFormatting } from '../utils/error-response-formatter';

// Format error response
const response = ErrorResponseFormatter.formatErrorResponse(projectError);

// Format success response
const response = ErrorResponseFormatter.formatSuccessResponse(
  data,
  201,
  'Project created successfully'
);

// Format validation errors
const response = ErrorResponseFormatter.formatValidationErrorResponse(
  validationErrors,
  requestId,
  'Input validation failed'
);

// Using decorator for automatic response formatting
export const handler: APIGatewayProxyHandler = withErrorFormatting()(async (event) => {
  // Lambda implementation
  // Errors are automatically formatted into proper API responses
});
```

#### Response Structure

**Error Response:**
```json
{
  "message": "User-friendly error message",
  "code": "ERROR_CODE",
  "requestId": "req-123",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "details": {
    "category": "validation",
    "severity": "low",
    "suggestedActions": [
      "Check input format",
      "Verify required fields"
    ],
    "context": {
      "operation": "ProjectCreation",
      "projectId": "proj-456"
    }
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": { "id": "123", "name": "Project" },
  "message": "Operation completed successfully",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

**Validation Error Response:**
```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "requestId": "req-123",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "validationErrors": [
    {
      "field": "name",
      "message": "Name is required",
      "value": null,
      "constraint": "required"
    }
  ],
  "details": {
    "category": "validation",
    "severity": "low",
    "suggestedActions": ["Review validation errors", "Correct invalid fields"]
  }
}
```

## Integration with Lambda Functions

### Project Creation Lambda

```typescript
import { withErrorFormatting } from '../../utils/error-response-formatter';
import { ProjectRecoveryManager, ProjectRollbackOperations } from '../../utils/error-recovery';

export const handler: APIGatewayProxyHandler = withErrorFormatting()(async (event) => {
  const requestId = event.requestContext.requestId;
  
  // Initialize recovery context
  const recoveryContext = ProjectRecoveryManager.initializeRecovery(
    requestId,
    'ProjectCreation'
  );

  try {
    const result = await handleProjectCreation(event);
    ProjectRecoveryManager.cleanupRecovery(requestId);
    return result;
  } catch (error) {
    const projectError = ProjectErrorClassifier.classify(error, {
      operation: 'ProjectCreation',
      requestId
    });

    // Execute rollback if required
    if (projectError.rollbackRequired !== false) {
      await ProjectRecoveryManager.executeRollback(requestId, projectError);
    }

    throw projectError; // Automatically formatted by decorator
  }
});
```

### Stock Minting Lambda

```typescript
// Add rollback operations during minting process
const rollbackOperations = new ProjectRollbackOperations(projectRepository);

// Update project status with rollback
await updateProjectStatus(projectId, 'minting', requestId);
ProjectRecoveryManager.addRollbackOperation(
  requestId,
  rollbackOperations.createProjectStatusRollback(projectId, 'draft', requestId)
);

// Create token with transaction rollback
const tokenResult = await hederaService.createToken(params);
ProjectRecoveryManager.addRollbackOperation(
  requestId,
  rollbackOperations.createHederaTransactionRollback(
    projectId,
    tokenResult.transactionId,
    requestId
  )
);
```

## Error Classification Rules

### Validation Errors (400)
- Missing required fields
- Invalid field formats
- Out of range values
- Invalid enum values

**Patterns:**
- `/validation/i`
- `/invalid.*input/i`
- `/required.*field/i`
- `ValidationException`

### Authentication Errors (401)
- Missing or invalid tokens
- Expired tokens
- Malformed JWT

**Patterns:**
- `/authentication/i`
- `/unauthorized/i`
- `/invalid.*token/i`
- `/token.*expired/i`

### Authorization Errors (403)
- Insufficient permissions
- KYC not verified
- Access denied

**Patterns:**
- `/authorization/i`
- `/forbidden/i`
- `/access.*denied/i`
- `/kyc.*not.*verified/i`

### Business Logic Errors (422)
- Invalid project status
- Duplicate resources
- Business rule violations

**Patterns:**
- `/project.*already.*exists/i`
- `/invalid.*project.*status/i`
- `/insufficient.*balance/i`

### External Service Errors (503)
- Hedera network issues
- IPFS service failures
- Third-party API errors

**Patterns:**
- `/hedera/i`
- `/ipfs/i`
- `/token.*service/i`

### System Errors (500/503)
- Database failures
- S3 errors
- Internal server errors

**Patterns:**
- `ProvisionedThroughputExceededException`
- `ThrottlingException`
- `InternalServerError`

### Network Errors (503)
- Connection timeouts
- Network failures
- DNS resolution errors

**Patterns:**
- `/network/i`
- `/connection/i`
- `/econnreset/i`

### Rate Limit Errors (429)
- API rate limits exceeded
- DynamoDB throttling
- Service quotas exceeded

**Patterns:**
- `ThrottlingException`
- `ProvisionedThroughputExceededException`
- `/rate.*limit/i`

## Best Practices

### 1. Error Classification
- Always use `ProjectErrorClassifier.classify()` for consistent error handling
- Provide meaningful context in error classification
- Include operation name and request ID for traceability

### 2. Recovery Mechanisms
- Use retry for transient errors (network, rate limits)
- Implement fallback for external service failures
- Add rollback operations for data consistency

### 3. User Experience
- Provide clear, actionable error messages
- Include suggested actions for error resolution
- Sanitize sensitive information from error responses

### 4. Monitoring and Logging
- Log all errors with structured context
- Include error categories and severity levels
- Track error patterns for system improvements

### 5. Testing
- Test all error scenarios with unit tests
- Verify error classification accuracy
- Test rollback mechanisms thoroughly

## Error Codes Reference

| Code | Category | HTTP Status | Description |
|------|----------|-------------|-------------|
| `VALIDATION_ERROR` | Validation | 400 | Input validation failed |
| `AUTHENTICATION_ERROR` | Authentication | 401 | Authentication required |
| `AUTHORIZATION_ERROR` | Authorization | 403 | Insufficient permissions |
| `BUSINESS_LOGIC_ERROR` | Business Logic | 422 | Business rule violation |
| `HEDERA_SERVICE_ERROR` | External Service | 503 | Hedera network issue |
| `IPFS_SERVICE_ERROR` | External Service | 503 | IPFS storage issue |
| `DATABASE_ERROR` | System | 503 | Database operation failed |
| `STORAGE_ERROR` | System | 503 | File storage issue |
| `NETWORK_ERROR` | Network | 503 | Network connectivity issue |
| `TIMEOUT_ERROR` | Timeout | 504 | Request timeout |
| `SYSTEM_ERROR` | System | 500 | Unexpected system error |

## Monitoring and Alerting

### CloudWatch Metrics
- Error rates by category and severity
- Recovery success/failure rates
- Rollback operation counts
- Response time percentiles

### Alarms
- High error rates (>5% in 5 minutes)
- Critical errors (any occurrence)
- Rollback failures (immediate alert)
- External service failures (>10% in 10 minutes)

### Dashboards
- Error category breakdown
- Recovery mechanism effectiveness
- User experience impact metrics
- System health indicators

## Troubleshooting Guide

### High Error Rates
1. Check error categories in CloudWatch
2. Review recent deployments
3. Verify external service status
4. Check system resource utilization

### Rollback Failures
1. Review rollback operation logs
2. Check database connectivity
3. Verify permissions for cleanup operations
4. Manual data consistency verification

### User Experience Issues
1. Review user-facing error messages
2. Check suggested actions relevance
3. Verify error response formatting
4. Monitor user retry patterns

## Future Enhancements

1. **Machine Learning Error Prediction** - Predict and prevent errors based on patterns
2. **Automated Recovery Workflows** - More sophisticated recovery strategies
3. **Real-time Error Analytics** - Advanced error pattern analysis
4. **User Feedback Integration** - Improve error messages based on user feedback
5. **Circuit Breaker Pattern** - Prevent cascade failures in external services