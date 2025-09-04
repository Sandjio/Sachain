/**
 * Dead Letter Queue handler for persistent failures requiring manual intervention
 * Manages failed transactions and provides recovery mechanisms
 */

import { SQSEvent, SQSRecord } from "aws-lambda";
import { SQS, DynamoDB } from "aws-sdk";
import { ErrorClassifier, ClassifiedError } from "./error-classification";
import { structuredLogger } from "./structured-logger";
import { AdminAlertService } from "./admin-alert-service";

export interface DeadLetterMessage {
  messageId: string;
  transactionId: string;
  userId?: string;
  operation: string;
  originalPayload: any;
  error: ClassifiedError;
  failureTimestamp: string;
  retryCount: number;
  requiresManualIntervention: boolean;
  processingStatus: "pending" | "investigating" | "resolved" | "failed";
  adminNotes?: string;
  resolutionTimestamp?: string;
}

export interface RecoveryAction {
  action: "retry" | "refund" | "manual_transfer" | "cancel";
  reason: string;
  adminUserId: string;
  parameters?: Record<string, any>;
}

export class DeadLetterQueueHandler {
  private sqs: SQS;
  private dynamodb: DynamoDB.DocumentClient;
  private alertService: AdminAlertService;
  private readonly tableName: string;
  private readonly dlqUrl: string;

  constructor() {
    this.sqs = new SQS();
    this.dynamodb = new DynamoDB.DocumentClient();
    this.alertService = new AdminAlertService();
    this.tableName =
      process.env.DEAD_LETTER_TABLE_NAME || "hbar-recharge-dead-letters";
    this.dlqUrl = process.env.DEAD_LETTER_QUEUE_URL || "";
  }

