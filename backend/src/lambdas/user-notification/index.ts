import { EventBridgeEvent, Context } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME!;
const ENVIRONMENT = process.env.ENVIRONMENT!;
const FRONTEND_URL = process.env.FRONTEND_URL!;

// Event interfaces
interface KYCStatusChangeEvent {
  eventType: string;
  userId: string;
  documentId: string;
  newStatus: "approved" | "rejected";
  oldStatus?: string;
  reviewedBy: string;
  reviewComments?: string;
  timestamp: string;
}

interface UserProfile {
  PK: string;
  SK: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: "entrepreneur" | "investor";
  kycStatus: string;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

/**
 * Lambda handler for processing KYC status change events and sending user notifications
 */
export const handler = async (
  event: EventBridgeEvent<"KYC Status Changed", KYCStatusChangeEvent>,
  context: Context
): Promise<void> => {
  console.log(
    "Processing KYC status change event:",
    JSON.stringify(event, null, 2)
  );

  try {
    const { detail } = event;
    const { userId, newStatus, reviewComments, reviewedBy, documentId } =
      detail;

    // Get user profile from DynamoDB
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      console.error(`User profile not found for userId: ${userId}`);
      return;
    }

    // Check notification preferences (default to email enabled)
    const emailEnabled = userProfile.notificationPreferences?.email !== false;
    if (!emailEnabled) {
      console.log(`Email notifications disabled for user: ${userId}`);
      return;
    }

    // Send notification based on status
    if (newStatus === "approved") {
      await sendApprovalNotification(userProfile, documentId);
    } else if (newStatus === "rejected") {
      await sendRejectionNotification(userProfile, documentId, reviewComments);
    }

    // Log successful notification
    console.log(
      `Notification sent successfully to user: ${userId}, status: ${newStatus}`
    );

    // Put custom CloudWatch metric
    await putMetric("NotificationSent", 1, {
      Status: newStatus,
      UserType: userProfile.userType,
    });
  } catch (error) {
    console.error("Error processing KYC status change event:", error);

    // Put error metric
    await putMetric("NotificationError", 1, {
      ErrorType: error instanceof Error ? error.name : "UnknownError",
    });

    throw error; // Re-throw to trigger DLQ
  }
};

/**
 * Get user profile from DynamoDB
 */
async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: "PROFILE",
        },
      })
    );

    return (response.Item as UserProfile) || null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

/**
 * Send KYC approval notification
 */
async function sendApprovalNotification(
  user: UserProfile,
  documentId: string
): Promise<void> {
  const subject = "KYC Verification Approved - Welcome to Sachain!";
  const message = generateApprovalEmailContent(user, documentId);

  await sendEmailNotification(user.email, subject, message);
}

/**
 * Send KYC rejection notification
 */
async function sendRejectionNotification(
  user: UserProfile,
  documentId: string,
  reviewComments?: string
): Promise<void> {
  const subject = "KYC Verification Update Required";
  const message = generateRejectionEmailContent(
    user,
    documentId,
    reviewComments
  );

  await sendEmailNotification(user.email, subject, message);
}

/**
 * Send email notification via SNS
 */
async function sendEmailNotification(
  email: string,
  subject: string,
  message: string
): Promise<void> {
  // For now, we'll use SNS to send a simple notification
  // In production, you might want to use SES for more sophisticated email templates
  const snsMessage = {
    email,
    subject,
    message,
    timestamp: new Date().toISOString(),
  };

  try {
    await snsClient.send(
      new PublishCommand({
        TopicArn: `arn:aws:sns:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:sachain-kyc-user-notifications-${ENVIRONMENT}`,
        Message: JSON.stringify(snsMessage),
        Subject: subject,
        MessageAttributes: {
          email: {
            DataType: "String",
            StringValue: email,
          },
          notificationType: {
            DataType: "String",
            StringValue: "kyc_status_change",
          },
        },
      })
    );
  } catch (error) {
    console.error("Error sending SNS notification:", error);
    throw error;
  }
}

/**
 * Generate approval email content
 */
function generateApprovalEmailContent(
  user: UserProfile,
  documentId: string
): string {
  const userName = user.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "User";

  return `
Dear ${userName},

Congratulations! Your KYC verification has been approved.

Your identity document has been successfully verified, and you now have full access to all Sachain platform features.

What you can do now:
${
  user.userType === "entrepreneur"
    ? "• Create and manage fundraising campaigns\n• Tokenize your project shares\n• Access investor analytics"
    : "• Browse and invest in tokenized projects\n• Manage your investment portfolio\n• Participate in governance voting"
}

Get started: ${FRONTEND_URL}/dashboard

Document ID: ${documentId}
Verification Date: ${new Date().toLocaleDateString()}

If you have any questions, please contact our support team.

Best regards,
The Sachain Team

---
This is an automated message. Please do not reply to this email.
  `.trim();
}

/**
 * Generate rejection email content
 */
function generateRejectionEmailContent(
  user: UserProfile,
  documentId: string,
  reviewComments?: string
): string {
  const userName = user.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "User";

  return `
Dear ${userName},

We need additional information to complete your KYC verification.

Your submitted identity document requires some updates before we can approve your verification.

${reviewComments ? `\nReview Comments:\n${reviewComments}\n` : ""}

Next Steps:
1. Review the feedback provided above
2. Prepare a new, clear photo of your identity document
3. Upload the updated document through your dashboard

Upload new document: ${FRONTEND_URL}/kyc/upload

Document ID: ${documentId}
Review Date: ${new Date().toLocaleDateString()}

Common requirements:
• Document must be clearly visible and readable
• All four corners of the document should be visible
• No glare or shadows on the document
• Document must be current and not expired

If you have any questions about the requirements, please contact our support team.

Best regards,
The Sachain Team

---
This is an automated message. Please do not reply to this email.
  `.trim();
}

/**
 * Put custom CloudWatch metric
 */
async function putMetric(
  metricName: string,
  value: number,
  dimensions: Record<string, string> = {}
): Promise<void> {
  try {
    // Note: In a real implementation, you would use CloudWatch SDK
    // For now, we'll just log the metric
    console.log(`CloudWatch Metric: ${metricName} = ${value}`, dimensions);
  } catch (error) {
    console.error("Error putting CloudWatch metric:", error);
    // Don't throw here as metrics are not critical
  }
}
