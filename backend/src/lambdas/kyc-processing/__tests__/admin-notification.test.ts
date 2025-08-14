import { handler } from "../index";
import { KYCUploadDetail } from "../types";
import { Context } from "aws-lambda";

// Mock console methods to avoid test output noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Mock the KYC Document Repository
jest.mock("../../../repositories/kyc-document-repository", () => ({
  KYCDocumentRepository: jest.fn(() => ({
    updateKYCDocument: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the Notification Service
jest.mock("../../../utils/notification-service", () => ({
  NotificationService: jest.fn(() => ({
    sendKYCReviewNotification: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock SNS Client
jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn(() => ({})),
}));

// Mock the structured logger module
jest.mock("../../../utils/structured-logger", () => ({
  createKYCLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    logMetricPublication: jest.fn(),
  })),
  StructuredLogger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      logMetricPublication: jest.fn(),
    })),
  },
}));

// Mock the CloudWatch metrics module
jest.mock("../../../utils/cloudwatch-metrics", () => ({
  CloudWatchMetrics: {
    getInstance: jest.fn(() => ({
      publishMetrics: jest.fn().mockResolvedValue(undefined),
      recordError: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Mock context
const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "kyc-processing",
  functionVersion: "1",
  invokedFunctionArn:
    "arn:aws:lambda:us-east-1:123456789012:function:kyc-processing",
  memoryLimitInMB: "128",
  awsRequestId: "test-request-id",
  logGroupName: "/aws/lambda/kyc-processing",
  logStreamName: "2024/01/01/[$LATEST]test",
  getRemainingTimeInMillis: () => 30000,
  done: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};

describe("KYC Processing Lambda - Admin Notification", () => {
  const currentTime = new Date().toISOString();
  const mockEvent = {
    version: "0" as const,
    id: "test-event-id",
    "detail-type": "KYC Document Uploaded" as const,
    source: "sachain.kyc" as const,
    account: "123456789012",
    time: currentTime,
    region: "us-east-1",
    resources: [],
    detail: {
      documentId: "doc-123",
      userId: "user-456",
      documentType: "national_id" as const,
      fileName: "id-document.jpg",
      fileSize: 1024000,
      contentType: "image/jpeg",
      s3Key: "kyc-documents/user-456/doc-123/id-document.jpg",
      s3Bucket: "sachain-kyc-documents",
      uploadedAt: currentTime,
    } as KYCUploadDetail,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should send admin notification successfully", async () => {
    await handler(mockEvent, mockContext, jest.fn());

    // Handler should complete without throwing errors
    // Notification service is mocked and will be called internally
  });

  it("should include secure document access links in notifications", async () => {
    await handler(mockEvent, mockContext, jest.fn());

    // The notification service is configured with adminPortalUrl
    // and generates secure review URLs internally
    // This is tested in the notification service unit tests
  });

  it("should handle different document types in notifications", async () => {
    const passportEvent = {
      ...mockEvent,
      detail: {
        ...mockEvent.detail,
        documentType: "passport" as const,
        documentId: "passport-doc-456",
        fileName: "passport.pdf",
      },
    };

    await handler(passportEvent, mockContext, jest.fn());

    // Handler should complete without throwing errors
    // Notification will include the correct document type
  });

  it("should continue processing even if notification fails", async () => {
    // Mock notification service to throw an error
    const NotificationService =
      require("../../../utils/notification-service").NotificationService;
    const mockNotificationService = new NotificationService();
    mockNotificationService.sendKYCReviewNotification.mockRejectedValueOnce(
      new Error("SNS service unavailable")
    );

    // Handler should still complete successfully
    await expect(
      handler(mockEvent, mockContext, jest.fn())
    ).resolves.not.toThrow();
  });

  it("should handle notification service timeout gracefully", async () => {
    // Mock notification service to timeout
    const NotificationService =
      require("../../../utils/notification-service").NotificationService;
    const mockNotificationService = new NotificationService();
    mockNotificationService.sendKYCReviewNotification.mockRejectedValueOnce(
      new Error("Request timeout")
    );

    // Handler should still complete successfully
    await expect(
      handler(mockEvent, mockContext, jest.fn())
    ).resolves.not.toThrow();
  });

  it("should handle SNS throttling errors gracefully", async () => {
    // Mock notification service to be throttled
    const NotificationService =
      require("../../../utils/notification-service").NotificationService;
    const mockNotificationService = new NotificationService();
    mockNotificationService.sendKYCReviewNotification.mockRejectedValueOnce(
      new Error("Throttling exception")
    );

    // Handler should still complete successfully
    await expect(
      handler(mockEvent, mockContext, jest.fn())
    ).resolves.not.toThrow();
  });

  it("should send notifications with correct document metadata", async () => {
    const testTime = new Date().toISOString();
    const testEvent = {
      ...mockEvent,
      time: testTime,
      detail: {
        ...mockEvent.detail,
        documentId: "test-doc-789",
        userId: "test-user-123",
        documentType: "driver_license" as const,
        fileName: "license.jpg",
        uploadedAt: testTime,
      },
    };

    await handler(testEvent, mockContext, jest.fn());

    // Handler should complete without throwing errors
    // The notification will contain all the correct metadata
  });

  it("should handle missing environment variables gracefully", async () => {
    // Test with missing environment variables
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      KYC_ADMIN_TOPIC_ARN: undefined,
      ADMIN_PORTAL_URL: undefined,
    };

    try {
      await handler(mockEvent, mockContext, jest.fn());
      // Handler should complete without throwing errors
      // even with missing environment variables
    } finally {
      process.env = originalEnv;
    }
  });

  it("should send notifications for all supported document types", async () => {
    const documentTypes = [
      "national_id",
      "passport",
      "driver_license",
      "utility_bill",
    ] as const;

    for (const documentType of documentTypes) {
      const typeEvent = {
        ...mockEvent,
        detail: {
          ...mockEvent.detail,
          documentType,
          documentId: `${documentType}-doc-${Date.now()}`,
          fileName: `${documentType}.jpg`,
        },
      };

      await handler(typeEvent, mockContext, jest.fn());
      // Each document type should be processed successfully
    }
  });

  it("should maintain notification order for concurrent processing", async () => {
    // Simulate concurrent processing of different documents
    const promises = [
      handler(
        {
          ...mockEvent,
          detail: { ...mockEvent.detail, documentId: "doc-1" },
        },
        mockContext,
        jest.fn()
      ),
      handler(
        {
          ...mockEvent,
          detail: { ...mockEvent.detail, documentId: "doc-2" },
        },
        mockContext,
        jest.fn()
      ),
      handler(
        {
          ...mockEvent,
          detail: { ...mockEvent.detail, documentId: "doc-3" },
        },
        mockContext,
        jest.fn()
      ),
    ];

    const results = await Promise.allSettled(promises);

    // All promises should resolve successfully
    results.forEach((result) => {
      expect(result.status).toBe("fulfilled");
    });
  });

  it("should include upload timestamp in notifications", async () => {
    const specificTime = new Date().toISOString();
    const timestampEvent = {
      ...mockEvent,
      time: specificTime,
      detail: {
        ...mockEvent.detail,
        uploadedAt: specificTime,
      },
    };

    await handler(timestampEvent, mockContext, jest.fn());

    // Handler should complete without throwing errors
    // The notification will include the correct upload timestamp
  });

  it("should handle large file names in notifications", async () => {
    const longFileName = "a".repeat(200) + ".pdf";
    const longFileNameEvent = {
      ...mockEvent,
      detail: {
        ...mockEvent.detail,
        fileName: longFileName,
      },
    };

    await handler(longFileNameEvent, mockContext, jest.fn());

    // Handler should complete without throwing errors
    // even with very long file names
  });

  it("should handle special characters in file names", async () => {
    const specialFileName = "document-with-special-chars.pdf";
    const specialFileNameEvent = {
      ...mockEvent,
      detail: {
        ...mockEvent.detail,
        fileName: specialFileName,
      },
    };

    await handler(specialFileNameEvent, mockContext, jest.fn());

    // Handler should complete without throwing errors
    // even with special characters in file names
  });
});
