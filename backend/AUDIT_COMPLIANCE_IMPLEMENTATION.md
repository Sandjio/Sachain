# Audit Logging and Compliance Implementation

## Overview

This document describes the implementation of Task 18: "Implement audit logging and compliance" for the Sachain project. The implementation provides comprehensive audit logging, compliance tracking, and regulatory compliance features for all project operations.

## Architecture

### Core Components

1. **ProjectAuditService** - Specialized audit logging for project operations
2. **ComplianceService** - Data retention, compliance reporting, and regulatory features
3. **AuditComplianceLambda** - API endpoints for compliance management
4. **ScheduledComplianceLambda** - Automated compliance tasks

### Data Models

The implementation extends the existing DynamoDB single-table design with audit and compliance entities:

- **AuditLog** - Records all user actions and system operations
- **ComplianceEvent** - Tracks sensitive operations for regulatory compliance
- **DataProcessingConsent** - GDPR consent management
- **DataDeletionRequest** - Data subject rights management

## Features Implemented

### 1. Project Operation Audit Logging

All project-related operations are automatically logged with:

- User identification and session tracking
- IP address and user agent capture
- Detailed operation parameters
- Success/failure status with error messages
- Compliance event generation for sensitive operations

**Supported Operations:**
- Project creation
- Stock minting
- Project updates
- Status changes
- Cover image uploads
- Project deletion

### 2. Compliance Reporting

Automated generation of compliance reports including:

- Audit log statistics and metrics
- Operation success/failure rates
- Risk indicator detection
- Regulatory compliance status

**Risk Indicators:**
- High failure rate detection (>5% threshold)
- Suspicious activity patterns
- Data retention violations

### 3. Data Retention Management

Automated enforcement of data retention policies:

- **Audit Logs**: 7 years (2555 days)
- **Project Data**: 7 years (2555 days)
- **User Profiles**: 7 years (2555 days)
- **KYC Documents**: 5 years (1825 days)
- **Compliance Events**: 10 years (3650 days)

### 4. GDPR Compliance Features

- Data access tracking
- Consent management
- Data subject rights support
- Legal basis documentation
- Retention policy enforcement

## API Endpoints

### GET /compliance/report
Generate compliance reports for specified date ranges.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format

**Response:**
```json
{
  "report": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "metrics": {
      "totalAuditLogs": 1000,
      "successfulOperations": 950,
      "failedOperations": 50,
      "projectsCreated": 100,
      "stocksMinted": 80,
      "complianceEvents": 200
    },
    "riskIndicators": {
      "highFailureRate": false,
      "suspiciousActivity": false,
      "dataRetentionViolations": false
    }
  }
}
```

### GET /compliance/retention-status
Check data retention compliance status.

**Response:**
```json
{
  "retentionStatus": {
    "compliant": true,
    "violations": []
  }
}
```

### GET /compliance/audit-logs
Query audit logs with filtering options.

**Query Parameters:**
- `date`: Filter by specific date (YYYY-MM-DD)
- `action`: Filter by action type
- `userId`: Filter by user ID
- `limit`: Maximum number of results (default: 50)

### POST /compliance/enforce-retention
Manually trigger data retention enforcement.

**Response:**
```json
{
  "retentionResults": {
    "auditLogsDeleted": 100,
    "complianceEventsDeleted": 50,
    "errors": []
  }
}
```

### POST /compliance/track-access
Track data access for GDPR compliance.

**Request Body:**
```json
{
  "dataType": "project_data",
  "accessReason": "user_dashboard_view",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0"
}
```

## Integration Points

### Project Creation Lambda Integration

The project creation Lambda has been enhanced to automatically log audit events:

```typescript
// Log successful project creation
await projectAuditService.logProjectCreation(
  {
    userId: entrepreneurId,
    projectId: project.projectId,
    ipAddress: event.requestContext.identity.sourceIp,
    userAgent: event.headers["User-Agent"],
    sessionId: event.requestContext.requestId,
    requestId,
  },
  {
    name: project.name,
    category: project.category,
    stockSupply: project.stockSupply,
    targetFundingGoal: project.targetFundingGoal,
  },
  "success"
);
```

