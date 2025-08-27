/**
 * IPFS metadata service for storing project and stock metadata
 * Provides secure metadata storage with retry logic and validation
 */

import { ExponentialBackoff } from "./retry";
import { StructuredLogger } from "./structured-logger";

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

export interface IPFSUploadResult {
  hash: string;
  uri: string;
  size: number;
}

export interface IPFSConfig {
  url: string;
  timeout: number;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export class IPFSServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "IPFSServiceError";
  }
}

export const IPFSErrorCodes = {
  INVALID_METADATA: "INVALID_METADATA",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  RETRIEVAL_FAILED: "RETRIEVAL_FAILED",
  PINNING_FAILED: "PINNING_FAILED",
  CONNECTION_ERROR: "CONNECTION_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;
export class IPFSService {
  private retry: ExponentialBackoff;
  private logger: StructuredLogger;
  private config: IPFSConfig;

  constructor(config?: Partial<IPFSConfig>) {
    this.config = {
      url: config?.url || process.env.IPFS_URL || "https://ipfs.infura.io:5001",
      timeout: config?.timeout || 30000,
      maxRetries: config?.maxRetries || 3,
      baseDelay: config?.baseDelay || 1000,
      maxDelay: config?.maxDelay || 10000,
    };

    this.retry = new ExponentialBackoff({
      maxRetries: this.config.maxRetries,
      baseDelay: this.config.baseDelay,
      maxDelay: this.config.maxDelay,
      jitterType: "full",
      retryableErrors: [
        "TimeoutError",
        "NetworkError",
        "ConnectionError",
        "ServiceUnavailable",
        "InternalServerError",
      ],
    });

    this.logger = StructuredLogger.getInstance("IPFSService");
  }

  /**
   * Store project metadata on IPFS
   */
  async storeProjectMetadata(
    metadata: ProjectMetadata
  ): Promise<IPFSUploadResult> {
    const operation = "storeProjectMetadata";
    this.logger.logOperationStart(operation, { projectName: metadata.name });

    try {
      // Validate metadata
      this.validateProjectMetadata(metadata);

      // Upload to IPFS with retry logic
      const result = await this.retry.execute(
        () => this.uploadMetadata(metadata),
        operation
      );

      this.logger.logOperationSuccess(operation, 0, {
        projectName: metadata.name,
        hash: result.result.hash,
        size: result.result.size,
      });

      return result.result;
    } catch (error) {
      this.logger.logOperationError(operation, error as Error, {
        projectName: metadata.name,
      });
      throw this.handleError(error as Error, operation);
    }
  }

  /**
   * Store stock NFT metadata on IPFS
   */
  async storeStockMetadata(metadata: StockMetadata): Promise<IPFSUploadResult> {
    const operation = "storeStockMetadata";
    this.logger.logOperationStart(operation, {
      projectId: metadata.project_id,
      stockNumber: metadata.stock_number,
    });

    try {
      // Validate metadata
      this.validateStockMetadata(metadata);

      // Upload to IPFS with retry logic
      const result = await this.retry.execute(
        () => this.uploadMetadata(metadata),
        operation
      );

      this.logger.logOperationSuccess(operation, 0, {
        projectId: metadata.project_id,
        stockNumber: metadata.stock_number,
        hash: result.result.hash,
        size: result.result.size,
      });

      return result.result;
    } catch (error) {
      this.logger.logOperationError(operation, error as Error, {
        projectId: metadata.project_id,
        stockNumber: metadata.stock_number,
      });
      throw this.handleError(error as Error, operation);
    }
  }

  /**
   * Retrieve metadata from IPFS
   */
  async getMetadata(uri: string): Promise<any> {
    const operation = "getMetadata";
    this.logger.logOperationStart(operation, { uri });

    try {
      // Extract hash from URI
      const hash = this.extractHashFromUri(uri);

      // Retrieve from IPFS with retry logic
      const result = await this.retry.execute(
        () => this.retrieveMetadata(hash),
        operation
      );

      this.logger.logOperationSuccess(operation, 0, {
        uri,
        hash,
        dataSize: JSON.stringify(result.result).length,
      });

      return result.result;
    } catch (error) {
      this.logger.logOperationError(operation, error as Error, { uri });
      throw this.handleError(error as Error, operation);
    }
  }
  /**
   * Pin content to ensure persistence
   */
  async pinContent(hash: string): Promise<void> {
    const operation = "pinContent";
    this.logger.logOperationStart(operation, { hash });

    try {
      await this.retry.execute(() => this.pinToIPFS(hash), operation);

      this.logger.logOperationSuccess(operation, 0, { hash });
    } catch (error) {
      this.logger.logOperationError(operation, error as Error, { hash });
      throw this.handleError(error as Error, operation);
    }
  }

  /**
   * Unpin content to free up storage
   */
  async unpinContent(hash: string): Promise<void> {
    const operation = "unpinContent";
    this.logger.logOperationStart(operation, { hash });

    try {
      await this.retry.execute(() => this.unpinFromIPFS(hash), operation);

      this.logger.logOperationSuccess(operation, 0, { hash });
    } catch (error) {
      this.logger.logOperationError(operation, error as Error, { hash });
      throw this.handleError(error as Error, operation);
    }
  }

  /**
   * Upload metadata to IPFS using HTTP API
   */
  private async uploadMetadata(metadata: any): Promise<IPFSUploadResult> {
    const content = JSON.stringify(metadata, null, 2);
    const formData = new FormData();
    const blob = new Blob([content], { type: "application/json" });
    formData.append("file", blob);

    const response = await fetch(
      `${this.config.url}/api/v0/add?pin=true&cid-version=1`,
      {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(this.config.timeout),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      hash: result.Hash,
      uri: `ipfs://${result.Hash}`,
      size: parseInt(result.Size, 10),
    };
  }

  /**
   * Retrieve metadata from IPFS using HTTP API
   */
  private async retrieveMetadata(hash: string): Promise<any> {
    const response = await fetch(`${this.config.url}/api/v0/cat?arg=${hash}`, {
      method: "POST",
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();
    return JSON.parse(content);
  }

  /**
   * Pin content to IPFS
   */
  private async pinToIPFS(hash: string): Promise<void> {
    const response = await fetch(
      `${this.config.url}/api/v0/pin/add?arg=${hash}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(this.config.timeout),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Unpin content from IPFS
   */
  private async unpinFromIPFS(hash: string): Promise<void> {
    const response = await fetch(
      `${this.config.url}/api/v0/pin/rm?arg=${hash}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(this.config.timeout),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } /**

   * Extract hash from IPFS URI
   */
  private extractHashFromUri(uri: string): string {
    if (uri.startsWith("ipfs://")) {
      return uri.substring(7);
    }

    if (uri.startsWith("/ipfs/")) {
      return uri.substring(6);
    }

    // Assume it's already a hash
    return uri;
  }

  /**
   * Validate project metadata schema
   */
  private validateProjectMetadata(metadata: ProjectMetadata): void {
    const errors: string[] = [];

    if (
      !metadata.name ||
      typeof metadata.name !== "string" ||
      metadata.name.trim().length === 0
    ) {
      errors.push("Project name is required and must be a non-empty string");
    }

    if (
      !metadata.description ||
      typeof metadata.description !== "string" ||
      metadata.description.trim().length === 0
    ) {
      errors.push(
        "Project description is required and must be a non-empty string"
      );
    }

    if (!metadata.image || typeof metadata.image !== "string") {
      errors.push("Project image URL is required and must be a string");
    }

    if (!metadata.external_url || typeof metadata.external_url !== "string") {
      errors.push("Project external URL is required and must be a string");
    }

    if (!Array.isArray(metadata.attributes)) {
      errors.push("Project attributes must be an array");
    } else {
      metadata.attributes.forEach((attr, index) => {
        if (!attr.trait_type || typeof attr.trait_type !== "string") {
          errors.push(
            `Attribute ${index}: trait_type is required and must be a string`
          );
        }
        if (attr.value === undefined || attr.value === null) {
          errors.push(`Attribute ${index}: value is required`);
        }
      });
    }

    if (errors.length > 0) {
      throw new IPFSServiceError(
        `Project metadata validation failed: ${errors.join(", ")}`,
        IPFSErrorCodes.VALIDATION_ERROR,
        400,
        { errors }
      );
    }
  }
  /*
   *
   * Validate stock metadata schema
   */
  private validateStockMetadata(metadata: StockMetadata): void {
    const errors: string[] = [];

    // Validate base metadata fields
    if (
      !metadata.name ||
      typeof metadata.name !== "string" ||
      metadata.name.trim().length === 0
    ) {
      errors.push("Stock name is required and must be a non-empty string");
    }

    if (
      !metadata.description ||
      typeof metadata.description !== "string" ||
      metadata.description.trim().length === 0
    ) {
      errors.push(
        "Stock description is required and must be a non-empty string"
      );
    }

    if (!metadata.image || typeof metadata.image !== "string") {
      errors.push("Stock image URL is required and must be a string");
    }

    if (!metadata.external_url || typeof metadata.external_url !== "string") {
      errors.push("Stock external URL is required and must be a string");
    }

    // Validate stock-specific fields
    if (!metadata.project_id || typeof metadata.project_id !== "string") {
      errors.push("Project ID is required and must be a string");
    }

    if (
      typeof metadata.stock_number !== "number" ||
      metadata.stock_number < 1
    ) {
      errors.push("Stock number is required and must be a positive integer");
    }

    if (!Array.isArray(metadata.attributes)) {
      errors.push("Stock attributes must be an array");
    } else {
      metadata.attributes.forEach((attr, index) => {
        if (!attr.trait_type || typeof attr.trait_type !== "string") {
          errors.push(
            `Attribute ${index}: trait_type is required and must be a string`
          );
        }
        if (attr.value === undefined || attr.value === null) {
          errors.push(`Attribute ${index}: value is required`);
        }
      });
    }

    if (errors.length > 0) {
      throw new IPFSServiceError(
        `Stock metadata validation failed: ${errors.join(", ")}`,
        IPFSErrorCodes.VALIDATION_ERROR,
        400,
        { errors }
      );
    }
  } /**

   * Handle and transform errors
   */
  private handleError(error: Error, operation: string): IPFSServiceError {
    if (error instanceof IPFSServiceError) {
      return error;
    }

    // Extract original error from RetryError if applicable
    let originalError = error;
    if (error.name === "RetryError" && (error as any).lastError) {
      originalError = (error as any).lastError;
    }

    // Handle timeout errors
    if (
      originalError.message.includes("timeout") ||
      originalError.name === "TimeoutError" ||
      originalError.message.includes("Request timeout")
    ) {
      return new IPFSServiceError(
        `IPFS operation timed out: ${operation}`,
        IPFSErrorCodes.TIMEOUT_ERROR,
        408,
        { originalError: originalError }
      );
    }

    // Handle connection errors
    if (
      originalError.message.includes("connection") ||
      originalError.message.includes("network") ||
      originalError.message.includes("Connection refused")
    ) {
      return new IPFSServiceError(
        `IPFS connection error: ${originalError.message}`,
        IPFSErrorCodes.CONNECTION_ERROR,
        503,
        { originalError: originalError }
      );
    }

    // Default error
    return new IPFSServiceError(
      `IPFS service error: ${originalError.message}`,
      IPFSErrorCodes.UPLOAD_FAILED,
      500,
      { originalError: originalError }
    );
  }
}

/**
 * Default IPFS service instance
 */
export const defaultIPFSService = new IPFSService();

/**
 * Create IPFS logger instance
 */
export const createIPFSLogger = (): StructuredLogger =>
  StructuredLogger.getInstance("IPFSService");
