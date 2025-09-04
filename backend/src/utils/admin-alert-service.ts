/**
 * Administrator alert system for failed transactions and system issues
 * Provides multiple notification channels and escalation mechanisms
 */

import { SNS, SES } from "aws-sdk";
import { ErrorSeverity } from "./error-classification";
import { structuredLogger } from "./structured-logger";

export interface AlertData {
  type: string;
  severity: ErrorSeverity;
  transactionId?: string;
  userId?: string;
  operation?: string;
  errorCode?: string;
  errorMessage?: string;
  requiresManualIntervention?: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AlertChannel {
  name: string;
  enabled: boolean;
  severityThreshold: ErrorSeverity;
  configuration: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (alert: AlertData) => boolean;
  channels: string[];
  escalationDelay?: number; // minutes
  maxEscalations?: number;
}

export class AdminAlertService {
  private sns: SNS;
  private ses: SES;
  private readonly channels: Map<string, AlertChannel>;
  private readonly rules: AlertRule[];

  constructor() {
    this.sns = new SNS();
    this.ses = new SES();
    this.channels = new Map();
    this.rules = [];

    this.initializeChannels();
    this.initializeRules();
  }

  private initializeChannels(): void {
    // Email channel for detailed alerts
    this.channels.set("email", {
      name: "Email Notifications",
      enabled: true,
      severityThreshold: ErrorSeverity.LOW,
      configuration: {
        recipients: process.env.ADMIN_EMAIL_RECIPIENTS?.split(",") || [],
        sourceEmail: process.env.ADMIN_SOURCE_EMAIL || "alerts@sachain.com",
      },
    });

    // SMS channel for critical alerts
    this.channels.set("sms", {
      name: "SMS Notifications",
      enabled: true,
      severityThreshold: ErrorSeverity.HIGH,
      configuration: {
        phoneNumbers: process.env.ADMIN_PHONE_NUMBERS?.split(",") || [],
        snsTopicArn: process.env.ADMIN_SMS_TOPIC_ARN,
      },
    });

    // Slack channel for team notifications
    this.channels.set("slack", {
      name: "Slack Notifications",
      enabled: true,
      severityThreshold: ErrorSeverity.MEDIUM,
      configuration: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_ALERT_CHANNEL || "#alerts",
      },
    });

    // PagerDuty for critical incidents
    this.channels.set("pagerduty", {
      name: "PagerDuty Integration",
      enabled: true,
      severityThreshold: ErrorSeverity.CRITICAL,
      configuration: {
        integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
        serviceId: process.env.PAGERDUTY_SERVICE_ID,
      },
    });
  }

  private initializeRules(): void {
    // Critical system failures
    this.rules.push({
      id: "critical-system-failure",
      name: "Critical System Failure",
      condition: (alert) => alert.severity === ErrorSeverity.CRITICAL,
      channels: ["email", "sms", "slack", "pagerduty"],
      escalationDelay: 5,
      maxEscalations: 3,
    });

    // Treasury balance warnings
    this.rules.push({
      id: "treasury-balance-low",
      name: "Treasury Balance Low",
      condition: (alert) => alert.errorCode === "HEDERA_INSUFFICIENT_BALANCE",
      channels: ["email", "sms", "slack"],
      escalationDelay: 15,
      maxEscalations: 2,
    });

    // High error rates
    this.rules.push({
      id: "high-error-rate",
      name: "High Error Rate Detected",
      condition: (alert) => alert.type === "HIGH_ERROR_RATE",
      channels: ["email", "slack"],
      escalationDelay: 30,
      maxEscalations: 1,
    });

    // Manual intervention required
    this.rules.push({
      id: "manual-intervention",
      name: "Manual Intervention Required",
      condition: (alert) => alert.requiresManualIntervention === true,
      channels: ["email", "slack"],
      escalationDelay: 60,
      maxEscalations: 2,
    });

    // Dead letter queue messages
    this.rules.push({
      id: "dead-letter-queue",
      name: "Dead Letter Queue Message",
      condition: (alert) => alert.type === "DEAD_LETTER_QUEUE_MESSAGE",
      channels: ["email", "slack"],
      escalationDelay: 30,
      maxEscalations: 1,
    });

    // Default rule for all other alerts
    this.rules.push({
      id: "default-alert",
      name: "Default Alert Handler",
      condition: () => true, // Matches all alerts
      channels: ["email"],
      escalationDelay: 60,
      maxEscalations: 1,
    });
  }

