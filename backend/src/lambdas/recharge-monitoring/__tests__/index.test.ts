import { ScheduledEvent, Context } from "aws-lambda";
import { handler } from "../index";
import { RechargeAlertingService } from "../../../utils/recharge-alerting";
import { rechargeMetricsService } from "../../../utils/recharge-metrics";
import { cloudWatchDashboardService } from "../../../utils/cloudwatch-dashboard";
import { createCloudWatchAlarmsService } from "../../../utils/cloudwatch-alarms";

// Mock dependencies
jest.mock("../../../utils/recharge-alerting");
jest.mock("../../../utils/recharge-metrics");
jest.mock("../../../utils/cloudwatch-dashboard");
jest.mock("../../../utils/cloudwatch-alarms");

const mockAlertingService = {
  checkRechargeFailureRate: jest.fn().mockResolvedValue(undefined),
  checkProcessingTime: jest.fn().mockResolvedValue(undefined),
  checkSystemErrors: jest.fn().mockResolvedValue(undefined),
  checkTreasuryBalance: jest.fn().mockResolvedValue(undefined),
  checkExchangeRateStaleness: jest.fn().mockResolvedValue(undefined),
};

const mockRechargeMetricsService = {
  recordTreasuryBalance: jest.fn().mockResolvedValue(undefined),
  recordExchangeRateMetrics: jest.fn().mockResolvedValue(undefined),
};

const mockDashboardService = {
  createRechargeDashboard: jest.fn().mockResolvedValue(undefined),
  deleteDashboard: jest.fn().mockResolvedValue(undefined),
};

const mockAlarmsService = {
  createAllRechargeAlarms: jest.fn().mockResolvedValue(undefined),
  deleteAllRechargeAlarms: jest.fn().mockResolvedValue(undefined),
};

(
  RechargeAlertingService as jest.MockedClass<typeof RechargeAlertingService>
).mockImplementation(() => mockAlertingService as any);
(rechargeMetricsService as any).recordTreasuryBalance =
  mockRechargeMetricsService.recordTreasuryBalance;
(rechargeMetricsService as any).recordExchangeRateMetrics =
  mockRechargeMetricsService.recordExchangeRateMetrics;
(cloudWatchDashboardService as any).createRechargeDashboard =
  mockDashboardService.createRechargeDashboard;
(cloudWatchDashboardService as any).deleteDashboard =
  mockDashboardService.deleteDashboard;
(
  createCloudWatchAlarmsService as jest.MockedFunction<
    typeof createCloudWatchAlarmsService
  >
).mockReturnValue(mockAlarmsService as any);

