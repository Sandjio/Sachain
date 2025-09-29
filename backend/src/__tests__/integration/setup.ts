/**
 * Integration Test Setup
 * Global setup and teardown for HBAR Recharge integration tests
 */

import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { S3Client } from "@aws-sdk/client-s3";

// Global test timeout
jest.setTimeout(30000);

// Global setup before all tests
beforeAll(async () => {
  console.log("🚀 Starting HBAR Recharge Integration Tests");

  // Setup global environment variables
  process.env.NODE_ENV = "test";
  process.env.AWS_REGION = "us-east-1";
  process.env.TABLE_NAME = "sachain-test-table";
  process.env.EVENT_BUS_NAME = "sachain-test-events";
  process.env.S3_BUCKET_NAME = "sachain-test-bucket";

  // HBAR Recharge specific environment
  process.env.HEDERA_NETWORK = "testnet";
  process.env.HEDERA_TREASURY_ACCOUNT_ID = "0.0.999999";
  process.env.HEDERA_OPERATOR_ID = "0.0.999998";
  process.env.HEDERA_OPERATOR_KEY = "test-private-key";
  process.env.MIN_RECHARGE_AMOUNT = "1000";
  process.env.MAX_RECHARGE_AMOUNT = "100000";

  // Orange Money configuration
  process.env.OM_BASE_URL = "https://api.orange.com";
  process.env.OM_MERCHANT_ACCOUNT = "test-merchant";
  process.env.OM_API_KEY = "test-api-key";
  process.env.OM_NOTIFICATION_URL =
    "https://api.sachain.io/webhook/orange-money";

  // Exchange rate configuration
  process.env.EXCHANGE_RATE_API_KEY = "test-exchange-api-key";
  process.env.EXCHANGE_RATE_CACHE_TTL = "300"; // 5 minutes

  console.log("✅ Environment variables configured");
});

// Global teardown after all tests
afterAll(async () => {
  console.log("🧹 Cleaning up after integration tests");

  // Clean up any global resources
  // Reset environment variables if needed

  console.log("✅ Integration tests cleanup completed");
});

// Setup before each test
beforeEach(() => {
  // Reset all AWS SDK mocks
  mockClient(DynamoDBClient).reset();
  mockClient(EventBridgeClient).reset();
  mockClient(S3Client).reset();

  // Clear all jest mocks
  jest.clearAllMocks();

  // Reset console methods to avoid pollution between tests
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

// Cleanup after each test
afterEach(() => {
  // Restore console methods
  jest.restoreAllMocks();

  // Clean up any test-specific resources
  if (global.gc) {
    global.gc(); // Force garbage collection if available
  }
});

// Global error handler for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit the process in tests, just log the error
});

// Global error handler for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit the process in tests, just log the error
});

// Utility functions for tests
export const waitFor = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await waitFor(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  throw lastError!;
};

export const createTestTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Test timeout after ${ms}ms`)), ms);
  });
};

// Performance measurement utilities
export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number }> => {
  const startTime = process.hrtime.bigint();
  const result = await operation();
  const endTime = process.hrtime.bigint();
  const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

  return { result, executionTime };
};

// Memory usage tracking
export const getMemoryUsage = (): NodeJS.MemoryUsage => {
  return process.memoryUsage();
};

export const logMemoryUsage = (label: string): void => {
  const usage = getMemoryUsage();
  console.log(`${label} - Memory Usage:`, {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`,
  });
};

// Test data generators
export const generateRandomTransactionId = (): string => {
  return `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateRandomUserId = (): string => {
  return `user-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateRandomHederaAccountId = (): string => {
  const shard = 0;
  const realm = 0;
  const account = Math.floor(Math.random() * 999999) + 100000;
  return `${shard}.${realm}.${account}`;
};

export const generateRandomXAFAmount = (
  min: number = 1000,
  max: number = 100000
): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Mock data factories
export const createMockPaymentSuccessEvent = (overrides: any = {}) => ({
  eventId: generateRandomTransactionId(),
  eventType: "ORANGE_MONEY_PAYMENT_SUCCESS",
  source: "sachain.recharge",
  version: "1.0",
  timestamp: new Date().toISOString(),
  transactionId: generateRandomTransactionId(),
  userId: generateRandomUserId(),
  xafAmount: generateRandomXAFAmount(),
  orangeMoneyTransactionId: `om-${Date.now()}`,
  userHederaAccountId: generateRandomHederaAccountId(),
  fees: {
    orangeMoneyFee: 500,
    platformFee: 250,
    totalFees: 750,
  },
  ...overrides,
});

export const createMockRechargeRequest = (overrides: any = {}) => ({
  userId: generateRandomUserId(),
  xafAmount: generateRandomXAFAmount(),
  userHederaAccountId: generateRandomHederaAccountId(),
  pin: "1234",
  ...overrides,
});

// Test assertion helpers
export const expectSuccessfulResponse = (response: any) => {
  expect(response.statusCode).toBe(200);
  const body = JSON.parse(response.body);
  expect(body.success).toBe(true);
  return body;
};

export const expectErrorResponse = (
  response: any,
  expectedStatusCode: number,
  expectedErrorCode?: string
) => {
  expect(response.statusCode).toBe(expectedStatusCode);
  const body = JSON.parse(response.body);
  expect(body.success).toBe(false);
  expect(body.error).toBeDefined();

  if (expectedErrorCode) {
    expect(body.error.code).toBe(expectedErrorCode);
  }

  return body;
};

// AWS SDK Mock helpers
export const mockDynamoDBSuccess = () => {
  mockClient(DynamoDBClient).resolves({});
};

export const mockDynamoDBError = (error: Error) => {
  mockClient(DynamoDBClient).rejects(error);
};

export const mockEventBridgeSuccess = () => {
  mockClient(EventBridgeClient).resolves({
    FailedEntryCount: 0,
    Entries: [{ EventId: "test-event-id" }],
  });
};

export const mockEventBridgeError = (error: Error) => {
  mockClient(EventBridgeClient).rejects(error);
};

console.log("✅ Integration test setup completed");
