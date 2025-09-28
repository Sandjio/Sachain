#!/usr/bin/env ts-node

/**
 * Deployment validation and smoke tests for project creation feature
 */

import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  APIGatewayClient,
  GetRestApisCommand,
} from "@aws-sdk/client-api-gateway";

interface ValidationResult {
  test: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  duration: number;
}

interface ValidationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: ValidationResult[];
  overallStatus: "PASS" | "FAIL";
}

class DeploymentValidator {
  private dynamoClient: DynamoDBClient;
  private lambdaClient: LambdaClient;
  private apiGatewayClient: APIGatewayClient;
  private results: ValidationResult[] = [];

  constructor() {
    this.dynamoClient = new DynamoDBClient({});
    this.lambdaClient = new LambdaClient({});
    this.apiGatewayClient = new APIGatewayClient({});
  }

  /**
   * Run all deployment validation tests
   */
  async runValidation(): Promise<ValidationSummary> {
    console.log("🚀 Starting deployment validation...\n");

    // Infrastructure validation
    await this.validateDynamoDBTable();
    await this.validateLambdaFunctions();
    await this.validateAPIGateway();

    // Service health checks
    await this.validateHealthEndpoints();

    // Smoke tests
    await this.runSmokeTests();

    return this.generateSummary();
  }

