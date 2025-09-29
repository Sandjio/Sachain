import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { ProjectRepository } from "../../../repositories/project-repository";
import { UserRepository } from "../../../repositories/user-repository";
import { extractUserIdFromToken } from "../../../utils/jwt-utils";
import { Project, ProjectStats } from "../../../models/project";

// Helper function to ensure proper typing
async function callHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const { handler } = await import("../index");
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

const mockProjectRepository = ProjectRepository as jest.MockedClass<
  typeof ProjectRepository
>;
const mockUserRepository = UserRepository as jest.MockedClass<
  typeof UserRepository
>;
const mockExtractUserIdFromToken =
  extractUserIdFromToken as jest.MockedFunction<typeof extractUserIdFromToken>;

describe("Project Query Performance Tests", () => {
  let mockProjectRepo: jest.Mocked<ProjectRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockContext: Context;

  const createMockProject = (
    id: string,
    status: string,
    category: string
  ): Project => ({
    PK: `PROJECT#${id}`,
    SK: "METADATA",
    projectId: id,
    entrepreneurId: "test-entrepreneur-1",
    name: `Test Project ${id}`,
    description: "A test project for performance testing",
    category,
    stockSupply: 1000,
    status: status as any,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    GSI3PK: `PROJECT_STATUS#${status}`,
    GSI3SK: "2024-01-01T00:00:00.000Z",
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockProjectRepo = {
      getProject: jest.fn(),
      getProjectsByStatus: jest.fn(),
      getProjectsByEntrepreneur: jest.fn(),
      getProjects: jest.fn(),
      getProjectStats: jest.fn(),
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

    process.env.TABLE_NAME = "test-table";
    process.env.ENVIRONMENT = "test";
    process.env.AWS_REGION = "us-east-1";
  });

  describe("Query Optimization", () => {
    it("should prefer GSI3 queries over scan operations", async () => {
      const projects = Array.from({ length: 10 }, (_, i) =>
        createMockProject(`project-${i}`, "active", "technology")
      );

      mockProjectRepo.getProjectsByStatus.mockResolvedValue({
        items: projects,
        count: 10,
        lastEvaluatedKey: undefined,
      });

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user",
      });

      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#test-user",
        SK: "PROFILE",
        userId: "test-user",
        email: "test@example.com",
        userType: "investor",
        kycStatus: "approved",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        emailVerified: true,
        GSI1PK: "KYC_STATUS#approved",
        GSI1SK: "2024-01-01T00:00:00.000Z",
      });

      const event = createMockEvent("GET", "/projects", undefined, {
        status: "active",
      });
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(mockProjectRepo.getProjectsByStatus).toHaveBeenCalledWith(
        "active",
        expect.any(Object)
      );
      expect(mockProjectRepo.getProjects).not.toHaveBeenCalled();
    });

    it("should handle large result sets with pagination", async () => {
      const projects = Array.from({ length: 100 }, (_, i) =>
        createMockProject(`project-${i}`, "active", "technology")
      );

      const firstPage = projects.slice(0, 20);
      const lastEvaluatedKey = { PK: "PROJECT#project-19", SK: "METADATA" };

      mockProjectRepo.getProjectsByStatus.mockResolvedValue({
        items: firstPage,
        count: 20,
        lastEvaluatedKey,
      });

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user",
      });

      mockUserRepo.getUserProfile.mockResolvedValue({
        PK: "USER#test-user",
        SK: "PROFILE",
        userId: "test-user",
        email: "test@example.com",
        userType: "investor",
        kycStatus: "approved",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        emailVerified: true,
        GSI1PK: "KYC_STATUS#approved",
        GSI1SK: "2024-01-01T00:00:00.000Z",
      });

      const event = createMockEvent("GET", "/projects", undefined, {
        status: "active",
        limit: "20",
      });
      const result = await callHandler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const response = JSON.parse(result.body);
      expect(response.projects).toHaveLength(20);
      expect(response.pagination.hasMore).toBe(true);
      expect(response.pagination.lastEvaluatedKey).toEqual(lastEvaluatedKey);
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
