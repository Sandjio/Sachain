/**
 * Exchange Rate Service for XAF to HBAR conversion
 * Provides real-time exchange rates with caching, fallback sources, and fee calculations
 */

import { BaseRepository } from "../repositories/base-repository";
import { ExponentialBackoff } from "./retry";
import {
  ExchangeRate,
  ExchangeRateCache,
  ConversionResult,
  RechargeConfig,
  RECHARGE_ERROR_CODES,
} from "../types/hbar-recharge";

export interface ExchangeRateSource {
  name: string;
  url: string;
  timeout: number;
  confidence: "high" | "medium" | "low";
  parser: (response: any) => number;
}

export interface ExchangeRateServiceConfig {
  tableName: string;
  cacheTimeout: number; // seconds
  staleThreshold: number; // seconds
  sources: ExchangeRateSource[];
  fees: {
    platformFeePercentage: number;
    orangeMoneyFeePercentage: number;
  };
}

export class ExchangeRateService extends BaseRepository {
  private readonly config: ExchangeRateServiceConfig;
  protected readonly exchangeRetry: ExponentialBackoff;

  constructor(config: ExchangeRateServiceConfig) {
    super({ tableName: config.tableName });
    this.config = config;
    this.exchangeRetry = new ExponentialBackoff({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      jitterType: "full",
      retryableErrors: [
        "NetworkError",
        "TimeoutError",
        "ServiceUnavailable",
        "RateLimitExceeded",
      ],
    });
  }

  /**
   * Get current XAF to HBAR exchange rate with caching
   */
  async getCurrentRate(): Promise<ExchangeRate> {
    try {
      // Try to get cached rate first
      const cachedRate = await this.getCachedRate();
      if (cachedRate && !this.isRateStale(cachedRate)) {
        return {
          xafToHbar: cachedRate.rate,
          lastUpdated: cachedRate.lastUpdated,
          source: cachedRate.source,
          confidence: cachedRate.confidence,
        };
      }

      // Fetch fresh rate from sources
      const freshRate = await this.fetchFreshRate();

      // Cache the fresh rate
      await this.cacheRate(freshRate);

      return freshRate;
    } catch (error) {
      console.error("Failed to get current exchange rate:", error);

      // Try to use stale cached rate as fallback
      const cachedRate = await this.getCachedRate();
      if (cachedRate) {
        console.warn("Using stale cached rate as fallback");
        return {
          xafToHbar: cachedRate.rate,
          lastUpdated: cachedRate.lastUpdated,
          source: `${cachedRate.source} (stale)`,
          confidence: "low",
        };
      }

      throw new Error(RECHARGE_ERROR_CODES.EXCHANGE_RATE_UNAVAILABLE);
    }
  }

  /**
   * Calculate HBAR amount from XAF with fees
   */
  async calculateHBARAmount(xafAmount: number): Promise<ConversionResult> {
    const exchangeRate = await this.getCurrentRate();

    // Calculate fees
    const platformFee =
      xafAmount * (this.config.fees.platformFeePercentage / 100);
    const orangeMoneyFee =
      xafAmount * (this.config.fees.orangeMoneyFeePercentage / 100);
    const totalFees = platformFee + orangeMoneyFee;

    // Calculate net XAF amount after fees
    const netXafAmount = xafAmount - totalFees;

    // Convert to HBAR
    const hbarAmount = netXafAmount * exchangeRate.xafToHbar;

    return {
      xafAmount,
      hbarAmount,
      exchangeRate: exchangeRate.xafToHbar,
      platformFee,
      orangeMoneyFee,
      netHBARAmount: hbarAmount,
    };
  }

  /**
   * Get cached exchange rate from DynamoDB
   */
  private async getCachedRate(): Promise<ExchangeRateCache | null> {
    try {
      return await this.getItem<ExchangeRateCache>("EXCHANGE_RATE", "XAF_HBAR");
    } catch (error) {
      console.error("Failed to get cached rate:", error);
      return null;
    }
  }

