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
    this.adminPortalUrl = config.adminPortalUrl || process.env.ADMIN_PORTAL_URL || "";
  }

  async sendKYCReviewNotification(data: KYCNotificationData): Promise<void> {
    const reviewUrl = this.generateSecureReviewUrl(data.documentId, data.userId);
    const emailContent = this.formatEmailContent(data, reviewUrl);

    const message = {
      default: emailContent.plainText,
      email: emailContent.html,
    };

    await this.snsClient.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
        MessageStructure: "json",
        Subject: `KYC Document Review Required - ${data.documentType}`,
        MessageAttributes: {
          documentType: {
            DataType: "String",
            StringValue: data.documentType,
          },
          userId: {
            DataType: "String",
            StringValue: data.userId,
          },
          documentId: {
            DataType: "String",
            StringValue: data.documentId,
          },
          priority: {
            DataType: "String",
            StringValue: "normal",
          },
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
    
    // Generate secure URL with token (in production, this would include JWT or similar)
    const baseUrl = this.adminPortalUrl.replace(/\/$/, "");
    return `${baseUrl}/kyc/review/${documentId}?user=${userId}&t=${Date.now()}`;
  }

  private formatEmailContent(data: KYCNotificationData, reviewUrl: string): {
    plainText: string;
    html: string;
  } {
    const plainText = `
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

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>KYC Document Review Required</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>KYC Document Review Required</h1>
        </div>
        <div class="content">
            <p>A new KYC document has been uploaded and requires admin review.</p>
            
            <div class="details">
                <h3>Document Details:</h3>
                <ul>
                    <li><strong>Document ID:</strong> ${data.documentId}</li>
                    <li><strong>User ID:</strong> ${data.userId}</li>
                    <li><strong>Document Type:</strong> ${data.documentType}</li>
                    <li><strong>File Name:</strong> ${data.fileName}</li>
                    <li><strong>Uploaded At:</strong> ${new Date(data.uploadedAt).toLocaleString()}</li>
                </ul>
            </div>
            
            <a href="${reviewUrl}" class="button">Review Document</a>
            
            <p>Please review this document as soon as possible to maintain compliance standards.</p>
        </div>
        <div class="footer">
            <p>Sachain KYC System - Automated Notification</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    return { plainText, html };
  }
}