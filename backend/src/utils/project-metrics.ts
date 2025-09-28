/**
 * Project Operations CloudWatch Metrics
 * Specialized metrics for project creation, stock minting, and Hedera/IPFS operations
 */

import { StandardUnit } from "@aws-sdk/client-cloudwatch";
import { CloudWatchMetrics, CustomMetricData, MetricDimension } from "./cloudwatch-metrics";
import { StructuredLogger } from "./structured-logger";

const logger = StructuredLogger.getInstance(
  "ProjectMetrics",
  process.env.ENVIRONMENT || "development"
);

export interface ProjectOperationMetrics {
  projectCreationSuccess: number;
  projectCreationFailure: number;
  projectCreationLatency: number;
  stockMintingSuccess: number;
  stockMintingFailure: number;
  stockMintingLatency: number;
  hederaTokenCreationLatency: number;
  hederaNFTMintingLatency: number;
  ipfsUploadLatency: number;
  projectsCreatedDaily: number;
  stocksMintedDaily: number;
  hederaGasCosts: number;
}

export class ProjectMetrics {
  private static projectInstance: ProjectMetrics;
  private cloudWatchMetrics: CloudWatchMetrics;

  private constructor() {
    this.cloudWatchMetrics = CloudWatchMetrics.getInstance(
      "Sachain/Projects", 
      process.env.ENVIRONMENT || "development"
    );
  }

  static getInstance(): ProjectMetrics {
    if (!ProjectMetrics.projectInstance) {
      ProjectMetrics.projectInstance = new ProjectMetrics();
    }
    return ProjectMetrics.projectInstance;
  }

  // Delegate basic metric publishing to CloudWatchMetrics
  private async publishMetric(metricData: CustomMetricData): Promise<void> {
    return this.cloudWatchMetrics.publishMetric(metricData);
  }

  private async publishMetrics(metrics: CustomMetricData[]): Promise<void> {
    return this.cloudWatchMetrics.publishMetrics(metrics);
  }

  // Project Creation Metrics
  async recordProjectCreation(
    success: boolean,
    latency: number,
    category?: string,
    errorType?: string,
    stockSupply?: number
  ): Promise<void> {
    const metrics: CustomMetricData[] = [];

    // Basic success/failure count
    const dimensions: MetricDimension[] = [];
    if (category) {
      dimensions.push({ Name: "Category", Value: category });
    }
    if (!success && errorType) {
      dimensions.push({ Name: "ErrorType", Value: errorType });
    }

    metrics.push({
      MetricName: success ? "ProjectCreationSuccess" : "ProjectCreationFailure",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });

    // Latency metric
    metrics.push({
      MetricName: "ProjectCreationLatency",
      Value: latency,
      Unit: StandardUnit.Milliseconds,
      Dimensions: category ? [{ Name: "Category", Value: category }] : undefined,
    });

    // Stock supply distribution
    if (success && stockSupply !== undefined) {
      const sizeCategory = this.categorizeStockSupply(stockSupply);
      metrics.push({
        MetricName: "ProjectStockSupplyDistribution",
        Value: 1,
        Unit: StandardUnit.Count,
        Dimensions: [
          { Name: "SizeCategory", Value: sizeCategory },
          ...(category ? [{ Name: "Category", Value: category }] : []),
        ],
      });

      metrics.push({
        MetricName: "ProjectStockSupply",
        Value: stockSupply,
        Unit: StandardUnit.Count,
        Dimensions: category ? [{ Name: "Category", Value: category }] : undefined,
      });
    }

    await this.publishMetrics(metrics);
  }

