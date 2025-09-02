/**
 * Test for Hedera service configuration and initialization
 */

import {
  createHederaService,
  createHederaServiceFromSecrets,
  HederaServiceError,
} from "../hedera-service";

describe("HederaService Configuration", () => {
  describe("createHederaService", () => {
    it("should create service with valid configuration", () => {
      const config = {
        operatorId: "0.0.123456",
        operatorKey:
          "302e020100300506032b657004220420000000000000000000000000000000000000000000000000000000000000000000",
        network: "testnet" as const,
      };

      expect(() => createHederaService(config)).not.toThrow();
    });

    it("should throw error with invalid operator ID", () => {
      const config = {
        operatorId: "invalid-id",
        operatorKey:
          "302e020100300506032b657004220420000000000000000000000000000000000000000000000000000000000000000000",
        network: "testnet" as const,
      };

      expect(() => createHederaService(config)).toThrow(HederaServiceError);
    });

    it("should throw error with invalid private key", () => {
      const config = {
        operatorId: "0.0.123456",
        operatorKey: "invalid-key",
        network: "testnet" as const,
      };

      expect(() => createHederaService(config)).toThrow(HederaServiceError);
    });

    it("should use default values from environment variables", () => {
      // Set test environment variables
      process.env.HEDERA_OPERATOR_ID = "0.0.123456";
      process.env.HEDERA_OPERATOR_KEY =
        "302e020100300506032b657004220420000000000000000000000000000000000000000000000000000000000000000000";
      process.env.HEDERA_NETWORK = "testnet";

      expect(() => createHederaService()).not.toThrow();

      // Clean up
      delete process.env.HEDERA_OPERATOR_ID;
      delete process.env.HEDERA_OPERATOR_KEY;
      delete process.env.HEDERA_NETWORK;
    });
  });

  describe("createHederaServiceFromSecrets", () => {
    it("should throw error when secret name is not provided", async () => {
      delete process.env.HEDERA_CREDENTIALS_SECRET_NAME;

      await expect(createHederaServiceFromSecrets()).rejects.toThrow(
        "HEDERA_CREDENTIALS_SECRET_NAME environment variable is required"
      );
    });

    it("should handle AWS SDK import errors gracefully", async () => {
      process.env.HEDERA_CREDENTIALS_SECRET_NAME = "/test/secret";

      // This will fail because we don't have actual AWS credentials in test
      await expect(createHederaServiceFromSecrets()).rejects.toThrow(
        HederaServiceError
      );
    });
  });
});
