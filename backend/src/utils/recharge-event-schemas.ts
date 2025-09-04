/**
 * Event schemas for HBAR Recharge System EventBridge integration
 */

// Base event interface
export interface BaseRechargeEvent {
  eventId: string;
  eventType: string;
  source: string;
  version: string;
  timestamp: string;
}

// Payment Success Event - triggered when Orange Money payment is confirmed
export interface PaymentSuccessEvent extends BaseRechargeEvent {
  eventType: "ORANGE_MONEY_PAYMENT_SUCCESS";
  source: "sachain.recharge";
  transactionId: string;
  userId: string;
  xafAmount: number;
  orangeMoneyTransactionId: string;
  userHederaAccountId: string;
  fees: {
    orangeMoneyFee: number;
    platformFee: number;
    totalFees: number;
  };
}

// Conversion Started Event - triggered when HBAR conversion begins
export interface ConversionStartedEvent extends BaseRechargeEvent {
  eventType: "HBAR_CONVERSION_STARTED";
  source: "sachain.recharge";
  transactionId: string;
  userId: string;
  xafAmount: number;
  estimatedHBARAmount: number;
  exchangeRate: number;
}

// Conversion Completed Event - triggered when HBAR transfer is successful
export interface ConversionCompletedEvent extends BaseRechargeEvent {
  eventType: "HBAR_CONVERSION_COMPLETED";
  source: "sachain.recharge";
  transactionId: string;
  userId: string;
  xafAmount: number;
  hbarAmount: number;
  exchangeRate: number;
  hederaTransactionId: string;
  actualCost: string;
  userHederaAccountId: string;
}

// Conversion Failed Event - triggered when HBAR conversion fails
export interface ConversionFailedEvent extends BaseRechargeEvent {
  eventType: "HBAR_CONVERSION_FAILED";
  source: "sachain.recharge";
  transactionId: string;
  userId: string;
  xafAmount: number;
  errorCode: string;
  errorMessage: string;
  retryCount: number;
  retryable: boolean;
}

// Recharge Completed Event - triggered when entire recharge process is complete
export interface RechargeCompletedEvent extends BaseRechargeEvent {
  eventType: "RECHARGE_COMPLETED";
  source: "sachain.recharge";
  transactionId: string;
  userId: string;
  xafAmount: number;
  hbarAmount: number;
  exchangeRate: number;
  totalFees: number;
  processingTimeMs: number;
  userHederaAccountId: string;
}

// Recharge Failed Event - triggered when recharge process fails
export interface RechargeFailedEvent extends BaseRechargeEvent {
  eventType: "RECHARGE_FAILED";
  source: "sachain.recharge";
  transactionId: string;
  userId: string;
  xafAmount: number;
  errorCode: string;
  errorMessage: string;
  failureStage: "payment" | "conversion" | "transfer";
  retryable: boolean;
}

// Union type for all recharge events
export type RechargeEvent =
  | PaymentSuccessEvent
  | ConversionStartedEvent
  | ConversionCompletedEvent
  | ConversionFailedEvent
  | RechargeCompletedEvent
  | RechargeFailedEvent;

// Event schema definitions
export interface EventSchema {
  version: string;
  requiredFields: string[];
  optionalFields: string[];
  description: string;
}

export const RECHARGE_EVENT_SCHEMAS: Record<string, EventSchema> = {
  ORANGE_MONEY_PAYMENT_SUCCESS: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "transactionId",
      "userId",
      "xafAmount",
      "orangeMoneyTransactionId",
      "userHederaAccountId",
      "fees",
    ],
    optionalFields: [],
    description:
      "Event triggered when Orange Money payment is successfully confirmed",
  },
  HBAR_CONVERSION_STARTED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "transactionId",
      "userId",
      "xafAmount",
      "estimatedHBARAmount",
      "exchangeRate",
    ],
    optionalFields: [],
    description: "Event triggered when HBAR conversion process begins",
  },
  HBAR_CONVERSION_COMPLETED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "transactionId",
      "userId",
      "xafAmount",
      "hbarAmount",
      "exchangeRate",
      "hederaTransactionId",
      "actualCost",
      "userHederaAccountId",
    ],
    optionalFields: [],
    description:
      "Event triggered when HBAR conversion is successfully completed",
  },
  HBAR_CONVERSION_FAILED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "transactionId",
      "userId",
      "xafAmount",
      "errorCode",
      "errorMessage",
      "retryCount",
      "retryable",
    ],
    optionalFields: [],
    description: "Event triggered when HBAR conversion fails",
  },
  RECHARGE_COMPLETED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "transactionId",
      "userId",
      "xafAmount",
      "hbarAmount",
      "exchangeRate",
      "totalFees",
      "processingTimeMs",
      "userHederaAccountId",
    ],
    optionalFields: [],
    description:
      "Event triggered when entire recharge process is completed successfully",
  },
  RECHARGE_FAILED: {
    version: "1.0",
    requiredFields: [
      "eventId",
      "eventType",
      "source",
      "version",
      "timestamp",
      "transactionId",
      "userId",
      "xafAmount",
      "errorCode",
      "errorMessage",
      "failureStage",
      "retryable",
    ],
    optionalFields: [],
    description: "Event triggered when recharge process fails at any stage",
  },
};

// Event detail type mapping for EventBridge
export const EVENT_DETAIL_TYPES: Record<string, string> = {
  ORANGE_MONEY_PAYMENT_SUCCESS: "Orange Money Payment Success",
  HBAR_CONVERSION_STARTED: "HBAR Conversion Started",
  HBAR_CONVERSION_COMPLETED: "HBAR Conversion Completed",
  HBAR_CONVERSION_FAILED: "HBAR Conversion Failed",
  RECHARGE_COMPLETED: "Recharge Completed",
  RECHARGE_FAILED: "Recharge Failed",
};

// Event routing patterns for EventBridge rules
export const EVENT_ROUTING_PATTERNS = {
  // Pattern to match all recharge events
  ALL_RECHARGE_EVENTS: {
    source: ["sachain.recharge"],
  },
  // Pattern to match payment success events for conversion processing
  PAYMENT_SUCCESS_FOR_CONVERSION: {
    source: ["sachain.recharge"],
    "detail-type": ["Orange Money Payment Success"],
  },
  // Pattern to match conversion events for notifications
  CONVERSION_EVENTS_FOR_NOTIFICATIONS: {
    source: ["sachain.recharge"],
    "detail-type": [
      "HBAR Conversion Completed",
      "HBAR Conversion Failed",
      "Recharge Completed",
      "Recharge Failed",
    ],
  },
  // Pattern to match failed events for admin alerts
  FAILED_EVENTS_FOR_ALERTS: {
    source: ["sachain.recharge"],
    "detail-type": ["HBAR Conversion Failed", "Recharge Failed"],
  },
};
