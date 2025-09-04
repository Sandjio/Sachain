import { CloudWatch } from "aws-sdk";
import {
  CloudWatchAlarmsService,
  AlarmConfig,
  createCloudWatchAlarmsService,
} from "../cloudwatch-alarms";
import { DEFAULT_ALERT_THRESHOLDS } from "../recharge-alerting";

// Mock AWS SDK
jest.mock("aws-sdk");
const mockCloudWatch = {
  putMetricAlarm: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
  deleteAlarms: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
  describeAlarms: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      MetricAlarms: [{ StateValue: "OK" }],
    }),
  }),
};

(CloudWatch as jest.MockedClass<typeof CloudWatch>).mockImplementation(
  () => mockCloudWatch as any
);

describe("CloudWatchAlarmsService", () => {
  let alarmsService: CloudWatchAlarmsService;
  const snsTopicArn = "arn:aws:sns:us-east-1:123456789012:recharge-alerts";

  beforeEach(() => {
    jest.clearAllMocks();
    alarmsService = new CloudWatchAlarmsService(snsTopicArn);
  });

  describe("createAllRechargeAlarms", () => {
    it("should create all required alarms with default thresholds", async () => {
      await alarmsService.createAllRechargeAlarms();

      // Should create 12 alarms based on the configuration
      expect(mockCloudWatch.putMetricAlarm).toHaveBeenCalledTimes(12);

      // Verify some key alarms are created
      const alarmCalls = mockCloudWatch.putMetricAlarm.mock.calls;
      const alarmNames = alarmCalls.map((call) => call[0].AlarmName);

      expect(alarmNames).toContain("HBAR-Recharge-High-Failure-Rate");
      expect(alarmNames).toContain("HBAR-Recharge-High-Processing-Time");
      expect(alarmNames).toContain("HBAR-Treasury-Balance-Warning");
      expect(alarmNames).toContain("HBAR-Treasury-Balance-Critical");
      expect(alarmNames).toContain("HBAR-Exchange-Rate-Stale");
      expect(alarmNames).toContain("HBAR-Orange-Money-High-Error-Rate");
      expect(alarmNames).toContain("HBAR-Hedera-High-Error-Rate");
    });

    it("should create alarms with custom thresholds", async () => {
      const customThresholds = {
        ...DEFAULT_ALERT_THRESHOLDS,
        rechargeFailureRatePercent: 10,
        treasuryBalanceWarningHBAR: 2000,
      };

      await alarmsService.createAllRechargeAlarms(customThresholds);

      const alarmCalls = mockCloudWatch.putMetricAlarm.mock.calls;

      // Find the failure rate alarm
      const failureRateAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Recharge-High-Failure-Rate"
      );
      expect(failureRateAlarm[0].Threshold).toBe(10);

      // Find the treasury warning alarm
      const treasuryWarningAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Treasury-Balance-Warning"
      );
      expect(treasuryWarningAlarm[0].Threshold).toBe(2000);
    });

    it("should handle alarm creation errors gracefully", async () => {
      mockCloudWatch.putMetricAlarm.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("CloudWatch error")),
      });

      await expect(alarmsService.createAllRechargeAlarms()).rejects.toThrow(
        "CloudWatch error"
      );
    });
  });

  describe("createAlarm", () => {
    it("should create alarm with correct configuration", async () => {
      const alarmConfig: AlarmConfig = {
        alarmName: "Test-Alarm",
        metricName: "TestMetric",
        namespace: "Test/Namespace",
        statistic: "Average",
        threshold: 100,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 2,
        period: 300,
        alarmDescription: "Test alarm description",
        dimensions: [{ Name: "TestDimension", Value: "TestValue" }],
      };

      await alarmsService.createAlarm(alarmConfig);

      expect(mockCloudWatch.putMetricAlarm).toHaveBeenCalledWith({
        AlarmName: "Test-Alarm",
        AlarmDescription: "Test alarm description",
        MetricName: "TestMetric",
        Namespace: "Test/Namespace",
        Statistic: "Average",
        Threshold: 100,
        ComparisonOperator: "GreaterThanThreshold",
        EvaluationPeriods: 2,
        Period: 300,
        TreatMissingData: "notBreaching",
        Dimensions: [{ Name: "TestDimension", Value: "TestValue" }],
        AlarmActions: [snsTopicArn],
        OKActions: [snsTopicArn],
      });
    });

    it("should use default values when optional parameters are not provided", async () => {
      const alarmConfig: AlarmConfig = {
        alarmName: "Minimal-Alarm",
        metricName: "MinimalMetric",
        namespace: "Minimal/Namespace",
        statistic: "Sum",
        threshold: 50,
        comparisonOperator: "LessThanThreshold",
        evaluationPeriods: 1,
        period: 600,
      };

      await alarmsService.createAlarm(alarmConfig);

      const callArgs = mockCloudWatch.putMetricAlarm.mock.calls[0][0];
      expect(callArgs.AlarmDescription).toBe("Alarm for MinimalMetric");
      expect(callArgs.TreatMissingData).toBe("notBreaching");
      expect(callArgs.Dimensions).toEqual([]);
      expect(callArgs.AlarmActions).toEqual([snsTopicArn]);
      expect(callArgs.OKActions).toEqual([snsTopicArn]);
    });

    it("should handle alarm creation errors", async () => {
      mockCloudWatch.putMetricAlarm.mockReturnValue({
        promise: jest
          .fn()
          .mockRejectedValue(new Error("Alarm creation failed")),
      });

      const alarmConfig: AlarmConfig = {
        alarmName: "Error-Alarm",
        metricName: "ErrorMetric",
        namespace: "Error/Namespace",
        statistic: "Average",
        threshold: 1,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 1,
        period: 300,
      };

      await expect(alarmsService.createAlarm(alarmConfig)).rejects.toThrow(
        "Alarm creation failed"
      );
    });
  });

  describe("deleteAlarm", () => {
    it("should delete alarm successfully", async () => {
      await alarmsService.deleteAlarm("Test-Alarm");

      expect(mockCloudWatch.deleteAlarms).toHaveBeenCalledWith({
        AlarmNames: ["Test-Alarm"],
      });
    });

    it("should handle alarm deletion errors", async () => {
      mockCloudWatch.deleteAlarms.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("Deletion failed")),
      });

      await expect(alarmsService.deleteAlarm("Test-Alarm")).rejects.toThrow(
        "Deletion failed"
      );
    });
  });

  describe("deleteAllRechargeAlarms", () => {
    it("should delete all recharge system alarms", async () => {
      await alarmsService.deleteAllRechargeAlarms();

      expect(mockCloudWatch.deleteAlarms).toHaveBeenCalledWith({
        AlarmNames: expect.arrayContaining([
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
        ]),
      });
    });

    it("should handle bulk deletion errors", async () => {
      mockCloudWatch.deleteAlarms.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("Bulk deletion failed")),
      });

      await expect(alarmsService.deleteAllRechargeAlarms()).rejects.toThrow(
        "Bulk deletion failed"
      );
    });
  });

  describe("getAlarmState", () => {
    it("should return alarm state successfully", async () => {
      const state = await alarmsService.getAlarmState("Test-Alarm");

      expect(state).toBe("OK");
      expect(mockCloudWatch.describeAlarms).toHaveBeenCalledWith({
        AlarmNames: ["Test-Alarm"],
      });
    });

    it("should handle missing alarm", async () => {
      mockCloudWatch.describeAlarms.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          MetricAlarms: [],
        }),
      });

      await expect(
        alarmsService.getAlarmState("NonExistent-Alarm")
      ).rejects.toThrow("Alarm NonExistent-Alarm not found");
    });

    it("should handle describe alarms errors", async () => {
      mockCloudWatch.describeAlarms.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("Describe failed")),
      });

      await expect(alarmsService.getAlarmState("Test-Alarm")).rejects.toThrow(
        "Describe failed"
      );
    });

    it("should return INSUFFICIENT_DATA when state is undefined", async () => {
      mockCloudWatch.describeAlarms.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          MetricAlarms: [{ StateValue: undefined }],
        }),
      });

      const state = await alarmsService.getAlarmState("Test-Alarm");
      expect(state).toBe("INSUFFICIENT_DATA");
    });
  });

  describe("alarm configuration validation", () => {
    let alarmCalls: any[];

    beforeEach(async () => {
      await alarmsService.createAllRechargeAlarms();
      alarmCalls = mockCloudWatch.putMetricAlarm.mock.calls;
    });

    it("should configure failure rate alarm correctly", () => {
      const failureRateAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Recharge-High-Failure-Rate"
      )[0];

      expect(failureRateAlarm.MetricName).toBe("RechargeTransactionCount");
      expect(failureRateAlarm.Namespace).toBe("Sachain/HBARRecharge");
      expect(failureRateAlarm.Statistic).toBe("Sum");
      expect(failureRateAlarm.Threshold).toBe(
        DEFAULT_ALERT_THRESHOLDS.rechargeFailureRatePercent
      );
      expect(failureRateAlarm.ComparisonOperator).toBe("GreaterThanThreshold");
      expect(failureRateAlarm.Dimensions).toContainEqual({
        Name: "Status",
        Value: "failed",
      });
    });

    it("should configure processing time alarm correctly", () => {
      const processingTimeAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Recharge-High-Processing-Time"
      )[0];

      expect(processingTimeAlarm.MetricName).toBe("RechargeProcessingTime");
      expect(processingTimeAlarm.Statistic).toBe("Average");
      expect(processingTimeAlarm.Threshold).toBe(
        DEFAULT_ALERT_THRESHOLDS.averageProcessingTimeMs
      );
      expect(processingTimeAlarm.EvaluationPeriods).toBe(3);
    });

    it("should configure treasury balance alarms correctly", () => {
      const warningAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Treasury-Balance-Warning"
      )[0];
      const criticalAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Treasury-Balance-Critical"
      )[0];

      expect(warningAlarm.MetricName).toBe("TreasuryBalance");
      expect(warningAlarm.ComparisonOperator).toBe("LessThanThreshold");
      expect(warningAlarm.Threshold).toBe(
        DEFAULT_ALERT_THRESHOLDS.treasuryBalanceWarningHBAR
      );
      expect(warningAlarm.TreatMissingData).toBe("breaching");

      expect(criticalAlarm.Threshold).toBe(
        DEFAULT_ALERT_THRESHOLDS.treasuryBalanceCriticalHBAR
      );
      expect(criticalAlarm.TreatMissingData).toBe("breaching");
    });

    it("should configure exchange rate staleness alarm correctly", () => {
      const stalenessAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Exchange-Rate-Stale"
      )[0];

      expect(stalenessAlarm.MetricName).toBe("ExchangeRateStaleness");
      expect(stalenessAlarm.Threshold).toBe(
        DEFAULT_ALERT_THRESHOLDS.exchangeRateStaleMinutes
      );
      expect(stalenessAlarm.TreatMissingData).toBe("breaching");
    });

    it("should configure API performance alarms correctly", () => {
      const omResponseTimeAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Orange-Money-High-Response-Time"
      )[0];
      const hederaResponseTimeAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Hedera-High-Response-Time"
      )[0];

      expect(omResponseTimeAlarm.MetricName).toBe("OrangeMoneyAPIResponseTime");
      expect(omResponseTimeAlarm.Threshold).toBe(
        DEFAULT_ALERT_THRESHOLDS.apiResponseTimeMs
      );

      expect(hederaResponseTimeAlarm.MetricName).toBe(
        "HederaOperationResponseTime"
      );
      expect(hederaResponseTimeAlarm.Threshold).toBe(
        DEFAULT_ALERT_THRESHOLDS.apiResponseTimeMs
      );
    });

    it("should configure Lambda error alarms correctly", () => {
      const rechargeHandlerAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Recharge-Handler-Errors"
      )[0];
      const conversionHandlerAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Conversion-Handler-Errors"
      )[0];

      expect(rechargeHandlerAlarm.Namespace).toBe("AWS/Lambda");
      expect(rechargeHandlerAlarm.MetricName).toBe("Errors");
      expect(rechargeHandlerAlarm.Dimensions).toContainEqual({
        Name: "FunctionName",
        Value: "hbar-recharge-handler",
      });

      expect(conversionHandlerAlarm.Dimensions).toContainEqual({
        Name: "FunctionName",
        Value: "hbar-conversion-handler",
      });
    });

    it("should configure DynamoDB error alarm correctly", () => {
      const dynamoAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-DynamoDB-Errors"
      )[0];

      expect(dynamoAlarm.Namespace).toBe("AWS/DynamoDB");
      expect(dynamoAlarm.MetricName).toBe("SystemErrors");
      expect(dynamoAlarm.Dimensions).toContainEqual({
        Name: "TableName",
        Value: "RechargeTransactions",
      });
    });

    it("should set appropriate evaluation periods for different alarm types", () => {
      const failureRateAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Recharge-High-Failure-Rate"
      )[0];
      const processingTimeAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Recharge-High-Processing-Time"
      )[0];
      const treasuryAlarm = alarmCalls.find(
        (call) => call[0].AlarmName === "HBAR-Treasury-Balance-Critical"
      )[0];

      expect(failureRateAlarm.EvaluationPeriods).toBe(2);
      expect(processingTimeAlarm.EvaluationPeriods).toBe(3);
      expect(treasuryAlarm.EvaluationPeriods).toBe(1); // Immediate alert for critical balance
    });

    it("should use consistent period for all alarms", () => {
      alarmCalls.forEach((call) => {
        expect(call[0].Period).toBe(300); // 5 minutes
      });
    });

    it("should set SNS actions for all alarms", () => {
      alarmCalls.forEach((call) => {
        expect(call[0].AlarmActions).toContain(snsTopicArn);
        expect(call[0].OKActions).toContain(snsTopicArn);
      });
    });
  });

  describe("factory function", () => {
    it("should create CloudWatchAlarmsService instance", () => {
      const service = createCloudWatchAlarmsService(snsTopicArn);
      expect(service).toBeInstanceOf(CloudWatchAlarmsService);
    });
  });
});
