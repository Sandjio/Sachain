/**
 * Tests for API security validator
 */

import { APIGatewayProxyEvent } from "aws-lambda";
import { APISecurityValidator, SecurityConfigs } from "../api-security-validator";
import * as jwtUtils from "../jwt-utils";

// Mock JWT utils
jest.mock("../jwt-utils");
const mockExtractUserIdFromToken = jwtUtils.extractUserIdFromToken as jest.MockedFunction<
  typeof jwtUtils.extractUserIdFromToken
>;

describe("APISecurityValidator", () => {
  const mockEvent: Partial<APIGatewayProxyEvent> = {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: '{"name": "Test Project", "description": "A test project description that is long enough to meet requirements"}',
    httpMethod: "POST",
    requestContext: {
      identity: {
        sourceIp: "192.168.1.1",
      },
    } as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateRequest", () => {
    it("should validate successful authenticated request", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
        email: "test@example.com",
        payload: {
          sub: "user-123",
          email: "test@example.com",
          token_use: "id",
          aud: "client-id",
          iss: "https://cognito-idp.region.amazonaws.com/pool-id",
          "custom:kyc_status": "approved",
          "custom:roles": "entrepreneur",
        } as any,
      });

      const config = SecurityConfigs.PROJECT_CREATION;
      const result = await APISecurityValidator.validateRequest(mockEvent as APIGatewayProxyEvent, config);

      expect(result.isValid).toBe(true);
      expect(result.authContext).toBeDefined();
      expect(result.authContext?.userId).toBe("user-123");
      expect(result.authContext?.kycStatus).toBe("approved");
      expect(result.sanitizedBody).toBeDefined();
    });

    it("should reject request with invalid token", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const config = SecurityConfigs.PROJECT_CREATION;
      const result = await APISecurityValidator.validateRequest(mockEvent as APIGatewayProxyEvent, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid token");
    });

    it("should reject request with insufficient KYC status", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
        payload: {
          sub: "user-123",
          token_use: "id",
          aud: "client-id",
          iss: "https://cognito-idp.region.amazonaws.com/pool-id",
          "custom:kyc_status": "pending",
        } as any,
      });

      const config = SecurityConfigs.PROJECT_CREATION;
      const result = await APISecurityValidator.validateRequest(mockEvent as APIGatewayProxyEvent, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("KYC status 'approved' required. Current status: 'pending'");
    });

    it("should validate request without authentication when not required", async () => {
      const config = SecurityConfigs.PUBLIC_QUERY;
      const result = await APISecurityValidator.validateRequest(mockEvent as APIGatewayProxyEvent, config);

      expect(result.isValid).toBe(true);
      expect(result.authContext).toBeUndefined();
    });

    it("should reject request with invalid content type", async () => {
      const eventWithInvalidContentType = {
        ...mockEvent,
        headers: {
          ...mockEvent.headers,
          "Content-Type": "text/plain",
        },
      };

      const config = SecurityConfigs.PROJECT_CREATION;
      const result = await APISecurityValidator.validateRequest(
        eventWithInvalidContentType as APIGatewayProxyEvent,
        config
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid content type. Allowed: [application/json]");
    });

    it("should reject request with missing required fields", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
        payload: {
          sub: "user-123",
          token_use: "id",
          aud: "client-id",
          iss: "https://cognito-idp.region.amazonaws.com/pool-id",
          "custom:kyc_status": "approved",
        } as any,
      });

      const eventWithMissingFields = {
        ...mockEvent,
        body: '{"name": "Test Project"}', // Missing required fields
      };

      const config = SecurityConfigs.PROJECT_CREATION;
      const result = await APISecurityValidator.validateRequest(
        eventWithMissingFields as APIGatewayProxyEvent,
        config
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Required field missing: description");
      expect(result.errors).toContain("Required field missing: category");
      expect(result.errors).toContain("Required field missing: stockSupply");
    });

    it("should reject request with unexpected fields", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "user-123",
        payload: {
          sub: "user-123",
          token_use: "id",
          aud: "client-id",
          iss: "https://cognito-idp.region.amazonaws.com/pool-id",
          "custom:kyc_status": "approved",
        } as any,
      });

      const eventWithUnexpectedFields = {
        ...mockEvent,
        body: JSON.stringify({
          name: "Test Project",
          description: "A test project description that is long enough to meet requirements",
          category: "Technology",
          stockSupply: 1000,
          maliciousField: "should not be allowed",
        }),
      };

      const config = SecurityConfigs.PROJECT_CREATION;
      const result = await APISecurityValidator.validateRequest(
        eventWithUnexpectedFields as APIGatewayProxyEvent,
        config
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Unexpected field: maliciousField");
    });

    it("should reject oversized request body", async () => {
      const largeBody = JSON.stringify({
        name: "Test Project",
        description: "x".repeat(100 * 1024), // Larger than 50KB limit
        category: "Technology",
        stockSupply: 1000,
      });

      const eventWithLargeBody = {
        ...mockEvent,
        body: largeBody,
      };

      const config = SecurityConfigs.PROJECT_CREATION;
      const result = await APISecurityValidator.validateRequest(
        eventWithLargeBody as APIGatewayProxyEvent,
        config
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining("Request body too large"));
    });
  });

  describe("validateProjectOwnership", () => {
    it("should allow project owner to access their project", () => {
      const authContext = {
        userId: "user-123",
        kycStatus: "approved",
      };

      const result = APISecurityValidator.validateProjectOwnership(authContext, "user-123");
      expect(result.isValid).toBe(true);
    });

    it("should allow admin to access any project", () => {
      const authContext = {
        userId: "admin-456",
        kycStatus: "approved",
        isAdmin: true,
      };

      const result = APISecurityValidator.validateProjectOwnership(authContext, "user-123");
      expect(result.isValid).toBe(true);
    });

    it("should reject non-owner non-admin access", () => {
      const authContext = {
        userId: "user-456",
        kycStatus: "approved",
        isAdmin: false,
      };

      const result = APISecurityValidator.validateProjectOwnership(authContext, "user-123");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Unauthorized: You can only access your own projects");
    });

    it("should handle USER# prefix in IDs", () => {
      const authContext = {
        userId: "USER#user-123",
        kycStatus: "approved",
      };

      const result = APISecurityValidator.validateProjectOwnership(authContext, "USER#user-123");
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateProjectStatus", () => {
    it("should allow operation on valid status", () => {
      const result = APISecurityValidator.validateProjectStatus(
        "draft",
        ["draft", "minting"],
        "update"
      );
      expect(result.isValid).toBe(true);
    });

    it("should reject operation on invalid status", () => {
      const result = APISecurityValidator.validateProjectStatus(
        "active",
        ["draft"],
        "update"
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Cannot update project in 'active' status. Allowed statuses: [draft]"
      );
    });
  });

  describe("validateHederaWallet", () => {
    it("should validate correct Hedera wallet format", () => {
      const result = APISecurityValidator.validateHederaWallet("0.0.123456");
      expect(result.isValid).toBe(true);
    });

    it("should reject invalid wallet format", () => {
      const result = APISecurityValidator.validateHederaWallet("invalid-wallet");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid Hedera wallet address format. Expected: 0.0.accountId");
    });

    it("should reject wallet with invalid account ID range", () => {
      const result = APISecurityValidator.validateHederaWallet("0.0.0");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Hedera account ID out of valid range");
    });
  });

  describe("validateFileUpload", () => {
    it("should validate correct file upload", () => {
      const result = APISecurityValidator.validateFileUpload(
        "document.pdf",
        "application/pdf",
        1024 * 1024 // 1MB
      );
      expect(result.isValid).toBe(true);
    });

    it("should reject oversized file", () => {
      const result = APISecurityValidator.validateFileUpload(
        "document.pdf",
        "application/pdf",
        20 * 1024 * 1024, // 20MB
        10 * 1024 * 1024 // 10MB limit
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining("File too large"));
    });

    it("should reject invalid file extension", () => {
      const result = APISecurityValidator.validateFileUpload(
        "document.exe",
        "application/octet-stream",
        1024
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining("Invalid file name"));
    });

    it("should reject invalid content type", () => {
      const result = APISecurityValidator.validateFileUpload(
        "document.pdf",
        "application/octet-stream",
        1024
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid content type. Allowed: [image/jpeg, image/png, application/pdf]");
    });

    it("should reject path traversal attempts", () => {
      const result = APISecurityValidator.validateFileUpload(
        "../../../etc/passwd",
        "text/plain",
        1024
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("File name contains invalid path characters");
    });
  });
});

describe("SecurityConfigs", () => {
  it("should have proper project creation config", () => {
    const config = SecurityConfigs.PROJECT_CREATION;
    
    expect(config.requireAuth).toBe(true);
    expect(config.requiredKycStatus).toBe("approved");
    expect(config.inputValidation?.requiredFields).toContain("name");
    expect(config.inputValidation?.requiredFields).toContain("description");
    expect(config.inputValidation?.requiredFields).toContain("category");
    expect(config.inputValidation?.requiredFields).toContain("stockSupply");
  });

  it("should have proper admin operations config", () => {
    const config = SecurityConfigs.ADMIN_OPERATIONS;
    
    expect(config.requireAuth).toBe(true);
    expect(config.requireAdmin).toBe(true);
    expect(config.allowedRoles).toContain("admin");
  });

  it("should have proper public query config", () => {
    const config = SecurityConfigs.PUBLIC_QUERY;
    
    expect(config.requireAuth).toBe(false);
    expect(config.rateLimitConfig).toBeDefined();
    expect(config.rateLimitConfig?.maxRequests).toBe(100);
  });

  it("should have proper KYC upload config", () => {
    const config = SecurityConfigs.KYC_UPLOAD;
    
    expect(config.requireAuth).toBe(true);
    expect(config.inputValidation?.maxBodySize).toBe(10 * 1024 * 1024); // 10MB
    expect(config.inputValidation?.requiredFields).toContain("documentType");
    expect(config.inputValidation?.requiredFields).toContain("fileName");
    expect(config.inputValidation?.requiredFields).toContain("contentType");
    expect(config.inputValidation?.requiredFields).toContain("fileContent");
  });
});