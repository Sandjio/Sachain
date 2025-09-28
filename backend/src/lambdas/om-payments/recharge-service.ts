/**
 * Orange Money Recharge Service
 * Extends Orange Money payment functionality specifically for HBAR recharge use cases
 */

import {
  HBARRechargePaymentRequest,
  RechargePaymentValidationResult,
  RechargePaymentError,
  RechargePaymentLimits,
  RechargePaymentResult,
  OM_RECHARGE_ERROR_CODES,
  CreatePaymentResponse,
  TokenResponse,
  PayTokenResponse,
} from "./types";

// Default recharge limits (can be overridden via environment variables)
const DEFAULT_RECHARGE_LIMITS: RechargePaymentLimits = {
  minAmount: 1000, // 1,000 XAF minimum
  maxAmount: 1000000, // 1,000,000 XAF maximum
  dailyLimit: 5000000, // 5,000,000 XAF daily limit
};

// Orange Money API configuration
const OM_BASE_URL = process.env.OM_BASE_URL || "https://omdeveloper.orange.cm/";
const X_AUTH_TOKEN = process.env.OM_X_AUTH_TOKEN || "YWRtaW46YWRtaW4=";
const CLIENT_ID = process.env.OM_CLIENT_ID || "sachain_app";
const CLIENT_SECRET = process.env.OM_CLIENT_SECRET || "sachain_secret";
const SACHAIN_NUMBER = process.env.OM_SACHAIN_NUMBER || "657615723";

export class OrangeMoneyRechargeService {
  private limits: RechargePaymentLimits;

  constructor(limits?: Partial<RechargePaymentLimits>) {
    this.limits = {
      ...DEFAULT_RECHARGE_LIMITS,
      ...limits,
    };
  }

