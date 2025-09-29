/**
 * Error classification system for HBAR recharge operations
 * Categorizes errors by type and determines retry strategies
 */

export enum ErrorCategory {
  VALIDATION = "VALIDATION",
  PAYMENT = "PAYMENT",
  CONVERSION = "CONVERSION",
  SYSTEM = "SYSTEM",
  NETWORK = "NETWORK",
}

export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface ClassifiedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  retryable: boolean;
  requiresManualIntervention: boolean;
  alertAdministrators: boolean;
  originalError?: Error;
  context?: Record<string, any>;
}

export class ErrorClassifier {
  private static readonly ERROR_PATTERNS: Record<
    string,
    Partial<ClassifiedError>
  > = {
    // Validation Errors
    INVALID_AMOUNT: {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      retryable: false,
      requiresManualIntervention: false,
      alertAdministrators: false,
    },
    INVALID_HEDERA_ACCOUNT: {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      retryable: false,
      requiresManualIntervention: false,
      alertAdministrators: false,
    },
    INSUFFICIENT_KYC: {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      requiresManualIntervention: true,
      alertAdministrators: false,
    },

    // Payment Errors
    ORANGE_MONEY_INSUFFICIENT_BALANCE: {
      category: ErrorCategory.PAYMENT,
      severity: ErrorSeverity.LOW,
      retryable: false,
      requiresManualIntervention: false,
      alertAdministrators: false,
    },
    ORANGE_MONEY_INVALID_PIN: {
      category: ErrorCategory.PAYMENT,
      severity: ErrorSeverity.LOW,
      retryable: false,
      requiresManualIntervention: false,
      alertAdministrators: false,
    },
    ORANGE_MONEY_SERVICE_UNAVAILABLE: {
      category: ErrorCategory.PAYMENT,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: true,
    },
    ORANGE_MONEY_TIMEOUT: {
      category: ErrorCategory.PAYMENT,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: false,
    },

    // Conversion Errors
    EXCHANGE_RATE_UNAVAILABLE: {
      category: ErrorCategory.CONVERSION,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: false,
    },
    EXCHANGE_RATE_STALE: {
      category: ErrorCategory.CONVERSION,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: true,
    },
    HEDERA_NETWORK_BUSY: {
      category: ErrorCategory.CONVERSION,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: false,
    },
    HEDERA_INSUFFICIENT_BALANCE: {
      category: ErrorCategory.CONVERSION,
      severity: ErrorSeverity.CRITICAL,
      retryable: false,
      requiresManualIntervention: true,
      alertAdministrators: true,
    },
    HEDERA_INVALID_ACCOUNT: {
      category: ErrorCategory.CONVERSION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      requiresManualIntervention: true,
      alertAdministrators: false,
    },

    // System Errors
    DATABASE_CONNECTION_ERROR: {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: true,
    },
    EVENTBRIDGE_PUBLISH_FAILED: {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: true,
    },
    LAMBDA_TIMEOUT: {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: false,
    },

    // Network Errors
    NETWORK_TIMEOUT: {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: false,
    },
    CONNECTION_REFUSED: {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: true,
    },
  };

  static classify(
    error: Error,
    context?: Record<string, any>
  ): ClassifiedError {
    const errorCode = this.extractErrorCode(error);
    const pattern = this.ERROR_PATTERNS[errorCode];

    if (pattern) {
      return {
        code: errorCode,
        message: error.message,
        originalError: error,
        context,
        ...pattern,
      } as ClassifiedError;
    }

    // Default classification for unknown errors
    return {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      code: "UNKNOWN_ERROR",
      message: error.message,
      retryable: true,
      requiresManualIntervention: false,
      alertAdministrators: true,
      originalError: error,
      context,
    };
  }

  private static extractErrorCode(error: Error): string {
    // Check if error has a code property
    if ("code" in error && typeof error.code === "string") {
      return error.code;
    }

    // Check if error message contains known patterns
    const message = error.message.toUpperCase();

    if (message.includes("INSUFFICIENT BALANCE")) {
      return message.includes("ORANGE")
        ? "ORANGE_MONEY_INSUFFICIENT_BALANCE"
        : "HEDERA_INSUFFICIENT_BALANCE";
    }

    if (message.includes("INVALID PIN")) {
      return "ORANGE_MONEY_INVALID_PIN";
    }

    if (message.includes("TIMEOUT")) {
      return message.includes("ORANGE")
        ? "ORANGE_MONEY_TIMEOUT"
        : "NETWORK_TIMEOUT";
    }

    if (
      message.includes("EXCHANGE RATE UNAVAILABLE") ||
      (message.includes("EXCHANGE RATE") &&
        message.includes("SERVICE UNAVAILABLE"))
    ) {
      return "EXCHANGE_RATE_UNAVAILABLE";
    }

    if (message.includes("EXCHANGE RATE") && message.includes("STALE")) {
      return "EXCHANGE_RATE_STALE";
    }

    if (message.includes("SERVICE UNAVAILABLE") && message.includes("ORANGE")) {
      return "ORANGE_MONEY_SERVICE_UNAVAILABLE";
    }

    if (message.includes("NETWORK BUSY")) {
      return "HEDERA_NETWORK_BUSY";
    }

    return "UNKNOWN_ERROR";
  }

  static shouldRetry(classifiedError: ClassifiedError): boolean {
    return (
      classifiedError.retryable && !classifiedError.requiresManualIntervention
    );
  }

  static shouldAlert(classifiedError: ClassifiedError): boolean {
    return (
      classifiedError.alertAdministrators ||
      classifiedError.severity === ErrorSeverity.CRITICAL
    );
  }
}
