/**
 * Security hardening utilities for comprehensive input validation and sanitization
 * Implements security measures for task 23: security hardening and validation
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { extractUserIdFromToken } from "./jwt-utils";

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (event: APIGatewayProxyEvent) => string;
}

export interface SecurityHeaders {
  [key: string]: string;
}

/**
 * Comprehensive input sanitization and validation
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== "string") {
      throw new Error("Input must be a string");
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // HTML encode dangerous characters
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");

    // Trim and limit length
    sanitized = sanitized.trim().substring(0, maxLength);

    return sanitized;
  }

  /**
   * Validate and sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    if (typeof email !== "string") {
      throw new Error("Email must be a string");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = email.trim().toLowerCase();

    if (!emailRegex.test(sanitized)) {
      throw new Error("Invalid email format");
    }

    if (sanitized.length > 254) {
      throw new Error("Email too long");
    }

    return sanitized;
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(
    input: any,
    min?: number,
    max?: number,
    allowDecimals: boolean = true
  ): number {
    const num = Number(input);

    if (isNaN(num) || !isFinite(num)) {
      throw new Error("Invalid number");
    }

    if (!allowDecimals && !Number.isInteger(num)) {
      throw new Error("Number must be an integer");
    }

    if (min !== undefined && num < min) {
      throw new Error(`Number must be at least ${min}`);
    }

    if (max !== undefined && num > max) {
      throw new Error(`Number must be at most ${max}`);
    }

    return num;
  }

  /**
   * Sanitize object by recursively sanitizing all string properties
   */
  static sanitizeObject(obj: any, maxDepth: number = 5): any {
    if (maxDepth <= 0) {
      throw new Error("Object nesting too deep");
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      return this.sanitizeString(obj);
    }

    if (typeof obj === "number") {
      return this.sanitizeNumber(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length > 100) {
        throw new Error("Array too large");
      }
      return obj.map((item) => this.sanitizeObject(item, maxDepth - 1));
    }

    if (typeof obj === "object") {
      const keys = Object.keys(obj);
      if (keys.length > 50) {
        throw new Error("Object has too many properties");
      }

      const sanitized: any = {};
      for (const key of keys) {
        const sanitizedKey = this.sanitizeString(key, 100);
        sanitized[sanitizedKey] = this.sanitizeObject(obj[key], maxDepth - 1);
      }
      return sanitized;
    }

    return obj;
  }
}

/**
 * SQL injection prevention utilities
 */
export class SQLInjectionPrevention {
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(UNION\s+SELECT)/i,
    /(\bOR\s+1\s*=\s*1\b)/i,
    /(\bAND\s+1\s*=\s*1\b)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\bxp_cmdshell\b)/i,
    /(\bsp_executesql\b)/i,
  ];

  /**
   * Check if input contains SQL injection patterns
   */
  static containsSQLInjection(input: string): boolean {
    return this.SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
  }

  /**
   * Validate input against SQL injection
   */
  static validateInput(input: string): SecurityValidationResult {
    const errors: string[] = [];

    if (this.containsSQLInjection(input)) {
      errors.push("Input contains potentially malicious SQL patterns");
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? input : undefined,
    };
  }
}

/**
 * Rate limiting implementation
 */
export class RateLimiter {
  private static requests: Map<string, { count: number; resetTime: number }> =
    new Map();

  /**
   * Check if request should be rate limited
   */
  static isRateLimited(
    event: APIGatewayProxyEvent,
    config: RateLimitConfig
  ): boolean {
    const key = config.keyGenerator
      ? config.keyGenerator(event)
      : this.getDefaultKey(event);

    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.requests.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return false;
    }

    if (record.count >= config.maxRequests) {
      return true;
    }

    record.count++;
    return false;
  }

  /**
   * Get default rate limiting key (IP + User ID)
   */
  private static getDefaultKey(event: APIGatewayProxyEvent): string {
    const ip = event.requestContext.identity.sourceIp;
    const tokenResult = extractUserIdFromToken(event);
    const userId = tokenResult.success ? tokenResult.userId : "anonymous";
    return `${ip}:${userId}`;
  }

  /**
   * Clean up expired rate limit records
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * Security headers configuration
 */
export class SecurityHeaders {
  /**
   * Get comprehensive security headers
   */
  static getSecurityHeaders(): SecurityHeaders {
    return {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';",
      "Permissions-Policy":
        "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
      "Expires": "0",
    };
  }

