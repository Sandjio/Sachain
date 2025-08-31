/**
 * Health check utilities for project-related services
 */

import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import {
  EventBridgeClient,
  DescribeEventBusCommand,
} from "@aws-sdk/client-eventbridge";

export interface HealthCheckResult {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  message: string;
  timestamp: string;
  responseTime?: number;
}

export interface HealthCheckSummary {
  overall: "healthy" | "unhealthy" | "degraded";
  services: HealthCheckResult[];
  timestamp: string;
}

export class HealthCheckService {
  private dynamoClient: DynamoDBClient;
  private s3Client: S3Client;
  private eventBridgeClient: EventBridgeClient;

  constructor() {
    this.dynamoClient = new DynamoDBClient({});
    this.s3Client = new S3Client({});
    this.eventBridgeClient = new EventBridgeClient({});
  }

  /**
   * Perform comprehensive health check of all project services
   */
  async performHealthCheck(): Promise<HealthCheckSummary> {
    const timestamp = new Date().toISOString();
    const services: HealthCheckResult[] = [];

    // Check DynamoDB
    services.push(await this.checkDynamoDB());

    // Check S3
    services.push(await this.checkS3());

    // Check EventBridge
    services.push(await this.checkEventBridge());

    // Check Hedera connectivity
    services.push(await this.checkHederaConnectivity());

    // Check IPFS connectivity
    services.push(await this.checkIPFSConnectivity());

    // Determine overall health
    const overall = this.determineOverallHealth(services);

    return {
      overall,
      services,
      timestamp,
    };
  }

  /**
   * Check DynamoDB table accessibility
   */
  private async checkDynamoDB(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const tableName = process.env.DYNAMODB_TABLE_NAME || "sachain-table";

    try {
      await this.dynamoClient.send(
        new DescribeTableCommand({
          TableName: tableName,
        })
      );

      const responseTime = Date.now() - startTime;

      return {
        service: "DynamoDB",
        status: responseTime < 1000 ? "healthy" : "degraded",
        message: `Table ${tableName} accessible`,
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } catch (error) {
      return {
        service: "DynamoDB",
        status: "unhealthy",
        message: `Failed to access table ${tableName}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check S3 bucket accessibility
   */
  private async checkS3(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const bucketName = process.env.S3_BUCKET_NAME || "sachain-project-images";

    try {
      await this.s3Client.send(
        new HeadBucketCommand({
          Bucket: bucketName,
        })
      );

      const responseTime = Date.now() - startTime;

      return {
        service: "S3",
        status: responseTime < 1000 ? "healthy" : "degraded",
        message: `Bucket ${bucketName} accessible`,
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } catch (error) {
      return {
        service: "S3",
        status: "unhealthy",
        message: `Failed to access bucket ${bucketName}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check EventBridge accessibility
   */
  private async checkEventBridge(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const eventBusName = process.env.EVENT_BUS_NAME || "default";

    try {
      await this.eventBridgeClient.send(
        new DescribeEventBusCommand({
          Name: eventBusName,
        })
      );

      const responseTime = Date.now() - startTime;

      return {
        service: "EventBridge",
        status: responseTime < 1000 ? "healthy" : "degraded",
        message: `Event bus ${eventBusName} accessible`,
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } catch (error) {
      return {
        service: "EventBridge",
        status: "unhealthy",
        message: `Failed to access event bus ${eventBusName}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Hedera network connectivity
   */
  private async checkHederaConnectivity(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Simple network connectivity check to Hedera testnet
      const response = await fetch(
        "https://testnet.mirrornode.hedera.com/api/v1/network/nodes",
        {
          method: "GET",
        }
      );

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          service: "Hedera",
          status: responseTime < 2000 ? "healthy" : "degraded",
          message: "Hedera network accessible",
          timestamp: new Date().toISOString(),
          responseTime,
        };
      } else {
        return {
          service: "Hedera",
          status: "unhealthy",
          message: `Hedera network returned ${response.status}`,
          timestamp: new Date().toISOString(),
          responseTime,
        };
      }
    } catch (error) {
      return {
        service: "Hedera",
        status: "unhealthy",
        message: `Failed to connect to Hedera network: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check IPFS connectivity
   */
  private async checkIPFSConnectivity(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const ipfsGateway = process.env.IPFS_GATEWAY || "https://ipfs.io";

    try {
      // Check IPFS gateway accessibility
      const response = await fetch(
        `${ipfsGateway}/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme`,
        {
          method: "HEAD",
        }
      );

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          service: "IPFS",
          status: responseTime < 3000 ? "healthy" : "degraded",
          message: "IPFS gateway accessible",
          timestamp: new Date().toISOString(),
          responseTime,
        };
      } else {
        return {
          service: "IPFS",
          status: "unhealthy",
          message: `IPFS gateway returned ${response.status}`,
          timestamp: new Date().toISOString(),
          responseTime,
        };
      }
    } catch (error) {
      return {
        service: "IPFS",
        status: "unhealthy",
        message: `Failed to connect to IPFS gateway: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Determine overall system health based on individual service health
   */
  private determineOverallHealth(
    services: HealthCheckResult[]
  ): "healthy" | "unhealthy" | "degraded" {
    const unhealthyServices = services.filter((s) => s.status === "unhealthy");
    const degradedServices = services.filter((s) => s.status === "degraded");

    if (unhealthyServices.length > 0) {
      return "unhealthy";
    }

    if (degradedServices.length > 0) {
      return "degraded";
    }

    return "healthy";
  }
}

/**
 * Lambda handler for health check endpoint
 */
export const healthCheckHandler = async (event: any) => {
  const healthCheckService = new HealthCheckService();

  try {
    const healthCheck = await healthCheckService.performHealthCheck();

    return {
      statusCode:
        healthCheck.overall === "healthy"
          ? 200
          : healthCheck.overall === "degraded"
          ? 200
          : 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(healthCheck),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        overall: "unhealthy",
        services: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
