# HBAR Recharge System Integration Tests

This directory contains comprehensive integration tests for the HBAR Recharge System, covering end-to-end workflows, performance testing, error scenarios, and external service integrations.

## Overview

The integration tests validate the complete HBAR recharge flow from Orange Money payment initiation to HBAR transfer completion on the Hedera network. These tests ensure system reliability, performance, and proper error handling across all components.

## Test Structure

### Test Files

1. **`hbar-recharge-e2e-flow.integration.test.ts`**

   - Complete end-to-end recharge workflows
   - Event-driven processing validation
   - Data consistency across failures
   - Concurrent request handling

2. **`hbar-recharge-performance.integration.test.ts`**

   - Concurrent request processing (10-50 requests)
   - High-volume batch processing (100+ requests)
   - Sustained load testing
   - Memory leak detection
   - Response time SLA validation

3. **`hbar-recharge-error-scenarios.integration.test.ts`**

   - Orange Money payment failures
   - Hedera network errors and retries
   - Exchange rate service failures
   - Database connection issues
   - EventBridge publishing failures
   - Recovery mechanisms

4. **`hbar-recharge-orange-money-simulation.integration.test.ts`**

   - Orange Money API integration
   - Payment validation and processing
   - Webhook handling simulation
   - Fee calculation testing
   - Rate limiting scenarios

5. **`hbar-recharge-hedera-transfers.integration.test.ts`**
   - Hedera account validation
   - HBAR transfer operations
   - Treasury account management
   - Transaction cost estimation
   - Network performance testing

### Configuration Files

- **`jest.integration.config.js`** - Jest configuration for integration tests
- **`setup.ts`** - Global test setup and utilities
- **`env-setup.ts`** - Environment variable configuration
- **`run-integration-tests.sh`** - Test runner script

## Running Tests

### Prerequisites

1. Install dependencies:

   ```bash
   npm install
   ```

2. Ensure AWS credentials are configured (for local testing with mocks)

3. Set up environment variables (automatically handled by test setup)

### Running All Integration Tests

```bash
# Run all integration tests with the comprehensive script
npm run test:integration:run-all

# Or run with Jest directly
npm run test:integration
```

### Running Specific Test Suites

```bash
# End-to-end flow tests
npm run test:integration:hbar-recharge

# Performance tests
npm run test:integration:performance

# Error scenario tests
npm run test:integration:error-scenarios

# Orange Money simulation tests
npm run test:integration:orange-money

# Hedera transfer tests
npm run test:integration:hedera
```

### Running with Coverage

```bash
npm run test:integration:coverage
```

### Running in Watch Mode

```bash
npm run test:integration:watch
```

## Test Categories

### 1. End-to-End Flow Tests

**Purpose**: Validate complete recharge workflows from initiation to completion.

**Key Test Cases**:

- Successful recharge flow (Orange Money → HBAR transfer)
- Payment failure handling
- Hedera network failure recovery
- Event-driven processing validation
- Data consistency across failures
- Concurrent request processing

**Requirements Covered**: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.5, 2.6

### 2. Performance Tests

**Purpose**: Ensure system can handle expected load and meets performance requirements.

**Key Test Cases**:

- 10 concurrent recharge requests (< 5 seconds)
- 50 concurrent conversion events (< 10 seconds)
- 100 requests in batches (< 30 seconds)
- Sustained load testing (5 seconds duration)
- Memory leak detection
- Response time SLA validation (P50: 1s, P95: 3s, P99: 5s)

**Performance Metrics**:

- Throughput (requests per second)
- Response time percentiles
- Memory usage
- Resource cleanup

### 3. Error Scenario Tests

**Purpose**: Validate error handling and recovery mechanisms.

**Key Test Cases**:

- Orange Money failures (insufficient balance, invalid PIN, timeouts)
- Hedera network errors (network busy, insufficient treasury balance)
- Exchange rate service failures (primary/fallback sources)
- Database connection failures
- EventBridge publishing failures
- Circuit breaker patterns

**Error Categories**:

- Validation errors (400)
- Authentication errors (401/403)
- Payment errors (402)
- Service unavailable (503)
- System errors (500)

### 4. Orange Money Simulation Tests

**Purpose**: Test Orange Money payment integration with realistic scenarios.

**Key Test Cases**:

- Payment validation (amounts, account IDs, PIN format)
- Successful payment flow simulation
- Authentication failures
- Insufficient balance scenarios
- Network timeouts
- Webhook processing
- Fee calculations
- Rate limiting

**Orange Money API Flow**:

1. Authentication (OAuth token)
2. Pay token generation
3. Payment creation
4. Webhook confirmation

### 5. Hedera Transfer Tests

**Purpose**: Validate Hedera network integration and HBAR transfers.

**Key Test Cases**:

