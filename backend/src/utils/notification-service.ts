import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

export interface KYCNotificationData {
  documentId: string;
  userId: string;
  documentType: string;
  fileName: string;
  uploadedAt: string;
  reviewUrl?: string;
}

export interface NotificationServiceConfig {
  snsClient: SNSClient;
  topicArn: string;
  adminPortalUrl?: string;
}

export class NotificationService {
  private snsClient: SNSClient;
  private topicArn: string;
  private adminPortalUrl: string;

  constructor(config: NotificationServiceConfig) {
    this.snsClient = config.snsClient;
    this.topicArn = config.topicArn;
    this.adminPortalUrl =
      config.adminPortalUrl || process.env.ADMIN_PORTAL_URL || "";
  }

  async sendKYCReviewNotification(data: KYCNotificationData): Promise<void> {
    const reviewUrl = this.generateSecureReviewUrl(
      data.documentId,
      data.userId
    );
    const plainText = this.formatPlainTextEmail(data, reviewUrl);

    await this.snsClient.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: plainText,
        Subject: `KYC Document Review Required - ${data.documentType}`,
        MessageAttributes: {
          documentType: { DataType: "String", StringValue: data.documentType },
          userId: { DataType: "String", StringValue: data.userId },
          documentId: { DataType: "String", StringValue: data.documentId },
          priority: { DataType: "String", StringValue: "normal" },
          notificationType: {
            DataType: "String",
            StringValue: "kyc-review-required",
          },
        },
      })
    );
  }

  private generateSecureReviewUrl(documentId: string, userId: string): string {
    if (!this.adminPortalUrl) {
      return `#review-${documentId}`;
    }
    const baseUrl = this.adminPortalUrl.replace(/\/$/, "");
    return `${baseUrl}/kyc/review/${documentId}?user=${userId}&t=${Date.now()}`;
  }

  private formatPlainTextEmail(
    data: KYCNotificationData,
    reviewUrl: string
  ): string {
    return `
KYC Document Review Required

A new KYC document has been uploaded and requires admin review.

Document Details:
- Document ID: ${data.documentId}
- User ID: ${data.userId}
- Document Type: ${data.documentType}
- File Name: ${data.fileName}
- Uploaded At: ${new Date(data.uploadedAt).toLocaleString()}

Review URL: ${reviewUrl}

Please review this document as soon as possible to maintain compliance standards.

---
Sachain KYC System
    `.trim();
  }
}
