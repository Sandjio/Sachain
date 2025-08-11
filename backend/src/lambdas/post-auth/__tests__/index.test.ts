import { PostAuthEvent } from "../types";

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Mock AWS SDK
const mockPutPromise = jest.fn();
const mockPut = jest.fn(() => ({ promise: mockPutPromise }));
const mockPutMetricDataPromise = jest.fn();
const mockPutMetricData = jest.fn(() => ({
  promise: mockPutMetricDataPromise,
}));

jest.mock("aws-sdk", () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      put: mockPut,
    })),
  },
  CloudWatch: jest.fn(() => ({
    putMetricData: mockPutMetricData,
  })),
}));

// Mock utility functions to avoid complex retry logic in tests
jest.mock("../../../utils/retry", () => ({
  ExponentialBackoff: jest.fn(() => ({
    execute: jest.fn(async (fn) => {
      // Execute the function directly for testing
      const result = await fn();
      return { result, attempts: 1, totalDelay: 0 };
    }),
  })),
}));

jest.mock("../../../utils/error-handler", () => ({
  ErrorClassifier: {
    classify: jest.fn(),
  },
  DynamoDBLogger: {
    logError: jest.fn(),
  },
}));

const { DynamoDBLogger } = require("../../../utils/error-handler");

// Import handler after mocks are set up
import { handler } from "../index";

describe("Post-Authentication Lambda", () => {
  const mockTableName = "test-table";

  beforeEach(() => {
    process.env.TABLE_NAME = mockTableName;
    process.env.ENVIRONMENT = "test";
    jest.clearAllMocks();
    mockPutPromise.mockResolvedValue({});
    mockPutMetricDataPromise.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.TABLE_NAME;
  });

  const createMockEvent = (
    overrides: Partial<PostAuthEvent> = {}
  ): PostAuthEvent => ({
    version: "1",
    region: "us-east-1",
    userPoolId: "us-east-1_test123",
    userName: "test-user-123",
    callerContext: {
      awsSdkVersion: "2.0.0",
      clientId: "test-client-id",
    },
    triggerSource: "PostAuthentication_Authentication",
    request: {
      userAttributes: {
        email: "test@example.com",
        email_verified: "true",
        given_name: "John",
        family_name: "Doe",
        "custom:user_type": "entrepreneur",
      },
    },
    response: {},
    ...overrides,
  });

  describe("Successful user profile creation", () => {
    it("should create user profile with all attributes", async () => {
      const event = createMockEvent();

      const result = await handler(event);

      expect(mockPut).toHaveBeenCalledWith({
        TableName: mockTableName,
        Item: {
          PK: "USER#test-user-123",
          SK: "PROFILE",
          userId: "test-user-123",
          email: "test@example.com",
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          kycStatus: "not_started",
          userType: "entrepreneur",
          emailVerified: true,
          lastLoginAt: expect.any(String),
          firstName: "John",
          lastName: "Doe",
        },
        ConditionExpression: "attribute_not_exists(PK)",
      });

      expect(result).toEqual(event);
    });

    it("should create user profile with minimal attributes", async () => {
      const event = createMockEvent({
        request: {
          userAttributes: {
            email: "minimal@example.com",
            email_verified: "false",
          },
        },
      });

      const result = await handler(event);

      expect(mockPut).toHaveBeenCalledWith({
        TableName: mockTableName,
        Item: {
          PK: "USER#test-user-123",
          SK: "PROFILE",
          userId: "test-user-123",
          email: "minimal@example.com",
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          kycStatus: "not_started",
          userType: "entrepreneur", // default value
          emailVerified: false,
          lastLoginAt: expect.any(String),
        },
        ConditionExpression: "attribute_not_exists(PK)",
      });

      expect(result).toEqual(event);
    });

    it("should handle investor user type", async () => {
      const event = createMockEvent({
        request: {
          userAttributes: {
            email: "investor@example.com",
            email_verified: "true",
            "custom:user_type": "investor",
          },
        },
      });

      await handler(event);

      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            userType: "investor",
          }),
        })
      );
    });

    it("should send CloudWatch metrics on successful execution", async () => {
      const event = createMockEvent();

      await handler(event);

      // Should send 3 metrics: UserProfileCreated, ExecutionDuration, SuccessfulExecutions
      expect(mockPutMetricData).toHaveBeenCalledTimes(3);

      // Verify UserProfileCreated metric
      expect(mockPutMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          Namespace: "Sachain/PostAuth",
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: "UserProfileCreated",
              Value: 1,
              Unit: "Count",
              Dimensions: expect.arrayContaining([
                { Name: "UserType", Value: "entrepreneur" },
                { Name: "Environment", Value: "test" },
              ]),
            }),
          ]),
        })
      );

      // Verify SuccessfulExecutions metric
      expect(mockPutMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          Namespace: "Sachain/PostAuth",
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: "SuccessfulExecutions",
              Value: 1,
              Unit: "Count",
            }),
          ]),
        })
      );

      // Verify ExecutionDuration metric
      expect(mockPutMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          Namespace: "Sachain/PostAuth",
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: "ExecutionDuration",
              Value: expect.any(Number),
              Unit: "Milliseconds",
            }),
          ]),
        })
      );
    });
  });

  describe("Error handling", () => {
    it("should handle DynamoDB errors gracefully", async () => {
      const event = createMockEvent();
      const error = new Error("DynamoDB error");
      mockPutPromise.mockRejectedValue(error);

      const result = await handler(event);

      expect(DynamoDBLogger.logError).toHaveBeenCalledWith(
        "PostAuth-CreateUserProfile",
        error,
        mockTableName,
        { userId: "test-user-123" },
        expect.objectContaining({
          requestId: expect.any(String),
          context: "PostAuthLambda",
        })
      );

      // Should return original event to not block authentication
      expect(result).toEqual(event);

      // Should send error metrics
      expect(mockPutMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          Namespace: "Sachain/PostAuth",
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: "ExecutionErrors",
              Value: 1,
              Unit: "Count",
              Dimensions: expect.arrayContaining([
                { Name: "ErrorType", Value: "Error" },
                { Name: "Environment", Value: "test" },
              ]),
            }),
          ]),
        })
      );

      expect(mockPutMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          Namespace: "Sachain/PostAuth",
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: "FailedExecutions",
              Value: 1,
              Unit: "Count",
            }),
          ]),
        })
      );
    });

    it("should handle missing environment variables", async () => {
      delete process.env.TABLE_NAME;
      const event = createMockEvent();

      const result = await handler(event);

      // Should return original event even with errors
      expect(result).toEqual(event);
    });
  });
});
