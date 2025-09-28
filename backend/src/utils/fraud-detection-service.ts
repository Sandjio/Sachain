/**
 * Fraud Detection and Rate Limiting Service for HBAR Recharge System
 * Detects suspicious transaction patterns and implements rate limiting
 */

import { BaseRepository } from "../repositories/base-repository";
import { AuditEnhancer, AuditContext } from "./audit-enhancer";
import { StructuredLogger } from "./structured-logger";

export interface FraudDetectionConfig {
  // Rate limiting
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  maxAmountPerHour: number; // XAF
  maxAmountPerDay: number; // XAF

  // Suspicious pattern detection
  suspiciousAmountThreshold: number; // XAF
  maxConsecutiveFailures: number;
  rapidTransactionWindowMinutes: number;
  maxTransactionsInWindow: number;

  // IP-based detection
  maxRequestsPerIPPerHour: number;
  maxUsersPerIPPerHour: number;

  // Behavioral analysis
  unusualHourStart: number; // 0-23 (e.g., 2 AM)
  unusualHourEnd: number; // 0-23 (e.g., 5 AM)
  maxAmountDeviationPercent: number; // % deviation from user's average
}

export interface RateLimitResult {
  allowed: boolean;
  errorCode?: string;
  errorMessage?: string;
  retryAfter?: number; // seconds
  currentCount: number;
  limit: number;
  windowReset: string; // ISO timestamp
}

export interface FraudDetectionResult {
  riskLevel: "low" | "medium" | "high" | "critical";
  allowed: boolean;
  riskFactors: string[];
  riskScore: number; // 0-100
  errorCode?: string;
  errorMessage?: string;
  recommendedActions: string[];
}

export interface TransactionContext {
  userId: string;
  xafAmount: number;
  userHederaAccountId: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  requestId?: string;
}

export interface UserTransactionHistory {
  userId: string;
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  lastTransactionAt: string;
  consecutiveFailures: number;
  recentTransactions: Array<{
    amount: number;
    timestamp: string;
    status: "success" | "failure";
  }>;
}

export class FraudDetectionService {
  private readonly config: FraudDetectionConfig;

  constructor(
    private repository: BaseRepository,
    private auditEnhancer: AuditEnhancer,
    private logger: StructuredLogger,
    config?: Partial<FraudDetectionConfig>
  ) {
    this.config = {
      maxRequestsPerHour: 10,
      maxRequestsPerDay: 50,
      maxAmountPerHour: 1000000, // 1M XAF
      maxAmountPerDay: 5000000, // 5M XAF
      suspiciousAmountThreshold: 2000000, // 2M XAF
      maxConsecutiveFailures: 5,
      rapidTransactionWindowMinutes: 15,
      maxTransactionsInWindow: 3,
      maxRequestsPerIPPerHour: 20,
      maxUsersPerIPPerHour: 5,
      unusualHourStart: 2, // 2 AM
      unusualHourEnd: 5, // 5 AM
      maxAmountDeviationPercent: 300, // 300% of average
      ...config,
    };
  }

