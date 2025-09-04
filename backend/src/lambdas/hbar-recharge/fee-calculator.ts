/**
 * HBAR Recharge Fee Calculator
 * Calculates fees for HBAR recharge transactions
 */

import { FeeBreakdown } from "../../types/hbar-recharge";
import { FeeCalculationInput, FeeCalculationResult } from "./types";

export interface FeeCalculatorConfig {
  platformFeePercentage: number;
  orangeMoneyFeePercentage: number;
  minimumPlatformFee?: number;
  maximumPlatformFee?: number;
  minimumOrangeMoneyFee?: number;
  maximumOrangeMoneyFee?: number;
}

export class FeeCalculator {
  private readonly config: FeeCalculatorConfig;

  constructor(config?: Partial<FeeCalculatorConfig>) {
    this.config = {
      platformFeePercentage: 2.5, // 2.5%
      orangeMoneyFeePercentage: 1.5, // 1.5%
      minimumPlatformFee: 100, // 100 XAF minimum
      maximumPlatformFee: 10000, // 10,000 XAF maximum
      minimumOrangeMoneyFee: 50, // 50 XAF minimum
      maximumOrangeMoneyFee: 5000, // 5,000 XAF maximum
      ...config,
    };
  }

  /**
   * Calculates all fees for a recharge transaction
   */
  calculateFees(xafAmount: number): FeeCalculationResult {
    const platformFee = this.calculatePlatformFee(xafAmount);
    const orangeMoneyFee = this.calculateOrangeMoneyFee(xafAmount);
    const totalFees = platformFee + orangeMoneyFee;
    const netAmount = xafAmount - totalFees;

    return {
      platformFee,
      orangeMoneyFee,
      totalFees,
      netAmount,
    };
  }

  /**
   * Calculates platform fee with min/max constraints
   */
  calculatePlatformFee(xafAmount: number): number {
    let fee = (xafAmount * this.config.platformFeePercentage) / 100;

    // Apply minimum fee constraint
    if (
      this.config.minimumPlatformFee &&
      fee < this.config.minimumPlatformFee
    ) {
      fee = this.config.minimumPlatformFee;
    }

    // Apply maximum fee constraint
    if (
      this.config.maximumPlatformFee &&
      fee > this.config.maximumPlatformFee
    ) {
      fee = this.config.maximumPlatformFee;
    }

    return Math.round(fee); // Round to nearest XAF
  }

  /**
   * Calculates Orange Money fee with min/max constraints
   */
  calculateOrangeMoneyFee(xafAmount: number): number {
    let fee = (xafAmount * this.config.orangeMoneyFeePercentage) / 100;

    // Apply minimum fee constraint
    if (
      this.config.minimumOrangeMoneyFee &&
      fee < this.config.minimumOrangeMoneyFee
    ) {
      fee = this.config.minimumOrangeMoneyFee;
    }

    // Apply maximum fee constraint
    if (
      this.config.maximumOrangeMoneyFee &&
      fee > this.config.maximumOrangeMoneyFee
    ) {
      fee = this.config.maximumOrangeMoneyFee;
    }

    return Math.round(fee); // Round to nearest XAF
  }

  /**
   * Calculates effective fee percentage for an amount
   */
  calculateEffectiveFeePercentage(xafAmount: number): {
    platformFeePercentage: number;
    orangeMoneyFeePercentage: number;
    totalFeePercentage: number;
  } {
    const fees = this.calculateFees(xafAmount);

    return {
      platformFeePercentage: (fees.platformFee / xafAmount) * 100,
      orangeMoneyFeePercentage: (fees.orangeMoneyFee / xafAmount) * 100,
      totalFeePercentage: (fees.totalFees / xafAmount) * 100,
    };
  }

  /**
   * Calculates the gross amount needed to achieve a target net amount
   */
  calculateGrossAmountForNetAmount(targetNetAmount: number): {
    grossAmount: number;
    fees: FeeCalculationResult;
    iterations: number;
  } {
    let grossAmount = targetNetAmount;
    let iterations = 0;
    const maxIterations = 10;

    // Iteratively calculate gross amount
    while (iterations < maxIterations) {
      const fees = this.calculateFees(grossAmount);
      const actualNetAmount = fees.netAmount;

      if (Math.abs(actualNetAmount - targetNetAmount) < 1) {
        // Close enough (within 1 XAF)
        return {
          grossAmount: Math.round(grossAmount),
          fees,
          iterations: iterations + 1,
        };
      }

      // Adjust gross amount
      const difference = targetNetAmount - actualNetAmount;
      grossAmount += difference;
      iterations++;
    }

    // If we couldn't converge, return the last calculation
    const finalFees = this.calculateFees(grossAmount);
    return {
      grossAmount: Math.round(grossAmount),
      fees: finalFees,
      iterations,
    };
  }

