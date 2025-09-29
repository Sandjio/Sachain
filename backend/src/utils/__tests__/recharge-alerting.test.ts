import { CloudWatch, SNS } from "aws-sdk";
import {
  RechargeAlertingService,
  DEFAULT_ALERT_THRESHOLDS,
  AlertConfig,
  Alert,
} from "../recharge-alerting";
import { rechargeMetricsService } from "../recharge-metrics";

// Mock AWS SDK
jest.mock("aws-sdk");
jest.mock("../recharge-metrics");

const mockCloudWatch = {
  getMetricStatistics: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Datapoints: [{ Sum: 10, Average: 5000 }],
    }),
  }),
};

const mockSNS = {
  publish: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({ MessageId: "msg-123" }),
  }),
};

(CloudWatch as jest.MockedClass<typeof CloudWatch>).mockImplementation(
  () => mockCloudWatch as any
);
(SNS as jest.MockedClass<typeof SNS>).mockImplementation(() => mockSNS as any);

const mockRechargeMetricsService = rechargeMetricsService as jest.Mocked<
  typeof rechargeMetricsService
>;

describe("RechargeAlertingService", () => {
  let alertingService: RechargeAlertingService;
  let alertConfig: AlertConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    alertConfig = {
      snsTopicArn: "arn:aws:sns:us-east-1:123456789012:recharge-alerts",
      adminEmails: ["admin@sachain.com"],
      slackWebhookUrl: "https://hooks.slack.com/webhook",
      enabledAlerts: {
        rechargeFailures: true,
        performanceIssues: true,
        treasuryBalance: true,
        exchangeRateStale: true,
        systemErrors: true,
      },
    };

    alertingService = new RechargeAlertingService(
      DEFAULT_ALERT_THRESHOLDS,
      alertConfig
    );
  });

  describe("checkRechargeFailureRate", () => {
    it("should trigger warning alert when failure rate exceeds threshold", async () => {
      mockRechargeMetricsService.getRechargeSuccessRate.mockResolvedValue(90); // 10% failure rate

      await alertingService.checkRechargeFailureRate();

      expect(mockSNS.publish).toHaveBeenCalledWith({
        TopicArn: alertConfig.snsTopicArn,
        Subject: "[WARNING] High Recharge Failure Rate Detected",
        Message: expect.stringContaining("Recharge failure rate is 10.00%"),
      });
    });

    it("should trigger critical alert when failure rate is very high", async () => {
      mockRechargeMetricsService.getRechargeSuccessRate.mockResolvedValue(80); // 20% failure rate

      await alertingService.checkRechargeFailureRate();

      expect(mockSNS.publish).toHaveBeenCalledWith({
        TopicArn: alertConfig.snsTopicArn,
        Subject: "[CRITICAL] High Recharge Failure Rate Detected",
        Message: expect.stringContaining("Recharge failure rate is 20.00%"),
      });
    });

    it("should not trigger alert when failure rate is below threshold", async () => {
      mockRechargeMetricsService.getRechargeSuccessRate.mockResolvedValue(98); // 2% failure rate

      await alertingService.checkRechargeFailureRate();

      expect(mockSNS.publish).not.toHaveBeenCalled();
    });

    it("should not check when alerts are disabled", async () => {
      alertConfig.enabledAlerts.rechargeFailures = false;
      alertingService = new RechargeAlertingService(
        DEFAULT_ALERT_THRESHOLDS,
        alertConfig
      );

      await alertingService.checkRechargeFailureRate();

      expect(
        mockRechargeMetricsService.getRechargeSuccessRate
      ).not.toHaveBeenCalled();
      expect(mockSNS.publish).not.toHaveBeenCalled();
    });
  });

  describe("checkProcessingTime", () => {
    it("should trigger alert when processing time exceeds threshold", async () => {
      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Datapoints: [{ Average: 35000 }], // 35 seconds
        }),
      });

      await alertingService.checkProcessingTime();

      expect(mockSNS.publish).toHaveBeenCalledWith({
        TopicArn: alertConfig.snsTopicArn,
        Subject: "[WARNING] High Processing Time Detected",
        Message: expect.stringContaining("Average processing time is 35000ms"),
      });
    });

    it("should not trigger alert when processing time is acceptable", async () => {
      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Datapoints: [{ Average: 15000 }], // 15 seconds
        }),
      });

      await alertingService.checkProcessingTime();

      expect(mockSNS.publish).not.toHaveBeenCalled();
    });
  });

  describe("checkTreasuryBalance", () => {
    it("should trigger critical alert for critically low balance", async () => {
      const treasuryMetrics = {
        accountId: "0.0.123456",
        currentBalance: 50, // Below critical threshold of 100
        threshold: 1000,
        alertLevel: "critical" as const,
      };

      await alertingService.checkTreasuryBalance(treasuryMetrics);

      expect(mockSNS.publish).toHaveBeenCalledWith({
        TopicArn: alertConfig.snsTopicArn,
        Subject: "[CRITICAL] Critical Treasury Balance Alert",
        Message: expect.stringContaining(
          "Treasury balance is critically low: 50 HBAR"
        ),
      });
    });

    it("should trigger warning alert for low balance", async () => {
      const treasuryMetrics = {
        accountId: "0.0.123456",
        currentBalance: 500, // Below warning threshold of 1000 but above critical
        threshold: 1000,
        alertLevel: "warning" as const,
      };

      await alertingService.checkTreasuryBalance(treasuryMetrics);

      expect(mockSNS.publish).toHaveBeenCalledWith({
        TopicArn: alertConfig.snsTopicArn,
        Subject: "[WARNING] Low Treasury Balance Warning",
        Message: expect.stringContaining("Treasury balance is low: 500 HBAR"),
      });
    });

    it("should not trigger alert for normal balance", async () => {
      const treasuryMetrics = {
        accountId: "0.0.123456",
        currentBalance: 1500, // Above warning threshold
        threshold: 1000,
        alertLevel: "normal" as const,
      };

      await alertingService.checkTreasuryBalance(treasuryMetrics);

      expect(mockSNS.publish).not.toHaveBeenCalled();
    });
  });

  describe("checkExchangeRateStaleness", () => {
    it("should trigger alert when exchange rate is stale", async () => {
      const exchangeRateMetrics = {
        source: "CoinGecko",
        rate: 0.000025,
        lastUpdated: new Date(),
        stalenessMinutes: 10, // Above threshold of 5 minutes
        confidence: "low" as const,
      };

      await alertingService.checkExchangeRateStaleness(exchangeRateMetrics);

      expect(mockSNS.publish).toHaveBeenCalledWith({
        TopicArn: alertConfig.snsTopicArn,
        Subject: "[CRITICAL] Stale Exchange Rate Detected",
        Message: expect.stringContaining(
          "Exchange rate from CoinGecko is 10 minutes old"
        ),
      });
    });

    it("should not trigger alert when exchange rate is fresh", async () => {
      const exchangeRateMetrics = {
        source: "CoinGecko",
        rate: 0.000025,
        lastUpdated: new Date(),
        stalenessMinutes: 2, // Below threshold of 5 minutes
        confidence: "high" as const,
      };

      await alertingService.checkExchangeRateStaleness(exchangeRateMetrics);

      expect(mockSNS.publish).not.toHaveBeenCalled();
    });
  });

  describe("checkSystemErrors", () => {
    it("should trigger alert for high Orange Money error rate", async () => {
      // Mock error rate calculation
      mockCloudWatch.getMetricStatistics
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 5 }], // 5 errors
          }),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 100 }], // 100 total calls
          }),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 0 }], // 0 Hedera errors
          }),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 100 }], // 100 Hedera calls
          }),
        });

      await alertingService.checkSystemErrors();

      expect(mockSNS.publish).toHaveBeenCalledWith({
        TopicArn: alertConfig.snsTopicArn,
        Subject: "[WARNING] High Orange Money Error Rate",
        Message: expect.stringContaining(
          "Orange Money API error rate is 5.00%"
        ),
      });
    });

    it("should trigger alert for high Hedera error rate", async () => {
      // Mock error rate calculation
      mockCloudWatch.getMetricStatistics
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 0 }], // 0 OM errors
          }),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 100 }], // 100 OM calls
          }),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 3 }], // 3 Hedera errors
          }),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 100 }], // 100 Hedera calls
          }),
        });

      await alertingService.checkSystemErrors();

      expect(mockSNS.publish).toHaveBeenCalledWith({
        TopicArn: alertConfig.snsTopicArn,
        Subject: "[WARNING] High Hedera Operation Error Rate",
        Message: expect.stringContaining(
          "Hedera operation error rate is 3.00%"
        ),
      });
    });

    it("should not trigger alerts when error rates are acceptable", async () => {
      // Mock low error rates
      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Datapoints: [{ Sum: 0 }], // No errors
        }),
      });

      await alertingService.checkSystemErrors();

      expect(mockSNS.publish).not.toHaveBeenCalled();
    });
  });

  describe("alert formatting and delivery", () => {
    it("should format alert message correctly", async () => {
      const alert: Alert = {
        id: "test-alert-123",
        type: "warning",
        title: "Test Alert",
        message: "This is a test alert message",
        timestamp: new Date("2024-01-01T12:00:00Z"),
        currentValue: 10,
        threshold: 5,
        metrics: { testMetric: "testValue" },
      };

      // Trigger an alert by mocking high failure rate
      mockRechargeMetricsService.getRechargeSuccessRate.mockResolvedValue(90);
      await alertingService.checkRechargeFailureRate();

      const publishCall = mockSNS.publish.mock.calls[0][0];
      expect(publishCall.Message).toContain(
        "Alert: High Recharge Failure Rate Detected"
      );
      expect(publishCall.Message).toContain("Type: WARNING");
      expect(publishCall.Message).toContain("Current Value: 10");
      expect(publishCall.Message).toContain("Threshold: 5");
    });

    it("should handle SNS publish errors gracefully", async () => {
      mockSNS.publish.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("SNS error")),
      });

      mockRechargeMetricsService.getRechargeSuccessRate.mockResolvedValue(90);

      // Should not throw error
      await expect(
        alertingService.checkRechargeFailureRate()
      ).resolves.toBeUndefined();
    });
  });

  describe("alert thresholds validation", () => {
    it("should use custom thresholds when provided", () => {
      const customThresholds = {
        ...DEFAULT_ALERT_THRESHOLDS,
        rechargeFailureRatePercent: 10, // Custom threshold
      };

      const customAlertingService = new RechargeAlertingService(
        customThresholds,
        alertConfig
      );
      expect(customAlertingService).toBeDefined();
    });

    it("should use default thresholds when not overridden", () => {
      expect(DEFAULT_ALERT_THRESHOLDS.rechargeFailureRatePercent).toBe(5);
      expect(DEFAULT_ALERT_THRESHOLDS.averageProcessingTimeMs).toBe(30000);
      expect(DEFAULT_ALERT_THRESHOLDS.treasuryBalanceWarningHBAR).toBe(1000);
      expect(DEFAULT_ALERT_THRESHOLDS.treasuryBalanceCriticalHBAR).toBe(100);
      expect(DEFAULT_ALERT_THRESHOLDS.exchangeRateStaleMinutes).toBe(5);
    });
  });
});
