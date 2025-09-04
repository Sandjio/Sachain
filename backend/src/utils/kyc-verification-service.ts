/**
 * KYC Verification Service for HBAR Recharge System
 * Handles KYC verification checks for large recharge amounts
 */

import { UserRepository } from "../repositories/user-repository";
import { KYCDocumentRepository } from "../repositories/kyc-document-repository";
import { AuditEnhancer, AuditContext } from "./audit-enhancer";
import { StructuredLogger } from "./structured-logger";

export interface KYCVerificationConfig {
  // Amount thresholds in XAF
  kycRequiredThreshold: number; // 500,000 XAF
  enhancedKycThreshold: number; // 2,000,000 XAF

  // Daily/monthly limits
  dailyLimitWithoutKyc: number; // 100,000 XAF
  monthlyLimitWithoutKyc: number; // 500,000 XAF

  // Document requirements
  requiredDocumentTypes: string[];
  enhancedDocumentTypes: string[];
}

export interface KYCVerificationResult {
  isVerified: boolean;
  verificationLevel: "none" | "basic" | "enhanced";
  requiredActions: string[];
  errorCode?: string;
  errorMessage?: string;
  details: {
    userKycStatus: string;
    approvedDocuments: string[];
    missingDocuments: string[];
    amountThreshold: number;
    currentAmount: number;
  };
}