  // Stock Minting Metrics
  async recordStockMinting(
    success: boolean,
    latency: number,
    stockCount: number,
    batchCount?: number,
    errorType?: string,
    gasCost?: number
  ): Promise<void> {
    const metrics: CustomMetricData[] = [];

    // Basic success/failure count
    const dimensions: MetricDimension[] = [];
    if (!success && errorType) {
      dimensions.push({ Name: "ErrorType", Value: errorType });
    }

    metrics.push({
      MetricName: success ? "StockMintingSuccess" : "StockMintingFailure",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });

    // Minting latency
    metrics.push({
      MetricName: "StockMintingLatency",
      Value: latency,
      Unit: StandardUnit.Milliseconds,
    });

    if (success) {
      // Stocks minted count
      metrics.push({
        MetricName: "StocksMinted",
        Value: stockCount,
        Unit: StandardUnit.Count,
      });

      // Minting throughput (stocks per second)
      const throughput = stockCount / (latency / 1000);
      metrics.push({
        MetricName: "StockMintingThroughput",
        Value: throughput,
        Unit: StandardUnit.Count_Second,
      });

      // Batch metrics
      if (batchCount !== undefined) {
        metrics.push({
          MetricName: "MintingBatchCount",
          Value: batchCount,
          Unit: StandardUnit.Count,
        });

        metrics.push({
          MetricName: "StocksPerBatch",
          Value: stockCount / batchCount,
          Unit: StandardUnit.Count,
        });
      }

      // Gas cost metrics
      if (gasCost !== undefined) {
        metrics.push({
          MetricName: "HederaGasCost",
          Value: gasCost,
          Unit: StandardUnit.None,
        });

        metrics.push({
          MetricName: "GasCostPerStock",
          Value: gasCost / stockCount,
          Unit: StandardUnit.None,
        });
      }
    }

    await this.publishMetrics(metrics);
  }

  // Hedera Token Service Metrics
  async recordHederaTokenCreation(
    success: boolean,
    latency: number,
    gasCost?: number,
    errorType?: string
  ): Promise<void> {
    const metrics: CustomMetricData[] = [];

    // Success/failure count
    const dimensions: MetricDimension[] = [];
    if (!success && errorType) {
      dimensions.push({ Name: "ErrorType", Value: errorType });
    }

    metrics.push({
      MetricName: success ? "HederaTokenCreationSuccess" : "HederaTokenCreationFailure",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });

    // Latency
    metrics.push({
      MetricName: "HederaTokenCreationLatency",
      Value: latency,
      Unit: StandardUnit.Milliseconds,
    });

    // Gas cost
    if (success && gasCost !== undefined) {
      metrics.push({
        MetricName: "HederaTokenCreationGasCost",
        Value: gasCost,
        Unit: StandardUnit.None,
      });
    }

    await this.publishMetrics(metrics);
  }

  async recordHederaNFTMinting(
    success: boolean,
    latency: number,
    nftCount: number,
    gasCost?: number,
    errorType?: string
  ): Promise<void> {
    const metrics: CustomMetricData[] = [];

    // Success/failure count
    const dimensions: MetricDimension[] = [];
    if (!success && errorType) {
      dimensions.push({ Name: "ErrorType", Value: errorType });
    }

    metrics.push({
      MetricName: success ? "HederaNFTMintingSuccess" : "HederaNFTMintingFailure",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });

    // Latency
    metrics.push({
      MetricName: "HederaNFTMintingLatency",
      Value: latency,
      Unit: StandardUnit.Milliseconds,
    });

    if (success) {
      // NFT count
      metrics.push({
        MetricName: "HederaNFTsMinted",
        Value: nftCount,
        Unit: StandardUnit.Count,
      });

      // Minting rate
      const mintingRate = nftCount / (latency / 1000);
      metrics.push({
        MetricName: "HederaNFTMintingRate",
        Value: mintingRate,
        Unit: StandardUnit.Count_Second,
      });

      // Gas cost metrics
      if (gasCost !== undefined) {
        metrics.push({
          MetricName: "HederaNFTMintingGasCost",
          Value: gasCost,
          Unit: StandardUnit.None,
        });

        metrics.push({
          MetricName: "HederaGasCostPerNFT",
          Value: gasCost / nftCount,
          Unit: StandardUnit.None,
        });
      }
    }

    await this.publishMetrics(metrics);
  }

