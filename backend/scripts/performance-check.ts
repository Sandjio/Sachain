#!/usr/bin/env ts-node

/**
 * Performance monitoring and analysis script
 */

import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: "GOOD" | "WARNING" | "CRITICAL";
  trend?: "IMPROVING" | "STABLE" | "DEGRADING";
}

interface PerformanceReport {
  timestamp: string;
  overallScore: number;
  metrics: PerformanceMetric[];
  recommendations: string[];
}

class PerformanceMonitor {
  private cloudWatchClient: CloudWatchClient;

  constructor() {
    this.cloudWatchClient = new CloudWatchClient({});
  }

  async generatePerformanceReport(): Promise<PerformanceReport> {
    console.log("📊 Generating performance report...\n");

    const metrics: PerformanceMetric[] = [];
    const recommendations: string[] = [];

    // API Gateway performance
    metrics.push(...(await this.checkAPIGatewayPerformance()));

    // Lambda performance
    metrics.push(...(await this.checkLambdaPerformance()));

    // DynamoDB performance
    metrics.push(...(await this.checkDynamoDBPerformance()));

    // Calculate overall score
    const overallScore = this.calculateOverallScore(metrics);

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(metrics));

    return {
      timestamp: new Date().toISOString(),
      overallScore,
      metrics,
      recommendations,
    };
  }

  private async checkAPIGatewayPerformance(): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

    try {
      // API Gateway latency
      const latencyData = await this.cloudWatchClient.send(
        new GetMetricStatisticsCommand({
          Namespace: "AWS/ApiGateway",
          MetricName: "Latency",
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600,
          Statistics: ["Average"],
        })
      );

      const avgLatency = latencyData.Datapoints?.[0]?.Average || 0;
      metrics.push({
        name: "API Gateway Latency",
        value: avgLatency,
        unit: "ms",
        threshold: 1000,
        status:
          avgLatency < 500
            ? "GOOD"
            : avgLatency < 1000
            ? "WARNING"
            : "CRITICAL",
      });

      // API Gateway error rate
      const errorData = await this.cloudWatchClient.send(
        new GetMetricStatisticsCommand({
          Namespace: "AWS/ApiGateway",
          MetricName: "4XXError",
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600,
          Statistics: ["Sum"],
        })
      );

      const errorCount = errorData.Datapoints?.[0]?.Sum || 0;
      metrics.push({
        name: "API Gateway 4XX Errors",
        value: errorCount,
        unit: "count",
        threshold: 10,
        status:
          errorCount < 5 ? "GOOD" : errorCount < 10 ? "WARNING" : "CRITICAL",
      });

      // Throughput
      const countData = await this.cloudWatchClient.send(
        new GetMetricStatisticsCommand({
          Namespace: "AWS/ApiGateway",
          MetricName: "Count",
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600,
          Statistics: ["Sum"],
        })
      );

      const requestCount = countData.Datapoints?.[0]?.Sum || 0;
      metrics.push({
        name: "API Gateway Throughput",
        value: requestCount,
        unit: "requests/hour",
        threshold: 1000,
        status: "GOOD", // Throughput is informational
      });
    } catch (error) {
      console.warn(`Failed to get API Gateway metrics: ${error.message}`);
    }

    return metrics;
  }

  private async checkLambdaPerformance(): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);

    const lambdaFunctions = [
      "project-creation",
      "project-query",
      "project-management",
      "stock-minting",
    ];

    for (const functionName of lambdaFunctions) {
      try {
        const fullFunctionName = `sachain-${
          process.env.STAGE || "dev"
        }-${functionName}`;

        // Duration
        const durationData = await this.cloudWatchClient.send(
          new GetMetricStatisticsCommand({
            Namespace: "AWS/Lambda",
            MetricName: "Duration",
            Dimensions: [{ Name: "FunctionName", Value: fullFunctionName }],
            StartTime: startTime,
            EndTime: endTime,
            Period: 3600,
            Statistics: ["Average"],
          })
        );

        const avgDuration = durationData.Datapoints?.[0]?.Average || 0;
        metrics.push({
          name: `${functionName} Duration`,
          value: avgDuration,
          unit: "ms",
          threshold: 10000,
          status:
            avgDuration < 5000
              ? "GOOD"
              : avgDuration < 10000
              ? "WARNING"
              : "CRITICAL",
        });

        // Error rate
        const errorData = await this.cloudWatchClient.send(
          new GetMetricStatisticsCommand({
            Namespace: "AWS/Lambda",
            MetricName: "Errors",
            Dimensions: [{ Name: "FunctionName", Value: fullFunctionName }],
            StartTime: startTime,
            EndTime: endTime,
            Period: 3600,
            Statistics: ["Sum"],
          })
        );

        const errorCount = errorData.Datapoints?.[0]?.Sum || 0;
        metrics.push({
          name: `${functionName} Errors`,
          value: errorCount,
          unit: "count",
          threshold: 5,
          status:
            errorCount === 0 ? "GOOD" : errorCount < 5 ? "WARNING" : "CRITICAL",
        });

        // Cold starts
        const coldStartData = await this.cloudWatchClient.send(
          new GetMetricStatisticsCommand({
            Namespace: "AWS/Lambda",
            MetricName: "ConcurrentExecutions",
            Dimensions: [{ Name: "FunctionName", Value: fullFunctionName }],
            StartTime: startTime,
            EndTime: endTime,
            Period: 3600,
            Statistics: ["Maximum"],
          })
        );

        const maxConcurrency = coldStartData.Datapoints?.[0]?.Maximum || 0;
        metrics.push({
          name: `${functionName} Max Concurrency`,
          value: maxConcurrency,
          unit: "executions",
          threshold: 100,
          status:
            maxConcurrency < 50
              ? "GOOD"
              : maxConcurrency < 100
              ? "WARNING"
              : "CRITICAL",
        });
      } catch (error) {
        console.warn(
          `Failed to get metrics for ${functionName}: ${error.message}`
        );
      }
    }

    return metrics;
  }

  private async checkDynamoDBPerformance(): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
    const tableName = process.env.DYNAMODB_TABLE_NAME || "sachain-table";

    try {
      // Read throttling
      const readThrottleData = await this.cloudWatchClient.send(
        new GetMetricStatisticsCommand({
          Namespace: "AWS/DynamoDB",
          MetricName: "ReadThrottledEvents",
          Dimensions: [{ Name: "TableName", Value: tableName }],
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600,
          Statistics: ["Sum"],
        })
      );

      const readThrottles = readThrottleData.Datapoints?.[0]?.Sum || 0;
      metrics.push({
        name: "DynamoDB Read Throttles",
        value: readThrottles,
        unit: "count",
        threshold: 1,
        status: readThrottles === 0 ? "GOOD" : "CRITICAL",
      });

      // Write throttling
      const writeThrottleData = await this.cloudWatchClient.send(
        new GetMetricStatisticsCommand({
          Namespace: "AWS/DynamoDB",
          MetricName: "WriteThrottledEvents",
          Dimensions: [{ Name: "TableName", Value: tableName }],
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600,
          Statistics: ["Sum"],
        })
      );

      const writeThrottles = writeThrottleData.Datapoints?.[0]?.Sum || 0;
      metrics.push({
        name: "DynamoDB Write Throttles",
        value: writeThrottles,
        unit: "count",
        threshold: 1,
        status: writeThrottles === 0 ? "GOOD" : "CRITICAL",
      });

      // Consumed read capacity
      const readCapacityData = await this.cloudWatchClient.send(
        new GetMetricStatisticsCommand({
          Namespace: "AWS/DynamoDB",
          MetricName: "ConsumedReadCapacityUnits",
          Dimensions: [{ Name: "TableName", Value: tableName }],
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600,
          Statistics: ["Sum"],
        })
      );

      const consumedReadCapacity = readCapacityData.Datapoints?.[0]?.Sum || 0;
      metrics.push({
        name: "DynamoDB Read Capacity Used",
        value: consumedReadCapacity,
        unit: "units",
        threshold: 1000,
        status: "GOOD", // Informational metric
      });
    } catch (error) {
      console.warn(`Failed to get DynamoDB metrics: ${error.message}`);
    }

    return metrics;
  }

  private calculateOverallScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;

    const scores = metrics.map((metric) => {
      switch (metric.status) {
        case "GOOD":
          return 100;
        case "WARNING":
          return 70;
        case "CRITICAL":
          return 30;
        default:
          return 50;
      }
    });

    return Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    );
  }

  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];

    // Check for high latency
    const highLatencyMetrics = metrics.filter(
      (m) => m.name.includes("Latency") && m.status !== "GOOD"
    );
    if (highLatencyMetrics.length > 0) {
      recommendations.push(
        "Consider optimizing API response times by implementing caching or reducing payload sizes"
      );
    }

    // Check for errors
    const errorMetrics = metrics.filter(
      (m) => m.name.includes("Error") && m.value > 0
    );
    if (errorMetrics.length > 0) {
      recommendations.push(
        "Investigate and resolve error sources to improve reliability"
      );
    }

    // Check for throttling
    const throttleMetrics = metrics.filter(
      (m) => m.name.includes("Throttle") && m.value > 0
    );
    if (throttleMetrics.length > 0) {
      recommendations.push(
        "Enable DynamoDB auto-scaling or increase provisioned capacity to prevent throttling"
      );
    }

    // Check for high Lambda duration
    const slowLambdas = metrics.filter(
      (m) => m.name.includes("Duration") && m.value > 5000
    );
    if (slowLambdas.length > 0) {
      recommendations.push(
        "Optimize Lambda function code and consider increasing memory allocation for better performance"
      );
    }

    // Check for high concurrency
    const highConcurrency = metrics.filter(
      (m) => m.name.includes("Concurrency") && m.value > 50
    );
    if (highConcurrency.length > 0) {
      recommendations.push(
        "Monitor Lambda concurrency limits and consider provisioned concurrency for consistent performance"
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "System performance is optimal. Continue monitoring for any changes."
      );
    }

    return recommendations;
  }
}