describe("Recharge Monitoring Lambda", () => {
  let mockEvent: ScheduledEvent;
  let mockContext: Context;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.ALERT_SNS_TOPIC_ARN =
      "arn:aws:sns:us-east-1:123456789012:recharge-alerts";
    process.env.ADMIN_EMAILS = "admin1@sachain.com,admin2@sachain.com";
    process.env.HEDERA_TREASURY_ACCOUNT_ID = "0.0.123456";
    process.env.ENABLE_RECHARGE_FAILURE_ALERTS = "true";
    process.env.ENABLE_PERFORMANCE_ALERTS = "true";
    process.env.ENABLE_TREASURY_ALERTS = "true";
    process.env.ENABLE_EXCHANGE_RATE_ALERTS = "true";
    process.env.ENABLE_SYSTEM_ERROR_ALERTS = "true";

    mockEvent = {
      version: "0",
      id: "event-id",
      "detail-type": "Scheduled Event",
      source: "aws.events",
      account: "123456789012",
      time: "2024-01-01T12:00:00Z",
      region: "us-east-1",
      detail: {},
      resources: [
        "arn:aws:events:us-east-1:123456789012:rule/recharge-monitoring",
      ],
    };

    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "recharge-monitoring",
      functionVersion: "$LATEST",
      invokedFunctionArn:
        "arn:aws:lambda:us-east-1:123456789012:function:recharge-monitoring",
      memoryLimitInMB: "128",
      awsRequestId: "request-123",
      logGroupName: "/aws/lambda/recharge-monitoring",
      logStreamName: "2024/01/01/[$LATEST]stream",
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ALERT_SNS_TOPIC_ARN;
    delete process.env.ADMIN_EMAILS;
    delete process.env.HEDERA_TREASURY_ACCOUNT_ID;
    delete process.env.ENABLE_RECHARGE_FAILURE_ALERTS;
    delete process.env.ENABLE_PERFORMANCE_ALERTS;
    delete process.env.ENABLE_TREASURY_ALERTS;
    delete process.env.ENABLE_EXCHANGE_RATE_ALERTS;
    delete process.env.ENABLE_SYSTEM_ERROR_ALERTS;
  });

  describe("successful monitoring execution", () => {
    it("should execute all monitoring checks successfully", async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: "Monitoring operation completed successfully",
        eventType: "Scheduled Event",
        timestamp: expect.any(String),
        requestId: "request-123",
      });

      // Verify all alerting service methods were called
      expect(
        mockAlertingService.checkRechargeFailureRate
      ).toHaveBeenCalledTimes(1);
      expect(mockAlertingService.checkProcessingTime).toHaveBeenCalledTimes(1);
      expect(mockAlertingService.checkSystemErrors).toHaveBeenCalledTimes(1);

      // Verify metrics recording was called
      expect(
        mockRechargeMetricsService.recordTreasuryBalance
      ).toHaveBeenCalledWith({
        accountId: "0.0.123456",
        currentBalance: expect.any(Number),
        threshold: expect.any(Number),
        alertLevel: expect.stringMatching(/^(normal|warning|critical)$/),
      });

      expect(
        mockRechargeMetricsService.recordExchangeRateMetrics
      ).toHaveBeenCalledWith({
        source: expect.any(String),
        rate: expect.any(Number),
        lastUpdated: expect.any(Date),
        stalenessMinutes: expect.any(Number),
        confidence: expect.stringMatching(/^(high|medium|low)$/),
      });
    });

    it("should handle partial failures gracefully", async () => {
      // Mock one check to fail
      mockAlertingService.checkRechargeFailureRate.mockRejectedValue(
        new Error("Check failed")
      );

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toBe(
        "Monitoring check completed successfully"
      );

      // Other checks should still be called
      expect(mockAlertingService.checkProcessingTime).toHaveBeenCalledTimes(1);
      expect(mockAlertingService.checkSystemErrors).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should handle complete failure gracefully", async () => {
      // Mock all checks to fail
      const error = new Error("System failure");
      mockAlertingService.checkRechargeFailureRate.mockRejectedValue(error);
      mockAlertingService.checkProcessingTime.mockRejectedValue(error);
      mockAlertingService.checkSystemErrors.mockRejectedValue(error);
      mockRechargeMetricsService.recordTreasuryBalance.mockRejectedValue(error);
      mockRechargeMetricsService.recordExchangeRateMetrics.mockRejectedValue(
        error
      );

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: "Monitoring operation failed",
        error: expect.any(String),
        timestamp: expect.any(String),
        requestId: "request-123",
      });
    });

    it("should handle missing environment variables", async () => {
      delete process.env.ALERT_SNS_TOPIC_ARN;
      delete process.env.HEDERA_TREASURY_ACCOUNT_ID;

      const result = await handler(mockEvent, mockContext);

      // Should still complete but with empty/default values
      expect(result.statusCode).toBe(200);
    });
  });

  describe("configuration handling", () => {
    it("should use custom thresholds from environment variables", async () => {
      process.env.FAILURE_RATE_THRESHOLD = "10";
      process.env.PROCESSING_TIME_THRESHOLD = "60000";
      process.env.TREASURY_WARNING_THRESHOLD = "2000";
      process.env.TREASURY_CRITICAL_THRESHOLD = "200";
      process.env.EXCHANGE_RATE_STALE_THRESHOLD = "10";

      await handler(mockEvent, mockContext);

      // Verify RechargeAlertingService was instantiated with custom thresholds
      expect(RechargeAlertingService).toHaveBeenCalledWith(
        expect.objectContaining({
          rechargeFailureRatePercent: 10,
          averageProcessingTimeMs: 60000,
          treasuryBalanceWarningHBAR: 2000,
          treasuryBalanceCriticalHBAR: 200,
          exchangeRateStaleMinutes: 10,
        }),
        expect.any(Object)
      );
    });

    it("should parse admin emails correctly", async () => {
      process.env.ADMIN_EMAILS =
        "admin1@test.com,admin2@test.com,admin3@test.com";

      await handler(mockEvent, mockContext);

      expect(RechargeAlertingService).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          adminEmails: [
            "admin1@test.com",
            "admin2@test.com",
            "admin3@test.com",
          ],
        })
      );
    });

    it("should handle disabled alerts", async () => {
      process.env.ENABLE_RECHARGE_FAILURE_ALERTS = "false";
      process.env.ENABLE_PERFORMANCE_ALERTS = "false";

      await handler(mockEvent, mockContext);

      expect(RechargeAlertingService).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          enabledAlerts: expect.objectContaining({
            rechargeFailures: false,
            performanceIssues: false,
            treasuryBalance: true, // Should still be true
            exchangeRateStale: true,
            systemErrors: true,
          }),
        })
      );
    });
  });

  describe("treasury balance simulation", () => {
    it("should generate realistic treasury balance values", async () => {
      await handler(mockEvent, mockContext);

      const recordCall =
        mockRechargeMetricsService.recordTreasuryBalance.mock.calls[0][0];
      expect(recordCall.currentBalance).toBeGreaterThanOrEqual(0);
      expect(recordCall.currentBalance).toBeLessThanOrEqual(2000);
      expect(recordCall.accountId).toBe("0.0.123456");
    });

    it("should set correct alert levels based on balance", async () => {
      // Run multiple times to test different balance scenarios
      for (let i = 0; i < 10; i++) {
        mockRechargeMetricsService.recordTreasuryBalance.mockClear();
        await handler(mockEvent, mockContext);

        const recordCall =
          mockRechargeMetricsService.recordTreasuryBalance.mock.calls[0][0];
        const { currentBalance, alertLevel } = recordCall;

        if (currentBalance < 100) {
          expect(alertLevel).toBe("critical");
        } else if (currentBalance < 1000) {
          expect(alertLevel).toBe("warning");
        } else {
          expect(alertLevel).toBe("normal");
        }
      }
    });
  });

  describe("exchange rate simulation", () => {
    it("should generate realistic exchange rate values", async () => {
      await handler(mockEvent, mockContext);

      const recordCall =
        mockRechargeMetricsService.recordExchangeRateMetrics.mock.calls[0][0];
      expect(recordCall.rate).toBeGreaterThan(0);
      expect(recordCall.source).toBe("CoinGecko");
      expect(recordCall.stalenessMinutes).toBeGreaterThanOrEqual(0);
      expect(recordCall.stalenessMinutes).toBeLessThanOrEqual(10);
      expect(["high", "medium", "low"]).toContain(recordCall.confidence);
    });

    it("should correlate confidence with staleness", async () => {
      // Run multiple times to test correlation
      for (let i = 0; i < 10; i++) {
        mockRechargeMetricsService.recordExchangeRateMetrics.mockClear();
        await handler(mockEvent, mockContext);

        const recordCall =
          mockRechargeMetricsService.recordExchangeRateMetrics.mock.calls[0][0];
        const { stalenessMinutes, confidence } = recordCall;

        if (stalenessMinutes < 2) {
          expect(confidence).toBe("high");
        } else if (stalenessMinutes < 5) {
          expect(confidence).toBe("medium");
        } else {
          expect(confidence).toBe("low");
        }
      }
    });
  });

  describe("infrastructure management", () => {
    it("should setup monitoring infrastructure when requested", async () => {
      mockEvent["detail-type"] = "setup-infrastructure";

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: "Monitoring operation completed successfully",
        eventType: "setup-infrastructure",
        timestamp: expect.any(String),
        requestId: "request-123",
      });

      // Verify infrastructure setup was called
      expect(
        mockDashboardService.createRechargeDashboard
      ).toHaveBeenCalledTimes(1);
      expect(mockAlarmsService.createAllRechargeAlarms).toHaveBeenCalledTimes(
        1
      );

      // Verify monitoring checks were NOT called
      expect(
        mockAlertingService.checkRechargeFailureRate
      ).not.toHaveBeenCalled();
    });

    it("should cleanup monitoring infrastructure when requested", async () => {
      mockEvent["detail-type"] = "cleanup-infrastructure";

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: "Monitoring operation completed successfully",
        eventType: "cleanup-infrastructure",
        timestamp: expect.any(String),
        requestId: "request-123",
      });

      // Verify infrastructure cleanup was called
      expect(mockAlarmsService.deleteAllRechargeAlarms).toHaveBeenCalledTimes(
        1
      );
      expect(mockDashboardService.deleteDashboard).toHaveBeenCalledWith(
        "HBAR-Recharge-System"
      );

      // Verify monitoring checks were NOT called
      expect(
        mockAlertingService.checkRechargeFailureRate
      ).not.toHaveBeenCalled();
    });

    it("should handle infrastructure setup errors", async () => {
      mockEvent["detail-type"] = "setup-infrastructure";
      mockDashboardService.createRechargeDashboard.mockRejectedValue(
        new Error("Dashboard creation failed")
      );

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).error).toBe("Dashboard creation failed");
    });

    it("should handle infrastructure cleanup errors", async () => {
      mockEvent["detail-type"] = "cleanup-infrastructure";
      mockAlarmsService.deleteAllRechargeAlarms.mockRejectedValue(
        new Error("Alarm deletion failed")
      );

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).error).toBe("Alarm deletion failed");
    });
  });
});