  /**
   * Process messages from the dead letter queue
   */
  async processDeadLetterMessages(event: SQSEvent): Promise<void> {
    structuredLogger.info("Processing dead letter queue messages", {
      messageCount: event.Records.length,
    });

    for (const record of event.Records) {
      try {
        await this.processDeadLetterMessage(record);
      } catch (error) {
        structuredLogger.error("Failed to process dead letter message", {
          messageId: record.messageId,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // Re-throw to ensure message remains in DLQ for retry
        throw error;
      }
    }
  }

  private async processDeadLetterMessage(record: SQSRecord): Promise<void> {
    const messageBody = JSON.parse(record.body);
    const originalMessage =
      typeof (messageBody.Message || messageBody) === "string"
        ? JSON.parse(messageBody.Message || messageBody)
        : messageBody.Message || messageBody;

    // Extract transaction information
    const transactionId =
      originalMessage.transactionId ||
      originalMessage.detail?.transactionId ||
      this.generateFallbackTransactionId();

    const error =
      originalMessage.error ||
      ErrorClassifier.classify(
        new Error(originalMessage.errorMessage || "Unknown DLQ error")
      );

    const deadLetterMessage: DeadLetterMessage = {
      messageId: record.messageId,
      transactionId,
      userId: originalMessage.userId,
      operation: originalMessage.operation || "unknown",
      originalPayload: originalMessage,
      error,
      failureTimestamp: new Date().toISOString(),
      retryCount: this.extractRetryCount(record),
      requiresManualIntervention: error.requiresManualIntervention,
      processingStatus: "pending",
    };

    // Store in DynamoDB for tracking
    await this.storeDeadLetterMessage(deadLetterMessage);

    // Send alert to administrators
    await this.alertAdministrators(deadLetterMessage);

    structuredLogger.info("Dead letter message processed and stored", {
      messageId: record.messageId,
      transactionId,
      operation: deadLetterMessage.operation,
      errorCode: error.code,
    });
  }

  private async storeDeadLetterMessage(
    message: DeadLetterMessage
  ): Promise<void> {
    const item = {
      PK: `DLQ#${message.messageId}`,
      SK: `TRANSACTION#${message.transactionId}`,
      GSI1PK: `STATUS#${message.processingStatus}`,
      GSI1SK: message.failureTimestamp,
      GSI2PK: `USER#${message.userId || "unknown"}`,
      GSI2SK: message.failureTimestamp,
      ...message,
      TTL: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days retention
    };

    await this.dynamodb
      .put({
        TableName: this.tableName,
        Item: item,
      })
      .promise();
  }

  private async alertAdministrators(message: DeadLetterMessage): Promise<void> {
    const alertData = {
      type: "DEAD_LETTER_QUEUE_MESSAGE",
      severity: message.error.severity,
      transactionId: message.transactionId,
      userId: message.userId,
      operation: message.operation,
      errorCode: message.error.code,
      errorMessage: message.error.message,
      requiresManualIntervention: message.requiresManualIntervention,
      timestamp: message.failureTimestamp,
    };

    await this.alertService.sendAlert(alertData);
  }

  /**
   * Get pending dead letter messages for admin review
   */
  async getPendingMessages(limit: number = 50): Promise<DeadLetterMessage[]> {
    const params = {
      TableName: this.tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :status",
      ExpressionAttributeValues: {
        ":status": "STATUS#pending",
      },
      Limit: limit,
      ScanIndexForward: false, // Most recent first
    };

    const result = await this.dynamodb.query(params).promise();
    return result.Items as DeadLetterMessage[];
  }

  /**
   * Update the status of a dead letter message
   */
  async updateMessageStatus(
    messageId: string,
    transactionId: string,
    status: DeadLetterMessage["processingStatus"],
    adminNotes?: string
  ): Promise<void> {
    const updateParams: any = {
      TableName: this.tableName,
      Key: {
        PK: `DLQ#${messageId}`,
        SK: `TRANSACTION#${transactionId}`,
      },
      UpdateExpression: "SET processingStatus = :status, GSI1PK = :gsi1pk",
      ExpressionAttributeValues: {
        ":status": status,
        ":gsi1pk": `STATUS#${status}`,
      },
    };

    if (adminNotes) {
      updateParams.UpdateExpression += ", adminNotes = :notes";
      updateParams.ExpressionAttributeValues[":notes"] = adminNotes;
    }

    if (status === "resolved") {
      updateParams.UpdateExpression += ", resolutionTimestamp = :timestamp";
      updateParams.ExpressionAttributeValues[":timestamp"] =
        new Date().toISOString();
    }

    await this.dynamodb.update(updateParams).promise();

    structuredLogger.info("Dead letter message status updated", {
      messageId,
      transactionId,
      status,
      adminNotes,
    });
  }

  /**
   * Execute recovery action for a failed transaction
   */
  async executeRecoveryAction(
    messageId: string,
    transactionId: string,
    action: RecoveryAction
  ): Promise<void> {
    structuredLogger.info("Executing recovery action", {
      messageId,
      transactionId,
      action: action.action,
      reason: action.reason,
      adminUserId: action.adminUserId,
    });

    try {
      switch (action.action) {
        case "retry":
          await this.retryFailedTransaction(messageId, transactionId, action);
          break;
        case "refund":
          await this.processRefund(messageId, transactionId, action);
          break;
        case "manual_transfer":
          await this.processManualTransfer(messageId, transactionId, action);
          break;
        case "cancel":
          await this.cancelTransaction(messageId, transactionId, action);
          break;
        default:
          throw new Error(`Unknown recovery action: ${action.action}`);
      }

      await this.updateMessageStatus(
        messageId,
        transactionId,
        "resolved",
        `Recovery action executed: ${action.action} - ${action.reason}`
      );
    } catch (error) {
      structuredLogger.error("Recovery action failed", {
        messageId,
        transactionId,
        action: action.action,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      await this.updateMessageStatus(
        messageId,
        transactionId,
        "failed",
        `Recovery action failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );

      throw error;
    }
  }

  private async retryFailedTransaction(
    messageId: string,
    transactionId: string,
    action: RecoveryAction
  ): Promise<void> {
    // Get the original message
    const message = await this.getDeadLetterMessage(messageId, transactionId);

    // Re-queue the original message for processing
    await this.sqs
      .sendMessage({
        QueueUrl: process.env.RECHARGE_QUEUE_URL || "",
        MessageBody: JSON.stringify(message.originalPayload),
        MessageAttributes: {
          "retry-attempt": {
            DataType: "String",
            StringValue: "manual-retry",
          },
          "admin-initiated": {
            DataType: "String",
            StringValue: action.adminUserId,
          },
        },
      })
      .promise();
  }

  private async processRefund(
    messageId: string,
    transactionId: string,
    action: RecoveryAction
  ): Promise<void> {
    // Implementation would integrate with Orange Money refund API
    // This is a placeholder for the actual refund logic
    structuredLogger.info("Processing refund", {
      messageId,
      transactionId,
      adminUserId: action.adminUserId,
    });

    // TODO: Implement Orange Money refund API call
    // await this.orangeMoneyService.processRefund(transactionId, action.parameters);
  }

  private async processManualTransfer(
    messageId: string,
    transactionId: string,
    action: RecoveryAction
  ): Promise<void> {
    // Implementation would manually execute HBAR transfer
    structuredLogger.info("Processing manual HBAR transfer", {
      messageId,
      transactionId,
      adminUserId: action.adminUserId,
      parameters: action.parameters,
    });

    // TODO: Implement manual HBAR transfer logic
    // await this.hederaService.manualTransfer(action.parameters);
  }

  private async cancelTransaction(
    messageId: string,
    transactionId: string,
    action: RecoveryAction
  ): Promise<void> {
    // Mark transaction as cancelled in the main transaction table
    structuredLogger.info("Cancelling transaction", {
      messageId,
      transactionId,
      adminUserId: action.adminUserId,
    });

    // TODO: Update main transaction status to cancelled
  }

  private async getDeadLetterMessage(
    messageId: string,
    transactionId: string
  ): Promise<DeadLetterMessage> {
    const result = await this.dynamodb
      .get({
        TableName: this.tableName,
        Key: {
          PK: `DLQ#${messageId}`,
          SK: `TRANSACTION#${transactionId}`,
        },
      })
      .promise();

    if (!result.Item) {
      throw new Error(`Dead letter message not found: ${messageId}`);
    }

    return result.Item as DeadLetterMessage;
  }

  private extractRetryCount(record: SQSRecord): number {
    // Extract retry count from SQS attributes
    const retryCount = record.messageAttributes?.["retry-count"]?.stringValue;
    return retryCount ? parseInt(retryCount, 10) : 0;
  }

  private generateFallbackTransactionId(): string {
    return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics about dead letter queue processing
   */
  async getStatistics(): Promise<{
    pending: number;
    investigating: number;
    resolved: number;
    failed: number;
  }> {
    const statuses = ["pending", "investigating", "resolved", "failed"];
    const stats = { pending: 0, investigating: 0, resolved: 0, failed: 0 };

    for (const status of statuses) {
      const result = await this.dynamodb
        .query({
          TableName: this.tableName,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :status",
          ExpressionAttributeValues: {
            ":status": `STATUS#${status}`,
          },
          Select: "COUNT",
        })
        .promise();

      stats[status as keyof typeof stats] = result.Count || 0;
    }

    return stats;
  }
}
