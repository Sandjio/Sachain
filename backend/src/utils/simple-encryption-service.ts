/**
 * Simplified Data Encryption Service for HBAR Recharge System
 * Uses basic AES encryption without GCM for compatibility
 */

import * as crypto from "crypto";
import { StructuredLogger } from "./structured-logger";

export interface EncryptedData {
  encryptedValue: string;
  algorithm: string;
  iv: string;
  salt: string;
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
  customerNumber?: string;
  pin?: string;
  orangeMoneyTransactionId?: string;
  userHederaAccountId?: string;
  hederaTransactionId?: string;
  xafAmount?: number;
  hbarAmount?: number;
  exchangeRate?: number;
  fees?: any;
  userEmail?: string;
  userPhone?: string;
  ipAddress?: string;
  apiKeys?: Record<string, string>;
  sessionTokens?: Record<string, string>;
}

export class SimpleEncryptionService {
  private readonly algorithm = "aes-256-cbc";
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;
  private readonly saltLength = 32;

  constructor(private logger: StructuredLogger) {}

  /**
   * Encrypt sensitive recharge data
   */
  async encryptRechargeData(
    data: SensitiveRechargeData,
    context: EncryptionContext
  ): Promise<Record<string, EncryptedData>> {
    const encryptedFields: Record<string, EncryptedData> = {};

    try {
      for (const [fieldName, fieldValue] of Object.entries(data)) {
        if (fieldValue !== undefined && fieldValue !== null) {
          if (this.isSensitiveField(fieldName)) {
            encryptedFields[fieldName] = await this.encryptField(
              fieldValue,
              context
            );
          }
        }
      }

      this.logger.info("Recharge data encrypted", {
        operation: "SimpleEncryptionService",
        userId: context.userId,
        transactionId: context.transactionId,
        fieldsEncrypted: Object.keys(encryptedFields),
      });

      return encryptedFields;
    } catch (error) {
      this.logger.error(
        "Failed to encrypt recharge data",
        {
          operation: "SimpleEncryptionService",
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
        const decryptedValue = await this.decryptField(encryptedField, context);
        (decryptedData as any)[fieldName] = decryptedValue;
      }

      this.logger.info("Recharge data decrypted", {
        operation: "SimpleEncryptionService",
        userId: context.userId,
        transactionId: context.transactionId,
        fieldsDecrypted: Object.keys(decryptedData),
      });

      return decryptedData;
    } catch (error) {
      this.logger.error(
        "Failed to decrypt recharge data",
        {
          operation: "SimpleEncryptionService",
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
      const plaintext =
        typeof value === "string" ? value : JSON.stringify(value);
      const plaintextBuffer = Buffer.from(plaintext, "utf8");

      // Generate IV and salt
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);

      // Create a simple key from context (in production, use proper key derivation)
      const keyMaterial = `${context.userId}:${context.dataType}:${context.purpose}`;
      const key = crypto.pbkdf2Sync(
        keyMaterial,
        salt,
        10000,
        this.keyLength,
        "sha256"
      );

      // Encrypt the data
      const cipher = crypto.createCipher(this.algorithm, key);
      let encrypted = cipher.update(plaintextBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const encryptedData: EncryptedData = {
        encryptedValue: encrypted.toString("base64"),
        algorithm: this.algorithm,
        iv: iv.toString("base64"),
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
          operation: "SimpleEncryptionService",
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

      // Parse encrypted components
      const encrypted = Buffer.from(encryptedData.encryptedValue, "base64");
      const iv = Buffer.from(encryptedData.iv, "base64");
      const salt = Buffer.from(encryptedData.salt, "base64");

      // Recreate the key
      const keyMaterial = `${context.userId}:${context.dataType}:${context.purpose}`;
      const key = crypto.pbkdf2Sync(
        keyMaterial,
        salt,
        10000,
        this.keyLength,
        "sha256"
      );

      // Decrypt the data
      const decipher = crypto.createDecipher(encryptedData.algorithm, key);
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
          operation: "SimpleEncryptionService",
          dataType: context.dataType,
          userId: context.userId,
        },
        error as Error
      );

      throw error;
    }
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
            operation: "SimpleEncryptionService",
            field: originalKey,
            userId: context.userId,
          });
        }
      }
    }

    return result;
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
    ];

    return sensitiveFields.some((sensitive) =>
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  /**
   * Clean up cached keys and sensitive data
   */
  cleanup(): void {
    this.logger.info("Simple encryption service cleanup completed", {
      operation: "SimpleEncryptionService",
    });
  }
}
