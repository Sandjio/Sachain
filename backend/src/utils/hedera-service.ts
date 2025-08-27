/**
 * Hedera Token Service integration for project tokenization and NFT minting
 * Provides secure token creation, NFT minting, and wallet validation operations
 */

import {
  Client,
  PrivateKey,
  AccountId,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenInfoQuery,
  TokenNftInfoQuery,
  AccountBalanceQuery,
  Hbar,
  Status,
  TransactionResponse,
  TransactionReceipt,
  TokenInfo,
  TokenNftInfo,
  AccountBalance,
} from "@hashgraph/sdk";
import { ExponentialBackoff, RetryError } from "./retry";
import {
  ErrorClassifier,
  ErrorCategory,
  AWSServiceError,
} from "./error-handler";

export interface HederaConfig {
  operatorId: string;
  operatorKey: string;
  network: "testnet" | "mainnet" | "previewnet";
  maxTransactionFee?: number; // in Hbar
  maxQueryPayment?: number; // in Hbar
}

export interface ProjectMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface StockMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  project_id: string;
  stock_number: number;
}

export interface TokenCreationParams {
  projectId: string;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
  metadata: ProjectMetadata;
  treasuryAccountId?: string;
}

export interface TokenCreationResult {
  tokenId: string;
  transactionId: string;
  transactionHash: string;
  consensusTimestamp: string;
  totalCost: string; // in Hbar
}

export interface NFTMintingParams {
  tokenId: string;
  quantity: number;
  metadata: StockMetadata[];
}

export interface NFTMintingResult {
  serialNumbers: number[];
  transactionId: string;
  transactionHash: string;
  consensusTimestamp: string;
  totalCost: string; // in Hbar
}

export interface WalletValidationResult {
  isValid: boolean;
  balance: string; // in Hbar
  hasMinimumBalance: boolean;
  estimatedGasFee: string; // in Hbar
  canAffordOperation: boolean;
}

export interface GasFeeEstimate {
  tokenCreation: string; // in Hbar
  nftMinting: string; // in Hbar per NFT
  totalEstimate: string; // in Hbar
}

export class HederaServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = "HederaServiceError";
  }
}

