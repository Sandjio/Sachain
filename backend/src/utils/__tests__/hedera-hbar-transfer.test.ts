/**
 * Unit tests for HBAR transfer capabilities in HederaService
 * Tests account validation, balance monitoring, and HBAR transfers
 */

import {
  HederaService,
  HederaServiceError,
  HederaErrorCodes,
} from "../hedera-service";
import { HBARTransferParams } from "../../types/hbar-recharge";

// Mock the entire Hedera SDK module
jest.mock("@hashgraph/sdk", () => {
  const mockClient = {
    setOperator: jest.fn(),
    setDefaultMaxTransactionFee: jest.fn(),
    setDefaultMaxQueryPayment: jest.fn(),
    close: jest.fn(),
  };

  const mockAccountId = {
    toString: jest.fn().mockReturnValue("0.0.123456"),
  };

  const mockPrivateKey = {};

  const mockHbar = {
    toBigNumber: jest.fn().mockReturnValue({ toNumber: () => 100 }),
    toTinybars: jest.fn().mockReturnValue(BigInt(100000000)),
  };

  return {
    Client: {
      forTestnet: jest.fn().mockReturnValue(mockClient),
      forMainnet: jest.fn().mockReturnValue(mockClient),
      forPreviewnet: jest.fn().mockReturnValue(mockClient),
    },
    AccountId: {
      fromString: jest.fn().mockReturnValue(mockAccountId),
    },
    PrivateKey: {
      fromStringECDSA: jest.fn().mockReturnValue(mockPrivateKey),
      fromStringDer: jest.fn().mockReturnValue(mockPrivateKey),
    },
    AccountBalanceQuery: jest.fn().mockImplementation(() => ({
      setAccountId: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        hbars: mockHbar,
      }),
    })),
    TransferTransaction: jest.fn().mockImplementation(() => ({
      addHbarTransfer: jest.fn().mockReturnThis(),
      setTransactionMemo: jest.fn().mockReturnThis(),
      freezeWith: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue({
        execute: jest.fn().mockResolvedValue({
          transactionId: { toString: () => "0.0.123456@1234567890.123456789" },
          getReceipt: jest.fn().mockResolvedValue({
            status: "SUCCESS",
          }),
          getRecord: jest.fn().mockResolvedValue({
            transactionHash: "hash123",
            consensusTimestamp: "1234567890.123456789",
            transactionFee: "0.05",
          }),
        }),
      }),
    })),
    Hbar: jest.fn().mockImplementation((amount) => ({
      toBigNumber: () => ({ toNumber: () => amount }),
      toTinybars: () => BigInt(amount * 100000000),
    })),
    Status: {
      Success: "SUCCESS",
      TransactionExpired: "TRANSACTION_EXPIRED",
    },
    TokenType: {
      NonFungibleUnique: "NON_FUNGIBLE_UNIQUE",
    },
    TokenSupplyType: {
      Finite: "FINITE",
    },
    TokenCreateTransaction: jest.fn(),
    TokenMintTransaction: jest.fn(),
    TokenInfoQuery: jest.fn(),
    TokenNftInfoQuery: jest.fn(),
  };
});

jest.mock("../project-metrics", () => ({
  projectMetrics: {
    recordHederaNetworkHealth: jest.fn(),
    recordHederaTokenCreation: jest.fn(),
    recordHederaNFTMinting: jest.fn(),
  },
}));

jest.mock("../retry", () => ({
  ExponentialBackoff: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockImplementation(async (fn) => {
      try {
        const result = await fn();
        return { result };
      } catch (error) {
        // Don't retry in tests, just throw the error
        throw error;
      }
    }),
  })),
  RetryError: class RetryError extends Error {
    constructor(
      message: string,
      public attempts: number,
      public lastError: Error
    ) {
      super(message);
    }
  },
}));

