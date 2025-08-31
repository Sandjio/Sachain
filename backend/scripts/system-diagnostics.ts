#!/usr/bin/env ts-node

/**
 * System diagnostics script for troubleshooting
 */

import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  LambdaClient,
  ListFunctionsCommand,
  GetFunctionCommand,
} from "@aws-sdk/client-lambda";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

interface DiagnosticResult {
  category: string;
  checks: Array<{
    name: string;
    status: "PASS" | "FAIL" | "WARNING";
    message: string;
    details?: any;
  }>;
}

class SystemDiagnostics {
  private cloudWatchClient: CloudWatchClient;
  private lambdaClient: LambdaClient;
  private dynamoClient: DynamoDBClient;

  constructor() {
    this.cloudWatchClient = new CloudWatchClient({});
    this.lambdaClient = new LambdaClient({});
    this.dynamoClient = new DynamoDBClient({});
  }

  async runDiagnostics(): Promise<DiagnosticResult[]> {
    console.log("🔍 Running system diagnostics...\n");

    const results: DiagnosticResult[] = [];

    // Lambda function diagnostics
    results.push(await this.diagnoseLambdaFunctions());

    // DynamoDB diagnostics
    results.push(await this.diagnoseDynamoDB());

    // CloudWatch metrics diagnostics
    results.push(await this.diagnoseMetrics());

    // Performance diagnostics
    results.push(await this.diagnosePerformance());

    return results;
  }

  private async diagnoseLambdaFunctions(): Promise<DiagnosticResult> {
    const checks = [];
    const stage = process.env.STAGE || "dev";

    try {
      const functions = await this.lambdaClient.send(
        new ListFunctionsCommand({})
      );
      const sachainFunctions =
        functions.Functions?.filter((f) =>
          f.FunctionName?.includes(`sachain-${stage}`)
        ) || [];

      checks.push({
        name: "Lambda Functions Count",
        status: sachainFunctions.length >= 4 ? "PASS" : ("WARNING" as const),
        message: `Found ${sachainFunctions.length} Sachain Lambda functions`,
        details: sachainFunctions.map((f) => f.FunctionName),
      });

      // Check each function's configuration
      for (const func of sachainFunctions) {
        if (func.FunctionName) {
          try {
            const config = await this.lambdaClient.send(
              new GetFunctionCommand({
                FunctionName: func.FunctionName,
              })
            );

            const memorySize = config.Configuration?.MemorySize || 0;
            const timeout = config.Configuration?.Timeout || 0;

            checks.push({
              name: `${func.FunctionName} Configuration`,
              status:
                memorySize >= 128 && timeout >= 30
                  ? "PASS"
                  : ("WARNING" as const),
              message: `Memory: ${memorySize}MB, Timeout: ${timeout}s`,
              details: {
                runtime: config.Configuration?.Runtime,
                lastModified: config.Configuration?.LastModified,
                codeSize: config.Configuration?.CodeSize,
              },
            });
          } catch (error) {
            checks.push({
              name: `${func.FunctionName} Configuration`,
              status: "FAIL" as const,
              message: `Failed to get configuration: ${error.message}`,
            });
          }
        }
      }
    } catch (error) {
      checks.push({
        name: "Lambda Functions List",
        status: "FAIL" as const,
        message: `Failed to list functions: ${error.message}`,
      });
    }

    return {
      category: "Lambda Functions",
      checks,
    };
  }

  private async diagnoseDynamoDB(): Promise<DiagnosticResult> {
    const checks = [];
    const tableName = process.env.DYNAMODB_TABLE_NAME || "sachain-table";

    try {
      const table = await this.dynamoClient.send(
        new DescribeTableCommand({
          TableName: tableName,
        })
      );

      checks.push({
        name: "Table Status",
        status:
          table.Table?.TableStatus === "ACTIVE" ? "PASS" : ("FAIL" as const),
        message: `Table status: ${table.Table?.TableStatus}`,
        details: {
          itemCount: table.Table?.ItemCount,
          tableSize: table.Table?.TableSizeBytes,
          creationDate: table.Table?.CreationDateTime,
        },
      });

      // Check GSI status
      const gsiCount = table.Table?.GlobalSecondaryIndexes?.length || 0;
      const activeGSIs =
        table.Table?.GlobalSecondaryIndexes?.filter(
          (gsi) => gsi.IndexStatus === "ACTIVE"
        ).length || 0;

      checks.push({
        name: "Global Secondary Indexes",
        status: activeGSIs === gsiCount ? "PASS" : ("WARNING" as const),
        message: `${activeGSIs}/${gsiCount} GSIs active`,
        details: table.Table?.GlobalSecondaryIndexes?.map((gsi) => ({
          name: gsi.IndexName,
          status: gsi.IndexStatus,
        })),
      });

      // Check billing mode and capacity
      const billingMode = table.Table?.BillingModeSummary?.BillingMode;
      checks.push({
        name: "Billing Configuration",
        status: "PASS" as const,
        message: `Billing mode: ${billingMode}`,
        details: {
          billingMode,
          provisionedThroughput: table.Table?.ProvisionedThroughput,
        },
      });
    } catch (error) {
      checks.push({
        name: "DynamoDB Table Access",
        status: "FAIL" as const,
        message: `Failed to access table: ${error.message}`,
      });
    }

    return {
      category: "DynamoDB",
      checks,
    };
  }

