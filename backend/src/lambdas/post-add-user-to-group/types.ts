import type { PostConfirmationTriggerEvent, Context } from "aws-lambda";
/**
 * TypeScript interfaces for Cognito Post-Confirmation Lambda trigger
 */

export interface UserAttributes {
  email?: string;
  sub?: string;
  given_name?: string;
  family_name?: string;
  "custom:userType"?: string;
  userType?: string;
  [key: string]: string | undefined;
}

/**
 * Event type for our PostConfirmation Lambda
 */
export type PostConfirmEvent = PostConfirmationTriggerEvent & {
  userName: string;
  userPoolId: string;
  request: {
    userAttributes: UserAttributes;
  };
};

/**
 * Context type for logging convenience
 */
export type LambdaContext = Context;
