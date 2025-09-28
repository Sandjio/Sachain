import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { StructuredLogger } from "./structured-logger";

export interface KYCNotificationData {
  documentId: string;
  userId: string;
  documentType: string;
  fileName: string;
  uploadedAt: string;
  reviewUrl?: string;
}

export interface NotificationServiceConfig {
  snsClient?: SNSClient;
  sesClient?: SESv2Client;
  topicArn?: string;
  adminPortalUrl?: string;
  fromEmail?: string;
  replyToEmail?: string;
  region?: string;
}

export interface EmailNotificationData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface SMSNotificationData {
  to: string;
  message: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class NotificationService {
  private snsClient: SNSClient;
  private sesClient?: SESv2Client;
  private topicArn: string;
  private adminPortalUrl: string;
  private fromEmail: string;
  private replyToEmail?: string;
  private logger: StructuredLogger;
  private retryConfig: RetryConfig;

  constructor(config: NotificationServiceConfig) {
    this.snsClient = config.snsClient!;
    this.sesClient = config.sesClient;
    this.topicArn = config.topicArn!;
    this.adminPortalUrl =
      config.adminPortalUrl || process.env.ADMIN_PORTAL_URL || "";
    this.fromEmail =
      config.fromEmail || process.env.FROM_EMAIL || "noreply@emmasandjio.com";
    this.replyToEmail = config.replyToEmail || process.env.REPLY_TO_EMAIL;
    this.logger = StructuredLogger.getInstance("NotificationService");

    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    };

    // Initialize SES client if not provided
    if (!this.sesClient && config.region) {
      this.sesClient = new SESv2Client({ region: config.region });
    }
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

  /**
   * Send email notification with retry logic
   */
  async sendEmail(data: EmailNotificationData): Promise<NotificationResult> {
    return this.executeWithRetry(async () => {
      if (!this.sesClient) {
        throw new Error("SES client not configured");
      }

      const htmlBody = this.renderEmailTemplate(data.template, data.data);
      const textBody = this.renderTextTemplate(data.template, data.data);

      const command = new SendEmailCommand({
        FromEmailAddress: this.fromEmail,
        Destination: {
          ToAddresses: [data.to],
        },
        ReplyToAddresses: this.replyToEmail ? [this.replyToEmail] : undefined,
        Content: {
          Simple: {
            Subject: {
              Data: data.subject,
              Charset: "UTF-8",
            },
            Body: {
              Html: {
                Data: htmlBody,
                Charset: "UTF-8",
              },
              Text: {
                Data: textBody,
                Charset: "UTF-8",
              },
            },
          },
        },
      });

      const result = await this.sesClient.send(command);

      this.logger.info("Email sent successfully", {
        operation: "SendEmail",
        messageId: result.MessageId,
        to: data.to,
        template: data.template,
      });

      return {
        success: true,
        messageId: result.MessageId,
      };
    });
  }

  /**
   * Send SMS notification with retry logic
   */
  async sendSMS(data: SMSNotificationData): Promise<NotificationResult> {
    return this.executeWithRetry(async () => {
      const command = new PublishCommand({
        PhoneNumber: data.to,
        Message: data.message,
        MessageAttributes: {
          "AWS.SNS.SMS.SenderID": {
            DataType: "String",
            StringValue: "Sachain",
          },
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional",
          },
        },
      });

      const result = await this.snsClient.send(command);

      this.logger.info("SMS sent successfully", {
        operation: "SendSMS",
        messageId: result.MessageId,
        to: data.to,
      });

      return {
        success: true,
        messageId: result.MessageId,
      };
    });
  }

  /**
   * Health check for notification service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test SES connection if available
      if (this.sesClient) {
        // This is a lightweight operation to test SES connectivity
        // We'll just return true if the client exists since SESv2 doesn't have a simple health check
        // In a real implementation, you might want to call GetAccount or similar
        return this.sesClient !== undefined;
      }

      return true;
    } catch (error) {
      this.logger.error("Health check failed", {}, error as Error);
      return false;
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        this.logger.warn("Notification attempt failed", {
          operation: "ExecuteWithRetry",
          attempt,
          maxAttempts: this.retryConfig.maxAttempts,
          error: lastError.message,
        });

        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay *
            Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    this.logger.error(
      "All notification attempts failed",
      {
        operation: "ExecuteWithRetry",
        maxAttempts: this.retryConfig.maxAttempts,
      },
      lastError
    );

    return {
      success: false,
      error: {
        code: "NOTIFICATION_FAILED",
        message: lastError.message,
      },
    } as T;
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

  /**
   * Render email template with data
   */
  private renderEmailTemplate(
    template: string,
    data: Record<string, any>
  ): string {
    const templates = this.getEmailTemplates();
    const templateContent = templates[template];

    if (!templateContent) {
      this.logger.warn("Email template not found", {
        operation: "RenderEmailTemplate",
        template,
      });
      return this.getDefaultEmailTemplate(data);
    }

    return this.interpolateTemplate(templateContent.html, data);
  }

