import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index";
import { ProjectRepository } from "../../../repositories/project-repository";
import { EventPublisher } from "../../../utils/event-publisher";

// Mock dependencies
jest.mock("../../../repositories/project-repository");
jest.mock("../../../utils/event-publisher");

const mockProjectRepository = ProjectRepository as jest.MockedClass<typeof ProjectRepository>;
const mockEventPublisher = EventPublisher as jest.MockedClass<typeof EventPublisher>;

describe("Project Management API Integration", () => {
  let mockContext: Context;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContext = {
      requestId: "test-request-id",
      functionName: "test-function",
      functionVersion: "1",
      invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test",
      memoryLimitInMB: "512",
      awsRequestId: "test-aws-request-id",
      logGroupName: "/aws/lambda/test",
      logStreamName: "test-stream",
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
      callbackWaitsForEmptyEventLoop: false,
    };

    // Set up environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.EVENT_BUS_NAME = "test-event-bus";
    process.env.ENVIRONMENT = "test";
  });

  describe("PUT /projects/{projectId}", () => {
    it("should update a draft project successfully", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "PUT",
        path: "/projects/proj-123",
        pathParameters: { projectId: "proj-123" },
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
        body: JSON.stringify({
          name: "Updated Project Name",
          description: "Updated project description with more than 50 characters to meet validation requirements",
          pricePerStock: 60,
        }),
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        queryStringParameters: null,
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          resourceId: "resource-id",
          httpMethod: "PUT",
          resourcePath: "/projects/{projectId}",
          path: "/test/projects/proj-123",
          accountId: "123456789012",
          apiId: "test-api-id",
          protocol: "HTTP/1.1",
          requestTime: "01/Jan/2024:00:00:00 +0000",
          requestTimeEpoch: 1704067200,
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
          },
          authorizer: null,
        },
        resource: "/projects/{projectId}",
        stageVariables: null,
      };

      // Mock JWT validation to return success
      jest.doMock("../../../utils/jwt-utils", () => ({
        extractUserIdFromToken: jest.fn().mockReturnValue({
          success: true,
          userId: "user-123",
        }),
      }));

      // Mock project repository methods
      const mockProject = {
        projectId: "proj-123",
        entrepreneurId: "user-123",
        name: "Original Project Name",
        description: "Original project description",
        category: "Technology",
        status: "draft",
        stockSupply: 1000,
        pricePerStock: 50,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockProjectRepository.prototype.getProject = jest.fn().mockResolvedValue(mockProject);
      mockProjectRepository.prototype.updateProject = jest.fn().mockResolvedValue(undefined);

      // Mock event publisher
      mockEventPublisher.prototype.publishProjectUpdatedEvent = jest.fn().mockResolvedValue(undefined);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.projectId).toBe("proj-123");
      expect(responseBody.message).toBe("Project updated successfully");
      expect(responseBody.changes).toEqual(["name", "description", "pricePerStock"]);
    });

    it("should return 422 for non-draft project", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "PUT",
        path: "/projects/proj-123",
        pathParameters: { projectId: "proj-123" },
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
        body: JSON.stringify({
          name: "Updated Project Name",
        }),
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        queryStringParameters: null,
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          resourceId: "resource-id",
          httpMethod: "PUT",
          resourcePath: "/projects/{projectId}",
          path: "/test/projects/proj-123",
          accountId: "123456789012",
          apiId: "test-api-id",
          protocol: "HTTP/1.1",
          requestTime: "01/Jan/2024:00:00:00 +0000",
          requestTimeEpoch: 1704067200,
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
          },
          authorizer: null,
        },
        resource: "/projects/{projectId}",
        stageVariables: null,
      };

      // Mock JWT validation
      jest.doMock("../../../utils/jwt-utils", () => ({
        extractUserIdFromToken: jest.fn().mockReturnValue({
          success: true,
          userId: "user-123",
        }),
      }));

      // Mock active project
      const mockProject = {
        projectId: "proj-123",
        entrepreneurId: "user-123",
        name: "Active Project",
        description: "Active project description",
        category: "Technology",
        status: "active",
        stockSupply: 1000,
        pricePerStock: 50,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockProjectRepository.prototype.getProject = jest.fn().mockResolvedValue(mockProject);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(422);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.code).toBe("INVALID_PROJECT_STATUS");
      expect(responseBody.message).toBe("Only draft projects can be updated");
    });
  });

  describe("DELETE /projects/{projectId}", () => {
    it("should delete a draft project successfully", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "DELETE",
        path: "/projects/proj-123",
        pathParameters: { projectId: "proj-123" },
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
        body: null,
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        queryStringParameters: null,
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          resourceId: "resource-id",
          httpMethod: "DELETE",
          resourcePath: "/projects/{projectId}",
          path: "/test/projects/proj-123",
          accountId: "123456789012",
          apiId: "test-api-id",
          protocol: "HTTP/1.1",
          requestTime: "01/Jan/2024:00:00:00 +0000",
          requestTimeEpoch: 1704067200,
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
          },
          authorizer: null,
        },
        resource: "/projects/{projectId}",
        stageVariables: null,
      };

      // Mock JWT validation
      jest.doMock("../../../utils/jwt-utils", () => ({
        extractUserIdFromToken: jest.fn().mockReturnValue({
          success: true,
          userId: "user-123",
        }),
      }));

      // Mock draft project
      const mockProject = {
        projectId: "proj-123",
        entrepreneurId: "user-123",
        name: "Draft Project",
        description: "Draft project description",
        category: "Technology",
        status: "draft",
        stockSupply: 1000,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockProjectRepository.prototype.getProject = jest.fn().mockResolvedValue(mockProject);
      mockProjectRepository.prototype.getProjectStats = jest.fn().mockResolvedValue(null);
      mockProjectRepository.prototype.getProjectHederaTransactions = jest.fn().mockResolvedValue({ items: [] });
      mockProjectRepository.prototype.deleteProject = jest.fn().mockResolvedValue(undefined);
      mockProjectRepository.prototype.deleteItemByKey = jest.fn().mockResolvedValue(undefined);

      // Mock event publisher
      mockEventPublisher.prototype.publishEvent = jest.fn().mockResolvedValue(undefined);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.projectId).toBe("proj-123");
      expect(responseBody.message).toBe("Project deleted successfully");
    });
  });

  describe("PUT /projects/{projectId}/status", () => {
    it("should update project status successfully", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "PUT",
        path: "/projects/proj-123/status",
        pathParameters: { projectId: "proj-123" },
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
        body: JSON.stringify({
          newStatus: "paused",
          reason: "Temporary maintenance",
        }),
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        queryStringParameters: null,
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          resourceId: "resource-id",
          httpMethod: "PUT",
          resourcePath: "/projects/{projectId}/status",
          path: "/test/projects/proj-123/status",
          accountId: "123456789012",
          apiId: "test-api-id",
          protocol: "HTTP/1.1",
          requestTime: "01/Jan/2024:00:00:00 +0000",
          requestTimeEpoch: 1704067200,
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
          },
          authorizer: null,
        },
        resource: "/projects/{projectId}/status",
        stageVariables: null,
      };

      // Mock JWT validation
      jest.doMock("../../../utils/jwt-utils", () => ({
        extractUserIdFromToken: jest.fn().mockReturnValue({
          success: true,
          userId: "user-123",
        }),
      }));

      // Mock active project
      const mockProject = {
        projectId: "proj-123",
        entrepreneurId: "user-123",
        name: "Active Project",
        description: "Active project description",
        category: "Technology",
        status: "active",
        stockSupply: 1000,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockProjectRepository.prototype.getProject = jest.fn().mockResolvedValue(mockProject);
      mockProjectRepository.prototype.updateProject = jest.fn().mockResolvedValue(undefined);

      // Mock event publisher
      mockEventPublisher.prototype.publishProjectStatusChangedEvent = jest.fn().mockResolvedValue(undefined);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.projectId).toBe("proj-123");
      expect(responseBody.message).toBe("Project status updated successfully");
      expect(responseBody.previousStatus).toBe("active");
      expect(responseBody.newStatus).toBe("paused");
    });

    it("should return 422 for invalid status transition", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "PUT",
        path: "/projects/proj-123/status",
        pathParameters: { projectId: "proj-123" },
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
        body: JSON.stringify({
          newStatus: "active",
        }),
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        queryStringParameters: null,
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          resourceId: "resource-id",
          httpMethod: "PUT",
          resourcePath: "/projects/{projectId}/status",
          path: "/test/projects/proj-123/status",
          accountId: "123456789012",
          apiId: "test-api-id",
          protocol: "HTTP/1.1",
          requestTime: "01/Jan/2024:00:00:00 +0000",
          requestTimeEpoch: 1704067200,
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
          },
          authorizer: null,
        },
        resource: "/projects/{projectId}/status",
        stageVariables: null,
      };

      // Mock JWT validation
      jest.doMock("../../../utils/jwt-utils", () => ({
        extractUserIdFromToken: jest.fn().mockReturnValue({
          success: true,
          userId: "user-123",
        }),
      }));

      // Mock completed project (no transitions allowed)
      const mockProject = {
        projectId: "proj-123",
        entrepreneurId: "user-123",
        name: "Completed Project",
        description: "Completed project description",
        category: "Technology",
        status: "completed",
        stockSupply: 1000,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockProjectRepository.prototype.getProject = jest.fn().mockResolvedValue(mockProject);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(422);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.code).toBe("INVALID_STATUS_TRANSITION");
      expect(responseBody.message).toContain("Invalid status transition");
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent project", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "PUT",
        path: "/projects/proj-nonexistent",
        pathParameters: { projectId: "proj-nonexistent" },
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        queryStringParameters: null,
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          resourceId: "resource-id",
          httpMethod: "PUT",
          resourcePath: "/projects/{projectId}",
          path: "/test/projects/proj-nonexistent",
          accountId: "123456789012",
          apiId: "test-api-id",
          protocol: "HTTP/1.1",
          requestTime: "01/Jan/2024:00:00:00 +0000",
          requestTimeEpoch: 1704067200,
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
          },
          authorizer: null,
        },
        resource: "/projects/{projectId}",
        stageVariables: null,
      };

      // Mock JWT validation
      jest.doMock("../../../utils/jwt-utils", () => ({
        extractUserIdFromToken: jest.fn().mockReturnValue({
          success: true,
          userId: "user-123",
        }),
      }));

      // Mock project not found
      mockProjectRepository.prototype.getProject = jest.fn().mockResolvedValue(null);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(404);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.code).toBe("PROJECT_NOT_FOUND");
      expect(responseBody.message).toBe("Project not found");
    });

    it("should return 403 for unauthorized access", async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: "PUT",
        path: "/projects/proj-123",
        pathParameters: { projectId: "proj-123" },
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        queryStringParameters: null,
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          resourceId: "resource-id",
          httpMethod: "PUT",
          resourcePath: "/projects/{projectId}",
          path: "/test/projects/proj-123",
          accountId: "123456789012",
          apiId: "test-api-id",
          protocol: "HTTP/1.1",
          requestTime: "01/Jan/2024:00:00:00 +0000",
          requestTimeEpoch: 1704067200,
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
          },
          authorizer: null,
        },
        resource: "/projects/{projectId}",
        stageVariables: null,
      };

      // Mock JWT validation
      jest.doMock("../../../utils/jwt-utils", () => ({
        extractUserIdFromToken: jest.fn().mockReturnValue({
          success: true,
          userId: "user-456", // Different user
        }),
      }));

      // Mock project owned by different user
      const mockProject = {
        projectId: "proj-123",
        entrepreneurId: "user-123", // Different owner
        name: "Project Name",
        description: "Project description",
        category: "Technology",
        status: "draft",
        stockSupply: 1000,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockProjectRepository.prototype.getProject = jest.fn().mockResolvedValue(mockProject);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(403);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.code).toBe("UNAUTHORIZED_ACCESS");
      expect(responseBody.message).toBe("You do not have permission to access this project");
    });
  });
});