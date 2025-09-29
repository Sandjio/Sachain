/**
 * Integration tests for error handling and recovery mechanisms
 * Tests error classification, retry logic, dead letter queue handling, and admin alerts
 */

import {
  ErrorClassifier,
  ErrorCategory,
  ErrorSeverity,
} from "../../utils/error-classification";
import { RetryHandler } from "../../utils/retry-handler";
import { DeadLetterQueueHandler } from "../../utils/dead-letter-queue-handler";
import { AdminAlertService } from "../../utils/admin-alert-service";

// Mock AWS services
jest.mock("aws-sdk", () => ({
  SQS: jest.fn(() => ({
    sendMessage: jest
      .fn()
      .mockReturnValue({ promise: () => Promise.resolve() }),
    receiveMessage: jest
      .fn()
      .mockReturnValue({ promise: () => Promise.resolve() }),
  })),
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      put: jest.fn().mockReturnValue({ promise: () => Promise.resolve() }),
      get: jest
        .fn()
        .mockReturnValue({ promise: () => Promise.resolve({ Item: {} }) }),
      query: jest
        .fn()
        .mockReturnValue({
          promise: () => Promise.resolve({ Items: [], Count: 0 }),
        }),
      update: jest.fn().mockReturnValue({ promise: () => Promise.resolve() }),
    })),
  },
  SNS: jest.fn(() => ({
    publish: jest.fn().mockReturnValue({ promise: () => Promise.resolve() }),
  })),
  SES: jest.fn(() => ({
    sendEmail: jest.fn().mockReturnValue({ promise: () => Promise.resolve() }),
  })),
}));