  /**
   * Send alert through appropriate channels based on rules
   */
  async sendAlert(alertData: AlertData): Promise<void> {
    structuredLogger.info("Processing alert", {
      type: alertData.type,
      severity: alertData.severity,
      transactionId: alertData.transactionId,
      errorCode: alertData.errorCode,
    });

    // Find matching rules
    const matchingRules = this.rules.filter((rule) =>
      rule.condition(alertData)
    );

    if (matchingRules.length === 0) {
      structuredLogger.warn("No matching alert rules found", {
        alertType: alertData.type,
        severity: alertData.severity,
      });
      return;
    }

    // Collect all channels to notify
    const channelsToNotify = new Set<string>();
    matchingRules.forEach((rule) => {
      rule.channels.forEach((channel) => channelsToNotify.add(channel));
    });

    // Send notifications through each channel
    const notificationPromises = Array.from(channelsToNotify).map(
      (channelName) => {
        const channel = this.channels.get(channelName);
        if (!channel || !channel.enabled) {
          return Promise.resolve();
        }

        // Check severity threshold
        if (
          !this.meetsSeverityThreshold(
            alertData.severity,
            channel.severityThreshold
          )
        ) {
          return Promise.resolve();
        }

        return this.sendChannelNotification(channelName, channel, alertData);
      }
    );

    await Promise.allSettled(notificationPromises);

    // Schedule escalations if needed
    for (const rule of matchingRules) {
      if (rule.escalationDelay && rule.maxEscalations) {
        await this.scheduleEscalation(rule, alertData);
      }
    }
  }

  private async sendChannelNotification(
    channelName: string,
    channel: AlertChannel,
    alertData: AlertData
  ): Promise<void> {
    try {
      switch (channelName) {
        case "email":
          await this.sendEmailAlert(channel, alertData);
          break;
        case "sms":
          await this.sendSMSAlert(channel, alertData);
          break;
        case "slack":
          await this.sendSlackAlert(channel, alertData);
          break;
        case "pagerduty":
          await this.sendPagerDutyAlert(channel, alertData);
          break;
        default:
          structuredLogger.warn("Unknown alert channel", { channelName });
      }

      structuredLogger.info("Alert sent successfully", {
        channel: channelName,
        alertType: alertData.type,
        transactionId: alertData.transactionId,
      });
    } catch (error) {
      structuredLogger.error("Failed to send alert", {
        channel: channelName,
        alertType: alertData.type,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async sendEmailAlert(
    channel: AlertChannel,
    alertData: AlertData
  ): Promise<void> {
    const subject = this.generateEmailSubject(alertData);
    const body = this.generateEmailBody(alertData);

    const params = {
      Source: channel.configuration.sourceEmail,
      Destination: {
        ToAddresses: channel.configuration.recipients,
      },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: body },
          Text: { Data: this.stripHtml(body) },
        },
      },
    };

    await this.ses.sendEmail(params).promise();
  }

  private async sendSMSAlert(
    channel: AlertChannel,
    alertData: AlertData
  ): Promise<void> {
    const message = this.generateSMSMessage(alertData);

    if (channel.configuration.snsTopicArn) {
      // Send to SNS topic
      await this.sns
        .publish({
          TopicArn: channel.configuration.snsTopicArn,
          Message: message,
          Subject: `Sachain Alert: ${alertData.type}`,
        })
        .promise();
    } else {
      // Send to individual phone numbers
      const promises = channel.configuration.phoneNumbers.map(
        (phoneNumber: string) =>
          this.sns
            .publish({
              PhoneNumber: phoneNumber,
              Message: message,
            })
            .promise()
      );

      await Promise.all(promises);
    }
  }

  private async sendSlackAlert(
    channel: AlertChannel,
    alertData: AlertData
  ): Promise<void> {
    if (!channel.configuration.webhookUrl) {
      throw new Error("Slack webhook URL not configured");
    }

    const payload = {
      channel: channel.configuration.channel,
      username: "Sachain Alerts",
      icon_emoji: this.getSeverityEmoji(alertData.severity),
      attachments: [
        {
          color: this.getSeverityColor(alertData.severity),
          title: `${alertData.type} - ${alertData.severity}`,
          fields: [
            {
              title: "Transaction ID",
              value: alertData.transactionId || "N/A",
              short: true,
            },
            {
              title: "Error Code",
              value: alertData.errorCode || "N/A",
              short: true,
            },
            {
              title: "Operation",
              value: alertData.operation || "N/A",
              short: true,
            },
            {
              title: "Timestamp",
              value: alertData.timestamp,
              short: true,
            },
            {
              title: "Message",
              value: alertData.errorMessage || "No message provided",
              short: false,
            },
          ],
          footer: "Sachain HBAR Recharge System",
          ts: Math.floor(new Date(alertData.timestamp).getTime() / 1000),
        },
      ],
    };

    // In a real implementation, you would use a proper HTTP client
    // This is a placeholder for the actual Slack webhook call
    structuredLogger.info("Slack alert payload prepared", { payload });
  }

  private async sendPagerDutyAlert(
    channel: AlertChannel,
    alertData: AlertData
  ): Promise<void> {
    // PagerDuty integration would be implemented here
    // This is a placeholder for the actual PagerDuty API call
    structuredLogger.info("PagerDuty alert would be sent", {
      integrationKey: channel.configuration.integrationKey,
      alertData,
    });
  }

  private generateEmailSubject(alertData: AlertData): string {
    return `[${alertData.severity}] Sachain Alert: ${alertData.type}${
      alertData.transactionId ? ` (${alertData.transactionId})` : ""
    }`;
  }

  private generateEmailBody(alertData: AlertData): string {
    return `
      <html>
        <body>
          <h2>Sachain HBAR Recharge System Alert</h2>
          <table border="1" cellpadding="5" cellspacing="0">
            <tr><td><strong>Alert Type:</strong></td><td>${
              alertData.type
            }</td></tr>
            <tr><td><strong>Severity:</strong></td><td>${
              alertData.severity
            }</td></tr>
            <tr><td><strong>Timestamp:</strong></td><td>${
              alertData.timestamp
            }</td></tr>
            <tr><td><strong>Transaction ID:</strong></td><td>${
              alertData.transactionId || "N/A"
            }</td></tr>
            <tr><td><strong>User ID:</strong></td><td>${
              alertData.userId || "N/A"
            }</td></tr>
            <tr><td><strong>Operation:</strong></td><td>${
              alertData.operation || "N/A"
            }</td></tr>
            <tr><td><strong>Error Code:</strong></td><td>${
              alertData.errorCode || "N/A"
            }</td></tr>
            <tr><td><strong>Error Message:</strong></td><td>${
              alertData.errorMessage || "N/A"
            }</td></tr>
            <tr><td><strong>Manual Intervention:</strong></td><td>${
              alertData.requiresManualIntervention ? "Yes" : "No"
            }</td></tr>
          </table>
          
          ${
            alertData.metadata
              ? `
            <h3>Additional Metadata:</h3>
            <pre>${JSON.stringify(alertData.metadata, null, 2)}</pre>
          `
              : ""
          }
          
          <p><em>This is an automated alert from the Sachain HBAR Recharge System.</em></p>
        </body>
      </html>
    `;
  }

  private generateSMSMessage(alertData: AlertData): string {
    return (
      `Sachain Alert [${alertData.severity}]: ${alertData.type}. ` +
      `Transaction: ${alertData.transactionId || "N/A"}. ` +
      `Error: ${alertData.errorCode || "Unknown"}. ` +
      `Time: ${new Date(alertData.timestamp).toLocaleString()}`
    );
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private getSeverityEmoji(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return ":information_source:";
      case ErrorSeverity.MEDIUM:
        return ":warning:";
      case ErrorSeverity.HIGH:
        return ":exclamation:";
      case ErrorSeverity.CRITICAL:
        return ":rotating_light:";
      default:
        return ":question:";
    }
  }

  private getSeverityColor(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return "#36a64f";
      case ErrorSeverity.MEDIUM:
        return "#ff9500";
      case ErrorSeverity.HIGH:
        return "#ff4500";
      case ErrorSeverity.CRITICAL:
        return "#ff0000";
      default:
        return "#808080";
    }
  }

