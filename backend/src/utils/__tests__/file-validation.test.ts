/**
 * Unit tests for file validation utility
 */

import {
  FileValidator,
  createKYCFileValidator,
  createKYCValidationConfig,
} from "../file-validation";

describe("FileValidator", () => {
  let validator: FileValidator;

  beforeEach(() => {
    validator = createKYCFileValidator();
  });

  describe("validateDirectUploadRequest", () => {
    const validRequest = {
      documentType: "national_id",
      fileName: "test-document.jpg",
      contentType: "image/jpeg",
      userId: "user123",
      fileContent: Buffer.from("test content").toString("base64"),
    };

    it("should validate a valid request successfully", () => {
      // Create a valid JPEG buffer
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const jpegEnd = Buffer.from([0xff, 0xd9]);
      const jpegBuffer = Buffer.concat([
        jpegHeader,
        Buffer.alloc(100),
        jpegEnd,
      ]);

      const request = {
        ...validRequest,
        fileContent: jpegBuffer.toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileInfo).toBeDefined();
      expect(result.fileInfo?.mimeType).toBe("image/jpeg");
      expect(result.fileInfo?.extension).toBe(".jpg");
    });

    it("should reject request with missing required fields", () => {
      const request = {
        documentType: "",
        fileName: "",
        contentType: "",
        userId: "",
        fileContent: "",
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Document type is required and must be a string"
      );
      expect(result.errors).toContain(
        "File name is required and must be a string"
      );
      expect(result.errors).toContain(
        "Content type is required and must be a string"
      );
      expect(result.errors).toContain(
        "User ID is required and must be a string"
      );
      expect(result.errors).toContain(
        "File content is required and must be a base64 string"
      );
    });

    it("should reject invalid document type", () => {
      const request = {
        ...validRequest,
        documentType: "invalid_type",
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid document type. Allowed types: passport, driver_license, national_id, utility_bill"
      );
    });

    it("should reject invalid file name format", () => {
      const request = {
        ...validRequest,
        fileName: "invalid file name.txt",
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid file name format. Must contain only alphanumeric characters, dots, underscores, hyphens, and have a valid extension (.jpg, .jpeg, .png, .pdf)"
      );
    });

    it("should reject invalid file extension", () => {
      const request = {
        ...validRequest,
        fileName: "document.txt",
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid file extension. Allowed extensions: .jpg, .jpeg, .png, .pdf"
      );
    });

    it("should reject invalid content type", () => {
      const request = {
        ...validRequest,
        contentType: "text/plain",
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid file type. Allowed types: image/jpeg, image/png, application/pdf"
      );
    });

    it("should handle USER# prefix in userId", () => {
      // Create a valid JPEG buffer
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const jpegEnd = Buffer.from([0xff, 0xd9]);
      const jpegBuffer = Buffer.concat([
        jpegHeader,
        Buffer.alloc(100),
        jpegEnd,
      ]);

      const request = {
        ...validRequest,
        userId: "USER#user123",
        fileContent: jpegBuffer.toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(true);
    });

    it("should reject invalid base64 content", () => {
      const request = {
        ...validRequest,
        fileContent: "invalid-base64!@#",
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      // The validation will try to decode and then validate the content
      // Since it's invalid base64, it should fail on content validation
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject empty file content", () => {
      const request = {
        ...validRequest,
        fileContent: "", // Empty string should be caught by required field validation
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "File content is required and must be a base64 string"
      );
    });

    it("should reject empty file buffer", () => {
      const request = {
        ...validRequest,
        fileContent: "", // Empty base64 string
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "File content is required and must be a base64 string"
      );
    });

    it("should reject file that exceeds maximum size", () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      const request = {
        ...validRequest,
        fileContent: largeBuffer.toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes("exceeds maximum allowed size")
        )
      ).toBe(true);
    });

    it("should reject file with mismatched content type and header", () => {
      // Create PNG header but declare as JPEG
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const pngBuffer = Buffer.concat([pngHeader, Buffer.alloc(100)]);

      const request = {
        ...validRequest,
        contentType: "image/jpeg", // Declared as JPEG
        fileContent: pngBuffer.toString("base64"), // But actually PNG
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "File content does not match declared type. Expected: image/jpeg, Detected: image/png"
      );
    });
  });

  describe("JPEG validation", () => {
    it("should validate valid JPEG file", () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const jpegEnd = Buffer.from([0xff, 0xd9]);
      const jpegBuffer = Buffer.concat([
        jpegHeader,
        Buffer.alloc(100),
        jpegEnd,
      ]);

      const request = {
        documentType: "national_id",
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent: jpegBuffer.toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.fileInfo?.actualMimeType).toBe("image/jpeg");
    });

    it("should reject invalid JPEG file", () => {
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);

      const request = {
        documentType: "national_id",
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent: invalidBuffer.toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "File does not appear to be a valid JPEG image"
      );
    });
  });

  describe("PNG validation", () => {
    it("should validate valid PNG file", () => {
      const pngSignature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const pngBuffer = Buffer.concat([pngSignature, Buffer.alloc(100)]);

      const request = {
        documentType: "passport",
        fileName: "test.png",
        contentType: "image/png",
        userId: "user123",
        fileContent: pngBuffer.toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.fileInfo?.actualMimeType).toBe("image/png");
    });

    it("should reject invalid PNG file", () => {
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);

      const request = {
        documentType: "passport",
        fileName: "test.png",
        contentType: "image/png",
        userId: "user123",
        fileContent: invalidBuffer.toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "File does not appear to be a valid PNG image"
      );
    });
  });

  describe("PDF validation", () => {
    it("should validate valid PDF file", () => {
      const pdfHeader = Buffer.from("%PDF-1.4\n");
      const pdfBuffer = Buffer.concat([pdfHeader, Buffer.alloc(100)]);

      const request = {
        documentType: "utility_bill",
        fileName: "test.pdf",
        contentType: "application/pdf",
        userId: "user123",
        fileContent: pdfBuffer.toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.fileInfo?.actualMimeType).toBe("application/pdf");
    });

    it("should reject invalid PDF file", () => {
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);

      const request = {
        documentType: "utility_bill",
        fileName: "test.pdf",
        contentType: "application/pdf",
        userId: "user123",
        fileContent: invalidBuffer.toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "File does not appear to be a valid PDF document"
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle very long file names", () => {
      const longFileName = "a".repeat(252) + ".jpg"; // 252 + 4 = 256 characters

      const request = {
        documentType: "national_id",
        fileName: longFileName,
        contentType: "image/jpeg",
        userId: "user123",
        fileContent: Buffer.from("test").toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      // Check if the file name length validation is working
      expect(longFileName.length).toBeGreaterThan(255);
      // The validation should include file name length error
      expect(result.errors).toContain(
        "File name is too long (maximum 255 characters)"
      );
    });

    it("should handle very long user IDs", () => {
      const longUserId = "a".repeat(130);

      const request = {
        documentType: "national_id",
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: longUserId,
        fileContent: Buffer.from("test").toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "User ID is too long (maximum 128 characters)"
      );
    });

    it("should handle files that are too small to validate format", () => {
      const tinyBuffer = Buffer.from([0x01, 0x02]);

      const request = {
        documentType: "national_id",
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: "user123",
        fileContent: tinyBuffer.toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("File is too small to validate format");
    });

    it("should handle special characters in user ID", () => {
      const request = {
        documentType: "national_id",
        fileName: "test.jpg",
        contentType: "image/jpeg",
        userId: "user@123!",
        fileContent: Buffer.from("test").toString("base64"),
      };

      const result = validator.validateDirectUploadRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "User ID must contain only alphanumeric characters and hyphens"
      );
    });
  });

  describe("Factory functions", () => {
    it("should create KYC validation config with correct defaults", () => {
      const config = createKYCValidationConfig();

      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
      expect(config.allowedMimeTypes).toEqual([
        "image/jpeg",
        "image/png",
        "application/pdf",
      ]);
      expect(config.allowedExtensions).toEqual([
        ".jpg",
        ".jpeg",
        ".png",
        ".pdf",
      ]);
      expect(config.allowedDocumentTypes).toEqual([
        "passport",
        "driver_license",
        "national_id",
        "utility_bill",
      ]);
    });

    it("should create KYC file validator", () => {
      const validator = createKYCFileValidator();

      expect(validator).toBeInstanceOf(FileValidator);
    });
  });
});
