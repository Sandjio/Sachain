/**
 * Unit tests for Orange Money Recharge Service
 */

import { OrangeMoneyRechargeService } from "../recharge-service";
import {
  HBARRechargePaymentRequest,
  OM_RECHARGE_ERROR_CODES,
  RechargePaymentLimits,
} from "../types";

// Mock fetch globally
global.fetch = jest.fn();

describe("OrangeMoneyRechargeService", () => {
  let service: OrangeMoneyRechargeService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new OrangeMoneyRechargeService();
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  describe("validateRechargePayment", () => {
    const validRequest: HBARRechargePaymentRequest = {
      transactionId: "txn-123",
      userId: "user-456",
      userHederaAccountId: "0.0.123456",
      customerNumber: "677123456",
      amount: "50000",
      xafAmount: 50000,
      estimatedHBARAmount: 25.5,
      pin: "1234",
      fees: {
        orangeMoneyFee: 500,
        platformFee: 1000,
        totalFees: 1500,
      },
    };

    it("should validate a correct recharge request", () => {
      const result = service.validateRechargePayment(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject request with missing required fields", () => {
      const invalidRequest = {
        ...validRequest,
        customerNumber: "",
        pin: "",
        transactionId: "",
      };

      const result = service.validateRechargePayment(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map((e) => e.code)).toContain(
        OM_RECHARGE_ERROR_CODES.INVALID_PHONE_NUMBER
      );
      expect(result.errors.map((e) => e.code)).toContain(
        OM_RECHARGE_ERROR_CODES.INVALID_PIN
      );
    });

    it("should reject amount below minimum", () => {
      const invalidRequest = {
        ...validRequest,
        xafAmount: 500, // Below default minimum of 1000
      };

      const result = service.validateRechargePayment(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(
        OM_RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW
      );
      expect(result.errors[0].message).toContain("1000 XAF");
    });

    it("should reject amount above maximum", () => {
      const invalidRequest = {
        ...validRequest,
        xafAmount: 2000000, // Above default maximum of 1000000
      };

      const result = service.validateRechargePayment(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(
        OM_RECHARGE_ERROR_CODES.AMOUNT_TOO_HIGH
      );
      expect(result.errors[0].message).toContain("1000000 XAF");
    });

    it("should reject invalid phone number formats", () => {
      const testCases = [
        "123456789", // Too short
        "12345678901", // Too long
        "577123456", // Wrong prefix
        "+33677123456", // Wrong country code
        "abc123456", // Non-numeric
      ];

      testCases.forEach((phoneNumber) => {
        const invalidRequest = {
          ...validRequest,
          customerNumber: phoneNumber,
        };

        const result = service.validateRechargePayment(invalidRequest);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some(
            (e) => e.code === OM_RECHARGE_ERROR_CODES.INVALID_PHONE_NUMBER
          )
        ).toBe(true);
      });
    });

    it("should accept valid Cameroon phone number formats", () => {
      const validPhoneNumbers = [
        "677123456",
        "697123456",
        "237677123456",
        "+237677123456",
        "237697123456",
        "+237697123456",
      ];

      validPhoneNumbers.forEach((phoneNumber) => {
        const request = {
          ...validRequest,
          customerNumber: phoneNumber,
        };

        const result = service.validateRechargePayment(request);

        expect(result.isValid).toBe(true);
      });
    });

    it("should reject invalid Hedera account ID formats", () => {
      const invalidAccountIds = [
        "123456",
        "0.123456",
        "0.0",
        "1.0.123456",
        "0.1.123456",
        "abc.def.ghi",
      ];

      invalidAccountIds.forEach((accountId) => {
        const invalidRequest = {
          ...validRequest,
          userHederaAccountId: accountId,
        };

        const result = service.validateRechargePayment(invalidRequest);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.message.includes("Hedera account ID"))
        ).toBe(true);
      });
    });

    it("should accept valid Hedera account ID formats", () => {
      const validAccountIds = ["0.0.123456", "0.0.1", "0.0.999999999"];

      validAccountIds.forEach((accountId) => {
        const request = {
          ...validRequest,
          userHederaAccountId: accountId,
        };

        const result = service.validateRechargePayment(request);

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe("initiateRechargePayment", () => {
    const validRequest: HBARRechargePaymentRequest = {
      transactionId: "txn-123",
      userId: "user-456",
      userHederaAccountId: "0.0.123456",
      customerNumber: "677123456",
      amount: "50000",
      xafAmount: 50000,
      estimatedHBARAmount: 25.5,
      pin: "1234",
      fees: {
        orangeMoneyFee: 500,
        platformFee: 1000,
        totalFees: 1500,
      },
    };

    it("should successfully initiate a recharge payment", async () => {
      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "mock-access-token",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: "Success",
            data: { payToken: "mock-pay-token" },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: "Payment created",
            data: {
              id: 12345,
              createtime: "2024-01-01T10:00:00Z",
              subscriberMsisdn: "677123456",
              amount: 50000,
              payToken: "mock-pay-token",
              txnid: "om-txn-789",
              txnmode: "PUSH",
              inittxnmessage: "Transaction initiated",
              inittxnstatus: "PENDING",
              confirmtxnstatus: null,
              confirmtxnmessage: null,
              status: "PENDING",
              notifUrl: "",
              description: "HBAR Recharge - 50000 XAF to 25.5 HBAR",
              channelUserMsisdn: "657615723",
            },
          }),
        } as Response);

      const result = await service.initiateRechargePayment(validRequest);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe("txn-123");
      expect(result.orangeMoneyTransactionId).toBe("om-txn-789");
      expect(result.paymentData).toBeDefined();
      expect(result.paymentData?.amount).toBe(50000);
      expect(result.error).toBeUndefined();

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should return validation error for invalid request", async () => {
      const invalidRequest = {
        ...validRequest,
        xafAmount: 500, // Below minimum
      };

      const result = await service.initiateRechargePayment(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(OM_RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle Orange Money API timeout errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Request timeout"));

      const result = await service.initiateRechargePayment(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(OM_RECHARGE_ERROR_CODES.TIMEOUT_ERROR);
      expect(result.error?.message).toContain("timed out");
    });

    it("should handle Orange Money API network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.initiateRechargePayment(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(OM_RECHARGE_ERROR_CODES.NETWORK_ERROR);
      expect(result.error?.message).toContain("Network error");
    });

    it("should handle Orange Money service unavailable", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: async () => "Service temporarily unavailable",
      } as Response);

      const result = await service.initiateRechargePayment(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(
        OM_RECHARGE_ERROR_CODES.SERVICE_UNAVAILABLE
      );
      expect(result.error?.message).toContain("temporarily unavailable");
    });

    it("should handle invalid PIN errors", async () => {
      mockFetch.mockRejectedValueOnce(
        new Error("401 Unauthorized - Invalid PIN")
      );

      const result = await service.initiateRechargePayment(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(OM_RECHARGE_ERROR_CODES.INVALID_PIN);
      expect(result.error?.message).toContain("Invalid Orange Money PIN");
    });

    it("should handle insufficient balance errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Insufficient balance"));

      const result = await service.initiateRechargePayment(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(
        OM_RECHARGE_ERROR_CODES.INSUFFICIENT_BALANCE
      );
      expect(result.error?.message).toContain(
        "Insufficient Orange Money balance"
      );
    });
  });

  describe("limits management", () => {
    it("should use default limits", () => {
      const limits = service.getRechargeLimit();

      expect(limits.minAmount).toBe(1000);
      expect(limits.maxAmount).toBe(1000000);
      expect(limits.dailyLimit).toBe(5000000);
    });

    it("should allow custom limits in constructor", () => {
      const customLimits: Partial<RechargePaymentLimits> = {
        minAmount: 2000,
        maxAmount: 500000,
      };

      const customService = new OrangeMoneyRechargeService(customLimits);
      const limits = customService.getRechargeLimit();

      expect(limits.minAmount).toBe(2000);
      expect(limits.maxAmount).toBe(500000);
      expect(limits.dailyLimit).toBe(5000000); // Should keep default
    });

    it("should allow updating limits", () => {
      service.updateRechargeLimit({ minAmount: 5000 });
      const limits = service.getRechargeLimit();

      expect(limits.minAmount).toBe(5000);
      expect(limits.maxAmount).toBe(1000000); // Should keep original
    });
  });

  describe("error mapping", () => {
    it("should map various error types correctly", async () => {
      const errorTestCases = [
        {
          error: new Error("Request timeout"),
          expectedCode: OM_RECHARGE_ERROR_CODES.TIMEOUT_ERROR,
        },
        {
          error: new Error("Network fetch failed"),
          expectedCode: OM_RECHARGE_ERROR_CODES.NETWORK_ERROR,
        },
        {
          error: new Error("503 Service unavailable"),
          expectedCode: OM_RECHARGE_ERROR_CODES.SERVICE_UNAVAILABLE,
        },
        {
          error: new Error("401 Invalid PIN provided"),
          expectedCode: OM_RECHARGE_ERROR_CODES.INVALID_PIN,
        },
        {
          error: new Error("Insufficient balance for transaction"),
          expectedCode: OM_RECHARGE_ERROR_CODES.INSUFFICIENT_BALANCE,
        },
        {
          error: new Error("Some unknown error"),
          expectedCode: OM_RECHARGE_ERROR_CODES.UNKNOWN_ERROR,
        },
      ];

      for (const testCase of errorTestCases) {
        mockFetch.mockRejectedValueOnce(testCase.error);

        const validRequest: HBARRechargePaymentRequest = {
          transactionId: "txn-123",
          userId: "user-456",
          userHederaAccountId: "0.0.123456",
          customerNumber: "677123456",
          amount: "50000",
          xafAmount: 50000,
          estimatedHBARAmount: 25.5,
          pin: "1234",
          fees: {
            orangeMoneyFee: 500,
            platformFee: 1000,
            totalFees: 1500,
          },
        };

        const result = await service.initiateRechargePayment(validRequest);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(testCase.expectedCode);

        mockFetch.mockClear();
      }
    });
  });
});