  private meetsSeverityThreshold(
    alertSeverity: ErrorSeverity,
    threshold: ErrorSeverity
  ): boolean {
    const severityLevels = {
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.CRITICAL]: 4,
    };

    return severityLevels[alertSeverity] >= severityLevels[threshold];
  }

  private async scheduleEscalation(
    rule: AlertRule,
    alertData: AlertData
  ): Promise<void> {
    // In a real implementation, this would schedule escalation using SQS delay or EventBridge
    structuredLogger.info("Escalation scheduled", {
      ruleId: rule.id,
      delay: rule.escalationDelay,
      alertType: alertData.type,
      transactionId: alertData.transactionId,
    });
  }

  /**
   * Test alert functionality
   */
  async sendTestAlert(channelName?: string): Promise<void> {
    const testAlert: AlertData = {
      type: "TEST_ALERT",
      severity: ErrorSeverity.LOW,
      transactionId: "test-" + Date.now(),
      operation: "test_operation",
      errorCode: "TEST_ERROR",
      errorMessage:
        "This is a test alert to verify the alert system is working correctly.",
      timestamp: new Date().toISOString(),
      metadata: {
        testRun: true,
        environment: process.env.NODE_ENV || "development",
      },
    };

    if (channelName) {
      const channel = this.channels.get(channelName);
      if (channel) {
        await this.sendChannelNotification(channelName, channel, testAlert);
      } else {
        throw new Error(`Unknown channel: ${channelName}`);
      }
    } else {
      await this.sendAlert(testAlert);
    }
  }
}
