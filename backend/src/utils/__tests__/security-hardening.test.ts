/**
 * Tests for security hardening utilities
 */

import { APIGatewayProxyEvent } from "aws-lambda";
import {
  InputSanitizer,
  SQLInjectionPrevention,
  RateLimiter,
  SecurityHeaders,
  RequestValidator,
  SecurityMiddleware,
  AbusePreventionService,
} from "../security-hardening";

describe("InputSanitizer", () => {
  describe("sanitizeString", () => {
    it("should remove control characters", () => {
      const input = "Hello\x00World\x1F";
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toBe("HelloWorld");
    });

    it("should HTML encode dangerous characters", () => {
      const input = '<script>alert("xss")</script>';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;");
    });

    it("should trim and limit length", () => {
      const input = "  " + "a".repeat(2000) + "  ";
      const result = InputSanitizer.sanitizeString(input, 100);
      expect(result).toHaveLength(100);
      expect(result.startsWith("a")).toBe(true);
    });

    it("should throw error for non-string input", () => {
      expect(() => InputSanitizer.sanitizeString(123 as any)).toThrow("Input must be a string");
    });
  });

  describe("sanitizeEmail", () => {
    it("should sanitize valid email", () => {
      const result = InputSanitizer.sanitizeEmail("  Test@Example.COM  ");
      expect(result).toBe("test@example.com");
    });

    it("should throw error for invalid email", () => {
      expect(() => InputSanitizer.sanitizeEmail("invalid-email")).toThrow("Invalid email format");
    });

    it("should throw error for too long email", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      expect(() => InputSanitizer.sanitizeEmail(longEmail)).toThrow("Email too long");
    });
  });

  describe("sanitizeNumber", () => {
    it("should sanitize valid number", () => {
      const result = InputSanitizer.sanitizeNumber("123.45");
      expect(result).toBe(123.45);
    });

    it("should enforce integer constraint", () => {
      expect(() => InputSanitizer.sanitizeNumber(123.45, undefined, undefined, false)).toThrow(
        "Number must be an integer"
      );
    });

    it("should enforce min/max constraints", () => {
      expect(() => InputSanitizer.sanitizeNumber(5, 10, 20)).toThrow("Number must be at least 10");
      expect(() => InputSanitizer.sanitizeNumber(25, 10, 20)).toThrow("Number must be at most 20");
    });

    it("should throw error for invalid number", () => {
      expect(() => InputSanitizer.sanitizeNumber("not-a-number")).toThrow("Invalid number");
    });
  });

  describe("sanitizeObject", () => {
    it("should sanitize nested object", () => {
      const input = {
        name: "<script>alert('xss')</script>",
        age: "25",
        nested: {
          value: "test\x00value",
        },
      };

      const result = InputSanitizer.sanitizeObject(input);
      expect(result.name).toBe("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;");
      expect(result.age).toBe(25);
      expect(result.nested.value).toBe("testvalue");
    });

    it("should throw error for too deep nesting", () => {
      const deepObject = { a: { b: { c: { d: { e: { f: "value" } } } } } };
      expect(() => InputSanitizer.sanitizeObject(deepObject, 3)).toThrow("Object nesting too deep");
    });

    it("should throw error for too many properties", () => {
      const largeObject: any = {};
      for (let i = 0; i < 60; i++) {
        largeObject[`prop${i}`] = "value";
      }
      expect(() => InputSanitizer.sanitizeObject(largeObject)).toThrow(
        "Object has too many properties"
      );
    });
  });
});

