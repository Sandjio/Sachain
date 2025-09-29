import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler, setProjectRepository, setEventPublisher } from "../index";
import { ProjectRepository } from "../../../repositories/project-repository";
import { EventPublisher } from "../../../utils/event-publisher";
import { extractUserIdFromToken } from "../../../utils/jwt-utils";
import { validateUpdateProjectInput } from "../../../utils/project-validation";
import { Project } from "../../../models/project";

// Mock dependencies
jest.mock("../../../repositories/project-repository");
jest.mock("../../../utils/event-publisher");
jest.mock("../../../utils/jwt-utils");
jest.mock("../../../utils/project-validation");
jest.mock("../../../utils/structured-logger", () => ({
  createProjectLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockProjectRepository = ProjectRepository as jest.MockedClass<
  typeof ProjectRepository
>;
const mockEventPublisher = EventPublisher as jest.MockedClass<
  typeof EventPublisher
>;
const mockExtractUserIdFromToken =
  extractUserIdFromToken as jest.MockedFunction<typeof extractUserIdFromToken>;
const mockValidateUpdateProjectInput =
  validateUpdateProjectInput as jest.MockedFunction<
    typeof validateUpdateProjectInput
  >;

describe("Project Management Lambda", () => {
  let mockProjectRepositoryInstance: jest.Mocked<ProjectRepository>;
  let mockEventPublisherInstance: jest.Mocked<EventPublisher>;
  let mockContext: Context;

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
    jest.clearAllMocks();

    // Mock repository instance
    mockProjectRepositoryInstance = {
      getProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      getProjectStats: jest.fn(),
      getProjectHederaTransactions: jest.fn(),
    } as any;

    // Mock event publisher instance
    mockEventPublisherInstance = {
      publishProjectUpdatedEvent: jest.fn(),
      publishProjectStatusChangedEvent: jest.fn(),
      publishEvent: jest.fn(),
    } as any;

    mockProjectRepository.mockImplementation(
      () => mockProjectRepositoryInstance
    );
    mockEventPublisher.mockImplementation(() => mockEventPublisherInstance);

    // Inject the mocked repository and event publisher
    setProjectRepository(mockProjectRepositoryInstance);
    setEventPublisher(mockEventPublisherInstance);

    mockContext = {
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

    // Set environment variables
    process.env.TABLE_NAME = "test-table";
    process.env.EVENT_BUS_NAME = "test-event-bus";
    process.env.ENVIRONMENT = "test";
    process.env.AWS_REGION = "us-east-1";
  });

  describe("Project Update", () => {
    const mockProject: Project = {
      PK: "PROJECT#test-project-id",
      SK: "METADATA",
      projectId: "test-project-id",
      entrepreneurId: "test-entrepreneur-id",
      name: "Original Project Name",
      description:
        "Original project description that is long enough to meet requirements",
      category: "technology",
      stockSupply: 1000,
      targetFundingGoal: 50000,
      pricePerStock: 10.5,
      coverImageUrl: "https://example.com/image.jpg",
      status: "draft",
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
      GSI3PK: "PROJECT_STATUS#draft",
      GSI3SK: "2023-01-01T00:00:00.000Z",
    };

    const createUpdateEvent = (
      body: any,
      projectId: string = "test-project-id"
    ): APIGatewayProxyEvent => ({
      httpMethod: "PUT",
      path: `/projects/${projectId}`,
      pathParameters: { projectId },
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      isBase64Encoded: false,
      requestContext: {
        requestId: "test-request-id",
        stage: "test",
        resourceId: "test-resource",
        httpMethod: "PUT",
        resourcePath: "/projects/{projectId}",
        path: `/projects/${projectId}`,
        accountId: "123456789012",
        apiId: "test-api-id",
        protocol: "HTTP/1.1",
        requestTime: "01/Jan/2023:00:00:00 +0000",
        requestTimeEpoch: 1672531200,
        identity: {
          sourceIp: "127.0.0.1",
          userAgent: "test-agent",
        } as any,
        authorizer: null,
      } as any,
      resource: "/projects/{projectId}",
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      multiValueHeaders: {},
    });

    it("should successfully update a draft project", async () => {
      // Arrange
      const updateRequest = {
        name: "Updated Project Name",
        description:
          "Updated project description that is long enough to meet requirements",
        targetFundingGoal: 75000,
      };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-id",
      });

      mockProjectRepositoryInstance.getProject.mockResolvedValue(mockProject);
      mockValidateUpdateProjectInput.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockProjectRepositoryInstance.updateProject.mockResolvedValue();
      mockEventPublisherInstance.publishProjectUpdatedEvent.mockResolvedValue();

      const event = createUpdateEvent(updateRequest);

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        projectId: "test-project-id",
        message: "Project updated successfully",
        changes: ["name", "description", "targetFundingGoal"],
      });

      expect(mockProjectRepositoryInstance.getProject).toHaveBeenCalledWith(
        "test-project-id"
      );
      expect(mockProjectRepositoryInstance.updateProject).toHaveBeenCalledWith({
        projectId: "test-project-id",
        name: "Updated Project Name",
        description:
          "Updated project description that is long enough to meet requirements",
        targetFundingGoal: 75000,
      });
      expect(
        mockEventPublisherInstance.publishProjectUpdatedEvent
      ).toHaveBeenCalled();
    });

    it("should reject update for non-draft project", async () => {
      // Arrange
      const activeProject = { ...mockProject, status: "active" as const };
      const updateRequest = { name: "Updated Name" };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-id",
      });

      mockProjectRepositoryInstance.getProject.mockResolvedValue(activeProject);

      const event = createUpdateEvent(updateRequest);

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(422);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "Only draft projects can be updated",
        code: "INVALID_PROJECT_STATUS",
      });

      expect(
        mockProjectRepositoryInstance.updateProject
      ).not.toHaveBeenCalled();
    });

    it("should reject update for non-existent project", async () => {
      // Arrange
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-id",
      });

      mockProjectRepositoryInstance.getProject.mockResolvedValue(null);

      const event = createUpdateEvent({ name: "Updated Name" });

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "Project not found",
        code: "PROJECT_NOT_FOUND",
      });
    });

    it("should reject update for unauthorized user", async () => {
      // Arrange
      const otherUserProject = {
        ...mockProject,
        entrepreneurId: "other-user-id",
      };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-id",
      });

      mockProjectRepositoryInstance.getProject.mockResolvedValue(
        otherUserProject
      );

      const event = createUpdateEvent({ name: "Updated Name" });

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "You do not have permission to access this project",
        code: "UNAUTHORIZED_ACCESS",
      });
    });

    it("should reject update with invalid data", async () => {
      // Arrange
      const updateRequest = { name: "X" }; // Too short

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-id",
      });

      mockProjectRepositoryInstance.getProject.mockResolvedValue(mockProject);
      mockValidateUpdateProjectInput.mockReturnValue({
        isValid: false,
        errors: ["Project name must be at least 3 characters long"],
      });

      const event = createUpdateEvent(updateRequest);

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "Project validation failed",
        code: "INVALID_PROJECT_DATA",
      });

      expect(
        mockProjectRepositoryInstance.updateProject
      ).not.toHaveBeenCalled();
    });

    it("should handle authentication failure", async () => {
      // Arrange
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const event = createUpdateEvent({ name: "Updated Name" });

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "Authentication failed",
        code: "AUTHENTICATION_FAILED",
      });
    });
  });

  describe("Project Status Transition", () => {
    const createStatusTransitionEvent = (
      body: any,
      projectId: string = "test-project-id"
    ): APIGatewayProxyEvent => ({
      httpMethod: "PUT",
      path: `/projects/${projectId}/status`,
      pathParameters: { projectId },
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      isBase64Encoded: false,
      requestContext: {
        requestId: "test-request-id",
        stage: "test",
        resourceId: "test-resource",
        httpMethod: "PUT",
        resourcePath: "/projects/{projectId}/status",
        path: `/projects/${projectId}/status`,
        accountId: "123456789012",
        apiId: "test-api-id",
        protocol: "HTTP/1.1",
        requestTime: "01/Jan/2023:00:00:00 +0000",
        requestTimeEpoch: 1672531200,
        identity: {
          sourceIp: "127.0.0.1",
          userAgent: "test-agent",
        } as any,
        authorizer: null,
      } as any,
      resource: "/projects/{projectId}/status",
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      multiValueHeaders: {},
    });

    const mockProject: Project = {
      PK: "PROJECT#test-project-id",
      SK: "METADATA",
      projectId: "test-project-id",
      entrepreneurId: "test-entrepreneur-id",
      name: "Test Project",
      description:
        "Test project description that is long enough to meet requirements",
      category: "technology",
      stockSupply: 1000,
      status: "draft",
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
      GSI3PK: "PROJECT_STATUS#draft",
      GSI3SK: "2023-01-01T00:00:00.000Z",
    };

    it("should successfully transition from draft to minting", async () => {
      // Arrange
      const statusRequest = { newStatus: "minting" as const };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-id",
      });

      mockProjectRepositoryInstance.getProject.mockResolvedValue(mockProject);
      mockProjectRepositoryInstance.updateProject.mockResolvedValue();
      mockEventPublisherInstance.publishProjectStatusChangedEvent.mockResolvedValue();

      const event = createStatusTransitionEvent(statusRequest);

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        projectId: "test-project-id",
        message: "Project status updated successfully",
        previousStatus: "draft",
        newStatus: "minting",
      });

      expect(mockProjectRepositoryInstance.updateProject).toHaveBeenCalledWith({
        projectId: "test-project-id",
        status: "minting",
      });
      expect(
        mockEventPublisherInstance.publishProjectStatusChangedEvent
      ).toHaveBeenCalled();
    });

    it("should reject invalid status transition", async () => {
      // Arrange
      const completedProject = { ...mockProject, status: "completed" as const };
      const statusRequest = { newStatus: "draft" as const };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-id",
      });

      mockProjectRepositoryInstance.getProject.mockResolvedValue(
        completedProject
      );

      const event = createStatusTransitionEvent(statusRequest);

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(422);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "Invalid status transition from 'completed' to 'draft'",
        code: "INVALID_STATUS_TRANSITION",
      });

      expect(
        mockProjectRepositoryInstance.updateProject
      ).not.toHaveBeenCalled();
    });
  });

  describe("Project Deletion", () => {
    const createDeleteEvent = (
      projectId: string = "test-project-id"
    ): APIGatewayProxyEvent => ({
      httpMethod: "DELETE",
      path: `/projects/${projectId}`,
      pathParameters: { projectId },
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: null,
      isBase64Encoded: false,
      requestContext: {
        requestId: "test-request-id",
        stage: "test",
        resourceId: "test-resource",
        httpMethod: "DELETE",
        resourcePath: "/projects/{projectId}",
        path: `/projects/${projectId}`,
        accountId: "123456789012",
        apiId: "test-api-id",
        protocol: "HTTP/1.1",
        requestTime: "01/Jan/2023:00:00:00 +0000",
        requestTimeEpoch: 1672531200,
        identity: {
          sourceIp: "127.0.0.1",
          userAgent: "test-agent",
        } as any,
        authorizer: null,
      } as any,
      resource: "/projects/{projectId}",
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      multiValueHeaders: {},
    });

    const mockProject: Project = {
      PK: "PROJECT#test-project-id",
      SK: "METADATA",
      projectId: "test-project-id",
      entrepreneurId: "test-entrepreneur-id",
      name: "Test Project",
      description:
        "Test project description that is long enough to meet requirements",
      category: "technology",
      stockSupply: 1000,
      status: "draft",
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
      GSI3PK: "PROJECT_STATUS#draft",
      GSI3SK: "2023-01-01T00:00:00.000Z",
    };

    it("should successfully delete a draft project", async () => {
      // Arrange
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-id",
      });

      mockProjectRepositoryInstance.getProject.mockResolvedValue(mockProject);
      mockProjectRepositoryInstance.getProjectStats.mockResolvedValue(null);
      mockProjectRepositoryInstance.getProjectHederaTransactions.mockResolvedValue(
        {
          items: [],
          count: 0,
          lastEvaluatedKey: undefined,
        }
      );
      mockProjectRepositoryInstance.deleteProject.mockResolvedValue();
      mockEventPublisherInstance.publishEvent.mockResolvedValue();

      const event = createDeleteEvent();

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        projectId: "test-project-id",
        message: "Project deleted successfully",
      });

      expect(mockProjectRepositoryInstance.deleteProject).toHaveBeenCalledWith(
        "test-project-id"
      );
      expect(mockEventPublisherInstance.publishEvent).toHaveBeenCalledWith(
        "sachain.projects",
        expect.objectContaining({
          eventType: "PROJECT_DELETED",
          projectId: "test-project-id",
          entrepreneurId: "test-entrepreneur-id",
          projectName: "Test Project",
        }),
        "Project Deleted",
        "PROJECT_DELETED"
      );
    });

    it("should reject deletion for non-draft project", async () => {
      // Arrange
      const activeProject = { ...mockProject, status: "active" as const };

      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "test-entrepreneur-id",
      });

      mockProjectRepositoryInstance.getProject.mockResolvedValue(activeProject);

      const event = createDeleteEvent();

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(422);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "Only draft projects can be deleted",
        code: "INVALID_PROJECT_STATUS",
      });

      expect(
        mockProjectRepositoryInstance.deleteProject
      ).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle unsupported HTTP methods", async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: "POST",
        path: "/projects/test-project-id",
        pathParameters: { projectId: "test-project-id" },
        headers: { Authorization: "Bearer valid-token" },
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: "test-request-id",
        } as any,
        resource: "/projects/{projectId}",
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        multiValueHeaders: {},
      };

      // Act
      const result = (await callHandler(event, mockContext)) as any;

      // Assert
      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body)).toMatchObject({
        message: "Method not allowed",
      });
    });
  });
});