- Account validation (valid/invalid account IDs)
- Successful HBAR transfers
- Insufficient treasury balance handling
- Network congestion and timeouts
- Transaction cost estimation
- Treasury account monitoring
- Concurrent transfer processing
- Performance measurement

**Hedera Operations**:

- Account validation
- Balance checking
- HBAR transfers
- Transaction status monitoring
- Cost estimation

## Test Data and Mocking

### Mock Services

The tests use comprehensive mocking for external services:

- **AWS Services**: DynamoDB, EventBridge, S3 (using aws-sdk-client-mock)
- **Hedera Service**: Mocked for controlled testing scenarios
- **Exchange Rate Service**: Mocked with realistic rate data
- **Orange Money Service**: Detailed API simulation

### Test Data Generation

Utility functions for generating test data:

- Random transaction IDs
- Random user IDs
- Random Hedera account IDs
- Random XAF amounts within valid ranges
- Mock payment success events
- Mock recharge requests

### Environment Configuration

Tests run with isolated environment configuration:

- Test-specific AWS region and resources
- Mock API endpoints
- Controlled fee structures
- Test-specific limits and thresholds

## Performance Benchmarks

### Response Time SLAs

- **P50 (50th percentile)**: ≤ 1 second
- **P95 (95th percentile)**: ≤ 3 seconds
- **P99 (99th percentile)**: ≤ 5 seconds

### Throughput Requirements

- **Concurrent Requests**: Handle 10+ concurrent requests efficiently
- **Batch Processing**: Process 100+ requests in under 30 seconds
- **Sustained Load**: Maintain performance under continuous load

### Resource Usage

- **Memory**: No memory leaks, reasonable memory usage (< 100MB for 10 requests)
- **CPU**: Efficient processing without blocking
- **Network**: Optimal API call patterns

## Error Handling Validation

### Retry Mechanisms

- **Exponential Backoff**: Base delay 1s, max delay 30s, max retries 5
- **Transient Failures**: Automatic retry for network issues
- **Persistent Failures**: Proper error reporting and alerting

### Circuit Breaker Patterns

- **Failure Threshold**: 5 consecutive failures
- **Timeout**: 60 seconds before retry
- **Health Monitoring**: Automatic recovery detection

### Data Consistency

- **Transaction State**: Proper state transitions during failures
- **Audit Trail**: Complete logging of all operations
- **Rollback Capability**: Safe failure recovery

## Monitoring and Alerting

### Test Metrics

Tests validate monitoring capabilities:

- CloudWatch metrics publishing
- Error rate tracking
- Performance monitoring
- Treasury balance alerts
- Exchange rate staleness detection

### Alert Thresholds

- **Failure Rate**: > 5%
- **Processing Time**: > 30 seconds
- **Treasury Balance**: < 1000 HBAR
- **Exchange Rate Age**: > 5 minutes

## Continuous Integration

### Test Execution

Integration tests are designed for CI/CD pipelines:

- Isolated test environment
- Deterministic test results
- Comprehensive error reporting
- Performance regression detection

### Test Reports

Generated artifacts:

- JUnit XML reports (`test-results/integration/`)
- Coverage reports (`coverage/integration/`)
- Performance metrics
- Error logs and traces

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout in jest config or individual tests
2. **Memory Issues**: Check for proper mock cleanup in `afterEach`
3. **AWS SDK Errors**: Verify mock setup in test setup files
4. **Environment Variables**: Check `env-setup.ts` configuration

### Debug Mode

Run tests with additional logging:

```bash
DEBUG=* npm run test:integration
```

### Test Isolation

Each test is isolated with:

- Fresh mock instances
- Clean environment state
- Proper resource cleanup
- Independent test data

## Contributing

### Adding New Tests

1. Follow existing test patterns and structure
2. Use provided utility functions for test data generation
3. Include proper error scenarios and edge cases
4. Add performance assertions where applicable
5. Update this README with new test descriptions

### Test Guidelines

- **Descriptive Names**: Use clear, descriptive test names
- **Arrange-Act-Assert**: Follow AAA pattern
- **Mock Isolation**: Use proper mocking for external dependencies
- **Performance Awareness**: Include timing assertions for critical paths
- **Error Coverage**: Test both success and failure scenarios

### Code Coverage

Maintain high code coverage for integration tests:

- Target: > 80% coverage for integration scenarios
- Focus on critical business logic paths
- Include error handling code paths
- Test edge cases and boundary conditions

## Related Documentation

- [HBAR Recharge System Requirements](../../specs/hbar-recharge-system/requirements.md)
- [HBAR Recharge System Design](../../specs/hbar-recharge-system/design.md)
- [HBAR Recharge System Tasks](../../specs/hbar-recharge-system/tasks.md)
- [Backend API Documentation](../../../docs/README.md)
- [Deployment Procedures](../../../docs/deployment-procedures.md)
