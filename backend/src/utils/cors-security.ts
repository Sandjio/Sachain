/**
 * CORS Security Configuration and Validation
 * Implements secure CORS policies and origin validation
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
  optionsSuccessStatus?: number;
}

export interface CORSValidationResult {
  isValid: boolean;
  allowedOrigin?: string;
  errors: string[];
}

/**
 * CORS Security Manager
 */
export class CORSSecurityManager {
  private static readonly DEFAULT_CONFIG: CORSConfig = {
    allowedOrigins: [
      "https://sachain.com",
      "https://www.sachain.com",
      "https://app.sachain.com",
      // Development origins (should be removed in production)
      ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000", "http://localhost:3001"] : []),
    ],
    allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-API-Key",
      "X-Request-ID",
    ],
    exposedHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
    maxAge: 86400, // 24 hours
    credentials: true,
    optionsSuccessStatus: 204,
  };

  /**
   * Validate CORS request and return appropriate headers
   */
  static validateCORSRequest(
    event: APIGatewayProxyEvent,
    config: CORSConfig = this.DEFAULT_CONFIG
  ): CORSValidationResult {
    const errors: string[] = [];
    const origin = event.headers.Origin || event.headers.origin;

    // Validate origin
    if (origin) {
      const originValidation = this.validateOrigin(origin, config.allowedOrigins);
      if (!originValidation.isValid) {
        errors.push(...originValidation.errors);
        return { isValid: false, errors };
      }
    }

    // Validate method for preflight requests
    if (event.httpMethod === "OPTIONS") {
      const requestMethod = event.headers["Access-Control-Request-Method"];
      if (requestMethod && !config.allowedMethods.includes(requestMethod)) {
        errors.push(`Method ${requestMethod} not allowed`);
      }

      // Validate requested headers
      const requestHeaders = event.headers["Access-Control-Request-Headers"];
      if (requestHeaders) {
        const headerValidation = this.validateRequestHeaders(requestHeaders, config.allowedHeaders);
        if (!headerValidation.isValid) {
          errors.push(...headerValidation.errors);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      allowedOrigin: origin && this.isOriginAllowed(origin, config.allowedOrigins) ? origin : config.allowedOrigins[0],
      errors,
    };
  }

  /**
   * Generate CORS headers for response
   */
  static generateCORSHeaders(
    event: APIGatewayProxyEvent,
    config: CORSConfig = this.DEFAULT_CONFIG
  ): Record<string, string> {
    const corsValidation = this.validateCORSRequest(event, config);
    const headers: Record<string, string> = {};

    // Set origin header
    if (corsValidation.allowedOrigin) {
      headers["Access-Control-Allow-Origin"] = corsValidation.allowedOrigin;
    }

    // Set methods
    headers["Access-Control-Allow-Methods"] = config.allowedMethods.join(", ");

    // Set headers
    headers["Access-Control-Allow-Headers"] = config.allowedHeaders.join(", ");

    // Set exposed headers
    if (config.exposedHeaders && config.exposedHeaders.length > 0) {
      headers["Access-Control-Expose-Headers"] = config.exposedHeaders.join(", ");
    }

    // Set credentials
    if (config.credentials) {
      headers["Access-Control-Allow-Credentials"] = "true";
    }

    // Set max age for preflight requests
    if (event.httpMethod === "OPTIONS" && config.maxAge) {
      headers["Access-Control-Max-Age"] = config.maxAge.toString();
    }

    // Add security headers
    headers["Vary"] = "Origin, Access-Control-Request-Method, Access-Control-Request-Headers";

    return headers;
  }

  /**
   * Handle preflight OPTIONS request
   */
  static handlePreflightRequest(
    event: APIGatewayProxyEvent,
    config: CORSConfig = this.DEFAULT_CONFIG
  ): APIGatewayProxyResult {
    const corsValidation = this.validateCORSRequest(event, config);

    if (!corsValidation.isValid) {
      return {
        statusCode: 403,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "CORS validation failed",
          errors: corsValidation.errors,
        }),
      };
    }

    const corsHeaders = this.generateCORSHeaders(event, config);

    return {
      statusCode: config.optionsSuccessStatus || 204,
      headers: {
        ...corsHeaders,
        "Content-Length": "0",
      },
      body: "",
    };
  }

  /**
   * Validate origin against allowed origins list
   */
  private static validateOrigin(origin: string, allowedOrigins: string[]): CORSValidationResult {
    const errors: string[] = [];

    // Basic URL validation
    try {
      const url = new URL(origin);
      
      // Check protocol
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.push("Invalid origin protocol. Only HTTP and HTTPS allowed");
      }

      // Check for suspicious patterns
      if (this.containsSuspiciousPatterns(origin)) {
        errors.push("Origin contains suspicious patterns");
      }

    } catch (error) {
      errors.push("Invalid origin URL format");
    }

    // Check if origin is in allowed list
    if (!this.isOriginAllowed(origin, allowedOrigins)) {
      errors.push(`Origin ${origin} not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if origin is in allowed origins list
   */
  private static isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
    // Exact match
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    // Wildcard subdomain matching (e.g., *.sachain.com)
    return allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.startsWith("*.")) {
        const domain = allowedOrigin.substring(2);
        try {
          const originUrl = new URL(origin);
          return originUrl.hostname.endsWith(`.${domain}`) || originUrl.hostname === domain;
        } catch {
          return false;
        }
      }
      return false;
    });
  }

  /**
   * Validate requested headers for preflight requests
   */
  private static validateRequestHeaders(
    requestHeaders: string,
    allowedHeaders: string[]
  ): CORSValidationResult {
    const errors: string[] = [];
    const requestedHeaders = requestHeaders.split(",").map(h => h.trim().toLowerCase());
    const allowedHeadersLower = allowedHeaders.map(h => h.toLowerCase());

    for (const header of requestedHeaders) {
      if (!allowedHeadersLower.includes(header)) {
        errors.push(`Header ${header} not allowed`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for suspicious patterns in origin
   */
  private static containsSuspiciousPatterns(origin: string): boolean {
    const suspiciousPatterns = [
      // IP addresses (should use domain names)
      /^https?:\/\/\d+\.\d+\.\d+\.\d+/,
      // Localhost variations (except in development)
      ...(process.env.NODE_ENV !== "development" ? [/localhost/i, /127\.0\.0\.1/, /0\.0\.0\.0/] : []),
      // Suspicious TLDs
      /\.(tk|ml|ga|cf)$/i,
      // URL shorteners
      /bit\.ly|tinyurl|t\.co|goo\.gl/i,
      // Suspicious characters
      /[<>'"]/,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(origin));
  }

  /**
   * Get environment-specific CORS configuration
   */
  static getEnvironmentConfig(environment: string): CORSConfig {
    const baseConfig = { ...this.DEFAULT_CONFIG };

    switch (environment) {
      case "production":
        return {
          ...baseConfig,
          allowedOrigins: [
            "https://sachain.com",
            "https://www.sachain.com",
            "https://app.sachain.com",
          ],
        };

      case "staging":
        return {
          ...baseConfig,
          allowedOrigins: [
            "https://staging.sachain.com",
            "https://staging-app.sachain.com",
            "https://sachain.com",
            "https://www.sachain.com",
            "https://app.sachain.com",
          ],
        };

      case "development":
        return {
          ...baseConfig,
          allowedOrigins: [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "https://localhost:3000",
            "https://staging.sachain.com",
            "https://sachain.com",
          ],
        };

      default:
        return baseConfig;
    }
  }
}

/**
 * CORS middleware for Lambda functions
 */
export class CORSMiddleware {
  /**
   * Apply CORS handling to Lambda function
   */
  static withCORS(
    handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
    config?: CORSConfig
  ) {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      const corsConfig = config || CORSSecurityManager.getEnvironmentConfig(
        process.env.NODE_ENV || "development"
      );

      // Handle preflight requests
      if (event.httpMethod === "OPTIONS") {
        return CORSSecurityManager.handlePreflightRequest(event, corsConfig);
      }

      try {
        // Execute the original handler
        const result = await handler(event);

        // Add CORS headers to the response
        const corsHeaders = CORSSecurityManager.generateCORSHeaders(event, corsConfig);

        return {
          ...result,
          headers: {
            ...result.headers,
            ...corsHeaders,
          },
        };
      } catch (error) {
        console.error("Handler error:", error);

        // Return error response with CORS headers
        const corsHeaders = CORSSecurityManager.generateCORSHeaders(event, corsConfig);

        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
          body: JSON.stringify({
            message: "Internal server error",
            timestamp: new Date().toISOString(),
          }),
        };
      }
    };
  }
}

/**
 * CORS security audit utilities
 */
export class CORSSecurityAudit {
  /**
   * Audit CORS configuration for security issues
   */
  static auditConfiguration(config: CORSConfig): {
    issues: string[];
    recommendations: string[];
    securityScore: number;
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let securityScore = 100;

    // Check for wildcard origins
    if (config.allowedOrigins.includes("*")) {
      issues.push("Wildcard origin (*) allows any domain - major security risk");
      securityScore -= 50;
    }

    // Check for HTTP origins in production
    const httpOrigins = config.allowedOrigins.filter(origin => origin.startsWith("http://"));
    if (httpOrigins.length > 0 && process.env.NODE_ENV === "production") {
      issues.push("HTTP origins in production environment - security risk");
      securityScore -= 20;
    }

    // Check for localhost in production
    const localhostOrigins = config.allowedOrigins.filter(origin => 
      origin.includes("localhost") || origin.includes("127.0.0.1")
    );
    if (localhostOrigins.length > 0 && process.env.NODE_ENV === "production") {
      issues.push("Localhost origins in production - should be removed");
      securityScore -= 15;
    }

    // Check credentials with wildcard
    if (config.credentials && config.allowedOrigins.includes("*")) {
      issues.push("Credentials enabled with wildcard origin - not allowed by browsers");
      securityScore -= 30;
    }

    // Check max age
    if (config.maxAge && config.maxAge > 86400) {
      recommendations.push("Consider reducing max age for preflight cache");
      securityScore -= 5;
    }

    // Check for overly permissive headers
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
    const allowedSensitiveHeaders = config.allowedHeaders.filter(header =>
      sensitiveHeaders.includes(header.toLowerCase())
    );
    if (allowedSensitiveHeaders.length > 0) {
      recommendations.push("Review sensitive headers in allowed headers list");
    }

    return {
      issues,
      recommendations,
      securityScore: Math.max(0, securityScore),
    };
  }

  /**
   * Generate security report for CORS configuration
   */
  static generateSecurityReport(config: CORSConfig): string {
    const audit = this.auditConfiguration(config);
    
    let report = "CORS Security Audit Report\n";
    report += "==========================\n\n";
    report += `Security Score: ${audit.securityScore}/100\n\n`;

    if (audit.issues.length > 0) {
      report += "Security Issues:\n";
      audit.issues.forEach((issue, index) => {
        report += `${index + 1}. ${issue}\n`;
      });
      report += "\n";
    }

    if (audit.recommendations.length > 0) {
      report += "Recommendations:\n";
      audit.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
      report += "\n";
    }

    report += "Configuration Details:\n";
    report += `Allowed Origins: ${config.allowedOrigins.join(", ")}\n`;
    report += `Allowed Methods: ${config.allowedMethods.join(", ")}\n`;
    report += `Credentials Enabled: ${config.credentials}\n`;
    report += `Max Age: ${config.maxAge} seconds\n`;

    return report;
  }
}