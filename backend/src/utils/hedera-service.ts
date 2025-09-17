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
  TransferTransaction,
  TokenAssociateTransaction,
  Hbar,
  Status,
  TokenInfo,
  TokenNftInfo,
} from "@hashgraph/sdk";
import { ExponentialBackoff, RetryError } from "./retry";
import { projectMetrics } from "./project-metrics";
import { HBARTransferParams, HBARTransferResult } from "../types/hbar-recharge";

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
  metadata?: ProjectMetadata;
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
  metadata: any[]; // Allow any metadata structure to support minimal metadata
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
  HBAR_TRANSFER_FAILED: "HBAR_TRANSFER_FAILED",
  INSUFFICIENT_TREASURY_BALANCE: "INSUFFICIENT_TREASURY_BALANCE",
  INVALID_HEDERA_ACCOUNT: "INVALID_HEDERA_ACCOUNT",
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

      // Parse private key using the dedicated method
      this.operatorKey = this.parsePrivateKey(config.operatorKey);

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
   * Parse private key from various formats (DER, hex, etc.)
   */
  private parsePrivateKey(keyString: string): PrivateKey {
    if (keyString.startsWith("0x")) {
      // Hex format with 0x prefix
      const hexKey = keyString.slice(2);
      return PrivateKey.fromStringECDSA(hexKey);
    } else if (keyString.startsWith("30")) {
      // DER format - try to parse directly first
      try {
        return PrivateKey.fromStringDer(keyString);
      } catch (derError) {
        // If DER parsing fails, extract the raw private key bytes
        // For your specific DER key: 3030020100300706052b8104000a04220420d0be273e8cc795c37696efeee5c06a3b7755f3229601b4b3d8681d44fca63152
        // The private key starts after the DER header, typically at position where "0420" appears
        const keyMatch = keyString.match(/0420([a-fA-F0-9]{64})/);
        if (keyMatch) {
          const rawKey = keyMatch[1];
          return PrivateKey.fromStringECDSA(rawKey);
        }

        // Fallback: try last 64 characters as raw key
        if (keyString.length >= 64) {
          const rawKey = keyString.slice(-64);
          return PrivateKey.fromStringECDSA(rawKey);
        }

        throw new Error(`Failed to parse DER private key: ${derError}`);
      }
    } else {
      // Assume raw hex format
      return PrivateKey.fromStringECDSA(keyString);
    }
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
      this.parsePrivateKey(config.operatorKey);
    } catch (error) {
      throw new HederaServiceError(
        "Invalid operator private key format. Expected DER format, hex format starting with 0x, or raw ECDSA hex",
        HederaErrorCodes.INVALID_CONFIGURATION,
        400,
        {
          keyFormat: config.operatorKey.substring(0, 20) + "...",
          error: (error as Error).message,
        }
      );
    }
  }

  /**
   * Transfer HBAR from one account to another
   */
  async transferHBAR(params: HBARTransferParams): Promise<HBARTransferResult> {
    const startTime = Date.now();

    try {
      this.validateHBARTransferParams(params);

      const result = await this.retry.execute(async () => {
        // Validate accounts
        const fromAccountId = AccountId.fromString(params.fromAccountId);
        const toAccountId = AccountId.fromString(params.toAccountId);

        // Check if sender has sufficient balance
        const senderBalance = await this.getAccountBalance(
          params.fromAccountId
        );
        const transferAmount = params.amount;

        // Convert to tinybars and round to avoid decimal issues
        // 1 HBAR = 100,000,000 tinybars
        const tinybars = Math.round(transferAmount * 100000000);
        const roundedAmount = tinybars / 100000000; // Convert back to HBAR

        const estimatedFee = 0.05; // Estimated transaction fee in HBAR

        if (senderBalance < roundedAmount + estimatedFee) {
          throw new HederaServiceError(
            `Insufficient balance. Required: ${
              roundedAmount + estimatedFee
            } HBAR, Available: ${senderBalance} HBAR`,
            HederaErrorCodes.INSUFFICIENT_TREASURY_BALANCE,
            402,
            {
              required: roundedAmount + estimatedFee,
              available: senderBalance,
              transferAmount: roundedAmount,
              estimatedFee,
            }
          );
        }

        // Create transfer transaction using Hbar.fromTinybars to ensure proper conversion
        const transferTx = new TransferTransaction()
          .addHbarTransfer(fromAccountId, Hbar.fromTinybars(-tinybars))
          .addHbarTransfer(toAccountId, Hbar.fromTinybars(tinybars));

        if (params.memo) {
          transferTx.setTransactionMemo(params.memo);
        }

        const frozenTx = transferTx.freezeWith(this.client);

        // Sign and execute transaction
        const signedTx = await frozenTx.sign(this.operatorKey);
        const txResponse = await signedTx.execute(this.client);

        // Get receipt
        const receipt = await txResponse.getReceipt(this.client);

        if (receipt.status !== Status.Success) {
          throw new Error(
            `HBAR transfer failed with status: ${receipt.status.toString()}`
          );
        }

        // Get transaction record for additional details
        const record = await txResponse.getRecord(this.client);

        return {
          transactionId: txResponse.transactionId.toString(),
          transactionHash: record.transactionHash.toString(),
          consensusTimestamp: record.consensusTimestamp?.toString() || "",
          actualCost: record.transactionFee.toString(),
          status: "success" as const,
        };
      }, "transferHBAR");

      const duration = Date.now() - startTime;

      // Record successful HBAR transfer metrics
      await projectMetrics.recordHederaNetworkHealth(
        true,
        duration,
        "transferHBAR"
      );

      console.log(`HBAR transfer completed successfully`, {
        from: params.fromAccountId,
        to: params.toAccountId,
        amount: params.amount,
        transactionId: result.result.transactionId,
      });

      return result.result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failed HBAR transfer metrics
      await projectMetrics.recordHederaNetworkHealth(
        false,
        duration,
        "transferHBAR"
      );

      if (error instanceof RetryError) {
        throw new HederaServiceError(
          "Failed to transfer HBAR after multiple attempts",
          HederaErrorCodes.HBAR_TRANSFER_FAILED,
          503,
          { params, attempts: error.attempts },
          error.lastError
        );
      }

      throw this.handleHederaError(error, "transferHBAR", params);
    }
  }

  /**
   * Validate Hedera account ID format and existence
   */
  async validateHederaAccount(accountId: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      const result = await this.retry.execute(async () => {
        // First validate format
        let parsedAccountId: AccountId;
        try {
          parsedAccountId = AccountId.fromString(accountId);
        } catch (error) {
          throw new HederaServiceError(
            "Invalid Hedera account ID format",
            HederaErrorCodes.INVALID_HEDERA_ACCOUNT,
            400,
            { accountId }
          );
        }

        // Check if account exists by querying balance
        const balanceQuery = new AccountBalanceQuery().setAccountId(
          parsedAccountId
        );
        await balanceQuery.execute(this.client);

        return true;
      }, "validateHederaAccount");

      const duration = Date.now() - startTime;
      await projectMetrics.recordHederaNetworkHealth(
        true,
        duration,
        "validateHederaAccount"
      );

      return result.result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await projectMetrics.recordHederaNetworkHealth(
        false,
        duration,
        "validateHederaAccount"
      );

      if (error instanceof HederaServiceError) {
        throw error;
      }

      if (error instanceof RetryError) {
        throw new HederaServiceError(
          "Failed to validate Hedera account after multiple attempts",
          HederaErrorCodes.NETWORK_CONNECTION_FAILED,
          503,
          { accountId, attempts: error.attempts },
          error.lastError
        );
      }

      // Account doesn't exist or network error
      throw new HederaServiceError(
        "Hedera account validation failed - account may not exist",
        HederaErrorCodes.INVALID_HEDERA_ACCOUNT,
        404,
        { accountId },
        error as Error
      );
    }
  }

  /**
   * Get account balance in HBAR
   */
  async getAccountBalance(accountId: string): Promise<number> {
    const startTime = Date.now();

    try {
      const result = await this.retry.execute(async () => {
        const parsedAccountId = AccountId.fromString(accountId);
        const balanceQuery = new AccountBalanceQuery().setAccountId(
          parsedAccountId
        );
        const balance = await balanceQuery.execute(this.client);

        return balance.hbars.toBigNumber().toNumber();
      }, "getAccountBalance");

      const duration = Date.now() - startTime;
      await projectMetrics.recordHederaNetworkHealth(
        true,
        duration,
        "getAccountBalance"
      );

      return result.result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await projectMetrics.recordHederaNetworkHealth(
        false,
        duration,
        "getAccountBalance"
      );

      if (error instanceof RetryError) {
        throw new HederaServiceError(
          "Failed to get account balance after multiple attempts",
          HederaErrorCodes.NETWORK_CONNECTION_FAILED,
          503,
          { accountId, attempts: error.attempts },
          error.lastError
        );
      }

      throw this.handleHederaError(error, "getAccountBalance", { accountId });
    }
  }

  /**
   * Monitor treasury account balance and alert if below threshold
   */
  async monitorTreasuryBalance(thresholdHBAR: number = 100): Promise<{
    balance: number;
    isAboveThreshold: boolean;
    threshold: number;
  }> {
    try {
      const balance = await this.getAccountBalance(this.operatorId.toString());
      const isAboveThreshold = balance >= thresholdHBAR;

      if (!isAboveThreshold) {
        console.warn(
          `Treasury balance warning: ${balance} HBAR (threshold: ${thresholdHBAR} HBAR)`,
          {
            treasuryAccount: this.operatorId.toString(),
            currentBalance: balance,
            threshold: thresholdHBAR,
          }
        );
      }

      return {
        balance,
        isAboveThreshold,
        threshold: thresholdHBAR,
      };
    } catch (error) {
      throw new HederaServiceError(
        "Failed to monitor treasury balance",
        HederaErrorCodes.NETWORK_CONNECTION_FAILED,
        503,
        {
          treasuryAccount: this.operatorId.toString(),
          threshold: thresholdHBAR,
        },
        error as Error
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
    const startTime = Date.now();

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
        const minBalance = (estimatedGasFee || 5) + 0.1; // 0.1 Hbar buffer (more reasonable)
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

      const duration = Date.now() - startTime;

      // Record Hedera network health metrics
      await projectMetrics.recordHederaNetworkHealth(
        true,
        duration,
        "validateWallet"
      );

      return result.result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record Hedera network health failure
      await projectMetrics.recordHederaNetworkHealth(
        false,
        duration,
        "validateWallet"
      );

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
      // Base estimates in Hbar (more realistic estimates)
      const tokenCreationFee = 5; // ~5 Hbar for token creation (more realistic)
      const nftMintingFeePerToken = 0.01; // ~0.01 Hbar per NFT (more realistic)

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
    const startTime = Date.now();

    try {
      this.validateTokenCreationParams(params);

      const result = await this.retry.execute(async () => {
        // Create the token
        let tokenCreateTx = new TokenCreateTransaction()
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
          .setAdminKey(this.operatorKey);

        // Only set metadata if provided and small enough
        if (params.metadata) {
          const metadataString = JSON.stringify(params.metadata);
          if (metadataString.length <= 100) {
            tokenCreateTx = tokenCreateTx.setMetadata(
              Buffer.from(metadataString)
            );
          }
        }

        tokenCreateTx = tokenCreateTx.freezeWith(this.client);

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

      const duration = Date.now() - startTime;

      // Record successful token creation metrics
      await projectMetrics.recordHederaTokenCreation(
        true,
        duration,
        parseFloat(result.result.totalCost)
      );

      await projectMetrics.recordHederaNetworkHealth(
        true,
        duration,
        "createToken"
      );

      console.log(`Token created successfully: ${result.result.tokenId}`, {
        projectId: params.projectId,
        tokenName: params.tokenName,
        tokenSymbol: params.tokenSymbol,
        totalSupply: params.totalSupply,
      });

      return result.result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failed token creation metrics
      const errorType =
        error instanceof HederaServiceError ? error.code : "UNKNOWN_ERROR";
      await projectMetrics.recordHederaTokenCreation(
        false,
        duration,
        undefined,
        errorType
      );
      await projectMetrics.recordHederaNetworkHealth(
        false,
        duration,
        "createToken"
      );

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

  async associateToken(
    accountId: string,
    privateKey: string,
    tokenId: string
  ): Promise<string> {
    const userAccountId = AccountId.fromString(accountId);
    const userKey = PrivateKey.fromStringDer(privateKey);

    const associateTx = new TokenAssociateTransaction()
      .setAccountId(userAccountId)
      .setTokenIds([tokenId])
      .freezeWith(this.client);

    const signTx = await associateTx.sign(userKey);
    const txResponse = await signTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    return receipt.status.toString(); // should be "SUCCESS" if associated
  }
  async transferToken(
    tokenId: string,
    serialNumber: number,
    senderId: string,
    senderKey: string,
    receiverId: string
  ): Promise<string> {
    const senderAccountId = AccountId.fromString(senderId);
    const receiverAccountId = AccountId.fromString(receiverId);
    const senderPrivateKey = PrivateKey.fromStringDer(senderKey);

    const transferTx = new TransferTransaction()
      .addNftTransfer(tokenId, serialNumber, senderAccountId, receiverAccountId)
      .freezeWith(this.client);

    const signTx = await transferTx.sign(senderPrivateKey);
    const txResponse = await signTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    return receipt.status.toString(); // SUCCESS if transferred
  }
  /**
   * Mint NFTs for stocks
   */
  async mintNFTs(params: NFTMintingParams): Promise<NFTMintingResult> {
    const startTime = Date.now();

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

      const duration = Date.now() - startTime;

      // Record successful NFT minting metrics
      await projectMetrics.recordHederaNFTMinting(
        true,
        duration,
        result.result.serialNumbers.length,
        parseFloat(result.result.totalCost)
      );

      await projectMetrics.recordHederaNetworkHealth(
        true,
        duration,
        "mintNFTs"
      );

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
      const duration = Date.now() - startTime;

      // Record failed NFT minting metrics
      const errorType =
        error instanceof HederaServiceError ? error.code : "UNKNOWN_ERROR";
      await projectMetrics.recordHederaNFTMinting(
        false,
        duration,
        0,
        undefined,
        errorType
      );
      await projectMetrics.recordHederaNetworkHealth(
        false,
        duration,
        "mintNFTs"
      );

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
    const startTime = Date.now();

    try {
      const result = await this.retry.execute(async () => {
        const tokenInfoQuery = new TokenInfoQuery().setTokenId(tokenId);

        return await tokenInfoQuery.execute(this.client);
      }, "getTokenInfo");

      const duration = Date.now() - startTime;
      await projectMetrics.recordHederaNetworkHealth(
        true,
        duration,
        "getTokenInfo"
      );

      return result.result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await projectMetrics.recordHederaNetworkHealth(
        false,
        duration,
        "getTokenInfo"
      );

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
        const nftInfoQuery = new TokenNftInfoQuery().setNftId(
          tokenId + "." + serialNumber
        );

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
   * Validate HBAR transfer parameters
   */
  private validateHBARTransferParams(params: HBARTransferParams): void {
    if (!params.fromAccountId || !params.toAccountId || params.amount <= 0) {
      throw new HederaServiceError(
        "Missing or invalid HBAR transfer parameters",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { providedParams: Object.keys(params) }
      );
    }

    // Validate account ID formats
    try {
      AccountId.fromString(params.fromAccountId);
    } catch (error) {
      throw new HederaServiceError(
        "Invalid fromAccountId format",
        HederaErrorCodes.INVALID_HEDERA_ACCOUNT,
        400,
        { fromAccountId: params.fromAccountId }
      );
    }

    try {
      AccountId.fromString(params.toAccountId);
    } catch (error) {
      throw new HederaServiceError(
        "Invalid toAccountId format",
        HederaErrorCodes.INVALID_HEDERA_ACCOUNT,
        400,
        { toAccountId: params.toAccountId }
      );
    }

    // Validate transfer amount
    if (params.amount <= 0) {
      throw new HederaServiceError(
        "Transfer amount must be greater than 0",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { amount: params.amount }
      );
    }

    if (params.amount > 1000000) {
      throw new HederaServiceError(
        "Transfer amount exceeds maximum limit of 1,000,000 HBAR",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { amount: params.amount }
      );
    }

    // Validate memo length if provided
    if (params.memo && params.memo.length > 100) {
      throw new HederaServiceError(
        "Transaction memo exceeds maximum length of 100 characters",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { memoLength: params.memo.length }
      );
    }

    // Prevent self-transfer
    if (params.fromAccountId === params.toAccountId) {
      throw new HederaServiceError(
        "Cannot transfer HBAR to the same account",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
        { fromAccountId: params.fromAccountId, toAccountId: params.toAccountId }
      );
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

    // Validate metadata size (Hedera limit is 100 bytes per NFT)
    params.metadata.forEach((meta, index) => {
      const metadataString = JSON.stringify(meta);
      const metadataSize = Buffer.byteLength(metadataString, "utf8");

      if (metadataSize > 100) {
        throw new HederaServiceError(
          `Metadata at index ${index} exceeds 100 byte limit: ${metadataSize} bytes`,
          HederaErrorCodes.METADATA_VALIDATION_FAILED,
          400,
          { index, metadataSize, metadata: meta }
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
    if (errorStatus.includes("INVALID_SIGNATURE")) {
      return new HederaServiceError(
        "Invalid signature - check private key configuration",
        HederaErrorCodes.INVALID_CONFIGURATION,
        400,
        { operation, context, hederaStatus: errorStatus },
        error
      );
    }

    if (errorStatus.includes("INSUFFICIENT_PAYER_BALANCE")) {
      return new HederaServiceError(
        "Insufficient balance to complete transaction",
        HederaErrorCodes.INSUFFICIENT_BALANCE,
        402,
        { operation, context, hederaStatus: errorStatus },
        error
      );
    }

    if (errorStatus.includes("INSUFFICIENT_ACCOUNT_BALANCE")) {
      return new HederaServiceError(
        "Insufficient account balance for HBAR transfer",
        HederaErrorCodes.INSUFFICIENT_TREASURY_BALANCE,
        402,
        { operation, context, hederaStatus: errorStatus },
        error
      );
    }

    if (errorStatus.includes("INVALID_ACCOUNT_ID")) {
      return new HederaServiceError(
        "Invalid Hedera account ID",
        HederaErrorCodes.INVALID_HEDERA_ACCOUNT,
        400,
        { operation, context, hederaStatus: errorStatus },
        error
      );
    }

    if (errorStatus.includes("METADATA_TOO_LONG")) {
      return new HederaServiceError(
        "Token metadata exceeds maximum size limit",
        HederaErrorCodes.METADATA_VALIDATION_FAILED,
        400,
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
  close(): void {
    try {
      this.client.close();
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

/**
 * Factory function to create HederaService instance with AWS Secrets Manager
 */
export async function createHederaServiceFromSecrets(): Promise<HederaService> {
  const secretName = process.env.HEDERA_CREDENTIALS_SECRET_NAME;

  if (!secretName) {
    throw new HederaServiceError(
      "HEDERA_CREDENTIALS_SECRET_NAME environment variable is required",
      HederaErrorCodes.INVALID_CONFIGURATION,
      500
    );
  }

  try {
    // Import AWS SDK v3 for Secrets Manager
    const { SecretsManagerClient, GetSecretValueCommand } = await import(
      "@aws-sdk/client-secrets-manager"
    );

    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || "us-east-1",
    });

    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error("Secret value is empty");
    }

    const credentials = JSON.parse(response.SecretString);

    const config: HederaConfig = {
      operatorId: credentials.operatorId,
      operatorKey: credentials.operatorKey,
      network: credentials.network || "testnet",
      maxTransactionFee: 100, // 100 Hbar max
      maxQueryPayment: 1, // 1 Hbar max
    };

    return new HederaService(config);
  } catch (error) {
    throw new HederaServiceError(
      `Failed to load Hedera credentials from AWS Secrets Manager: ${
        (error as Error).message
      }`,
      HederaErrorCodes.INVALID_CONFIGURATION,
      500,
      { secretName },
      error as Error
    );
  }
}
