/**
 * Unit tests for HederaService
 * Tests token creation, NFT minting, wallet validation, and error scenarios
 */

import {
  HederaService,
  HederaConfig,
  HederaServiceError,
  HederaErrorCodes,
  TokenCreationParams,
  NFTMintingParams,
  ProjectMetadata,
  StockMetadata,
  createHederaService,
} from "../hedera-service";
import {
  Client,
  PrivateKey,
  AccountId,
  TokenCreateTransaction,
  TokenMintTransaction,
  TokenInfoQuery,
  TokenNftInfoQuery,
  AccountBalanceQuery,
  Status,
  TransactionResponse,
  TransactionReceipt,
  TransactionRecord,
  TokenInfo,
  TokenNftInfo,
  AccountBalance,
  Hbar,
} from "@hashgraph/sdk";

// Mock the Hedera SDK
jest.mock("@hashgraph/sdk");

const MockedClient = Client as jest.MockedClass<typeof Client>;
const MockedPrivateKey = PrivateKey as jest.MockedClass<typeof PrivateKey>;
const MockedAccountId = AccountId as jest.MockedClass<typeof AccountId>;
const MockedTokenCreateTransaction = TokenCreateTransaction as jest.MockedClass<
  typeof TokenCreateTransaction
>;
const MockedTokenMintTransaction = TokenMintTransaction as jest.MockedClass<
  typeof TokenMintTransaction
>;
const MockedTokenInfoQuery = TokenInfoQuery as jest.MockedClass<
  typeof TokenInfoQuery
>;
const MockedTokenNftInfoQuery = TokenNftInfoQuery as jest.MockedClass<
  typeof TokenNftInfoQuery
>;
const MockedAccountBalanceQuery = AccountBalanceQuery as jest.MockedClass<
  typeof AccountBalanceQuery
>;

