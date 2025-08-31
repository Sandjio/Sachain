/**
 * Unit tests for health check Lambda function
 */

import { handler } from "../index";
import { HealthCheckService } from "../../../utils/health-check";
import { APIGatewayProxyEvent } from "aws-lambda";

// Mock the health check service
jest.mock("../../../utils/health-check");
const MockedHealthCheckService = HealthCheckService as jest.MockedClass<
  typeof HealthCheckService
>;

// Mock structured logger
jest.mock("../../../utils/structured-logger", () => ({
  StructuredLogger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

describe("Health Check Lambda Handler", () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockHealthCheckService: jest.Mocked<HealthCheckService>;

  beforeEach(() => {
    mockEvent = {
      requestContext: {
        requestId: "test-request-id",
      },
    } as APIGatewayProxyEvent;

    mockHealthCheckService = {
      performHealthCheck: jest.fn(),
    } as any;

    MockedHealthCheckService.mockImplementation(() => mockHealthCheckService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 status for healthy system", async () => {
    const healthyResult = {
      overall: "healthy" as const,
      services: [
        {
          service: "DynamoDB",
          status: "healthy" as const,
          message: "Table accessible",
          timestamp: "2024-01-01T00:00:00Z",
          responseTime: 100,
        },
      ],
      timestamp: "2024-01-01T00:00:00Z",
    };

    mockHealthCheckService.performHealthCheck.mockResolvedValue(healthyResult);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(healthyResult);
    expect(result.headers?.["Content-Type"]).toBe("application/json");
    expect(result.headers?.["Cache-Control"]).toBe(
      "no-cache, no-store, must-revalidate"
    );
  });

  it("should return 200 status for degraded system", async () => {
    const degradedResult = {
      overall: "degraded" as const,
      services: [
        {
          service: "DynamoDB",
          status: "degraded" as const,
          message: "Table accessible but slow",
          timestamp: "2024-01-01T00:00:00Z",
          responseTime: 1500,
        },
      ],
      timestamp: "2024-01-01T00:00:00Z",
    };

    mockHealthCheckService.performHealthCheck.mockResolvedValue(degradedResult);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(degradedResult);
  });

  it("should return 503 status for unhealthy system", async () => {
    const unhealthyResult = {
      overall: "unhealthy" as const,
      services: [
        {
          service: "DynamoDB",
          status: "unhealthy" as const,
          message: "Table not accessible",
          timestamp: "2024-01-01T00:00:00Z",
          responseTime: 5000,
        },
      ],
      timestamp: "2024-01-01T00:00:00Z",
    };

    mockHealthCheckService.performHealthCheck.mockResolvedValue(
      unhealthyResult
    );

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(503);
    expect(JSON.parse(result.body)).toEqual(unhealthyResult);
  });

  it("should return 500 status when health check service fails", async () => {
    const error = new Error("Health check service unavailable");
    mockHealthCheckService.performHealthCheck.mockRejectedValue(error);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(500);

    const responseBody = JSON.parse(result.body);
    expect(responseBody.overall).toBe("unhealthy");
    expect(responseBody.services).toEqual([]);
    expect(responseBody.error).toBe("Health check service unavailable");
    expect(responseBody.timestamp).toBeDefined();
  });

  it("should include proper cache control headers", async () => {
    const healthyResult = {
      overall: "healthy" as const,
      services: [],
      timestamp: "2024-01-01T00:00:00Z",
    };

    mockHealthCheckService.performHealthCheck.mockResolvedValue(healthyResult);

    const result = await handler(mockEvent);

    expect(result.headers?.["Cache-Control"]).toBe(
      "no-cache, no-store, must-revalidate"
    );
    expect(result.headers?.["Pragma"]).toBe("no-cache");
    expect(result.headers?.["Expires"]).toBe("0");
  });

  it("should handle missing request context gracefully", async () => {
    const eventWithoutContext = {} as APIGatewayProxyEvent;

    const healthyResult = {
      overall: "healthy" as const,
      services: [],
      timestamp: "2024-01-01T00:00:00Z",
    };

    mockHealthCheckService.performHealthCheck.mockResolvedValue(healthyResult);

    const result = await handler(eventWithoutContext);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(healthyResult);
  });

  it("should call health check service exactly once", async () => {
    const healthyResult = {
      overall: "healthy" as const,
      services: [],
      timestamp: "2024-01-01T00:00:00Z",
    };

    mockHealthCheckService.performHealthCheck.mockResolvedValue(healthyResult);

    await handler(mockEvent);

    expect(mockHealthCheckService.performHealthCheck).toHaveBeenCalledTimes(1);
    expect(mockHealthCheckService.performHealthCheck).toHaveBeenCalledWith();
  });

  it("should return JSON content type for all responses", async () => {
    // Test successful response
    mockHealthCheckService.performHealthCheck.mockResolvedValue({
      overall: "healthy" as const,
      services: [],
      timestamp: "2024-01-01T00:00:00Z",
    });

    let result = await handler(mockEvent);
    expect(result.headers?.["Content-Type"]).toBe("application/json");

    // Test error response
    mockHealthCheckService.performHealthCheck.mockRejectedValue(
      new Error("Test error")
    );

    result = await handler(mockEvent);
    expect(result.headers?.["Content-Type"]).toBe("application/json");
  });
});