  /**
   * Check rate limits for a user
   */
  async checkRateLimit(context: TransactionContext): Promise<RateLimitResult> {
    const { userId, xafAmount, ipAddress } = context;
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Check user-based rate limits
      const userHourlyRequests = await this.getUserRequestCount(
        userId,
        hourAgo,
        now
      );
      const userDailyRequests = await this.getUserRequestCount(
        userId,
        dayAgo,
        now
      );
      const userHourlyAmount = await this.getUserAmountSum(
        userId,
        hourAgo,
        now
      );
      const userDailyAmount = await this.getUserAmountSum(userId, dayAgo, now);

      // Check IP-based rate limits
      let ipHourlyRequests = 0;
      let ipUniqueUsers = 0;
      if (ipAddress) {
        ipHourlyRequests = await this.getIPRequestCount(
          ipAddress,
          hourAgo,
          now
        );
        ipUniqueUsers = await this.getIPUniqueUserCount(
          ipAddress,
          hourAgo,
          now
        );
      }

      // Evaluate rate limits
      const violations: Array<{
        type: string;
        current: number;
        limit: number;
        window: string;
      }> = [];

      if (userHourlyRequests >= this.config.maxRequestsPerHour) {
        violations.push({
          type: "user_hourly_requests",
          current: userHourlyRequests,
          limit: this.config.maxRequestsPerHour,
          window: "1 hour",
        });
      }

      if (userDailyRequests >= this.config.maxRequestsPerDay) {
        violations.push({
          type: "user_daily_requests",
          current: userDailyRequests,
          limit: this.config.maxRequestsPerDay,
          window: "24 hours",
        });
      }

      if (userHourlyAmount + xafAmount > this.config.maxAmountPerHour) {
        violations.push({
          type: "user_hourly_amount",
          current: userHourlyAmount + xafAmount,
          limit: this.config.maxAmountPerHour,
          window: "1 hour",
        });
      }

      if (userDailyAmount + xafAmount > this.config.maxAmountPerDay) {
        violations.push({
          type: "user_daily_amount",
          current: userDailyAmount + xafAmount,
          limit: this.config.maxAmountPerDay,
          window: "24 hours",
        });
      }

      if (
        ipAddress &&
        ipHourlyRequests >= this.config.maxRequestsPerIPPerHour
      ) {
        violations.push({
          type: "ip_hourly_requests",
          current: ipHourlyRequests,
          limit: this.config.maxRequestsPerIPPerHour,
          window: "1 hour",
        });
      }

      if (ipAddress && ipUniqueUsers >= this.config.maxUsersPerIPPerHour) {
        violations.push({
          type: "ip_unique_users",
          current: ipUniqueUsers,
          limit: this.config.maxUsersPerIPPerHour,
          window: "1 hour",
        });
      }

      if (violations.length > 0) {
        const primaryViolation = violations[0];

        await this.auditEnhancer.logUserAction(
          {
            userId,
            action: "rate_limit_exceeded",
            resource: "hbar_recharge",
            ipAddress,
            requestId: context.requestId,
          },
          "failure",
          {
            violations,
            xafAmount,
          }
        );

        return {
          allowed: false,
          errorCode: "RATE_LIMIT_EXCEEDED",
          errorMessage: `Rate limit exceeded: ${primaryViolation.type}`,
          retryAfter: this.calculateRetryAfter(primaryViolation.window),
          currentCount: primaryViolation.current,
          limit: primaryViolation.limit,
          windowReset: this.calculateWindowReset(primaryViolation.window),
        };
      }

      return {
        allowed: true,
        currentCount: Math.max(userHourlyRequests, userDailyRequests),
        limit: Math.max(
          this.config.maxRequestsPerHour,
          this.config.maxRequestsPerDay
        ),
        windowReset: this.calculateWindowReset("1 hour"),
      };
    } catch (error) {
      this.logger.error(
        "Rate limit check failed",
        {
          operation: "FraudDetectionService",
          userId,
        },
        error as Error
      );

      // Allow request if rate limit check fails (fail open)
      return {
        allowed: true,
        currentCount: 0,
        limit: this.config.maxRequestsPerHour,
        windowReset: this.calculateWindowReset("1 hour"),
      };
    }
  }

  /**
   * Detect fraudulent patterns in transaction
   */
  async detectFraud(
    context: TransactionContext
  ): Promise<FraudDetectionResult> {
    const { userId, xafAmount, ipAddress, timestamp } = context;
    const riskFactors: string[] = [];
    let riskScore = 0;

    try {
      // Get user transaction history
      const userHistory = await this.getUserTransactionHistory(userId);

      // 1. Large amount detection
      if (xafAmount >= this.config.suspiciousAmountThreshold) {
        riskFactors.push("Large transaction amount");
        riskScore += 25;
      }

      // 2. Unusual amount for user
      if (userHistory.averageAmount > 0) {
        const deviationPercent =
          ((xafAmount - userHistory.averageAmount) /
            userHistory.averageAmount) *
          100;
        if (deviationPercent > this.config.maxAmountDeviationPercent) {
          riskFactors.push("Amount significantly higher than user average");
          riskScore += 20;
        }
      }

      // 3. Consecutive failures
      if (
        userHistory.consecutiveFailures >= this.config.maxConsecutiveFailures
      ) {
        riskFactors.push("Multiple consecutive failed transactions");
        riskScore += 30;
      }

      // 4. Rapid transactions
      const recentTransactions = userHistory.recentTransactions.filter((tx) => {
        const txTime = new Date(tx.timestamp);
        const windowStart = new Date(
          Date.now() - this.config.rapidTransactionWindowMinutes * 60 * 1000
        );
        return txTime >= windowStart;
      });

      if (recentTransactions.length >= this.config.maxTransactionsInWindow) {
        riskFactors.push("Too many transactions in short time window");
        riskScore += 25;
      }

      // 5. Unusual time detection
      const hour = new Date(timestamp).getHours();
      if (
        hour >= this.config.unusualHourStart &&
        hour <= this.config.unusualHourEnd
      ) {
        riskFactors.push("Transaction during unusual hours");
        riskScore += 15;
      }

      // 6. Round number amounts (potential automation)
      if (this.isRoundNumber(xafAmount)) {
        riskFactors.push("Round number amount (potential automation)");
        riskScore += 10;
      }

      // 7. IP-based risk factors
      if (ipAddress) {
        const ipRiskFactors = await this.analyzeIPRisk(ipAddress, userId);
        riskFactors.push(...ipRiskFactors.factors);
        riskScore += ipRiskFactors.score;
      }

      // 8. New user with large transaction
      if (userHistory.totalTransactions === 0 && xafAmount > 100000) {
        riskFactors.push("First transaction with large amount");
        riskScore += 20;
      }

      // Determine risk level and action
      const riskLevel = this.calculateRiskLevel(riskScore);
      const allowed = riskLevel !== "critical";

      // Log fraud detection result
      await this.auditEnhancer.logUserAction(
        {
          userId,
          action: "fraud_detection_check",
          resource: "hbar_recharge",
          ipAddress,
          requestId: context.requestId,
        },
        allowed ? "success" : "failure",
        {
          riskLevel,
          riskScore,
          riskFactors,
          xafAmount,
        }
      );

      return {
        riskLevel,
        allowed,
        riskFactors,
        riskScore,
        errorCode: allowed ? undefined : "TRANSACTION_BLOCKED_FRAUD",
        errorMessage: allowed
          ? undefined
          : "Transaction blocked due to fraud detection",
        recommendedActions: this.generateRecommendedActions(
          riskLevel,
          riskFactors
        ),
      };
    } catch (error) {
      this.logger.error(
        "Fraud detection failed",
        {
          operation: "FraudDetectionService",
          userId,
        },
        error as Error
      );

      // Return low risk if detection fails (fail open)
      return {
        riskLevel: "low",
        allowed: true,
        riskFactors: ["Fraud detection system unavailable"],
        riskScore: 0,
        recommendedActions: [],
      };
    }
  }

  /**
   * Record transaction attempt for future analysis
   */
  async recordTransactionAttempt(
    context: TransactionContext,
    result: "success" | "failure",
    errorCode?: string
  ): Promise<void> {
    try {
      const record = {
        PK: `FRAUD_DETECTION#${context.userId}`,
        SK: `TRANSACTION#${context.timestamp}#${
          context.requestId || Date.now()
        }`,
        userId: context.userId,
        xafAmount: context.xafAmount,
        userHederaAccountId: context.userHederaAccountId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: context.timestamp,
        result,
        errorCode,

        // GSI for IP-based queries
        GSI1PK: context.ipAddress ? `IP#${context.ipAddress}` : undefined,
        GSI1SK: context.timestamp,

        // GSI for time-based queries
        GSI2PK: `TRANSACTIONS#${context.timestamp.split("T")[0]}`, // Date
        GSI2SK: context.timestamp,
      };

      await this.repository.putItem(record);
    } catch (error) {
      this.logger.error(
        "Failed to record transaction attempt",
        {
          operation: "FraudDetectionService",
          userId: context.userId,
        },
        error as Error
      );
    }
  }

  private async getUserRequestCount(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    try {
      const result = await this.repository.queryItems(
        "#PK = :pk AND #SK BETWEEN :start AND :end",
        { "#PK": "PK", "#SK": "SK" },
        {
          ":pk": `FRAUD_DETECTION#${userId}`,
          ":start": `TRANSACTION#${startTime.toISOString()}`,
          ":end": `TRANSACTION#${endTime.toISOString()}`,
        }
      );
      return result.count;
    } catch (error) {
      return 0;
    }
  }

  private async getUserAmountSum(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    try {
      const result = await this.repository.queryItems(
        "#PK = :pk AND #SK BETWEEN :start AND :end",
        { "#PK": "PK", "#SK": "SK" },
        {
          ":pk": `FRAUD_DETECTION#${userId}`,
          ":start": `TRANSACTION#${startTime.toISOString()}`,
          ":end": `TRANSACTION#${endTime.toISOString()}`,
        }
      );

      return result.items.reduce((sum: number, item: any) => {
        return item.result === "success" ? sum + (item.xafAmount || 0) : sum;
      }, 0);
    } catch (error) {
      return 0;
    }
  }

  private async getIPRequestCount(
    ipAddress: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    try {
      const result = await this.repository.queryItemsByGSI(
        "GSI1",
        "#GSI1PK = :pk AND #GSI1SK BETWEEN :start AND :end",
        { "#GSI1PK": "GSI1PK", "#GSI1SK": "GSI1SK" },
        {
          ":pk": `IP#${ipAddress}`,
          ":start": startTime.toISOString(),
          ":end": endTime.toISOString(),
        }
      );
      return result.count;
    } catch (error) {
      return 0;
    }
  }

  private async getIPUniqueUserCount(
    ipAddress: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    try {
      const result = await this.repository.queryItemsByGSI(
        "GSI1",
        "#GSI1PK = :pk AND #GSI1SK BETWEEN :start AND :end",
        { "#GSI1PK": "GSI1PK", "#GSI1SK": "GSI1SK" },
        {
          ":pk": `IP#${ipAddress}`,
          ":start": startTime.toISOString(),
          ":end": endTime.toISOString(),
        }
      );

      const uniqueUsers = new Set(result.items.map((item: any) => item.userId));
      return uniqueUsers.size;
    } catch (error) {
      return 0;
    }
  }

  private async getUserTransactionHistory(
    userId: string
  ): Promise<UserTransactionHistory> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await this.repository.queryItems(
        "#PK = :pk AND #SK >= :start",
        { "#PK": "PK", "#SK": "SK" },
        {
          ":pk": `FRAUD_DETECTION#${userId}`,
          ":start": `TRANSACTION#${thirtyDaysAgo.toISOString()}`,
        }
      );

      const transactions = result.items.map((item: any) => ({
        amount: item.xafAmount || 0,
        timestamp: item.timestamp,
        status: item.result,
      }));

      const successfulTransactions = transactions.filter(
        (tx) => tx.status === "success"
      );
      const totalAmount = successfulTransactions.reduce(
        (sum, tx) => sum + tx.amount,
        0
      );
      const averageAmount =
        successfulTransactions.length > 0
          ? totalAmount / successfulTransactions.length
          : 0;

      // Count consecutive failures from most recent
      let consecutiveFailures = 0;
      for (let i = transactions.length - 1; i >= 0; i--) {
        if (transactions[i].status === "failure") {
          consecutiveFailures++;
        } else {
          break;
        }
      }

      return {
        userId,
        totalTransactions: transactions.length,
        totalAmount,
        averageAmount,
        lastTransactionAt:
          transactions.length > 0
            ? transactions[transactions.length - 1].timestamp
            : "",
        consecutiveFailures,
        recentTransactions: transactions.slice(-10), // Last 10 transactions
      };
    } catch (error) {
      return {
        userId,
        totalTransactions: 0,
        totalAmount: 0,
        averageAmount: 0,
        lastTransactionAt: "",
        consecutiveFailures: 0,
        recentTransactions: [],
      };
    }
  }

  private async analyzeIPRisk(
    ipAddress: string,
    userId: string
  ): Promise<{ factors: string[]; score: number }> {
    const factors: string[] = [];
    let score = 0;

    try {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Check for multiple users from same IP
      const uniqueUsers = await this.getIPUniqueUserCount(
        ipAddress,
        hourAgo,
        new Date()
      );
      if (uniqueUsers > 3) {
        factors.push("Multiple users from same IP address");
        score += 15;
      }

      // Check for high frequency from IP
      const ipRequests = await this.getIPRequestCount(
        ipAddress,
        hourAgo,
        new Date()
      );
      if (ipRequests > 15) {
        factors.push("High frequency requests from IP address");
        score += 10;
      }

      return { factors, score };
    } catch (error) {
      return { factors: [], score: 0 };
    }
  }

  private isRoundNumber(amount: number): boolean {
    // Check if amount is a round number (divisible by 10,000 or 50,000)
    return amount % 50000 === 0 || amount % 10000 === 0;
  }

  private calculateRiskLevel(
    riskScore: number
  ): "low" | "medium" | "high" | "critical" {
    if (riskScore >= 80) return "critical";
    if (riskScore >= 60) return "high";
    if (riskScore >= 30) return "medium";
    return "low";
  }

  private generateRecommendedActions(
    riskLevel: string,
    riskFactors: string[]
  ): string[] {
    const actions: string[] = [];

    switch (riskLevel) {
      case "critical":
        actions.push("Transaction blocked - contact support");
        actions.push("Account may be temporarily suspended");
        break;
      case "high":
        actions.push("Additional verification may be required");
        actions.push("Transaction may be delayed for review");
        break;
      case "medium":
        actions.push("Monitor account activity");
        break;
      case "low":
        // No specific actions needed
        break;
    }

    if (riskFactors.includes("Multiple consecutive failed transactions")) {
      actions.push("Verify payment method and credentials");
    }

    if (riskFactors.includes("Large transaction amount")) {
      actions.push("Ensure KYC verification is complete");
    }

    return actions;
  }

  private calculateRetryAfter(window: string): number {
    switch (window) {
      case "1 hour":
        return 3600; // 1 hour in seconds
      case "24 hours":
        return 86400; // 24 hours in seconds
      default:
        return 3600;
    }
  }

  private calculateWindowReset(window: string): string {
    const now = new Date();
    switch (window) {
      case "1 hour":
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case "24 hours":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }
  }
}
