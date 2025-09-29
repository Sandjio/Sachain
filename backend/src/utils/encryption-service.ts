/**
 * Data Encryption Service for HBAR Recharge System
 * Handles encryption/decryption of sensitive transaction information
 */

import { KMS } from "aws-sdk";
import * as crypto from "crypto";
import { StructuredLogger } from "./structured-logger";

export interface EncryptionConfig {
  kmsKeyId: string;
  algorithm: string;
  keyDerivationIterations: number;
  saltLength: number;
  ivLength: number;
  tagLength: number;
}

export interface EncryptedData {
  encryptedValue: string;
  keyId: string;
  algorithm: string;
  iv: string;
  tag?: string;
  salt?: string;
  metadata?: Record<string, string>;
}

export interface EncryptionContext {
  userId: string;
  transactionId?: string;
  dataType: string;
  purpose: string;
  timestamp: string;
}

export interface SensitiveRechargeData {
  // Orange Money sensitive data
  customerNumber?: string;
  pin?: string;
  orangeMoneyTransactionId?: string;

  // Hedera sensitive data
  userHederaAccountId?: string;
  hederaTransactionId?: string;
  privateKeyData?: string;

  // Financial data
  xafAmount?: number;
  hbarAmount?: number;
  exchangeRate?: number;
  fees?: {
    platformFee: number;
    orangeMoneyFee: number;
    totalFees: number;
  };

  // Personal data
  userEmail?: string;
  userPhone?: string;
  ipAddress?: string;

  // System data
  apiKeys?: Record<string, string>;
  sessionTokens?: Record<string, string>;
}

export class EncryptionService {
  private readonly kms: KMS;
  private readonly config: EncryptionConfig;
  private readonly dataKeyCache: Map<
    string,
    { key: Buffer; expiresAt: number }
  >;

  constructor(
    private logger: StructuredLogger,
    config?: Partial<EncryptionConfig>
  ) {
    this.kms = new KMS({
      region: process.env.AWS_REGION || "us-east-1",
    });

    this.config = {
      kmsKeyId: process.env.KMS_KEY_ID || "alias/sachain-encryption-key",
      algorithm: "aes-256-gcm",
      keyDerivationIterations: 100000,
      saltLength: 32,
      ivLength: 16,
      tagLength: 16,
      ...config,
    };

    this.dataKeyCache = new Map();
  }

  /**
   * Encrypt sensitive recharge data
   */
  async encryptRechargeData(
    data: SensitiveRechargeData,
    context: EncryptionContext
  ): Promise<Record<string, EncryptedData>> {
    const encryptedFields: Record<string, EncryptedData> = {};

    try {
      // Encrypt each sensitive field individually
      for (const [fieldName, fieldValue] of Object.entries(data)) {
        if (fieldValue !== undefined && fieldValue !== null) {
          const fieldContext = {
            ...context,
            dataType: `${context.dataType}.${fieldName}`,
          };

          if (this.isSensitiveField(fieldName)) {
            encryptedFields[fieldName] = await this.encryptField(
              fieldValue,
              fieldContext
            );
          }
        }
      }

      this.logger.info("Recharge data encrypted", {
        operation: "EncryptionService",
        userId: context.userId,
        transactionId: context.transactionId,
        fieldsEncrypted: Object.keys(encryptedFields),
      });

      return encryptedFields;
    } catch (error) {
      this.logger.error(
        "Failed to encrypt recharge data",
        {
          operation: "EncryptionService",
          userId: context.userId,
          transactionId: context.transactionId,
        },
        error as Error
      );

      throw new Error("Encryption failed");
    }
  }

