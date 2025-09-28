import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { handler } from "../index";
import { ProjectRepository } from "../../../repositories/project-repository";
import { UserRepository } from "../../../repositories/user-repository";
import { extractUserIdFromToken } from "../../../utils/jwt-utils";
import { Project, ProjectStats } from "../../../models/project";
import { ProjectQueryError, ErrorCodes } from "../types";

// Helper function to ensure proper typing
async function callHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const result = await handler(event, context, jest.fn());
  return result as APIGatewayProxyResult;
}

// Mock dependencies
jest.mock("../../../repositories/project-repository");
jest.mock("../../../repositories/user-repository");
jest.mock("../../../utils/jwt-utils");
jest.mock("../../../utils/structured-logger", () => ({
  createProjectLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));
jest.mock("../../../utils/error-handler", () => ({
  ErrorClassifier: {
    classify: jest.fn().mockReturnValue({
      category: "business",
      errorCode: "TEST_ERROR",
      httpStatusCode: 500,
      userMessage: "Test error",
      technicalMessage: "Test technical error",
    }),
  },
}));
jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({}),
  },
}));

const mockProjectRepository = ProjectRepository as jest.MockedClass<
  typeof ProjectRepository
>;
const mockUserRepository = UserRepository as jest.MockedClass<
  typeof UserRepository
>;
const mockExtractUserIdFromToken =
  extractUserIdFromToken as jest.MockedFunction<typeof extractUserIdFromToken>;