  /**
   * Validates a recharge payment request against business rules and limits
   */
  validateRechargePayment(
    request: HBARRechargePaymentRequest
  ): RechargePaymentValidationResult {
    const errors: RechargePaymentError[] = [];

    // Validate required fields
    if (!request.customerNumber) {
      errors.push({
        code: OM_RECHARGE_ERROR_CODES.INVALID_PHONE_NUMBER,
        message: "Customer phone number is required",
        field: "customerNumber",
      });
    }

    if (!request.pin) {
      errors.push({
        code: OM_RECHARGE_ERROR_CODES.INVALID_PIN,
        message: "Orange Money PIN is required",
        field: "pin",
      });
    }

    if (!request.transactionId) {
      errors.push({
        code: OM_RECHARGE_ERROR_CODES.INVALID_AMOUNT,
        message: "Transaction ID is required",
        field: "transactionId",
      });
    }

    if (!request.userId) {
      errors.push({
        code: OM_RECHARGE_ERROR_CODES.INVALID_AMOUNT,
        message: "User ID is required",
        field: "userId",
      });
    }

    if (!request.userHederaAccountId) {
      errors.push({
        code: OM_RECHARGE_ERROR_CODES.INVALID_AMOUNT,
        message: "Hedera account ID is required",
        field: "userHederaAccountId",
      });
    }

    // Validate amount
    if (!request.xafAmount || typeof request.xafAmount !== "number") {
      errors.push({
        code: OM_RECHARGE_ERROR_CODES.INVALID_AMOUNT,
        message: "Valid XAF amount is required",
        field: "xafAmount",
      });
    } else {
      // Check minimum amount
      if (request.xafAmount < this.limits.minAmount) {
        errors.push({
          code: OM_RECHARGE_ERROR_CODES.AMOUNT_TOO_LOW,
          message: `Amount must be at least ${this.limits.minAmount} XAF`,
          field: "xafAmount",
        });
      }

      // Check maximum amount
      if (request.xafAmount > this.limits.maxAmount) {
        errors.push({
          code: OM_RECHARGE_ERROR_CODES.AMOUNT_TOO_HIGH,
          message: `Amount cannot exceed ${this.limits.maxAmount} XAF`,
          field: "xafAmount",
        });
      }
    }

    // Validate phone number format (Cameroon mobile numbers)
    if (
      request.customerNumber &&
      !this.isValidCameroonPhoneNumber(request.customerNumber)
    ) {
      errors.push({
        code: OM_RECHARGE_ERROR_CODES.INVALID_PHONE_NUMBER,
        message: "Invalid Cameroon phone number format",
        field: "customerNumber",
      });
    }

    // Validate Hedera account ID format
    if (
      request.userHederaAccountId &&
      !this.isValidHederaAccountId(request.userHederaAccountId)
    ) {
      errors.push({
        code: OM_RECHARGE_ERROR_CODES.INVALID_AMOUNT,
        message: "Invalid Hedera account ID format",
        field: "userHederaAccountId",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Initiates an Orange Money payment specifically for HBAR recharge
   */
  async initiateRechargePayment(
    request: HBARRechargePaymentRequest
  ): Promise<RechargePaymentResult> {
    try {
      // Validate the request first
      const validation = this.validateRechargePayment(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: validation.errors[0].code,
            message: validation.errors[0].message,
            details: validation.errors,
          },
        };
      }

      // Get access token
      const accessToken = await this.getAccessToken();

      // Get pay token
      const payToken = await this.getPayToken(accessToken);

      // Create the payment with recharge-specific description
      const paymentData = await this.createRechargePayment(
        accessToken,
        payToken,
        request
      );

      return {
        success: true,
        transactionId: request.transactionId,
        orangeMoneyTransactionId:
          paymentData.txnid || paymentData.id.toString(),
        paymentData,
      };
    } catch (error) {
      console.error("Orange Money recharge payment failed:", {
        transactionId: request.transactionId,
        userId: request.userId,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      return {
        success: false,
        error: this.mapErrorToRechargeError(error as Error),
      };
    }
  }

  /**
   * Gets Orange Money access token
   */
  private async getAccessToken(timeoutMs = 5000): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${OM_BASE_URL}/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Failed to get access token: ${res.status} ${res.statusText} - ${errorText}`
        );
      }

      const data: TokenResponse = await res.json();

      if (!data.access_token) {
        throw new Error("Response did not include an access token");
      }

      return data.access_token;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Gets Orange Money pay token
   */
  private async getPayToken(
    accessToken: string,
    timeoutMs = 5000
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${OM_BASE_URL}/omapi/1.0.2/mp/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-TOKEN": X_AUTH_TOKEN,
          "WSO2-Authorization": `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Failed to get pay token: ${res.status} ${res.statusText} - ${errorText}`
        );
      }

      const { data } = (await res.json()) as PayTokenResponse;

      if (!data?.payToken) {
        throw new Error("Response did not include a pay token");
      }

      return data.payToken;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Creates Orange Money payment for recharge
   */
  private async createRechargePayment(
    accessToken: string,
    payToken: string,
    request: HBARRechargePaymentRequest,
    timeoutMs = 10000
  ): Promise<CreatePaymentResponse["data"]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const description = `HBAR Recharge - ${request.xafAmount} XAF to ${request.estimatedHBARAmount} HBAR`;
      const notifUrls = process.env.OM_NOTIFICATION_URL || "";

      const res = await fetch(`${OM_BASE_URL}/omapi/1.0.2/mp/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-TOKEN": X_AUTH_TOKEN,
          "WSO2-Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          customerNumber: request.customerNumber,
          sachainNumber: SACHAIN_NUMBER,
          amount: request.xafAmount.toString(),
          description,
          orderId: request.transactionId,
          pin: request.pin,
          payToken,
          notifUrls,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Failed to create recharge payment: ${res.status} ${res.statusText} - ${errorText}`
        );
      }

      const { data } = (await res.json()) as CreatePaymentResponse;

      if (!data) {
        throw new Error("Response did not include payment data");
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Validates Cameroon phone number format
   */
  private isValidCameroonPhoneNumber(phoneNumber: string): boolean {
    // Cameroon phone numbers: +237XXXXXXXXX or 237XXXXXXXXX or 6XXXXXXXX
    const patterns = [
      /^\+237[67]\d{8}$/, // +237 followed by 6 or 7 and 8 digits
      /^237[67]\d{8}$/, // 237 followed by 6 or 7 and 8 digits
      /^[67]\d{8}$/, // 6 or 7 followed by 8 digits
    ];

    return patterns.some((pattern) => pattern.test(phoneNumber));
  }

  /**
   * Validates Hedera account ID format
   */
  private isValidHederaAccountId(accountId: string): boolean {
    // Hedera account ID format: 0.0.XXXXXX
    const pattern = /^0\.0\.\d+$/;
    return pattern.test(accountId);
  }

  /**
   * Maps generic errors to recharge-specific error codes
   */
  private mapErrorToRechargeError(error: Error): {
    code: string;
    message: string;
    details?: any;
  } {
    const errorMessage = error.message.toLowerCase();

    // Network and timeout errors
    if (errorMessage.includes("timeout") || errorMessage.includes("aborted")) {
      return {
        code: OM_RECHARGE_ERROR_CODES.TIMEOUT_ERROR,
        message: "Orange Money service request timed out. Please try again.",
        details: { originalError: error.message },
      };
    }

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return {
        code: OM_RECHARGE_ERROR_CODES.NETWORK_ERROR,
        message:
          "Network error occurred while processing payment. Please check your connection.",
        details: { originalError: error.message },
      };
    }

    // Service availability errors
    if (errorMessage.includes("503") || errorMessage.includes("unavailable")) {
      return {
        code: OM_RECHARGE_ERROR_CODES.SERVICE_UNAVAILABLE,
        message:
          "Orange Money service is temporarily unavailable. Please try again later.",
        details: { originalError: error.message },
      };
    }

    // Authentication errors (invalid PIN, etc.)
    if (
      errorMessage.includes("401") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("pin")
    ) {
      return {
        code: OM_RECHARGE_ERROR_CODES.INVALID_PIN,
        message:
          "Invalid Orange Money PIN. Please check your PIN and try again.",
        details: { originalError: error.message },
      };
    }

    // Insufficient balance
    if (
      errorMessage.includes("insufficient") ||
      errorMessage.includes("balance")
    ) {
      return {
        code: OM_RECHARGE_ERROR_CODES.INSUFFICIENT_BALANCE,
        message: "Insufficient Orange Money balance for this transaction.",
        details: { originalError: error.message },
      };
    }

    // Default to unknown error
    return {
      code: OM_RECHARGE_ERROR_CODES.UNKNOWN_ERROR,
      message:
        "An unexpected error occurred while processing your payment. Please try again.",
      details: { originalError: error.message },
    };
  }

  /**
   * Gets current recharge limits
   */
  getRechargeLimit(): RechargePaymentLimits {
    return { ...this.limits };
  }

  /**
   * Updates recharge limits (useful for testing or dynamic configuration)
   */
  updateRechargeLimit(newLimits: Partial<RechargePaymentLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
  }
}

// Export a default instance
export const orangeMoneyRechargeService = new OrangeMoneyRechargeService();
