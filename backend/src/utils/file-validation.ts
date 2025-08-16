/**
 * Simplified file validation utility for KYC document uploads
 * Consolidates all file validation logic into a single, focused module
 */

export interface FileValidationConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  allowedDocumentTypes: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  fileInfo?: {
    size: number;
    mimeType: string;
    extension: string;
    actualMimeType?: string; // detected from file header
  };
}

export interface DirectUploadValidationRequest {
  documentType: string;
  fileName: string;
  contentType: string;
  userId: string;
  fileContent: string; // base64 encoded
}

/**
 * File validation utility class
 */
export class FileValidator {
  private config: FileValidationConfig;

  constructor(config: FileValidationConfig) {
    this.config = config;
  }

  /**
   * Validate a direct upload request (legacy - includes userId validation)
   * Consolidates all validation logic into a single function
   */
  validateDirectUploadRequest(
    request: DirectUploadValidationRequest
  ): FileValidationResult {
    const errors: string[] = [];

    // Validate required fields
    const requiredFieldErrors = this.validateRequiredFields(request);
    errors.push(...requiredFieldErrors);

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Validate document type
    if (!this.config.allowedDocumentTypes.includes(request.documentType)) {
      errors.push(
        `Invalid document type. Allowed types: ${this.config.allowedDocumentTypes.join(
          ", "
        )}`
      );
    }

    // Validate file name format
    const fileNameErrors = this.validateFileName(request.fileName);
    errors.push(...fileNameErrors);

    // Validate content type
    if (!this.config.allowedMimeTypes.includes(request.contentType)) {
      errors.push(
        `Invalid file type. Allowed types: ${this.config.allowedMimeTypes.join(
          ", "
        )}`
      );
    }

    // Validate user ID format
    const userIdErrors = this.validateUserId(request.userId);
    errors.push(...userIdErrors);

    // Validate and decode file content
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(request.fileContent, "base64");
      if (fileBuffer.length === 0) {
        errors.push("File is empty");
        return { isValid: false, errors };
      }
    } catch (error) {
      errors.push("Invalid base64 file content");
      return { isValid: false, errors };
    }

    // Validate file size
    const fileSizeErrors = this.validateFileSize(fileBuffer);
    errors.push(...fileSizeErrors);

    // Only validate file content if we have a valid buffer and no size errors
    if (fileSizeErrors.length === 0) {
      const contentErrors = this.validateFileContent(
        fileBuffer,
        request.contentType
      );
      errors.push(...contentErrors);
    }

    const extension = this.getFileExtension(request.fileName);
    const detectedMimeType = this.detectMimeTypeFromHeader(fileBuffer);