describe("HederaService", () => {
  let hederaService: HederaService;
  let mockClient: jest.Mocked<Client>;
  let mockPrivateKey: jest.Mocked<PrivateKey>;
  let mockAccountId: jest.Mocked<AccountId>;

  const validConfig: HederaConfig = {
    operatorId: "0.0.123456",
    operatorKey:
      "302e020100300506032b657004220420abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    network: "testnet",
    maxTransactionFee: 100,
    maxQueryPayment: 1,
  };

  const mockProjectMetadata: ProjectMetadata = {
    name: "Test Project",
    description: "A test project for tokenization",
    image: "https://example.com/image.png",
    external_url: "https://example.com/project",
    attributes: [
      { trait_type: "Category", value: "Technology" },
      { trait_type: "Stage", value: "Seed" },
    ],
  };

  const mockStockMetadata: StockMetadata[] = [
    {
      name: "Test Project Stock #1",
      description: "Stock #1 of Test Project",
      image: "https://example.com/stock1.png",
      external_url: "https://example.com/project/stock/1",
      attributes: [
        { trait_type: "Stock Number", value: 1 },
        { trait_type: "Project", value: "Test Project" },
      ],
      project_id: "test-project-123",
      stock_number: 1,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Client
    mockClient = {
      setOperator: jest.fn(),
      setDefaultMaxTransactionFee: jest.fn(),
      setDefaultMaxQueryPayment: jest.fn(),
      close: jest.fn(),
    } as any;

    MockedClient.forTestnet.mockReturnValue(mockClient);
    MockedClient.forMainnet.mockReturnValue(mockClient);
    MockedClient.forPreviewnet.mockReturnValue(mockClient);

    // Mock PrivateKey
    mockPrivateKey = {} as any;
    MockedPrivateKey.fromString.mockReturnValue(mockPrivateKey);

    // Mock AccountId
    mockAccountId = {
      toString: jest.fn().mockReturnValue("0.0.123456"),
    } as any;
    MockedAccountId.fromString.mockReturnValue(mockAccountId);

    hederaService = new HederaService(validConfig);
  });

  describe("Constructor and Configuration", () => {
    it("should initialize with valid configuration", () => {
      expect(MockedClient.forTestnet).toHaveBeenCalled();
      expect(mockClient.setOperator).toHaveBeenCalledWith(
        mockAccountId,
        mockPrivateKey
      );
      expect(mockClient.setDefaultMaxTransactionFee).toHaveBeenCalledWith(
        new Hbar(100)
      );
      expect(mockClient.setDefaultMaxQueryPayment).toHaveBeenCalledWith(
        new Hbar(1)
      );
    });

    it("should initialize with mainnet configuration", () => {
      const mainnetConfig = { ...validConfig, network: "mainnet" as const };
      new HederaService(mainnetConfig);
      expect(MockedClient.forMainnet).toHaveBeenCalled();
    });

    it("should initialize with previewnet configuration", () => {
      const previewnetConfig = {
        ...validConfig,
        network: "previewnet" as const,
      };
      new HederaService(previewnetConfig);
      expect(MockedClient.forPreviewnet).toHaveBeenCalled();
    });

    it("should throw error for invalid network", () => {
      const invalidConfig = { ...validConfig, network: "invalid" as any };
      expect(() => new HederaService(invalidConfig)).toThrow(
        HederaServiceError
      );
    });

    it("should throw error for missing configuration", () => {
      const incompleteConfig = { operatorId: "0.0.123456" } as HederaConfig;
      expect(() => new HederaService(incompleteConfig)).toThrow(
        HederaServiceError
      );
    });

    it("should throw error for invalid operator ID", () => {
      MockedAccountId.fromString.mockImplementation(() => {
        throw new Error("Invalid account ID");
      });
      expect(() => new HederaService(validConfig)).toThrow(HederaServiceError);
    });

    it("should throw error for invalid operator key", () => {
      MockedPrivateKey.fromString.mockImplementation(() => {
        throw new Error("Invalid private key");
      });
      expect(() => new HederaService(validConfig)).toThrow(HederaServiceError);
    });
  });

  describe("validateWallet", () => {
    let mockAccountBalance: jest.Mocked<AccountBalance>;
    let mockBalanceQuery: jest.Mocked<AccountBalanceQuery>;

    beforeEach(() => {
      mockAccountBalance = {
        hbars: {
          toBigNumber: jest.fn().mockReturnValue({
            toNumber: jest.fn().mockReturnValue(10), // 10 Hbar balance
          }),
        },
      } as any;

      mockBalanceQuery = {
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(mockAccountBalance),
      } as any;

      MockedAccountBalanceQuery.mockImplementation(() => mockBalanceQuery);
    });

    it("should validate wallet with sufficient balance", async () => {
      const result = await hederaService.validateWallet("0.0.789012", 5);

      expect(result).toEqual({
        isValid: true,
        balance: "10",
        hasMinimumBalance: true,
        estimatedGasFee: "5",
        canAffordOperation: true,
      });
      expect(mockBalanceQuery.setAccountId).toHaveBeenCalledWith(mockAccountId);
    });

    it("should validate wallet with insufficient balance", async () => {
      mockAccountBalance.hbars.toBigNumber().toNumber = jest
        .fn()
        .mockReturnValue(3);

      const result = await hederaService.validateWallet("0.0.789012", 5);

      expect(result).toEqual({
        isValid: true,
        balance: "3",
        hasMinimumBalance: false,
        estimatedGasFee: "5",
        canAffordOperation: false,
      });
    });

    it("should handle invalid wallet address", async () => {
      MockedAccountId.fromString.mockImplementation(() => {
        throw new Error("Invalid account ID");
      });

      await expect(
        hederaService.validateWallet("invalid-address")
      ).rejects.toThrow(HederaServiceError);
    });

    it("should retry on network errors", async () => {
      mockBalanceQuery.execute
        .mockRejectedValueOnce(new Error("NetworkingError"))
        .mockResolvedValueOnce(mockAccountBalance);

      const result = await hederaService.validateWallet("0.0.789012");

      expect(result.isValid).toBe(true);
      expect(mockBalanceQuery.execute).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries", async () => {
      mockBalanceQuery.execute.mockRejectedValue(new Error("NetworkingError"));

      await expect(hederaService.validateWallet("0.0.789012")).rejects.toThrow(
        HederaServiceError
      );
    });
  });

  describe("calculateGasFees", () => {
    it("should calculate fees for token creation only", async () => {
      const result = await hederaService.calculateGasFees({
        tokenCreation: true,
      });

      expect(result).toEqual({
        tokenCreation: "20",
        nftMinting: "0.1",
        totalEstimate: "20",
      });
    });

    it("should calculate fees for NFT minting only", async () => {
      const result = await hederaService.calculateGasFees({
        tokenCreation: false,
        nftQuantity: 10,
      });

      expect(result).toEqual({
        tokenCreation: "20",
        nftMinting: "0.1",
        totalEstimate: "1",
      });
    });

    it("should calculate fees for both operations", async () => {
      const result = await hederaService.calculateGasFees({
        tokenCreation: true,
        nftQuantity: 5,
      });

      expect(result).toEqual({
        tokenCreation: "20",
        nftMinting: "0.1",
        totalEstimate: "20.5",
      });
    });
  });

  describe("createToken", () => {
    let mockTransaction: jest.Mocked<TokenCreateTransaction>;
    let mockTransactionResponse: jest.Mocked<TransactionResponse>;
    let mockReceipt: jest.Mocked<TransactionReceipt>;
    let mockRecord: jest.Mocked<TransactionRecord>;

    beforeEach(() => {
      mockTransaction = {
        setTokenName: jest.fn().mockReturnThis(),
        setTokenSymbol: jest.fn().mockReturnThis(),
        setTokenType: jest.fn().mockReturnThis(),
        setSupplyType: jest.fn().mockReturnThis(),
        setMaxSupply: jest.fn().mockReturnThis(),
        setTreasuryAccountId: jest.fn().mockReturnThis(),
        setSupplyKey: jest.fn().mockReturnThis(),
        setAdminKey: jest.fn().mockReturnThis(),
        setMetadata: jest.fn().mockReturnThis(),
        freezeWith: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue({
          execute: jest.fn().mockResolvedValue(mockTransactionResponse),
        }),
      } as any;

      mockTransactionResponse = {
        transactionId: {
          toString: jest
            .fn()
            .mockReturnValue("0.0.123456@1234567890.123456789"),
        },
        getReceipt: jest.fn().mockResolvedValue(mockReceipt),
        getRecord: jest.fn().mockResolvedValue(mockRecord),
      } as any;

      mockReceipt = {
        status: Status.Success,
        tokenId: {
          toString: jest.fn().mockReturnValue("0.0.987654"),
        },
      } as any;

      mockRecord = {
        transactionHash: {
          toString: jest.fn().mockReturnValue("abcdef1234567890"),
        },
        consensusTimestamp: {
          toString: jest.fn().mockReturnValue("1234567890.123456789"),
        },
        transactionFee: {
          toString: jest.fn().mockReturnValue("5.0"),
        },
      } as any;

      MockedTokenCreateTransaction.mockImplementation(() => mockTransaction);
    });

    it("should create token successfully", async () => {
      const params: TokenCreationParams = {
        projectId: "test-project-123",
        tokenName: "Test Project Token",
        tokenSymbol: "TPT",
        totalSupply: 1000,
        metadata: mockProjectMetadata,
      };

      const result = await hederaService.createToken(params);

      expect(result).toEqual({
        tokenId: "0.0.987654",
        transactionId: "0.0.123456@1234567890.123456789",
        transactionHash: "abcdef1234567890",
        consensusTimestamp: "1234567890.123456789",
        totalCost: "5.0",
      });

      expect(mockTransaction.setTokenName).toHaveBeenCalledWith(
        "Test Project Token"
      );
      expect(mockTransaction.setTokenSymbol).toHaveBeenCalledWith("TPT");
      expect(mockTransaction.setMaxSupply).toHaveBeenCalledWith(1000);
    });

    it("should validate token creation parameters", async () => {
      const invalidParams = {
        projectId: "",
        tokenName: "",
        tokenSymbol: "",
        totalSupply: 0,
        metadata: mockProjectMetadata,
      };

      await expect(hederaService.createToken(invalidParams)).rejects.toThrow(
        HederaServiceError
      );
    });

    it("should handle token creation failure", async () => {
      mockReceipt.status = Status.InvalidTokenId;

      const params: TokenCreationParams = {
        projectId: "test-project-123",
        tokenName: "Test Project Token",
        tokenSymbol: "TPT",
        totalSupply: 1000,
        metadata: mockProjectMetadata,
      };

      await expect(hederaService.createToken(params)).rejects.toThrow(
        HederaServiceError
      );
    });

    it("should retry on transient errors", async () => {
      const signedTx = {
        execute: jest
          .fn()
          .mockRejectedValueOnce(new Error("BUSY"))
          .mockResolvedValueOnce(mockTransactionResponse),
      };
      mockTransaction.sign.mockResolvedValue(signedTx);

      const params: TokenCreationParams = {
        projectId: "test-project-123",
        tokenName: "Test Project Token",
        tokenSymbol: "TPT",
        totalSupply: 1000,
        metadata: mockProjectMetadata,
      };

      const result = await hederaService.createToken(params);
      expect(result.tokenId).toBe("0.0.987654");
      expect(signedTx.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe("mintNFTs", () => {
    let mockTransaction: jest.Mocked<TokenMintTransaction>;
    let mockTransactionResponse: jest.Mocked<TransactionResponse>;
    let mockReceipt: jest.Mocked<TransactionReceipt>;
    let mockRecord: jest.Mocked<TransactionRecord>;

    beforeEach(() => {
      mockTransaction = {
        setTokenId: jest.fn().mockReturnThis(),
        setMetadata: jest.fn().mockReturnThis(),
        freezeWith: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue({
          execute: jest.fn().mockResolvedValue(mockTransactionResponse),
        }),
      } as any;

      mockTransactionResponse = {
        transactionId: {
          toString: jest
            .fn()
            .mockReturnValue("0.0.123456@1234567890.123456789"),
        },
        getReceipt: jest.fn().mockResolvedValue(mockReceipt),
        getRecord: jest.fn().mockResolvedValue(mockRecord),
      } as any;

      mockReceipt = {
        status: Status.Success,
        serials: [{ toNumber: jest.fn().mockReturnValue(1) }],
      } as any;

      mockRecord = {
        transactionHash: {
          toString: jest.fn().mockReturnValue("abcdef1234567890"),
        },
        consensusTimestamp: {
          toString: jest.fn().mockReturnValue("1234567890.123456789"),
        },
        transactionFee: {
          toString: jest.fn().mockReturnValue("0.5"),
        },
      } as any;

      MockedTokenMintTransaction.mockImplementation(() => mockTransaction);
    });

    it("should mint NFTs successfully", async () => {
      const params: NFTMintingParams = {
        tokenId: "0.0.987654",
        quantity: 1,
        metadata: mockStockMetadata,
      };

      const result = await hederaService.mintNFTs(params);

      expect(result).toEqual({
        serialNumbers: [1],
        transactionId: "0.0.123456@1234567890.123456789",
        transactionHash: "abcdef1234567890",
        consensusTimestamp: "1234567890.123456789",
        totalCost: "0.5",
      });

      expect(mockTransaction.setTokenId).toHaveBeenCalledWith("0.0.987654");
      expect(mockTransaction.setMetadata).toHaveBeenCalledWith([
        Buffer.from(JSON.stringify(mockStockMetadata[0])),
      ]);
    });

    it("should validate NFT minting parameters", async () => {
      const invalidParams = {
        tokenId: "",
        quantity: 0,
        metadata: [],
      };

      await expect(hederaService.mintNFTs(invalidParams)).rejects.toThrow(
        HederaServiceError
      );
    });

    it("should validate metadata array length", async () => {
      const invalidParams = {
        tokenId: "0.0.987654",
        quantity: 2,
        metadata: mockStockMetadata, // Only 1 item
      };

      await expect(hederaService.mintNFTs(invalidParams)).rejects.toThrow(
        HederaServiceError
      );
    });

    it("should handle minting failure", async () => {
      mockReceipt.status = Status.InvalidTokenId;

      const params: NFTMintingParams = {
        tokenId: "0.0.987654",
        quantity: 1,
        metadata: mockStockMetadata,
      };

      await expect(hederaService.mintNFTs(params)).rejects.toThrow(
        HederaServiceError
      );
    });

    it("should validate serial number count", async () => {
      mockReceipt.serials = []; // No serials returned

      const params: NFTMintingParams = {
        tokenId: "0.0.987654",
        quantity: 1,
        metadata: mockStockMetadata,
      };

      await expect(hederaService.mintNFTs(params)).rejects.toThrow(
        HederaServiceError
      );
    });
  });

  describe("getTokenInfo", () => {
    let mockQuery: jest.Mocked<TokenInfoQuery>;
    let mockTokenInfo: jest.Mocked<TokenInfo>;

    beforeEach(() => {
      mockTokenInfo = {
        tokenId: {
          toString: jest.fn().mockReturnValue("0.0.987654"),
        },
        name: "Test Project Token",
        symbol: "TPT",
      } as any;

      mockQuery = {
        setTokenId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(mockTokenInfo),
      } as any;

      MockedTokenInfoQuery.mockImplementation(() => mockQuery);
    });

    it("should get token info successfully", async () => {
      const result = await hederaService.getTokenInfo("0.0.987654");

      expect(result).toBe(mockTokenInfo);
      expect(mockQuery.setTokenId).toHaveBeenCalledWith("0.0.987654");
    });

    it("should retry on network errors", async () => {
      mockQuery.execute
        .mockRejectedValueOnce(new Error("NetworkingError"))
        .mockResolvedValueOnce(mockTokenInfo);

      const result = await hederaService.getTokenInfo("0.0.987654");

      expect(result).toBe(mockTokenInfo);
      expect(mockQuery.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe("getNFTInfo", () => {
    let mockQuery: jest.Mocked<TokenNftInfoQuery>;
    let mockNftInfo: jest.Mocked<TokenNftInfo>;

    beforeEach(() => {
      mockNftInfo = {
        tokenId: {
          toString: jest.fn().mockReturnValue("0.0.987654"),
        },
        serialNumber: 1,
        metadata: Buffer.from(JSON.stringify(mockStockMetadata[0])),
      } as any;

      mockQuery = {
        setTokenId: jest.fn().mockReturnThis(),
        setSerialNumber: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(mockNftInfo),
      } as any;

      MockedTokenNftInfoQuery.mockImplementation(() => mockQuery);
    });

    it("should get NFT info successfully", async () => {
      const result = await hederaService.getNFTInfo("0.0.987654", 1);

      expect(result).toBe(mockNftInfo);
      expect(mockQuery.setTokenId).toHaveBeenCalledWith("0.0.987654");
      expect(mockQuery.setSerialNumber).toHaveBeenCalledWith(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle insufficient balance error", async () => {
      const error = new Error("INSUFFICIENT_PAYER_BALANCE");
      error.status = "INSUFFICIENT_PAYER_BALANCE";

      const mockQuery = {
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(error),
      };
      MockedAccountBalanceQuery.mockImplementation(() => mockQuery as any);

      await expect(hederaService.validateWallet("0.0.789012")).rejects.toThrow(
        expect.objectContaining({
          code: HederaErrorCodes.INSUFFICIENT_BALANCE,
          statusCode: 402,
        })
      );
    });

    it("should handle invalid token ID error", async () => {
      const error = new Error("INVALID_TOKEN_ID");
      error.status = "INVALID_TOKEN_ID";

      const mockQuery = {
        setTokenId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(error),
      };
      MockedTokenInfoQuery.mockImplementation(() => mockQuery as any);

      await expect(hederaService.getTokenInfo("invalid-token")).rejects.toThrow(
        expect.objectContaining({
          code: HederaErrorCodes.INVALID_TOKEN_ID,
          statusCode: 400,
        })
      );
    });

    it("should handle network busy error", async () => {
      const error = new Error("BUSY");
      error.status = "BUSY";

      const mockQuery = {
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(error),
      };
      MockedAccountBalanceQuery.mockImplementation(() => mockQuery as any);

      await expect(hederaService.validateWallet("0.0.789012")).rejects.toThrow(
        expect.objectContaining({
          code: HederaErrorCodes.RATE_LIMIT_EXCEEDED,
          statusCode: 503,
        })
      );
    });

    it("should handle timeout error", async () => {
      const error = new Error("Transaction timeout");
      error.status = "TIMEOUT";

      const mockQuery = {
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(error),
      };
      MockedAccountBalanceQuery.mockImplementation(() => mockQuery as any);

      await expect(hederaService.validateWallet("0.0.789012")).rejects.toThrow(
        expect.objectContaining({
          code: HederaErrorCodes.TRANSACTION_TIMEOUT,
          statusCode: 504,
        })
      );
    });
  });

  describe("close", () => {
    it("should close client connection", async () => {
      await hederaService.close();
      expect(mockClient.close).toHaveBeenCalled();
    });

    it("should handle close errors gracefully", async () => {
      mockClient.close.mockRejectedValue(new Error("Close error"));

      // Should not throw
      await expect(hederaService.close()).resolves.toBeUndefined();
    });
  });

  describe("createHederaService factory", () => {
    beforeEach(() => {
      // Mock environment variables
      process.env.HEDERA_OPERATOR_ID = "0.0.123456";
      process.env.HEDERA_OPERATOR_KEY =
        "302e020100300506032b657004220420abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      process.env.HEDERA_NETWORK = "testnet";
    });

    afterEach(() => {
      delete process.env.HEDERA_OPERATOR_ID;
      delete process.env.HEDERA_OPERATOR_KEY;
      delete process.env.HEDERA_NETWORK;
    });

    it("should create service with environment variables", () => {
      const service = createHederaService();
      expect(service).toBeInstanceOf(HederaService);
    });

    it("should create service with custom config", () => {
      const customConfig = {
        operatorId: "0.0.999999",
        network: "mainnet" as const,
      };

      const service = createHederaService(customConfig);
      expect(service).toBeInstanceOf(HederaService);
    });

    it("should use default values for missing environment variables", () => {
      delete process.env.HEDERA_OPERATOR_ID;
      delete process.env.HEDERA_OPERATOR_KEY;

      expect(() => createHederaService()).toThrow(HederaServiceError);
    });
  });
});
