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
import { ErrorCodes } from "../types";

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

describe("Project Creation Lambda - Validation Edge Cases", () => {
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

  describe("Input sanitization edge cases", () => {
    it("should handle request with extra whitespace", async () => {
      const requestBody = {
        name: "  Test Project  ",
        description:
          "  A test project description that is long enough to meet the minimum requirements  ",
        category: "  technology  ",
        stockSupply: 1000,
      };

      const sanitizedInput = {
        entrepreneurId: "test-user-id",
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

      mockSanitizeProjectInput.mockReturnValue(sanitizedInput);

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
      expect(mockSanitizeProjectInput).toHaveBeenCalledWith({
        entrepreneurId: "test-user-id",
        ...requestBody,
      });
    });

    it("should handle request with line breaks in JSON", async () => {
      const requestBody = {
        name: "Test Project",
        description:
          "A test project description\nwith line breaks\rthat is long enough",
        category: "technology",
        stockSupply: 1000,
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

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

      const event = createMockEvent(requestBody);
      // Simulate line breaks in JSON body
      event.body = JSON.stringify(requestBody)
        .replace(/,/g, ",\n")
        .replace(/{/g, "{\n")
        .replace(/}/g, "\n}");

      const result = (await callHandler(event, mockContext)) as any;

      // Should handle the line breaks and parse successfully
      expect(mockExtractUserIdFromToken).toHaveBeenCalled();
    });

    it("should handle empty request body", async () => {
      const event = createMockEvent({});
      event.body = "";

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(500);
    });

    it("should handle null request body", async () => {
      const event = createMockEvent({});
      event.body = null as any;

      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(500);
    });
  });

  describe("Boundary value testing", () => {
    it("should handle minimum valid project name length", async () => {
      const requestBody = {
        name: "ABC", // Exactly 3 characters (minimum)
        description: "A".repeat(50), // Exactly 50 characters (minimum)
        category: "technology",
        stockSupply: 1, // Minimum stock supply
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      const mockProject = {
        projectId: "test-project-id",
        entrepreneurId: "test-user-id",
        name: "ABC",
        status: "draft",
        createdAt: "2023-01-01T00:00:00.000Z",
      };

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
    });

    it("should handle maximum valid values", async () => {
      const requestBody = {
        name: "A".repeat(100), // Maximum name length
        description: "A".repeat(2000), // Maximum description length
        category: "technology",
        stockSupply: 1000000, // Maximum stock supply
        targetFundingGoal: 999999999.99, // Large funding goal with 2 decimal places
        pricePerStock: 99999999.99999999, // Large price with 8 decimal places
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      const mockProject = {
        projectId: "test-project-id",
        entrepreneurId: "test-user-id",
        name: requestBody.name,
        status: "draft",
        createdAt: "2023-01-01T00:00:00.000Z",
      };

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
    });
  });

  describe("Special character handling", () => {
    it("should handle project names with allowed special characters", async () => {
      const requestBody = {
        name: "Test Project & Co., Inc.!",
        description:
          "A test project description that is long enough to meet the minimum requirements for validation",
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
        name: requestBody.name,
        status: "draft",
        createdAt: "2023-01-01T00:00:00.000Z",
      };

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
    });

    it("should reject project names with disallowed special characters", async () => {
      const requestBody = {
        name: "Test Project <script>alert('xss')</script>",
        description:
          "A test project description that is long enough to meet the minimum requirements",
        category: "technology",
        stockSupply: 1000,
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        ...requestBody,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: false,
        errors: [
          "Project name can only contain letters, numbers, spaces, and basic punctuation (.,!?-_&)",
        ],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(400);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.code).toBe(ErrorCodes.INVALID_PROJECT_DATA);
    });
  });

  describe("Numeric validation edge cases", () => {
    it("should handle zero and negative values correctly", async () => {
      const requestBody = {
        name: "Test Project",
        description:
          "A test project description that is long enough to meet the minimum requirements",
        category: "technology",
        stockSupply: 0, // Invalid
        targetFundingGoal: -1000, // Invalid
        pricePerStock: 0, // Invalid
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        ...requestBody,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: false,
        errors: [
          "Stock supply must be at least 1",
          "Target funding goal must be a positive number",
          "Price per stock must be a positive number",
        ],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(400);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.details.errors).toHaveLength(3);
    });

    it("should handle non-numeric values in numeric fields", async () => {
      const requestBody = {
        name: "Test Project",
        description:
          "A test project description that is long enough to meet the minimum requirements",
        category: "technology",
        stockSupply: "not-a-number" as any,
        targetFundingGoal: "invalid" as any,
        pricePerStock: "NaN" as any,
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        ...requestBody,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: false,
        errors: [
          "Stock supply must be a valid number",
          "Target funding goal must be a valid number",
          "Price per stock must be a valid number",
        ],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(400);
    });

    it("should handle floating point precision issues", async () => {
      const requestBody = {
        name: "Test Project",
        description:
          "A test project description that is long enough to meet the minimum requirements",
        category: "technology",
        stockSupply: 1000.5, // Should be integer
        targetFundingGoal: 1000.999, // Too many decimal places
        pricePerStock: 50.123456789, // Too many decimal places
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-user-id",
      });

      mockSanitizeProjectInput.mockReturnValue({
        entrepreneurId: "test-user-id",
        ...requestBody,
      });

      mockValidateCreateProjectInput.mockReturnValue({
        isValid: false,
        errors: [
          "Stock supply must be a whole number",
          "Target funding goal can have at most 2 decimal places",
          "Price per stock can have at most 8 decimal places",
        ],
      });

      mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(400);
    });
  });

  describe("Category validation edge cases", () => {
    it("should handle case variations in category", async () => {
      const categories = ["TECHNOLOGY", "Technology", "tEcHnOlOgY"];

      for (const category of categories) {
        const requestBody = {
          name: "Test Project",
          description:
            "A test project description that is long enough to meet the minimum requirements",
          category,
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

        mockExtractUserIdFromToken.mockReturnValue({
          success: true,
          userId: "test-user-id",
        });

        mockSanitizeProjectInput.mockReturnValue({
          entrepreneurId: "test-user-id",
          name: requestBody.name,
          description: requestBody.description,
          category: "technology", // Normalized to lowercase
          stockSupply: requestBody.stockSupply,
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
      }
    });

    it("should reject invalid categories", async () => {
      const invalidCategories = [
        "invalid-category",
        "",
        "tech nology",
        "technology123",
      ];

      for (const category of invalidCategories) {
        const requestBody = {
          name: "Test Project",
          description:
            "A test project description that is long enough to meet the minimum requirements",
          category,
          stockSupply: 1000,
        };

        const mockUser = {
          userId: "test-user-id",
          kycStatus: "approved",
        };

        mockExtractUserIdFromToken.mockReturnValue({
          success: true,
          userId: "test-user-id",
        });

        mockSanitizeProjectInput.mockReturnValue({
          entrepreneurId: "test-user-id",
          ...requestBody,
        });

        mockValidateCreateProjectInput.mockReturnValue({
          isValid: false,
          errors: [
            `Invalid category. Must be one of: technology, healthcare, finance...`,
          ],
        });

        mockUserRepo.getUserProfile.mockResolvedValue(mockUser as any);

        const event = createMockEvent(requestBody);
        const result = (await callHandler(event, mockContext)) as any;

        expect(result.statusCode).toBe(400);
      }
    });
  });

  describe("Concurrent request handling", () => {
    it("should handle race condition in duplicate name checking", async () => {
      const requestBody = {
        name: "Concurrent Project",
        description:
          "A test project description that is long enough to meet the minimum requirements",
        category: "technology",
        stockSupply: 1000,
      };

      const mockUser = {
        userId: "test-user-id",
        kycStatus: "approved",
      };

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

      // First call returns no duplicates, but by the time we create, there's a duplicate
      mockProjectRepo.getProjectsByEntrepreneur.mockResolvedValue({
        items: [],
        count: 0,
      });

      // Simulate database constraint violation
      mockProjectRepo.createProject.mockRejectedValue(
        new Error(
          "ConditionalCheckFailedException: The conditional request failed"
        )
      );

      const event = createMockEvent(requestBody);
      const result = (await callHandler(event, mockContext)) as any;

      expect(result.statusCode).toBe(500);
    });
  });
});