describe("SQLInjectionPrevention", () => {
  describe("containsSQLInjection", () => {
    it("should detect SQL injection patterns", () => {
      const maliciousInputs = [
        "SELECT * FROM users",
        "1' OR 1=1--",
        "UNION SELECT password FROM users",
        "'; DROP TABLE users; --",
        "admin'--",
      ];

      maliciousInputs.forEach((input) => {
        expect(SQLInjectionPrevention.containsSQLInjection(input)).toBe(true);
      });
    });

    it("should allow safe inputs", () => {
      const safeInputs = [
        "John Doe",
        "user@example.com",
        "My project description",
        "123.45",
      ];

      safeInputs.forEach((input) => {
        expect(SQLInjectionPrevention.containsSQLInjection(input)).toBe(false);
      });
    });
  });

  describe("validateInput", () => {
    it("should validate safe input", () => {
      const result = SQLInjectionPrevention.validateInput("Safe input");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject malicious input", () => {
      const result = SQLInjectionPrevention.validateInput("1' OR 1=1--");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Input contains potentially malicious SQL patterns");
    });
  });
});

describe("RateLimiter", () => {
  const mockEvent: Partial<APIGatewayProxyEvent> = {
    requestContext: {
      identity: {
        sourceIp: "192.168.1.1",
      },
    } as any,
    headers: {},
  };

  beforeEach(() => {
    // Clear rate limiter state
    (RateLimiter as any).requests.clear();
  });

  it("should allow requests within limit", () => {
    const config = { windowMs: 60000, maxRequests: 5 };
    
    for (let i = 0; i < 5; i++) {
      expect(RateLimiter.isRateLimited(mockEvent as APIGatewayProxyEvent, config)).toBe(false);
    }
  });

  it("should block requests exceeding limit", () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    
    // First two requests should pass
    expect(RateLimiter.isRateLimited(mockEvent as APIGatewayProxyEvent, config)).toBe(false);
    expect(RateLimiter.isRateLimited(mockEvent as APIGatewayProxyEvent, config)).toBe(false);
    
    // Third request should be blocked
    expect(RateLimiter.isRateLimited(mockEvent as APIGatewayProxyEvent, config)).toBe(true);
  });

  it("should reset after time window", () => {
    const config = { windowMs: 100, maxRequests: 1 };
    
    // First request should pass
    expect(RateLimiter.isRateLimited(mockEvent as APIGatewayProxyEvent, config)).toBe(false);
    
    // Second request should be blocked
    expect(RateLimiter.isRateLimited(mockEvent as APIGatewayProxyEvent, config)).toBe(true);
    
    // Wait for window to expire and test again
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(RateLimiter.isRateLimited(mockEvent as APIGatewayProxyEvent, config)).toBe(false);
        resolve(undefined);
      }, 150);
    });
  });
});

describe("SecurityHeaders", () => {
  describe("getSecurityHeaders", () => {
    it("should return comprehensive security headers", () => {
      const headers = SecurityHeaders.getSecurityHeaders();
      
      expect(headers["Strict-Transport-Security"]).toBeDefined();
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    });
  });

  describe("getCORSHeaders", () => {
    it("should return CORS headers with allowed origin", () => {
      const headers = SecurityHeaders.getCORSHeaders("https://sachain.com");
      
      expect(headers["Access-Control-Allow-Origin"]).toBe("https://sachain.com");
      expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
      expect(headers["Access-Control-Allow-Headers"]).toContain("Authorization");
    });

    it("should use default origin for disallowed origin", () => {
      const headers = SecurityHeaders.getCORSHeaders("https://malicious.com");
      
      expect(headers["Access-Control-Allow-Origin"]).toBe("https://sachain.com");
    });
  });
});

