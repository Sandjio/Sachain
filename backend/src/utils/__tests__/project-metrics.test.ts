/**
 * Unit tests for ProjectMetrics
 */

import { ProjectMetrics, createProjectMetrics } from "../project-metrics";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

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
  let projectMetrics: ProjectMetrics;
  let mockPublishMetric: jest.Mock;
  let mockPublishMetrics: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (ProjectMetrics as any).projectInstance = undefined;
    projectMetrics = ProjectMetrics.getInstance();
    
    // Get mock functions
    mockPublishMetric = (projectMetrics as any).cloudWatchMetrics.publishMetric;
    mockPublishMetrics = (projectMetrics as any).cloudWatchMetrics.publishMetrics;
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = ProjectMetrics.getInstance();
      const instance2 = ProjectMetrics.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should create instance with correct namespace", () => {
      const instance = ProjectMetrics.getInstance();
      expect(instance).toBeInstanceOf(ProjectMetrics);
    });
  });

  describe("recordProjectCreation", () => {
    it("should record successful project creation with all metrics", async () => {
      mockSend.mockResolvedValue({});

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
            Dimensions: expect.arrayContaining([
              { Name: "Category", Value: "Technology" },
            ]),
          }),
          expect.objectContaining({
            MetricName: "ProjectCreationLatency",
            Value: 1500,
          }),
          expect.objectContaining({
            MetricName: "ProjectStockSupplyDistribution",
            Value: 1,
            Dimensions: expect.arrayContaining([
              { Name: "SizeCategory", Value: "Medium" },
              { Name: "Category", Value: "Technology" },
            ]),
          }),
          expect.objectContaining({
            MetricName: "ProjectStockSupply",
            Value: 500,
          }),
        ])
      );
    });

    it("should record failed project creation with error type", async () => {
      mockSend.mockResolvedValue({});

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
            Dimensions: expect.arrayContaining([
              { Name: "Category", Value: "Healthcare" },
              { Name: "ErrorType", Value: "VALIDATION_ERROR" },
            ]),
          }),
        ])
      );
    });

    it("should categorize stock supply correctly", async () => {
      mockSend.mockResolvedValue({});

      // Test Small category (≤ 100)
      await projectMetrics.recordProjectCreation(true, 1000, "Tech", undefined, 50);
      expect(mockPublishMetrics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "ProjectStockSupplyDistribution",
            Dimensions: expect.arrayContaining([
              { Name: "SizeCategory", Value: "Small" },
            ]),
          }),
        ])
      );

      // Test XLarge category (> 10K)
      await projectMetrics.recordProjectCreation(true, 1000, "Tech", undefined, 15000);
      expect(mockPublishMetrics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            MetricName: "ProjectStockSupplyDistribution",
            Dimensions: expect.arrayContaining([
              { Name: "SizeCategory", Value: "XLarge" },
            ]),
          }),
        ])
      );
    });
  });

  describe("recordStockMinting", () => {
    it("should record successful stock minting with all metrics", async () => {
      mockSend.mockResolvedValue({});

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
            MetricName: "StockMintingLatency",
            Value: 30000,
          }),
          expect.objectContaining({
            MetricName: "StocksMinted",
            Value: 1000,
          }),
          expect.objectContaining({
            MetricName: "StockMintingThroughput",
            Value: 1000 / 30, // stocks per second
          }),
          expect.objectContaining({
            MetricName: "MintingBatchCount",
            Value: 5,
          }),
          expect.objectContaining({
            MetricName: "StocksPerBatch",
            Value: 200,
          }),
          expect.objectContaining({
            MetricName: "HederaGasCost",
            Value: 25.5,
          }),
          expect.objectContaining({
            MetricName: "GasCostPerStock",
            Value: 0.0255,
          }),
        ])
      );
    });

    it("should record failed stock minting with error type", async () => {
      mockSend.mockResolvedValue({});

      await projectMetrics.recordStockMinting(
        false,
        5000,
        0,
        undefined,
        "HEDERA_ERROR"
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: "StockMintingFailure",
                Value: 1,
                Dimensions: expect.arrayContaining([
                  { Name: "ErrorType", Value: "HEDERA_ERROR" },
                ]),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("recordHederaTokenCreation", () => {
    it("should record successful token creation", async () => {
      mockSend.mockResolvedValue({});

      await projectMetrics.recordHederaTokenCreation(true, 2000, 5.25);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: "HederaTokenCreationSuccess",
                Value: 1,
              }),
              expect.objectContaining({
                MetricName: "HederaTokenCreationLatency",
                Value: 2000,
              }),
              expect.objectContaining({
                MetricName: "HederaTokenCreationGasCost",
                Value: 5.25,
              }),
            ]),
          }),
        })
      );
    });

    it("should record failed token creation with error", async () => {
      mockSend.mockResolvedValue({});

      await projectMetrics.recordHederaTokenCreation(false, 1000, undefined, "NETWORK_ERROR");

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: "HederaTokenCreationFailure",
                Value: 1,
                Dimensions: expect.arrayContaining([
                  { Name: "ErrorType", Value: "NETWORK_ERROR" },
                ]),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("recordHederaNFTMinting", () => {
    it("should record successful NFT minting with rate calculations", async () => {
      mockSend.mockResolvedValue({});

      await projectMetrics.recordHederaNFTMinting(true, 10000, 50, 12.75);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: "HederaNFTMintingSuccess",
                Value: 1,
              }),
              expect.objectContaining({
                MetricName: "HederaNFTsMinted",
                Value: 50,
              }),
              expect.objectContaining({
                MetricName: "HederaNFTMintingRate",
                Value: 5, // 50 NFTs / 10 seconds
              }),
              expect.objectContaining({
                MetricName: "HederaGasCostPerNFT",
                Value: 0.255, // 12.75 / 50
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("recordIPFSUpload", () => {
    it("should record successful IPFS upload with throughput", async () => {
      mockSend.mockResolvedValue({});

      await projectMetrics.recordIPFSUpload(true, 1500, "project", 2048);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: "IPFSUploadSuccess",
                Value: 1,
                Dimensions: expect.arrayContaining([
                  { Name: "MetadataType", Value: "project" },
                ]),
              }),
              expect.objectContaining({
                MetricName: "IPFSUploadSize",
                Value: 2048,
              }),
              expect.objectContaining({
                MetricName: "IPFSUploadThroughput",
                Value: 2048 / 1.5, // bytes per second
              }),
            ]),
          }),
        })
      );
    });

    it("should record failed IPFS upload with error type", async () => {
      mockSend.mockResolvedValue({});

      await projectMetrics.recordIPFSUpload(false, 3000, "stock", undefined, "TIMEOUT");

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: "IPFSUploadFailure",
                Value: 1,
                Dimensions: expect.arrayContaining([
                  { Name: "MetadataType", Value: "stock" },
                  { Name: "ErrorType", Value: "TIMEOUT" },
                ]),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("recordDailyProjectsCreated", () => {
    it("should record daily project count", async () => {
      mockSend.mockResolvedValue({});

      await projectMetrics.recordDailyProjectsCreated(25, "2024-01-15");

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: "ProjectsCreatedDaily",
                Value: 25,
                Dimensions: expect.arrayContaining([
                  { Name: "Date", Value: "2024-01-15" },
                ]),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("recordAPILatency", () => {
    it("should record API success metrics", async () => {
      mockSend.mockResolvedValue({});

      await projectMetrics.recordAPILatency("/projects", "POST", 250, 201);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: "ProjectAPILatency",
                Value: 250,
                Dimensions: expect.arrayContaining([
                  { Name: "Endpoint", Value: "/projects" },
                  { Name: "Method", Value: "POST" },
                ]),
              }),
              expect.objectContaining({
                MetricName: "ProjectAPISuccess",
                Value: 1,
                Dimensions: expect.arrayContaining([
                  { Name: "StatusCode", Value: "201" },
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it("should record API error metrics", async () => {
      mockSend.mockResolvedValue({});

      await projectMetrics.recordAPILatency("/projects/123", "GET", 1200, 404);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: "ProjectAPIError",
                Value: 1,
                Dimensions: expect.arrayContaining([
                  { Name: "StatusCode", Value: "404" },
                ]),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("recordBatchMetrics", () => {
    it("should record multiple metrics in batch", async () => {
      mockSend.mockResolvedValue({});

      await projectMetrics.recordBatchMetrics({
        projectCreations: { success: 10, failures: 2 },
        stockMintings: { success: 8, failures: 1, totalStocks: 5000 },
        hederaOperations: { success: 15, failures: 3, totalGasCost: 125.75 },
        ipfsOperations: { success: 20, failures: 1 },
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: "ProjectCreationSuccess",
                Value: 10,
              }),
              expect.objectContaining({
                MetricName: "StockMintingFailure",
                Value: 1,
              }),
              expect.objectContaining({
                MetricName: "StocksMinted",
                Value: 5000,
              }),
              expect.objectContaining({
                MetricName: "HederaTotalGasCost",
                Value: 125.75,
              }),
              expect.objectContaining({
                MetricName: "IPFSOperationSuccess",
                Value: 20,
              }),
            ]),
          }),
        })
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

      // Should not throw error
      await expect(
        projectMetrics.recordProjectCreation(true, 1000)
      ).resolves.not.toThrow();
    });
  });
});