describe("Error Handling and Recovery Integration Tests", () => {
  let retryHandler: RetryHandler;
  let dlqHandler: DeadLetterQueueHandler;
  let alertService: AdminAlertService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables for testing
    process.env.DEAD_LETTER_TABLE_NAME = "test-dead-letters";
    process.env.DEAD_LETTER_QUEUE_URL =
      "https://sqs.test.amazonaws.com/123456789/test-dlq";
    process.env.ADMIN_EMAIL_RECIPIENTS = "admin@test.com";
    process.env.ADMIN_SOURCE_EMAIL = "alerts@test.com";

    dlqHandler = new DeadLetterQueueHandler();
    alertService = new AdminAlertService();
  });

  describe("Error Classification", () => {
    it("should correctly classify validation errors", () => {
      const error = new Error("Invalid amount specified");
      (error as any).code = "INVALID_AMOUNT";

      const classified = ErrorClassifier.classify(error);

      expect(classified.category).toBe(ErrorCategory.VALIDATION);
      expect(classified.severity).toBe(ErrorSeverity.LOW);
      expect(classified.retryable).toBe(false);
      expect(classified.requiresManualIntervention).toBe(false);
      expect(classified.alertAdministrators).toBe(false);
    });

    it("should correctly classify payment errors", () => {
      const error = new Error("Orange Money service unavailable");
      (error as any).code = "ORANGE_MONEY_SERVICE_UNAVAILABLE";

      const classified = ErrorClassifier.classify(error);

      expect(classified.category).toBe(ErrorCategory.PAYMENT);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.retryable).toBe(true);
      expect(classified.requiresManualIntervention).toBe(false);
      expect(classified.alertAdministrators).toBe(true);
    });

    it("should correctly classify conversion errors", () => {
      const error = new Error("Hedera network busy");
      (error as any).code = "HEDERA_NETWORK_BUSY";

      const classified = ErrorClassifier.classify(error);

      expect(classified.category).toBe(ErrorCategory.CONVERSION);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.retryable).toBe(true);
      expect(classified.requiresManualIntervention).toBe(false);
      expect(classified.alertAdministrators).toBe(false);
    });

    it("should handle unknown errors with default classification", () => {
      const error = new Error("Unknown error occurred");

      const classified = ErrorClassifier.classify(error);

      expect(classified.category).toBe(ErrorCategory.SYSTEM);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.code).toBe("UNKNOWN_ERROR");
      expect(classified.retryable).toBe(true);
      expect(classified.alertAdministrators).toBe(true);
    });

    it("should extract error codes from error messages", () => {
      const error = new Error(
        "Orange Money insufficient balance for transaction"
      );

      const classified = ErrorClassifier.classify(error);

      expect(classified.code).toBe("ORANGE_MONEY_INSUFFICIENT_BALANCE");
      expect(classified.category).toBe(ErrorCategory.PAYMENT);
    });
  });

  describe("Retry Logic", () => {
    it("should successfully retry and return result on eventual success", async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error("Temporary network error");
          (error as any).code = "NETWORK_TIMEOUT";
          throw error;
        }
        return Promise.resolve("success");
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "test_operation",
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries for retryable errors", async () => {
      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Persistent network error");
        (error as any).code = "NETWORK_TIMEOUT";
        throw error;
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "test_operation",
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(false);
      expect(result.shouldDeadLetter).toBe(true);
      expect(result.attempts).toBeGreaterThan(1);
      expect(result.error?.code).toBe("NETWORK_TIMEOUT");
    });

    it("should not retry non-retryable errors", async () => {
      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Invalid amount");
        (error as any).code = "INVALID_AMOUNT";
        throw error;
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "test_operation",
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(false);
      expect(result.shouldDeadLetter).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should use operation-specific retry configuration", async () => {
      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Orange Money timeout");
        (error as any).code = "ORANGE_MONEY_TIMEOUT";
        throw error;
      });

      const result = await RetryHandler.executeWithRetry(
        mockOperation,
        "orange_money_payment",
        { transactionId: "test-123" }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(4); // 3 retries + 1 initial attempt for orange_money_payment config
    });

    it("should calculate exponential backoff delays correctly", async () => {
      const delays: number[] = [];
      const originalSleep = (RetryHandler as any).sleep;

      (RetryHandler as any).sleep = jest
        .fn()
        .mockImplementation((ms: number) => {
          delays.push(ms);
          return Promise.resolve();
        });

      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error("Network timeout");
        (error as any).code = "NETWORK_TIMEOUT";
        throw error;
      });

      await RetryHandler.executeWithRetry(mockOperation, "test_operation", {
        transactionId: "test-123",
      });

      expect(delays.length).toBeGreaterThan(0);
      // Verify exponential backoff (each delay should be roughly double the previous)
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThan(delays[i - 1]);
      }

      // Restore original sleep function
      (RetryHandler as any).sleep = originalSleep;
    });
  });

  describe("Dead Letter Queue Handling", () => {
    it("should process dead letter messages and store them", async () => {
      const mockSQSEvent = {
        Records: [
          {
            messageId: "test-message-123",
            body: JSON.stringify({
              transactionId: "test-transaction-123",
              userId: "test-user-123",
              operation: "hbar_recharge",
              error: {
                code: "HEDERA_NETWORK_BUSY",
                message: "Hedera network is busy",
              },
            }),
            messageAttributes: {
              "retry-count": { stringValue: "3" },
            },
          },
        ],
      };

      await dlqHandler.processDeadLetterMessages(mockSQSEvent as any);

      // Verify that the message was stored in DynamoDB
      const mockDynamoDB = require("aws-sdk").DynamoDB.DocumentClient();
      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: "test-dead-letters",
          Item: expect.objectContaining({
            messageId: "test-message-123",
            transactionId: "test-transaction-123",
            processingStatus: "pending",
          }),
        })
      );
    });

    it("should get pending messages for admin review", async () => {
      const mockItems = [
        {
          messageId: "msg-1",
          transactionId: "tx-1",
          processingStatus: "pending",
          operation: "hbar_recharge",
        },
      ];

      const mockDynamoDB = require("aws-sdk").DynamoDB.DocumentClient();
      mockDynamoDB.query.mockReturnValueOnce({
        promise: () => Promise.resolve({ Items: mockItems }),
      });

      const pendingMessages = await dlqHandler.getPendingMessages();

      expect(pendingMessages).toEqual(mockItems);
      expect(mockDynamoDB.query).toHaveBeenCalledWith(
        expect.objectContaining({
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :status",
          ExpressionAttributeValues: {
            ":status": "STATUS#pending",
          },
        })
      );
    });

    it("should update message status correctly", async () => {
      await dlqHandler.updateMessageStatus(
        "test-message-123",
        "test-transaction-123",
        "investigating",
        "Admin is reviewing the issue"
      );

      const mockDynamoDB = require("aws-sdk").DynamoDB.DocumentClient();
      expect(mockDynamoDB.update).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: {
            PK: "DLQ#test-message-123",
            SK: "TRANSACTION#test-transaction-123",
          },
          UpdateExpression: expect.stringContaining(
            "processingStatus = :status"
          ),
          ExpressionAttributeValues: expect.objectContaining({
            ":status": "investigating",
            ":notes": "Admin is reviewing the issue",
          }),
        })
      );
    });

    it("should execute retry recovery action", async () => {
      const mockMessage = {
        messageId: "test-message-123",
        transactionId: "test-transaction-123",
        originalPayload: { test: "data" },
      };

      const mockDynamoDB = require("aws-sdk").DynamoDB.DocumentClient();
      mockDynamoDB.get.mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: mockMessage }),
      });

      const recoveryAction = {
        action: "retry" as const,
        reason: "Network issue resolved",
        adminUserId: "admin-123",
      };

      await dlqHandler.executeRecoveryAction(
        "test-message-123",
        "test-transaction-123",
        recoveryAction
      );

      // Verify message was re-queued
      const mockSQS = require("aws-sdk").SQS();
      expect(mockSQS.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageBody: JSON.stringify(mockMessage.originalPayload),
          MessageAttributes: expect.objectContaining({
            "retry-attempt": {
              DataType: "String",
              StringValue: "manual-retry",
            },
            "admin-initiated": { DataType: "String", StringValue: "admin-123" },
          }),
        })
      );
    });

    it("should get statistics correctly", async () => {
      const mockDynamoDB = require("aws-sdk").DynamoDB.DocumentClient();

      // Mock different counts for each status
      mockDynamoDB.query
        .mockReturnValueOnce({ promise: () => Promise.resolve({ Count: 5 }) }) // pending
        .mockReturnValueOnce({ promise: () => Promise.resolve({ Count: 2 }) }) // investigating
        .mockReturnValueOnce({ promise: () => Promise.resolve({ Count: 10 }) }) // resolved
        .mockReturnValueOnce({ promise: () => Promise.resolve({ Count: 1 }) }); // failed

      const stats = await dlqHandler.getStatistics();

      expect(stats).toEqual({
        pending: 5,
        investigating: 2,
        resolved: 10,
        failed: 1,
      });
    });
  });

  describe("Admin Alert System", () => {
    it("should send alerts through appropriate channels based on severity", async () => {
      const alertData = {
        type: "CRITICAL_SYSTEM_FAILURE",
        severity: ErrorSeverity.CRITICAL,
        transactionId: "test-123",
        errorCode: "HEDERA_INSUFFICIENT_BALANCE",
        errorMessage: "Treasury account has insufficient HBAR balance",
        timestamp: new Date().toISOString(),
      };

      await alertService.sendAlert(alertData);

      // Verify email was sent
      const mockSES = require("aws-sdk").SES();
      expect(mockSES.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Source: "alerts@test.com",
          Destination: { ToAddresses: ["admin@test.com"] },
          Message: expect.objectContaining({
            Subject: expect.objectContaining({
              Data: expect.stringContaining("[CRITICAL] Sachain Alert"),
            }),
          }),
        })
      );
    });

    it("should filter alerts based on severity thresholds", async () => {
      const lowSeverityAlert = {
        type: "LOW_PRIORITY_WARNING",
        severity: ErrorSeverity.LOW,
        transactionId: "test-123",
        timestamp: new Date().toISOString(),
      };

      await alertService.sendAlert(lowSeverityAlert);

      // SMS should not be sent for low severity alerts (threshold is HIGH)
      const mockSNS = require("aws-sdk").SNS();
      expect(mockSNS.publish).not.toHaveBeenCalled();

      // But email should be sent (threshold is MEDIUM, but we'll send for LOW too in this test)
      const mockSES = require("aws-sdk").SES();
      expect(mockSES.sendEmail).toHaveBeenCalled();
    });

    it("should send test alerts correctly", async () => {
      await alertService.sendTestAlert("email");

      const mockSES = require("aws-sdk").SES();
      expect(mockSES.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.objectContaining({
            Subject: expect.objectContaining({
              Data: expect.stringContaining("TEST_ALERT"),
            }),
            Body: expect.objectContaining({
              Html: expect.objectContaining({
                Data: expect.stringContaining("test alert"),
              }),
            }),
          }),
        })
      );
    });
  });

  describe("End-to-End Error Recovery Scenarios", () => {
    it("should handle complete failure recovery workflow", async () => {
      // Simulate a failed operation that goes through the complete recovery process
      let operationAttempts = 0;
      const mockFailingOperation = jest.fn().mockImplementation(() => {
        operationAttempts++;
        const error = new Error("Hedera network busy");
        (error as any).code = "HEDERA_NETWORK_BUSY";
        throw error;
      });

      // Execute with retry
      const retryResult = await RetryHandler.executeWithRetry(
        mockFailingOperation,
        "hedera_transfer",
        { transactionId: "test-recovery-123", userId: "user-123" }
      );

      expect(retryResult.success).toBe(false);
      expect(retryResult.shouldDeadLetter).toBe(true);

      // Simulate dead letter queue processing
      if (retryResult.shouldDeadLetter) {
        const mockSQSEvent = {
          Records: [
            {
              messageId: "recovery-message-123",
              body: JSON.stringify({
                transactionId: "test-recovery-123",
                userId: "user-123",
                operation: "hedera_transfer",
                error: retryResult.error,
              }),
              messageAttributes: {
                "retry-count": { stringValue: retryResult.attempts.toString() },
              },
            },
          ],
        };

        await dlqHandler.processDeadLetterMessages(mockSQSEvent as any);

        // Verify alert was sent
        const mockSES = require("aws-sdk").SES();
        expect(mockSES.sendEmail).toHaveBeenCalled();
      }
    });

    it("should handle manual intervention workflow", async () => {
      // Create a message requiring manual intervention
      const mockSQSEvent = {
        Records: [
          {
            messageId: "manual-intervention-123",
            body: JSON.stringify({
              transactionId: "manual-tx-123",
              userId: "user-123",
              operation: "hbar_transfer",
              error: {
                code: "HEDERA_INSUFFICIENT_BALANCE",
                message: "Treasury account has insufficient balance",
                requiresManualIntervention: true,
              },
            }),
            messageAttributes: {
              "retry-count": { stringValue: "5" },
            },
          },
        ],
      };

      await dlqHandler.processDeadLetterMessages(mockSQSEvent as any);

      // Simulate admin taking action
      await dlqHandler.updateMessageStatus(
        "manual-intervention-123",
        "manual-tx-123",
        "investigating",
        "Admin reviewing treasury balance"
      );

      // Execute recovery action
      const recoveryAction = {
        action: "manual_transfer" as const,
        reason: "Treasury replenished, executing manual transfer",
        adminUserId: "admin-123",
        parameters: { hbarAmount: 100 },
      };

      await dlqHandler.executeRecoveryAction(
        "manual-intervention-123",
        "manual-tx-123",
        recoveryAction
      );

      // Verify final status update
      const mockDynamoDB = require("aws-sdk").DynamoDB.DocumentClient();
      expect(mockDynamoDB.update).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: expect.stringContaining(
            "processingStatus = :status"
          ),
          ExpressionAttributeValues: expect.objectContaining({
            ":status": "resolved",
          }),
        })
      );
    });
  });

  describe("Performance and Reliability", () => {
    it("should handle concurrent error processing", async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => {
        const mockOperation = jest.fn().mockImplementation(() => {
          if (i % 3 === 0) {
            const error = new Error("Random failure");
            (error as any).code = "NETWORK_TIMEOUT";
            throw error;
          }
          return Promise.resolve(`result-${i}`);
        });

        return RetryHandler.executeWithRetry(mockOperation, "concurrent_test", {
          transactionId: `concurrent-${i}`,
        });
      });

      const results = await Promise.allSettled(concurrentOperations);

      // Verify that some operations succeeded and some failed as expected
      const successful = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      );
      const failed = results.filter(
        (r) => r.status === "fulfilled" && !r.value.success
      );

      expect(successful.length).toBeGreaterThan(0);
      expect(failed.length).toBeGreaterThan(0);
      expect(successful.length + failed.length).toBe(10);
    });

    it("should handle alert system under load", async () => {
      const alerts = Array.from({ length: 20 }, (_, i) => ({
        type: "LOAD_TEST_ALERT",
        severity: i % 2 === 0 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
        transactionId: `load-test-${i}`,
        timestamp: new Date().toISOString(),
      }));

      const alertPromises = alerts.map((alert) =>
        alertService.sendAlert(alert)
      );
      const results = await Promise.allSettled(alertPromises);

      // All alerts should be processed successfully
      const successful = results.filter((r) => r.status === "fulfilled");
      expect(successful.length).toBe(20);
    });
  });
});