describe("RequestValidator", () => {
  describe("validateRequest", () => {
    it("should validate valid request", () => {
      const mockEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: '{"test": "value"}',
      };

      const result = RequestValidator.validateRequest(mockEvent as APIGatewayProxyEvent);
      expect(result.isValid).toBe(true);
    });

    it("should reject oversized request", () => {
      const largeBody = JSON.stringify({ data: "x".repeat(11 * 1024 * 1024) });
      const mockEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: largeBody,
      };

      const result = RequestValidator.validateRequest(mockEvent as APIGatewayProxyEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Request body too large");
    });

    it("should reject invalid HTTP method", () => {
      const mockEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: "PATCH",
        headers: {},
      };

      const result = RequestValidator.validateRequest(mockEvent as APIGatewayProxyEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("HTTP method PATCH not allowed");
    });
  });

  describe("validateJSONBody", () => {
    it("should validate and sanitize valid JSON", () => {
      const body = '{"name": "<script>alert(\\"xss\\")</script>", "age": 25}';
      const result = RequestValidator.validateJSONBody(body);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.name).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;");
    });

    it("should reject invalid JSON", () => {
      const result = RequestValidator.validateJSONBody("invalid json");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid JSON format");
    });

    it("should detect prototype pollution", () => {
      const body = '{"__proto__": {"isAdmin": true}}';
      const result = RequestValidator.validateJSONBody(body);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Request contains prototype pollution attempt");
    });
  });
});

describe("AbusePreventionService", () => {
  describe("detectSuspiciousActivity", () => {
    it("should detect bot user agents", () => {
      const mockEvent: Partial<APIGatewayProxyEvent> = {
        requestContext: {
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
        headers: {
          "User-Agent": "Googlebot/2.1",
        },
      };

      const result = AbusePreventionService.detectSuspiciousActivity(mockEvent as APIGatewayProxyEvent);
      expect(result).toBe(true);
    });

    it("should detect missing user agent", () => {
      const mockEvent: Partial<APIGatewayProxyEvent> = {
        requestContext: {
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
        headers: {},
      };

      const result = AbusePreventionService.detectSuspiciousActivity(mockEvent as APIGatewayProxyEvent);
      expect(result).toBe(true);
    });

    it("should allow normal user agents", () => {
      const mockEvent: Partial<APIGatewayProxyEvent> = {
        requestContext: {
          identity: {
            sourceIp: "192.168.1.1",
          },
        } as any,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      };

      const result = AbusePreventionService.detectSuspiciousActivity(mockEvent as APIGatewayProxyEvent);
      expect(result).toBe(false);
    });
  });
});

describe("SecurityMiddleware", () => {
  const mockHandler = jest.fn().mockResolvedValue({
    statusCode: 200,
    headers: {},
    body: JSON.stringify({ success: true }),
  });

  const mockEvent: APIGatewayProxyEvent = {
    httpMethod: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer valid-token",
    },
    body: '{"test": "value"}',
    requestContext: {
      identity: {
        sourceIp: "192.168.1.1",
      },
    } as any,
  } as any;

  beforeEach(() => {
    mockHandler.mockClear();
  });

  it("should apply security middleware successfully", async () => {
    const securedHandler = SecurityMiddleware.secureHandler(mockHandler, {
      requireAuth: false,
    });

    const result = await securedHandler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(result.headers).toHaveProperty("Strict-Transport-Security");
    expect(result.headers).toHaveProperty("X-Content-Type-Options");
    expect(mockHandler).toHaveBeenCalled();
  });

  it("should block oversized requests", async () => {
    const largeEvent = {
      ...mockEvent,
      body: JSON.stringify({ data: "x".repeat(11 * 1024 * 1024) }),
    };

    const securedHandler = SecurityMiddleware.secureHandler(mockHandler);
    const result = await securedHandler(largeEvent);

    expect(result.statusCode).toBe(400);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should apply rate limiting", async () => {
    const securedHandler = SecurityMiddleware.secureHandler(mockHandler, {
      rateLimitConfig: {
        windowMs: 60000,
        maxRequests: 1,
      },
    });

    // First request should succeed
    const result1 = await securedHandler(mockEvent);
    expect(result1.statusCode).toBe(200);

    // Second request should be rate limited
    const result2 = await securedHandler(mockEvent);
    expect(result2.statusCode).toBe(429);
    expect(result2.headers).toHaveProperty("Retry-After");
  });
});