### Scheduled Compliance Tasks

A scheduled Lambda function runs daily to:

1. Enforce data retention policies
2. Generate compliance metrics
3. Validate retention compliance
4. Send metrics to CloudWatch
5. Log system audit events

## Monitoring and Metrics

### CloudWatch Metrics

The implementation sends the following metrics to CloudWatch:

**Data Retention Metrics:**
- `AuditLogsDeleted`
- `ComplianceEventsDeleted`
- `RetentionErrors`

**Daily Operation Metrics:**
- `DailyAuditLogs`
- `DailySuccessfulOperations`
- `DailyFailedOperations`
- `DailyProjectsCreated`
- `DailyStocksMinted`
- `OperationFailureRate`

**Compliance Status Metrics:**
- `RetentionCompliant`
- `RetentionViolations`
- `HighFailureRateRisk`
- `SuspiciousActivityRisk`
- `DataRetentionViolationRisk`

### Alarms and Notifications

Recommended CloudWatch alarms:

1. **High Failure Rate**: Alert when `OperationFailureRate` > 5%
2. **Retention Violations**: Alert when `RetentionViolations` > 0
3. **Suspicious Activity**: Alert when `SuspiciousActivityRisk` = 1
4. **Compliance Task Failures**: Alert when `ComplianceTaskFailures` > 0

## Security Considerations

### Access Control

- Compliance endpoints require admin-level authentication
- JWT token validation with user type checking
- IP address and user agent logging for all operations

### Data Protection

- Sensitive data sanitization in audit logs
- Encryption at rest for all stored audit data
- Secure transmission of compliance reports

### Privacy Compliance

- GDPR-compliant data access tracking
- Automated data retention enforcement
- Data subject rights support
- Legal basis documentation

## Testing

### Unit Tests

Comprehensive unit tests cover:

- ProjectAuditService functionality
- ComplianceService operations
- Lambda function endpoints
- Error handling scenarios

### Integration Tests

End-to-end integration tests verify:

- Complete project lifecycle audit logging
- Compliance reporting workflows
- Data retention enforcement
- Risk detection algorithms
- Error recovery mechanisms

## Deployment

### Environment Variables

Required environment variables:

```bash
DYNAMODB_TABLE_NAME=sachain-main-table
AWS_REGION=us-east-1
EVENT_BUS_NAME=sachain-events
```

### IAM Permissions

The Lambda functions require the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DeleteItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/sachain-main-table*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### Scheduled Events

Configure EventBridge rule for daily compliance tasks:

```json
{
  "ScheduleExpression": "cron(0 2 * * ? *)",
  "State": "ENABLED",
  "Targets": [
    {
      "Id": "ScheduledComplianceTarget",
      "Arn": "arn:aws:lambda:region:account:function:scheduled-compliance"
    }
  ]
}
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review compliance reports for anomalies
2. **Monthly**: Validate data retention compliance
3. **Quarterly**: Update retention policies if needed
4. **Annually**: Review and update compliance procedures

### Troubleshooting

Common issues and solutions:

1. **High Audit Log Volume**: Increase DynamoDB capacity or implement log sampling
2. **Retention Cleanup Failures**: Check IAM permissions and DynamoDB throttling
3. **Missing Compliance Events**: Verify service integration and error handling
4. **Metric Delivery Issues**: Check CloudWatch permissions and network connectivity

## Compliance Standards

This implementation supports compliance with:

- **GDPR** (General Data Protection Regulation)
- **SOX** (Sarbanes-Oxley Act)
- **PCI DSS** (Payment Card Industry Data Security Standard)
- **ISO 27001** (Information Security Management)
- **NIST Cybersecurity Framework**

## Future Enhancements

Potential improvements for future releases:

1. **Real-time Anomaly Detection**: ML-based suspicious activity detection
2. **Advanced Reporting**: Custom report templates and scheduling
3. **Data Lineage Tracking**: Complete data flow documentation
4. **Automated Compliance Remediation**: Self-healing compliance violations
5. **Multi-region Compliance**: Cross-region audit log replication