  /**
   * Validate DynamoDB table exists and is accessible
   */
  private async validateDynamoDBTable(): Promise<void> {
    const startTime = Date.now();
    const tableName = process.env.DYNAMODB_TABLE_NAME || "sachain-table";

    try {
      const result = await this.dynamoClient.send(
        new DescribeTableCommand({
          TableName: tableName,
        })
      );

      if (result.Table?.TableStatus === "ACTIVE") {
        this.addResult(
          "DynamoDB Table Validation",
          "PASS",
          `Table ${tableName} is active with ${
            result.Table.GlobalSecondaryIndexes?.length || 0
          } GSIs`,
          Date.now() - startTime
        );
      } else {
        this.addResult(
          "DynamoDB Table Validation",
          "FAIL",
          `Table ${tableName} status: ${result.Table?.TableStatus}`,
          Date.now() - startTime
        );
      }
    } catch (error) {
      this.addResult(
        "DynamoDB Table Validation",
        "FAIL",
        `Failed to describe table: ${error.message}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Validate Lambda functions are deployed and invokable
   */
  private async validateLambdaFunctions(): Promise<void> {
    const functions = [
      "project-creation",
      "project-query",
      "project-management",
      "stock-minting",
    ];

    for (const functionName of functions) {
      await this.validateLambdaFunction(functionName);
    }
  }

  private async validateLambdaFunction(functionName: string): Promise<void> {
    const startTime = Date.now();
    const fullFunctionName = `sachain-${
      process.env.STAGE || "dev"
    }-${functionName}`;

    try {
      const result = await this.lambdaClient.send(
        new InvokeCommand({
          FunctionName: fullFunctionName,
          InvocationType: "RequestResponse",
          Payload: JSON.stringify({
            httpMethod: "GET",
            path: "/health",
            headers: {},
            queryStringParameters: null,
            body: null,
          }),
        })
      );

      if (result.StatusCode === 200) {
        this.addResult(
          `Lambda Function: ${functionName}`,
          "PASS",
          "Function invoked successfully",
          Date.now() - startTime
        );
      } else {
        this.addResult(
          `Lambda Function: ${functionName}`,
          "FAIL",
          `Function returned status code: ${result.StatusCode}`,
          Date.now() - startTime
        );
      }
    } catch (error) {
      this.addResult(
        `Lambda Function: ${functionName}`,
        "FAIL",
        `Failed to invoke function: ${error.message}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Validate API Gateway is deployed and accessible
   */
  private async validateAPIGateway(): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await this.apiGatewayClient.send(
        new GetRestApisCommand({})
      );
      const sachainApi = result.items?.find((api) =>
        api.name?.includes("sachain")
      );

      if (sachainApi) {
        this.addResult(
          "API Gateway Validation",
          "PASS",
          `API ${sachainApi.name} found with ID: ${sachainApi.id}`,
          Date.now() - startTime
        );
      } else {
        this.addResult(
          "API Gateway Validation",
          "FAIL",
          "Sachain API not found in deployed APIs",
          Date.now() - startTime
        );
      }
    } catch (error) {
      this.addResult(
        "API Gateway Validation",
        "FAIL",
        `Failed to list APIs: ${error.message}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Validate health check endpoints
   */
  private async validateHealthEndpoints(): Promise<void> {
    const baseUrl = process.env.API_BASE_URL;

    if (!baseUrl) {
      this.addResult(
        "Health Endpoint Validation",
        "SKIP",
        "API_BASE_URL not configured",
        0
      );
      return;
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: "GET",
      });

      if (response.ok) {
        const healthData = await response.json();
        this.addResult(
          "Health Endpoint Validation",
          "PASS",
          `Health endpoint returned: ${healthData.overall}`,
          Date.now() - startTime
        );
      } else {
        this.addResult(
          "Health Endpoint Validation",
          "FAIL",
          `Health endpoint returned status: ${response.status}`,
          Date.now() - startTime
        );
      }
    } catch (error) {
      this.addResult(
        "Health Endpoint Validation",
        "FAIL",
        `Failed to call health endpoint: ${error.message}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Run smoke tests for critical functionality
   */
  private async runSmokeTests(): Promise<void> {
    await this.smokeTestProjectCreation();
    await this.smokeTestProjectQuery();
  }

  /**
   * Smoke test for project creation endpoint
   */
  private async smokeTestProjectCreation(): Promise<void> {
    const baseUrl = process.env.API_BASE_URL;

    if (!baseUrl) {
      this.addResult(
        "Smoke Test: Project Creation",
        "SKIP",
        "API_BASE_URL not configured",
        0
      );
      return;
    }

    const startTime = Date.now();

    try {
      // Test with invalid data to ensure validation works
      const response = await fetch(`${baseUrl}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer invalid-token",
        },
        body: JSON.stringify({
          name: "", // Invalid: empty name
          description: "Test project",
          category: "technology",
        }),
      });

      // We expect this to fail with 400 or 401
      if (response.status === 400 || response.status === 401) {
        this.addResult(
          "Smoke Test: Project Creation",
          "PASS",
          `Validation working correctly (status: ${response.status})`,
          Date.now() - startTime
        );
      } else {
        this.addResult(
          "Smoke Test: Project Creation",
          "FAIL",
          `Unexpected response status: ${response.status}`,
          Date.now() - startTime
        );
      }
    } catch (error) {
      this.addResult(
        "Smoke Test: Project Creation",
        "FAIL",
        `Failed to test project creation: ${error.message}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Smoke test for project query endpoint
   */
  private async smokeTestProjectQuery(): Promise<void> {
    const baseUrl = process.env.API_BASE_URL;

    if (!baseUrl) {
      this.addResult(
        "Smoke Test: Project Query",
        "SKIP",
        "API_BASE_URL not configured",
        0
      );
      return;
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${baseUrl}/projects`, {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });

      // We expect this to fail with 401 (unauthorized)
      if (response.status === 401) {
        this.addResult(
          "Smoke Test: Project Query",
          "PASS",
          "Authentication working correctly",
          Date.now() - startTime
        );
      } else {
        this.addResult(
          "Smoke Test: Project Query",
          "FAIL",
          `Unexpected response status: ${response.status}`,
          Date.now() - startTime
        );
      }
    } catch (error) {
      this.addResult(
        "Smoke Test: Project Query",
        "FAIL",
        `Failed to test project query: ${error.message}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Add a test result
   */
  private addResult(
    test: string,
    status: "PASS" | "FAIL" | "SKIP",
    message: string,
    duration: number
  ): void {
    this.results.push({ test, status, message, duration });

    const emoji = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️";
    console.log(`${emoji} ${test}: ${message} (${duration}ms)`);
  }

  /**
   * Generate validation summary
   */
  private generateSummary(): ValidationSummary {
    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;
    const skipped = this.results.filter((r) => r.status === "SKIP").length;

    return {
      totalTests: this.results.length,
      passed,
      failed,
      skipped,
      results: this.results,
      overallStatus: failed > 0 ? "FAIL" : "PASS",
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  const validator = new DeploymentValidator();

  try {
    const summary = await validator.runValidation();

    console.log("\n📊 Validation Summary:");
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️ Skipped: ${summary.skipped}`);
    console.log(
      `\nOverall Status: ${
        summary.overallStatus === "PASS" ? "✅ PASS" : "❌ FAIL"
      }`
    );

    // Exit with appropriate code
    process.exit(summary.overallStatus === "PASS" ? 0 : 1);
  } catch (error) {
    console.error("❌ Validation failed with error:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DeploymentValidator, ValidationResult, ValidationSummary };
