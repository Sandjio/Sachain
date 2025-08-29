import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler as projectCreationHandler } from "../../lambdas/project-creation/index";
import { handler as stockMintingHandler } from "../../lambdas/stock-minting/index";
import { handler as projectQueryHandler } from "../../lambdas/project-query/index";

jest.mock("../../repositories/project-repository");
jest.mock("../../utils/hedera-service");
jest.mock("../../utils/jwt-utils");

const mockExtractUserIdFromToken = require("../../utils/jwt-utils").extractUserIdFromToken as jest.MockedFunction<any>;

describe("E2E: Performance and High-Volume Operations", () => {
  let mockContext: Context;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "test-function",
      functionVersion: "1",
      invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test",
      memoryLimitInMB: "1024",
      awsRequestId: "test-request-id",
      logGroupName: "/aws/lambda/test",
      logStreamName: "test-stream",
      getRemainingTimeInMillis: () => 300000, // 5 minutes for performance tests
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    process.env.TABLE_NAME = "test-table";
    process.env.EVENT_BUS_NAME = "test-event-bus";
  });

  const createMockEvent = (method: string, path: string, body?: any, pathParams?: any): APIGatewayProxyEvent => ({
    httpMethod: method,
    path,
    pathParameters: pathParams || null,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    requestContext: {
      requestId: "test-request",
      stage: "test",
      resourceId: "resource",
      resourcePath: path,
      httpMethod: method,
      requestTime: "01/Jan/2024:00:00:00 +0000",
      requestTimeEpoch: 1704067200,
      path,
      accountId: "123456789012",
      protocol: "HTTP/1.1",
      identity: {
        sourceIp: "127.0.0.1",
        userAgent: "test-client",
      } as any,
      apiId: "test-api",
      domainName: "test-domain",
      domainPrefix: "test",
    } as any,
    resource: path,
    stageVariables: null,
    multiValueHeaders: {},
  });

  describe("High-Volume Project Creation", () => {
    it("should handle 100+ concurrent project creations", async () => {
      mockExtractUserIdFromToken.mockImplementation((token: string) => ({
        success: true,
        userId: `user-${Math.random().toString(36).substr(2, 9)}`,
      }));

      const startTime = Date.now();
      const projectCount = 100;

      const creationPromises = Array.from({ length: projectCount }, (_, index) => {
        const projectData = {
          name: `Performance Test Project ${index}`,
          description: `High-volume test project number ${index}`,
          category: "Technology",
          stockSupply: 100 + (index % 50),
          targetFundingGoal: 10000 + (index * 1000),
          pricePerStock: 100 + (index % 20),
        };

        const event = createMockEvent("POST", "/projects", projectData);
        return projectCreationHandler(event, mockContext);
      });

      const results = await Promise.all(creationPromises);
      const duration = Date.now() - startTime;

      // Performance assertions
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute
      expect(results).toHaveLength(projectCount);

      // Success rate should be high
      const successfulCreations = results.filter(result => result.statusCode === 201);
      const successRate = (successfulCreations.length / projectCount) * 100;
      expect(successRate).toBeGreaterThan(95); // 95% success rate

      // Average response time should be reasonable
      const avgResponseTime = duration / projectCount;
      expect(avgResponseTime).toBeLessThan(600); // Less than 600ms per request on average

      console.log(`Created ${projectCount} projects in ${duration}ms (avg: ${avgResponseTime}ms per project)`);
    });

    it("should maintain performance under sustained load", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "load-test-user",
      });

      const batchSize = 20;
      const batchCount = 5;
      const results = [];

      for (let batch = 0; batch < batchCount; batch++) {
        const batchStartTime = Date.now();
        
        const batchPromises = Array.from({ length: batchSize }, (_, index) => {
          const projectData = {
            name: `Sustained Load Project B${batch}-${index}`,
            description: `Batch ${batch}, Project ${index}`,
            category: "Technology",
            stockSupply: 50,
          };

          const event = createMockEvent("POST", "/projects", projectData);
          return projectCreationHandler(event, mockContext);
        });

        const batchResults = await Promise.all(batchPromises);
        const batchDuration = Date.now() - batchStartTime;
        
        results.push({
          batch,
          duration: batchDuration,
          successCount: batchResults.filter(r => r.statusCode === 201).length,
          totalCount: batchSize,
        });

        // Small delay between batches to simulate realistic load
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Performance should not degrade significantly across batches
      const firstBatchTime = results[0].duration;
      const lastBatchTime = results[results.length - 1].duration;
      const degradation = (lastBatchTime - firstBatchTime) / firstBatchTime;
      
      expect(degradation).toBeLessThan(0.5); // Less than 50% performance degradation
      
      // All batches should maintain high success rate
      results.forEach(batch => {
        const successRate = (batch.successCount / batch.totalCount) * 100;
        expect(successRate).toBeGreaterThan(90);
      });
    });
  });

  describe("Large-Scale Stock Minting", () => {
    it("should efficiently mint 10,000+ stocks", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      const { createHederaService } = require("../../utils/hedera-service");
      const mockHederaService = {
        validateWallet: jest.fn().mockResolvedValue({
          isValid: true,
          canAffordOperation: true,
          balance: "1000.0",
        }),
        createToken: jest.fn().mockResolvedValue({
          tokenId: "0.0.123456",
          transactionId: "tx-123",
        }),
        mintNFTs: jest.fn().mockImplementation(() => 
          Promise.resolve({
            serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
            transactionId: `tx-${Date.now()}`,
          })
        ),
      };

      createHederaService.mockReturnValue(mockHederaService);

      const startTime = Date.now();
      const stockSupply = 10000;

      const mintingData = {
        walletAddress: "0.0.789012",
      };

      const event = createMockEvent("POST", `/projects/proj-large/mint-stocks`, mintingData, { projectId: "proj-large" });
      const result = await stockMintingHandler(event, mockContext);
      const duration = Date.now() - startTime;

      expect([200, 202]).toContain(result.statusCode);
      
      // Should complete within reasonable time (5 minutes for 10k stocks)
      expect(duration).toBeLessThan(300000);
      
      // Verify batch operations were optimized
      const expectedBatches = Math.ceil(stockSupply / 50);
      expect(mockHederaService.mintNFTs).toHaveBeenCalledTimes(expectedBatches);

      console.log(`Minted ${stockSupply} stocks in ${duration}ms (${expectedBatches} batches)`);
    });

    it("should handle memory efficiently during large minting operations", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      // Monitor memory usage during large operation
      const initialMemory = process.memoryUsage();

      const { createHederaService } = require("../../utils/hedera-service");
      const mockHederaService = {
        validateWallet: jest.fn().mockResolvedValue({
          isValid: true,
          canAffordOperation: true,
          balance: "500.0",
        }),
        createToken: jest.fn().mockResolvedValue({
          tokenId: "0.0.123456",
          transactionId: "tx-123",
        }),
        mintNFTs: jest.fn().mockImplementation(() => 
          Promise.resolve({
            serialNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
            transactionId: `tx-${Date.now()}`,
          })
        ),
      };

      createHederaService.mockReturnValue(mockHederaService);

      const mintingData = {
        walletAddress: "0.0.789012",
      };

      const event = createMockEvent("POST", `/projects/proj-memory/mint-stocks`, mintingData, { projectId: "proj-memory" });
      await stockMintingHandler(event, mockContext);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe("Query Performance Under Load", () => {
    it("should maintain fast query response times under load", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      const queryCount = 200;
      const startTime = Date.now();

      const queryPromises = Array.from({ length: queryCount }, (_, index) => {
        const projectId = `proj-${index % 10}`; // Query 10 different projects repeatedly
        const event = createMockEvent("GET", `/projects/${projectId}`, null, { projectId });
        return projectQueryHandler(event, mockContext);
      });

      const results = await Promise.all(queryPromises);
      const duration = Date.now() - startTime;

      // All queries should succeed
      const successfulQueries = results.filter(result => result.statusCode === 200);
      expect(successfulQueries.length).toBe(queryCount);

      // Average response time should be fast
      const avgResponseTime = duration / queryCount;
      expect(avgResponseTime).toBeLessThan(100); // Less than 100ms per query

      console.log(`Executed ${queryCount} queries in ${duration}ms (avg: ${avgResponseTime}ms per query)`);
    });

    it("should handle pagination efficiently for large datasets", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
      });

      const pageSize = 50;
      const totalPages = 20;
      const results = [];

      for (let page = 0; page < totalPages; page++) {
        const startTime = Date.now();
        
        const event = createMockEvent("GET", "/projects");
        event.queryStringParameters = {
          limit: pageSize.toString(),
          offset: (page * pageSize).toString(),
        };

        const result = await projectQueryHandler(event, mockContext);
        const duration = Date.now() - startTime;

        expect(result.statusCode).toBe(200);
        
        results.push({
          page,
          duration,
          itemCount: JSON.parse(result.body).items?.length || 0,
        });
      }

      // Pagination performance should be consistent
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      expect(avgDuration).toBeLessThan(200); // Less than 200ms per page

      // Later pages shouldn't be significantly slower
      const firstPageTime = results[0].duration;
      const lastPageTime = results[results.length - 1].duration;
      const slowdown = (lastPageTime - firstPageTime) / firstPageTime;
      expect(slowdown).toBeLessThan(1.0); // Less than 100% slowdown
    });
  });

  describe("Stress Testing", () => {
    it("should handle mixed workload stress test", async () => {
      mockExtractUserIdFromToken.mockImplementation(() => ({
        success: true,
        userId: `user-${Math.random().toString(36).substr(2, 9)}`,
      }));

      const operations = [];
      const operationCount = 150;

      // Mix of different operations
      for (let i = 0; i < operationCount; i++) {
        const operationType = i % 3;
        
        switch (operationType) {
          case 0: // Create project
            const projectData = {
              name: `Stress Test Project ${i}`,
              description: `Stress test project ${i}`,
              category: "Technology",
              stockSupply: 50 + (i % 100),
            };
            operations.push({
              type: "create",
              promise: projectCreationHandler(createMockEvent("POST", "/projects", projectData), mockContext),
            });
            break;
            
          case 1: // Query project
            const projectId = `proj-${i % 20}`;
            operations.push({
              type: "query",
              promise: projectQueryHandler(createMockEvent("GET", `/projects/${projectId}`, null, { projectId }), mockContext),
            });
            break;
            
          case 2: // Mint stocks
            const mintingData = { walletAddress: `0.0.${123456 + i}` };
            const mintProjectId = `proj-mint-${i % 10}`;
            operations.push({
              type: "mint",
              promise: stockMintingHandler(createMockEvent("POST", `/projects/${mintProjectId}/mint-stocks`, mintingData, { projectId: mintProjectId }), mockContext),
            });
            break;
        }
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(operations.map(op => op.promise));
      const duration = Date.now() - startTime;

      // Analyze results by operation type
      const createOps = operations.filter(op => op.type === "create").length;
      const queryOps = operations.filter(op => op.type === "query").length;
      const mintOps = operations.filter(op => op.type === "mint").length;

      const successful = results.filter(result => 
        result.status === "fulfilled" && 
        [200, 201, 202].includes((result.value as any).statusCode)
      ).length;

      const successRate = (successful / operationCount) * 100;
      expect(successRate).toBeGreaterThan(85); // 85% success rate under stress

      console.log(`Stress test: ${operationCount} mixed operations in ${duration}ms`);
      console.log(`Operations: ${createOps} creates, ${queryOps} queries, ${mintOps} mints`);
      console.log(`Success rate: ${successRate.toFixed(1)}%`);
    });
  });
});