  /**
   * Cache exchange rate in DynamoDB with TTL
   */
  private async cacheRate(rate: ExchangeRate): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.cacheTimeout * 1000);

    const cacheItem: ExchangeRateCache = {
      PK: "EXCHANGE_RATE",
      SK: "XAF_HBAR",
      rate: rate.xafToHbar,
      source: rate.source,
      lastUpdated: rate.lastUpdated,
      expiresAt: expiresAt.toISOString(),
      confidence: rate.confidence,
    };

    try {
      await this.putItem(cacheItem);
    } catch (error) {
      console.error("Failed to cache exchange rate:", error);
      // Don't throw - caching failure shouldn't break the service
    }
  }

  /**
   * Check if cached rate is stale
   */
  private isRateStale(cachedRate: ExchangeRateCache): boolean {
    const now = new Date();
    const lastUpdated = new Date(cachedRate.lastUpdated);
    const ageInSeconds = (now.getTime() - lastUpdated.getTime()) / 1000;

    return ageInSeconds > this.config.staleThreshold;
  }

  /**
   * Fetch fresh exchange rate from external sources
   */
  private async fetchFreshRate(): Promise<ExchangeRate> {
    const errors: Error[] = [];

    // Try each source in order of confidence
    const sortedSources = [...this.config.sources].sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });

    for (const source of sortedSources) {
      try {
        const rate = await this.fetchFromSource(source);
        return {
          xafToHbar: rate,
          lastUpdated: new Date().toISOString(),
          source: source.name,
          confidence: source.confidence,
        };
      } catch (error) {
        console.error(`Failed to fetch rate from ${source.name}:`, error);
        errors.push(error as Error);

        // If this is the fallback source, use it even if it "fails"
        if (source.name === "Fallback Static Rate") {
          return {
            xafToHbar: 0.00001, // Use the fallback rate directly
            lastUpdated: new Date().toISOString(),
            source: source.name,
            confidence: "low",
          };
        }
      }
    }

    // All sources failed, use emergency fallback
    console.warn(
      "All exchange rate sources failed, using emergency fallback rate"
    );
    return {
      xafToHbar: 0.00001, // Emergency fallback: 1 XAF = 0.00001 HBAR
      lastUpdated: new Date().toISOString(),
      source: "Emergency Fallback",
      confidence: "low",
    };
  }
  /**
   * Fetch exchange rate from a specific source
   */
  private async fetchFromSource(source: ExchangeRateSource): Promise<number> {
    return await this.exchangeRetry
      .execute(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), source.timeout);

        try {
          const response = await fetch(source.url, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Sachain/1.0",
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          const rate = source.parser(data);

          if (!rate || rate <= 0 || !isFinite(rate)) {
            throw new Error(`Invalid rate received: ${rate}`);
          }

          return rate;
        } finally {
          clearTimeout(timeoutId);
        }
      }, `fetchFromSource:${source.name}`)
      .then((result) => result.result);
  }

  /**
   * Validate exchange rate value
   */
  private validateRate(rate: number): boolean {
    return rate > 0 && isFinite(rate) && !isNaN(rate);
  }

  /**
   * Get rate confidence based on age and source
   */
  private getRateConfidence(
    source: ExchangeRateSource,
    ageInSeconds: number
  ): "high" | "medium" | "low" {
    if (ageInSeconds > this.config.staleThreshold) {
      return "low";
    }

    if (ageInSeconds > this.config.staleThreshold / 2) {
      return source.confidence === "high" ? "medium" : "low";
    }

    return source.confidence;
  }
}

/**
 * Default exchange rate sources configuration
 */
export const DEFAULT_EXCHANGE_RATE_SOURCES: ExchangeRateSource[] = [
  {
    name: "CoinGecko",
    url: "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd",
    timeout: 10000,
    confidence: "high",
    parser: (data) => {
      const hbarUsd = data["hedera-hashgraph"]?.usd;
      if (!hbarUsd) throw new Error("HBAR price not found in response");
      // Convert USD to XAF (approximate rate: 1 USD = 600 XAF)
      const usdToXaf = 600;
      const hbarXaf = hbarUsd * usdToXaf;
      return 1 / hbarXaf; // Convert XAF per HBAR to HBAR per XAF
    },
  },
  {
    name: "Fallback Static Rate",
    url: 'data:application/json,{"rate":0.00001}', // 1 XAF = 0.00001 HBAR (more realistic fallback)
    timeout: 1000,
    confidence: "low",
    parser: (data) => {
      return data.rate || 0.00001;
    },
  },
];

/**
 * Create exchange rate service with default configuration
 */
export function createExchangeRateService(
  tableName: string,
  overrides: Partial<ExchangeRateServiceConfig> = {}
): ExchangeRateService {
  const defaultConfig: ExchangeRateServiceConfig = {
    tableName,
    cacheTimeout: 300, // 5 minutes
    staleThreshold: 600, // 10 minutes
    sources: DEFAULT_EXCHANGE_RATE_SOURCES,
    fees: {
      platformFeePercentage: 2.5, // 2.5%
      orangeMoneyFeePercentage: 1.5, // 1.5%
    },
  };

  const config = { ...defaultConfig, ...overrides };
  return new ExchangeRateService(config);
}
