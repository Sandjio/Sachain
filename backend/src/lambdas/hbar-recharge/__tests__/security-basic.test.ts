/**
 * Basic Security Tests for HBAR Recharge System
 * Tests core security functionality without complex mocking
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { SimpleEncryptionService } from "../../../utils/simple-encryption-service";

// Mock AWS SDK
jest.mock("aws-sdk", () => ({
  KMS: jest.fn().mockImplementation(() => ({
    generateDataKey: jest.fn().mockReturnValue({
      promise: () =>
        Promise.resolve({
          Plaintext: Buffer.from("test-key-32-bytes-long-for-aes256"),
        }),
    }),
  })),
}));

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe("Basic Security Tests", () => {
  let encryptionService: SimpleEncryptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    encryptionService = new SimpleEncryptionService(mockLogger as any);
  });

  describe("Data Encryption", () => {
    it("should generate consistent hashes for same data", () => {
      const testData = { amount: 100000, userId: "test-user" };
      const hash1 = encryptionService.generateDataHash(testData);
      const hash2 = encryptionService.generateDataHash(testData);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64-character hex string
    });

    it("should generate different hashes for different data", () => {
      const testData1 = { amount: 100000, userId: "test-user-1" };
      const testData2 = { amount: 200000, userId: "test-user-2" };

      const hash1 = encryptionService.generateDataHash(testData1);
      const hash2 = encryptionService.generateDataHash(testData2);

      expect(hash1).not.toBe(hash2);
    });

    it("should verify data integrity correctly", () => {
      const testData = { amount: 100000, userId: "test-user" };
      const hash = encryptionService.generateDataHash(testData);

      const isValid = encryptionService.verifyDataHash(testData, hash);
      expect(isValid).toBe(true);

      const modifiedData = { ...testData, amount: 200000 };
      const isValidModified = encryptionService.verifyDataHash(
        modifiedData,
        hash
      );
      expect(isValidModified).toBe(false);
    });

    it("should securely wipe sensitive data from memory", () => {
      const sensitiveData = {
        pin: "1234",
        customerNumber: "677123456",
        regularField: "not-sensitive",
      };

      encryptionService.wipeSensitiveData(sensitiveData);

      expect(sensitiveData.pin).toBeUndefined();
      expect(sensitiveData.customerNumber).toBeUndefined();
      expect(sensitiveData.regularField).toBe("not-sensitive");
    });

    it("should identify sensitive fields correctly", () => {
      const sensitiveData = {
        pin: "1234",
        customerNumber: "677123456",
        userEmail: "test@example.com",
        apiKeys: { key1: "secret" },
        regularField: "not-sensitive",
        amount: 100000,
      };

      // Test the private method through wipeSensitiveData
      encryptionService.wipeSensitiveData(sensitiveData);

      // Sensitive fields should be removed
      expect(sensitiveData.pin).toBeUndefined();
      expect(sensitiveData.customerNumber).toBeUndefined();
      expect(sensitiveData.userEmail).toBeUndefined();
      expect(sensitiveData.apiKeys).toBeUndefined();

      // Non-sensitive fields should remain
      expect(sensitiveData.regularField).toBe("not-sensitive");
      expect(sensitiveData.amount).toBe(100000);
    });
  });

  describe("Security Configuration", () => {
    it("should handle missing environment variables gracefully", () => {
      // Test that service initializes with defaults when env vars are missing
      const service = new SimpleEncryptionService(mockLogger as any);
      expect(service).toBeDefined();
    });

    it("should cleanup resources properly", () => {
      encryptionService.cleanup();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Simple encryption service cleanup completed",
        expect.objectContaining({
          operation: "SimpleEncryptionService",
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle hash generation errors gracefully", () => {
      // Test with circular reference that would cause JSON.stringify to fail
      const circularData: any = { name: "test" };
      circularData.self = circularData;

      expect(() => {
        encryptionService.generateDataHash(circularData);
      }).toThrow();
    });

    it("should handle invalid hash verification", () => {
      const testData = { amount: 100000 };
      const invalidHash = "invalid-hash";

      const isValid = encryptionService.verifyDataHash(testData, invalidHash);
      expect(isValid).toBe(false);
    });
  });

  describe("Performance", () => {
    it("should generate hashes quickly", () => {
      const testData = { amount: 100000, userId: "test-user" };
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        encryptionService.generateDataHash({ ...testData, iteration: i });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete 100 hashes in under 1 second
    });

    it("should handle large data objects", () => {
      const largeData = {
        userId: "test-user",
        transactions: Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: `txn-${i}`,
            amount: Math.random() * 1000000,
            timestamp: new Date().toISOString(),
          })),
      };

      const startTime = Date.now();
      const hash = encryptionService.generateDataHash(largeData);
      const duration = Date.now() - startTime;

      expect(hash).toHaveLength(64);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});
