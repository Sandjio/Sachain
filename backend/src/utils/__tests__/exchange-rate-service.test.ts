/**
 * Unit tests for ExchangeRateService
 * Tests exchange rate fetching, caching, fee calculations, and error handling
 */

import {
  ExchangeRateService,
  ExchangeRateServiceConfig,
  ExchangeRateSource,
  DEFAULT_EXCHANGE_RATE_SOURCES,
  createExchangeRateService,
} from "../exchange-rate-service";
import {
  ExchangeRate,
  ExchangeRateCache,
  ConversionResult,
  RECHARGE_ERROR_CODES,
} from "../../types/hbar-recharge";

// Mock the BaseRepository
jest.mock("../../repositories/base-repository");

// Mock fetch globally
global.fetch = jest.fn();

describe("ExchangeRateService", () => {
  let service: ExchangeRateService;
  let mockGetItem: jest.Mock;
  let mockPutItem: jest.Mock;

  const mockConfig: ExchangeRateServiceConfig = {
    tableName: "test-table",
    cacheTimeout: 300,
    staleThreshold: 600,
    sources: [
      {
        name: "TestSource",
        url: "https://api.test.com/rate",
        timeout: 5000,
        confidence: "high",
        parser: (data) => data.rate,
      },
    ],
    fees: {
      platformFeePercentage: 2.5,
      orangeMoneyFeePercentage: 1.5,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock BaseRepository methods
    mockGetItem = jest.fn();
    mockPutItem = jest.fn();

    service = new ExchangeRateService(mockConfig);
    (service as any).getItem = mockGetItem;
    (service as any).putItem = mockPutItem;
  });

  describe("getCurrentRate", () => {
    it("should return cached rate when available and fresh", async () => {
      const cachedRate: ExchangeRateCache = {
        PK: "EXCHANGE_RATE",
        SK: "XAF_HBAR",
        rate: 0.000001,
        source: "TestSource",
        lastUpdated: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        confidence: "high",
      };

      mockGetItem.mockResolvedValue(cachedRate);

      const result = await service.getCurrentRate();

      expect(result).toEqual({
        xafToHbar: 0.000001,
        lastUpdated: cachedRate.lastUpdated,
        source: "TestSource",
        confidence: "high",
      });
      expect(mockGetItem).toHaveBeenCalledWith("EXCHANGE_RATE", "XAF_HBAR");
    });

    it("should fetch fresh rate when cache is stale", async () => {
      const staleRate: ExchangeRateCache = {
        PK: "EXCHANGE_RATE",
        SK: "XAF_HBAR",
        rate: 0.000001,
        source: "TestSource",
        lastUpdated: new Date(Date.now() - 700000).toISOString(), // 700 seconds ago
        expiresAt: new Date(Date.now() - 100000).toISOString(),
        confidence: "high",
      };

      mockGetItem.mockResolvedValue(staleRate);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rate: 0.000002 }),
      });
      mockPutItem.mockResolvedValue(undefined);

      const result = await service.getCurrentRate();

      expect(result.xafToHbar).toBe(0.000002);
      expect(result.source).toBe("TestSource");
      expect(result.confidence).toBe("high");
      expect(mockPutItem).toHaveBeenCalled();
    });

    it("should fetch fresh rate when no cache exists", async () => {
      mockGetItem.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rate: 0.000002 }),
      });
      mockPutItem.mockResolvedValue(undefined);

      const result = await service.getCurrentRate();

      expect(result.xafToHbar).toBe(0.000002);
      expect(result.source).toBe("TestSource");
      expect(mockPutItem).toHaveBeenCalled();
    });

    it("should use stale cache as fallback when fresh fetch fails", async () => {
      const staleRate: ExchangeRateCache = {
        PK: "EXCHANGE_RATE",
        SK: "XAF_HBAR",
        rate: 0.000001,
        source: "TestSource",
        lastUpdated: new Date(Date.now() - 700000).toISOString(),
        expiresAt: new Date(Date.now() - 100000).toISOString(),
        confidence: "high",
      };

      mockGetItem.mockResolvedValue(staleRate);
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await service.getCurrentRate();

      expect(result.xafToHbar).toBe(0.000001);
      expect(result.source).toBe("TestSource (stale)");
      expect(result.confidence).toBe("low");
    });

    it("should throw error when no cache and fresh fetch fails", async () => {
      mockGetItem.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      await expect(service.getCurrentRate()).rejects.toThrow(
        RECHARGE_ERROR_CODES.EXCHANGE_RATE_UNAVAILABLE
      );
    });
  });

  describe("calculateHBARAmount", () => {
    beforeEach(() => {
      // Mock getCurrentRate for calculation tests
      jest.spyOn(service, "getCurrentRate").mockResolvedValue({
        xafToHbar: 0.000001,
        lastUpdated: new Date().toISOString(),
        source: "TestSource",
        confidence: "high",
      });
    });

    it("should calculate HBAR amount with correct fees", async () => {
      const xafAmount = 10000; // 10,000 XAF

      const result = await service.calculateHBARAmount(xafAmount);

      expect(result).toEqual({
        xafAmount: 10000,
        hbarAmount: 0.0096, // (10000 - 400) * 0.000001
        exchangeRate: 0.000001,
        platformFee: 250, // 2.5% of 10000
        orangeMoneyFee: 150, // 1.5% of 10000
        netHBARAmount: 0.0096,
      });
    });

    it("should handle small amounts correctly", async () => {
      const xafAmount = 1000; // 1,000 XAF

      const result = await service.calculateHBARAmount(xafAmount);

      expect(result).toEqual({
        xafAmount: 1000,
        hbarAmount: 0.0009599999999999999, // (1000 - 40) * 0.000001
        exchangeRate: 0.000001,
        platformFee: 25, // 2.5% of 1000
        orangeMoneyFee: 15, // 1.5% of 1000
        netHBARAmount: 0.0009599999999999999,
      });
    });

    it("should handle large amounts correctly", async () => {
      const xafAmount = 1000000; // 1,000,000 XAF

      const result = await service.calculateHBARAmount(xafAmount);

      expect(result).toEqual({
        xafAmount: 1000000,
        hbarAmount: 0.96, // (1000000 - 40000) * 0.000001
        exchangeRate: 0.000001,
        platformFee: 25000, // 2.5% of 1000000
        orangeMoneyFee: 15000, // 1.5% of 1000000
        netHBARAmount: 0.96,
      });
    });
  });

  describe("fetchFromSource", () => {
    const testSource: ExchangeRateSource = {
      name: "TestAPI",
      url: "https://api.test.com/rate",
      timeout: 5000,
      confidence: "high",
      parser: (data) => data.rate,
    };

    it("should successfully fetch rate from source", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rate: 0.000002 }),
      });

      const rate = await (service as any).fetchFromSource(testSource);

      expect(rate).toBe(0.000002);
      expect(global.fetch).toHaveBeenCalledWith(testSource.url, {
        signal: expect.any(AbortSignal),
        headers: {
          "User-Agent": "Sachain/1.0",
          Accept: "application/json",
        },
      });
    });

    it("should handle HTTP errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(
        (service as any).fetchFromSource(testSource)
      ).rejects.toThrow(
        "Operation fetchFromSource:TestAPI failed after 4 attempts"
      );
    });

    it("should handle invalid rate values", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rate: -1 }),
      });

      await expect(
        (service as any).fetchFromSource(testSource)
      ).rejects.toThrow(
        "Operation fetchFromSource:TestAPI failed after 4 attempts"
      );
    });

    it("should handle network timeouts", async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 100)
          )
      );

      await expect(
        (service as any).fetchFromSource(testSource)
      ).rejects.toThrow();
    });
  });

  describe("caching behavior", () => {
    it("should cache fresh rates with correct TTL", async () => {
      const mockRate: ExchangeRate = {
        xafToHbar: 0.000002,
        lastUpdated: new Date().toISOString(),
        source: "TestSource",
        confidence: "high",
      };

      mockGetItem.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rate: 0.000002 }),
      });
      mockPutItem.mockResolvedValue(undefined);

      await service.getCurrentRate();

      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: "EXCHANGE_RATE",
          SK: "XAF_HBAR",
          rate: 0.000002,
          source: "TestSource",
          confidence: "high",
        })
      );
    });

    it("should handle cache write failures gracefully", async () => {
      mockGetItem.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rate: 0.000002 }),
      });
      mockPutItem.mockRejectedValue(new Error("DynamoDB error"));

      // Should not throw even if caching fails
      const result = await service.getCurrentRate();
      expect(result.xafToHbar).toBe(0.000002);
    });
  });

  describe("multiple sources fallback", () => {
    let multiSourceService: ExchangeRateService;

    beforeEach(() => {
      const multiSourceConfig: ExchangeRateServiceConfig = {
        ...mockConfig,
        sources: [
          {
            name: "PrimarySource",
            url: "https://primary.api.com/rate",
            timeout: 1000,
            confidence: "high",
            parser: (data) => data.rate,
          },
          {
            name: "SecondarySource",
            url: "https://secondary.api.com/rate",
            timeout: 1000,
            confidence: "medium",
            parser: (data) => data.price,
          },
        ],
      };

      multiSourceService = new ExchangeRateService(multiSourceConfig);
      (multiSourceService as any).getItem = mockGetItem;
      (multiSourceService as any).putItem = mockPutItem;

      // Override retry config for faster tests
      (multiSourceService as any).exchangeRetry.updateConfig({
        maxRetries: 1,
        baseDelay: 10,
        maxDelay: 50,
      });
    });

    it("should try sources in confidence order", async () => {
      mockGetItem.mockResolvedValue(null);

      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // Primary source fails (2 attempts: initial + 1 retry)
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
          });
        } else {
          // Secondary source succeeds
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ price: 0.000003 }),
          });
        }
      });

      mockPutItem.mockResolvedValue(undefined);

      const result = await multiSourceService.getCurrentRate();

      expect(result.xafToHbar).toBe(0.000003);
      expect(result.source).toBe("SecondarySource");
      expect(result.confidence).toBe("medium");
    });

    it("should fail when all sources fail", async () => {
      mockGetItem.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      await expect(multiSourceService.getCurrentRate()).rejects.toThrow(
        "EXCHANGE_RATE_UNAVAILABLE"
      );
    }, 10000);
  });

  describe("DEFAULT_EXCHANGE_RATE_SOURCES", () => {
    it("should have valid source configurations", () => {
      expect(DEFAULT_EXCHANGE_RATE_SOURCES).toHaveLength(3);

      const coinGecko = DEFAULT_EXCHANGE_RATE_SOURCES[0];
      expect(coinGecko.name).toBe("CoinGecko");
      expect(coinGecko.confidence).toBe("high");
      expect(coinGecko.timeout).toBe(10000);

      const coinMarketCap = DEFAULT_EXCHANGE_RATE_SOURCES[1];
      expect(coinMarketCap.name).toBe("CoinMarketCap");
      expect(coinMarketCap.confidence).toBe("high");

      const fallback = DEFAULT_EXCHANGE_RATE_SOURCES[2];
      expect(fallback.name).toBe("Fallback Static Rate");
      expect(fallback.confidence).toBe("low");
    });

    it("should have working parsers", () => {
      const coinGeckoParser = DEFAULT_EXCHANGE_RATE_SOURCES[0].parser;
      const mockCoinGeckoData = {
        "hedera-hashgraph": { xaf: 500 },
      };
      expect(coinGeckoParser(mockCoinGeckoData)).toBe(1 / 500);

      const coinMarketCapParser = DEFAULT_EXCHANGE_RATE_SOURCES[1].parser;
      const mockCoinMarketCapData = {
        data: {
          HBAR: {
            quote: {
              XAF: { price: 600 },
            },
          },
        },
      };
      expect(coinMarketCapParser(mockCoinMarketCapData)).toBe(1 / 600);

      const fallbackParser = DEFAULT_EXCHANGE_RATE_SOURCES[2].parser;
      const mockFallbackData = { rate: 0.000001 };
      expect(fallbackParser(mockFallbackData)).toBe(0.000001);
    });
  });

  describe("createExchangeRateService", () => {
    it("should create service with default configuration", () => {
      const service = createExchangeRateService("test-table");
      expect(service).toBeInstanceOf(ExchangeRateService);
    });

    it("should create service with custom overrides", () => {
      const service = createExchangeRateService("test-table", {
        cacheTimeout: 600,
        fees: {
          platformFeePercentage: 3.0,
          orangeMoneyFeePercentage: 2.0,
        },
      });
      expect(service).toBeInstanceOf(ExchangeRateService);
    });
  });

  describe("error handling", () => {
    it("should handle DynamoDB errors gracefully", async () => {
      mockGetItem.mockRejectedValue(new Error("DynamoDB connection error"));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rate: 0.000002 }),
      });
      mockPutItem.mockResolvedValue(undefined);

      const result = await service.getCurrentRate();
      expect(result.xafToHbar).toBe(0.000002);
    });

    it("should validate rate values", () => {
      const validateRate = (service as any).validateRate;

      expect(validateRate(0.000001)).toBe(true);
      expect(validateRate(1)).toBe(true);
      expect(validateRate(0)).toBe(false);
      expect(validateRate(-1)).toBe(false);
      expect(validateRate(Infinity)).toBe(false);
      expect(validateRate(NaN)).toBe(false);
    });
  });
});
