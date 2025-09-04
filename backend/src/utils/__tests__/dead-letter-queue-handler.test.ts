/**
 * Unit tests for dead letter queue handler
 */

import { DeadLetterQueueHandler } from "../dead-letter-queue-handler";
import { ErrorSeverity } from "../error-classification";

// Mock AWS SDK
const mockSQS = {
  sendMessage: jest.fn().mockReturnValue({ promise: () => Promise.resolve() }),
};

const mockDynamoDB = {
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
};

const mockAdminAlertService = {
  sendAlert: jest.fn().mockResolvedValue(undefined),
};

jest.mock("aws-sdk", () => ({
  SQS: jest.fn(() => mockSQS),
  DynamoDB: {
    DocumentClient: jest.fn(() => mockDynamoDB),
  },
}));

jest.mock("../admin-alert-service", () => ({
  AdminAlertService: jest.fn(() => mockAdminAlertService),
}));

describe("DeadLetterQueueHandler", () => {
  let dlqHandler: DeadLetterQueueHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.DEAD_LETTER_TABLE_NAME = "test-dead-letters";
    process.env.DEAD_LETTER_QUEUE_URL =
      "https://sqs.test.amazonaws.com/123456789/test-dlq";
    process.env.RECHARGE_QUEUE_URL =
      "https://sqs.test.amazonaws.com/123456789/test-recharge";

    dlqHandler = new DeadLetterQueueHandler();
  });

  describe("processDeadLetterMessages", () => {
    it("should process single dead letter message successfully", async () => {
      const mockEvent = {
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
                severity: ErrorSeverity.MEDIUM,
                requiresManualIntervention: false,
              },
            }),
            messageAttributes: {
              "retry-count": { stringValue: "3" },
            },
          },
        ],
      };

      await dlqHandler.processDeadLetterMessages(mockEvent as any);

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: "test-dead-letters",
          Item: expect.objectContaining({
            PK: "DLQ#test-message-123",
            SK: "TRANSACTION#test-transaction-123",
            messageId: "test-message-123",
            transactionId: "test-transaction-123",
            processingStatus: "pending",
          }),
        })
      );

      expect(mockAdminAlertService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "DEAD_LETTER_QUEUE_MESSAGE",
          transactionId: "test-transaction-123",
          userId: "test-user-123",
        })
      );
    });

    it("should process multiple dead letter messages", async () => {
      const mockEvent = {
        Records: [
          {
            messageId: "message-1",
            body: JSON.stringify({
              transactionId: "tx-1",
              operation: "hbar_recharge",
            }),
            messageAttributes: {},
          },
          {
            messageId: "message-2",
            body: JSON.stringify({
              transactionId: "tx-2",
              operation: "hbar_conversion",
            }),
            messageAttributes: {},
          },
        ],
      };

      await dlqHandler.processDeadLetterMessages(mockEvent as any);

      expect(mockDynamoDB.put).toHaveBeenCalledTimes(2);
      expect(mockAdminAlertService.sendAlert).toHaveBeenCalledTimes(2);
    });

    it("should handle nested message body structure", async () => {
      const mockEvent = {
        Records: [
          {
            messageId: "test-message-123",
            body: JSON.stringify({
              Message: JSON.stringify({
                transactionId: "nested-transaction-123",
                operation: "hbar_recharge",
              }),
            }),
            messageAttributes: {},
          },
        ],
      };

      await dlqHandler.processDeadLetterMessages(mockEvent as any);

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            transactionId: "nested-transaction-123",
          }),
        })
      );
    });

    it("should generate fallback transaction ID when missing", async () => {
      const mockEvent = {
        Records: [
          {
            messageId: "test-message-123",
            body: JSON.stringify({
              operation: "unknown_operation",
            }),
            messageAttributes: {},
          },
        ],
      };

      await dlqHandler.processDeadLetterMessages(mockEvent as any);

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            transactionId: expect.stringMatching(/^fallback-\d+-[a-z0-9]+$/),
          }),
        })
      );
    });

    it("should extract retry count from message attributes", async () => {
      const mockEvent = {
        Records: [
          {
            messageId: "test-message-123",
            body: JSON.stringify({
              transactionId: "test-tx-123",
            }),
            messageAttributes: {
              "retry-count": { stringValue: "5" },
            },
          },
        ],
      };

      await dlqHandler.processDeadLetterMessages(mockEvent as any);

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            retryCount: 5,
          }),
        })
      );
    });

    it("should set TTL for dead letter messages", async () => {
      const mockEvent = {
        Records: [
          {
            messageId: "test-message-123",
            body: JSON.stringify({
              transactionId: "test-tx-123",
            }),
            messageAttributes: {},
          },
        ],
      };

      const beforeTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      await dlqHandler.processDeadLetterMessages(mockEvent as any);

      const afterTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            TTL: expect.any(Number),
          }),
        })
      );

      const putCall = mockDynamoDB.put.mock.calls[0][0];
      expect(putCall.Item.TTL).toBeGreaterThanOrEqual(beforeTime);
      expect(putCall.Item.TTL).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("getPendingMessages", () => {
    it("should query pending messages correctly", async () => {
      const mockMessages = [
        { messageId: "msg-1", processingStatus: "pending" },
        { messageId: "msg-2", processingStatus: "pending" },
      ];

      mockDynamoDB.query.mockReturnValueOnce({
        promise: () => Promise.resolve({ Items: mockMessages }),
      });

      const result = await dlqHandler.getPendingMessages(10);

      expect(result).toEqual(mockMessages);
      expect(mockDynamoDB.query).toHaveBeenCalledWith({
        TableName: "test-dead-letters",
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :status",
        ExpressionAttributeValues: {
          ":status": "STATUS#pending",
        },
        Limit: 10,
        ScanIndexForward: false,
      });
    });

    it("should use default limit when not specified", async () => {
      mockDynamoDB.query.mockReturnValueOnce({
        promise: () => Promise.resolve({ Items: [] }),
      });

      await dlqHandler.getPendingMessages();

      expect(mockDynamoDB.query).toHaveBeenCalledWith(
        expect.objectContaining({
          Limit: 50,
        })
      );
    });
  });

  describe("updateMessageStatus", () => {
    it("should update message status without admin notes", async () => {
      await dlqHandler.updateMessageStatus(
        "test-message-123",
        "test-transaction-123",
        "investigating"
      );

      expect(mockDynamoDB.update).toHaveBeenCalledWith({
        TableName: "test-dead-letters",
        Key: {
          PK: "DLQ#test-message-123",
          SK: "TRANSACTION#test-transaction-123",
        },
        UpdateExpression: "SET processingStatus = :status, GSI1PK = :gsi1pk",
        ExpressionAttributeValues: {
          ":status": "investigating",
          ":gsi1pk": "STATUS#investigating",
        },
      });
    });

    it("should update message status with admin notes", async () => {
      await dlqHandler.updateMessageStatus(
        "test-message-123",
        "test-transaction-123",
        "investigating",
        "Admin is reviewing the issue"
      );

      expect(mockDynamoDB.update).toHaveBeenCalledWith({
        TableName: "test-dead-letters",
        Key: {
          PK: "DLQ#test-message-123",
          SK: "TRANSACTION#test-transaction-123",
        },
        UpdateExpression:
          "SET processingStatus = :status, GSI1PK = :gsi1pk, adminNotes = :notes",
        ExpressionAttributeValues: {
          ":status": "investigating",
          ":gsi1pk": "STATUS#investigating",
          ":notes": "Admin is reviewing the issue",
        },
      });
    });

    it("should add resolution timestamp for resolved status", async () => {
      const beforeTime = new Date().toISOString();

      await dlqHandler.updateMessageStatus(
        "test-message-123",
        "test-transaction-123",
        "resolved"
      );

      const afterTime = new Date().toISOString();

      expect(mockDynamoDB.update).toHaveBeenCalledWith({
        TableName: "test-dead-letters",
        Key: {
          PK: "DLQ#test-message-123",
          SK: "TRANSACTION#test-transaction-123",
        },
        UpdateExpression:
          "SET processingStatus = :status, GSI1PK = :gsi1pk, resolutionTimestamp = :timestamp",
        ExpressionAttributeValues: {
          ":status": "resolved",
          ":gsi1pk": "STATUS#resolved",
          ":timestamp": expect.any(String),
        },
      });

      const updateCall = mockDynamoDB.update.mock.calls[0][0];
      expect(updateCall.ExpressionAttributeValues[":timestamp"]).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe("executeRecoveryAction", () => {
    beforeEach(() => {
      mockDynamoDB.get.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Item: {
              messageId: "test-message-123",
              transactionId: "test-transaction-123",
              originalPayload: { test: "data" },
            },
          }),
      });
    });

    it("should execute retry recovery action", async () => {
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

      expect(mockSQS.sendMessage).toHaveBeenCalledWith({
        QueueUrl: "https://sqs.test.amazonaws.com/123456789/test-recharge",
        MessageBody: JSON.stringify({ test: "data" }),
        MessageAttributes: {
          "retry-attempt": {
            DataType: "String",
            StringValue: "manual-retry",
          },
          "admin-initiated": {
            DataType: "String",
            StringValue: "admin-123",
          },
        },
      });

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

    it("should execute refund recovery action", async () => {
      const recoveryAction = {
        action: "refund" as const,
        reason: "Unable to complete HBAR transfer",
        adminUserId: "admin-123",
      };

      await dlqHandler.executeRecoveryAction(
        "test-message-123",
        "test-transaction-123",
        recoveryAction
      );

      expect(mockDynamoDB.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ":status": "resolved",
          }),
        })
      );
    });

    it("should execute manual transfer recovery action", async () => {
      const recoveryAction = {
        action: "manual_transfer" as const,
        reason: "Manual HBAR transfer required",
        adminUserId: "admin-123",
        parameters: { hbarAmount: 100 },
      };

      await dlqHandler.executeRecoveryAction(
        "test-message-123",
        "test-transaction-123",
        recoveryAction
      );

      expect(mockDynamoDB.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ":status": "resolved",
          }),
        })
      );
    });

    it("should execute cancel recovery action", async () => {
      const recoveryAction = {
        action: "cancel" as const,
        reason: "Transaction cancelled by admin",
        adminUserId: "admin-123",
      };

      await dlqHandler.executeRecoveryAction(
        "test-message-123",
        "test-transaction-123",
        recoveryAction
      );

      expect(mockDynamoDB.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ":status": "resolved",
          }),
        })
      );
    });

    it("should handle unknown recovery action", async () => {
      const recoveryAction = {
        action: "unknown_action" as any,
        reason: "Test unknown action",
        adminUserId: "admin-123",
      };

      await expect(
        dlqHandler.executeRecoveryAction(
          "test-message-123",
          "test-transaction-123",
          recoveryAction
        )
      ).rejects.toThrow("Unknown recovery action: unknown_action");

      expect(mockDynamoDB.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ":status": "failed",
          }),
        })
      );
    });

    it("should handle recovery action failure", async () => {
      mockSQS.sendMessage.mockReturnValueOnce({
        promise: () => Promise.reject(new Error("SQS error")),
      });

      const recoveryAction = {
        action: "retry" as const,
        reason: "Test retry failure",
        adminUserId: "admin-123",
      };

      await expect(
        dlqHandler.executeRecoveryAction(
          "test-message-123",
          "test-transaction-123",
          recoveryAction
        )
      ).rejects.toThrow("SQS error");

      expect(mockDynamoDB.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ":status": "failed",
          }),
        })
      );
    });
  });

  describe("getStatistics", () => {
    it("should return statistics for all statuses", async () => {
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

      expect(mockDynamoDB.query).toHaveBeenCalledTimes(4);
    });

    it("should handle missing counts", async () => {
      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({}),
      }); // No Count property

      const stats = await dlqHandler.getStatistics();

      expect(stats).toEqual({
        pending: 0,
        investigating: 0,
        resolved: 0,
        failed: 0,
      });
    });
  });

  describe("error handling", () => {
    it("should throw error when dead letter message not found", async () => {
      mockDynamoDB.get.mockReturnValueOnce({
        promise: () => Promise.resolve({}), // No Item
      });

      const recoveryAction = {
        action: "retry" as const,
        reason: "Test",
        adminUserId: "admin-123",
      };

      await expect(
        dlqHandler.executeRecoveryAction(
          "nonexistent-message",
          "nonexistent-transaction",
          recoveryAction
        )
      ).rejects.toThrow("Dead letter message not found: nonexistent-message");
    });

    it("should handle DynamoDB errors gracefully", async () => {
      mockDynamoDB.put.mockReturnValueOnce({
        promise: () => Promise.reject(new Error("DynamoDB error")),
      });

      const mockEvent = {
        Records: [
          {
            messageId: "test-message-123",
            body: JSON.stringify({
              transactionId: "test-tx-123",
            }),
            messageAttributes: {},
          },
        ],
      };

      await expect(
        dlqHandler.processDeadLetterMessages(mockEvent as any)
      ).rejects.toThrow("DynamoDB error");
    });
  });
});
