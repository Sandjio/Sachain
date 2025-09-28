# Admin Dashboard and Management Tools

This module implements comprehensive admin dashboard and management tools for the HBAR recharge system, providing administrators with monitoring capabilities, transaction management, treasury oversight, and reporting functionality.

## Features

### 1. Dashboard Metrics
- **Real-time System Overview**: Total transactions, success rates, volumes
- **Performance Monitoring**: Average processing times, system health
- **Treasury Status**: Current HBAR balance and status indicators

### 2. System Health Monitoring
- **Component Health Checks**: Database, Hedera network, Orange Money, EventBridge
- **Automated Status Assessment**: Healthy, degraded, or critical status
- **Response Time Tracking**: Performance metrics for each component

### 3. Transaction Management
- **Transaction Search & Filter**: By status, user, date range, amount
- **Detailed Transaction View**: Complete transaction history and metadata
- **Manual Retry Capability**: Force retry failed transactions with audit trail
- **Bulk Operations**: Batch transaction management

### 4. Treasury Management
- **Balance Monitoring**: Real-time HBAR and XAF balance tracking
- **Alert System**: Low balance and critical balance notifications
- **Threshold Configuration**: Customizable warning and critical thresholds
- **Transaction History**: Treasury operation audit trail

### 5. Dispute Resolution
- **Case Management**: Create, assign, and track dispute cases
- **Refund Processing**: Automated and manual refund capabilities
- **Status Tracking**: Complete dispute lifecycle management
- **Resolution Documentation**: Detailed resolution records

### 6. Reporting & Analytics
- **Compliance Reports**: Daily, weekly, monthly compliance summaries
- **Financial Analysis**: Revenue, costs, and profitability analysis
- **Volume Analytics**: Transaction patterns and user behavior
- **Error Analysis**: Failure patterns and root cause analysis

## API Endpoints

### Dashboard Endpoints
```
GET /admin/dashboard/metrics     - Get dashboard metrics
GET /admin/dashboard/health      - Get system health status
```

### Transaction Management
```
GET /admin/transactions                        - List transactions
GET /admin/transactions/{transactionId}       - Get transaction details
POST /admin/transactions/{transactionId}/retry - Retry failed transaction
```

### Treasury Management
```
GET /admin/treasury/balance     - Get treasury balance
GET /admin/treasury/alerts      - Get treasury alerts
```

### Dispute Management
```
GET /admin/disputes             - List dispute cases
```

### Reporting
```
POST /admin/reports/compliance  - Generate compliance report
POST /admin/reports/financial   - Generate financial analysis
```

## Authentication & Authorization

### Admin User Groups
- **sachain-super-admins**: Full system access
- **sachain-admins**: Standard admin operations
- **sachain-treasury-managers**: Treasury and financial operations
- **sachain-compliance-officers**: Compliance and dispute management
- **sachain-support-agents**: View-only access and basic dispute handling

### Permissions
- `view_dashboard`: Access to dashboard metrics and health
- `view_transactions`: View transaction data
- `retry_transactions`: Manual transaction retry capability
- `manage_treasury`: Treasury balance and alert management
- `handle_disputes`: Dispute case management
- `generate_reports`: Report generation access
- `system_admin`: Full administrative access

## Security Features

### JWT Token Validation
- Cognito User Pool integration
- Token expiration handling
- Group-based permission mapping

### Role-Based Access Control
- Granular permission system
- Least privilege principle
- Audit logging for admin actions

### Data Protection
- Sensitive data masking
- Encrypted data transmission
- Audit trail for all operations

## Monitoring & Alerting

### CloudWatch Integration
- Custom metrics for admin operations
- Dashboard for admin activity monitoring
- Automated alerting for system issues

### Alert Types
- **Treasury Alerts**: Low balance, critical balance warnings
- **Transaction Alerts**: High failure rates, processing delays
- **System Alerts**: Component failures, performance degradation
- **Security Alerts**: Unauthorized access attempts

### Notification Channels
- **SNS Topics**: Real-time alert distribution
- **Email Notifications**: Formatted admin alerts
- **Dashboard Indicators**: Visual status indicators

## Error Handling

### Error Classification
- **Authentication Errors**: Invalid tokens, expired sessions
- **Authorization Errors**: Insufficient permissions
- **Validation Errors**: Invalid request parameters
- **System Errors**: Service failures, network issues

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "requestId": "unique-request-id",
  "timestamp": "2023-01-01T00:00:00Z"
}
```

## Configuration

### Environment Variables
```bash
# Database
DYNAMODB_TABLE_NAME=sachain-hbar-recharge-dev

# Authentication
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Hedera Configuration
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=302e020100300506032b657004220420...
HEDERA_NETWORK=testnet

# Treasury Thresholds
TREASURY_LOW_BALANCE_THRESHOLD=1000
TREASURY_CRITICAL_BALANCE_THRESHOLD=100

# Fee Configuration
PLATFORM_FEE_PERCENTAGE=2
ORANGE_MONEY_FEE_PERCENTAGE=1

# Notifications
ADMIN_ALERT_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:admin-alerts
ADMIN_EMAIL_ADDRESSES=admin1@sachain.com,admin2@sachain.com
ADMIN_EMAIL_FROM=noreply@sachain.com
```

## Testing

### Unit Tests
- Service layer testing with mocked dependencies
- Authentication and authorization logic
- Error handling scenarios

### Integration Tests
- End-to-end API testing
- Database integration testing
- External service integration

### Test Coverage
- Minimum 90% code coverage
- Critical path testing
- Edge case validation

## Deployment

### Infrastructure
- AWS Lambda for serverless execution
- API Gateway for HTTP endpoints
- DynamoDB for data storage
- SNS for notifications
- CloudWatch for monitoring

### CDK Deployment
```bash
# Deploy admin dashboard infrastructure
cdk deploy SachainHBARRechargeStack-dev
```

### Environment Setup
1. Configure Cognito User Pool with admin groups
2. Set up SNS topics for alerts
3. Configure email addresses for notifications
4. Set treasury balance thresholds

## Usage Examples

### Get Dashboard Metrics
```bash
curl -X GET \
  https://api.sachain.com/admin/dashboard/metrics \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

### Retry Failed Transaction
```bash
curl -X POST \
  https://api.sachain.com/admin/transactions/tx123/retry \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Network issue resolved, retrying transaction",
    "forceRetry": false
  }'
```

### Generate Compliance Report
```bash
curl -X POST \
  https://api.sachain.com/admin/reports/compliance \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "weekly",
    "dateFrom": "2023-01-01",
    "dateTo": "2023-01-07"
  }'
```

## Maintenance

### Regular Tasks
- Monitor treasury balance levels
- Review failed transaction patterns
- Update alert thresholds as needed
- Generate compliance reports

### Troubleshooting
- Check CloudWatch logs for errors
- Verify Cognito group memberships
- Validate environment variables
- Test external service connectivity

## Future Enhancements

### Planned Features
- Real-time dashboard updates via WebSocket
- Advanced analytics and machine learning insights
- Automated remediation for common issues
- Mobile admin application

### Scalability Considerations
- Implement caching for frequently accessed data
- Add read replicas for reporting queries
- Consider event sourcing for audit trails
- Implement rate limiting for admin operations