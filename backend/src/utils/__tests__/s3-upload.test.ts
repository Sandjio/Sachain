/**
 * Unit tests for S3 upload utilities
 * Tests file validation, upload functionality, retry logic, and error handling
 */

import * as AWS from "aws-sdk";
import {
  S3UploadUtility,
  S3UploadConfig,
  S3UploadRequest,
  S3UploadError,
  createKYCUploadConfig,
  createKYCUploadUtility,
} from "../s3-upload";
import { ErrorCategory } from "../error-handler";

// Mock AWS SDK
jest.mock("aws-sdk");

const mockS3 = {
  upload: jest.fn(),
  getSignedUrlPromise: jest.fn(),
  deleteObject: jest.fn(),
  headObject: jest.fn(),
};

const mockS3Constructor = AWS.S3 as jest.MockedClass<typeof AWS.S3>;
mockS3Constructor.mockImplementation(() => mockS3 as any);

describe("S3UploadUtility", () => {
  let s3Upload: S3UploadUtility;
  let config: S3UploadConfig;

  const createValidUploadRequest = (): S3UploadRequest => ({
    fileBuffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(1000).fill(0)]),
    fileName: "national-id.jpg",
    mimeType: "image/jpeg",
    userId: "user123",
    documentType: "national_id",
    metadata: {
      "custom-field": "custom-value",
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      bucketName: "test-bucket",
      region: "us-east-1",
      kmsKeyId: "test-kms-key",
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
      allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"],
      retryConfig: {
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 1000,
      },
    };

    s3Upload = new S3UploadUtility(config);

    // Setup console mocks
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("File Validation", () => {
    it("should validate a valid JPEG file", () => {
      // Create a buffer with JPEG header
      const jpegBuffer = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xe0,
        ...Array(100).fill(0),
      ]);

      const result = s3Upload.validateFile(
        jpegBuffer,
        "test.jpg",
        "image/jpeg"
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileInfo).toEqual({
        size: jpegBuffer.length,
        mimeType: "image/jpeg",
        extension: ".jpg",
      });
    });

    it("should validate a valid PNG file", () => {
      // Create a buffer with PNG header
      const pngBuffer = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        ...Array(100).fill(0),
      ]);

      const result = s3Upload.validateFile(pngBuffer, "test.png", "image/png");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileInfo?.extension).toBe(".png");
    });

    it("should validate a valid PDF file", () => {
      // Create a buffer with PDF header
      const pdfBuffer = Buffer.from([
        0x25,
        0x50,
        0x44,
        0x46,
        ...Array(100).fill(0),
      ]);

      const result = s3Upload.validateFile(
        pdfBuffer,
        "test.pdf",
        "application/pdf"
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileInfo?.extension).toBe(".pdf");
    });

    it("should reject file that exceeds maximum size", () => {
      const largeBuffer = Buffer.alloc(config.maxFileSize + 1);

      const result = s3Upload.validateFile(
        largeBuffer,
        "large.jpg",
        "image/jpeg"
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining("exceeds maximum allowed size")
      );
    });

    it("should reject empty file", () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = s3Upload.validateFile(
        emptyBuffer,
        "empty.jpg",
        "image/jpeg"
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("File is empty");
    });

    it("should reject disallowed MIME type", () => {
      const buffer = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xe0,
        ...Array(100).fill(0),
      ]);

      const result = s3Upload.validateFile(buffer, "test.gif", "image/gif");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining("MIME type image/gif is not allowed")
      );
    });

    it("should reject disallowed file extension", () => {
      const buffer = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xe0,
        ...Array(100).fill(0),
      ]);

      const result = s3Upload.validateFile(buffer, "test.gif", "image/jpeg");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining("File extension .gif is not allowed")
      );
    });

    it("should reject file with invalid JPEG header", () => {
      const invalidBuffer = Buffer.from([
        0x00,
        0x00,
        0x00,
        0x00,
        ...Array(100).fill(0),
      ]);

      const result = s3Upload.validateFile(
        invalidBuffer,
        "test.jpg",
        "image/jpeg"
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "File does not appear to be a valid JPEG image"
      );
    });

    it("should reject file with invalid PNG header", () => {
      const invalidBuffer = Buffer.from([
        0x00,
        0x00,
        0x00,
        0x00,
        ...Array(100).fill(0),
      ]);

      const result = s3Upload.validateFile(
        invalidBuffer,
        "test.png",
        "image/png"
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "File does not appear to be a valid PNG image"
      );
    });

    it("should reject file with invalid PDF header", () => {
      const invalidBuffer = Buffer.from([
        0x00,
        0x00,
        0x00,
        0x00,
        ...Array(100).fill(0),
      ]);

      const result = s3Upload.validateFile(
        invalidBuffer,
        "test.pdf",
        "application/pdf"
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "File does not appear to be a valid PDF document"
      );
    });

    it("should handle file too small to validate", () => {
      const tinyBuffer = Buffer.from([0xff, 0xd8]); // Only 2 bytes

      const result = s3Upload.validateFile(
        tinyBuffer,
        "tiny.jpg",
        "image/jpeg"
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("File is too small to validate format");
    });
  });

  describe("File Upload", () => {
    it("should successfully upload a valid file", async () => {
      const request = createValidUploadRequest();
      const mockUploadResult = {
        ETag: '"abc123"',
        VersionId: "version123",
        Location: "https://test-bucket.s3.amazonaws.com/test-key",
      };

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockUploadResult),
      });

      const result = await s3Upload.uploadFile(request);

      expect(result.success).toBe(true);
      expect(result.s3Bucket).toBe(config.bucketName);
      expect(result.fileSize).toBe(request.fileBuffer.length);
      expect(result.etag).toBe(mockUploadResult.ETag);
      expect(result.versionId).toBe(mockUploadResult.VersionId);
      expect(result.s3Key).toMatch(
        /^kyc-documents\/user123\/national_id\/\d{4}-\d{2}-\d{2}\//
      );
      expect(result.uploadId).toBeDefined();
    });

    it("should call S3 upload with correct parameters", async () => {
      const request = createValidUploadRequest();

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ ETag: '"abc123"' }),
      });

      await s3Upload.uploadFile(request);

      expect(mockS3.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: config.bucketName,
          Body: request.fileBuffer,
          ContentType: request.mimeType,
          ContentLength: request.fileBuffer.length,
          ServerSideEncryption: "aws:kms",
          SSEKMSKeyId: config.kmsKeyId,
          Metadata: expect.objectContaining({
            "original-filename": request.fileName,
            "user-id": request.userId,
            "document-type": request.documentType,
            "custom-field": "custom-value",
          }),
          Tagging: expect.stringContaining("user-id=user123"),
        })
      );
    });

    it("should reject upload of invalid file", async () => {
      const request: S3UploadRequest = {
        fileBuffer: Buffer.alloc(config.maxFileSize + 1), // Too large
        fileName: "large.jpg",
        mimeType: "image/jpeg",
        userId: "user123",
        documentType: "national_id",
      };

      const result = await s3Upload.uploadFile(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("File validation failed");
      expect(mockS3.upload).not.toHaveBeenCalled();
    });

    it("should retry on transient S3 errors", async () => {
      const request = createValidUploadRequest();

      mockS3.upload
        .mockReturnValueOnce({
          promise: jest.fn().mockRejectedValue(new Error("ServiceUnavailable")),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockRejectedValue(new Error("SlowDown")),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({ ETag: '"abc123"' }),
        });

      const result = await s3Upload.uploadFile(request);

      expect(result.success).toBe(true);
      expect(mockS3.upload).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries", async () => {
      const request = createValidUploadRequest();

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("ServiceUnavailable")),
      });

      const result = await s3Upload.uploadFile(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockS3.upload).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should not retry on non-retryable errors", async () => {
      const request = createValidUploadRequest();

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("AccessDenied")),
      });

      const result = await s3Upload.uploadFile(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockS3.upload).toHaveBeenCalledTimes(1); // No retries
    });

    it("should generate unique S3 keys for different uploads", async () => {
      const request1 = createValidUploadRequest();
      const request2 = { ...createValidUploadRequest(), userId: "user456" };

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ ETag: '"abc123"' }),
      });

      const result1 = await s3Upload.uploadFile(request1);
      const result2 = await s3Upload.uploadFile(request2);

      expect(result1.s3Key).not.toBe(result2.s3Key);
      expect(result1.uploadId).not.toBe(result2.uploadId);
    });
  });

  describe("Presigned URL Generation", () => {
    it("should generate presigned URL for getObject", async () => {
      const testUrl =
        "https://test-bucket.s3.amazonaws.com/test-key?signature=abc";
      mockS3.getSignedUrlPromise.mockResolvedValue(testUrl);

      const result = await s3Upload.generatePresignedUrl({
        s3Key: "test-key",
        operation: "getObject",
        expiresIn: 3600,
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe(testUrl);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith("getObject", {
        Bucket: config.bucketName,
        Key: "test-key",
        Expires: 3600,
      });
    });

    it("should generate presigned URL for putObject", async () => {
      const testUrl =
        "https://test-bucket.s3.amazonaws.com/test-key?signature=abc";
      mockS3.getSignedUrlPromise.mockResolvedValue(testUrl);

      const result = await s3Upload.generatePresignedUrl({
        s3Key: "test-key",
        operation: "putObject",
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe(testUrl);
      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith("putObject", {
        Bucket: config.bucketName,
        Key: "test-key",
        Expires: 3600, // Default
      });
    });

    it("should handle presigned URL generation errors", async () => {
      mockS3.getSignedUrlPromise.mockRejectedValue(new Error("AccessDenied"));

      const result = await s3Upload.generatePresignedUrl({
        s3Key: "test-key",
        operation: "getObject",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.url).toBeUndefined();
    });
  });

  describe("File Deletion", () => {
    it("should successfully delete a file", async () => {
      mockS3.deleteObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const result = await s3Upload.deleteFile("test-key");

      expect(result.success).toBe(true);
      expect(mockS3.deleteObject).toHaveBeenCalledWith({
        Bucket: config.bucketName,
        Key: "test-key",
      });
    });

    it("should handle deletion errors", async () => {
      mockS3.deleteObject.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("AccessDenied")),
      });

      const result = await s3Upload.deleteFile("test-key");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should retry deletion on transient errors", async () => {
      mockS3.deleteObject
        .mockReturnValueOnce({
          promise: jest.fn().mockRejectedValue(new Error("ServiceUnavailable")),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({}),
        });

      const result = await s3Upload.deleteFile("test-key");

      expect(result.success).toBe(true);
      expect(mockS3.deleteObject).toHaveBeenCalledTimes(2);
    });
  });

  describe("File Existence Check", () => {
    it("should return true if file exists", async () => {
      mockS3.headObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const exists = await s3Upload.fileExists("test-key");

      expect(exists).toBe(true);
      expect(mockS3.headObject).toHaveBeenCalledWith({
        Bucket: config.bucketName,
        Key: "test-key",
      });
    });

    it("should return false if file does not exist", async () => {
      const error = new Error("Not Found");
      (error as any).statusCode = 404;

      mockS3.headObject.mockReturnValue({
        promise: jest.fn().mockRejectedValue(error),
      });

      const exists = await s3Upload.fileExists("test-key");

      expect(exists).toBe(false);
    });

    it("should throw error for non-404 errors", async () => {
      const error = new Error("Access Denied");
      (error as any).statusCode = 403;

      mockS3.headObject.mockReturnValue({
        promise: jest.fn().mockRejectedValue(error),
      });

      await expect(s3Upload.fileExists("test-key")).rejects.toThrow(
        "Access Denied"
      );
    });
  });

  describe("Error Classification", () => {
    it("should classify S3 errors correctly", async () => {
      const request = createValidUploadRequest();

      // Test different error types
      const testCases = [
        { error: "NoSuchBucket", expectedCategory: ErrorCategory.SYSTEM },
        {
          error: "AccessDenied",
          expectedCategory: ErrorCategory.AUTHORIZATION,
        },
        { error: "EntityTooLarge", expectedCategory: ErrorCategory.VALIDATION },
        { error: "SlowDown", expectedCategory: ErrorCategory.RATE_LIMIT },
        { error: "ServiceUnavailable", expectedCategory: ErrorCategory.SYSTEM },
      ];

      for (const testCase of testCases) {
        mockS3.upload.mockReturnValue({
          promise: jest.fn().mockRejectedValue(new Error(testCase.error)),
        });

        const result = await s3Upload.uploadFile(request);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("Utility Functions", () => {
    it("should create KYC upload config with correct defaults", () => {
      const config = createKYCUploadConfig(
        "test-bucket",
        "us-east-1",
        "test-key"
      );

      expect(config).toEqual({
        bucketName: "test-bucket",
        region: "us-east-1",
        kmsKeyId: "test-key",
        maxFileSize: 10 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
        allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"],
        retryConfig: {
          maxRetries: 3,
          baseDelay: 200,
          maxDelay: 10000,
          jitterType: "full",
        },
      });
    });

    it("should create KYC upload utility", () => {
      const utility = createKYCUploadUtility("test-bucket", "us-east-1");
      expect(utility).toBeInstanceOf(S3UploadUtility);
    });
  });

  describe("S3 Key Generation", () => {
    it("should generate properly formatted S3 keys", async () => {
      const request = createValidUploadRequest();

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ ETag: '"abc123"' }),
      });

      const result = await s3Upload.uploadFile(request);

      expect(result.s3Key).toMatch(
        /^kyc-documents\/user123\/national_id\/\d{4}-\d{2}-\d{2}\/[a-z0-9]+-national-id\.jpg$/
      );
    });

    it("should sanitize filenames in S3 keys", async () => {
      const request = {
        ...createValidUploadRequest(),
        fileName: "My National ID Card (Copy).jpg",
      };

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ ETag: '"abc123"' }),
      });

      const result = await s3Upload.uploadFile(request);

      expect(result.s3Key).toMatch(/my-national-id-card-copy\.jpg$/);
    });
  });

  describe("Logging", () => {
    it("should log successful uploads", async () => {
      const request = createValidUploadRequest();

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ ETag: '"abc123"' }),
      });

      await s3Upload.uploadFile(request);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"message":"File uploaded successfully"')
      );
    });

    it("should log upload errors", async () => {
      const request = createValidUploadRequest();

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("Test error")),
      });

      await s3Upload.uploadFile(request);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('"message":"File upload failed"')
      );
    });

    it("should log presigned URL generation", async () => {
      mockS3.getSignedUrlPromise.mockResolvedValue("test-url");

      await s3Upload.generatePresignedUrl({
        s3Key: "test-key",
        operation: "getObject",
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Presigned URL generated"')
      );
    });
  });
});
