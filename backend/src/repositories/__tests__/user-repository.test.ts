import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { UserRepository } from "../user-repository";
import { CreateUserProfileInput, UserProfile } from "../../models";

// Mock the DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe("UserRepository", () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    ddbMock.reset();
    userRepository = new UserRepository({
      tableName: "test-table",
      region: "us-east-1",
    });
  });

  describe("createUserProfile", () => {
    it("should create a user profile successfully", async () => {
      // Arrange
      const input: CreateUserProfileInput = {
        userId: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        userType: "entrepreneur",
        emailVerified: true,
      };

      ddbMock.on(PutCommand).resolves({});

      // Act
      const result = await userRepository.createUserProfile(input);

      // Assert
      expect(result).toMatchObject({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        userType: "entrepreneur",
        kycStatus: "not_started",
        emailVerified: true,
        GSI1PK: "KYC_STATUS#not_started",
      });

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.GSI1SK).toBeDefined();

      // Verify DynamoDB was called with correct parameters
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
      const putCall = ddbMock.commandCalls(PutCommand)[0];
      expect(putCall.args[0].input.TableName).toBe("test-table");
      expect(putCall.args[0].input.Item).toMatchObject({
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "test@example.com",
      });
    });

    it("should create a user profile with minimal data", async () => {
      // Arrange
      const input: CreateUserProfileInput = {
        userId: "user-456",
        email: "minimal@example.com",
        userType: "investor",
        emailVerified: false,
      };

      ddbMock.on(PutCommand).resolves({});

      // Act
      const result = await userRepository.createUserProfile(input);

      // Assert
      expect(result).toMatchObject({
        PK: "USER#user-456",
        SK: "PROFILE",
        userId: "user-456",
        email: "minimal@example.com",
        userType: "investor",
        kycStatus: "not_started",
        emailVerified: false,
      });

      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
    });
  });

  describe("getUserProfile", () => {
    it("should return user profile when found", async () => {
      // Arrange
      const mockUserProfile: UserProfile = {
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        userType: "entrepreneur",
        kycStatus: "approved",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-02T00:00:00.000Z",
        emailVerified: true,
        GSI1PK: "KYC_STATUS#approved",
        GSI1SK: "2023-01-02T00:00:00.000Z",
      };

      ddbMock.on(GetCommand).resolves({ Item: mockUserProfile });

      // Act
      const result = await userRepository.getUserProfile("user-123");

      // Assert
      expect(result).toEqual(mockUserProfile);

      // Verify DynamoDB was called with correct parameters
      expect(ddbMock.commandCalls(GetCommand)).toHaveLength(1);
      const getCall = ddbMock.commandCalls(GetCommand)[0];
      expect(getCall.args[0].input.TableName).toBe("test-table");
      expect(getCall.args[0].input.Key).toEqual({
        PK: "USER#user-123",
        SK: "PROFILE",
      });
    });

    it("should return null when user not found", async () => {
      // Arrange
      ddbMock.on(GetCommand).resolves({});

      // Act
      const result = await userRepository.getUserProfile("nonexistent-user");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("updateUserProfile", () => {
    it("should update user profile with all fields", async () => {
      // Arrange
      const updateInput = {
        userId: "user-123",
        firstName: "Jane",
        lastName: "Smith",
        kycStatus: "approved" as const,
        lastLoginAt: "2023-01-03T00:00:00.000Z",
      };

      ddbMock.on(UpdateCommand).resolves({});

      // Act
      await userRepository.updateUserProfile(updateInput);

      // Assert
      expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
      const updateCall = ddbMock.commandCalls(UpdateCommand)[0];

      expect(updateCall.args[0].input.TableName).toBe("test-table");
      expect(updateCall.args[0].input.Key).toEqual({
        PK: "USER#user-123",
        SK: "PROFILE",
      });

      const updateExpression = updateCall.args[0].input.UpdateExpression;
      expect(updateExpression).toContain("#updatedAt = :updatedAt");
      expect(updateExpression).toContain("#firstName = :firstName");
      expect(updateExpression).toContain("#lastName = :lastName");
      expect(updateExpression).toContain("#kycStatus = :kycStatus");
      expect(updateExpression).toContain("#lastLoginAt = :lastLoginAt");
    });

    it("should update only specified fields", async () => {
      // Arrange
      const updateInput = {
        userId: "user-123",
        firstName: "Jane",
      };

      ddbMock.on(UpdateCommand).resolves({});

      // Act
      await userRepository.updateUserProfile(updateInput);

      // Assert
      expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
      const updateCall = ddbMock.commandCalls(UpdateCommand)[0];

      const updateExpression = updateCall.args[0].input.UpdateExpression;
      expect(updateExpression).toContain("#firstName = :firstName");
      expect(updateExpression).not.toContain("#lastName");
      expect(updateExpression).not.toContain("#kycStatus");
    });
  });

  describe("getUsersByKYCStatus", () => {
    it("should return users with specified KYC status", async () => {
      // Arrange
      const mockUsers: UserProfile[] = [
        {
          PK: "USER#user-1",
          SK: "PROFILE",
          userId: "user-1",
          email: "user1@example.com",
          userType: "entrepreneur",
          kycStatus: "pending",
          createdAt: "2023-01-01T00:00:00.000Z",
          updatedAt: "2023-01-01T00:00:00.000Z",
          emailVerified: true,
          GSI1PK: "KYC_STATUS#pending",
          GSI1SK: "2023-01-01T00:00:00.000Z",
        },
        {
          PK: "USER#user-2",
          SK: "PROFILE",
          userId: "user-2",
          email: "user2@example.com",
          userType: "investor",
          kycStatus: "pending",
          createdAt: "2023-01-02T00:00:00.000Z",
          updatedAt: "2023-01-02T00:00:00.000Z",
          emailVerified: true,
          GSI1PK: "KYC_STATUS#pending",
          GSI1SK: "2023-01-02T00:00:00.000Z",
        },
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockUsers,
        Count: 2,
      });

      // Act
      const result = await userRepository.getUsersByKYCStatus("pending");

      // Assert
      expect(result.items).toEqual(mockUsers);
      expect(result.count).toBe(2);

      // Verify DynamoDB was called with correct parameters
      expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(1);
      const queryCall = ddbMock.commandCalls(QueryCommand)[0];
      expect(queryCall.args[0].input.TableName).toBe("test-table");
      expect(queryCall.args[0].input.IndexName).toBe("GSI1");
      expect(queryCall.args[0].input.KeyConditionExpression).toBe(
        "#GSI1PK = :gsi1pk"
      );
      expect(queryCall.args[0].input.ExpressionAttributeValues).toEqual({
        ":gsi1pk": "KYC_STATUS#pending",
      });
    });

    it("should handle pagination options", async () => {
      // Arrange
      ddbMock.on(QueryCommand).resolves({
        Items: [],
        Count: 0,
      });

      const paginationOptions = {
        limit: 10,
        exclusiveStartKey: { PK: "USER#user-1", SK: "PROFILE" },
      };

      // Act
      await userRepository.getUsersByKYCStatus("approved", paginationOptions);

      // Assert
      const queryCall = ddbMock.commandCalls(QueryCommand)[0];
      expect(queryCall.args[0].input.Limit).toBe(10);
      expect(queryCall.args[0].input.ExclusiveStartKey).toEqual({
        PK: "USER#user-1",
        SK: "PROFILE",
      });
    });
  });

  describe("userExists", () => {
    it("should return true when user exists", async () => {
      // Arrange
      const mockUserProfile: UserProfile = {
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "test@example.com",
        userType: "entrepreneur",
        kycStatus: "not_started",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
        emailVerified: true,
        GSI1PK: "KYC_STATUS#not_started",
        GSI1SK: "2023-01-01T00:00:00.000Z",
      };

      ddbMock.on(GetCommand).resolves({ Item: mockUserProfile });

      // Act
      const result = await userRepository.userExists("user-123");

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when user does not exist", async () => {
      // Arrange
      ddbMock.on(GetCommand).resolves({});

      // Act
      const result = await userRepository.userExists("nonexistent-user");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getUserByEmail", () => {
    it("should return user when found by email", async () => {
      // Arrange
      const mockUserProfile: UserProfile = {
        PK: "USER#user-123",
        SK: "PROFILE",
        userId: "user-123",
        email: "test@example.com",
        userType: "entrepreneur",
        kycStatus: "not_started",
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
        emailVerified: true,
        GSI1PK: "KYC_STATUS#not_started",
        GSI1SK: "2023-01-01T00:00:00.000Z",
      };

      ddbMock.on(ScanCommand).resolves({
        Items: [mockUserProfile],
        Count: 1,
      });

      // Act
      const result = await userRepository.getUserByEmail("test@example.com");

      // Assert
      expect(result).toEqual(mockUserProfile);

      // Verify scan was called with correct filter
      const scanCall = ddbMock.commandCalls(ScanCommand)[0];
      expect(scanCall.args[0].input.FilterExpression).toBe(
        "#email = :email AND #SK = :sk"
      );
      expect(scanCall.args[0].input.ExpressionAttributeValues).toEqual({
        ":email": "test@example.com",
        ":sk": "PROFILE",
      });
    });

    it("should return null when user not found by email", async () => {
      // Arrange
      ddbMock.on(ScanCommand).resolves({
        Items: [],
        Count: 0,
      });

      // Act
      const result = await userRepository.getUserByEmail(
        "nonexistent@example.com"
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("updateLastLogin", () => {
    it("should update last login timestamp", async () => {
      // Arrange
      ddbMock.on(UpdateCommand).resolves({});

      // Act
      await userRepository.updateLastLogin("user-123");

      // Assert
      expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
      const updateCall = ddbMock.commandCalls(UpdateCommand)[0];

      expect(updateCall.args[0].input.Key).toEqual({
        PK: "USER#user-123",
        SK: "PROFILE",
      });

      const updateExpression = updateCall.args[0].input.UpdateExpression;
      expect(updateExpression).toContain("#lastLoginAt = :lastLoginAt");
      expect(updateExpression).toContain("#updatedAt = :updatedAt");
    });
  });
});
