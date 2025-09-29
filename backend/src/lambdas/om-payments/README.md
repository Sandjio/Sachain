# Orange Money Payments Lambda

This Lambda function handles Orange Money payments for the Sachain platform, including both regular payments and HBAR recharge functionality.

## Features

### Regular Orange Money Payments

- Standard Orange Money payment processing
- Token-based authentication with Orange Money API
- Payment initiation and status tracking

### HBAR Recharge Payments

- Specialized payment processing for HBAR token recharge
- Enhanced validation for recharge-specific requirements
- Integration with HBAR conversion system
- Comprehensive error handling and user feedback

## API Endpoints

### Regular Payment Request

```json
POST /om-payments
{
  "customerNumber": "677123456",
  "amount": "50000",
  "pin": "1234",
  "description": "Payment description",
  "orderId": "order-123",
  "notifUrls": "https://callback.url"
}
```

### HBAR Recharge Request

```json
POST /om-payments
{
  "transactionId": "hbar-recharge-123",
  "userId": "user-456",
  "userHederaAccountId": "0.0.123456",
  "customerNumber": "677123456",
  "amount": "50000",
  "xafAmount": 50000,
  "estimatedHBARAmount": 25.5,
  "pin": "1234",
  "fees": {
    "orangeMoneyFee": 500,
    "platformFee": 1000,
    "totalFees": 1500
  }
}
```

## Request Type Detection

The Lambda automatically detects the request type based on the presence of specific fields:

- **HBAR Recharge**: Requests containing `transactionId` and `userHederaAccountId`
- **Regular Payment**: All other requests

## Validation

### Regular Payments

- Customer number (required)
- Amount (required)
- PIN (required)

### HBAR Recharge Payments

- All regular payment validations
- Transaction ID format validation
- User ID validation
- Hedera account ID format validation (0.0.XXXXXX)
- Amount limits (min: 1,000 XAF, max: 1,000,000 XAF)
- Cameroon phone number format validation
- Daily spending limits

## Error Handling

### Regular Payment Errors

- Missing required parameters (400)
- Orange Money API failures (500)
- Network timeouts (500)

### HBAR Recharge Errors

- Validation errors (400)

  - `OM_INVALID_AMOUNT`: Invalid amount format
  - `OM_AMOUNT_TOO_LOW`: Below minimum limit
  - `OM_AMOUNT_TOO_HIGH`: Above maximum limit
  - `OM_INVALID_PHONE_NUMBER`: Invalid phone format
  - `OM_INVALID_PIN`: Invalid PIN format

- Payment errors (400)

  - `OM_INSUFFICIENT_BALANCE`: Insufficient Orange Money balance
  - `OM_INVALID_PIN`: Incorrect PIN
  - `OM_DAILY_LIMIT_EXCEEDED`: Daily limit exceeded

- Service errors (500)
  - `OM_SERVICE_UNAVAILABLE`: Orange Money service down
  - `OM_NETWORK_ERROR`: Network connectivity issues
  - `OM_TIMEOUT_ERROR`: Request timeout
  - `OM_UNKNOWN_ERROR`: Unexpected errors

## Configuration

### Environment Variables

```bash
# Orange Money API Configuration
OM_BASE_URL=https://omdeveloper.orange.cm/
OM_X_AUTH_TOKEN=YWRtaW46YWRtaW4=
OM_CLIENT_ID=sachain_app
OM_CLIENT_SECRET=sachain_secret
OM_SACHAIN_NUMBER=657615723
OM_NOTIFICATION_URL=https://api.sachain.com/webhooks/om-notifications

# Recharge Limits (optional, defaults provided)
RECHARGE_MIN_AMOUNT=1000
RECHARGE_MAX_AMOUNT=1000000
RECHARGE_DAILY_LIMIT=5000000
```

## Usage Examples

### Using the Recharge Service Directly

```typescript
import { OrangeMoneyRechargeService } from "./recharge-service";

const rechargeService = new OrangeMoneyRechargeService();

// Validate a recharge request
const validation = rechargeService.validateRechargePayment(request);
if (!validation.isValid) {
  console.error("Validation errors:", validation.errors);
  return;
}

// Initiate recharge payment
const result = await rechargeService.initiateRechargePayment(request);
if (result.success) {
  console.log("Payment initiated:", result.transactionId);
} else {
  console.error("Payment failed:", result.error);
}
```

### Using Validation Utilities

```typescript
import {
  validateRechargeAmount,
  validateHederaAccountId,
  validateCameroonPhoneNumber,
} from "../../utils/hbar-recharge-validation";

// Validate individual fields
const amountValidation = validateRechargeAmount(50000);
const accountValidation = validateHederaAccountId("0.0.123456");
const phoneValidation = validateCameroonPhoneNumber("677123456");

// Comprehensive validation
const allValidations = validateHBARRechargeRequest(request);
const isValid = areAllValidationsValid(allValidations);
```

## Testing

### Running Tests

```bash
# Run all Orange Money tests
npm test -- --testPathPattern="om-payments"

# Run specific test files
npm test -- --testPathPattern="recharge-service"
npm test -- --testPathPattern="hbar-recharge-validation"
```

### Test Coverage

- **Recharge Service**: 100% coverage including validation, payment initiation, and error handling
- **Validation Utilities**: 100% coverage for all validation functions
- **Lambda Handler**: 100% coverage for both regular and recharge payment flows

## Integration

### With HBAR Conversion System

The recharge service integrates with the broader HBAR recharge system:

1. **Payment Initiation**: Orange Money payment is initiated
2. **Event Publishing**: Success events are published to EventBridge
3. **Conversion Processing**: Separate Lambda handles HBAR conversion
4. **Status Updates**: Transaction status is tracked in DynamoDB

### With Existing Services

- **User Repository**: For user validation and daily limit tracking
- **Notification Service**: For user notifications
- **Audit Service**: For transaction logging
- **EventBridge**: For event-driven architecture

## Security Considerations

### Data Protection

- Sensitive data (PINs) are not logged
- API credentials are stored in environment variables
- Request/response data is sanitized in logs

### Access Control

- Lambda execution role with minimal required permissions
- Orange Money API credentials secured
- Input validation prevents injection attacks

### Compliance

- Transaction audit trails maintained
- KYC integration for large amounts
- Regulatory compliance for mobile money operations

## Monitoring

### CloudWatch Metrics

- Payment success/failure rates
- Processing times
- Error rates by type
- Daily transaction volumes

### Alerts

- High error rates
- Service unavailability
- Unusual transaction patterns
- Daily limit breaches

## Troubleshooting

### Common Issues

1. **Orange Money API Timeouts**

   - Check network connectivity
   - Verify Orange Money service status
   - Review timeout configurations

2. **Validation Failures**

   - Verify phone number formats
   - Check amount limits
   - Validate Hedera account IDs

3. **Authentication Errors**
   - Verify Orange Money credentials
   - Check token expiration
   - Review API permissions

### Debug Information

Enable debug logging by setting `LOG_LEVEL=debug` to get detailed request/response information (excluding sensitive data).

## Dependencies

### Core Dependencies

- `aws-lambda`: Lambda runtime types
- `node-fetch`: HTTP client for Orange Money API

### Development Dependencies

- `jest`: Testing framework
- `@types/aws-lambda`: TypeScript types
- `ts-jest`: TypeScript Jest transformer

## Contributing

When extending this service:

1. Add comprehensive tests for new functionality
2. Update validation rules as needed
3. Maintain backward compatibility
4. Document new error codes
5. Update environment variable documentation