async function main() {
  const monitor = new PerformanceMonitor();

  try {
    const report = await monitor.generatePerformanceReport();

    console.log("📊 Performance Report\n");
    console.log(`Generated: ${report.timestamp}`);
    console.log(`Overall Score: ${report.overallScore}/100\n`);

    // Group metrics by category
    const categories = new Map<string, PerformanceMetric[]>();

    for (const metric of report.metrics) {
      const category = metric.name.split(" ")[0];
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(metric);
    }

    // Display metrics by category
    for (const [category, metrics] of categories) {
      console.log(`\n🔍 ${category}:`);

      for (const metric of metrics) {
        const emoji =
          metric.status === "GOOD"
            ? "✅"
            : metric.status === "WARNING"
            ? "⚠️"
            : "❌";

        console.log(
          `  ${emoji} ${metric.name}: ${metric.value} ${metric.unit}`
        );

        if (metric.status !== "GOOD") {
          console.log(`     Threshold: ${metric.threshold} ${metric.unit}`);
        }
      }
    }

    // Display recommendations
    if (report.recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      for (let i = 0; i < report.recommendations.length; i++) {
        console.log(`  ${i + 1}. ${report.recommendations[i]}`);
      }
    }

    // Performance grade
    const grade =
      report.overallScore >= 90
        ? "A"
        : report.overallScore >= 80
        ? "B"
        : report.overallScore >= 70
        ? "C"
        : report.overallScore >= 60
        ? "D"
        : "F";

    console.log(`\n🎯 Performance Grade: ${grade}`);

    // Exit with appropriate code
    const criticalIssues = report.metrics.filter(
      (m) => m.status === "CRITICAL"
    ).length;
    process.exit(criticalIssues > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Performance check failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { PerformanceMonitor };
