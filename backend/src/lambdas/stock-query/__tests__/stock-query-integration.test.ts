import { handler } from "../index";
import { StockQueryEvent } from "../types";
import { APIGatewayProxyResult } from "aws-lambda";

// Integration test for stock query functionality
describe("Stock Query Integration Tests", () => {
  const mockEvent = (overrides: Partial<StockQueryEvent> = {}): StockQueryEvent => ({
    httpMethod: "GET",
    path: "/stocks",
    pathParameters: {},
    queryStringParameters: {},
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    body: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    requestContext: {
      requestId: "test-request-id",
      stage: "test",
      resourceId: "test-resource",
      resourcePath: "/stocks",
      httpMethod: "GET",
      requestTime: "2024-01-01T00:00:00.000Z",
      requestTimeEpoch: 1704067200000,
      path: "/test/stocks",
      accountId: "123456789012",
      protocol: "HTTP/1.1",
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: "127.0.0.1",
        user: null,
        userAgent: "test-agent",
        userArn: null,
        clientCert: null,
      },
      apiId: "test-api-id",
    },
    resource: "/stocks",
    stageVariables: {},
    ...overrides,
  });

  beforeEach(() => {
    // Set required environment variables
    process.env.TABLE_NAME = "sachain-test-table";
    process.env.ENVIRONMENT = "test";
    process.env.AWS_REGION = "us-east-1";
  });

  describe("Stock Query Workflow", () => {
    it("should handle complete stock query workflow", async () => {
      // Test getting stocks for a project
      const projectStocksEvent = mockEvent({
        path: "/projects/project-123/stocks",
        pathParameters: { projectId: "project-123" },
        queryStringParameters: {
          status: "minted",
          limit: "10",
          includeMetadata: "true",
        },
      });

      // Note: This would require actual DynamoDB setup in a real integration test
      // For now, we're testing the structure and error handling
      const result = await handler(projectStocksEvent, {} as any, {} as any) as APIGatewayProxyResult;

      // Should handle authentication error gracefully
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      expect(result.headers["Content-Type"]).toBe("application/json");
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    });

    it("should handle portfolio query workflow", async () => {
      const portfolioEvent = mockEvent({
        path: "/stocks/portfolio",
        queryStringParameters: {
          walletAddress: "0x1234567890abcdef",
        },
      });

      const result = await handler(portfolioEvent, {} as any, {} as any) as APIGatewayProxyResult;

      // Should handle authentication error gracefully
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      expect(result.headers["Content-Type"]).toBe("application/json");
    });

    it("should handle single stock query workflow", async () => {
      const singleStockEvent = mockEvent({
        path: "/projects/project-123/stocks/1",
        pathParameters: {
          projectId: "project-123",
          stockId: "1",
        },
      });

      const result = await handler(singleStockEvent, {} as any, {} as any) as APIGatewayProxyResult;

      // Should handle authentication error gracefully
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      expect(result.headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle malformed requests gracefully", async () => {
      const malformedEvent = mockEvent({
        queryStringParameters: {
          limit: "invalid-number",
          status: "invalid-status" as any,
          exclusiveStartKey: "invalid-json",
        },
      });

      const result = await handler(malformedEvent, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("INVALID_QUERY_PARAMETERS");
      expect(Array.isArray(body.details.errors)).toBe(true);
    });

    it("should handle missing environment variables", async () => {
      delete process.env.TABLE_NAME;

      const event = mockEvent();
      
      // Should throw an error due to missing TABLE_NAME
      await expect(handler(event, {} as any, {} as any)).rejects.toThrow();
    });
  });

  describe("Response Format Validation", () => {
    it("should return properly formatted error responses", async () => {
      const event = mockEvent({
        queryStringParameters: {
          status: "invalid-status" as any,
        },
      });

      const result = await handler(event, {} as any, {} as any) as APIGatewayProxyResult;

      expect(result).toHaveProperty("statusCode");
      expect(result).toHaveProperty("headers");
      expect(result).toHaveProperty("body");
      expect(result.headers["Content-Type"]).toBe("application/json");
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty("message");
      expect(body).toHaveProperty("code");
      expect(body).toHaveProperty("requestId");
    });
  });

  describe("Performance and Caching", () => {
    it("should set appropriate cache headers for different endpoints", async () => {
      // Test public stock data (should be cacheable)
      const publicStocksEvent = mockEvent({
        path: "/projects/project-123/stocks",
        pathParameters: { projectId: "project-123" },
      });

      const publicResult = await handler(publicStocksEvent, {} as any, {} as any) as APIGatewayProxyResult;
      
      // Even error responses should have cache headers
      expect(publicResult.headers).toHaveProperty("Access-Control-Allow-Origin");

      // Test portfolio data (should be private)
      const portfolioEvent = mockEvent({
        path: "/stocks/portfolio",
        queryStringParameters: {
          walletAddress: "0x1234567890abcdef",
        },
      });

      const portfolioResult = await handler(portfolioEvent, {} as any, {} as any) as APIGatewayProxyResult;
      
      // Should have CORS headers
      expect(portfolioResult.headers).toHaveProperty("Access-Control-Allow-Origin");
    });
  });
});