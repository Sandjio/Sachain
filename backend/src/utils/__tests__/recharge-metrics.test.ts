import { CloudWatch } from "aws-sdk";
import {
  RechargeMetricsService,
  RechargeMetrics,
  OrangeMoneyMetrics,
  HederaMetrics,
  TreasuryMetrics,
  ExchangeRateMetrics,
} from "../recharge-metrics";

// Mock AWS SDK
jest.mock("aws-sdk");
const mockCloudWatch = {
  putMetricData: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
  getMetricStatistics: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Datapoints: [
        { Sum: 10, Timestamp: new Date() },
        { Sum: 15, Timestamp: new Date() },
      ],
    }),
  }),
};

(CloudWatch as jest.MockedClass<typeof CloudWatch>).mockImplementation(
  () => mockCloudWatch as any
);

describe("RechargeMetricsService", () => {
  let metricsService: RechargeMetricsService;

  beforeEach(() => {
    jest.clearAllMocks();
    metricsService = new RechargeMetricsService();
  });

  describe("recordRechargeTransaction", () => {
    it("should record successful recharge transaction metrics", async () => {
      const metrics: RechargeMetrics = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        hbarAmount: 0.25,
        processingTimeMs: 5000,
        status: "success",
        stage: "transfer",
      };

      await metricsService.recordRechargeTransaction(metrics);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "Sachain/HBARRecharge",
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: "RechargeTransactionCount",
            Value: 1,
            Unit: "Count",
            Dimensions: [
              { Name: "Status", Value: "success" },
              { Name: "Stage", Value: "transfer" },
            ],
          }),
          expect.objectContaining({
            MetricName: "RechargeProcessingTime",
            Value: 5000,
            Unit: "Milliseconds",
          }),
          expect.objectContaining({
            MetricName: "RechargeVolume",
            Value: 10000,
            Unit: "Count",
          }),
          expect.objectContaining({
            MetricName: "HBARVolume",
            Value: 0.25,
            Unit: "Count",
          }),
        ]),
      });
    });

    it("should record failed recharge transaction with error metrics", async () => {
      const metrics: RechargeMetrics = {
        transactionId: "txn-124",
        userId: "user-456",
        xafAmount: 5000,
        processingTimeMs: 2000,
        status: "failed",
        errorType: "PAYMENT_FAILED",
        stage: "payment",
      };

      await metricsService.recordRechargeTransaction(metrics);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "Sachain/HBARRecharge",
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: "RechargeErrors",
            Value: 1,
            Unit: "Count",
            Dimensions: [
              { Name: "ErrorType", Value: "PAYMENT_FAILED" },
              { Name: "Stage", Value: "payment" },
            ],
          }),
        ]),
      });
    });

    it("should handle CloudWatch errors gracefully", async () => {
      mockCloudWatch.putMetricData.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("CloudWatch error")),
      });

      const metrics: RechargeMetrics = {
        transactionId: "txn-125",
        userId: "user-456",
        xafAmount: 1000,
        processingTimeMs: 1000,
        status: "success",
        stage: "payment",
      };

      // Should not throw error
      await expect(
        metricsService.recordRechargeTransaction(metrics)
      ).resolves.toBeUndefined();
    });
  });

  describe("recordOrangeMoneyMetrics", () => {
    it("should record Orange Money API metrics", async () => {
      const metrics: OrangeMoneyMetrics = {
        transactionId: "txn-123",
        responseTimeMs: 1500,
        status: "success",
        amount: 10000,
      };

      await metricsService.recordOrangeMoneyMetrics(metrics);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "Sachain/HBARRecharge",
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: "OrangeMoneyAPIResponseTime",
            Value: 1500,
            Unit: "Milliseconds",
          }),
          expect.objectContaining({
            MetricName: "OrangeMoneyAPICallCount",
            Value: 1,
            Unit: "Count",
          }),
        ]),
      });
    });

    it("should record Orange Money API errors", async () => {
      const metrics: OrangeMoneyMetrics = {
        transactionId: "txn-124",
        responseTimeMs: 3000,
        status: "failed",
        errorCode: "INSUFFICIENT_BALANCE",
        amount: 5000,
      };

      await metricsService.recordOrangeMoneyMetrics(metrics);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "Sachain/HBARRecharge",
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: "OrangeMoneyAPIErrors",
            Value: 1,
            Unit: "Count",
            Dimensions: [{ Name: "ErrorCode", Value: "INSUFFICIENT_BALANCE" }],
          }),
        ]),
      });
    });
  });

  describe("recordHederaMetrics", () => {
    it("should record Hedera operation metrics", async () => {
      const metrics: HederaMetrics = {
        transactionId: "txn-123",
        operationType: "transfer",
        responseTimeMs: 2000,
        status: "success",
        networkFee: 0.001,
      };

      await metricsService.recordHederaMetrics(metrics);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "Sachain/HBARRecharge",
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: "HederaOperationResponseTime",
            Value: 2000,
            Unit: "Milliseconds",
          }),
          expect.objectContaining({
            MetricName: "HederaNetworkFees",
            Value: 0.001,
            Unit: "Count",
          }),
        ]),
      });
    });

    it("should record Hedera operation errors", async () => {
      const metrics: HederaMetrics = {
        transactionId: "txn-124",
        operationType: "account_validation",
        responseTimeMs: 5000,
        status: "failed",
        errorType: "INVALID_ACCOUNT",
      };

      await metricsService.recordHederaMetrics(metrics);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "Sachain/HBARRecharge",
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: "HederaOperationErrors",
            Value: 1,
            Unit: "Count",
            Dimensions: [
              { Name: "ErrorType", Value: "INVALID_ACCOUNT" },
              { Name: "OperationType", Value: "account_validation" },
            ],
          }),
        ]),
      });
    });
  });

  describe("recordTreasuryBalance", () => {
    it("should record treasury balance metrics", async () => {
      const metrics: TreasuryMetrics = {
        accountId: "0.0.123456",
        currentBalance: 1500,
        threshold: 1000,
        alertLevel: "normal",
      };

      await metricsService.recordTreasuryBalance(metrics);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "Sachain/HBARRecharge",
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: "TreasuryBalance",
            Value: 1500,
            Unit: "Count",
          }),
          expect.objectContaining({
            MetricName: "TreasuryBalanceRatio",
            Value: 1.5,
            Unit: "None",
          }),
        ]),
      });
    });
  });

  describe("recordExchangeRateMetrics", () => {
    it("should record exchange rate metrics", async () => {
      const metrics: ExchangeRateMetrics = {
        source: "CoinGecko",
        rate: 0.000025,
        lastUpdated: new Date(),
        stalenessMinutes: 2,
        confidence: "high",
      };

      await metricsService.recordExchangeRateMetrics(metrics);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: "Sachain/HBARRecharge",
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: "ExchangeRate",
            Value: 0.000025,
            Unit: "None",
          }),
          expect.objectContaining({
            MetricName: "ExchangeRateStaleness",
            Value: 2,
            Unit: "Count",
          }),
        ]),
      });
    });
  });

  describe("getRechargeSuccessRate", () => {
    it("should calculate success rate correctly", async () => {
      // Mock successful transactions
      mockCloudWatch.getMetricStatistics
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 95 }], // 95 successful transactions
          }),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 100 }], // 100 total transactions
          }),
        });

      const successRate = await metricsService.getRechargeSuccessRate(60);

      expect(successRate).toBe(95);
      expect(mockCloudWatch.getMetricStatistics).toHaveBeenCalledTimes(2);
    });

    it("should return 0 when no transactions exist", async () => {
      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Datapoints: [],
        }),
      });

      const successRate = await metricsService.getRechargeSuccessRate(60);

      expect(successRate).toBe(0);
    });

    it("should handle CloudWatch errors gracefully", async () => {
      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("CloudWatch error")),
      });

      const successRate = await metricsService.getRechargeSuccessRate(60);

      expect(successRate).toBe(0);
    });
  });
});