    const fileInfo = {
      size: fileBuffer.length,
      mimeType: request.contentType,
      extension,
      actualMimeType: detectedMimeType || undefined,
    };

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo,
    };
  }

  /**
   * Validate upload request without userId (userId extracted from JWT token)
   * New method for JWT-based authentication
   */
  validateUploadRequest(
    request: {
      documentType: string;
      fileName: string;
      contentType: string;
      fileContent: string;
    },
    userId: string
  ): FileValidationResult {
    const errors: string[] = [];

    // Validate required fields (excluding userId since it's passed separately)
    const requiredFieldErrors =
      this.validateRequiredFieldsWithoutUserId(request);
    errors.push(...requiredFieldErrors);

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Validate document type
    if (!this.config.allowedDocumentTypes.includes(request.documentType)) {
      errors.push(
        `Invalid document type. Allowed types: ${this.config.allowedDocumentTypes.join(
          ", "
        )}`
      );
    }

    // Validate file name format
    const fileNameErrors = this.validateFileName(request.fileName);
    errors.push(...fileNameErrors);

    // Validate content type
    if (!this.config.allowedMimeTypes.includes(request.contentType)) {
      errors.push(
        `Invalid file type. Allowed types: ${this.config.allowedMimeTypes.join(
          ", "
        )}`
      );
    }

    // Validate user ID format (passed separately)
    const userIdErrors = this.validateUserId(userId);
    errors.push(...userIdErrors);

    // Validate and decode file content
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(request.fileContent, "base64");
      if (fileBuffer.length === 0) {
        errors.push("File is empty");
        return { isValid: false, errors };
      }
    } catch (error) {
      errors.push("Invalid base64 file content");
      return { isValid: false, errors };
    }

    // Validate file size
    const fileSizeErrors = this.validateFileSize(fileBuffer);
    errors.push(...fileSizeErrors);

    // Only validate file content if we have a valid buffer and no size errors
    if (fileSizeErrors.length === 0) {
      const contentErrors = this.validateFileContent(
        fileBuffer,
        request.contentType
      );
      errors.push(...contentErrors);
    }

    const extension = this.getFileExtension(request.fileName);
    const detectedMimeType = this.detectMimeTypeFromHeader(fileBuffer);

    const fileInfo = {
      size: fileBuffer.length,
      mimeType: request.contentType,
      extension,
      actualMimeType: detectedMimeType || undefined,
    };

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo,
    };
  }

  /**
   * Validate required fields are present and have correct types
   */
  private validateRequiredFields(
    request: DirectUploadValidationRequest
  ): string[] {
    const errors: string[] = [];

    if (!request.documentType || typeof request.documentType !== "string") {
      errors.push("Document type is required and must be a string");
    }

    if (!request.fileName || typeof request.fileName !== "string") {
      errors.push("File name is required and must be a string");
    }

    if (!request.contentType || typeof request.contentType !== "string") {
      errors.push("Content type is required and must be a string");
    }

    if (!request.userId || typeof request.userId !== "string") {
      errors.push("User ID is required and must be a string");
    }

    if (!request.fileContent || typeof request.fileContent !== "string") {
      errors.push("File content is required and must be a base64 string");
    }

    return errors;
  }

  /**
   * Validate required fields without userId (for JWT-based authentication)
   */
  private validateRequiredFieldsWithoutUserId(request: {
    documentType: string;
    fileName: string;
    contentType: string;
    fileContent: string;
  }): string[] {
    const errors: string[] = [];

    if (!request.documentType || typeof request.documentType !== "string") {
      errors.push("Document type is required and must be a string");
    }

    if (!request.fileName || typeof request.fileName !== "string") {
      errors.push("File name is required and must be a string");
    }

    if (!request.contentType || typeof request.contentType !== "string") {
      errors.push("Content type is required and must be a string");
    }

    if (!request.fileContent || typeof request.fileContent !== "string") {
      errors.push("File content is required and must be a base64 string");
    }

    return errors;
  }

  /**
   * Validate file name format and extension
   */
  private validateFileName(fileName: string): string[] {
    const errors: string[] = [];

    // Check for valid file name pattern
    const fileNameRegex = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|pdf)$/i;
    if (!fileNameRegex.test(fileName)) {
      errors.push(
        "Invalid file name format. Must contain only alphanumeric characters, dots, underscores, hyphens, and have a valid extension (.jpg, .jpeg, .png, .pdf)"
      );
    }

    // Check file extension
    const extension = this.getFileExtension(fileName);
    if (!this.config.allowedExtensions.includes(extension.toLowerCase())) {
      errors.push(
        `Invalid file extension. Allowed extensions: ${this.config.allowedExtensions.join(
          ", "
        )}`
      );
    }

    // Check file name length
    if (fileName.length > 255) {
      errors.push("File name is too long (maximum 255 characters)");
    }

    return errors;
  }

  /**
   * Validate user ID format
   */
  private validateUserId(userId: string): string[] {
    const errors: string[] = [];

    // Remove USER# prefix if present for validation
    const cleanUserId = userId.startsWith("USER#")
      ? userId.substring(5)
      : userId;

    if (cleanUserId.length === 0) {
      errors.push("User ID cannot be empty");
    }

    // Basic format validation - alphanumeric with hyphens
    const userIdRegex = /^[a-zA-Z0-9-]+$/;
    if (!userIdRegex.test(cleanUserId)) {
      errors.push(
        "User ID must contain only alphanumeric characters and hyphens"
      );
    }

    if (cleanUserId.length > 128) {
      errors.push("User ID is too long (maximum 128 characters)");
    }

    return errors;
  }

  /**
   * Validate file size
   */
  private validateFileSize(fileBuffer: Buffer): string[] {
    const errors: string[] = [];

    if (fileBuffer.length > this.config.maxFileSize) {
      const maxSizeMB = Math.round(this.config.maxFileSize / (1024 * 1024));
      const actualSizeMB =
        Math.round((fileBuffer.length / (1024 * 1024)) * 100) / 100;
      errors.push(
        `File size ${actualSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`
      );
    }

    return errors;
  }

  /**
   * Validate file content and headers
   */
  private validateFileContent(
    fileBuffer: Buffer,
    declaredMimeType: string
  ): string[] {
    const errors: string[] = [];

    if (fileBuffer.length < 4) {
      errors.push("File is too small to validate format");
      return errors;
    }

    const detectedMimeType = this.detectMimeTypeFromHeader(fileBuffer);

    // Check if detected MIME type matches declared type
    if (detectedMimeType && detectedMimeType !== declaredMimeType) {
      errors.push(
        `File content does not match declared type. Expected: ${declaredMimeType}, Detected: ${detectedMimeType}`
      );
    }

    // Perform specific format validation
    const formatErrors = this.validateFileFormat(fileBuffer, declaredMimeType);
    errors.push(...formatErrors);

    return errors;
  }

  /**
   * Detect MIME type from file header
   */
  private detectMimeTypeFromHeader(fileBuffer: Buffer): string | null {
    if (fileBuffer.length < 4) {
      return null;
    }

    const header = fileBuffer.subarray(0, 8);

    // JPEG
    if (header[0] === 0xff && header[1] === 0xd8) {
      return "image/jpeg";
    }

    // PNG
    if (
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    ) {
      return "image/png";
    }

    // PDF
    if (
      header[0] === 0x25 &&
      header[1] === 0x50 &&
      header[2] === 0x44 &&
      header[3] === 0x46
    ) {
      return "application/pdf";
    }

    return null;
  }

  /**
   * Validate specific file format based on MIME type
   */
  private validateFileFormat(fileBuffer: Buffer, mimeType: string): string[] {
    const errors: string[] = [];

    switch (mimeType) {
      case "image/jpeg":
        if (!this.isValidJPEG(fileBuffer)) {
          errors.push("File does not appear to be a valid JPEG image");
        }
        break;

      case "image/png":
        if (!this.isValidPNG(fileBuffer)) {
          errors.push("File does not appear to be a valid PNG image");
        }
        break;

      case "application/pdf":
        if (!this.isValidPDF(fileBuffer)) {
          errors.push("File does not appear to be a valid PDF document");
        }
        break;

      default:
        errors.push(`Unsupported file format: ${mimeType}`);
    }

    return errors;
  }

  /**
   * Validate JPEG file format
   */
  private isValidJPEG(fileBuffer: Buffer): boolean {
    if (fileBuffer.length < 4) return false;

    // Check JPEG magic number
    if (fileBuffer[0] !== 0xff || fileBuffer[1] !== 0xd8) {
      return false;
    }

    // Check for JPEG end marker
    if (fileBuffer.length >= 2) {
      const lastTwo = fileBuffer.subarray(-2);
      if (lastTwo[0] === 0xff && lastTwo[1] === 0xd9) {
        return true;
      }
    }

    // If no end marker found, still consider valid if it starts correctly
    // (some JPEG files might be truncated but still processable)
    return true;
  }

  /**
   * Validate PNG file format
   */
  private isValidPNG(fileBuffer: Buffer): boolean {
    if (fileBuffer.length < 8) return false;

    // Check PNG signature
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 8; i++) {
      if (fileBuffer[i] !== pngSignature[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate PDF file format
   */
  private isValidPDF(fileBuffer: Buffer): boolean {
    if (fileBuffer.length < 4) return false;

    // Check PDF header
    if (
      fileBuffer[0] !== 0x25 ||
      fileBuffer[1] !== 0x50 ||
      fileBuffer[2] !== 0x44 ||
      fileBuffer[3] !== 0x46
    ) {
      return false;
    }

    // Check for PDF version (should be followed by -1.x)
    if (fileBuffer.length >= 8) {
      const versionPart = fileBuffer.subarray(4, 8).toString("ascii");
      if (versionPart.startsWith("-1.")) {
        return true;
      }
    }

    return true;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot !== -1 ? fileName.substring(lastDot) : "";
  }
}

/**
 * Default configuration for KYC document validation
 */
export const createKYCValidationConfig = (): FileValidationConfig => ({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"],
  allowedDocumentTypes: [
    "passport",
    "driver_license",
    "national_id",
    "utility_bill",
  ],
});

/**
 * Factory function to create a file validator for KYC documents
 */
export const createKYCFileValidator = (): FileValidator => {
  const config = createKYCValidationConfig();
  return new FileValidator(config);
};