export interface KYCVerificationContext {
  userId: string;
  xafAmount: number;
  userHederaAccountId: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export class KYCVerificationService {
  private readonly config: KYCVerificationConfig;

  constructor(
    private userRepo: UserRepository,
    private kycRepo: KYCDocumentRepository,
    private auditEnhancer: AuditEnhancer,
    private logger: StructuredLogger,
    config?: Partial<KYCVerificationConfig>
  ) {
    this.config = {
      kycRequiredThreshold: 500000, // 500,000 XAF
      enhancedKycThreshold: 2000000, // 2,000,000 XAF
      dailyLimitWithoutKyc: 100000, // 100,000 XAF
      monthlyLimitWithoutKyc: 500000, // 500,000 XAF
      requiredDocumentTypes: ["national_id", "proof_of_address"],
      enhancedDocumentTypes: [
        "national_id",
        "proof_of_address",
        "income_proof",
        "bank_statement",
      ],
      ...config,
    };
  }

  /**
   * Verify KYC requirements for a recharge request
   */
  async verifyKYCForRecharge(
    context: KYCVerificationContext
  ): Promise<KYCVerificationResult> {
    const { userId, xafAmount } = context;

    try {
      // Log KYC verification attempt
      await this.auditEnhancer.logUserAction(
        {
          userId,
          action: "kyc_verification_check",
          resource: "hbar_recharge",
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
        },
        "success",
        {
          xafAmount,
          kycRequiredThreshold: this.config.kycRequiredThreshold,
          enhancedKycThreshold: this.config.enhancedKycThreshold,
        }
      );

      // Get user profile and KYC status
      const userProfile = await this.userRepo.getUserProfile(userId);
      if (!userProfile) {
        return this.createFailureResult(
          "USER_NOT_FOUND",
          "User profile not found",
          context,
          "none",
          []
        );
      }

      // Check if amount requires KYC verification
      const verificationLevel =
        this.determineRequiredVerificationLevel(xafAmount);

      if (verificationLevel === "none") {
        return this.createSuccessResult(
          verificationLevel,
          userProfile.kycStatus,
          [],
          context
        );
      }

      // Get user's approved KYC documents
      const userKycDocuments = await this.kycRepo.getUserKYCDocuments(userId);
      const approvedDocuments = userKycDocuments.items
        .filter((doc) => doc.status === "approved")
        .map((doc) => doc.documentType);

      // Determine required documents based on verification level
      const requiredDocuments =
        verificationLevel === "enhanced"
          ? this.config.enhancedDocumentTypes
          : this.config.requiredDocumentTypes;

      // Check if user has all required documents
      const missingDocuments = requiredDocuments.filter(
        (docType) => !approvedDocuments.includes(docType)
      );

      // Verify KYC status
      const isKycApproved = userProfile.kycStatus === "approved";
      const hasRequiredDocuments = missingDocuments.length === 0;

      if (!isKycApproved || !hasRequiredDocuments) {
        const requiredActions = this.generateRequiredActions(
          userProfile.kycStatus,
          missingDocuments,
          verificationLevel
        );

        return this.createFailureResult(
          "KYC_VERIFICATION_REQUIRED",
          `KYC verification required for amounts above ${this.config.kycRequiredThreshold.toLocaleString()} XAF`,
          context,
          verificationLevel,
          requiredActions,
          {
            userKycStatus: userProfile.kycStatus,
            approvedDocuments,
            missingDocuments,
          }
        );
      }

      // All KYC requirements met
      return this.createSuccessResult(
        verificationLevel,
        userProfile.kycStatus,
        approvedDocuments,
        context
      );
    } catch (error) {
      this.logger.error(
        "KYC verification failed",
        {
          operation: "KYCVerificationService",
          userId,
          xafAmount,
        },
        error as Error
      );

      await this.auditEnhancer.logUserAction(
        {
          userId,
          action: "kyc_verification_check",
          resource: "hbar_recharge",
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
        "failure",
        { xafAmount, error: (error as Error).message }
      );

      return this.createFailureResult(
        "KYC_VERIFICATION_ERROR",
        "Failed to verify KYC status",
        context,
        "none",
        ["Contact support for assistance"]
      );
    }
  }

  /**
   * Check daily spending limits for users without KYC
   */
  async checkDailyLimitsWithoutKYC(
    userId: string,
    currentDailySpent: number,
    newAmount: number
  ): Promise<{
    allowed: boolean;
    errorCode?: string;
    errorMessage?: string;
    remainingLimit: number;
  }> {
    const userProfile = await this.userRepo.getUserProfile(userId);

    // If user has approved KYC, daily limits don't apply
    if (userProfile?.kycStatus === "approved") {
      return {
        allowed: true,
        remainingLimit: Number.MAX_SAFE_INTEGER,
      };
    }

    const totalAfterTransaction = currentDailySpent + newAmount;
    const remainingLimit = Math.max(
      0,
      this.config.dailyLimitWithoutKyc - currentDailySpent
    );

    if (totalAfterTransaction > this.config.dailyLimitWithoutKyc) {
      return {
        allowed: false,
        errorCode: "DAILY_LIMIT_EXCEEDED_NO_KYC",
        errorMessage: `Daily limit of ${this.config.dailyLimitWithoutKyc.toLocaleString()} XAF exceeded for users without KYC verification`,
        remainingLimit,
      };
    }

    return {
      allowed: true,
      remainingLimit,
    };
  }

  /**
   * Get KYC requirements for a specific amount
   */
  getKYCRequirements(xafAmount: number): {
    verificationLevel: "none" | "basic" | "enhanced";
    requiredDocuments: string[];
    description: string;
  } {
    const verificationLevel =
      this.determineRequiredVerificationLevel(xafAmount);

    let requiredDocuments: string[] = [];
    let description = "";

    switch (verificationLevel) {
      case "none":
        description = "No KYC verification required for this amount";
        break;
      case "basic":
        requiredDocuments = this.config.requiredDocumentTypes;
        description = `Basic KYC verification required for amounts above ${this.config.kycRequiredThreshold.toLocaleString()} XAF`;
        break;
      case "enhanced":
        requiredDocuments = this.config.enhancedDocumentTypes;
        description = `Enhanced KYC verification required for amounts above ${this.config.enhancedKycThreshold.toLocaleString()} XAF`;
        break;
    }

    return {
      verificationLevel,
      requiredDocuments,
      description,
    };
  }

  /**
   * Update KYC verification configuration
   */
  updateConfig(newConfig: Partial<KYCVerificationConfig>): void {
    Object.assign(this.config, newConfig);

    this.logger.info("KYC verification config updated", {
      operation: "KYCVerificationService",
      newConfig,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): KYCVerificationConfig {
    return { ...this.config };
  }

  private determineRequiredVerificationLevel(
    xafAmount: number
  ): "none" | "basic" | "enhanced" {
    if (xafAmount >= this.config.enhancedKycThreshold) {
      return "enhanced";
    } else if (xafAmount >= this.config.kycRequiredThreshold) {
      return "basic";
    } else {
      return "none";
    }
  }

  private generateRequiredActions(
    kycStatus: string,
    missingDocuments: string[],
    verificationLevel: "basic" | "enhanced"
  ): string[] {
    const actions: string[] = [];

    if (kycStatus !== "approved") {
      switch (kycStatus) {
        case "not_started":
          actions.push("Complete KYC verification process");
          break;
        case "pending":
          actions.push("Wait for KYC verification approval");
          break;
        case "rejected":
          actions.push("Resubmit KYC documents with corrections");
          break;
      }
    }

    if (missingDocuments.length > 0) {
      actions.push(`Upload required documents: ${missingDocuments.join(", ")}`);
    }

    if (verificationLevel === "enhanced") {
      actions.push("Enhanced verification required for large amounts");
    }

    return actions;
  }

  private createSuccessResult(
    verificationLevel: "none" | "basic" | "enhanced",
    userKycStatus: string,
    approvedDocuments: string[],
    context: KYCVerificationContext
  ): KYCVerificationResult {
    return {
      isVerified: true,
      verificationLevel,
      requiredActions: [],
      details: {
        userKycStatus,
        approvedDocuments,
        missingDocuments: [],
        amountThreshold:
          verificationLevel === "enhanced"
            ? this.config.enhancedKycThreshold
            : this.config.kycRequiredThreshold,
        currentAmount: context.xafAmount,
      },
    };
  }

  private createFailureResult(
    errorCode: string,
    errorMessage: string,
    context: KYCVerificationContext,
    verificationLevel: "none" | "basic" | "enhanced",
    requiredActions: string[],
    additionalDetails?: Partial<KYCVerificationResult["details"]>
  ): KYCVerificationResult {
    return {
      isVerified: false,
      verificationLevel,
      requiredActions,
      errorCode,
      errorMessage,
      details: {
        userKycStatus: "unknown",
        approvedDocuments: [],
        missingDocuments: [],
        amountThreshold:
          verificationLevel === "enhanced"
            ? this.config.enhancedKycThreshold
            : this.config.kycRequiredThreshold,
        currentAmount: context.xafAmount,
        ...additionalDetails,
      },
    };
  }
}
