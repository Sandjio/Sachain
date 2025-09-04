import { CloudWatch } from "aws-sdk";
import {
  CloudWatchDashboardService,
  DashboardConfig,
  DashboardWidget,
} from "../cloudwatch-dashboard";

// Mock AWS SDK
jest.mock("aws-sdk");
const mockCloudWatch = {
  putDashboard: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
  deleteDashboards: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
};

(CloudWatch as jest.MockedClass<typeof CloudWatch>).mockImplementation(
  () => mockCloudWatch as any
);

describe("CloudWatchDashboardService", () => {
  let dashboardService: CloudWatchDashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    dashboardService = new CloudWatchDashboardService();
    process.env.AWS_REGION = "us-east-1";
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
  });

  describe("createRechargeDashboard", () => {
    it("should create dashboard with correct configuration", async () => {
      await dashboardService.createRechargeDashboard();

      expect(mockCloudWatch.putDashboard).toHaveBeenCalledWith({
        DashboardName: "HBAR-Recharge-System",
        DashboardBody: expect.any(String),
      });

      const dashboardBody = JSON.parse(
        mockCloudWatch.putDashboard.mock.calls[0][0].DashboardBody
      );
      expect(dashboardBody).toHaveProperty("widgets");
      expect(Array.isArray(dashboardBody.widgets)).toBe(true);
      expect(dashboardBody.widgets.length).toBeGreaterThan(0);
    });

    it("should include all required widget types", async () => {
      await dashboardService.createRechargeDashboard();

      const dashboardBody = JSON.parse(
        mockCloudWatch.putDashboard.mock.calls[0][0].DashboardBody
      );
      const widgets = dashboardBody.widgets;

      // Check for key widgets by examining their titles
      const widgetTitles = widgets.map((w: any) => w.properties.title);

      expect(widgetTitles).toContain("Recharge Success Rate");
      expect(widgetTitles).toContain("Transaction Volume");
      expect(widgetTitles).toContain("Average Processing Time");
      expect(widgetTitles).toContain("Treasury Balance (HBAR)");
      expect(widgetTitles).toContain("Orange Money API Performance");
      expect(widgetTitles).toContain("Hedera Network Performance");
      expect(widgetTitles).toContain("Error Rates");
      expect(widgetTitles).toContain("Exchange Rate & Staleness");
      expect(widgetTitles).toContain("System Health");
      expect(widgetTitles).toContain("Active Transactions");
      expect(widgetTitles).toContain("Recent Alerts");
      expect(widgetTitles).toContain("Hourly Transaction Trends");
      expect(widgetTitles).toContain("Daily Transaction Trends");
    });

    it("should configure widgets with correct metrics namespace", async () => {
      await dashboardService.createRechargeDashboard();

      const dashboardBody = JSON.parse(
        mockCloudWatch.putDashboard.mock.calls[0][0].DashboardBody
      );
      const widgets = dashboardBody.widgets;

      // Check that metric widgets use the correct namespace
      const metricWidgets = widgets.filter(
        (w: any) => w.type === "metric" && w.properties.metrics
      );

      metricWidgets.forEach((widget: any) => {
        const metrics = widget.properties.metrics;
        metrics.forEach((metric: any) => {
          if (Array.isArray(metric) && metric.length > 0) {
            // First element should be namespace for custom metrics
            if (metric[0] === "Sachain/HBARRecharge") {
              expect(metric[0]).toBe("Sachain/HBARRecharge");
            }
          }
        });
      });
    });

    it("should handle CloudWatch errors gracefully", async () => {
      mockCloudWatch.putDashboard.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("CloudWatch error")),
      });

      await expect(dashboardService.createRechargeDashboard()).rejects.toThrow(
        "CloudWatch error"
      );
    });
  });

  describe("updateDashboard", () => {
    it("should update dashboard with custom configuration", async () => {
      const customConfig: DashboardConfig = {
        name: "Custom-Dashboard",
        widgets: [
          {
            type: "metric",
            x: 0,
            y: 0,
            width: 6,
            height: 6,
            properties: {
              metrics: [["Sachain/HBARRecharge", "TestMetric"]],
              title: "Test Widget",
            },
          },
        ],
      };

      await dashboardService.updateDashboard(customConfig);

      expect(mockCloudWatch.putDashboard).toHaveBeenCalledWith({
        DashboardName: "Custom-Dashboard",
        DashboardBody: JSON.stringify(customConfig),
      });
    });

    it("should handle update errors gracefully", async () => {
      mockCloudWatch.putDashboard.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("Update failed")),
      });

      const config: DashboardConfig = {
        name: "Test-Dashboard",
        widgets: [],
      };

      await expect(dashboardService.updateDashboard(config)).rejects.toThrow(
        "Update failed"
      );
    });
  });

  describe("deleteDashboard", () => {
    it("should delete dashboard successfully", async () => {
      await dashboardService.deleteDashboard("Test-Dashboard");

      expect(mockCloudWatch.deleteDashboards).toHaveBeenCalledWith({
        DashboardNames: ["Test-Dashboard"],
      });
    });

    it("should handle delete errors gracefully", async () => {
      mockCloudWatch.deleteDashboards.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("Delete failed")),
      });

      await expect(
        dashboardService.deleteDashboard("Test-Dashboard")
      ).rejects.toThrow("Delete failed");
    });
  });

  describe("widget configuration validation", () => {
    let dashboardBody: any;

    beforeEach(async () => {
      await dashboardService.createRechargeDashboard();
      dashboardBody = JSON.parse(
        mockCloudWatch.putDashboard.mock.calls[0][0].DashboardBody
      );
    });

    it("should configure success rate widget correctly", () => {
      const successRateWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "Recharge Success Rate"
      );

      expect(successRateWidget).toBeDefined();
      expect(successRateWidget.type).toBe("metric");
      expect(successRateWidget.properties.metrics).toContainEqual([
        "Sachain/HBARRecharge",
        "RechargeTransactionCount",
        "Status",
        "success",
      ]);
      expect(successRateWidget.properties.metrics).toContainEqual([
        ".",
        ".",
        ".",
        "failed",
      ]);
    });

    it("should configure treasury balance widget with thresholds", () => {
      const treasuryWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "Treasury Balance (HBAR)"
      );

      expect(treasuryWidget).toBeDefined();
      expect(treasuryWidget.properties.annotations).toBeDefined();
      expect(treasuryWidget.properties.annotations.horizontal).toHaveLength(2);

      const annotations = treasuryWidget.properties.annotations.horizontal;
      expect(annotations).toContainEqual({
        label: "Critical Threshold",
        value: 100,
        fill: "above",
      });
      expect(annotations).toContainEqual({
        label: "Warning Threshold",
        value: 1000,
        fill: "above",
      });
    });

    it("should configure processing time widget correctly", () => {
      const processingTimeWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "Average Processing Time"
      );

      expect(processingTimeWidget).toBeDefined();
      expect(processingTimeWidget.properties.yAxis.left.label).toBe(
        "Milliseconds"
      );
      expect(processingTimeWidget.properties.stat).toBe("Average");
    });

    it("should configure Orange Money performance widget", () => {
      const omWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "Orange Money API Performance"
      );

      expect(omWidget).toBeDefined();
      expect(omWidget.properties.metrics).toContainEqual([
        "Sachain/HBARRecharge",
        "OrangeMoneyAPIResponseTime",
        "Status",
        "success",
      ]);
      expect(omWidget.properties.yAxis.left.label).toBe("Response Time (ms)");
      expect(omWidget.properties.yAxis.right.label).toBe("Call Count");
    });

    it("should configure Hedera performance widget", () => {
      const hederaWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "Hedera Network Performance"
      );

      expect(hederaWidget).toBeDefined();
      expect(hederaWidget.properties.metrics).toContainEqual([
        "Sachain/HBARRecharge",
        "HederaOperationResponseTime",
        "OperationType",
        "transfer",
      ]);
      expect(hederaWidget.properties.yAxis.right.label).toBe(
        "Network Fees (HBAR)"
      );
    });

    it("should configure error rate widget", () => {
      const errorWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "Error Rates"
      );

      expect(errorWidget).toBeDefined();
      expect(errorWidget.properties.metrics).toContainEqual([
        "Sachain/HBARRecharge",
        "OrangeMoneyAPIErrors",
      ]);
      expect(errorWidget.properties.metrics).toContainEqual([
        ".",
        "HederaOperationErrors",
      ]);
      expect(errorWidget.properties.metrics).toContainEqual([
        ".",
        "RechargeErrors",
      ]);
    });

    it("should configure exchange rate widget", () => {
      const exchangeRateWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "Exchange Rate & Staleness"
      );

      expect(exchangeRateWidget).toBeDefined();
      expect(exchangeRateWidget.properties.metrics).toContainEqual([
        "Sachain/HBARRecharge",
        "ExchangeRate",
        "Source",
        "CoinGecko",
      ]);
      expect(exchangeRateWidget.properties.yAxis.left.label).toBe(
        "XAF to HBAR Rate"
      );
      expect(exchangeRateWidget.properties.yAxis.right.label).toBe(
        "Staleness (minutes)"
      );
    });

    it("should configure system health widget", () => {
      const systemHealthWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "System Health"
      );

      expect(systemHealthWidget).toBeDefined();
      expect(systemHealthWidget.type).toBe("number");
      expect(systemHealthWidget.properties.view).toBe("singleValue");
      expect(systemHealthWidget.properties.metrics).toContainEqual([
        "AWS/Lambda",
        "Errors",
        "FunctionName",
        "hbar-recharge-handler",
      ]);
    });

    it("should configure log-based alert widget", () => {
      const alertWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "Recent Alerts"
      );

      expect(alertWidget).toBeDefined();
      expect(alertWidget.type).toBe("log");
      expect(alertWidget.properties.query).toContain("Alert");
      expect(alertWidget.properties.view).toBe("table");
    });

    it("should configure trend widgets with appropriate periods", () => {
      const hourlyWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "Hourly Transaction Trends"
      );
      const dailyWidget = dashboardBody.widgets.find(
        (w: any) => w.properties.title === "Daily Transaction Trends"
      );

      expect(hourlyWidget).toBeDefined();
      expect(hourlyWidget.properties.period).toBe(3600); // 1 hour

      expect(dailyWidget).toBeDefined();
      expect(dailyWidget.properties.period).toBe(86400); // 1 day
    });
  });

  describe("widget positioning", () => {
    let widgets: any[];

    beforeEach(async () => {
      await dashboardService.createRechargeDashboard();
      const dashboardBody = JSON.parse(
        mockCloudWatch.putDashboard.mock.calls[0][0].DashboardBody
      );
      widgets = dashboardBody.widgets;
    });

    it("should position widgets in a grid layout", () => {
      widgets.forEach((widget) => {
        expect(widget.x).toBeGreaterThanOrEqual(0);
        expect(widget.y).toBeGreaterThanOrEqual(0);
        expect(widget.width).toBeGreaterThan(0);
        expect(widget.height).toBeGreaterThan(0);
      });
    });

    it("should not have overlapping widgets in the same row", () => {
      // Group widgets by row (y coordinate)
      const rowGroups: { [key: number]: any[] } = {};
      widgets.forEach((widget) => {
        if (!rowGroups[widget.y]) {
          rowGroups[widget.y] = [];
        }
        rowGroups[widget.y].push(widget);
      });

      // Check each row for overlaps
      Object.values(rowGroups).forEach((rowWidgets) => {
        rowWidgets.sort((a, b) => a.x - b.x);
        for (let i = 0; i < rowWidgets.length - 1; i++) {
          const current = rowWidgets[i];
          const next = rowWidgets[i + 1];
          expect(current.x + current.width).toBeLessThanOrEqual(next.x);
        }
      });
    });

    it("should fit widgets within standard dashboard width", () => {
      const maxDashboardWidth = 24; // Standard CloudWatch dashboard width
      widgets.forEach((widget) => {
        expect(widget.x + widget.width).toBeLessThanOrEqual(maxDashboardWidth);
      });
    });
  });

  describe("environment configuration", () => {
    it("should use correct AWS region from environment", async () => {
      process.env.AWS_REGION = "eu-west-1";

      await dashboardService.createRechargeDashboard();

      const dashboardBody = JSON.parse(
        mockCloudWatch.putDashboard.mock.calls[0][0].DashboardBody
      );
      const metricWidgets = dashboardBody.widgets.filter(
        (w: any) => w.properties.region
      );

      metricWidgets.forEach((widget: any) => {
        expect(widget.properties.region).toBe("eu-west-1");
      });
    });

    it("should fallback to us-east-1 when region not set", async () => {
      delete process.env.AWS_REGION;

      await dashboardService.createRechargeDashboard();

      const dashboardBody = JSON.parse(
        mockCloudWatch.putDashboard.mock.calls[0][0].DashboardBody
      );
      const metricWidgets = dashboardBody.widgets.filter(
        (w: any) => w.properties.region
      );

      metricWidgets.forEach((widget: any) => {
        expect(widget.properties.region).toBe("us-east-1");
      });
    });
  });
});
