/**
 * Admin Alert Service
 * Handles admin notifications and alerts
 */

import { SNS } from 'aws-sdk';
import { SES } from 'aws-sdk';
import { AdminRepository } from '../repositories/admin-repository';
import { TreasuryAlert, CreateTreasuryAlertInput } from '../types/admin';
import { structuredLogger } from './structured-logger';

const logger = structuredLogger.child({ service: 'admin-alert-service' });

export class AdminAlertService {
  private sns: SNS;
  private ses: SES;
  private adminRepository: AdminRepository;

  constructor() {
    this.sns = new SNS({ region: process.env.AWS_REGION });
    this.ses = new SES({ region: process.env.AWS_REGION });
    this.adminRepository = new AdminRepository({
      tableName: process.env.DYNAMODB_TABLE_NAME!,
      region: process.env.AWS_REGION!,
    });
  }

  /**
   * Send treasury balance alert
   */
  async sendTreasuryBalanceAlert(
    balance: number,
    threshold: number,
    severity: 'warning' | 'critical'
  ): Promise<void> {
    logger.info('Sending treasury balance alert', { balance, threshold, severity });

    const alertType = severity === 'critical' ? 'critical_balance' : 'low_balance';
    const message = `Treasury balance alert: Current balance is ${balance} HBAR (threshold: ${threshold} HBAR)`;

    // Create alert record
    const alert = await this.adminRepository.createTreasuryAlert({
      type: alertType,
      severity,
      message,
    });

    // Send notifications
    await Promise.all([
      this.sendSNSAlert(alert),
      this.sendEmailAlert(alert),
    ]);
  }

  /**
   * Send failed transaction alert
   */
  async sendFailedTransactionAlert(
    transactionId: string,
    errorMessage: string,
    retryCount: number
  ): Promise<void> {
    logger.info('Sending failed transaction alert', { transactionId, retryCount });

    const severity = retryCount >= 3 ? 'critical' : 'warning';
    const message = `Transaction ${transactionId} failed after ${retryCount} attempts: ${errorMessage}`;

    const alert = await this.adminRepository.createTreasuryAlert({
      type: 'failed_transfer',
      severity,
      message,
    });

    await Promise.all([
      this.sendSNSAlert(alert),
      this.sendEmailAlert(alert),
    ]);
  }

  /**
   * Send rate limit exceeded alert
   */
  async sendRateLimitAlert(
    service: string,
    currentRate: number,
    limit: number
  ): Promise<void> {
    logger.info('Sending rate limit alert', { service, currentRate, limit });

    const message = `Rate limit exceeded for ${service}: ${currentRate} requests/min (limit: ${limit})`;

    const alert = await this.adminRepository.createTreasuryAlert({
      type: 'rate_limit_exceeded',
      severity: 'warning',
      message,
    });

    await Promise.all([
      this.sendSNSAlert(alert),
      this.sendEmailAlert(alert),
    ]);
  }

  /**
   * Send system health degradation alert
   */
  async sendSystemHealthAlert(
    component: string,
    status: 'degraded' | 'critical',
    details: string
  ): Promise<void> {
    logger.info('Sending system health alert', { component, status, details });

    const severity = status === 'critical' ? 'critical' : 'warning';
    const message = `System component ${component} is ${status}: ${details}`;

    // Use failed_transfer type as a generic system alert type
    const alert = await this.adminRepository.createTreasuryAlert({
      type: 'failed_transfer',
      severity,
      message,
    });

    await Promise.all([
      this.sendSNSAlert(alert),
      this.sendEmailAlert(alert),
    ]);
  }

  /**
   * Get pending alerts
   */
  async getPendingAlerts(): Promise<TreasuryAlert[]> {
    const result = await this.adminRepository.getTreasuryAlerts(false);
    return result.items;
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, adminUserId: string): Promise<void> {
    logger.info('Acknowledging alert', { alertId, adminUserId });
    
    await this.adminRepository.acknowledgeTreasuryAlert(alertId, adminUserId);
  }

  // Private helper methods

  private async sendSNSAlert(alert: TreasuryAlert): Promise<void> {
    const topicArn = process.env.ADMIN_ALERT_TOPIC_ARN;
    
    if (!topicArn) {
      logger.warn('Admin alert topic ARN not configured, skipping SNS notification');
      return;
    }

    try {
      await this.sns.publish({
        TopicArn: topicArn,
        Subject: `Sachain Admin Alert: ${alert.type}`,
        Message: JSON.stringify({
          alertId: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          timestamp: alert.timestamp,
        }),
        MessageAttributes: {
          severity: {
            DataType: 'String',
            StringValue: alert.severity,
          },
          alertType: {
            DataType: 'String',
            StringValue: alert.type,
          },
        },
      }).promise();

      logger.info('SNS alert sent successfully', { alertId: alert.id });
    } catch (error) {
      logger.error('Failed to send SNS alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async sendEmailAlert(alert: TreasuryAlert): Promise<void> {
    const adminEmails = process.env.ADMIN_EMAIL_ADDRESSES?.split(',') || [];
    
    if (adminEmails.length === 0) {
      logger.warn('No admin email addresses configured, skipping email notification');
      return;
    }

    const subject = `Sachain Admin Alert: ${alert.type.replace('_', ' ').toUpperCase()}`;
    const htmlBody = this.generateAlertEmailHTML(alert);
    const textBody = this.generateAlertEmailText(alert);

    try {
      await this.ses.sendEmail({
        Source: process.env.ADMIN_EMAIL_FROM || 'noreply@sachain.com',
        Destination: {
          ToAddresses: adminEmails,
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          },
        },
      }).promise();

      logger.info('Email alert sent successfully', { 
        alertId: alert.id,
        recipients: adminEmails.length,
      });
    } catch (error) {
      logger.error('Failed to send email alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private generateAlertEmailHTML(alert: TreasuryAlert): string {
    const severityColor = {
      info: '#17a2b8',
      warning: '#ffc107',
      critical: '#dc3545',
    }[alert.severity];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Sachain Admin Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background-color: ${severityColor}; color: white; padding: 20px;">
            <h1 style="margin: 0; font-size: 24px;">Sachain Admin Alert</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Alert ID: ${alert.id}</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0 0 10px 0;">Alert Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Type:</td>
                  <td style="padding: 8px 0;">${alert.type.replace('_', ' ').toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Severity:</td>
                  <td style="padding: 8px 0;">
                    <span style="background-color: ${severityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                      ${alert.severity}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Timestamp:</td>
                  <td style="padding: 8px 0;">${new Date(alert.timestamp).toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid ${severityColor};">
              <h3 style="margin: 0 0 10px 0; color: #333;">Message</h3>
              <p style="margin: 0; color: #666; line-height: 1.5;">${alert.message}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
              <p style="margin: 0; color: #999; font-size: 14px;">
                Please log into the admin dashboard to acknowledge this alert and take appropriate action.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateAlertEmailText(alert: TreasuryAlert): string {
    return `
SACHAIN ADMIN ALERT

Alert ID: ${alert.id}
Type: ${alert.type.replace('_', ' ').toUpperCase()}
Severity: ${alert.severity.toUpperCase()}
Timestamp: ${new Date(alert.timestamp).toLocaleString()}

Message:
${alert.message}

Please log into the admin dashboard to acknowledge this alert and take appropriate action.
    `.trim();
  }
}