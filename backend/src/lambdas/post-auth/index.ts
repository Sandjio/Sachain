import { DynamoDB, CloudWatch } from "aws-sdk";
import { PostAuthEvent, PostAuthResponse, UserReference } from "./types";
import { ExponentialBackoff } from "../../utils/retry";
import { ErrorClassifier, DynamoDBLogger } from "../../utils/error-handler";

const dynamodb = new DynamoDB.DocumentClient();
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
  unit: string = "Count",
  dimensions?: any[]
) => {
  try {
    const params = {
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
    };

    await cloudwatch.putMetricData(params).promise();
  } catch (error) {
    // Don't let metric failures affect the main function
    logger.error("Failed to send CloudWatch metric", {
      metricName,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
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
    // Extract user attributes from Cognito event
    const userAttributes = event.request.userAttributes;
    const userId = event.userName;
    const email = userAttributes.email;
    const emailVerified = userAttributes.email_verified === "true";
    const firstName = userAttributes.given_name;
    const lastName = userAttributes.family_name;

    // Determine user type from custom attributes or default to 'entrepreneur'
    const userType =
      (userAttributes["custom:user_type"] as "entrepreneur" | "investor") ||
      "entrepreneur";

    // Create user profile record using Single Table Design
    const userProfile: UserReference = {
      PK: `USER#${userId}`,
      SK: "PROFILE",
      userId,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kycStatus: "not_started",
      userType,
      emailVerified,
      lastLoginAt: new Date().toISOString(),
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
    };

    // Store user profile in DynamoDB with retry logic
    const result = await retry.execute(async () => {
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: process.env.TABLE_NAME!,
        Item: userProfile,
        ConditionExpression: "attribute_not_exists(PK)", // Prevent overwriting existing profiles
      };

      logger.info("Storing user profile in DynamoDB", {
        requestId,
        userId,
        email,
        userType,
      });

      return await dynamodb.put(params).promise();
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
      sendMetric("SuccessfulExecutions", 1, "Count"),
    ]);

    // Return the original event (required for Cognito triggers)
    return event;
  } catch (error) {
    logger.error("Error in post-authentication processing", {
      requestId,
      userId: event.userName,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
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
      sendMetric("FailedExecutions", 1, "Count"),
    ]);

    // Return the original event to allow authentication to proceed
    return event;
  }
};
