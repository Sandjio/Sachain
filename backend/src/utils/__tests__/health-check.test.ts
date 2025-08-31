/**
 * Unit tests for health check service
 */

import { HealthCheckService } from "../health-check";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import {
  EventBridgeClient,
  DescribeEventBusCommand,
} from "@aws-sdk/client-eventbridge";

// Mock AWS clients
const dynamoMock = mockClient(DynamoDBClient);
const s3Mock = mockClient(S3Client);
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock fetch globally
global.fetch = jest.fn();

describe("HealthCheckService", () => {
  let healthCheckService: HealthCheckService;

  beforeEach(() => {
    healthCheckService = new HealthCheckService();

    // Reset all mocks
    dynamoMock.reset();
    s3Mock.reset();
    eventBridgeMock.reset();
    (global.fetch as jest.Mock).mockReset();
  });

  describe("performHealthCheck", () => {
    it("should return healthy status when all services are operational", async () => {
      // Mock successful responses
      dynamoMock.on(DescribeTableCommand).resolves({
        Table: { TableStatus: "ACTIVE" },
      });

      s3Mock.on(HeadBucketCommand).resolves({});

      eventBridgeMock.on(DescribeEventBusCommand).resolves({
        Name: "default",
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Hedera
        .mockResolvedValueOnce({ ok: true, status: 200 }); // IPFS

      const result = await healthCheckService.performHealthCheck();

      expect(result.overall).toBe("healthy");
      expect(result.services).toHaveLength(5);
      expect(result.services.every((s) => s.status === "healthy")).toBe(true);
    });

    it("should return degraded status when services are slow but functional", async () => {
      // Mock slow but successful responses
      dynamoMock.on(DescribeTableCommand).callsFake(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Slow response
        return { Table: { TableStatus: "ACTIVE" } };
      });

      s3Mock.on(HeadBucketCommand).resolves({});
      eventBridgeMock.on(DescribeEventBusCommand).resolves({ Name: "default" });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await healthCheckService.performHealthCheck();

      expect(result.overall).toBe("degraded");
      expect(
        result.services.find((s) => s.service === "DynamoDB")?.status
      ).toBe("degraded");
    });

    it("should return unhealthy status when critical services fail", async () => {
      // Mock DynamoDB failure
      dynamoMock.on(DescribeTableCommand).rejects(new Error("Table not found"));

      s3Mock.on(HeadBucketCommand).resolves({});
      eventBridgeMock.on(DescribeEventBusCommand).resolves({ Name: "default" });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await healthCheckService.performHealthCheck();

      expect(result.overall).toBe("unhealthy");
      expect(
        result.services.find((s) => s.service === "DynamoDB")?.status
      ).toBe("unhealthy");
    });

    it("should handle S3 service failures", async () => {
      dynamoMock.on(DescribeTableCommand).resolves({
        Table: { TableStatus: "ACTIVE" },
      });

      s3Mock.on(HeadBucketCommand).rejects(new Error("Access denied"));

      eventBridgeMock.on(DescribeEventBusCommand).resolves({ Name: "default" });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await healthCheckService.performHealthCheck();

      expect(result.overall).toBe("unhealthy");
      expect(result.services.find((s) => s.service === "S3")?.status).toBe(
        "unhealthy"
      );
    });

    it("should handle EventBridge service failures", async () => {
      dynamoMock.on(DescribeTableCommand).resolves({
        Table: { TableStatus: "ACTIVE" },
      });

      s3Mock.on(HeadBucketCommand).resolves({});

      eventBridgeMock
        .on(DescribeEventBusCommand)
        .rejects(new Error("Service unavailable"));

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await healthCheckService.performHealthCheck();

      expect(result.overall).toBe("unhealthy");
      expect(
        result.services.find((s) => s.service === "EventBridge")?.status
      ).toBe("unhealthy");
    });

    it("should handle Hedera network failures", async () => {
      dynamoMock.on(DescribeTableCommand).resolves({
        Table: { TableStatus: "ACTIVE" },
      });

      s3Mock.on(HeadBucketCommand).resolves({});
      eventBridgeMock.on(DescribeEventBusCommand).resolves({ Name: "default" });

      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error")) // Hedera fails
        .mockResolvedValueOnce({ ok: true, status: 200 }); // IPFS succeeds

      const result = await healthCheckService.performHealthCheck();

      expect(result.overall).toBe("unhealthy");
      expect(result.services.find((s) => s.service === "Hedera")?.status).toBe(
        "unhealthy"
      );
    });

    it("should handle IPFS service failures", async () => {
      dynamoMock.on(DescribeTableCommand).resolves({
        Table: { TableStatus: "ACTIVE" },
      });

      s3Mock.on(HeadBucketCommand).resolves({});
      eventBridgeMock.on(DescribeEventBusCommand).resolves({ Name: "default" });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Hedera succeeds
        .mockResolvedValueOnce({ ok: false, status: 503 }); // IPFS fails

      const result = await healthCheckService.performHealthCheck();

      expect(result.overall).toBe("unhealthy");
      expect(result.services.find((s) => s.service === "IPFS")?.status).toBe(
        "unhealthy"
      );
    });

    it("should include response times in health check results", async () => {
      dynamoMock.on(DescribeTableCommand).resolves({
        Table: { TableStatus: "ACTIVE" },
      });

      s3Mock.on(HeadBucketCommand).resolves({});
      eventBridgeMock.on(DescribeEventBusCommand).resolves({ Name: "default" });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await healthCheckService.performHealthCheck();

      expect(
        result.services.every((s) => typeof s.responseTime === "number")
      ).toBe(true);
      expect(result.services.every((s) => s.responseTime! >= 0)).toBe(true);
    });

    it("should use environment variables for service configuration", async () => {
      const originalTableName = process.env.DYNAMODB_TABLE_NAME;
      const originalBucketName = process.env.S3_BUCKET_NAME;
      const originalEventBusName = process.env.EVENT_BUS_NAME;

      process.env.DYNAMODB_TABLE_NAME = "custom-table";
      process.env.S3_BUCKET_NAME = "custom-bucket";
      process.env.EVENT_BUS_NAME = "custom-bus";

      dynamoMock.on(DescribeTableCommand).resolves({
        Table: { TableStatus: "ACTIVE" },
      });

      s3Mock.on(HeadBucketCommand).resolves({});
      eventBridgeMock
        .on(DescribeEventBusCommand)
        .resolves({ Name: "custom-bus" });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      await healthCheckService.performHealthCheck();

      expect(
        dynamoMock.commandCalls(DescribeTableCommand)[0].args[0].input
      ).toEqual({
        TableName: "custom-table",
      });

      expect(s3Mock.commandCalls(HeadBucketCommand)[0].args[0].input).toEqual({
        Bucket: "custom-bucket",
      });

      expect(
        eventBridgeMock.commandCalls(DescribeEventBusCommand)[0].args[0].input
      ).toEqual({
        Name: "custom-bus",
      });

      // Restore environment variables
      process.env.DYNAMODB_TABLE_NAME = originalTableName;
      process.env.S3_BUCKET_NAME = originalBucketName;
      process.env.EVENT_BUS_NAME = originalEventBusName;
    });
  });
});