  /**
   * Get CORS headers for API responses
   */
  static getCORSHeaders(origin?: string): SecurityHeaders {
    const allowedOrigins = [
      "https://sachain.com",
      "https://www.sachain.com",
      "https://app.sachain.com",
      "http://localhost:3000", // Development only
    ];

    const corsOrigin =
      origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    return {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With, Accept, Origin",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    };
  }
}

/**
 * Request validation middleware
 */
export class RequestValidator {
  /**
   * Validate request size and structure
   */
  static validateRequest(event: APIGatewayProxyEvent): SecurityValidationResult {
    const errors: string[] = [];

    // Check request size
    const bodySize = event.body ? Buffer.byteLength(event.body, "utf8") : 0;
    if (bodySize > 10 * 1024 * 1024) {
      // 10MB limit
      errors.push("Request body too large");
    }

    // Validate headers
    const contentType = event.headers["Content-Type"] || event.headers["content-type"];
    if (event.body && !contentType) {
      errors.push("Missing Content-Type header");
    }

    // Check for suspicious headers
    const suspiciousHeaders = ["X-Forwarded-For", "X-Real-IP"];
    for (const header of suspiciousHeaders) {
      if (event.headers[header]) {
        const value = event.headers[header];
        if (typeof value === "string" && value.split(",").length > 5) {
          errors.push(`Suspicious ${header} header with too many IPs`);
        }
      }
    }

    // Validate HTTP method
    const allowedMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
    if (!allowedMethods.includes(event.httpMethod)) {
      errors.push(`HTTP method ${event.httpMethod} not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate JSON body
   */
  static validateJSONBody(body: string): SecurityValidationResult {
    const errors: string[] = [];
    let parsedBody: any;

    try {
      parsedBody = JSON.parse(body);
    } catch (error) {
      errors.push("Invalid JSON format");
      return { isValid: false, errors };
    }

    // Check for prototype pollution
    if (this.hasPrototypePollution(parsedBody)) {
      errors.push("Request contains prototype pollution attempt");
    }

    // Sanitize the parsed body
    try {
      const sanitizedBody = InputSanitizer.sanitizeObject(parsedBody);
      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: sanitizedBody,
      };
    } catch (error) {
      errors.push(`Sanitization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Check for prototype pollution attempts
   */
  private static hasPrototypePollution(obj: any): boolean {
    if (typeof obj !== "object" || obj === null) {
      return false;
    }

    const dangerousKeys = ["__proto__", "constructor", "prototype"];
    
    for (const key of Object.keys(obj)) {
      if (dangerousKeys.includes(key)) {
        return true;
      }
      
      if (typeof obj[key] === "object" && this.hasPrototypePollution(obj[key])) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Security middleware wrapper for Lambda functions
 */
export class SecurityMiddleware {
  /**
   * Apply comprehensive security validation to Lambda handler
   */
  static secureHandler(
    handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
    options: {
      rateLimitConfig?: RateLimitConfig;
      requireAuth?: boolean;
      allowedRoles?: string[];
    } = {}
  ) {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      try {
        // Apply rate limiting
        if (options.rateLimitConfig) {
          if (RateLimiter.isRateLimited(event, options.rateLimitConfig)) {
            return this.createErrorResponse(429, "Too Many Requests", {
              "Retry-After": Math.ceil(options.rateLimitConfig.windowMs / 1000).toString(),
            });
          }
        }

        // Validate request structure
        const requestValidation = RequestValidator.validateRequest(event);
        if (!requestValidation.isValid) {
          return this.createErrorResponse(400, "Bad Request", {}, {
            errors: requestValidation.errors,
          });
        }

        // Validate authentication if required
        if (options.requireAuth) {
          const tokenResult = extractUserIdFromToken(event);
          if (!tokenResult.success) {
            return this.createErrorResponse(401, "Unauthorized", {}, {
              error: tokenResult.error,
            });
          }
        }

        // Validate JSON body if present
        if (event.body) {
          const bodyValidation = RequestValidator.validateJSONBody(event.body);
          if (!bodyValidation.isValid) {
            return this.createErrorResponse(400, "Bad Request", {}, {
              errors: bodyValidation.errors,
            });
          }
          // Replace event body with sanitized version
          event.body = JSON.stringify(bodyValidation.sanitizedData);
        }

        // Call the original handler
        const result = await handler(event);

        // Add security headers to response
        const securityHeaders = SecurityHeaders.getSecurityHeaders();
        const corsHeaders = SecurityHeaders.getCORSHeaders(
          event.headers.Origin || event.headers.origin
        );

        return {
          ...result,
          headers: {
            ...result.headers,
            ...securityHeaders,
            ...corsHeaders,
          },
        };
      } catch (error) {
        console.error("Security middleware error:", error);
        return this.createErrorResponse(500, "Internal Server Error");
      }
    };
  }

  /**
   * Create standardized error response
   */
  private static createErrorResponse(
    statusCode: number,
    message: string,
    additionalHeaders: SecurityHeaders = {},
    body: any = {}
  ): APIGatewayProxyResult {
    const securityHeaders = SecurityHeaders.getSecurityHeaders();
    
    return {
      statusCode,
      headers: {
        ...securityHeaders,
        ...additionalHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        ...body,
        timestamp: new Date().toISOString(),
      }),
    };
  }
}

/**
 * Abuse prevention utilities
 */
export class AbusePreventionService {
  private static suspiciousPatterns: Map<string, number> = new Map();

  /**
   * Detect suspicious request patterns
   */
  static detectSuspiciousActivity(event: APIGatewayProxyEvent): boolean {
    const ip = event.requestContext.identity.sourceIp;
    const userAgent = event.headers["User-Agent"] || event.headers["user-agent"] || "";
    
    // Check for bot patterns
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
    ];

    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      this.recordSuspiciousActivity(ip, "bot_user_agent");
      return true;
    }

    // Check for missing or suspicious user agent
    if (!userAgent || userAgent.length < 10) {
      this.recordSuspiciousActivity(ip, "missing_user_agent");
      return true;
    }

    // Check for rapid requests from same IP
    const requestCount = this.suspiciousPatterns.get(`requests_${ip}`) || 0;
    if (requestCount > 100) {
      return true;
    }

    this.suspiciousPatterns.set(`requests_${ip}`, requestCount + 1);
    
    // Clean up old records periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return false;
  }

  /**
   * Record suspicious activity
   */
  private static recordSuspiciousActivity(ip: string, type: string): void {
    const key = `${type}_${ip}`;
    const count = this.suspiciousPatterns.get(key) || 0;
    this.suspiciousPatterns.set(key, count + 1);
  }

  /**
   * Clean up old suspicious activity records
   */
  private static cleanup(): void {
    // In a real implementation, this would use a proper cache with TTL
    // For now, we'll just clear everything periodically
    if (this.suspiciousPatterns.size > 1000) {
      this.suspiciousPatterns.clear();
    }
  }
}