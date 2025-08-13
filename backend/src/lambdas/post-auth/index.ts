import {
  DynamoDBClient,
  ConditionalCheckFailedException,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { CloudWatch, StandardUnit } from "@aws-sdk/client-cloudwatch";
import { PostAuthEvent, PostAuthResponse, UserReference } from "./types";
import { ExponentialBackoff } from "../../utils/retry";
import { DynamoDBLogger } from "../../utils/error-handler";

const dynamodbClient = new DynamoDBClient({});
const dynamoDoc = DynamoDBDocumentClient.from(dynamodbClient);
const cloudwatch = new CloudWatch();
const retry = new ExponentialBackoff({
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 5000,
});

// Simple logger interface
const logger = {
  info: (message: string, context?: any) => {
    console.log(
      JSON.stringify({
        level: "INFO",
        message,
        timestamp: new Date().toISOString(),
        ...context,
      })
    );
  },
  error: (message: string, context?: any) => {
    console.error(
      JSON.stringify({
        level: "ERROR",
        message,
        timestamp: new Date().toISOString(),
        ...context,
      })
    );
  },
};

/**
 * Send custom metrics to CloudWatch
 */
const sendMetric = async (
  metricName: string,
  value: number,
  unit: StandardUnit = StandardUnit.Count,
  dimensions?: any[]
) => {
  try {
    await cloudwatch.putMetricData({
      Namespace: "Sachain/PostAuth",
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          ...(dimensions && { Dimensions: dimensions }),
        },
      ],
    });
  } catch (error) {
    // Don't let metric failures affect the main function
    logger.error("Failed to send CloudWatch metric", {
      metricName,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Validate required attributes
const validateUserAttributes = (
  attrs: Record<string, string>,
  requestId: string
) => {
  const userId = attrs.sub;
  const email = attrs.email;
  if (!userId || !email) {
    logger.error("Missing required attributes", {
      requestId,
      userId: !!userId,
      email: !!email,
    });
    return null;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger.error("Invalid email format", { requestId, email });
    return null;
  }
  return { userId, email };
};

// Check if user profile already exists in DynamoDB
const getUserProfile = async (userId: string) => {
  const res = await dynamoDoc.send(
    new GetCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { PK: `USER#${userId}`, SK: "PROFILE" },
    })
  );
  return res.Item as UserReference | undefined;
};

// Create user profile in DynamoDB
const createUserProfile = async (profile: UserReference) => {
  await dynamoDoc.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME!,
      Item: profile,
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );
};

/**
 * Post-Authentication Lambda handler for Cognito User Pool
 * Creates user profile record in DynamoDB after successful authentication
 */
export const handler = async (
  event: PostAuthEvent
): Promise<PostAuthResponse> => {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  logger.info("Post-authentication trigger started", {
    requestId,
    userId: event.userName,
    triggerSource: event.triggerSource,
    userPoolId: event.userPoolId,
  });

  try {
    const validated = validateUserAttributes(
      event.request.userAttributes,
      requestId
    );
    if (!validated) return event;

    // Extract user attributes from Cognito event
    const userAttributes = event.request.userAttributes;
    const { userId, email } = validated;

    const existingProfile = await getUserProfile(userId);
    if (existingProfile) {
      logger.info("User profile already exists, skipping creation", {
        requestId,
        userId,
        email,
      });
      return event; // No need to create a new profile
    }

    const now = new Date().toISOString();
    const emailVerified = userAttributes.email_verified === "true";
    const firstName = userAttributes.given_name;
    const lastName = userAttributes.family_name;

    // Determine user type from custom attributes or default to 'entrepreneur'
    const userType =
      (event.request.userAttributes["custom:user_type"] as
        | "entrepreneur"
        | "investor") || "entrepreneur";

    // Create user profile record using Single Table Design
    const userProfile: UserReference = {
      PK: `USER#${userId}`,
      SK: "PROFILE",
      userId,
      email,
      createdAt: now,
      updatedAt: now,
      kycStatus: "not_started",
      userType,
      emailVerified,
      lastLoginAt: now,
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
    };

    // Store user profile in DynamoDB with retry logic
    const result = await retry.execute(async () => {
      try {
        await createUserProfile(userProfile);
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) {
          logger.info("Profile already exists (race condition)", {
            userId,
            requestId,
          });
          return;
        }
        throw error;
      }
    }, "PostAuth-CreateUserProfile");

    logger.info("User profile created successfully", {
      requestId,
      userId,
      email,
      kycStatus: userProfile.kycStatus,
    });

    // Send success metrics to CloudWatch
    const executionTime = Date.now() - startTime;
    await Promise.all([
      sendMetric("UserProfileCreated", 1, "Count", [
        { Name: "UserType", Value: userType },
        { Name: "Environment", Value: process.env.ENVIRONMENT || "unknown" },
      ]),
      sendMetric("ExecutionDuration", executionTime, "Milliseconds"),
      sendMetric("SuccessfulExecutions", 1),
    ]);

    // Return the original event (required for Cognito triggers)
    return event;
  } catch (error) {
    logger.error("Error in post-authentication processing", {
      requestId,
      userId: event.userName,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Handle the error but don't throw - we don't want to block user authentication
    // Log the error for monitoring and alerting using DynamoDBLogger
    DynamoDBLogger.logError(
      "PostAuth-CreateUserProfile",
      error,
      process.env.TABLE_NAME,
      { userId: event.userName },
      { requestId, context: "PostAuthLambda" }
    );

    // Send error metrics to CloudWatch
    const executionTime = Date.now() - startTime;
    await Promise.all([
      sendMetric("ExecutionErrors", 1, "Count", [
        {
          Name: "ErrorType",
          Value: error instanceof Error ? error.name : "UnknownError",
        },
        { Name: "Environment", Value: process.env.ENVIRONMENT || "unknown" },
      ]),
      sendMetric("ExecutionDuration", executionTime, "Milliseconds"),
      sendMetric("FailedExecutions", 1),
    ]);

    // Return the original event to allow authentication to proceed
    return event;
  }
};
