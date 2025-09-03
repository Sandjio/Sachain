/**
 *  TypeScript interfaces for Orange Money Payments Lambda
 */

export interface TokenResponse {
  access_token: string;
  scope?: string;
  token_type: string;
  expires_in: number;
}

export interface PayTokenResponse {
  message: string;
  data: {
    payToken: string;
  };
}

export interface CreatePaymentResponse {
  message: string;
  data: {
    id: number;
    createtime: string;
    subscriberMsisdn: string;
    amount: number;
    payToken: string;
    txnid: string | null;
    txnmode: string;
    inittxnmessage: string;
    inittxnstatus: string;
    confirmtxnstatus: string | null;
    confirmtxnmessage: string | null;
    status: string;
    notifUrl: string;
    description: string;
    channelUserMsisdn: string;
  };
}

export interface PaymentRequest {
  customerNumber: string;
  amount: string;
  description?: string;
  orderId?: string;
  pin: string;
  notifUrls?: string;
}

// ============================================================================
// HBAR Recharge Specific Interfaces
// ============================================================================

export interface HBARRechargePaymentRequest extends PaymentRequest {
  transactionId: string;
  userId: string;
  userHederaAccountId: string;
  xafAmount: number;
  estimatedHBARAmount: number;
  fees: {
    orangeMoneyFee: number;
    platformFee: number;
    totalFees: number;
  };
}

export interface RechargePaymentValidationResult {
  isValid: boolean;
  errors: RechargePaymentError[];
  warnings?: string[];
}

export interface RechargePaymentError {
  code: string;
  message: string;
  field?: string;
}

export interface RechargePaymentLimits {
  minAmount: number; // Minimum XAF amount
  maxAmount: number; // Maximum XAF amount
  dailyLimit: number; // Daily limit per user in XAF
}

export interface RechargePaymentResult {
  success: boolean;
  transactionId?: string;
  orangeMoneyTransactionId?: string;
  paymentData?: CreatePaymentResponse["data"];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Orange Money specific error codes for recharge
export const OM_RECHARGE_ERROR_CODES = {
  INVALID_AMOUNT: "OM_INVALID_AMOUNT",
  AMOUNT_TOO_LOW: "OM_AMOUNT_TOO_LOW",
  AMOUNT_TOO_HIGH: "OM_AMOUNT_TOO_HIGH",
  INSUFFICIENT_BALANCE: "OM_INSUFFICIENT_BALANCE",
  INVALID_PIN: "OM_INVALID_PIN",
  INVALID_PHONE_NUMBER: "OM_INVALID_PHONE_NUMBER",
  DAILY_LIMIT_EXCEEDED: "OM_DAILY_LIMIT_EXCEEDED",
  SERVICE_UNAVAILABLE: "OM_SERVICE_UNAVAILABLE",
  NETWORK_ERROR: "OM_NETWORK_ERROR",
  TIMEOUT_ERROR: "OM_TIMEOUT_ERROR",
  UNKNOWN_ERROR: "OM_UNKNOWN_ERROR",
} as const;

export type OMRechargeErrorCode =
  (typeof OM_RECHARGE_ERROR_CODES)[keyof typeof OM_RECHARGE_ERROR_CODES];
