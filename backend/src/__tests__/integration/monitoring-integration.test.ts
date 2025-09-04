import { CloudWatch, SNS } from "aws-sdk";
import {
  RechargeMetricsService,
  RechargeMetrics,
  OrangeMoneyMetrics,
  HederaMetrics,
  TreasuryMetrics,
  ExchangeRateMetrics,
} from "../../utils/recharge-metrics";
import {
  RechargeAlertingService,
  DEFAULT_ALERT_THRESHOLDS,
  AlertConfig,
} from "../../utils/recharge-alerting";
import { CloudWatchDashboardService } from "../../utils/cloudwatch-dashboard";
import { CloudWatchAlarmsService } from "../../utils/cloudwatch-alarms";

// Mock AWS SDK
jest.mock("aws-sdk");

const mockCloudWatch = {
  putMetricData: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
  getMetricStatistics: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Datapoints: [],
    }),
  }),
  putDashboard: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
  putMetricAlarm: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
  describeAlarms: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      MetricAlarms: [{ StateValue: "OK" }],
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

describe("Monitoring Integration Tests", () => {
  let metricsService: RechargeMetricsService;
  let alertingService: RechargeAlertingService;
  let dashboardService: CloudWatchDashboardService;
  let alarmsService: CloudWatchAlarmsService;
  let alertConfig: AlertConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    alertConfig = {
      snsTopicArn: "arn:aws:sns:us-east-1:123456789012:recharge-alerts",
      adminEmails: ["admin@sachain.com"],
      enabledAlerts: {
        rechargeFailures: true,
        performanceIssues: true,
        treasuryBalance: true,
        exchangeRateStale: true,
        systemErrors: true,
      },
    };

    metricsService = new RechargeMetricsService();
    alertingService = new RechargeAlertingService(
      DEFAULT_ALERT_THRESHOLDS,
      alertConfig
    );
    dashboardService = new CloudWatchDashboardService();
    alarmsService = new CloudWatchAlarmsService(alertConfig.snsTopicArn);
  });

  describe("End-to-End Monitoring Flow", () => {
    it("should record metrics, trigger alerts, and update dashboard", async () => {
      // Step 1: Record various metrics
      const rechargeMetrics: RechargeMetrics = {
        transactionId: "txn-123",
        userId: "user-456",
        xafAmount: 10000,
        hbarAmount: 0.25,
        processingTimeMs: 35000, // Above threshold
        status: "failed", // Will contribute to failure rate
        errorType: "PAYMENT_FAILED",
        stage: "payment",
      };

      const omMetrics: OrangeMoneyMetrics = {
        transactionId: "txn-123",
        responseTimeMs: 6000, // Above threshold
        status: "failed",
        errorCode: "TIMEOUT",
        amount: 10000,
      };

      const hederaMetrics: HederaMetrics = {
        transactionId: "txn-123",
        operationType: "transfer",
        responseTimeMs: 8000, // Above threshold
        status: "failed",
        errorType: "NETWORK_ERROR",
      };

      const treasuryMetrics: TreasuryMetrics = {
        accountId: "0.0.123456",
        currentBalance: 50, // Below critical threshold
        threshold: 1000,
        alertLevel: "critical",
      };

      const exchangeRateMetrics: ExchangeRateMetrics = {
        source: "CoinGecko",
        rate: 0.000025,
        lastUpdated: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        stalenessMinutes: 10, // Above threshold
        confidence: "low",
      };

      // Record all metrics
      await Promise.all([
        metricsService.recordRechargeTransaction(rechargeMetrics),
        metricsService.recordOrangeMoneyMetrics(omMetrics),
        metricsService.recordHederaMetrics(hederaMetrics),
        metricsService.recordTreasuryBalance(treasuryMetrics),
        metricsService.recordExchangeRateMetrics(exchangeRateMetrics),
      ]);

      // Verify metrics were recorded
      expect(mockCloudWatch.putMetricData).toHaveBeenCalledTimes(5);

      // Step 2: Check alerts (simulate high failure rate)
      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Datapoints: [{ Sum: 80, Average: 35000 }], // 80% failure rate, 35s avg time
        }),
      });

      await Promise.all([
        alertingService.checkRechargeFailureRate(),
        alertingService.checkProcessingTime(),
        alertingService.checkTreasuryBalance(treasuryMetrics),
        alertingService.checkExchangeRateStaleness(exchangeRateMetrics),
        alertingService.checkSystemErrors(),
      ]);

      // Verify alerts were triggered
      expect(mockSNS.publish).toHaveBeenCalled();

      // Step 3: Create dashboard and alarms
      await dashboardService.createRechargeDashboard();
      await alarmsService.createAllRechargeAlarms();

      // Verify infrastructure was created
      expect(mockCloudWatch.putDashboard).toHaveBeenCalledTimes(1);
      expect(mockCloudWatch.putMetricAlarm).toHaveBeenCalledTimes(12);
    });
  });

  describe("Alert Threshold Verification", () => {
    it("should trigger alerts when metrics exceed thresholds", async () => {
      // Test failure rate threshold
      mockCloudWatch.getMetricStatistics
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 90 }], // 90 successful
          }),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 100 }], // 100 total
          }),
        });

      await alertingService.checkRechargeFailureRate();

      // 10% failure rate should trigger alert (threshold is 5%)
      expect(mockSNS.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          Subject: expect.stringContaining("High Recharge Failure Rate"),
          Message: expect.stringContaining("10.00%"),
        })
      );
    });

    it("should trigger processing time alert when threshold exceeded", async () => {
      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Datapoints: [{ Average: 45000 }], // 45 seconds
        }),
      });

      await alertingService.checkProcessingTime();

      // Should trigger alert (threshold is 30 seconds)
      expect(mockSNS.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          Subject: expect.stringContaining("High Processing Time"),
          Message: expect.stringContaining("45000ms"),
        })
      );
    });

    it("should trigger treasury balance alerts at correct thresholds", async () => {
      // Test critical threshold
      const criticalMetrics: TreasuryMetrics = {
        accountId: "0.0.123456",
        currentBalance: 50, // Below 100 HBAR critical threshold
        threshold: 1000,
        alertLevel: "critical",
      };

      await alertingService.checkTreasuryBalance(criticalMetrics);

      expect(mockSNS.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          Subject: expect.stringContaining("Critical Treasury Balance"),
          Message: expect.stringContaining("50 HBAR"),
        })
      );

      jest.clearAllMocks();

      // Test warning threshold
      const warningMetrics: TreasuryMetrics = {
        accountId: "0.0.123456",
        currentBalance: 500, // Below 1000 HBAR warning threshold
        threshold: 1000,
        alertLevel: "warning",
      };

      await alertingService.checkTreasuryBalance(warningMetrics);

      expect(mockSNS.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          Subject: expect.stringContaining("Low Treasury Balance"),
          Message: expect.stringContaining("500 HBAR"),
        })
      );
    });

    it("should trigger exchange rate staleness alert", async () => {
      const staleMetrics: ExchangeRateMetrics = {
        source: "CoinGecko",
        rate: 0.000025,
        lastUpdated: new Date(),
        stalenessMinutes: 15, // Above 5 minute threshold
        confidence: "low",
      };

      await alertingService.checkExchangeRateStaleness(staleMetrics);

      expect(mockSNS.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          Subject: expect.stringContaining("Stale Exchange Rate"),
          Message: expect.stringContaining("15 minutes old"),
        })
      );
    });
  });

  describe("Metric Accuracy Verification", () => {
    it("should record accurate recharge transaction metrics", async () => {
      const metrics: RechargeMetrics = {
        transactionId: "txn-accuracy-test",
        userId: "user-test",
        xafAmount: 50000,
        hbarAmount: 1.25,
        processingTimeMs: 15000,
        status: "success",
        stage: "transfer",
      };

      await metricsService.recordRechargeTransaction(metrics);

      const putMetricCall = mockCloudWatch.putMetricData.mock.calls[0][0];
      expect(putMetricCall.Namespace).toBe("Sachain/HBARRecharge");

      const metricData = putMetricCall.MetricData;

      // Verify transaction count metric
      const transactionCountMetric = metricData.find(
        (m: any) => m.MetricName === "RechargeTransactionCount"
      );
      expect(transactionCountMetric.Value).toBe(1);
      expect(transactionCountMetric.Dimensions).toContainEqual({
        Name: "Status",
        Value: "success",
      });

      // Verify processing time metric
      const processingTimeMetric = metricData.find(
        (m: any) => m.MetricName === "RechargeProcessingTime"
      );
      expect(processingTimeMetric.Value).toBe(15000);

      // Verify volume metrics
      const xafVolumeMetric = metricData.find(
        (m: any) => m.MetricName === "RechargeVolume"
      );
      expect(xafVolumeMetric.Value).toBe(50000);

      const hbarVolumeMetric = metricData.find(
        (m: any) => m.MetricName === "HBARVolume"
      );
      expect(hbarVolumeMetric.Value).toBe(1.25);
    });

    it("should record accurate Orange Money API metrics", async () => {
      const metrics: OrangeMoneyMetrics = {
        transactionId: "om-accuracy-test",
        responseTimeMs: 2500,
        status: "success",
        amount: 25000,
      };

      await metricsService.recordOrangeMoneyMetrics(metrics);

      const putMetricCall = mockCloudWatch.putMetricData.mock.calls[0][0];
      const metricData = putMetricCall.MetricData;

      // Verify response time metric
      const responseTimeMetric = metricData.find(
        (m: any) => m.MetricName === "OrangeMoneyAPIResponseTime"
      );
      expect(responseTimeMetric.Value).toBe(2500);
      expect(responseTimeMetric.Unit).toBe("Milliseconds");

      // Verify call count metric
      const callCountMetric = metricData.find(
        (m: any) => m.MetricName === "OrangeMoneyAPICallCount"
      );
      expect(callCountMetric.Value).toBe(1);
    });

    it("should record accurate Hedera operation metrics", async () => {
      const metrics: HederaMetrics = {
        transactionId: "hedera-accuracy-test",
        operationType: "transfer",
        responseTimeMs: 3000,
        status: "success",
        networkFee: 0.001,
      };

      await metricsService.recordHederaMetrics(metrics);

      const putMetricCall = mockCloudWatch.putMetricData.mock.calls[0][0];
      const metricData = putMetricCall.MetricData;

      // Verify operation response time
      const responseTimeMetric = metricData.find(
        (m: any) => m.MetricName === "HederaOperationResponseTime"
      );
      expect(responseTimeMetric.Value).toBe(3000);
      expect(responseTimeMetric.Dimensions).toContainEqual({
        Name: "OperationType",
        Value: "transfer",
      });

      // Verify network fee metric
      const networkFeeMetric = metricData.find(
        (m: any) => m.MetricName === "HederaNetworkFees"
      );
      expect(networkFeeMetric.Value).toBe(0.001);
    });

    it("should calculate success rate accurately", async () => {
      // Mock successful and total transaction counts
      mockCloudWatch.getMetricStatistics
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 95 }], // 95 successful
          }),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 100 }], // 100 total
          }),
        });

      const successRate = await metricsService.getRechargeSuccessRate(60);

      expect(successRate).toBe(95);
      expect(mockCloudWatch.getMetricStatistics).toHaveBeenCalledTimes(2);

      // Verify the metric queries
      const calls = mockCloudWatch.getMetricStatistics.mock.calls;
      expect(calls[0][0].Dimensions).toContainEqual({
        Name: "Status",
        Value: "success",
      });
      expect(calls[1][0].Dimensions).toEqual([]);
    });
  });

  describe("Dashboard Configuration Verification", () => {
    it("should create dashboard with all required widgets", async () => {
      await dashboardService.createRechargeDashboard();

      expect(mockCloudWatch.putDashboard).toHaveBeenCalledWith({
        DashboardName: "HBAR-Recharge-System",
        DashboardBody: expect.any(String),
      });

      const dashboardBody = JSON.parse(
        mockCloudWatch.putDashboard.mock.calls[0][0].DashboardBody
      );

      // Verify all required widgets are present
      const widgetTitles = dashboardBody.widgets.map(
        (w: any) => w.properties.title
      );

      const expectedWidgets = [
        "Recharge Success Rate",
        "Transaction Volume",
        "Average Processing Time",
        "Treasury Balance (HBAR)",
        "Orange Money API Performance",
        "Hedera Network Performance",
        "Error Rates",
        "Exchange Rate & Staleness",
        "System Health",
        "Active Transactions",
        "Recent Alerts",
        "Hourly Transaction Trends",
        "Daily Transaction Trends",
      ];

      expectedWidgets.forEach((expectedWidget) => {
        expect(widgetTitles).toContain(expectedWidget);
      });
    });
  });

  describe("Alarm Configuration Verification", () => {
    it("should create all required alarms with correct thresholds", async () => {
      await alarmsService.createAllRechargeAlarms();

      expect(mockCloudWatch.putMetricAlarm).toHaveBeenCalledTimes(12);

      const alarmCalls = mockCloudWatch.putMetricAlarm.mock.calls;
      const alarmNames = alarmCalls.map((call) => call[0].AlarmName);

      // Verify all expected alarms are created
      const expectedAlarms = [
        "HBAR-Recharge-High-Failure-Rate",
        "HBAR-Recharge-High-Processing-Time",
        "HBAR-Treasury-Balance-Warning",
        "HBAR-Treasury-Balance-Critical",
        "HBAR-Exchange-Rate-Stale",
        "HBAR-Orange-Money-High-Error-Rate",
        "HBAR-Orange-Money-High-Response-Time",
        "HBAR-Hedera-High-Error-Rate",
        "HBAR-Hedera-High-Response-Time",
        "HBAR-Recharge-Handler-Errors",
        "HBAR-Conversion-Handler-Errors",
        "HBAR-DynamoDB-Errors",
      ];

      expectedAlarms.forEach((expectedAlarm) => {
        expect(alarmNames).toContain(expectedAlarm);
      });

      // Verify threshold accuracy for key alarms
      const failureRateAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Recharge-High-Failure-Rate"
      );
      expect(failureRateAlarm[0].Threshold).toBe(
        DEFAULT_ALERT_THRESHOLDS.rechargeFailureRatePercent
      );

      const processingTimeAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Recharge-High-Processing-Time"
      );
      expect(processingTimeAlarm[0].Threshold).toBe(
        DEFAULT_ALERT_THRESHOLDS.averageProcessingTimeMs
      );
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should handle CloudWatch service errors gracefully", async () => {
      mockCloudWatch.putMetricData.mockReturnValue({
        promise: jest
          .fn()
          .mockRejectedValue(new Error("CloudWatch unavailable")),
      });

      const metrics: RechargeMetrics = {
        transactionId: "error-test",
        userId: "user-test",
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

    it("should handle SNS service errors gracefully", async () => {
      mockSNS.publish.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("SNS unavailable")),
      });

      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Datapoints: [{ Sum: 80 }, { Sum: 100 }], // High failure rate
        }),
      });

      // Should not throw error
      await expect(
        alertingService.checkRechargeFailureRate()
      ).resolves.toBeUndefined();
    });

    it("should handle missing metric data gracefully", async () => {
      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Datapoints: [], // No data
        }),
      });

      const successRate = await metricsService.getRechargeSuccessRate(60);
      expect(successRate).toBe(0);

      // Should not trigger alerts when no data
      await alertingService.checkRechargeFailureRate();
      expect(mockSNS.publish).not.toHaveBeenCalled();
    });
  });
});