  // IPFS Operations Metrics
  async recordIPFSUpload(
    success: boolean,
    latency: number,
    metadataType: "project" | "stock",
    dataSize?: number,
    errorType?: string
  ): Promise<void> {
    const metrics: CustomMetricData[] = [];

    // Success/failure count
    const dimensions: MetricDimension[] = [
      { Name: "MetadataType", Value: metadataType },
    ];
    if (!success && errorType) {
      dimensions.push({ Name: "ErrorType", Value: errorType });
    }

    metrics.push({
      MetricName: success ? "IPFSUploadSuccess" : "IPFSUploadFailure",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });

    // Latency
    metrics.push({
      MetricName: "IPFSUploadLatency",
      Value: latency,
      Unit: StandardUnit.Milliseconds,
      Dimensions: [{ Name: "MetadataType", Value: metadataType }],
    });

    if (success && dataSize !== undefined) {
      // Data size
      metrics.push({
        MetricName: "IPFSUploadSize",
        Value: dataSize,
        Unit: StandardUnit.Bytes,
        Dimensions: [{ Name: "MetadataType", Value: metadataType }],
      });

      // Upload throughput
      const throughput = dataSize / (latency / 1000);
      metrics.push({
        MetricName: "IPFSUploadThroughput",
        Value: throughput,
        Unit: StandardUnit.Bytes_Second,
        Dimensions: [{ Name: "MetadataType", Value: metadataType }],
      });
    }

    await this.publishMetrics(metrics);
  }

  // Business Metrics
  async recordDailyProjectsCreated(count: number, date?: string): Promise<void> {
    const dimensions: MetricDimension[] = [];
    if (date) {
      dimensions.push({ Name: "Date", Value: date });
    }

    await this.publishMetric({
      MetricName: "ProjectsCreatedDaily",
      Value: count,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });
  }

  async recordDailyStocksMinted(count: number, date?: string): Promise<void> {
    const dimensions: MetricDimension[] = [];
    if (date) {
      dimensions.push({ Name: "Date", Value: date });
    }

    await this.publishMetric({
      MetricName: "StocksMintedDaily",
      Value: count,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });
  }

  async recordProjectsByCategory(category: string, count: number): Promise<void> {
    await this.publishMetric({
      MetricName: "ProjectsByCategory",
      Value: count,
      Unit: StandardUnit.Count,
      Dimensions: [{ Name: "Category", Value: category }],
    });
  }

  async recordProjectsByStatus(status: string, count: number): Promise<void> {
    await this.publishMetric({
      MetricName: "ProjectsByStatus",
      Value: count,
      Unit: StandardUnit.Count,
      Dimensions: [{ Name: "Status", Value: status }],
    });
  }

  // Performance Metrics - removed duplicate method

  async recordAPILatency(
    endpoint: string,
    method: string,
    latency: number,
    statusCode: number
  ): Promise<void> {
    const success = statusCode >= 200 && statusCode < 300;
    
    await this.publishMetrics([
      {
        MetricName: "ProjectAPILatency",
        Value: latency,
        Unit: StandardUnit.Milliseconds,
        Dimensions: [
          { Name: "Endpoint", Value: endpoint },
          { Name: "Method", Value: method },
        ],
      },
      {
        MetricName: success ? "ProjectAPISuccess" : "ProjectAPIError",
        Value: 1,
        Unit: StandardUnit.Count,
        Dimensions: [
          { Name: "Endpoint", Value: endpoint },
          { Name: "Method", Value: method },
          { Name: "StatusCode", Value: statusCode.toString() },
        ],
      },
    ]);
  }

  // Error Tracking
  async recordProjectError(
    operation: "creation" | "minting" | "query" | "management",
    errorType: string,
    errorCategory: "validation" | "system" | "external_service" | "authorization",
    projectId?: string
  ): Promise<void> {
    const dimensions: MetricDimension[] = [
      { Name: "Operation", Value: operation },
      { Name: "ErrorType", Value: errorType },
      { Name: "ErrorCategory", Value: errorCategory },
    ];

    if (projectId) {
      dimensions.push({ Name: "ProjectId", Value: projectId });
    }

    await this.publishMetric({
      MetricName: "ProjectOperationError",
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: dimensions,
    });
  }

  // Hedera Network Health
  async recordHederaNetworkHealth(
    healthy: boolean,
    responseTime?: number,
    operation?: string
  ): Promise<void> {
    const metrics: CustomMetricData[] = [
      {
        MetricName: "HederaNetworkHealth",
        Value: healthy ? 1 : 0,
        Unit: StandardUnit.Count,
        Dimensions: operation ? [{ Name: "Operation", Value: operation }] : undefined,
      },
    ];

    if (responseTime !== undefined) {
      metrics.push({
        MetricName: "HederaNetworkLatency",
        Value: responseTime,
        Unit: StandardUnit.Milliseconds,
        Dimensions: operation ? [{ Name: "Operation", Value: operation }] : undefined,
      });
    }

    await this.publishMetrics(metrics);
  }

