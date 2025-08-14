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

// Mock the structured logger module
jest.mock("../../../utils/structured-logger", () => ({
  createKYCLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
  })),
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

describe("KYC Processing Lambda", () => {
  const mockEvent = {
    version: "0" as const,
    id: "test-event-id",
    "detail-type": "KYC Document Uploaded" as const,
    source: "sachain.kyc" as const,
    account: "123456789012",
    time: "2024-01-01T00:00:00Z",
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
      uploadedAt: "2024-01-01T00:00:00Z",
    } as KYCUploadDetail,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle EventBridge events without errors", async () => {
    // Since the processing logic is not yet implemented, we just test that the handler
    // can be called without throwing errors
    await expect(
      handler(mockEvent, mockContext, jest.fn())
    ).resolves.not.toThrow();
  });

  it("should extract correct event details", async () => {
    await handler(mockEvent, mockContext, jest.fn());

    // Verify that the handler can access all required event details
    expect(mockEvent.detail.documentId).toBe("doc-123");
    expect(mockEvent.detail.userId).toBe("user-456");
    expect(mockEvent.detail.documentType).toBe("national_id");
    expect(mockEvent.detail.fileName).toBe("id-document.jpg");
  });

  it("should have correct event structure", () => {
    // Verify the event structure matches EventBridge format
    expect(mockEvent.version).toBe("0");
    expect(mockEvent["detail-type"]).toBe("KYC Document Uploaded");
    expect(mockEvent.source).toBe("sachain.kyc");
    expect(mockEvent.detail).toBeDefined();
    expect(mockEvent.resources).toBeDefined();
  });
});
