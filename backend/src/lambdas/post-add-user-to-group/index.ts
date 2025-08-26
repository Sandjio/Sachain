import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Handler, PostConfirmationTriggerEvent } from "aws-lambda";
import { LambdaContext, PostConfirmEvent } from "./types";

/**
 * Production-grade Cognito PostConfirmation Lambda
 *
 * - Reads `custom:userType` from event.request.userAttributes
 * - Maps allowed userType values to Cognito Groups
 * - Ensures idempotency by checking existing groups for the user
 * - Retries transient failures with exponential backoff
 *
 * Environment:
 *  - (optional) DEFAULT_GROUP - fallback group if userType missing/invalid (defaults to "Investor")
 *
 * Notes:
 *  - Lambda must run with IAM permissions: cognito-idp:AdminListGroupsForUser and cognito-idp:AdminAddUserToGroup
 *  - This function assumes it's invoked as a Cognito PostConfirmation trigger
 */

const client = new CognitoIdentityProviderClient({});

/** Map userType values to Cognito Group names in your user pool */
const USER_TYPE_TO_GROUP: Record<string, string> = {
  entrepreneur: "Entrepreneur",
  investor: "Investor",
  admin: "Admin",
};

// Maximum retry attempts for transient errors
const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff retry wrapper for async calls
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = MAX_RETRIES,
  name = "operation"
): Promise<T> {
  let attempt = 0;
  let lastErr: unknown;

  while (attempt < attempts) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      attempt += 1;
      const backoff = 2 ** attempt * 100; // ms
      console.warn(
        `[retry] ${name} failed attempt ${attempt}/${attempts}. Retrying in ${backoff}ms`,
        {
          attempt,
          error: err,
        }
      );
      await sleep(backoff);
    }
  }

  // exhausted
  throw lastErr;
}

/**
 * Handler
 */
export const handler: Handler<PostConfirmEvent> = async (
  event: PostConfirmEvent,
  context: LambdaContext
) => {
  // Basic validation of Cognito trigger shape
  try {
    console.info("PostConfirmation trigger invoked", {
      region: process.env.REGION,
      functionName: context.functionName,
    });

    // Cognito provides the following shape: event.userName, event.userPoolId, event.request.userAttributes
    const { userPoolId, userName: username, request } = event;
    const userAttributes = request.userAttributes;

    if (!userPoolId || !username) {
      console.error("Missing userPoolId or userName in event", { event });
      return event;
    }

    // Read custom attribute (Cognito returns custom attributes with 'custom:' prefix)
    const rawUserType =
      userAttributes["custom:userType"] ?? userAttributes["userType"] ?? "";
    const userType = String(rawUserType).trim().toLowerCase();

    // Determine target group
    const defaultGroup = process.env.DEFAULT_GROUP ?? "Investor";
    const targetGroup =
      USER_TYPE_TO_GROUP[userType] ??
      USER_TYPE_TO_GROUP[defaultGroup?.toLowerCase()] ??
      defaultGroup;

    console.info("Resolved userType", { userType, targetGroup });

    // Check existing groups for idempotency
    const listGroupsFn = async () =>
      client.send(
        new AdminListGroupsForUserCommand({
          UserPoolId: userPoolId,
          Username: username,
        })
      );

    const listRes = await withRetry(
      listGroupsFn,
      MAX_RETRIES,
      "AdminListGroupsForUser"
    );

    const existingGroups = (listRes?.Groups ?? []).map((g) =>
      String(g.GroupName).toLowerCase()
    );
    if (existingGroups.includes(targetGroup.toLowerCase())) {
      console.info("User already in target group - no action", {
        username,
        userPoolId,
        targetGroup,
      });
      return event;
    }

    // Add user to group
    const addFn = async () =>
      client.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: userPoolId,
          Username: username,
          GroupName: targetGroup,
        })
      );

    await withRetry(addFn, MAX_RETRIES, "AdminAddUserToGroup");

    console.info("Successfully added user to group", {
      username,
      userPoolId,
      targetGroup,
      existingGroups,
    });
    return event;
  } catch (error) {
    // Important: For Cognito triggers, failing the function may block the user flow
    // Decide whether to throw (which fails the sign-up flow) or swallow and log.
    // Here we log and rethrow to make failure obvious; change to `return event` if you want tolerant behavior.
    console.error("Error in PostConfirmation handler", { error });
    throw error;
  }
};
