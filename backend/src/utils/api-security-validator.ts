/**
 * API Security Validator for comprehensive endpoint security
 * Implements authentication, authorization, and input validation for all API endpoints
 */

import { APIGatewayProxyEvent } from "aws-lambda";
import { extractUserIdFromToken, TokenExtractionResult } from "./jwt-utils";
import { SecurityValidationResult, InputSanitizer } from "./security-hardening";

export interface AuthorizationContext {
  userId: string;
  email?: string;
  roles?: string[];
  kycStatus?: string;
  isAdmin?: boolean;
}

export interface EndpointSecurityConfig {
  requireAuth: boolean;
  requiredKycStatus?: "approved" | "pending" | "rejected";
  allowedRoles?: string[];
  requireAdmin?: boolean;
  rateLimitConfig?: {
    windowMs: number;
    maxRequests: number;
  };
  inputValidation?: {
    maxBodySize?: number;
    allowedContentTypes?: string[];
    requiredFields?: string[];
    optionalFields?: string[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  authContext?: AuthorizationContext;
  errors: string[];
  sanitizedBody?: any;
}

/**
 * Comprehensive API security validator
 */
export class APISecurityValidator {
  /**
   * Validate complete API request security
   */
  static async validateRequest(
    event: APIGatewayProxyEvent,
    config: EndpointSecurityConfig
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    let authContext: AuthorizationContext | undefined;
    let sanitizedBody: any;

    try {
      // 1. Authentication validation
      if (config.requireAuth) {
        const authResult = await this.validateAuthentication(event);
        if (!authResult.isValid) {
          errors.push(...authResult.errors);
        } else {
          authContext = authResult.authContext;
        }
      }

      // 2. Authorization validation
      if (authContext && config.requiredKycStatus) {
        const authzResult = await this.validateAuthorization(authContext, config);
        if (!authzResult.isValid) {
          errors.push(...authzResult.errors);
        }
      }

      // 3. Input validation
      if (config.inputValidation) {
        const inputResult = this.validateInput(event, config.inputValidation);
        if (!inputResult.isValid) {
          errors.push(...inputResult.errors);
        } else {
          sanitizedBody = inputResult.sanitizedData;
        }
      }

      return {
        isValid: errors.length === 0,
        authContext,
        errors,
        sanitizedBody,
      };
    } catch (error) {
      console.error("API security validation error:", error);
      return {
        isValid: false,
        errors: ["Security validation failed"],
      };
    }
  }

  /**
   * Validate authentication token
   */
  private static async validateAuthentication(
    event: APIGatewayProxyEvent
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Extract and validate JWT token
    const tokenResult: TokenExtractionResult = extractUserIdFromToken(event);

    if (!tokenResult.success) {
      errors.push(tokenResult.error || "Authentication failed");
      return { isValid: false, errors };
    }

    // Create auth context
    const authContext: AuthorizationContext = {
      userId: tokenResult.userId!,
      email: tokenResult.email,
    };

    // Additional token validation
    if (tokenResult.payload) {
      // Check token type
      if (tokenResult.payload.token_use !== "id") {
        errors.push("Invalid token type. ID token required");
      }

      // Check audience
      if (!tokenResult.payload.aud) {
        errors.push("Token missing audience claim");
      }

      // Check issuer format
      if (!tokenResult.payload.iss || !tokenResult.payload.iss.includes("cognito")) {
        errors.push("Invalid token issuer");
      }

      // Extract additional claims
      authContext.roles = tokenResult.payload["custom:roles"]?.split(",") || [];
      authContext.kycStatus = tokenResult.payload["custom:kyc_status"];
      authContext.isAdmin = authContext.roles?.includes("admin") || false;
    }

    return {
      isValid: errors.length === 0,
      authContext,
      errors,
    };
  }

  /**
   * Validate authorization based on user context and requirements
   */
  private static async validateAuthorization(
    authContext: AuthorizationContext,
    config: EndpointSecurityConfig
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check KYC status requirement
    if (config.requiredKycStatus && authContext.kycStatus !== config.requiredKycStatus) {
      errors.push(
        `KYC status '${config.requiredKycStatus}' required. Current status: '${authContext.kycStatus || "unknown"}'`
      );
    }

    // Check role requirements
    if (config.allowedRoles && config.allowedRoles.length > 0) {
      const userRoles = authContext.roles || [];
      const hasRequiredRole = config.allowedRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        errors.push(
          `Required role not found. Required: [${config.allowedRoles.join(", ")}], User has: [${userRoles.join(", ")}]`
        );
      }
    }

    // Check admin requirement
    if (config.requireAdmin && !authContext.isAdmin) {
      errors.push("Admin privileges required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate and sanitize input data
   */
  private static validateInput(
    event: APIGatewayProxyEvent,
    inputConfig: NonNullable<EndpointSecurityConfig["inputValidation"]>
  ): SecurityValidationResult {
    const errors: string[] = [];

    // Validate content type
    if (event.body && inputConfig.allowedContentTypes) {
      const contentType = event.headers["Content-Type"] || event.headers["content-type"];
      if (!contentType || !inputConfig.allowedContentTypes.includes(contentType)) {
        errors.push(
          `Invalid content type. Allowed: [${inputConfig.allowedContentTypes.join(", ")}]`
        );
      }
    }

    // Validate body size
    if (event.body && inputConfig.maxBodySize) {
      const bodySize = Buffer.byteLength(event.body, "utf8");
      if (bodySize > inputConfig.maxBodySize) {
        errors.push(
          `Request body too large. Maximum: ${inputConfig.maxBodySize} bytes, Actual: ${bodySize} bytes`
        );
      }
    }

    // Parse and validate JSON body
    let parsedBody: any;
    if (event.body) {
      try {
        parsedBody = JSON.parse(event.body);
      } catch (error) {
        errors.push("Invalid JSON format in request body");
        return { isValid: false, errors };
      }

      // Validate required fields
      if (inputConfig.requiredFields) {
        for (const field of inputConfig.requiredFields) {
          if (!(field in parsedBody) || parsedBody[field] === null || parsedBody[field] === undefined) {
            errors.push(`Required field missing: ${field}`);
          }
        }
      }

      // Validate allowed fields
      const allowedFields = [
        ...(inputConfig.requiredFields || []),
        ...(inputConfig.optionalFields || []),
      ];

      if (allowedFields.length > 0) {
        for (const field of Object.keys(parsedBody)) {
          if (!allowedFields.includes(field)) {
            errors.push(`Unexpected field: ${field}`);
          }
        }
      }

      // Sanitize the body
      try {
        const sanitizedBody = InputSanitizer.sanitizeObject(parsedBody);
        return {
          isValid: errors.length === 0,
          errors,
          sanitizedData: sanitizedBody,
        };
      } catch (error) {
        errors.push(`Input sanitization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: parsedBody,
    };
  }

  /**
   * Validate project ownership for project-related operations
   */
  static validateProjectOwnership(
    authContext: AuthorizationContext,
    projectEntrepreneurId: string
  ): ValidationResult {
    const errors: string[] = [];

    // Clean up user IDs for comparison (remove USER# prefix if present)
    const cleanAuthUserId = authContext.userId.startsWith("USER#")
      ? authContext.userId.substring(5)
      : authContext.userId;
    
    const cleanProjectUserId = projectEntrepreneurId.startsWith("USER#")
      ? projectEntrepreneurId.substring(5)
      : projectEntrepreneurId;

    // Allow access if user owns the project or is admin
    if (cleanAuthUserId !== cleanProjectUserId && !authContext.isAdmin) {
      errors.push("Unauthorized: You can only access your own projects");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate project status for specific operations
   */
  static validateProjectStatus(
    currentStatus: string,
    allowedStatuses: string[],
    operation: string
  ): ValidationResult {
    const errors: string[] = [];

    if (!allowedStatuses.includes(currentStatus)) {
      errors.push(
        `Cannot ${operation} project in '${currentStatus}' status. Allowed statuses: [${allowedStatuses.join(", ")}]`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Hedera wallet address format
   */
  static validateHederaWallet(walletAddress: string): ValidationResult {
    const errors: string[] = [];

    // Hedera account ID format: 0.0.accountId
    const hederaPattern = /^0\.0\.[0-9]+$/;
    
    if (!hederaPattern.test(walletAddress)) {
      errors.push("Invalid Hedera wallet address format. Expected: 0.0.accountId");
    }

    // Additional validation for reasonable account ID range
    const accountId = parseInt(walletAddress.split(".")[2]);
    if (accountId < 1 || accountId > 999999999) {
      errors.push("Hedera account ID out of valid range");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate file upload security
   */
  static validateFileUpload(
    fileName: string,
    contentType: string,
    fileSize: number,
    maxSize: number = 10 * 1024 * 1024 // 10MB default
  ): ValidationResult {
    const errors: string[] = [];

    // Validate file size
    if (fileSize > maxSize) {
      errors.push(`File too large. Maximum: ${maxSize} bytes, Actual: ${fileSize} bytes`);
    }

    // Validate file name
    const fileNamePattern = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|pdf)$/i;
    if (!fileNamePattern.test(fileName)) {
      errors.push("Invalid file name. Only alphanumeric characters, dots, underscores, hyphens allowed with jpg, jpeg, png, or pdf extensions");
    }

    // Validate content type
    const allowedContentTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedContentTypes.includes(contentType)) {
      errors.push(`Invalid content type. Allowed: [${allowedContentTypes.join(", ")}]`);
    }

    // Check for path traversal attempts
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      errors.push("File name contains invalid path characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Predefined security configurations for common endpoints
 */
export class SecurityConfigs {
  /**
   * Configuration for project creation endpoints
   */
  static readonly PROJECT_CREATION: EndpointSecurityConfig = {
    requireAuth: true,
    requiredKycStatus: "approved",
    inputValidation: {
      maxBodySize: 50 * 1024, // 50KB
      allowedContentTypes: ["application/json"],
      requiredFields: ["name", "description", "category", "stockSupply"],
      optionalFields: ["targetFundingGoal", "pricePerStock", "coverImageUrl"],
    },
  };

  /**
   * Configuration for project management endpoints
   */
  static readonly PROJECT_MANAGEMENT: EndpointSecurityConfig = {
    requireAuth: true,
    requiredKycStatus: "approved",
    inputValidation: {
      maxBodySize: 50 * 1024, // 50KB
      allowedContentTypes: ["application/json"],
      optionalFields: ["name", "description", "category", "targetFundingGoal", "pricePerStock", "coverImageUrl", "status"],
    },
  };

  /**
   * Configuration for stock minting endpoints
   */
  static readonly STOCK_MINTING: EndpointSecurityConfig = {
    requireAuth: true,
    requiredKycStatus: "approved",
    inputValidation: {
      maxBodySize: 10 * 1024, // 10KB
      allowedContentTypes: ["application/json"],
      requiredFields: ["walletAddress"],
    },
  };

  /**
   * Configuration for admin endpoints
   */
  static readonly ADMIN_OPERATIONS: EndpointSecurityConfig = {
    requireAuth: true,
    requireAdmin: true,
    allowedRoles: ["admin"],
    inputValidation: {
      maxBodySize: 100 * 1024, // 100KB
      allowedContentTypes: ["application/json"],
    },
  };

  /**
   * Configuration for KYC upload endpoints
   */
  static readonly KYC_UPLOAD: EndpointSecurityConfig = {
    requireAuth: true,
    inputValidation: {
      maxBodySize: 10 * 1024 * 1024, // 10MB
      allowedContentTypes: ["application/json"],
      requiredFields: ["documentType", "fileName", "contentType", "fileContent"],
    },
  };

  /**
   * Configuration for public query endpoints
   */
  static readonly PUBLIC_QUERY: EndpointSecurityConfig = {
    requireAuth: false,
    rateLimitConfig: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    },
  };

  /**
   * Configuration for authenticated query endpoints
   */
  static readonly AUTHENTICATED_QUERY: EndpointSecurityConfig = {
    requireAuth: true,
    rateLimitConfig: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200,
    },
  };
}