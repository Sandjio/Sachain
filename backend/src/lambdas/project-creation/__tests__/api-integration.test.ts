import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index";
import {
  CreateProjectRequest,
  CreateProjectResponse,
  ErrorCodes,
} from "../types";

// Mock AWS SDK
jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/lib-dynamodb");
jest.mock("@aws-sdk/client-eventbridge");

// Mock dependencies
jest.mock("../../../repositories/user-repository");
jest.mock("../../../repositories/project-repository");
jest.mock("../../../utils/event-publisher");
jest.mock("../../../utils/jwt-utils");
jest.mock("../../../utils/project-validation");
jest.mock("../../../utils/structured-logger", () => ({
  createProjectLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { UserRepository } from "../../../repositories/user-repository";
import { ProjectRepository } from "../../../repositories/project-repository";
import { EventPublisher } from "../../../utils/event-publisher";
import { extractUserIdFromToken } from "../../../utils/jwt-utils";
import {
  validateCreateProjectInput,
  sanitizeProjectInput,
} from "../../../utils/project-validation";

const mockUserRepository = UserRepository as jest.MockedClass<
  typeof UserRepository
>;
const mockProjectRepository = ProjectRepository as jest.MockedClass<
  typeof ProjectRepository
>;
const mockEventPublisher = EventPublisher as jest.MockedClass<
  typeof EventPublisher
>;
const mockExtractUserIdFromToken =
  extractUserIdFromToken as jest.MockedFunction<typeof extractUserIdFromToken>;
const mockValidateCreateProjectInput =
  validateCreateProjectInput as jest.MockedFunction<
    typeof validateCreateProjectInput
  >;
const mockSanitizeProjectInput = sanitizeProjectInput as jest.MockedFunction<
  typeof sanitizeProjectInput
>;

describe("Project Creation API Integration Tests", () => {
  let mockContext: Context;
  let mockUserRepositoryInstance: jest.Mocked<UserRepository>;
  let mockProjectRepositoryInstance: jest.Mocked<ProjectRepository>;
  let mockEventPublisherInstance: jest.Mocked<EventPublisher>;

  // Helper function to properly call the async handler
  const callHandler = async (event: APIGatewayProxyEvent, context: Context) => {
    return new Promise((resolve, reject) => {
      const callback = (error: any, result: any) => {
        if (error) reject(error);
        else resolve(result);
      };

      const result = handler(event, context, callback);
      if (result && typeof result.then === "function") {
        result.then(resolve).catch(reject);
      }
    });
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock context
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

    // Mock repository instances
    mockUserRepositoryInstance = {
      getUserProfile: jest.fn(),
    } as any;

    mockProjectRepositoryInstance = {
      createProject: jest.fn(),
      getProjectsByEntrepreneur: jest.fn(),
    } as any;

    mockEventPublisherInstance = {
      publishProjectCreatedEvent: jest.fn(),
    } as any;

    // Mock constructor calls
    mockUserRepository.mockImplementation(() => mockUserRepositoryInstance);
    mockProjectRepository.mockImplementation(
      () => mockProjectRepositoryInstance
    );
    mockEventPublisher.mockImplementation(() => mockEventPublisherInstance);

    // Set environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.EVENT_BUS_NAME = "test-event-bus";
    process.env.ENVIRONMENT = "test";
  });

  const createMockEvent = (
    body: any,
    headers: Record<string, string> = {}
  ): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-jwt-token",
      ...headers,
    },
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/projects",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: "test-request-id",
      stage: "test",
      resourceId: "test-resource",
      resourcePath: "/projects",
      httpMethod: "POST",
      requestTime: "01/Jan/2024:00:00:00 +0000",
      requestTimeEpoch: 1704067200,
      path: "/test/projects",
      accountId: "123456789012",
      protocol: "HTTP/1.1",
      apiId: "test-api-id",
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
      authorizer: {
        claims: {
          sub: "test-user-123",
          email: "test@example.com",
        },
      },
    },
    resource: "/projects",
  });

  describe("POST /projects - Success Cases", () => {
    beforeEach(() => {
      // Mock successful authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-123",
      });

      // Mock successful input sanitization
      mockSanitizeProjectInput.mockImplementation((input) => input);

      // Mock successful validation
      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      // Mock successful KYC verification
      mockUserRepositoryInstance.getUserProfile.mockResolvedValue({
        PK: "USER#test-user-123",
        SK: "PROFILE",
        userId: "test-user-123",
        email: "test@example.com",
        kycStatus: "approved",
        userType: "entrepreneur",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        GSI1PK: "KYC_STATUS#approved",
        GSI1SK: "2024-01-01T00:00:00Z",
      });

      // Mock no existing projects (unique name)
      mockProjectRepositoryInstance.getProjectsByEntrepreneur.mockResolvedValue(
        {
          items: [],
          count: 0,
          lastEvaluatedKey: undefined,
        }
      );

      // Mock successful project creation
      mockProjectRepositoryInstance.createProject.mockResolvedValue({
        PK: "PROJECT#proj-123",
        SK: "METADATA",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-15T14:30:00Z",
        projectId: "proj-123",
        entrepreneurId: "test-user-123",
        name: "Test Project",
        description: "A test project for unit testing",
        category: "Technology",
        stockSupply: 1000,
        targetFundingGoal: 100000,
        pricePerStock: 100,
        status: "draft",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
      });

      // Mock successful event publishing
      mockEventPublisherInstance.publishProjectCreatedEvent.mockResolvedValue();
    });

    it.only("should create project with all fields", async () => {
      // Mock successful authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-123",
      });

      // Mock successful input sanitization
      mockSanitizeProjectInput.mockImplementation((input) => input);

      // Mock successful validation
      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      // Mock successful KYC verification
      mockUserRepositoryInstance.getUserProfile.mockResolvedValue({
        PK: "USER#test-user-123",
        SK: "PROFILE",
        userId: "test-user-123",
        email: "test@example.com",
        kycStatus: "approved",
        userType: "entrepreneur",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        GSI1PK: "KYC_STATUS#approved",
        GSI1SK: "2024-01-01T00:00:00Z",
      });

      // Mock no existing projects (unique name)
      mockProjectRepositoryInstance.getProjectsByEntrepreneur.mockResolvedValue(
        {
          items: [],
          count: 0,
          lastEvaluatedKey: undefined,
        }
      );

      // Mock successful project creation
      mockProjectRepositoryInstance.createProject.mockResolvedValue({
        PK: "PROJECT#proj-123",
        SK: "METADATA",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-15T14:30:00Z",
        projectId: "proj-123",
        entrepreneurId: "test-user-123",
        name: "Test Project",
        description: "A test project for unit testing",
        category: "Technology",
        stockSupply: 1000,
        targetFundingGoal: 100000,
        pricePerStock: 100,
        status: "draft",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
      });

      // Mock successful event publishing
      mockEventPublisherInstance.publishProjectCreatedEvent.mockResolvedValue();

      const requestBody: CreateProjectRequest = {
        name: "EcoTech Solutions",
        description:
          "Revolutionary solar panel technology that increases efficiency by 40% while reducing manufacturing costs. Our patented nano-coating process enables better light absorption and weather resistance.",
        category: "CleanTech",
        stockSupply: 10000,
        targetFundingGoal: 500000,
        pricePerStock: 50,
        coverImageUrl: "https://example.com/cover.jpg",
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      if (result.statusCode !== 201) {
        console.log("Unexpected result:", JSON.stringify(result, null, 2));
        console.log("Mock calls:", {
          extractUserIdFromToken: mockExtractUserIdFromToken.mock.calls,
          extractUserIdFromTokenResults:
            mockExtractUserIdFromToken.mock.results.map((r) => r.value),
          getUserProfile: mockUserRepositoryInstance.getUserProfile.mock.calls,
        });
      }

      expect(result.statusCode).toBe(201);

      const response: CreateProjectResponse = JSON.parse(result.body);
      expect(response.projectId).toBe("proj-123");
      expect(response.message).toBe("Project created successfully");
      expect(response.project.name).toBe("Test Project");
      expect(response.project.status).toBe("draft");

      // Verify repository calls
      expect(mockUserRepositoryInstance.getUserProfile).toHaveBeenCalledWith(
        "test-user-123"
      );
      expect(
        mockProjectRepositoryInstance.getProjectsByEntrepreneur
      ).toHaveBeenCalledWith("test-user-123", { limit: 100 });
      expect(mockProjectRepositoryInstance.createProject).toHaveBeenCalled();
      expect(
        mockEventPublisherInstance.publishProjectCreatedEvent
      ).toHaveBeenCalled();
    });

    it("should create project with minimal required fields", async () => {
      const requestBody: CreateProjectRequest = {
        name: "Minimal Project",
        description:
          "A minimal project with only required fields for testing purposes. This description meets the minimum length requirement.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(201);

      const response: CreateProjectResponse = JSON.parse(result.body);
      expect(response.projectId).toBe("proj-123");
      expect(response.message).toBe("Project created successfully");
    });

    it("should handle CORS headers correctly", async () => {
      const requestBody: CreateProjectRequest = {
        name: "CORS Test Project",
        description:
          "Testing CORS headers in the API response to ensure proper cross-origin resource sharing configuration.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(201);
      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
    });
  });

  describe("POST /projects - Authentication Errors", () => {
    it("should return 401 for missing authorization header", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "No authorization header",
      });

      const requestBody: CreateProjectRequest = {
        name: "Unauthorized Project",
        description:
          "This project should fail due to missing authorization header in the request.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody, { Authorization: "" });
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(401);

      const response = JSON.parse(result.body);
      expect(response.message).toBe("Authentication failed");
    });

    it("should return 401 for invalid JWT token", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const requestBody: CreateProjectRequest = {
        name: "Invalid Token Project",
        description:
          "This project should fail due to invalid JWT token in the authorization header.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody, {
        Authorization: "Bearer invalid-token",
      });
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(401);

      const response = JSON.parse(result.body);
      expect(response.message).toBe("Authentication failed");
    });
  });

  describe("POST /projects - KYC Verification Errors", () => {
    beforeEach(() => {
      // Mock successful authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-123",
      });

      mockSanitizeProjectInput.mockImplementation((input) => input);
    });

    it("should return 403 for incomplete KYC verification", async () => {
      // Mock user with incomplete KYC
      mockUserRepositoryInstance.getUserProfile.mockResolvedValue({
        PK: "USER#test-user-123",
        SK: "PROFILE",
        userId: "test-user-123",
        email: "test@example.com",
        kycStatus: "pending",
        userType: "entrepreneur",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        GSI1PK: "KYC_STATUS#pending",
        GSI1SK: "2024-01-01T00:00:00Z",
      });

      const requestBody: CreateProjectRequest = {
        name: "KYC Pending Project",
        description:
          "This project should fail because the user's KYC verification is still pending approval.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(403);

      const response = JSON.parse(result.body);
      expect(response.message).toBe(
        "KYC verification must be completed before creating projects"
      );
      expect(response.code).toBe(ErrorCodes.KYC_NOT_VERIFIED);
      expect(response.details.kycStatus).toBe("pending");
    });

    it("should return 404 for non-existent user", async () => {
      mockUserRepositoryInstance.getUserProfile.mockResolvedValue(null);

      const requestBody: CreateProjectRequest = {
        name: "Non-existent User Project",
        description:
          "This project should fail because the user profile does not exist in the database.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(404);

      const response = JSON.parse(result.body);
      expect(response.message).toBe("User profile not found");
      expect(response.code).toBe(ErrorCodes.USER_NOT_FOUND);
    });
  });

  describe("POST /projects - Validation Errors", () => {
    beforeEach(() => {
      // Mock successful authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-123",
      });

      mockSanitizeProjectInput.mockImplementation((input) => input);

      // Mock successful KYC verification
      mockUserRepositoryInstance.getUserProfile.mockResolvedValue({
        PK: "USER#test-user-123",
        SK: "PROFILE",
        userId: "test-user-123",
        email: "test@example.com",
        kycStatus: "approved",
        userType: "entrepreneur",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        GSI1PK: "KYC_STATUS#approved",
        GSI1SK: "2024-01-01T00:00:00Z",
      });

      // Mock no existing projects
      mockProjectRepositoryInstance.getProjectsByEntrepreneur.mockResolvedValue(
        {
          items: [],
          count: 0,
          lastEvaluatedKey: undefined,
        }
      );
    });

    it("should return 400 for missing required fields", async () => {
      mockValidateCreateProjectInput.mockReturnValue({
        isValid: false,
        errors: [
          "Project description is required",
          "Project category is required",
          "Stock supply is required",
        ],
      });

      const requestBody = {
        name: "Incomplete Project",
        // Missing description, category, stockSupply
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(400);

      const response = JSON.parse(result.body);
      expect(response.message).toBe("Project validation failed");
      expect(response.code).toBe(ErrorCodes.INVALID_PROJECT_DATA);
      expect(response.details.errors).toBeInstanceOf(Array);
    });

    it("should return 400 for invalid project name", async () => {
      mockValidateCreateProjectInput.mockReturnValue({
        isValid: false,
        errors: ["Project name must be between 3-100 characters"],
      });

      const requestBody: CreateProjectRequest = {
        name: "AB", // Too short
        description:
          "This project has a name that is too short according to validation rules.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(400);

      const response = JSON.parse(result.body);
      expect(response.message).toBe("Project validation failed");
      expect(response.code).toBe(ErrorCodes.INVALID_PROJECT_DATA);
    });

    it("should return 400 for invalid stock supply", async () => {
      mockValidateCreateProjectInput.mockReturnValue({
        isValid: false,
        errors: ["Stock supply must be between 1 and 1,000,000"],
      });

      const requestBody: CreateProjectRequest = {
        name: "Invalid Stock Project",
        description:
          "This project has an invalid stock supply that exceeds the maximum allowed limit.",
        category: "Technology",
        stockSupply: 2000000, // Exceeds maximum
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(400);

      const response = JSON.parse(result.body);
      expect(response.message).toBe("Project validation failed");
      expect(response.code).toBe(ErrorCodes.INVALID_PROJECT_DATA);
    });
  });

  describe("POST /projects - Business Logic Errors", () => {
    beforeEach(() => {
      // Mock successful authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-123",
      });

      mockSanitizeProjectInput.mockImplementation((input) => input);
      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      // Mock successful KYC verification
      mockUserRepositoryInstance.getUserProfile.mockResolvedValue({
        PK: "USER#test-user-123",
        SK: "PROFILE",
        userId: "test-user-123",
        email: "test@example.com",
        kycStatus: "approved",
        userType: "entrepreneur",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        GSI1PK: "KYC_STATUS#approved",
        GSI1SK: "2024-01-01T00:00:00Z",
      });
    });

    it("should return 409 for duplicate project name", async () => {
      // Mock existing project with same name
      mockProjectRepositoryInstance.getProjectsByEntrepreneur.mockResolvedValue(
        {
          items: [
            {
              PK: "PROJECT#existing-proj-123",
              SK: "METADATA",
              GSI3PK: "PROJECT_STATUS#draft",
              GSI3SK: "2024-01-01T00:00:00Z",
              projectId: "existing-proj-123",
              entrepreneurId: "test-user-123",
              name: "Duplicate Project",
              description: "An existing project",
              category: "Technology",
              stockSupply: 1000,
              status: "draft",
              createdAt: "2024-01-01T00:00:00Z",
              updatedAt: "2024-01-01T00:00:00Z",
            },
          ],
          count: 1,
          lastEvaluatedKey: undefined,
        }
      );

      const requestBody: CreateProjectRequest = {
        name: "Duplicate Project",
        description:
          "This project should fail because another project with the same name already exists.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(409);

      const response = JSON.parse(result.body);
      expect(response.message).toBe(
        "A project with this name already exists for your account"
      );
      expect(response.code).toBe(ErrorCodes.PROJECT_NAME_EXISTS);
      expect(response.details.existingProjectId).toBe("existing-proj-123");
    });
  });

  describe("POST /projects - System Errors", () => {
    beforeEach(() => {
      // Mock successful authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-123",
      });

      mockSanitizeProjectInput.mockImplementation((input) => input);
      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      // Mock successful KYC verification
      mockUserRepositoryInstance.getUserProfile.mockResolvedValue({
        PK: "USER#test-user-123",
        SK: "PROFILE",
        userId: "test-user-123",
        email: "test@example.com",
        kycStatus: "approved",
        userType: "entrepreneur",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        GSI1PK: "KYC_STATUS#approved",
        GSI1SK: "2024-01-01T00:00:00Z",
      });

      // Mock no existing projects
      mockProjectRepositoryInstance.getProjectsByEntrepreneur.mockResolvedValue(
        {
          items: [],
          count: 0,
          lastEvaluatedKey: undefined,
        }
      );
    });

    it("should return 500 for database errors", async () => {
      // Mock database error
      mockProjectRepositoryInstance.createProject.mockRejectedValue(
        new Error("DynamoDB connection failed")
      );

      const requestBody: CreateProjectRequest = {
        name: "Database Error Project",
        description:
          "This project should fail due to a database connection error during creation.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(500);

      const response = JSON.parse(result.body);
      expect(response.message).toBeDefined();
      expect(response.requestId).toBe("test-request-id");
    });

    it("should handle event publishing failures gracefully", async () => {
      // Mock successful project creation but failed event publishing
      mockProjectRepositoryInstance.createProject.mockResolvedValue({
        PK: "PROJECT#proj-123",
        SK: "METADATA",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-15T14:30:00Z",
        projectId: "proj-123",
        entrepreneurId: "test-user-123",
        name: "Event Error Project",
        description: "A test project",
        category: "Technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
      });

      mockEventPublisherInstance.publishProjectCreatedEvent.mockRejectedValue(
        new Error("EventBridge service unavailable")
      );

      const requestBody: CreateProjectRequest = {
        name: "Event Error Project",
        description:
          "This project should succeed even if event publishing fails, as it's not critical.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      // Project creation should still succeed
      expect(result.statusCode).toBe(201);

      const response: CreateProjectResponse = JSON.parse(result.body);
      expect(response.projectId).toBe("proj-123");
      expect(response.message).toBe("Project created successfully");
    });
  });

  describe("POST /projects - Request Format Handling", () => {
    beforeEach(() => {
      // Mock successful authentication
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-123",
      });

      mockSanitizeProjectInput.mockImplementation((input) => input);
      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      // Mock successful KYC verification
      mockUserRepositoryInstance.getUserProfile.mockResolvedValue({
        PK: "USER#test-user-123",
        SK: "PROFILE",
        userId: "test-user-123",
        email: "test@example.com",
        kycStatus: "approved",
        userType: "entrepreneur",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        GSI1PK: "KYC_STATUS#approved",
        GSI1SK: "2024-01-01T00:00:00Z",
      });

      // Mock no existing projects
      mockProjectRepositoryInstance.getProjectsByEntrepreneur.mockResolvedValue(
        {
          items: [],
          count: 0,
          lastEvaluatedKey: undefined,
        }
      );

      // Mock successful project creation
      mockProjectRepositoryInstance.createProject.mockResolvedValue({
        PK: "PROJECT#proj-123",
        SK: "METADATA",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2024-01-15T14:30:00Z",
        projectId: "proj-123",
        entrepreneurId: "test-user-123",
        name: "Test Project",
        description: "A test project",
        category: "Technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2024-01-15T14:30:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
      });

      mockEventPublisherInstance.publishProjectCreatedEvent.mockResolvedValue();
    });

    it("should handle base64 encoded request body", async () => {
      const requestBody: CreateProjectRequest = {
        name: "Base64 Project",
        description:
          "This project tests base64 encoded request body handling in the API Gateway integration.",
        category: "Technology",
        stockSupply: 1000,
      };

      const event = createMockEvent(requestBody);
      event.body = Buffer.from(JSON.stringify(requestBody)).toString("base64");
      event.isBase64Encoded = true;

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(201);

      const response: CreateProjectResponse = JSON.parse(result.body);
      expect(response.projectId).toBe("proj-123");
    });

    it("should handle malformed JSON gracefully", async () => {
      const event = createMockEvent({});
      event.body = "{ invalid json }";

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(500);

      const response = JSON.parse(result.body);
      expect(response.message).toBeDefined();
    });

    it("should handle empty request body", async () => {
      mockValidateCreateProjectInput.mockReturnValue({
        isValid: false,
        errors: ["Request body is required"],
      });

      const event = createMockEvent({});
      event.body = "";

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(400);

      const response = JSON.parse(result.body);
      expect(response.message).toBe("Project validation failed");
    });
  });
});