  /**
   * Decrypt sensitive recharge data
   */
  async decryptRechargeData(
    encryptedFields: Record<string, EncryptedData>,
    context: EncryptionContext
  ): Promise<Partial<SensitiveRechargeData>> {
    const decryptedData: Partial<SensitiveRechargeData> = {};

    try {
      for (const [fieldName, encryptedField] of Object.entries(
        encryptedFields
      )) {
        const fieldContext = {
          ...context,
          dataType: `${context.dataType}.${fieldName}`,
        };

        const decryptedValue = await this.decryptField(
          encryptedField,
          fieldContext
        );
        (decryptedData as any)[fieldName] = decryptedValue;
      }

      this.logger.info("Recharge data decrypted", {
        operation: "EncryptionService",
        userId: context.userId,
        transactionId: context.transactionId,
        fieldsDecrypted: Object.keys(decryptedData),
      });

      return decryptedData;
    } catch (error) {
      this.logger.error(
        "Failed to decrypt recharge data",
        {
          operation: "EncryptionService",
          userId: context.userId,
          transactionId: context.transactionId,
        },
        error as Error
      );

      throw new Error("Decryption failed");
    }
  }

  /**
   * Encrypt a single field value
   */
  async encryptField(
    value: any,
    context: EncryptionContext
  ): Promise<EncryptedData> {
    try {
      // Convert value to string for encryption
      const plaintext =
        typeof value === "string" ? value : JSON.stringify(value);
      const plaintextBuffer = Buffer.from(plaintext, "utf8");

      // Get or generate data key
      const dataKey = await this.getDataKey(context);

      // Generate IV and salt
      const iv = crypto.randomBytes(this.config.ivLength);
      const salt = crypto.randomBytes(this.config.saltLength);

      // Derive encryption key from data key
      const derivedKey = crypto.pbkdf2Sync(
        dataKey,
        salt,
        this.config.keyDerivationIterations,
        32, // 256 bits
        "sha256"
      );

      // Encrypt the data
      const cipher = crypto.createCipherGCM(
        this.config.algorithm,
        derivedKey,
        iv
      );
      cipher.setAAD(
        Buffer.from(
          JSON.stringify({
            userId: context.userId,
            dataType: context.dataType,
            purpose: context.purpose,
          })
        )
      );

      let encrypted = cipher.update(plaintextBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const tag = cipher.getAuthTag();

      const encryptedData: EncryptedData = {
        encryptedValue: encrypted.toString("base64"),
        keyId: this.config.kmsKeyId,
        algorithm: this.config.algorithm,
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        salt: salt.toString("base64"),
        metadata: {
          userId: context.userId,
          dataType: context.dataType,
          purpose: context.purpose,
          timestamp: context.timestamp,
        },
      };

      return encryptedData;
    } catch (error) {
      this.logger.error(
        "Field encryption failed",
        {
          operation: "EncryptionService",
          dataType: context.dataType,
          userId: context.userId,
        },
        error as Error
      );

      throw error;
    }
  }

  /**
   * Decrypt a single field value
   */
  async decryptField(
    encryptedData: EncryptedData,
    context: EncryptionContext
  ): Promise<any> {
    try {
      // Validate encryption metadata
      if (encryptedData.metadata?.userId !== context.userId) {
        throw new Error("User ID mismatch in encrypted data");
      }

      // Get data key
      const dataKey = await this.getDataKey(context);

      // Parse encrypted components
      const encrypted = Buffer.from(encryptedData.encryptedValue, "base64");
      const iv = Buffer.from(encryptedData.iv, "base64");
      const tag = encryptedData.tag
        ? Buffer.from(encryptedData.tag, "base64")
        : undefined;
      const salt = encryptedData.salt
        ? Buffer.from(encryptedData.salt, "base64")
        : Buffer.alloc(0);

      // Derive decryption key
      const derivedKey = crypto.pbkdf2Sync(
        dataKey,
        salt,
        this.config.keyDerivationIterations,
        32,
        "sha256"
      );

      // Decrypt the data
      const decipher = crypto.createDecipherGCM(
        encryptedData.algorithm,
        derivedKey,
        iv
      );

      if (tag) {
        decipher.setAuthTag(tag);
        decipher.setAAD(
          Buffer.from(
            JSON.stringify({
              userId: context.userId,
              dataType: context.dataType,
              purpose: context.purpose,
            })
          )
        );
      }

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const plaintext = decrypted.toString("utf8");

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(plaintext);
      } catch {
        return plaintext;
      }
    } catch (error) {
      this.logger.error(
        "Field decryption failed",
        {
          operation: "EncryptionService",
          dataType: context.dataType,
          userId: context.userId,
        },
        error as Error
      );

      throw error;
    }
  }