describe("Project Query Lambda", () => {
  let mockProjectRepo: jest.Mocked<ProjectRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockContext: Context;

  const mockProject: Project = {
    PK: "PROJECT#test-project-1",
    SK: "METADATA",
    projectId: "test-project-1",
    entrepreneurId: "test-entrepreneur-1",
    name: "Test Project",
    description: "A test project for unit testing",
    category: "technology",
    stockSupply: 1000,
    targetFundingGoal: 100000,
    pricePerStock: 100,
    coverImageUrl: "https://example.com/image.jpg",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    GSI3PK: "PROJECT_STATUS#active",
    GSI3SK: "2024-01-01T00:00:00.000Z",
  };

  const mockProjectStats: ProjectStats = {
    PK: "PROJECT#test-project-1",
    SK: "STATS",
    projectId: "test-project-1",
    totalStocks: 1000,
    mintedStocks: 500,
    availableStocks: 500,
    soldStocks: 0,
    totalRaised: 0,
    lastUpdated: "2024-01-01T00:00:00.000Z",
  };

  const mockUserProfile = {
    PK: "USER#test-entrepreneur-1",
    SK: "PROFILE",
    userId: "test-entrepreneur-1",
    email: "test@example.com",
    userType: "entrepreneur" as const,
    kycStatus: "approved" as const,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    emailVerified: true,
    GSI1PK: "KYC_STATUS#approved",
    GSI1SK: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock instances
    mockProjectRepo = {
      getProject: jest.fn(),
      getProjectsByStatus: jest.fn(),
      getProjectsByEntrepreneur: jest.fn(),
      getProjects: jest.fn(),
      getProjectStats: jest.fn(),
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      projectExists: jest.fn(),
      updateProjectStats: jest.fn(),
      createHederaTransaction: jest.fn(),
      updateHederaTransaction: jest.fn(),
      getHederaTransaction: jest.fn(),
      getProjectHederaTransactions: jest.fn(),
      batchGetProjects: jest.fn(),
      getProjectsCountByStatus: jest.fn(),
      isProjectOwner: jest.fn(),
      createStockNFT: jest.fn(),
      getHederaTransactions: jest.fn(),
    } as any;

    mockUserRepo = {
      getUserProfile: jest.fn(),
    } as any;

    mockProjectRepository.mockImplementation(() => mockProjectRepo);
    mockUserRepository.mockImplementation(() => mockUserRepo);

    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: "project-query",
      functionVersion: "1",
      invokedFunctionArn:
        "arn:aws:lambda:us-east-1:123456789012:function:project-query",
      memoryLimitInMB: "128",
      awsRequestId: "test-request-id",
      logGroupName: "/aws/lambda/project-query",
      logStreamName: "test-stream",
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    // Setup environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.ENVIRONMENT = "test";
    process.env.AWS_REGION = "us-east-1";
  });

  describe("Authentication", () => {
    it("should return 401 when authentication fails", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const event = createMockEvent("GET", "/projects");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toMatchObject({
        message: expect.stringContaining("Authentication failed"),
      });
    });

    it("should proceed when authentication succeeds", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-1",
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUserProfile);

      // Add debugging to see which methods are called
      mockProjectRepo.getProjectsByEntrepreneur.mockImplementation(
        (...args) => {
          console.log("getProjectsByEntrepreneur called with:", args);
          return Promise.resolve({
            items: [],
            count: 0,
            lastEvaluatedKey: undefined,
          });
        }
      );

      mockProjectRepo.getProjectsByStatus.mockImplementation((...args) => {
        console.log("getProjectsByStatus called with:", args);
        return Promise.resolve({
          items: [],
          count: 0,
          lastEvaluatedKey: undefined,
        });
      });

      mockProjectRepo.getProjects.mockImplementation((...args) => {
        console.log("getProjects called with:", args);
        return Promise.resolve({
          items: [],
          count: 0,
          lastEvaluatedKey: undefined,
        });
      });

      const event = createMockEvent("GET", "/projects");
      const result = await callHandler(event, mockContext);

      if (result.statusCode !== 200) {
        console.log("Error response:", JSON.parse(result.body));
      }
      expect(result.statusCode).toBe(200);
    });
  });

  describe("Single Project Query", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-1",
      });
      mockUserRepo.getUserProfile.mockResolvedValue(mockUserProfile);
    });

    it("should return project when found and accessible", async () => {
      mockProjectRepo.getProject.mockResolvedValue(mockProject);
      mockProjectRepo.getProjectStats.mockResolvedValue(mockProjectStats);

      const event = createMockEvent("GET", "/projects/test-project-1", {
        projectId: "test-project-1",
      });
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const response = JSON.parse(result.body);
      expect(response.project).toMatchObject({
        projectId: "test-project-1",
        name: "Test Project",
        stats: mockProjectStats,
      });
    });

    it("should return 404 when project not found", async () => {
      mockProjectRepo.getProject.mockResolvedValue(null);

      const event = createMockEvent("GET", "/projects/nonexistent", {
        projectId: "nonexistent",
      });
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "Project not found",
        code: ErrorCodes.PROJECT_NOT_FOUND,
      });
    });

    it("should return 403 when user cannot access project", async () => {
      const draftProject = {
        ...mockProject,
        status: "draft" as const,
        entrepreneurId: "other-user",
      };
      mockProjectRepo.getProject.mockResolvedValue(draftProject);

      const event = createMockEvent("GET", "/projects/test-project-1", {
        projectId: "test-project-1",
      });
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "Unauthorized access to project",
        code: ErrorCodes.UNAUTHORIZED_ACCESS,
      });
    });
  });

  describe("Multiple Projects Query", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-1",
      });
      mockUserRepo.getUserProfile.mockResolvedValue(mockUserProfile);
    });

    it("should return projects list with pagination", async () => {
      const projects = [mockProject];
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: projects,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      const event = createMockEvent("GET", "/projects");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const response = JSON.parse(result.body);
      expect(response.projects).toHaveLength(1);
      expect(response.pagination).toMatchObject({
        count: 1,
        hasMore: false,
      });
    });

    it("should filter by status using GSI3", async () => {
      const projects = [mockProject];
      mockProjectRepo.getProjectsByStatus.mockResolvedValue({
        items: projects,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      const event = createMockEvent("GET", "/projects", undefined, {
        status: "active",
      });
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(mockProjectRepo.getProjectsByStatus).toHaveBeenCalledWith(
        "active",
        {
          limit: undefined,
          exclusiveStartKey: undefined,
        }
      );
    });

    it("should validate query parameters", async () => {
      const event = createMockEvent("GET", "/projects", undefined, {
        status: "invalid-status",
        limit: "invalid-limit",
      });
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "Invalid query parameters",
        code: ErrorCodes.INVALID_QUERY_PARAMETERS,
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-1",
      });
      mockUserRepo.getUserProfile.mockResolvedValue(mockUserProfile);
    });

    it("should handle database errors gracefully", async () => {
      mockProjectRepo.getProjects.mockRejectedValue(
        new Error("Database connection failed")
      );

      const event = createMockEvent("GET", "/projects");
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(503);
      expect(JSON.parse(result.body)).toMatchObject({
        message: expect.stringContaining("Unable to retrieve projects"),
      });
    });
  });

  // Helper function to create mock API Gateway events
  function createMockEvent(
    httpMethod: string,
    path: string,
    pathParameters?: Record<string, string>,
    queryStringParameters?: Record<string, string>
  ): APIGatewayProxyEvent {
    return {
      httpMethod,
      path,
      pathParameters: pathParameters || null,
      queryStringParameters: queryStringParameters || null,
      headers: {
        Authorization: "Bearer mock-token",
        "Content-Type": "application/json",
      },
      multiValueHeaders: {},
      body: null,
      isBase64Encoded: false,
      requestContext: {
        requestId: "test-request-id",
        stage: "test",
        resourceId: "test-resource",
        httpMethod,
        resourcePath: path,
        path,
        accountId: "123456789012",
        apiId: "test-api",
        protocol: "HTTP/1.1",
        requestTime: "01/Jan/2024:00:00:00 +0000",
        requestTimeEpoch: 1704067200,
        identity: {
          cognitoIdentityPoolId: null,
          accountId: null,
          cognitoIdentityId: null,
          caller: null,
          sourceIp: "127.0.0.1",
          principalOrgId: null,
          accessKey: null,
          cognitoAuthenticationType: null,
          cognitoAuthenticationProvider: null,
          userArn: null,
          userAgent: "test-agent",
          user: null,
          apiKey: null,
          apiKeyId: null,
          clientCert: null,
        },
        authorizer: null,
      },
      resource: path,
      stageVariables: null,
      multiValueQueryStringParameters: null,
    };
  }
});
