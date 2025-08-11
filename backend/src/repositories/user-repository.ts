import { BaseRepository, DynamoDBConfig } from "./base-repository";
import {
  UserProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
  QueryResult,
  PaginationOptions,
} from "../models";

export class UserRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }

  /**
   * Create a new user profile
   */
  async createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    const timestamp = this.generateTimestamp();

    const userProfile: UserProfile = {
      PK: `USER#${input.userId}`,
      SK: "PROFILE",
      userId: input.userId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      userType: input.userType,
      kycStatus: "not_started",
      createdAt: timestamp,
      updatedAt: timestamp,
      emailVerified: input.emailVerified,

      // GSI1 attributes for KYC status queries
      GSI1PK: "KYC_STATUS#not_started",
      GSI1SK: timestamp,
    };

    await this.putItem(userProfile);
    return userProfile;
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return await this.getItem<UserProfile>(`USER#${userId}`, "PROFILE");
  }

  /**
   * Update user profile
   */
  async updateUserProfile(input: UpdateUserProfileInput): Promise<void> {
    const timestamp = this.generateTimestamp();
    const pk = `USER#${input.userId}`;
    const sk = "PROFILE";

    // Build update expression dynamically
    const updateExpressions: string[] = ["#updatedAt = :updatedAt"];
    const expressionAttributeNames: Record<string, string> = {
      "#updatedAt": "updatedAt",
    };
    const expressionAttributeValues: Record<string, any> = {
      ":updatedAt": timestamp,
    };

    if (input.firstName !== undefined) {
      updateExpressions.push("#firstName = :firstName");
      expressionAttributeNames["#firstName"] = "firstName";
      expressionAttributeValues[":firstName"] = input.firstName;
    }

    if (input.lastName !== undefined) {
      updateExpressions.push("#lastName = :lastName");
      expressionAttributeNames["#lastName"] = "lastName";
      expressionAttributeValues[":lastName"] = input.lastName;
    }

    if (input.kycStatus !== undefined) {
      updateExpressions.push("#kycStatus = :kycStatus");
      updateExpressions.push("#GSI1PK = :GSI1PK");
      updateExpressions.push("#GSI1SK = :GSI1SK");

      expressionAttributeNames["#kycStatus"] = "kycStatus";
      expressionAttributeNames["#GSI1PK"] = "GSI1PK";
      expressionAttributeNames["#GSI1SK"] = "GSI1SK";

      expressionAttributeValues[":kycStatus"] = input.kycStatus;
      expressionAttributeValues[":GSI1PK"] = `KYC_STATUS#${input.kycStatus}`;
      expressionAttributeValues[":GSI1SK"] = timestamp;
    }

    if (input.lastLoginAt !== undefined) {
      updateExpressions.push("#lastLoginAt = :lastLoginAt");
      expressionAttributeNames["#lastLoginAt"] = "lastLoginAt";
      expressionAttributeValues[":lastLoginAt"] = input.lastLoginAt;
    }

    const updateExpression = `SET ${updateExpressions.join(", ")}`;

    await this.updateItem(
      pk,
      sk,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );
  }

  /**
   * Delete user profile
   */
  async deleteUserProfile(userId: string): Promise<void> {
    await this.deleteItem(`USER#${userId}`, "PROFILE");
  }

  /**
   * Get users by KYC status
   */
  async getUsersByKYCStatus(
    kycStatus: "not_started" | "pending" | "approved" | "rejected",
    options?: PaginationOptions
  ): Promise<QueryResult<UserProfile>> {
    return await this.queryItems<UserProfile>(
      "#GSI1PK = :gsi1pk",
      {
        "#GSI1PK": "GSI1PK",
      },
      {
        ":gsi1pk": `KYC_STATUS#${kycStatus}`,
      },
      "GSI1", // Index name
      options
    );
  }

  /**
   * Get all users (use with caution - for admin purposes only)
   */
  async getAllUsers(
    options?: PaginationOptions
  ): Promise<QueryResult<UserProfile>> {
    return await this.scanItems<UserProfile>(
      "#SK = :sk",
      {
        "#SK": "SK",
      },
      {
        ":sk": "PROFILE",
      },
      options
    );
  }

  /**
   * Check if user exists
   */
  async userExists(userId: string): Promise<boolean> {
    const user = await this.getUserProfile(userId);
    return user !== null;
  }

  /**
   * Get user by email (requires scan - use sparingly)
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const result = await this.scanItems<UserProfile>(
      "#email = :email AND #SK = :sk",
      {
        "#email": "email",
        "#SK": "SK",
      },
      {
        ":email": email,
        ":sk": "PROFILE",
      },
      { limit: 1 }
    );

    return result.items.length > 0 ? result.items[0] : null;
  }

  /**
   * Batch get user profiles
   */
  async batchGetUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    const keys = userIds.map((userId) => ({
      PK: `USER#${userId}`,
      SK: "PROFILE",
    }));

    return await this.batchGetItems<UserProfile>(keys);
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.updateUserProfile({
      userId,
      lastLoginAt: this.generateTimestamp(),
    });
  }
}
