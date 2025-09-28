import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index";
import { UserRepository } from "../../../repositories/user-repository";
import { ProjectRepository } from "../../../repositories/project-repository";
import { EventPublisher } from "../../../utils/event-publisher";
import { extractUserIdFromToken } from "../../../utils/jwt-utils";
import {
  validateCreateProjectInput,
  sanitizeProjectInput,
} from "../../../utils/project-validation";
import { ProjectCreationError, ErrorCodes } from "../types";

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

describe("Project Creation Lambda", () => {
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockProjectRepo: jest.Mocked<ProjectRepository>;
  let mockEventPub: jest.Mocked<EventPublisher>;

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

  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "test-function",
    functionVersion: "1",
    invokedFunctionArn:
      "arn:aws:lambda:us-east-1:123456789012:function:test-function",
    memoryLimitInMB: "128",
    awsRequestId: "test-request-id",
    logGroupName: "/aws/lambda/test-function",
    logStreamName: "2023/01/01/[$LATEST]test-stream",
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocked instances
    mockUserRepo = {
      getUserProfile: jest.fn(),
    } as any;

    mockProjectRepo = {
      createProject: jest.fn(),
      getProjectsByEntrepreneur: jest.fn(),
    } as any;

    mockEventPub = {
      publishProjectCreatedEvent: jest.fn(),
    } as any;

    mockUserRepository.mockImplementation(() => mockUserRepo);
    mockProjectRepository.mockImplementation(() => mockProjectRepo);
    mockEventPublisher.mockImplementation(() => mockEventPub);
  });

  const createMockEvent = (
    body: any,
    headers: Record<string, string> = {}
  ): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
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
      requestTime: "01/Jan/2023:00:00:00 +0000",
      requestTimeEpoch: 1672531200000,
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
        clientCert: null,
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
    resource: "/projects",
  });

  describe("Successful project creation", () => {
    it("should create a project successfully with valid input", async () => {
      const requestBody = {
        name: "Test Project",
        description:
          "A test project description that is long enough to meet the minimum requirements for validation",
        category: "technology",
        stockSupply: 1000,
        targetFundingGoal: 50000,
        pricePerStock: 50,
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      };

      const mockProject = {
        projectId: "test-project-id",
        entrepreneurId: "test-user-id",
        name: "Test Project",
        description: requestBody.description,
        category: "technology",
        stockSupply: 1000,
        targetFundingGoal: 50000,
        pricePerStock: 50,
        status: "draft",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      };

      // Setup mocks
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        ...requestBody,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: [],
        count: 0,
      });
      mockProjectRepo.createProject.mockResolvedValue(mockProject as any);
      mockEventPub.publishProjectCreatedEvent.mockResolvedValue();

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(201);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.projectId).toBe("test-project-id");
      expect(responseBody.message).toBe("Project created successfully");
      expect(responseBody.project.name).toBe("Test Project");

      // Verify all services were called correctly
      expect(mockExtractUserIdFromToken).toHaveBeenCalledWith(event);
      expect(mockUserRepo.getUserProfile).toHaveBeenCalledWith("test-user-id");
      expect(mockValidateCreateProjectInput).toHaveBeenCalled();
      expect(mockProjectRepo.createProject).toHaveBeenCalled();
      expect(mockEventPub.publishProjectCreatedEvent).toHaveBeenCalled();
    });

    it("should handle optional fields correctly", async () => {
      const requestBody = {
        name: "Minimal Project",
        description:
          "A minimal project description that meets the minimum length requirements for validation",
        category: "technology",
        stockSupply: 100,
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      const mockProject = {
        projectId: "test-project-id",
        entrepreneurId: "test-user-id",
        name: "Minimal Project",
        description: requestBody.description,
        category: "technology",
        stockSupply: 100,
        status: "draft",
        createdAt: "2023-01-01T00:00:00.000Z",
      };

      // Setup mocks
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        ...requestBody,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: [],
        count: 0,
      });
      mockProjectRepo.createProject.mockResolvedValue(mockProject as any);
      mockEventPub.publishProjectCreatedEvent.mockResolvedValue();

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(201);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.project.targetFundingGoal).toBeUndefined();
      expect(responseBody.project.pricePerStock).toBeUndefined();
    });
  });

  describe("Authentication failures", () => {
    it("should return 401 when token extraction fails", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const event = createMockEvent({
        name: "Test Project",
        description: "Test description",
        category: "technology",
        stockSupply: 100,
      });

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(401);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Authentication failed");
      expect(responseBody.code).toBe(ErrorCodes.AUTHENTICATION_FAILED);
    });

    it("should return 401 when no authorization header is provided", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "No authorization header",
      });

      const event = createMockEvent(
        {
          name: "Test Project",
          description: "Test description",
          category: "technology",
          stockSupply: 100,
        },
        {} // No Authorization header
      );

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(401);
    });
  });

  describe("KYC validation failures", () => {
    it("should return 404 when user profile is not found", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        name: "Test Project",
        description: "Test description",
        category: "technology",
        stockSupply: 100,
      });

      mockUserRepo.getUserProfile.mockResolvedValue(null);

      const event = createMockEvent({
        name: "Test Project",
        description: "Test description that meets minimum length requirements",
        category: "technology",
        stockSupply: 100,
      });

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(404);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("User profile not found");
      expect(responseBody.code).toBe(ErrorCodes.USER_NOT_FOUND);
    });

    it("should return 403 when KYC status is not approved", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        name: "Test Project",
        description: "Test description",
        category: "technology",
        stockSupply: 100,
      });

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "pending",
      };

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);

      const event = createMockEvent({
        name: "Test Project",
        description: "Test description that meets minimum length requirements",
        category: "technology",
        stockSupply: 100,
      });

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(403);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "KYC verification must be completed before creating projects"
      );
      expect(responseBody.code).toBe(ErrorCodes.KYC_NOT_VERIFIED);
      expect(responseBody.details.kycStatus).toBe("pending");
    });

    it("should handle different KYC statuses correctly", async () => {
      const kycStatuses = ["not_started", "rejected"];

      for (const status of kycStatuses) {
        mockExtractUserIdFromToken.mockReturnValue({
          success: true,
          userId: "test-user-id",
        });

        mockSanitizeProjectInput.mockReturnValue({
          entrepreneurId: "test-user-id",
          name: "Test Project",
          description: "Test description",
          category: "technology",
          stockSupply: 100,
        });

        const mockUser = {
          userId: "test-user-id",
          kycStatus: status,
        };

        mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);

        const event = createMockEvent({
          name: "Test Project",
          description:
            "Test description that meets minimum length requirements",
          category: "technology",
          stockSupply: 100,
        });

        const result = (await callHandler(event, mockContext)) as any;

        expect(result.statusCode).toBe(403);

        const responseBody = JSON.parse(result.body);
        expect(responseBody.code).toBe(ErrorCodes.KYC_NOT_VERIFIED);
        expect(responseBody.details.kycStatus).toBe(status);
      }
    });
  });

  describe("Validation failures", () => {
    it("should return 400 when project validation fails", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        name: "Test Project",
        description: "Short", // Too short
        category: "technology",
        stockSupply: 100,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: false,
        errors: ["Project description must be at least 50 characters long"],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);

      const event = createMockEvent({
        name: "Test Project",
        description: "Short",
        category: "technology",
        stockSupply: 100,
      });

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(400);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Project validation failed");
      expect(responseBody.code).toBe(ErrorCodes.INVALID_PROJECT_DATA);
      expect(responseBody.details.errors).toContain(
        "Project description must be at least 50 characters long"
      );
    });

    it("should handle multiple validation errors", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        name: "A", // Too short
        description: "Short", // Too short
        category: "invalid-category",
        stockSupply: -1, // Invalid
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: false,
        errors: [
          "Project name must be at least 3 characters long",
          "Project description must be at least 50 characters long",
          "Invalid category. Must be one of: technology, healthcare, finance...",
          "Stock supply must be at least 1",
        ],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);

      const event = createMockEvent({
        name: "A",
        description: "Short",
        category: "invalid-category",
        stockSupply: -1,
      });

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(400);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.details.errors).toHaveLength(4);
    });
  });

  describe("Business rule validation", () => {
    it("should return 409 when project name already exists", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        name: "Existing Project",
        description:
          "A valid description that meets the minimum length requirements",
        category: "technology",
        stockSupply: 100,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      const existingProject = {
        projectId: "existing-project-id",
        name: "Existing Project",
        entrepreneurId: "test-user-id",
        PK: "PROJECT#existing-project-id",
        SK: "METADATA",
        description: "Existing description",
        category: "technology",
        stockSupply: 100,
        status: "draft" as const,
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2023-01-01T00:00:00.000Z",
      };

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: [existingProject],
        count: 1,
      });

      const event = createMockEvent({
        name: "Existing Project",
        description:
          "A valid description that meets the minimum length requirements",
        category: "technology",
        stockSupply: 100,
      });

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(409);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe(
        "A project with this name already exists for your account"
      );
      expect(responseBody.code).toBe(ErrorCodes.PROJECT_NAME_EXISTS);
      expect(responseBody.details.existingProjectId).toBe(
        "existing-project-id"
      );
    });

    it("should handle case-insensitive duplicate name detection", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        name: "test project",
        description:
          "A valid description that meets the minimum length requirements",
        category: "technology",
        stockSupply: 100,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      const existingProject = {
        projectId: "existing-project-id",
        name: "Test Project", // Different case
        entrepreneurId: "test-user-id",
        PK: "PROJECT#existing-project-id",
        SK: "METADATA",
        description: "Existing description",
        category: "technology",
        stockSupply: 100,
        status: "draft" as const,
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
        GSI3PK: "PROJECT_STATUS#draft",
        GSI3SK: "2023-01-01T00:00:00.000Z",
      };

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: [existingProject],
        count: 1,
      });

      const event = createMockEvent({
        name: "test project",
        description:
          "A valid description that meets the minimum length requirements",
        category: "technology",
        stockSupply: 100,
      });

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(409);
      expect(JSON.parse(result.body).code).toBe(ErrorCodes.PROJECT_NAME_EXISTS);
    });
  });

  describe("Event publishing", () => {
    it("should continue successfully even if event publishing fails", async () => {
      const requestBody = {
        name: "Test Project",
        description:
          "A test project description that is long enough to meet the minimum requirements",
        category: "technology",
        stockSupply: 1000,
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      const mockProject = {
        projectId: "test-project-id",
        entrepreneurId: "test-user-id",
        name: "Test Project",
        description: requestBody.description,
        category: "technology",
        stockSupply: 1000,
        status: "draft",
        createdAt: "2023-01-01T00:00:00.000Z",
      };

      // Setup mocks
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        ...requestBody,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: [],
        count: 0,
      });
      mockProjectRepo.createProject.mockResolvedValue(mockProject as any);

      // Event publishing fails
      mockEventPub.publishProjectCreatedEvent.mockRejectedValue(
        new Error("EventBridge service unavailable")
      );

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      // Should still return success since project was created
      expect(result.statusCode).toBe(201);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.projectId).toBe("test-project-id");
    });
  });

  describe("Error handling", () => {
    it("should handle malformed JSON in request body", async () => {
      const event = createMockEvent({});
      event.body = "{ invalid json }";

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(500);
    });

    it("should handle base64 encoded request body", async () => {
      const requestBody = {
        name: "Test Project",
        description:
          "A test project description that is long enough to meet the minimum requirements",
        category: "technology",
        stockSupply: 1000,
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      const mockProject = {
        projectId: "test-project-id",
        entrepreneurId: "test-user-id",
        name: "Test Project",
        status: "draft",
        createdAt: "2023-01-01T00:00:00.000Z",
      };

      // Setup mocks
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        ...requestBody,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: [],
        count: 0,
      });
      mockProjectRepo.createProject.mockResolvedValue(mockProject as any);
      mockEventPub.publishProjectCreatedEvent.mockResolvedValue();

      const event = createMockEvent(requestBody);
      event.body = Buffer.from(JSON.stringify(requestBody)).toString("base64");
      event.isBase64Encoded = true;

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(201);
    });

    it("should handle database errors gracefully", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        name: "Test Project",
        description:
          "A valid description that meets the minimum length requirements",
        category: "technology",
        stockSupply: 100,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: [],
        count: 0,
      });

      // Database error during project creation
      mockProjectRepo.createProject.mockRejectedValue(
        new Error("DynamoDB service unavailable")
      );

      const event = createMockEvent({
        name: "Test Project",
        description:
          "A valid description that meets the minimum length requirements",
        category: "technology",
        stockSupply: 100,
      });

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(500);
    });
  });
});
