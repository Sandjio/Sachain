/**
 * Simplified unit tests for ProjectMetrics
 */

import { ProjectMetrics, createProjectMetrics } from "../project-metrics";

// Mock CloudWatch metrics
jest.mock("../cloudwatch-metrics", () => ({
  CloudWatchMetrics: {
    getInstance: jest.fn(() => ({
      publishMetric: jest.fn().mockResolvedValue(undefined),
      publishMetrics: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Mock structured logger
jest.mock("../structured-logger", () => ({
  StructuredLogger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      logMetricPublication: jest.fn(),
    })),
  },
}));

describe("ProjectMetrics", () => {
  let mockPublishMetric: jest.Mock;
  let mockPublishMetrics: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (ProjectMetrics as any).projectInstance = undefined;
    
    // Get fresh mock functions
    const { CloudWatchMetrics } = require("../cloudwatch-metrics");
    const mockInstance = CloudWatchMetrics.getInstance();
    mockPublishMetric = mockInstance.publishMetric;
    mockPublishMetrics = mockInstance.publishMetrics;
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = ProjectMetrics.getInstance();
      const instance2 = ProjectMetrics.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should create instance with CloudWatchMetrics", () => {
      const instance = ProjectMetrics.getInstance();
      expect(instance).toBeInstanceOf(ProjectMetrics);
    });
  });

  describe("recordProjectCreation", () => {
    it("should record successful project creation", async () => {
      const projectMetrics = ProjectMetrics.getInstance();
      
      await projectMetrics.recordProjectCreation(
        true,
        1500,
        "Technology",
        undefined,
        500
      );

      expect(mockPublishMetrics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "ProjectCreationSuccess",
            Value: 1,
          }),
          expect.objectContaining({
            MetricName: "ProjectCreationLatency",
            Value: 1500,
          }),
        ])
      );
    });

    it("should record failed project creation", async () => {
      const projectMetrics = ProjectMetrics.getInstance();
      
      await projectMetrics.recordProjectCreation(
        false,
        800,
        "Healthcare",
        "VALIDATION_ERROR"
      );

      expect(mockPublishMetrics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "ProjectCreationFailure",
            Value: 1,
          }),
        ])
      );
    });
  });

  describe("recordStockMinting", () => {
    it("should record successful stock minting", async () => {
      const projectMetrics = ProjectMetrics.getInstance();
      
      await projectMetrics.recordStockMinting(
        true,
        30000,
        1000,
        5,
        undefined,
        25.5
      );

      expect(mockPublishMetrics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "StockMintingSuccess",
            Value: 1,
          }),
          expect.objectContaining({
            MetricName: "StocksMinted",
            Value: 1000,
          }),
        ])
      );
    });
  });

  describe("recordHederaTokenCreation", () => {
    it("should record successful token creation", async () => {
      const projectMetrics = ProjectMetrics.getInstance();
      
      await projectMetrics.recordHederaTokenCreation(true, 2000, 5.25);

      expect(mockPublishMetrics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "HederaTokenCreationSuccess",
            Value: 1,
          }),
          expect.objectContaining({
            MetricName: "HederaTokenCreationLatency",
            Value: 2000,
          }),
        ])
      );
    });
  });

  describe("recordIPFSUpload", () => {
    it("should record successful IPFS upload", async () => {
      const projectMetrics = ProjectMetrics.getInstance();
      
      await projectMetrics.recordIPFSUpload(true, 1500, "project", 2048);

      expect(mockPublishMetrics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "IPFSUploadSuccess",
            Value: 1,
          }),
        ])
      );
    });
  });

  describe("recordDailyProjectsCreated", () => {
    it("should record daily project count", async () => {
      const projectMetrics = ProjectMetrics.getInstance();
      
      await projectMetrics.recordDailyProjectsCreated(25, "2024-01-15");

      expect(mockPublishMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricName: "ProjectsCreatedDaily",
          Value: 25,
        })
      );
    });
  });

  describe("recordAPILatency", () => {
    it("should record API success metrics", async () => {
      const projectMetrics = ProjectMetrics.getInstance();
      
      await projectMetrics.recordAPILatency("/projects", "POST", 250, 201);

      expect(mockPublishMetrics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "ProjectAPILatency",
            Value: 250,
          }),
          expect.objectContaining({
            MetricName: "ProjectAPISuccess",
            Value: 1,
          }),
        ])
      );
    });

    it("should record API error metrics", async () => {
      const projectMetrics = ProjectMetrics.getInstance();
      
      await projectMetrics.recordAPILatency("/projects/123", "GET", 1200, 404);

      expect(mockPublishMetrics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "ProjectAPIError",
            Value: 1,
          }),
        ])
      );
    });
  });

  describe("createProjectMetrics factory", () => {
    it("should return ProjectMetrics instance", () => {
      const instance = createProjectMetrics();
      expect(instance).toBeInstanceOf(ProjectMetrics);
    });
  });

  describe("error handling", () => {
    it("should handle CloudWatch API errors gracefully", async () => {
      mockPublishMetrics.mockRejectedValue(new Error("CloudWatch API Error"));
      
      const projectMetrics = ProjectMetrics.getInstance();

      // Should not throw error
      await expect(
        projectMetrics.recordProjectCreation(true, 1000)
      ).resolves.not.toThrow();
    });
  });
});