  // IPFS Network Health
  async recordIPFSNetworkHealth(
    healthy: boolean,
    responseTime?: number,
    operation?: string
  ): Promise<void> {
    const metrics: CustomMetricData[] = [
      {
        MetricName: "IPFSNetworkHealth",
        Value: healthy ? 1 : 0,
        Unit: StandardUnit.Count,
        Dimensions: operation ? [{ Name: "Operation", Value: operation }] : undefined,
      },
    ];

    if (responseTime !== undefined) {
      metrics.push({
        MetricName: "IPFSNetworkLatency",
        Value: responseTime,
        Unit: StandardUnit.Milliseconds,
        Dimensions: operation ? [{ Name: "Operation", Value: operation }] : undefined,
      });
    }

    await this.publishMetrics(metrics);
  }

  // Utility Methods
  private categorizeStockSupply(stockSupply: number): string {
    if (stockSupply <= 100) return "Small"; // <= 100 stocks
    if (stockSupply <= 1000) return "Medium"; // <= 1K stocks
    if (stockSupply <= 10000) return "Large"; // <= 10K stocks
    return "XLarge"; // > 10K stocks
  }

  // Override database latency method with project-specific signature
  async recordDatabaseLatency(
    operation: "create" | "read" | "update" | "delete",
    entity: "project" | "stock" | "transaction",
    latency: number
  ): Promise<void> {
    await this.publishMetric({
      MetricName: "ProjectDatabaseLatency",
      Value: latency,
      Unit: StandardUnit.Milliseconds,
      Dimensions: [
        { Name: "Operation", Value: operation },
        { Name: "Entity", Value: entity },
      ],
    });
  }

  // Batch metrics for efficiency
  async recordBatchMetrics(metrics: {
    projectCreations?: { success: number; failures: number };
    stockMintings?: { success: number; failures: number; totalStocks: number };
    hederaOperations?: { success: number; failures: number; totalGasCost: number };
    ipfsOperations?: { success: number; failures: number };
  }): Promise<void> {
    const batchMetrics: CustomMetricData[] = [];

    if (metrics.projectCreations) {
      batchMetrics.push(
        {
          MetricName: "ProjectCreationSuccess",
          Value: metrics.projectCreations.success,
          Unit: StandardUnit.Count,
        },
        {
          MetricName: "ProjectCreationFailure",
          Value: metrics.projectCreations.failures,
          Unit: StandardUnit.Count,
        }
      );
    }

    if (metrics.stockMintings) {
      batchMetrics.push(
        {
          MetricName: "StockMintingSuccess",
          Value: metrics.stockMintings.success,
          Unit: StandardUnit.Count,
        },
        {
          MetricName: "StockMintingFailure",
          Value: metrics.stockMintings.failures,
          Unit: StandardUnit.Count,
        },
        {
          MetricName: "StocksMinted",
          Value: metrics.stockMintings.totalStocks,
          Unit: StandardUnit.Count,
        }
      );
    }

    if (metrics.hederaOperations) {
      batchMetrics.push(
        {
          MetricName: "HederaOperationSuccess",
          Value: metrics.hederaOperations.success,
          Unit: StandardUnit.Count,
        },
        {
          MetricName: "HederaOperationFailure",
          Value: metrics.hederaOperations.failures,
          Unit: StandardUnit.Count,
        },
        {
          MetricName: "HederaTotalGasCost",
          Value: metrics.hederaOperations.totalGasCost,
          Unit: StandardUnit.None,
        }
      );
    }

    if (metrics.ipfsOperations) {
      batchMetrics.push(
        {
          MetricName: "IPFSOperationSuccess",
          Value: metrics.ipfsOperations.success,
          Unit: StandardUnit.Count,
        },
        {
          MetricName: "IPFSOperationFailure",
          Value: metrics.ipfsOperations.failures,
          Unit: StandardUnit.Count,
        }
      );
    }

    if (batchMetrics.length > 0) {
      await this.publishMetrics(batchMetrics);
    }
  }
}

// Factory function
export const createProjectMetrics = (): ProjectMetrics => ProjectMetrics.getInstance();

// Export singleton instance
export const projectMetrics = ProjectMetrics.getInstance();