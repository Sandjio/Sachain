/**
 * Environment Setup for Integration Tests
 * Sets up environment variables before tests run
 */

// AWS Configuration
process.env.AWS_REGION = "us-east-1";
process.env.AWS_ACCESS_KEY_ID = "test-access-key";
process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";

// DynamoDB Configuration
process.env.TABLE_NAME = "sachain-test-table";
process.env.DYNAMODB_ENDPOINT = "http://localhost:8000"; // For local testing

// EventBridge Configuration
process.env.EVENT_BUS_NAME = "sachain-test-events";

// S3 Configuration
process.env.S3_BUCKET_NAME = "sachain-test-bucket";

// HBAR Recharge System Configuration
process.env.HEDERA_NETWORK = "testnet";
process.env.HEDERA_TREASURY_ACCOUNT_ID = "0.0.999999";
process.env.HEDERA_OPERATOR_ID = "0.0.999998";
process.env.HEDERA_OPERATOR_KEY =
  "test-private-key-302e020100300506032b657004220420test";

// Recharge Limits
process.env.MIN_RECHARGE_AMOUNT = "1000";
process.env.MAX_RECHARGE_AMOUNT = "100000";
process.env.DAILY_USER_LIMIT = "500000";

// Orange Money Configuration
process.env.OM_BASE_URL = "https://api.orange.com";
process.env.OM_MERCHANT_ACCOUNT = "test-merchant-account";
process.env.OM_API_KEY = "test-orange-money-api-key";
process.env.OM_CLIENT_ID = "test-client-id";
process.env.OM_CLIENT_SECRET = "test-client-secret";
process.env.OM_NOTIFICATION_URL = "https://api.sachain.io/webhook/orange-money";
process.env.OM_TIMEOUT = "30000";

// Exchange Rate Configuration
process.env.EXCHANGE_RATE_API_KEY = "test-exchange-rate-api-key";
process.env.EXCHANGE_RATE_CACHE_TTL = "300"; // 5 minutes
process.env.EXCHANGE_RATE_PRIMARY_SOURCE = "coingecko";
process.env.EXCHANGE_RATE_FALLBACK_SOURCES = "coinmarketcap,cryptocompare";

// Fee Configuration
process.env.PLATFORM_FEE_PERCENTAGE = "2.5";
process.env.ORANGE_MONEY_FEE_PERCENTAGE = "5.0";
process.env.MAX_ORANGE_MONEY_FEE = "5000";

// Monitoring Configuration
process.env.CLOUDWATCH_NAMESPACE = "Sachain/HBARRecharge/Test";
process.env.ENABLE_DETAILED_MONITORING = "true";

// Security Configuration
process.env.ENCRYPTION_KEY = "test-encryption-key-32-characters";
process.env.JWT_SECRET = "test-jwt-secret-key";

// Notification Configuration
process.env.NOTIFICATION_EMAIL_FROM = "test@sachain.io";
process.env.NOTIFICATION_SMS_PROVIDER = "test";

// Retry Configuration
process.env.MAX_RETRY_ATTEMPTS = "5";
process.env.RETRY_BASE_DELAY = "1000";
process.env.RETRY_MAX_DELAY = "30000";

// Circuit Breaker Configuration
process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = "5";
process.env.CIRCUIT_BREAKER_TIMEOUT = "60000";

// Rate Limiting Configuration
process.env.RATE_LIMIT_REQUESTS_PER_MINUTE = "60";
process.env.RATE_LIMIT_BURST_SIZE = "10";

// Fraud Detection Configuration
process.env.FRAUD_DETECTION_ENABLED = "true";
process.env.FRAUD_DETECTION_MAX_AMOUNT_PER_HOUR = "1000000";
process.env.FRAUD_DETECTION_MAX_TRANSACTIONS_PER_HOUR = "10";

// KYC Configuration
process.env.KYC_REQUIRED_AMOUNT_THRESHOLD = "50000";
process.env.KYC_VERIFICATION_TIMEOUT = "300000";

// Test-specific Configuration
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error"; // Reduce log noise in tests
process.env.DISABLE_EXTERNAL_CALLS = "false"; // Allow external calls in integration tests
process.env.MOCK_EXTERNAL_SERVICES = "true"; // Use mocked external services

// Performance Test Configuration
process.env.PERFORMANCE_TEST_ENABLED = "true";
process.env.PERFORMANCE_TEST_CONCURRENT_USERS = "10";
process.env.PERFORMANCE_TEST_DURATION = "60000"; // 1 minute

// Database Configuration for Tests
process.env.DB_CONNECTION_POOL_SIZE = "5";
process.env.DB_CONNECTION_TIMEOUT = "5000";
process.env.DB_QUERY_TIMEOUT = "10000";

console.log("✅ Environment variables configured for integration tests");