  /**
   * Encrypt data for storage in DynamoDB
   */
  async encryptForStorage(
    data: Record<string, any>,
    context: EncryptionContext
  ): Promise<Record<string, any>> {
    const result = { ...data };

    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key) && value !== undefined && value !== null) {
        const fieldContext = {
          ...context,
          dataType: `${context.dataType}.${key}`,
        };

        result[`${key}_encrypted`] = await this.encryptField(
          value,
          fieldContext
        );
        delete result[key]; // Remove plaintext version
      }
    }

    return result;
  }

  /**
   * Decrypt data retrieved from DynamoDB
   */
  async decryptFromStorage(
    data: Record<string, any>,
    context: EncryptionContext
  ): Promise<Record<string, any>> {
    const result = { ...data };

    for (const [key, value] of Object.entries(data)) {
      if (key.endsWith("_encrypted") && value) {
        const originalKey = key.replace("_encrypted", "");
        const fieldContext = {
          ...context,
          dataType: `${context.dataType}.${originalKey}`,
        };

        try {
          result[originalKey] = await this.decryptField(value, fieldContext);
          delete result[key]; // Remove encrypted version
        } catch (error) {
          this.logger.warn("Failed to decrypt field, keeping encrypted", {
            operation: "EncryptionService",
            field: originalKey,
            userId: context.userId,
          });
        }
      }
    }

    return result;
  }

  /**
   * Generate hash for data integrity verification
   */
  generateDataHash(data: any): string {
    const dataString = typeof data === "string" ? data : JSON.stringify(data);
    return crypto.createHash("sha256").update(dataString).digest("hex");
  }

  /**
   * Verify data integrity using hash
   */
  verifyDataHash(data: any, expectedHash: string): boolean {
    const actualHash = this.generateDataHash(data);
    return actualHash === expectedHash;
  }

  /**
   * Securely wipe sensitive data from memory
   */
  wipeSensitiveData(data: any): void {
    if (Buffer.isBuffer(data)) {
      data.fill(0);
    } else if (typeof data === "object" && data !== null) {
      for (const key in data) {
        if (this.isSensitiveField(key)) {
          if (typeof data[key] === "string") {
            // Overwrite string with zeros (best effort)
            data[key] = "\0".repeat(data[key].length);
          }
          delete data[key];
        }
      }
    }
  }

  private async getDataKey(context: EncryptionContext): Promise<Buffer> {
    const cacheKey = `${context.userId}:${context.dataType}`;
    const cached = this.dataKeyCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.key;
    }

    try {
      const result = await this.kms
        .generateDataKey({
          KeyId: this.config.kmsKeyId,
          KeySpec: "AES_256",
          EncryptionContext: {
            userId: context.userId,
            dataType: context.dataType,
            purpose: context.purpose,
          },
        })
        .promise();

      if (!result.Plaintext) {
        throw new Error("Failed to generate data key");
      }

      const dataKey = Buffer.from(result.Plaintext as Uint8Array);

      // Cache for 1 hour
      this.dataKeyCache.set(cacheKey, {
        key: dataKey,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });

      return dataKey;
    } catch (error) {
      this.logger.error(
        "Failed to get data key from KMS",
        {
          operation: "EncryptionService",
          keyId: this.config.kmsKeyId,
          userId: context.userId,
        },
        error as Error
      );

      throw error;
    }
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      "pin",
      "customerNumber",
      "privateKeyData",
      "apiKeys",
      "sessionTokens",
      "userEmail",
      "userPhone",
      "ipAddress",
      // Add more sensitive fields as needed
    ];

    return sensitiveFields.some((sensitive) =>
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  /**
   * Clean up cached keys and sensitive data
   */
  cleanup(): void {
    // Clear data key cache
    for (const [key, cached] of this.dataKeyCache.entries()) {
      cached.key.fill(0); // Wipe key from memory
      this.dataKeyCache.delete(key);
    }

    this.logger.info("Encryption service cleanup completed", {
      operation: "EncryptionService",
    });
  }
}
