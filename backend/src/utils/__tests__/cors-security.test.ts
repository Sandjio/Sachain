/**
 * Tests for CORS security utilities
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CORSSecurityManager,
  CORSMiddleware,
  CORSSecurityAudit,
} from "../cors-security";

describe("CORSSecurityManager", () => {
  const mockEvent: Partial<APIGatewayProxyEvent> = {
    httpMethod: "GET",
    headers: {
      Origin: "https://sachain.com",
    },
  };

  describe("validateCORSRequest", () => {
    it("should validate request with allowed origin", () => {
      const result = CORSSecurityManager.validateCORSRequest(mockEvent as APIGatewayProxyEvent);
      
      expect(result.isValid).toBe(true);
      expect(result.allowedOrigin).toBe("https://sachain.com");
      expect(result.errors).toHaveLength(0);
    });

    it("should reject request with disallowed origin", () => {
      const eventWithBadOrigin = {
        ...mockEvent,
        headers: {
          Origin: "https://malicious.com",
        },
      };

      const result = CORSSecurityManager.validateCORSRequest(eventWithBadOrigin as APIGatewayProxyEvent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Origin https://malicious.com not allowed");
    });

    it("should validate preflight request with allowed method", () => {
      const preflightEvent = {
        ...mockEvent,
        httpMethod: "OPTIONS",
        headers: {
          Origin: "https://sachain.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type, Authorization",
        },
      };

      const result = CORSSecurityManager.validateCORSRequest(preflightEvent as APIGatewayProxyEvent);
      
      expect(result.isValid).toBe(true);
    });

    it("should reject preflight request with disallowed method", () => {
      const preflightEvent = {
        ...mockEvent,
        httpMethod: "OPTIONS",
        headers: {
          Origin: "https://sachain.com",
          "Access-Control-Request-Method": "PATCH",
        },
      };

      const result = CORSSecurityManager.validateCORSRequest(preflightEvent as APIGatewayProxyEvent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Method PATCH not allowed");
    });

    it("should reject preflight request with disallowed headers", () => {
      const preflightEvent = {
        ...mockEvent,
        httpMethod: "OPTIONS",
        headers: {
          Origin: "https://sachain.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "X-Malicious-Header",
        },
      };

      const result = CORSSecurityManager.validateCORSRequest(preflightEvent as APIGatewayProxyEvent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Header x-malicious-header not allowed");
    });

    it("should handle request without origin", () => {
      const eventWithoutOrigin = {
        ...mockEvent,
        headers: {},
      };

      const result = CORSSecurityManager.validateCORSRequest(eventWithoutOrigin as APIGatewayProxyEvent);
      
      expect(result.isValid).toBe(true);
      expect(result.allowedOrigin).toBe("https://sachain.com"); // Default origin
    });

    it("should reject suspicious origin patterns", () => {
      const suspiciousOrigins = [
        "http://192.168.1.1:3000", // IP address
        "https://malicious.tk", // Suspicious TLD
        "https://bit.ly/malicious", // URL shortener
      ];

      suspiciousOrigins.forEach((origin) => {
        const eventWithSuspiciousOrigin = {
          ...mockEvent,
          headers: { Origin: origin },
        };

        const result = CORSSecurityManager.validateCORSRequest(eventWithSuspiciousOrigin as APIGatewayProxyEvent);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe("generateCORSHeaders", () => {
    it("should generate proper CORS headers", () => {
      const headers = CORSSecurityManager.generateCORSHeaders(mockEvent as APIGatewayProxyEvent);
      
      expect(headers["Access-Control-Allow-Origin"]).toBe("https://sachain.com");
      expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
      expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
      expect(headers["Access-Control-Allow-Headers"]).toContain("Authorization");
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
      expect(headers["Vary"]).toContain("Origin");
    });

    it("should include max age for OPTIONS requests", () => {
      const optionsEvent = {
        ...mockEvent,
        httpMethod: "OPTIONS",
      };

      const headers = CORSSecurityManager.generateCORSHeaders(optionsEvent as APIGatewayProxyEvent);
      
      expect(headers["Access-Control-Max-Age"]).toBe("86400");
    });

    it("should include exposed headers", () => {
      const headers = CORSSecurityManager.generateCORSHeaders(mockEvent as APIGatewayProxyEvent);
      
      expect(headers["Access-Control-Expose-Headers"]).toContain("X-Request-ID");
      expect(headers["Access-Control-Expose-Headers"]).toContain("X-RateLimit-Limit");
    });
  });

  describe("handlePreflightRequest", () => {
    it("should handle valid preflight request", () => {
      const preflightEvent = {
        ...mockEvent,
        httpMethod: "OPTIONS",
        headers: {
          Origin: "https://sachain.com",
          "Access-Control-Request-Method": "POST",
        },
      };

      const result = CORSSecurityManager.handlePreflightRequest(preflightEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(204);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://sachain.com");
      expect(result.headers["Content-Length"]).toBe("0");
      expect(result.body).toBe("");
    });

    it("should reject invalid preflight request", () => {
      const invalidPreflightEvent = {
        ...mockEvent,
        httpMethod: "OPTIONS",
        headers: {
          Origin: "https://malicious.com",
        },
      };

      const result = CORSSecurityManager.handlePreflightRequest(invalidPreflightEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(403);
      expect(result.body).toContain("CORS validation failed");
    });
  });

  describe("getEnvironmentConfig", () => {
    it("should return production config", () => {
      const config = CORSSecurityManager.getEnvironmentConfig("production");
      
      expect(config.allowedOrigins).toEqual([
        "https://sachain.com",
        "https://www.sachain.com",
        "https://app.sachain.com",
      ]);
      expect(config.allowedOrigins).not.toContain("http://localhost:3000");
    });

    it("should return development config with localhost", () => {
      const config = CORSSecurityManager.getEnvironmentConfig("development");
      
      expect(config.allowedOrigins).toContain("http://localhost:3000");
      expect(config.allowedOrigins).toContain("https://sachain.com");
    });

    it("should return staging config", () => {
      const config = CORSSecurityManager.getEnvironmentConfig("staging");
      
      expect(config.allowedOrigins).toContain("https://staging.sachain.com");
      expect(config.allowedOrigins).toContain("https://sachain.com");
    });
  });
});

describe("CORSMiddleware", () => {
  const mockHandler = jest.fn().mockResolvedValue({
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true }),
  });

  const mockEvent: APIGatewayProxyEvent = {
    httpMethod: "GET",
    headers: {
      Origin: "https://sachain.com",
    },
  } as any;

  beforeEach(() => {
    mockHandler.mockClear();
  });

  describe("withCORS", () => {
    it("should handle preflight request without calling handler", async () => {
      const optionsEvent = {
        ...mockEvent,
        httpMethod: "OPTIONS",
        headers: {
          Origin: "https://sachain.com",
          "Access-Control-Request-Method": "POST",
        },
      };

      const corsHandler = CORSMiddleware.withCORS(mockHandler);
      const result = await corsHandler(optionsEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(204);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://sachain.com");
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should add CORS headers to normal response", async () => {
      const corsHandler = CORSMiddleware.withCORS(mockHandler);
      const result = await corsHandler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://sachain.com");
      expect(result.headers["Content-Type"]).toBe("application/json");
      expect(mockHandler).toHaveBeenCalledWith(mockEvent);
    });

    it("should handle handler errors with CORS headers", async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error("Handler error"));
      const corsHandler = CORSMiddleware.withCORS(errorHandler);
      
      const result = await corsHandler(mockEvent);

      expect(result.statusCode).toBe(500);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://sachain.com");
      expect(result.body).toContain("Internal server error");
    });

    it("should use custom CORS config", async () => {
      const customConfig = {
        allowedOrigins: ["https://custom.com"],
        allowedMethods: ["GET"],
        allowedHeaders: ["Content-Type"],
        credentials: false,
      };

      const eventWithCustomOrigin = {
        ...mockEvent,
        headers: { Origin: "https://custom.com" },
      };

      const corsHandler = CORSMiddleware.withCORS(mockHandler, customConfig);
      const result = await corsHandler(eventWithCustomOrigin as APIGatewayProxyEvent);

      expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://custom.com");
      expect(result.headers["Access-Control-Allow-Credentials"]).toBeUndefined();
    });
  });
});

describe("CORSSecurityAudit", () => {
  describe("auditConfiguration", () => {
    it("should detect wildcard origin security issue", () => {
      const config = {
        allowedOrigins: ["*"],
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true,
      };

      const audit = CORSSecurityAudit.auditConfiguration(config);

      expect(audit.issues).toContain("Wildcard origin (*) allows any domain - major security risk");
      expect(audit.issues).toContain("Credentials enabled with wildcard origin - not allowed by browsers");
      expect(audit.securityScore).toBeLessThan(50);
    });

    it("should detect HTTP origins in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const config = {
        allowedOrigins: ["http://example.com", "https://sachain.com"],
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
      };

      const audit = CORSSecurityAudit.auditConfiguration(config);

      expect(audit.issues).toContain("HTTP origins in production environment - security risk");
      expect(audit.securityScore).toBeLessThan(100);

      process.env.NODE_ENV = originalEnv;
    });

    it("should detect localhost in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const config = {
        allowedOrigins: ["https://sachain.com", "http://localhost:3000"],
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
      };

      const audit = CORSSecurityAudit.auditConfiguration(config);

      expect(audit.issues).toContain("Localhost origins in production - should be removed");

      process.env.NODE_ENV = originalEnv;
    });

    it("should provide recommendations for long max age", () => {
      const config = {
        allowedOrigins: ["https://sachain.com"],
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        maxAge: 172800, // 2 days
      };

      const audit = CORSSecurityAudit.auditConfiguration(config);

      expect(audit.recommendations).toContain("Consider reducing max age for preflight cache");
    });

    it("should provide recommendations for sensitive headers", () => {
      const config = {
        allowedOrigins: ["https://sachain.com"],
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
      };

      const audit = CORSSecurityAudit.auditConfiguration(config);

      expect(audit.recommendations).toContain("Review sensitive headers in allowed headers list");
    });

    it("should give perfect score for secure configuration", () => {
      const config = {
        allowedOrigins: ["https://sachain.com"],
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true,
        maxAge: 86400,
      };

      const audit = CORSSecurityAudit.auditConfiguration(config);

      expect(audit.securityScore).toBe(100);
      expect(audit.issues).toHaveLength(0);
    });
  });

  describe("generateSecurityReport", () => {
    it("should generate comprehensive security report", () => {
      const config = {
        allowedOrigins: ["*"],
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        maxAge: 86400,
      };

      const report = CORSSecurityAudit.generateSecurityReport(config);

      expect(report).toContain("CORS Security Audit Report");
      expect(report).toContain("Security Score:");
      expect(report).toContain("Security Issues:");
      expect(report).toContain("Configuration Details:");
      expect(report).toContain("Allowed Origins: *");
      expect(report).toContain("Credentials Enabled: true");
    });

    it("should handle configuration without issues", () => {
      const config = {
        allowedOrigins: ["https://sachain.com"],
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: false,
        maxAge: 86400,
      };

      const report = CORSSecurityAudit.generateSecurityReport(config);

      expect(report).toContain("Security Score: 100/100");
      expect(report).not.toContain("Security Issues:");
      expect(report).toContain("Configuration Details:");
    });
  });
});