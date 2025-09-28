/**
 * Unit tests for ImageUploadService
 */

import {
  ImageUploadService,
  ImageUploadConfig,
  ImageUploadError,
  createProjectImageConfig,
} from "../image-upload";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3");
jest.mock("sharp");

const mockS3Client = {
  send: jest.fn(),
};

const mockSharp = {
  metadata: jest.fn(),
  resize: jest.fn(),
  jpeg: jest.fn(),
  toBuffer: jest.fn(),
};

// Mock Sharp constructor
(sharp as any).mockImplementation(() => mockSharp);

// Mock S3Client constructor
(S3Client as jest.Mock).mockImplementation(() => mockS3Client);

describe("ImageUploadService", () => {
  let service: ImageUploadService;
  let config: ImageUploadConfig;

  beforeEach(() => {
    config = createProjectImageConfig("test-bucket", "us-east-1");
    service = new ImageUploadService(config);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockSharp.resize.mockReturnValue(mockSharp);
    mockSharp.jpeg.mockReturnValue(mockSharp);
    mockSharp.toBuffer.mockResolvedValue(Buffer.from("thumbnail"));
    mockS3Client.send.mockResolvedValue({});
  });

  describe("validateImage", () => {
    const validImageBuffer = Buffer.from("fake-image-data");
    const validFileName = "test-image.jpg";
    const validMimeType = "image/jpeg";

    beforeEach(() => {
      mockSharp.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: "jpeg",
      });
    });

    it("should validate a valid image successfully", async () => {
      const result = await service.validateImage(
        validImageBuffer,
        validFileName,
        validMimeType
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.imageInfo).toEqual({
        width: 800,
        height: 600,
        format: "jpeg",
        size: validImageBuffer.length,
      });
    });

    it("should reject empty image buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await service.validateImage(
        emptyBuffer,
        validFileName,
        validMimeType
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Image file is empty");
    });

    it("should reject oversized images", async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB (exceeds 5MB limit)
      const result = await service.validateImage(
        largeBuffer,
        validFileName,
        validMimeType
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes("exceeds maximum allowed size")
        )
      ).toBe(true);
    });

    it("should reject invalid MIME types", async () => {
      const result = await service.validateImage(
        validImageBuffer,
        validFileName,
        "image/gif"
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) => error.includes("Invalid image type"))
      ).toBe(true);
    });

    it("should reject invalid file extensions", async () => {
      const result = await service.validateImage(
        validImageBuffer,
        "test.gif",
        validMimeType
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) => error.includes("Invalid file extension"))
      ).toBe(true);
    });

    it("should reject images with dimensions too small", async () => {
      mockSharp.metadata.mockResolvedValue({
        width: 200,
        height: 150,
        format: "jpeg",
      });

      const result = await service.validateImage(
        validImageBuffer,
        validFileName,
        validMimeType
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) => error.includes("dimensions") && error.includes("too small")
        )
      ).toBe(true);
    });

    it("should reject images with format mismatch", async () => {
      mockSharp.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: "png", // Format doesn't match MIME type
      });

      const result = await service.validateImage(
        validImageBuffer,
        validFileName,
        validMimeType
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) =>
            error.includes("format") && error.includes("does not match")
        )
      ).toBe(true);
    });

    it("should handle Sharp processing errors", async () => {
      mockSharp.metadata.mockRejectedValue(new Error("Invalid image format"));

      const result = await service.validateImage(
        validImageBuffer,
        validFileName,
        validMimeType
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) => error.includes("Failed to process image"))
      ).toBe(true);
    });

    it("should reject images without readable dimensions", async () => {
      mockSharp.metadata.mockResolvedValue({
        format: "jpeg",
        // Missing width and height
      });

      const result = await service.validateImage(
        validImageBuffer,
        validFileName,
        validMimeType
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Unable to read image dimensions");
    });
  });

  describe("uploadImage", () => {
    const validRequest = {
      imageBuffer: Buffer.from("fake-image-data"),
      fileName: "test-image.jpg",
      mimeType: "image/jpeg",
      projectId: "project-123",
      userId: "user-456",
    };

    beforeEach(() => {
      mockSharp.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: "jpeg",
      });
    });

    it("should upload image and generate thumbnails successfully", async () => {
      const result = await service.uploadImage(validRequest);

      expect(result.success).toBe(true);
      expect(result.originalImageUrl).toContain(
        "project-images/project-123/user-456"
      );
      expect(result.originalImageUrl).toContain("/original.jpg");
      expect(result.thumbnails).toHaveLength(3); // small, medium, large

      // Verify S3 uploads (original + 3 thumbnails = 4 calls)
      expect(mockS3Client.send).toHaveBeenCalledTimes(4);

      // Verify thumbnail generation
      expect(mockSharp.resize).toHaveBeenCalledTimes(3);
      expect(mockSharp.resize).toHaveBeenCalledWith(150, 150, {
        fit: "cover",
        position: "center",
      });
      expect(mockSharp.resize).toHaveBeenCalledWith(300, 225, {
        fit: "cover",
        position: "center",
      });
      expect(mockSharp.resize).toHaveBeenCalledWith(600, 450, {
        fit: "cover",
        position: "center",
      });
    });

    it("should fail upload when image validation fails", async () => {
      const invalidRequest = {
        ...validRequest,
        imageBuffer: Buffer.alloc(0), // Empty buffer
      };

      const result = await service.uploadImage(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Image validation failed");
      expect(mockS3Client.send).not.toHaveBeenCalled();
    });

    it("should handle S3 upload failures", async () => {
      mockS3Client.send.mockRejectedValue(new Error("S3 upload failed"));

      const result = await service.uploadImage(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to upload image. Please try again.");
    });

    it("should continue with other thumbnails if one fails", async () => {
      // Make the second thumbnail generation fail
      mockSharp.toBuffer
        .mockResolvedValueOnce(Buffer.from("thumbnail1"))
        .mockRejectedValueOnce(new Error("Thumbnail generation failed"))
        .mockResolvedValueOnce(Buffer.from("thumbnail3"));

      const result = await service.uploadImage(validRequest);

      expect(result.success).toBe(true);
      expect(result.thumbnails).toHaveLength(2); // Only 2 successful thumbnails
    });

    it("should generate correct S3 keys", async () => {
      await service.uploadImage(validRequest);

      // Verify S3 uploads (original + 3 thumbnails = 4 calls)
      expect(mockS3Client.send).toHaveBeenCalledTimes(4);

      // Verify all calls are PutObjectCommand instances
      const calls = mockS3Client.send.mock.calls;
      calls.forEach((call) => {
        expect(call[0]).toBeInstanceOf(PutObjectCommand);
      });
    });

    it("should generate correct thumbnail keys", async () => {
      await service.uploadImage(validRequest);

      // Verify correct number of S3 calls (original + 3 thumbnails)
      expect(mockS3Client.send).toHaveBeenCalledTimes(4);

      // Verify Sharp resize was called for each thumbnail size
      expect(mockSharp.resize).toHaveBeenCalledTimes(3);
      expect(mockSharp.resize).toHaveBeenCalledWith(150, 150, {
        fit: "cover",
        position: "center",
      });
      expect(mockSharp.resize).toHaveBeenCalledWith(300, 225, {
        fit: "cover",
        position: "center",
      });
      expect(mockSharp.resize).toHaveBeenCalledWith(600, 450, {
        fit: "cover",
        position: "center",
      });
    });
  });

  describe("deleteImage", () => {
    const testImageUrl =
      "https://test-bucket.s3.us-east-1.amazonaws.com/project-images/project-123/user-456/2024-01-01/uuid/original.jpg";

    it("should delete image and all thumbnails successfully", async () => {
      const result = await service.deleteImage(testImageUrl);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Should delete original + 3 thumbnails = 4 delete operations
      expect(mockS3Client.send).toHaveBeenCalledTimes(4);

      // Verify all calls are DeleteObjectCommand instances
      const calls = mockS3Client.send.mock.calls;
      calls.forEach((call) => {
        expect(call[0]).toBeInstanceOf(DeleteObjectCommand);
      });
    });

    it("should handle invalid image URLs", async () => {
      const invalidUrl = "https://invalid-url.com/image.jpg";

      const result = await service.deleteImage(invalidUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid image URL");
      expect(mockS3Client.send).not.toHaveBeenCalled();
    });

    it("should handle S3 deletion failures", async () => {
      mockS3Client.send.mockRejectedValue(new Error("S3 delete failed"));

      const result = await service.deleteImage(testImageUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to delete image");
    });
  });

  describe("createProjectImageConfig", () => {
    it("should create correct configuration for project images", () => {
      const config = createProjectImageConfig("my-bucket", "us-west-2");

      expect(config).toEqual({
        bucketName: "my-bucket",
        region: "us-west-2",
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ["image/jpeg", "image/png"],
        allowedExtensions: [".jpg", ".jpeg", ".png"],
        minWidth: 400,
        minHeight: 300,
        thumbnailSizes: [
          { width: 150, height: 150, suffix: "small" },
          { width: 300, height: 225, suffix: "medium" },
          { width: 600, height: 450, suffix: "large" },
        ],
      });
    });
  });

  describe("error handling", () => {
    it("should create ImageUploadError with correct properties", () => {
      const error = new ImageUploadError("Test error", "TEST_CODE", 400);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("ImageUploadError");
    });
  });

  describe("private methods", () => {
    it("should extract correct key from S3 URL", () => {
      const url =
        "https://test-bucket.s3.us-east-1.amazonaws.com/project-images/test/key.jpg";

      // Access private method through any
      const key = (service as any).extractKeyFromUrl(url);

      expect(key).toBe("project-images/test/key.jpg");
    });

    it("should return null for invalid URLs", () => {
      const invalidUrl = "https://invalid-url.com/image.jpg";

      const key = (service as any).extractKeyFromUrl(invalidUrl);

      expect(key).toBeNull();
    });

    it("should get correct file extension", () => {
      const getFileExtension = (service as any).getFileExtension.bind(service);

      expect(getFileExtension("test.jpg")).toBe(".jpg");
      expect(getFileExtension("test.jpeg")).toBe(".jpeg");
      expect(getFileExtension("test.png")).toBe(".png");
      expect(getFileExtension("test")).toBe("");
    });

    it("should convert MIME types to Sharp formats correctly", () => {
      const mimeTypeToFormat = (service as any).mimeTypeToFormat.bind(service);

      expect(mimeTypeToFormat("image/jpeg")).toBe("jpeg");
      expect(mimeTypeToFormat("image/png")).toBe("png");
      expect(mimeTypeToFormat("image/webp")).toBe("webp");
      expect(mimeTypeToFormat("image/gif")).toBe("unknown");
    });

    it("should generate correct image URLs", () => {
      const getImageUrl = (service as any).getImageUrl.bind(service);

      const url = getImageUrl("project-images/test/image.jpg");

      expect(url).toBe(
        "https://test-bucket.s3.us-east-1.amazonaws.com/project-images/test/image.jpg"
      );
    });

    it("should generate unique image keys", () => {
      const generateImageKey = (service as any).generateImageKey.bind(service);

      const key1 = generateImageKey("project1", "user1", "uuid1");
      const key2 = generateImageKey("project1", "user1", "uuid2");

      expect(key1).toMatch(
        /^project-images\/project1\/user1\/\d{4}-\d{2}-\d{2}\/uuid1$/
      );
      expect(key2).toMatch(
        /^project-images\/project1\/user1\/\d{4}-\d{2}-\d{2}\/uuid2$/
      );
      expect(key1).not.toBe(key2);
    });
  });

  describe("logging", () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "log").mockImplementation();
      jest.spyOn(console, "error").mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should log successful image upload", async () => {
      mockSharp.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: "jpeg",
      });

      const request = {
        imageBuffer: Buffer.from("fake-image-data"),
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        projectId: "project-123",
        userId: "user-456",
      };

      await service.uploadImage(request);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"service":"ImageUpload"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"uploadImage"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Image uploaded successfully"')
      );
    });

    it("should log image upload errors", async () => {
      mockS3Client.send.mockRejectedValue(new Error("S3 error"));
      mockSharp.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: "jpeg",
      });

      const request = {
        imageBuffer: Buffer.from("fake-image-data"),
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        projectId: "project-123",
        userId: "user-456",
      };

      await service.uploadImage(request);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('"level":"ERROR"')
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"uploadImage"')
      );
    });
  });
});
