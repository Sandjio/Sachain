import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from "aws-lambda";
import { handler } from "../index";
import { ProjectRepository } from "../../../repositories/project-repository";
import { UserRepository } from "../../../repositories/user-repository";
import { Project, ProjectStats } from "../../../models/project";

// Mock the repositories
jest.mock("../../../repositories/project-repository");
jest.mock("../../../repositories/user-repository");
jest.mock("../../../utils/jwt-utils");

const mockProjectRepository = ProjectRepository as jest.MockedClass<
  typeof ProjectRepository
>;
const mockUserRepository = UserRepository as jest.MockedClass<
  typeof UserRepository
>;

// Mock JWT utils
const mockExtractUserIdFromToken = require("../../../utils/jwt-utils")
  .extractUserIdFromToken as jest.MockedFunction<any>;

describe("Project Query API Integration Tests", () => {
  let mockContext: Context;
  let mockProjectRepo: jest.Mocked<ProjectRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "test-function",
      functionVersion: "1",
      invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test",
      memoryLimitInMB: "512",
      awsRequestId: "test-request-id",
      logGroupName: "/aws/lambda/test",
      logStreamName: "test-stream",
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    // Setup repository mocks
    mockProjectRepo = {
      getProject: jest.fn(),
      getProjects: jest.fn(),
      getProjectsByStatus: jest.fn(),
      getProjectsByEntrepreneur: jest.fn(),
      getProjectStats: jest.fn(),
    } as any;

    mockUserRepo = {
      getUserProfile: jest.fn(),
    } as any;

    mockProjectRepository.mockImplementation(() => mockProjectRepo);
    mockUserRepository.mockImplementation(() => mockUserRepo);

    // Mock successful authentication
    mockExtractUserIdFromToken.mockReturnValue({
      success: true,
      userId: "user-123",
    });

    // Set environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.ENVIRONMENT = "test";
  });

  describe("GET /projects - List Projects", () => {
    const createMockEvent = (
      queryParams: Record<string, string> = {}
    ): APIGatewayProxyEvent => ({
      httpMethod: "GET",
      path: "/projects",
      pathParameters: null,
      queryStringParameters: queryParams,
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: null,
      isBase64Encoded: false,
      requestContext: {
        requestId: "test-request-id",
        stage: "test",
        resourcePath: "/projects",
        httpMethod: "GET",
        requestTimeEpoch: Date.now(),
        path: "/test/projects",
        accountId: "123456789012",
        resourceId: "resource-id",
        identity: {} as any,
        authorizer: {},
        protocol: "HTTP/1.1",
        apiId: "test-api",
      },
      resource: "/projects",
      stageVariables: null,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
    });

    it("should return projects for entrepreneur with caching headers", async () => {
      // Setup mocks
      const mockProjects: Project[] = [
        {
          PK: "PROJECT#proj-123",
          SK: "METADATA",
          projectId: "proj-123",
          name: "Test Project",
          description:
            "A test project for unit testing purposes with sufficient length to meet requirements",
          category: "Technology",
          status: "active",
          stockSupply: 1000,
          targetFundingGoal: 50000,
          pricePerStock: 50,
          entrepreneurId: "user-123",
          createdAt: "2024-01-15T14:30:00Z",
          updatedAt: "2024-01-15T14:30:00Z",
          GSI3PK: "PROJECT_STATUS#active",
          GSI3SK: "2024-01-15T14:30:00Z",
        },
      ];

      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "entrepreneur@example.com",
        emailVerified: true,
        userType: "entrepreneur",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#entrepreneur@example.com",
        GSI1SK: "PROFILE",
      });

      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: mockProjects,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      const event = createMockEvent();
      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0].projectId).toBe("proj-123");
      expect(body.pagination.count).toBe(1);
      expect(body.pagination.hasMore).toBe(false);

      // Check caching headers
      expect(result.headers).toHaveProperty("Cache-Control");
      expect(result.headers).toHaveProperty("ETag");
      expect(result.headers).toHaveProperty("X-Query-Type");
      expect(result.headers).toHaveProperty("X-Cache-Hit");
    });

    it("should return active projects for investor with performance headers", async () => {
      // Setup mocks
      const mockProjects: Project[] = [
        {
          PK: "PROJECT#proj-456",
          SK: "METADATA",
          projectId: "proj-456",
          name: "Active Project",
          description:
            "An active project that investors can see with sufficient description length",
          category: "CleanTech",
          status: "active",
          stockSupply: 2000,
          targetFundingGoal: 100000,
          pricePerStock: 50,
          entrepreneurId: "user-456",
          createdAt: "2024-01-15T14:30:00Z",
          updatedAt: "2024-01-15T14:30:00Z",
          GSI3PK: "PROJECT_STATUS#active",
          GSI3SK: "2024-01-15T14:30:00Z",
        },
      ];

      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "investor@example.com",
        emailVerified: true,
        userType: "investor",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#investor@example.com",
        GSI1SK: "PROFILE",
      });

      mockProjectRepo.getProjectsByStatus.mockResolvedValue({
        items: mockProjects,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      const event = createMockEvent();
      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0].status).toBe("active");
      expect(mockProjectRepo.getProjectsByStatus).toHaveBeenCalledWith(
        "active",
        expect.any(Object)
      );

      // Check performance headers
      expect(result.headers?.["X-Query-Type"]).toBeDefined();
      expect(result.headers?.["X-Index-Used"]).toBeDefined();
      expect(result.headers?.["X-Cache-Hit"]).toBeDefined();
    });

    it("should include appropriate cache duration based on project status", async () => {
      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "investor@example.com",
        emailVerified: true,
        userType: "investor",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#investor@example.com",
        GSI1SK: "PROFILE",
      });

      mockProjectRepo.getProjectsByStatus.mockResolvedValue({
        items: [],
        count: 0,
        lastEvaluatedKey: undefined,
      });

      // Test active projects (should have longer cache time)
      const activeEvent = createMockEvent({ status: "active" });
      const activeResult = (await handler(
        activeEvent,
        mockContext
      )) as APIGatewayProxyResult;

      expect(activeResult.statusCode).toBe(200);
      expect(activeResult.headers?.["Cache-Control"]).toContain("max-age=300");

      // Test draft projects (should have shorter cache time)
      const draftEvent = createMockEvent({ status: "draft" });
      const draftResult = (await handler(
        draftEvent,
        mockContext
      )) as APIGatewayProxyResult;

      expect(draftResult.statusCode).toBe(200);
      expect(draftResult.headers?.["Cache-Control"]).toContain("max-age=60");
    });
  });

  describe("GET /projects/{projectId} - Get Single Project", () => {
    const createMockEvent = (projectId: string): APIGatewayProxyEvent => ({
      httpMethod: "GET",
      path: `/projects/${projectId}`,
      pathParameters: { projectId },
      queryStringParameters: null,
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: null,
      isBase64Encoded: false,
      requestContext: {
        requestId: "test-request-id",
        stage: "test",
        resourcePath: "/projects/{projectId}",
        httpMethod: "GET",
        requestTimeEpoch: Date.now(),
        path: `/test/projects/${projectId}`,
        accountId: "123456789012",
        resourceId: "resource-id",
        identity: {} as any,
        authorizer: {},
        protocol: "HTTP/1.1",
        apiId: "test-api",
      },
      resource: "/projects/{projectId}",
      stageVariables: null,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
    });

    it("should return project details with comprehensive caching headers", async () => {
      const mockProject: Project = {
        PK: "PROJECT#proj-123",
        SK: "METADATA",
        projectId: "proj-123",
        name: "Test Project",
        description:
          "A detailed test project description that meets the minimum length requirements for validation",
        category: "Technology",
        status: "draft",
        stockSupply: 1000,
        targetFundingGoal: 50000,
        pricePerStock: 50,
        entrepreneurId: "user-123",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-15T14:30:00Z",
      };

      const mockStats: ProjectStats = {
        PK: "PROJECT#proj-123",
        SK: "STATS",
        projectId: "proj-123",
        totalStocks: 1000,
        mintedStocks: 0,
        availableStocks: 0,
        soldStocks: 0,
        totalRaised: 0,
        lastUpdated: "2024-01-15T14:30:00Z",
      };

      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "entrepreneur@example.com",
        emailVerified: true,
        userType: "entrepreneur",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#entrepreneur@example.com",
        GSI1SK: "PROFILE",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);
      mockProjectRepo.getProjectStats.mockResolvedValue(mockStats);

      const event = createMockEvent("proj-123");
      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.project.projectId).toBe("proj-123");
      expect(body.project.name).toBe("Test Project");
      expect(body.project.stats).toBeDefined();
      expect(body.project.stats.totalStocks).toBe(1000);

      // Check comprehensive caching headers
      expect(result.headers).toHaveProperty("Cache-Control");
      expect(result.headers).toHaveProperty("ETag");
      expect(result.headers).toHaveProperty("Last-Modified");
      expect(result.headers?.["Cache-Control"]).toContain(
        "stale-while-revalidate"
      );
      expect(result.headers?.ETag).toMatch(/^".*"$/); // Should be quoted
    });

    it("should return 404 for non-existent project", async () => {
      mockProjectRepo.getProject.mockResolvedValue(null);

      const event = createMockEvent("proj-nonexistent");
      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.code).toBe("PROJECT_NOT_FOUND");
      expect(body.details.projectId).toBe("proj-nonexistent");
    });
  });

  describe("Performance and Caching Optimization", () => {
    it("should use appropriate GSI for status-based queries", async () => {
      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "entrepreneur@example.com",
        emailVerified: true,
        userType: "entrepreneur",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#entrepreneur@example.com",
        GSI1SK: "PROFILE",
      });

      mockProjectRepo.getProjectsByStatus.mockResolvedValue({
        items: [],
        count: 0,
        lastEvaluatedKey: undefined,
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: "GET",
        path: "/projects",
        pathParameters: null,
        queryStringParameters: { status: "active" },
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          resourcePath: "/projects",
          httpMethod: "GET",
          requestTimeEpoch: Date.now(),
          path: "/test/projects",
          accountId: "123456789012",
          resourceId: "resource-id",
          identity: {} as any,
          authorizer: {},
          protocol: "HTTP/1.1",
          apiId: "test-api",
        },
        resource: "/projects",
        stageVariables: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(mockProjectRepo.getProjectsByStatus).toHaveBeenCalledWith(
        "active",
        expect.any(Object)
      );
      expect(mockProjectRepo.getProjectsByEntrepreneur).not.toHaveBeenCalled();

      // Check performance headers
      expect(result.headers?.["X-Query-Type"]).toBeDefined();
      expect(result.headers?.["X-Index-Used"]).toBeDefined();
      expect(result.headers?.["X-Cache-Hit"]).toBeDefined();
    });

    it("should include ETag for conditional requests", async () => {
      const mockProject: Project = {
        PK: "PROJECT#proj-123",
        SK: "METADATA",
        projectId: "proj-123",
        name: "Test Project",
        description:
          "A test project with sufficient description length for validation requirements",
        category: "Technology",
        status: "active",
        stockSupply: 1000,
        entrepreneurId: "user-123",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI3PK: "PROJECT_STATUS#active",
        GSI3SK: "2024-01-15T14:30:00Z",
      };

      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "entrepreneur@example.com",
        emailVerified: true,
        userType: "entrepreneur",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#entrepreneur@example.com",
        GSI1SK: "PROFILE",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);
      mockProjectRepo.getProjectStats.mockResolvedValue(null);

      const event: APIGatewayProxyEvent = {
        httpMethod: "GET",
        path: "/projects/proj-123",
        pathParameters: { projectId: "proj-123" },
        queryStringParameters: null,
        headers: {
          Authorization: "Bearer valid-token",
        },
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: "test-request-id",
          stage: "test",
          resourcePath: "/projects/{projectId}",
          httpMethod: "GET",
          requestTimeEpoch: Date.now(),
          path: "/test/projects/proj-123",
          accountId: "123456789012",
          resourceId: "resource-id",
          identity: {} as any,
          authorizer: {},
          protocol: "HTTP/1.1",
          apiId: "test-api",
        },
        resource: "/projects/{projectId}",
        stageVariables: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(result.headers?.ETag).toBeDefined();
      expect(result.headers?.ETag).toMatch(/^".*"$/); // Should be quoted
      expect(result.headers?.["Last-Modified"]).toBeDefined();
    });
  });

  describe("Additional Integration Test Workflows", () => {
    const createMockEvent = (
      path: string,
      pathParameters?: Record<string, string> | null,
      queryParams?: Record<string, string> | null
    ): APIGatewayProxyEvent => ({
      httpMethod: "GET",
      path,
      pathParameters,
      queryStringParameters: queryParams,
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: null,
      isBase64Encoded: false,
      requestContext: {
        requestId: "test-request-id",
        stage: "test",
        resourcePath: path.includes("{projectId}")
          ? "/projects/{projectId}"
          : "/projects",
        httpMethod: "GET",
        requestTimeEpoch: Date.now(),
        path: `/test${path}`,
        accountId: "123456789012",
        resourceId: "resource-id",
        identity: {} as any,
        authorizer: {},
        protocol: "HTTP/1.1",
        apiId: "test-api",
      },
      resource: path.includes("{projectId}")
        ? "/projects/{projectId}"
        : "/projects",
      stageVariables: null,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
    });

    it("should handle pagination workflow correctly", async () => {
      const mockProjects: Project[] = Array.from({ length: 5 }, (_, i) => ({
        PK: `PROJECT#proj-${i + 1}`,
        SK: "METADATA",
        projectId: `proj-${i + 1}`,
        name: `Test Project ${i + 1}`,
        description: `A test project ${
          i + 1
        } for pagination testing with sufficient description length`,
        category: "Technology",
        status: "active",
        stockSupply: 1000,
        targetFundingGoal: 50000,
        pricePerStock: 50,
        entrepreneurId: "user-123",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI3PK: "PROJECT_STATUS#active",
        GSI3SK: "2024-01-15T14:30:00Z",
      }));

      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "entrepreneur@example.com",
        emailVerified: true,
        userType: "entrepreneur",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#entrepreneur@example.com",
        GSI1SK: "PROFILE",
      });

      // First page
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: mockProjects.slice(0, 3),
        count: 3,
        lastEvaluatedKey: { PK: "PROJECT#proj-3", SK: "METADATA" },
      });

      const firstPageEvent = createMockEvent("/projects", null, { limit: "3" });
      const firstPageResult = (await handler(
        firstPageEvent,
        mockContext
      )) as APIGatewayProxyResult;

      expect(firstPageResult.statusCode).toBe(200);
      const firstPageBody = JSON.parse(firstPageResult.body);
      expect(firstPageBody.projects).toHaveLength(3);
      expect(firstPageBody.pagination.hasMore).toBe(true);
      expect(firstPageBody.pagination.lastEvaluatedKey).toBeDefined();

      // Second page
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: mockProjects.slice(3),
        count: 2,
        lastEvaluatedKey: undefined,
      });

      const exclusiveStartKey = encodeURIComponent(
        JSON.stringify({ PK: "PROJECT#proj-3", SK: "METADATA" })
      );
      const secondPageEvent = createMockEvent("/projects", null, {
        limit: "3",
        exclusiveStartKey,
      });
      const secondPageResult = (await handler(
        secondPageEvent,
        mockContext
      )) as APIGatewayProxyResult;

      expect(secondPageResult.statusCode).toBe(200);
      const secondPageBody = JSON.parse(secondPageResult.body);
      expect(secondPageBody.projects).toHaveLength(2);
      expect(secondPageBody.pagination.hasMore).toBe(false);
    });

    it("should handle query parameter validation errors", async () => {
      const event = createMockEvent("/projects", null, {
        status: "invalid-status",
        limit: "150", // Exceeds maximum
        sortBy: "invalid-field",
      });

      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("INVALID_QUERY_PARAMETERS");
      expect(body.details.errors).toContain(
        "Invalid status. Must be one of: draft, minting, active, paused, completed"
      );
      expect(body.details.errors).toContain(
        "Limit must be a number between 1 and 100"
      );
    });

    it("should handle authentication failures", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const event = createMockEvent("/projects");
      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Authentication failed");
    });

    it("should handle unauthorized access to draft projects", async () => {
      const mockProject: Project = {
        PK: "PROJECT#proj-123",
        SK: "METADATA",
        projectId: "proj-123",
        name: "Draft Project",
        description:
          "A draft project that should not be accessible to investors with sufficient length",
        category: "Technology",
        status: "draft",
        stockSupply: 1000,
        entrepreneurId: "user-456", // Different entrepreneur
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-15T14:30:00Z",
      };

      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "investor@example.com",
        emailVerified: true,
        userType: "investor",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#investor@example.com",
        GSI1SK: "PROFILE",
      });

      mockProjectRepo.getProject.mockResolvedValue(mockProject);

      const event = createMockEvent("/projects/proj-123", {
        projectId: "proj-123",
      });
      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("UNAUTHORIZED_ACCESS");
    });

    it("should include statistics when requested", async () => {
      const mockProjects: Project[] = [
        {
          PK: "PROJECT#proj-123",
          SK: "METADATA",
          projectId: "proj-123",
          name: "Test Project",
          description:
            "A test project with statistics for integration testing with sufficient length",
          category: "Technology",
          status: "active",
          stockSupply: 1000,
          targetFundingGoal: 50000,
          pricePerStock: 50,
          entrepreneurId: "user-123",
          createdAt: "2024-01-15T14:30:00Z",
          updatedAt: "2024-01-15T14:30:00Z",
          GSI3PK: "PROJECT_STATUS#active",
          GSI3SK: "2024-01-15T14:30:00Z",
        },
      ];

      const mockStats: ProjectStats = {
        PK: "PROJECT#proj-123",
        SK: "STATS",
        projectId: "proj-123",
        totalStocks: 1000,
        mintedStocks: 800,
        availableStocks: 600,
        soldStocks: 200,
        totalRaised: 10000,
        lastUpdated: "2024-01-15T14:30:00Z",
      };

      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "entrepreneur@example.com",
        emailVerified: true,
        userType: "entrepreneur",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#entrepreneur@example.com",
        GSI1SK: "PROFILE",
      });

      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: mockProjects,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      mockProjectRepo.getProjectStats.mockResolvedValue(mockStats);

      const event = createMockEvent("/projects", null, {
        includeStats: "true",
      });
      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.projects[0].stats).toBeDefined();
      expect(body.projects[0].stats.totalStocks).toBe(1000);
      expect(body.projects[0].stats.soldStocks).toBe(200);
      expect(body.aggregations).toBeDefined();
    });

    it("should handle category filtering", async () => {
      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "investor@example.com",
        emailVerified: true,
        userType: "investor",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#investor@example.com",
        GSI1SK: "PROFILE",
      });

      const mockProjects: Project[] = [
        {
          PK: "PROJECT#proj-123",
          SK: "METADATA",
          projectId: "proj-123",
          name: "CleanTech Project",
          description:
            "A clean technology project for category filtering test with sufficient description length",
          category: "CleanTech",
          status: "active",
          stockSupply: 1000,
          entrepreneurId: "user-456",
          createdAt: "2024-01-15T14:30:00Z",
          updatedAt: "2024-01-15T14:30:00Z",
          GSI3PK: "PROJECT_STATUS#active",
          GSI3SK: "2024-01-15T14:30:00Z",
        },
      ];

      mockProjectRepo.getProjectsByStatus.mockResolvedValue({
        items: mockProjects,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      const event = createMockEvent("/projects", null, {
        status: "active",
        category: "CleanTech",
      });
      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0].category).toBe("CleanTech");
    });

    it("should handle sorting by different fields", async () => {
      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "entrepreneur@example.com",
        emailVerified: true,
        userType: "entrepreneur",
        kycStatus: "approved",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        GSI1PK: "EMAIL#entrepreneur@example.com",
        GSI1SK: "PROFILE",
      });

      const mockProjects: Project[] = [
        {
          PK: "PROJECT#proj-1",
          SK: "METADATA",
          projectId: "proj-1",
          name: "Alpha Project",
          description:
            "First project alphabetically for sorting test with sufficient description length",
          category: "Technology",
          status: "active",
          stockSupply: 1000,
          entrepreneurId: "user-123",
          createdAt: "2024-01-15T14:30:00Z",
          updatedAt: "2024-01-15T14:30:00Z",
          GSI3PK: "PROJECT_STATUS#active",
          GSI3SK: "2024-01-15T14:30:00Z",
        },
        {
          PK: "PROJECT#proj-2",
          SK: "METADATA",
          projectId: "proj-2",
          name: "Beta Project",
          description:
            "Second project alphabetically for sorting test with sufficient description length",
          category: "Technology",
          status: "active",
          stockSupply: 1000,
          entrepreneurId: "user-123",
          createdAt: "2024-01-15T14:30:00Z",
          updatedAt: "2024-01-15T14:30:00Z",
          GSI3PK: "PROJECT_STATUS#active",
          GSI3SK: "2024-01-15T14:30:00Z",
        },
      ];

      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: mockProjects,
        count: 2,
        lastEvaluatedKey: undefined,
      });

      const event = createMockEvent("/projects", null, {
        sortBy: "name",
        sortOrder: "asc",
      });
      const result = (await handler(
        event,
        mockContext
      )) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.projects).toHaveLength(2);
      expect(body.projects[0].name).toBe("Alpha Project");
      expect(body.projects[1].name).toBe("Beta Project");
    });
  });
});
