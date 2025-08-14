/**
 * Unit tests for S3 direct upload utility
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  S3DirectUploadUtility,
  createKYCDirectUploadUtility,
} from "../s3-direct-upload";
import { ErrorCategory } from "../error-handler";

// Mock S3Client
jest.mock("@aws-sdk/client-s3");
const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const mockSend = jest.fn();

// Mock ExponentialBackoff
jest.mock("../retry", () => ({
  ExponentialBackoff: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockImplementation(async (fn) => {
      const result = await fn();
      return { result };
    }),
  })),
}));

describe("S3DirectUploadUtility", () => {
  let uploadUtility: S3DirectUploadUtility;
  const mockConfig = {
    bucketName: "test-bucket",
    region: "us-east-1",
    kmsKeyId: "test-kms-key",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Client.prototype.send = mockSend;
    uploadUtility = new S3DirectUploadUtility(mockConfig);
  });

  describe("uploadFile", () => {
    const validUploadRequest = {
      fileBuffer: Buffer.from("test file content"),
      fileName: "test-document.jpg",
      contentType: "image/jpeg",
      userId: "user123",
      documentType: "national_id",
      documentId: "doc123",
      metadata: {
        customField: "customValue",
      },
    };

    it("should upload file successfully", async () => {
      const mockResponse = {
        ETag: '"test-etag"',
        VersionId: "test-version-id",
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await uploadUtility.uploadFile(validUploadRequest);

      expect(result.success).toBe(true);
      expect(result.s3Key).toContain("kyc-documents/user123/national_id");
      expect(result.s3Key).toContain("doc123-test-document.jpg");
      expect(result.s3Bucket).toBe("test-bucket");
      expect(result.fileSize).toBe(validUploadRequest.fileBuffer.length);
      expect(result.etag).toBe('"test-etag"');
      expect(result.versionId).toBe("test-version-id");

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));

      // Verify that S3 send was called
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it("should handle S3 upload failure", async () => {
      const mockError = new Error("S3 upload failed");
      mockError.name = "ServiceUnavailable";
      mockSend.mockRejectedValueOnce(mockError);

      const result = await uploadUtility.uploadFile(validUploadRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Upload service is temporarily unavailable. Please try again."
      );
      expect(result.s3Key).toContain("kyc-documents/user123/national_id");
      expect(result.fileSize).toBe(validUploadRequest.fileBuffer.length);
    });

    it("should handle access denied error", async () => {
      const mockError = new Error("Access denied");
      mockError.name = "AccessDenied";
      mockSend.mockRejectedValueOnce(mockError);

      const result = await uploadUtility.uploadFile(validUploadRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe("You do not have permission to upload files.");
    });

    it("should handle entity too large error", async () => {
      const mockError = new Error("Entity too large");
      mockError.name = "EntityTooLarge";
      mockSend.mockRejectedValueOnce(mockError);

      const result = await uploadUtility.uploadFile(validUploadRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe("File is too large to upload.");
    });

    it("should handle rate limit error", async () => {
      const mockError = new Error("Slow down");
      mockError.name = "SlowDown";
      mockSend.mockRejectedValueOnce(mockError);

      const result = await uploadUtility.uploadFile(validUploadRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Upload service is busy. Please try again in a moment."
      );
    });

    it("should handle timeout error", async () => {
      const mockError = new Error("Request timeout");
      mockError.name = "RequestTimeout";
      mockSend.mockRejectedValueOnce(mockError);

      const result = await uploadUtility.uploadFile(validUploadRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Upload timed out. Please try again.");
    });

    it("should handle unknown error", async () => {
      const mockError = new Error("Unknown error");
      mockSend.mockRejectedValueOnce(mockError);

      const result = await uploadUtility.uploadFile(validUploadRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Upload failed. Please try again or contact support."
      );
    });

    it("should work without KMS key", async () => {
      const configWithoutKMS = {
        bucketName: "test-bucket",
        region: "us-east-1",
      };
      const utilityWithoutKMS = new S3DirectUploadUtility(configWithoutKMS);

      const mockResponse = {
        ETag: '"test-etag"',
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await utilityWithoutKMS.uploadFile(validUploadRequest);

      expect(result.success).toBe(true);

      // Verify that S3 send was called
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it("should work without additional metadata", async () => {
      const requestWithoutMetadata = {
        ...validUploadRequest,
        metadata: undefined,
      };

      const mockResponse = {
        ETag: '"test-etag"',
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await uploadUtility.uploadFile(requestWithoutMetadata);

      expect(result.success).toBe(true);

      // Verify that S3 send was called
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });
  });

  describe("S3 key generation", () => {
    it("should generate correct S3 key format", async () => {
      const mockResponse = {
        ETag: '"test-etag"',
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const request = {
        fileBuffer: Buffer.from("test"),
        fileName: "My Document.PDF",
        contentType: "application/pdf",
        userId: "user-123",
        documentType: "passport",
        documentId: "doc-456",
      };

      const result = await uploadUtility.uploadFile(request);

      expect(result.success).toBe(true);
      expect(result.s3Key).toMatch(
        /^kyc-documents\/user-123\/passport\/\d{4}-\d{2}-\d{2}\/doc-456-my-document\.pdf$/
      );
    });

    it("should sanitize file names properly", async () => {
      const mockResponse = {
        ETag: '"test-etag"',
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const request = {
        fileBuffer: Buffer.from("test"),
        fileName: "File with spaces & special chars!@#.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        documentType: "national_id",
        documentId: "doc123",
      };

      const result = await uploadUtility.uploadFile(request);

      expect(result.success).toBe(true);
      expect(result.s3Key).toContain(
        "doc123-file-with-spaces-special-chars-.jpg"
      );
    });
  });

  describe("Object tagging", () => {
    it("should set correct object tags", async () => {
      const mockResponse = {
        ETag: '"test-etag"',
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const request = {
        fileBuffer: Buffer.from("test"),
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        documentType: "passport",
        documentId: "doc123",
      };

      await uploadUtility.uploadFile(request);

      // Verify that S3 send was called
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });
  });

  describe("Error classification", () => {
    it("should classify NoSuchBucket error correctly", async () => {
      const mockError = new Error("Bucket not found");
      mockError.name = "NoSuchBucket";
      mockSend.mockRejectedValueOnce(mockError);

      const result = await uploadUtility.uploadFile({
        fileBuffer: Buffer.from("test"),
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        documentType: "national_id",
        documentId: "doc123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Storage service configuration error. Please contact support."
      );
    });

    it("should classify HTTP 500 errors as retryable", async () => {
      const mockError = new Error("Internal server error") as any;
      mockError.$metadata = { httpStatusCode: 500 };
      mockSend.mockRejectedValueOnce(mockError);

      const result = await uploadUtility.uploadFile({
        fileBuffer: Buffer.from("test"),
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        documentType: "national_id",
        documentId: "doc123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Upload service error. Please try again.");
    });

    it("should classify HTTP 429 errors as rate limit", async () => {
      const mockError = new Error("Too many requests") as any;
      mockError.$metadata = { httpStatusCode: 429 };
      mockSend.mockRejectedValueOnce(mockError);

      const result = await uploadUtility.uploadFile({
        fileBuffer: Buffer.from("test"),
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        documentType: "national_id",
        documentId: "doc123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Too many upload requests. Please try again in a moment."
      );
    });
  });

  describe("Factory function", () => {
    it("should create KYC direct upload utility with correct config", () => {
      const utility = createKYCDirectUploadUtility(
        "test-bucket",
        "us-west-2",
        "test-kms"
      );

      expect(utility).toBeInstanceOf(S3DirectUploadUtility);
    });

    it("should create KYC direct upload utility without KMS key", () => {
      const utility = createKYCDirectUploadUtility("test-bucket", "us-west-2");

      expect(utility).toBeInstanceOf(S3DirectUploadUtility);
    });
  });

  describe("Logging", () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should log successful uploads", async () => {
      const mockResponse = {
        ETag: '"test-etag"',
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      await uploadUtility.uploadFile({
        fileBuffer: Buffer.from("test"),
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        documentType: "national_id",
        documentId: "doc123",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"INFO"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"File uploaded successfully"')
      );
    });

    it("should log upload errors", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const mockError = new Error("Upload failed");
      mockSend.mockRejectedValueOnce(mockError);

      await uploadUtility.uploadFile({
        fileBuffer: Buffer.from("test"),
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        documentType: "national_id",
        documentId: "doc123",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"ERROR"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"File upload failed"')
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