  private async diagnoseMetrics(): Promise<DiagnosticResult> {
    const checks = [];
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

    try {
      // Check API Gateway metrics
      const apiMetrics = await this.cloudWatchClient.send(
        new GetMetricStatisticsCommand({
          Namespace: "AWS/ApiGateway",
          MetricName: "Count",
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600,
          Statistics: ["Sum"],
        })
      );

      const requestCount = apiMetrics.Datapoints?.[0]?.Sum || 0;
      checks.push({
        name: "API Request Volume",
        status: "PASS" as const,
        message: `${requestCount} requests in last hour`,
        details: { requestCount, period: "1 hour" },
      });

      // Check Lambda error rates
      const lambdaErrors = await this.cloudWatchClient.send(
        new GetMetricStatisticsCommand({
          Namespace: "AWS/Lambda",
          MetricName: "Errors",
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600,
          Statistics: ["Sum"],
        })
      );

      const errorCount = lambdaErrors.Datapoints?.[0]?.Sum || 0;
      checks.push({
        name: "Lambda Error Rate",
        status: errorCount < 10 ? "PASS" : ("WARNING" as const),
        message: `${errorCount} errors in last hour`,
        details: { errorCount, period: "1 hour" },
      });
    } catch (error) {
      checks.push({
        name: "CloudWatch Metrics Access",
        status: "FAIL" as const,
        message: `Failed to retrieve metrics: ${error.message}`,
      });
    }

    return {
      category: "CloudWatch Metrics",
      checks,
    };
  }

  private async diagnosePerformance(): Promise<DiagnosticResult> {
    const checks = [];

    try {
      // Check system resources
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      checks.push({
        name: "Memory Usage",
        status:
          memoryUsage.heapUsed < 100 * 1024 * 1024
            ? "PASS"
            : ("WARNING" as const),
        message: `Heap used: ${Math.round(
          memoryUsage.heapUsed / 1024 / 1024
        )}MB`,
        details: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
        },
      });

      checks.push({
        name: "Process Uptime",
        status: "PASS" as const,
        message: `${Math.round(uptime)}s`,
        details: { uptime },
      });

      // Test database connection speed
      const dbStartTime = Date.now();
      try {
        await this.dynamoClient.send(
          new DescribeTableCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME || "sachain-table",
          })
        );
        const dbResponseTime = Date.now() - dbStartTime;

        checks.push({
          name: "Database Response Time",
          status: dbResponseTime < 1000 ? "PASS" : ("WARNING" as const),
          message: `${dbResponseTime}ms`,
          details: { responseTime: dbResponseTime },
        });
      } catch (error) {
        checks.push({
          name: "Database Response Time",
          status: "FAIL" as const,
          message: `Database connection failed: ${error.message}`,
        });
      }
    } catch (error) {
      checks.push({
        name: "Performance Diagnostics",
        status: "FAIL" as const,
        message: `Performance check failed: ${error.message}`,
      });
    }

    return {
      category: "Performance",
      checks,
    };
  }
}

async function main() {
  const diagnostics = new SystemDiagnostics();

  try {
    const results = await diagnostics.runDiagnostics();

    console.log("\n📊 Diagnostic Results:\n");

    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    let warningChecks = 0;

    for (const category of results) {
      console.log(`\n🔍 ${category.category}:`);

      for (const check of category.checks) {
        totalChecks++;

        const emoji =
          check.status === "PASS"
            ? "✅"
            : check.status === "FAIL"
            ? "❌"
            : "⚠️";

        console.log(`  ${emoji} ${check.name}: ${check.message}`);

        if (check.details && process.argv.includes("--verbose")) {
          console.log(
            `     Details: ${JSON.stringify(check.details, null, 2)}`
          );
        }

        switch (check.status) {
          case "PASS":
            passedChecks++;
            break;
          case "FAIL":
            failedChecks++;
            break;
          case "WARNING":
            warningChecks++;
            break;
        }
      }
    }

    console.log("\n📈 Summary:");
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`✅ Passed: ${passedChecks}`);
    console.log(`⚠️ Warnings: ${warningChecks}`);
    console.log(`❌ Failed: ${failedChecks}`);

    const overallStatus =
      failedChecks > 0 ? "CRITICAL" : warningChecks > 0 ? "WARNING" : "HEALTHY";

    console.log(`\nOverall Status: ${overallStatus}`);

    // Exit with appropriate code
    process.exit(failedChecks > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Diagnostics failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SystemDiagnostics };