  /**
   * Render text template with data
   */
  private renderTextTemplate(
    template: string,
    data: Record<string, any>
  ): string {
    const templates = this.getEmailTemplates();
    const templateContent = templates[template];

    if (!templateContent) {
      return this.getDefaultTextTemplate(data);
    }

    return this.interpolateTemplate(templateContent.text, data);
  }

  /**
   * Get email templates for recharge notifications
   */
  private getEmailTemplates(): Record<string, { html: string; text: string }> {
    return {
      "share-purchase-request": {
        html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #007bff;">New Share Purchase Request</h2>
      <p>You have received a new share purchase request for your project.</p>
      
      <div style="background-color: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Request Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Project:</strong> {{projectName}}</li>
          <li><strong>Investor:</strong> {{investorId}}</li>
          <li><strong>Shares Requested:</strong> {{sharesRequested}}</li>
          <li><strong>Total Amount:</strong> {{totalAmount}} HBAR</li>
          <li><strong>Transaction ID:</strong> {{transactionId}}</li>
          <li><strong>Schedule ID:</strong> {{scheduleID}}</li>
          <li><strong>Expires At:</strong> {{expiresAt}}</li>
        </ul>
      </div>
      
      <p><strong>Action Required:</strong> You have 30 minutes to approve or reject this request.</p>
      <p><a href="{{approvalUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Request</a></p>
    </div>
  `,
        text: `
New Share Purchase Request

You have received a new share purchase request for your project.

Request Details:
- Project: {{projectName}}
- Investor: {{investorId}}
- Shares Requested: {{sharesRequested}}
- Total Amount: {{totalAmount}} HBAR
- Transaction ID: {{transactionId}}
- Schedule ID: {{scheduleID}}
- Expires At: {{expiresAt}}

Action Required: You have 30 minutes to approve or reject this request.

Review at: {{approvalUrl}}

---
Sachain Team
  `.trim(),
      },
      "recharge-success": {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">HBAR Recharge Successful!</h2>
            <p>Your HBAR recharge has been completed successfully.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Transaction Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Transaction ID:</strong> {{transactionId}}</li>
                <li><strong>XAF Amount:</strong> {{xafAmount}} XAF</li>
                <li><strong>HBAR Received:</strong> {{hbarAmount}} HBAR</li>
                <li><strong>Exchange Rate:</strong> {{exchangeRate}} XAF/HBAR</li>
                <li><strong>Hedera Account:</strong> {{userHederaAccountId}}</li>
                <li><strong>Hedera Transaction:</strong> {{hederaTransactionId}}</li>
                <li><strong>Completed At:</strong> {{timestamp}}</li>
              </ul>
            </div>
            
            <p>Your HBAR tokens have been transferred to your Hedera account and are ready to use.</p>
            
            <p style="color: #6c757d; font-size: 12px;">
              If you have any questions, please contact our support team.
            </p>
          </div>
        `,
        text: `
HBAR Recharge Successful!

Your HBAR recharge has been completed successfully.

Transaction Details:
- Transaction ID: {{transactionId}}
- XAF Amount: {{xafAmount}} XAF
- HBAR Received: {{hbarAmount}} HBAR
- Exchange Rate: {{exchangeRate}} XAF/HBAR
- Hedera Account: {{userHederaAccountId}}
- Hedera Transaction: {{hederaTransactionId}}
- Completed At: {{timestamp}}

Your HBAR tokens have been transferred to your Hedera account and are ready to use.

If you have any questions, please contact our support team.

---
Sachain Team
        `.trim(),
      },
      "recharge-failed": {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">HBAR Recharge Failed</h2>
            <p>We're sorry, but your HBAR recharge could not be completed.</p>
            
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3>Transaction Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Transaction ID:</strong> {{transactionId}}</li>
                <li><strong>XAF Amount:</strong> {{xafAmount}} XAF</li>
                <li><strong>Error:</strong> {{errorMessage}}</li>
                <li><strong>Failed At:</strong> {{timestamp}}</li>
              </ul>
            </div>
            
            <p><strong>What happens next?</strong></p>
            {{#if retryable}}
            <p>We're automatically retrying your transaction. You'll receive another notification once it's processed.</p>
            {{else}}
            <p>Please contact our support team for assistance. Your Orange Money payment will be refunded if applicable.</p>
            {{/if}}
            
            <p style="color: #6c757d; font-size: 12px;">
              Transaction ID: {{transactionId}} - Please reference this when contacting support.
            </p>
          </div>
        `,
        text: `
HBAR Recharge Failed

We're sorry, but your HBAR recharge could not be completed.

Transaction Details:
- Transaction ID: {{transactionId}}
- XAF Amount: {{xafAmount}} XAF
- Error: {{errorMessage}}
- Failed At: {{timestamp}}

What happens next?
{{#if retryable}}
We're automatically retrying your transaction. You'll receive another notification once it's processed.
{{else}}
Please contact our support team for assistance. Your Orange Money payment will be refunded if applicable.
{{/if}}

Transaction ID: {{transactionId}} - Please reference this when contacting support.

---
Sachain Team
        `.trim(),
      },
      "recharge-retry": {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ffc107;">HBAR Recharge Being Retried</h2>
            <p>Your HBAR recharge encountered a temporary issue and is being retried.</p>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3>Transaction Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Transaction ID:</strong> {{transactionId}}</li>
                <li><strong>XAF Amount:</strong> {{xafAmount}} XAF</li>
                <li><strong>Retry Count:</strong> {{retryCount}}</li>
                <li><strong>Status:</strong> Processing</li>
              </ul>
            </div>
            
            <p>We'll notify you once your recharge is completed successfully.</p>
            
            <p style="color: #6c757d; font-size: 12px;">
              No action is required from you. We're working to complete your transaction.
            </p>
          </div>
        `,
        text: `
HBAR Recharge Being Retried

Your HBAR recharge encountered a temporary issue and is being retried.

Transaction Details:
- Transaction ID: {{transactionId}}
- XAF Amount: {{xafAmount}} XAF
- Retry Count: {{retryCount}}
- Status: Processing

We'll notify you once your recharge is completed successfully.

No action is required from you. We're working to complete your transaction.

---
Sachain Team
        `.trim(),
      },
      "recharge-complete": {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">HBAR Recharge Complete!</h2>
            <p>Your HBAR recharge has been fully processed and completed.</p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3>Final Transaction Summary:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Transaction ID:</strong> {{transactionId}}</li>
                <li><strong>XAF Amount:</strong> {{xafAmount}} XAF</li>
                <li><strong>HBAR Received:</strong> {{hbarAmount}} HBAR</li>
                <li><strong>Exchange Rate:</strong> {{exchangeRate}} XAF/HBAR</li>
                <li><strong>Total Fees:</strong> {{totalFees}} XAF</li>
                <li><strong>Processing Time:</strong> {{processingTimeMs}}ms</li>
                <li><strong>Hedera Account:</strong> {{userHederaAccountId}}</li>
                <li><strong>Completed At:</strong> {{timestamp}}</li>
              </ul>
            </div>
            
            <p>Your HBAR tokens are now available in your Hedera account for trading and investments.</p>
            
            <p style="color: #6c757d; font-size: 12px;">
              Thank you for using Sachain's HBAR recharge service!
            </p>
          </div>
        `,
        text: `
HBAR Recharge Complete!

Your HBAR recharge has been fully processed and completed.

Final Transaction Summary:
- Transaction ID: {{transactionId}}
- XAF Amount: {{xafAmount}} XAF
- HBAR Received: {{hbarAmount}} HBAR
- Exchange Rate: {{exchangeRate}} XAF/HBAR
- Total Fees: {{totalFees}} XAF
- Processing Time: {{processingTimeMs}}ms
- Hedera Account: {{userHederaAccountId}}
- Completed At: {{timestamp}}

Your HBAR tokens are now available in your Hedera account for trading and investments.

Thank you for using Sachain's HBAR recharge service!

---
Sachain Team
        `.trim(),
      },
      "recharge-initiated": {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">HBAR Recharge Initiated</h2>
            <p>Your HBAR recharge request has been received and is being processed.</p>
            
            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h3>Transaction Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Transaction ID:</strong> {{transactionId}}</li>
                <li><strong>XAF Amount:</strong> {{xafAmount}} XAF</li>
                <li><strong>Estimated HBAR:</strong> {{estimatedHBARAmount}} HBAR</li>
                <li><strong>Exchange Rate:</strong> {{exchangeRate}} XAF/HBAR</li>
                <li><strong>Orange Money Fee:</strong> {{fees.orangeMoneyFee}} XAF</li>
                <li><strong>Platform Fee:</strong> {{fees.platformFee}} XAF</li>
                <li><strong>Total Fees:</strong> {{fees.totalFees}} XAF</li>
                <li><strong>Initiated At:</strong> {{timestamp}}</li>
              </ul>
            </div>
            
            <p>We'll notify you once your Orange Money payment is confirmed and your HBAR tokens are transferred.</p>
            
            <p style="color: #6c757d; font-size: 12px;">
              Processing typically takes 2-5 minutes. Please keep this transaction ID for your records.
            </p>
          </div>
        `,
        text: `
HBAR Recharge Initiated

Your HBAR recharge request has been received and is being processed.

Transaction Details:
- Transaction ID: {{transactionId}}
- XAF Amount: {{xafAmount}} XAF
- Estimated HBAR: {{estimatedHBARAmount}} HBAR
- Exchange Rate: {{exchangeRate}} XAF/HBAR
- Orange Money Fee: {{fees.orangeMoneyFee}} XAF
- Platform Fee: {{fees.platformFee}} XAF
- Total Fees: {{fees.totalFees}} XAF
- Initiated At: {{timestamp}}

We'll notify you once your Orange Money payment is confirmed and your HBAR tokens are transferred.

Processing typically takes 2-5 minutes. Please keep this transaction ID for your records.

---
Sachain Team
        `.trim(),
      },
      "admin-alert": {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">🚨 URGENT: Recharge System Alert</h2>
            <p>A recharge transaction has failed and requires immediate attention.</p>
            
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3>Failure Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Event Type:</strong> {{eventType}}</li>
                <li><strong>Transaction ID:</strong> {{transactionId}}</li>
                <li><strong>User ID:</strong> {{userId}}</li>
                <li><strong>XAF Amount:</strong> {{xafAmount}} XAF</li>
                <li><strong>Error Code:</strong> {{errorCode}}</li>
                <li><strong>Error Message:</strong> {{errorMessage}}</li>
                <li><strong>Failure Stage:</strong> {{failureStage}}</li>
                <li><strong>Retryable:</strong> {{retryable}}</li>
                <li><strong>Retry Count:</strong> {{retryCount}}</li>
                <li><strong>Failed At:</strong> {{timestamp}}</li>
              </ul>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4>Required Actions:</h4>
              <ul>
                {{#if retryable}}
                <li>Monitor automatic retry attempts</li>
                <li>Check system health and dependencies</li>
                {{else}}
                <li>⚠️ Manual intervention required</li>
                <li>Review transaction for potential refund</li>
                <li>Contact user if necessary</li>
                {{/if}}
                <li>Investigate root cause</li>
                <li>Update monitoring thresholds if needed</li>
              </ul>
            </div>
            
            <p style="color: #6c757d; font-size: 12px;">
              This alert was generated automatically by the Sachain recharge monitoring system.
            </p>
          </div>
        `,
        text: `
🚨 URGENT: Recharge System Alert

A recharge transaction has failed and requires immediate attention.

Failure Details:
- Event Type: {{eventType}}
- Transaction ID: {{transactionId}}
- User ID: {{userId}}
- XAF Amount: {{xafAmount}} XAF
- Error Code: {{errorCode}}
- Error Message: {{errorMessage}}
- Failure Stage: {{failureStage}}
- Retryable: {{retryable}}
- Retry Count: {{retryCount}}
- Failed At: {{timestamp}}

Required Actions:
{{#if retryable}}
- Monitor automatic retry attempts
- Check system health and dependencies
{{else}}
- ⚠️ Manual intervention required
- Review transaction for potential refund
- Contact user if necessary
{{/if}}
- Investigate root cause
- Update monitoring thresholds if needed

This alert was generated automatically by the Sachain recharge monitoring system.

---
Sachain Admin System
        `.trim(),
      },
    };
  }

  /**
   * Interpolate template with data using simple placeholder replacement
   */
  private interpolateTemplate(
    template: string,
    data: Record<string, any>
  ): string {
    let result = template;

    // Replace simple placeholders like {{key}}
    Object.keys(data).forEach((key) => {
      const placeholder = new RegExp(`{{${key}}}`, "g");
      result = result.replace(placeholder, String(data[key] || ""));
    });

    // Handle conditional blocks like {{#if condition}}...{{/if}}
    result = result.replace(
      /{{#if\s+(\w+)}}(.*?){{\/if}}/gs,
      (match, condition, content) => {
        return data[condition] ? content : "";
      }
    );

    // Handle else blocks like {{#if condition}}...{{else}}...{{/if}}
    result = result.replace(
      /{{#if\s+(\w+)}}(.*?){{else}}(.*?){{\/if}}/gs,
      (match, condition, ifContent, elseContent) => {
        return data[condition] ? ifContent : elseContent;
      }
    );

    return result;
  }

  /**
   * Get default email template when specific template is not found
   */
  private getDefaultEmailTemplate(data: Record<string, any>): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Sachain Notification</h2>
        <p>You have received a notification from Sachain.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Details:</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
        
        <p style="color: #6c757d; font-size: 12px;">
          This is an automated message from Sachain.
        </p>
      </div>
    `;
  }

  /**
   * Get default text template when specific template is not found
   */
  private getDefaultTextTemplate(data: Record<string, any>): string {
    return `
Sachain Notification

You have received a notification from Sachain.

Details:
${JSON.stringify(data, null, 2)}

This is an automated message from Sachain.
    `.trim();
  }
}