describe("HederaService HBAR Transfer Capabilities", () => {
  let hederaService: HederaService;

  const validConfig = {
    operatorId: "0.0.123456",
    operatorKey:
      "3030020100300706052b8104000a04220420d0be273e8cc795c37696efeee5c06a3b7755f3229601b4b3d8681d44fca63152",
    network: "testnet" as const,
    maxTransactionFee: 100,
    maxQueryPayment: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    hederaService = new HederaService(validConfig);
  });

  describe("validateHederaAccount", () => {
    it("should validate a valid Hedera account ID", async () => {
      const result = await hederaService.validateHederaAccount("0.0.123456");
      expect(result).toBe(true);
    });

    it("should throw error for invalid account ID format", async () => {
      const { AccountId } = require("@hashgraph/sdk");
      AccountId.fromString.mockImplementation(() => {
        throw new Error("Invalid format");
      });

      await expect(
        hederaService.validateHederaAccount("invalid-account")
      ).rejects.toThrow(HederaServiceError);

      await expect(
        hederaService.validateHederaAccount("invalid-account")
      ).rejects.toMatchObject({
        code: HederaErrorCodes.INVALID_HEDERA_ACCOUNT,
        statusCode: 400,
      });

      // Reset the mock
      AccountId.fromString.mockReturnValue({ toString: () => "0.0.123456" });
    });

    it("should throw error for non-existent account", async () => {
      const { AccountBalanceQuery } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementationOnce(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error("Account not found")),
      }));

      await expect(
        hederaService.validateHederaAccount("0.0.999999")
      ).rejects.toThrow(HederaServiceError);

      await expect(
        hederaService.validateHederaAccount("0.0.999999")
      ).rejects.toMatchObject({
        code: HederaErrorCodes.INVALID_HEDERA_ACCOUNT,
        statusCode: 404,
      });
    });
  });

  describe("getAccountBalance", () => {
    it("should return account balance in HBAR", async () => {
      const { AccountBalanceQuery } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementationOnce(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          hbars: {
            toBigNumber: () => ({ toNumber: () => 150.5 }),
          },
        }),
      }));

      const balance = await hederaService.getAccountBalance("0.0.123456");
      expect(balance).toBe(150.5);
    });

    it("should handle balance query errors", async () => {
      const { AccountBalanceQuery } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementationOnce(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error("Network error")),
      }));

      await expect(
        hederaService.getAccountBalance("0.0.123456")
      ).rejects.toThrow(HederaServiceError);
    });
  });

  describe("monitorTreasuryBalance", () => {
    it("should return balance status above threshold", async () => {
      const { AccountBalanceQuery } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementationOnce(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          hbars: {
            toBigNumber: () => ({ toNumber: () => 200 }),
          },
        }),
      }));

      const result = await hederaService.monitorTreasuryBalance(100);

      expect(result).toEqual({
        balance: 200,
        isAboveThreshold: true,
        threshold: 100,
      });
    });

    it("should return balance status below threshold", async () => {
      const { AccountBalanceQuery } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementationOnce(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          hbars: {
            toBigNumber: () => ({ toNumber: () => 50 }),
          },
        }),
      }));

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await hederaService.monitorTreasuryBalance(100);

      expect(result).toEqual({
        balance: 50,
        isAboveThreshold: false,
        threshold: 100,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Treasury balance warning"),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("transferHBAR", () => {
    const validTransferParams: HBARTransferParams = {
      fromAccountId: "0.0.123456",
      toAccountId: "0.0.789012",
      amount: 10,
      memo: "Test transfer",
    };

    it("should successfully transfer HBAR", async () => {
      // Mock sufficient balance
      const { AccountBalanceQuery } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementation(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          hbars: {
            toBigNumber: () => ({ toNumber: () => 100 }),
          },
        }),
      }));

      const result = await hederaService.transferHBAR(validTransferParams);

      expect(result).toEqual({
        transactionId: "0.0.123456@1234567890.123456789",
        transactionHash: "hash123",
        consensusTimestamp: "1234567890.123456789",
        actualCost: "0.05",
        status: "success",
      });
    });

    it("should throw error for insufficient balance", async () => {
      // Mock insufficient balance
      const { AccountBalanceQuery } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementation(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          hbars: {
            toBigNumber: () => ({ toNumber: () => 5 }),
          },
        }),
      }));

      await expect(
        hederaService.transferHBAR(validTransferParams)
      ).rejects.toThrow(HederaServiceError);

      await expect(
        hederaService.transferHBAR(validTransferParams)
      ).rejects.toMatchObject({
        code: HederaErrorCodes.INSUFFICIENT_TREASURY_BALANCE,
        statusCode: 402,
      });
    });

    it("should validate transfer parameters", async () => {
      const invalidParams = [
        { ...validTransferParams, fromAccountId: "" },
        { ...validTransferParams, toAccountId: "" },
        { ...validTransferParams, amount: 0 },
        { ...validTransferParams, amount: -5 },
        { ...validTransferParams, amount: 2000000 },
        {
          ...validTransferParams,
          fromAccountId: "0.0.123456",
          toAccountId: "0.0.123456",
        },
        { ...validTransferParams, memo: "a".repeat(101) },
      ];

      for (const params of invalidParams) {
        await expect(hederaService.transferHBAR(params)).rejects.toThrow(
          HederaServiceError
        );
      }
    });

    it("should handle invalid account ID formats", async () => {
      const { AccountId } = require("@hashgraph/sdk");
      AccountId.fromString.mockImplementation((id: string) => {
        if (id === "invalid-account") {
          throw new Error("Invalid format");
        }
        return { toString: () => id };
      });

      const invalidParams = {
        ...validTransferParams,
        fromAccountId: "invalid-account",
      };

      await expect(hederaService.transferHBAR(invalidParams)).rejects.toThrow(
        HederaServiceError
      );

      await expect(
        hederaService.transferHBAR(invalidParams)
      ).rejects.toMatchObject({
        code: HederaErrorCodes.INVALID_HEDERA_ACCOUNT,
        statusCode: 400,
      });
    });

    it("should handle transfer transaction failures", async () => {
      // Mock sufficient balance
      const {
        AccountBalanceQuery,
        TransferTransaction,
      } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementation(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          hbars: {
            toBigNumber: () => ({ toNumber: () => 100 }),
          },
        }),
      }));

      // Mock failed transfer transaction
      TransferTransaction.mockImplementationOnce(() => ({
        addHbarTransfer: jest.fn().mockReturnThis(),
        setTransactionMemo: jest.fn().mockReturnThis(),
        freezeWith: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue({
          execute: jest.fn().mockResolvedValue({
            transactionId: {
              toString: () => "0.0.123456@1234567890.123456789",
            },
            getReceipt: jest.fn().mockResolvedValue({
              status: "TRANSACTION_EXPIRED",
            }),
          }),
        }),
      }));

      await expect(
        hederaService.transferHBAR(validTransferParams)
      ).rejects.toThrow(HederaServiceError);
    });

    it("should transfer without memo when not provided", async () => {
      const paramsWithoutMemo = {
        fromAccountId: "0.0.123456",
        toAccountId: "0.0.789012",
        amount: 10,
      };

      // Mock sufficient balance
      const {
        AccountBalanceQuery,
        TransferTransaction,
      } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementation(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          hbars: {
            toBigNumber: () => ({ toNumber: () => 100 }),
          },
        }),
      }));

      const mockTransferTx = {
        addHbarTransfer: jest.fn().mockReturnThis(),
        setTransactionMemo: jest.fn().mockReturnThis(),
        freezeWith: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue({
          execute: jest.fn().mockResolvedValue({
            transactionId: {
              toString: () => "0.0.123456@1234567890.123456789",
            },
            getReceipt: jest.fn().mockResolvedValue({
              status: "SUCCESS",
            }),
            getRecord: jest.fn().mockResolvedValue({
              transactionHash: "hash123",
              consensusTimestamp: "1234567890.123456789",
              transactionFee: "0.05",
            }),
          }),
        }),
      };

      TransferTransaction.mockImplementationOnce(() => mockTransferTx);

      const result = await hederaService.transferHBAR(paramsWithoutMemo);

      expect(result.status).toBe("success");
      expect(mockTransferTx.setTransactionMemo).not.toHaveBeenCalled();
    });
  });

  describe("Parameter validation", () => {
    it("should validate HBAR transfer parameters correctly", async () => {
      const validParams: HBARTransferParams = {
        fromAccountId: "0.0.123456",
        toAccountId: "0.0.789012",
        amount: 10,
        memo: "Valid memo",
      };

      // This should not throw
      expect(() => {
        // Access the private method through any to test validation
        (hederaService as any).validateHBARTransferParams(validParams);
      }).not.toThrow();
    });

    it("should reject invalid parameters", async () => {
      const invalidCases = [
        { fromAccountId: "", toAccountId: "0.0.789012", amount: 10 },
        { fromAccountId: "0.0.123456", toAccountId: "", amount: 10 },
        { fromAccountId: "0.0.123456", toAccountId: "0.0.789012", amount: 0 },
        { fromAccountId: "0.0.123456", toAccountId: "0.0.789012", amount: -5 },
        {
          fromAccountId: "0.0.123456",
          toAccountId: "0.0.789012",
          amount: 2000000,
        },
        { fromAccountId: "0.0.123456", toAccountId: "0.0.123456", amount: 10 },
        {
          fromAccountId: "0.0.123456",
          toAccountId: "0.0.789012",
          amount: 10,
          memo: "a".repeat(101),
        },
      ];

      for (const params of invalidCases) {
        expect(() => {
          (hederaService as any).validateHBARTransferParams(params);
        }).toThrow(HederaServiceError);
      }
    });
  });

  describe("Error handling", () => {
    it("should handle specific Hedera error codes", async () => {
      const { AccountBalanceQuery } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementationOnce(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockImplementation(() => {
          const error = new Error("Insufficient payer balance");
          (error as any).status = "INSUFFICIENT_PAYER_BALANCE";
          throw error;
        }),
      }));

      await expect(
        hederaService.getAccountBalance("0.0.123456")
      ).rejects.toMatchObject({
        code: HederaErrorCodes.INSUFFICIENT_BALANCE,
        statusCode: 402,
      });
    });

    it("should handle network connection errors", async () => {
      const { AccountBalanceQuery } = require("@hashgraph/sdk");
      AccountBalanceQuery.mockImplementationOnce(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error("Network timeout")),
      }));

      await expect(
        hederaService.getAccountBalance("0.0.123456")
      ).rejects.toThrow(HederaServiceError);
    });
  });
});