export const HederaErrorCodes = {
  INVALID_CONFIGURATION: "INVALID_CONFIGURATION",
  NETWORK_CONNECTION_FAILED: "NETWORK_CONNECTION_FAILED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVALID_WALLET_ADDRESS: "INVALID_WALLET_ADDRESS",
  TOKEN_CREATION_FAILED: "TOKEN_CREATION_FAILED",
  NFT_MINTING_FAILED: "NFT_MINTING_FAILED",
  TRANSACTION_TIMEOUT: "TRANSACTION_TIMEOUT",
  INVALID_TOKEN_ID: "INVALID_TOKEN_ID",
  METADATA_VALIDATION_FAILED: "METADATA_VALIDATION_FAILED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

export class HederaService {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private config: HederaConfig;
  private retry: ExponentialBackoff;

  constructor(config: HederaConfig) {
    this.config = config;
    this.validateConfig(config);

    try {
      this.operatorId = AccountId.fromString(config.operatorId);
      this.operatorKey = PrivateKey.fromString(config.operatorKey);

      // Initialize client based on network
      switch (config.network) {
        case "testnet":
          this.client = Client.forTestnet();
          break;
        case "mainnet":
          this.client = Client.forMainnet();
          break;
        case "previewnet":
          this.client = Client.forPreviewnet();
          break;
        default:
          throw new Error(`Unsupported network: ${config.network}`);
      }

      // Set operator
      this.client.setOperator(this.operatorId, this.operatorKey);

      // Set transaction and query fees
      if (config.maxTransactionFee) {
        this.client.setDefaultMaxTransactionFee(
          new Hbar(config.maxTransactionFee)
        );
      }
      if (config.maxQueryPayment) {
        this.client.setDefaultMaxQueryPayment(new Hbar(config.maxQueryPayment));
      }
    } catch (error) {
      throw new HederaServiceError(
        "Failed to initialize Hedera client",
        HederaErrorCodes.INVALID_CONFIGURATION,
        500,
        { config: { ...config, operatorKey: "[REDACTED]" } },
        error as Error
      );
    }

    // Configure retry logic for Hedera operations
    this.retry = new ExponentialBackoff({
      maxRetries: 5,
      baseDelay: 1000, // Start with 1 second
      maxDelay: 30000, // Max 30 seconds
      jitterType: "full",
      retryableErrors: [
        "BUSY",
        "PLATFORM_TRANSACTION_NOT_CREATED",
        "PLATFORM_NOT_ACTIVE",
        "INSUFFICIENT_PAYER_BALANCE",
        "RECEIPT_NOT_FOUND",
        "RECORD_NOT_FOUND",
        "TIMEOUT",
        "NetworkingError",
        "ConnectionError",
      ],
    });
  }

  /**
   * Validate Hedera configuration
   */
  private validateConfig(config: HederaConfig): void {
    if (!config.operatorId || !config.operatorKey || !config.network) {
      throw new HederaServiceError(
        "Missing required Hedera configuration",
        HederaErrorCodes.INVALID_CONFIGURATION,
        400,
        { providedConfig: Object.keys(config) }
      );
    }

    // Validate operator ID format
    try {
      AccountId.fromString(config.operatorId);
    } catch (error) {
      throw new HederaServiceError(
        "Invalid operator account ID format",
        HederaErrorCodes.INVALID_CONFIGURATION,
        400,
        { operatorId: config.operatorId }
      );
    }

    // Validate operator key format
    try {
      PrivateKey.fromString(config.operatorKey);
    } catch (error) {
      throw new HederaServiceError(
        "Invalid operator private key format",
        HederaErrorCodes.INVALID_CONFIGURATION,
        400
      );
    }
  }

  /**
   * Validate wallet connection and check balance
   */
  async validateWallet(
    walletAccountId: string,
    estimatedGasFee?: number
  ): Promise<WalletValidationResult> {
    try {
      const result = await this.retry.execute(async () => {
        // Validate account ID format
        let accountId: AccountId;
        try {
          accountId = AccountId.fromString(walletAccountId);
        } catch (error) {
          throw new HederaServiceError(
            "Invalid wallet account ID format",
            HederaErrorCodes.INVALID_WALLET_ADDRESS,
            400,
            { walletAccountId }
          );
        }

        // Query account balance
        const balanceQuery = new AccountBalanceQuery().setAccountId(accountId);

        const balance = await balanceQuery.execute(this.client);
        const hbarBalance = balance.hbars.toBigNumber().toNumber();

        // Calculate minimum required balance (estimated gas fee + buffer)
        const minBalance = (estimatedGasFee || 5) + 1; // 1 Hbar buffer
        const hasMinimumBalance = hbarBalance >= minBalance;
        const canAffordOperation = estimatedGasFee
          ? hbarBalance >= estimatedGasFee
          : hasMinimumBalance;

        return {
          isValid: true,
          balance: hbarBalance.toString(),
          hasMinimumBalance,
          estimatedGasFee: (estimatedGasFee || 5).toString(),
          canAffordOperation,
        };
      }, "validateWallet");

      return result.result;
    } catch (error) {
      if (error instanceof RetryError) {
        throw new HederaServiceError(
          "Failed to validate wallet after multiple attempts",
          HederaErrorCodes.NETWORK_CONNECTION_FAILED,
          503,
          { walletAccountId, attempts: error.attempts },
          error.lastError
        );
      }

      throw this.handleHederaError(error, "validateWallet", {
        walletAccountId,
      });
    }
  }

  /**
   * Calculate gas fee estimates for operations
   */
  async calculateGasFees(params: {
    tokenCreation: boolean;
    nftQuantity?: number;
  }): Promise<GasFeeEstimate> {
    try {
      // Base estimates in Hbar (these are conservative estimates)
      const tokenCreationFee = 20; // ~20 Hbar for token creation
      const nftMintingFeePerToken = 0.1; // ~0.1 Hbar per NFT

      let totalEstimate = 0;

      if (params.tokenCreation) {
        totalEstimate += tokenCreationFee;
      }

      if (params.nftQuantity && params.nftQuantity > 0) {
        totalEstimate += nftMintingFeePerToken * params.nftQuantity;
      }

      return {
        tokenCreation: tokenCreationFee.toString(),
        nftMinting: nftMintingFeePerToken.toString(),
        totalEstimate: totalEstimate.toString(),
      };
    } catch (error) {
      throw new HederaServiceError(
        "Failed to calculate gas fees",
        HederaErrorCodes.INVALID_CONFIGURATION,
        500,
        params,
        error as Error
      );
    }
  }

  /**
   * Create a new token for the project
   */
  async createToken(params: TokenCreationParams): Promise<TokenCreationResult> {
    try {
      this.validateTokenCreationParams(params);

      const result = await this.retry.execute(async () => {
        // Create the token
        const tokenCreateTx = new TokenCreateTransaction()
          .setTokenName(params.tokenName)
          .setTokenSymbol(params.tokenSymbol)
          .setTokenType(TokenType.NonFungibleUnique)
          .setSupplyType(TokenSupplyType.Finite)
          .setMaxSupply(params.totalSupply)
          .setTreasuryAccountId(
            params.treasuryAccountId
              ? AccountId.fromString(params.treasuryAccountId)
              : this.operatorId
          )
          .setSupplyKey(this.operatorKey)
          .setAdminKey(this.operatorKey)
          .setMetadata(Buffer.from(JSON.stringify(params.metadata)))
          .freezeWith(this.client);

        // Sign and execute transaction
        const tokenCreateSign = await tokenCreateTx.sign(this.operatorKey);
        const tokenCreateSubmit = await tokenCreateSign.execute(this.client);

        // Get receipt
        const receipt = await tokenCreateSubmit.getReceipt(this.client);

        if (receipt.status !== Status.Success) {
          throw new Error(
            `Token creation failed with status: ${receipt.status.toString()}`
          );
        }

        const tokenId = receipt.tokenId;
        if (!tokenId) {
          throw new Error("Token ID not found in receipt");
        }

        // Get transaction record for additional details
        const record = await tokenCreateSubmit.getRecord(this.client);

        return {
          tokenId: tokenId.toString(),
          transactionId: tokenCreateSubmit.transactionId.toString(),
          transactionHash: record.transactionHash.toString(),
          consensusTimestamp: record.consensusTimestamp?.toString() || "",
          totalCost: record.transactionFee.toString(),
        };
      }, "createToken");

      console.log(`Token created successfully: ${result.result.tokenId}`, {
        projectId: params.projectId,
        tokenName: params.tokenName,
        tokenSymbol: params.tokenSymbol,
        totalSupply: params.totalSupply,
      });

      return result.result;
    } catch (error) {
      if (error instanceof RetryError) {
        throw new HederaServiceError(
          "Failed to create token after multiple attempts",
          HederaErrorCodes.TOKEN_CREATION_FAILED,
          503,
          { params, attempts: error.attempts },
          error.lastError
        );
      }

      throw this.handleHederaError(error, "createToken", params);
    }
  }

  /**
   * Mint NFTs for stocks
   */
  async mintNFTs(params: NFTMintingParams): Promise<NFTMintingResult> {
    try {
      this.validateNFTMintingParams(params);

      const result = await this.retry.execute(async () => {
        // Prepare metadata for minting
        const metadataBuffers = params.metadata.map((meta) =>
          Buffer.from(JSON.stringify(meta))
        );

        // Create mint transaction
        const mintTx = new TokenMintTransaction()
          .setTokenId(params.tokenId)
          .setMetadata(metadataBuffers)
          .freezeWith(this.client);

        // Sign and execute transaction
        const mintSign = await mintTx.sign(this.operatorKey);
        const mintSubmit = await mintSign.execute(this.client);

        // Get receipt
        const receipt = await mintSubmit.getReceipt(this.client);

        if (receipt.status !== Status.Success) {
          throw new Error(
            `NFT minting failed with status: ${receipt.status.toString()}`
          );
        }

        const serialNumbers = receipt.serials.map((serial) =>
          serial.toNumber()
        );

        if (serialNumbers.length !== params.quantity) {
          throw new Error(
            `Expected ${params.quantity} NFTs, but got ${serialNumbers.length}`
          );
        }

        // Get transaction record for additional details
        const record = await mintSubmit.getRecord(this.client);

        return {
          serialNumbers,
          transactionId: mintSubmit.transactionId.toString(),
          transactionHash: record.transactionHash.toString(),
          consensusTimestamp: record.consensusTimestamp?.toString() || "",
          totalCost: record.transactionFee.toString(),
        };
      }, "mintNFTs");

      console.log(
        `NFTs minted successfully: ${result.result.serialNumbers.length} tokens`,
        {
          tokenId: params.tokenId,
          quantity: params.quantity,
          serialNumbers: result.result.serialNumbers,
        }
      );

      return result.result;
    } catch (error) {
      if (error instanceof RetryError) {
        throw new HederaServiceError(
          "Failed to mint NFTs after multiple attempts",
          HederaErrorCodes.NFT_MINTING_FAILED,
          503,
          { params, attempts: error.attempts },
          error.lastError
        );
      }

      throw this.handleHederaError(error, "mintNFTs", params);
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenId: string): Promise<TokenInfo> {
    try {
      const result = await this.retry.execute(async () => {
        const tokenInfoQuery = new TokenInfoQuery().setTokenId(tokenId);

        return await tokenInfoQuery.execute(this.client);
      }, "getTokenInfo");

      return result.result;
    } catch (error) {
      if (error instanceof RetryError) {
        throw new HederaServiceError(
          "Failed to get token info after multiple attempts",
          HederaErrorCodes.NETWORK_CONNECTION_FAILED,
          503,
          { tokenId, attempts: error.attempts },
          error.lastError
        );
      }

      throw this.handleHederaError(error, "getTokenInfo", { tokenId });
    }
  }

  /**
   * Get NFT information
   */
  async getNFTInfo(
    tokenId: string,
    serialNumber: number
  ): Promise<TokenNftInfo> {
    try {
      const result = await this.retry.execute(async () => {
        const nftInfoQuery = new TokenNftInfoQuery()
          .setTokenId(tokenId)
          .setNftId(serialNumber.toString());

        const nftInfos = await nftInfoQuery.execute(this.client);

        // Return the first NFT info if it's an array, otherwise return as is
        return Array.isArray(nftInfos) ? nftInfos[0] : nftInfos;
      }, "getNFTInfo");

      return result.result;
    } catch (error) {
      if (error instanceof RetryError) {
        throw new HederaServiceError(
          "Failed to get NFT info after multiple attempts",
          HederaErrorCodes.NETWORK_CONNECTION_FAILED,
          503,
          { tokenId, serialNumber, attempts: error.attempts },
          error.lastError
        );
      }

      throw this.handleHederaError(error, "getNFTInfo", {
        tokenId,
        serialNumber,
      });
    }
  }

  /**
   * Validate token creation parameters
   */
  private validateTokenCreationParams(params: TokenCreationParams): void {
    if (!params.projectId || !params.tokenName || !params.tokenSymbol) {
      throw new HederaServiceError(
        "Missing required token creation parameters",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { providedParams: Object.keys(params) }
      );
    }

    if (params.totalSupply <= 0 || params.totalSupply > 1000000) {
      throw new HederaServiceError(
        "Invalid total supply: must be between 1 and 1,000,000",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { totalSupply: params.totalSupply }
      );
    }

    if (params.tokenName.length < 1 || params.tokenName.length > 100) {
      throw new HederaServiceError(
        "Invalid token name: must be between 1 and 100 characters",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { tokenName: params.tokenName }
      );
    }

    if (params.tokenSymbol.length < 1 || params.tokenSymbol.length > 100) {
      throw new HederaServiceError(
        "Invalid token symbol: must be between 1 and 100 characters",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { tokenSymbol: params.tokenSymbol }
      );
    }
  }

  /**
   * Validate NFT minting parameters
   */
  private validateNFTMintingParams(params: NFTMintingParams): void {
    if (!params.tokenId || !params.metadata || params.quantity <= 0) {
      throw new HederaServiceError(
        "Missing required NFT minting parameters",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { providedParams: Object.keys(params) }
      );
    }

    if (params.metadata.length !== params.quantity) {
      throw new HederaServiceError(
        "Metadata array length must match quantity",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { metadataLength: params.metadata.length, quantity: params.quantity }
      );
    }

    if (params.quantity > 100) {
      throw new HederaServiceError(
        "Cannot mint more than 100 NFTs in a single transaction",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { quantity: params.quantity }
      );
    }

    // Validate each metadata object
    params.metadata.forEach((meta, index) => {
      if (
        !meta.name ||
        !meta.project_id ||
        typeof meta.stock_number !== "number"
      ) {
        throw new HederaServiceError(
          `Invalid metadata at index ${index}: missing required fields`,
          HederaErrorCodes.METADATA_VALIDATION_FAILED,
          400,
          { index, metadata: meta }
        );
      }
    });
  }

  /**
   * Handle Hedera-specific errors
   */
  private handleHederaError(
    error: any,
    operation: string,
    context?: any
  ): HederaServiceError {
    const errorMessage = error.message || "Unknown Hedera error";
    const errorStatus = error.status?.toString() || "";

    // Map Hedera status codes to our error codes
    if (errorStatus.includes("INSUFFICIENT_PAYER_BALANCE")) {
      return new HederaServiceError(
        "Insufficient balance to complete transaction",
        HederaErrorCodes.INSUFFICIENT_BALANCE,
        402,
        { operation, context, hederaStatus: errorStatus },
        error
      );
    }

    if (errorStatus.includes("INVALID_TOKEN_ID")) {
      return new HederaServiceError(
        "Invalid token ID provided",
        HederaErrorCodes.INVALID_TOKEN_ID,
        400,
        { operation, context, hederaStatus: errorStatus },
        error
      );
    }

    if (
      errorStatus.includes("BUSY") ||
      errorStatus.includes("PLATFORM_NOT_ACTIVE")
    ) {
      return new HederaServiceError(
        "Hedera network is busy, please try again",
        HederaErrorCodes.RATE_LIMIT_EXCEEDED,
        503,
        { operation, context, hederaStatus: errorStatus },
        error
      );
    }

    if (errorStatus.includes("TIMEOUT") || errorMessage.includes("timeout")) {
      return new HederaServiceError(
        "Transaction timed out",
        HederaErrorCodes.TRANSACTION_TIMEOUT,
        504,
        { operation, context, hederaStatus: errorStatus },
        error
      );
    }

    // Default error handling
    return new HederaServiceError(
      `Hedera operation failed: ${errorMessage}`,
      HederaErrorCodes.NETWORK_CONNECTION_FAILED,
      500,
      { operation, context, hederaStatus: errorStatus },
      error
    );
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    try {
      await this.client.close();
    } catch (error) {
      console.warn("Error closing Hedera client:", error);
    }
  }
}

/**
 * Factory function to create HederaService instance
 */
export function createHederaService(
  config?: Partial<HederaConfig>
): HederaService {
  const defaultConfig: HederaConfig = {
    operatorId: process.env.HEDERA_OPERATOR_ID || "",
    operatorKey: process.env.HEDERA_OPERATOR_KEY || "",
    network:
      (process.env.HEDERA_NETWORK as "testnet" | "mainnet" | "previewnet") ||
      "testnet",
    maxTransactionFee: 100, // 100 Hbar max
    maxQueryPayment: 1, // 1 Hbar max
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new HederaService(finalConfig);
}