  /**
   * Gets fee breakdown for display purposes
   */
  getFeeBreakdown(xafAmount: number): FeeBreakdown & {
    netAmount: number;
    feePercentages: {
      platform: number;
      orangeMoney: number;
      total: number;
    };
  } {
    const fees = this.calculateFees(xafAmount);
    const percentages = this.calculateEffectiveFeePercentage(xafAmount);

    return {
      platformFee: fees.platformFee,
      orangeMoneyFee: fees.orangeMoneyFee,
      totalFees: fees.totalFees,
      netAmount: fees.netAmount,
      feePercentages: {
        platform: percentages.platformFeePercentage,
        orangeMoney: percentages.orangeMoneyFeePercentage,
        total: percentages.totalFeePercentage,
      },
    };
  }

  /**
   * Validates if an amount meets minimum requirements after fees
   */
  validateMinimumNetAmount(
    xafAmount: number,
    minimumNetAmount: number = 500
  ): {
    isValid: boolean;
    netAmount: number;
    shortfall?: number;
  } {
    const fees = this.calculateFees(xafAmount);
    const isValid = fees.netAmount >= minimumNetAmount;

    return {
      isValid,
      netAmount: fees.netAmount,
      shortfall: isValid ? undefined : minimumNetAmount - fees.netAmount,
    };
  }

  /**
   * Calculates fee tiers for different amount ranges
   */
  calculateFeeTiers(amounts: number[]): Array<{
    amount: number;
    fees: FeeCalculationResult;
    effectivePercentage: number;
  }> {
    return amounts.map((amount) => {
      const fees = this.calculateFees(amount);
      const effectivePercentage = (fees.totalFees / amount) * 100;

      return {
        amount,
        fees,
        effectivePercentage,
      };
    });
  }

  /**
   * Gets recommended amount ranges based on fee efficiency
   */
  getRecommendedAmountRanges(): Array<{
    minAmount: number;
    maxAmount: number;
    description: string;
    effectiveFeeRange: string;
  }> {
    const ranges = [
      { min: 1000, max: 10000, desc: "Small transactions" },
      { min: 10000, max: 50000, desc: "Medium transactions" },
      { min: 50000, max: 200000, desc: "Large transactions" },
      { min: 200000, max: 1000000, desc: "Very large transactions" },
    ];

    return ranges.map((range) => {
      const minFeePercentage = this.calculateEffectiveFeePercentage(
        range.min
      ).totalFeePercentage;
      const maxFeePercentage = this.calculateEffectiveFeePercentage(
        range.max
      ).totalFeePercentage;

      return {
        minAmount: range.min,
        maxAmount: range.max,
        description: range.desc,
        effectiveFeeRange: `${maxFeePercentage.toFixed(
          2
        )}% - ${minFeePercentage.toFixed(2)}%`,
      };
    });
  }

  /**
   * Estimates total cost including fees for a target HBAR amount
   */
  estimateTotalCostForHBAR(
    targetHBARAmount: number,
    exchangeRate: number
  ): {
    targetHBARAmount: number;
    estimatedXAFAmount: number;
    grossXAFAmount: number;
    fees: FeeCalculationResult;
  } {
    // Calculate XAF amount needed for target HBAR
    const estimatedXAFAmount = targetHBARAmount / exchangeRate;

    // Calculate gross amount needed including fees
    const grossCalculation =
      this.calculateGrossAmountForNetAmount(estimatedXAFAmount);

    return {
      targetHBARAmount,
      estimatedXAFAmount,
      grossXAFAmount: grossCalculation.grossAmount,
      fees: grossCalculation.fees,
    };
  }

  /**
   * Gets current fee configuration
   */
  getConfig(): FeeCalculatorConfig {
    return { ...this.config };
  }

  /**
   * Updates fee configuration
   */
  updateConfig(newConfig: Partial<FeeCalculatorConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Validates fee configuration
   */
  validateConfig(config: FeeCalculatorConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (
      config.platformFeePercentage < 0 ||
      config.platformFeePercentage > 100
    ) {
      errors.push("Platform fee percentage must be between 0 and 100");
    }

    if (
      config.orangeMoneyFeePercentage < 0 ||
      config.orangeMoneyFeePercentage > 100
    ) {
      errors.push("Orange Money fee percentage must be between 0 and 100");
    }

    if (config.minimumPlatformFee && config.minimumPlatformFee < 0) {
      errors.push("Minimum platform fee cannot be negative");
    }

    if (
      config.maximumPlatformFee &&
      config.minimumPlatformFee &&
      config.maximumPlatformFee < config.minimumPlatformFee
    ) {
      errors.push(
        "Maximum platform fee cannot be less than minimum platform fee"
      );
    }

    if (config.minimumOrangeMoneyFee && config.minimumOrangeMoneyFee < 0) {
      errors.push("Minimum Orange Money fee cannot be negative");
    }

    if (
      config.maximumOrangeMoneyFee &&
      config.minimumOrangeMoneyFee &&
      config.maximumOrangeMoneyFee < config.minimumOrangeMoneyFee
    ) {
      errors.push(
        "Maximum Orange Money fee cannot be less than minimum Orange Money fee"
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
