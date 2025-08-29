/**
 * Integration tests for security hardening implementation
 * Tests the complete security pipeline including authentication, validation, and abuse prevention
 */

import { APIGatewayProxyEvent } from "aws-lambda";
import { SecurityMiddleware } from "../security-hardening";
import { APISecurityValidator, SecurityConfigs } from "../api-security-validator";
import { CORSMiddleware } from "../cors-security";
import * as jwtUtils from "../jwt-utils";

// Mock JWT utils
jest.mock("../jwt-utils");
const mockExtractUserIdFromToken = jwtUtils.extractUserIdFromToken as jest.MockedFunction<
  typeof jwtUtils.extractUserIdFromToken
>;

describe("Security Integration Tests", () => {
  const mockHandler = jest.fn().mockResolvedValue({
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true }),
  });

  const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    httpMethod: "POST",
    path: "/projects",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer valid-token",
      "Origin": "https://sachain.com",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    body: JSON.stringify({
      name: "Test Project",
      description: "A test project description that meets the minimum length requirements for validation",
      category: "Technology",
      stockSupply: 1000,
    }),
    requestContext: {
      requestId: "test-request-id",
      identity: {
        sourceIp: "192.168.1.1",
      },
    } as any,
    ...overrides,
  } as APIGatewayProxyEvent);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful authentication
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
  });

  describe("Complete Security Pipeline", () => {
    it("should process valid request through complete security pipeline", async () => {
      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(mockHandler),
        {
          requireAuth: true,
          rateLimitConfig: {
            windowMs: 60000,
            maxRequests: 10,
          },
        }
      );

      const event = createMockEvent();
      const result = await securedHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toHaveProperty("Access-Control-Allow-Origin");
      expect(result.headers).toHaveProperty("Strict-Transport-Security");
      expect(result.headers).toHaveProperty("X-Content-Type-Options");
      expect(mockHandler).toHaveBeenCalled();
    });

    it("should block request with invalid authentication", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: false,
        error: "Invalid token",
      });

      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(mockHandler),
        {
          requireAuth: true,
        }
      );

      const event = createMockEvent();
      const result = await securedHandler(event);

      expect(result.statusCode).toBe(401);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should block request exceeding rate limit", async () => {
      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(mockHandler),
        {
          rateLimitConfig: {
            windowMs: 60000,
            maxRequests: 1,
          },
        }
      );

      const event = createMockEvent();

      // First request should succeed
      const result1 = await securedHandler(event);
      expect(result1.statusCode).toBe(200);

      // Second request should be rate limited
      const result2 = await securedHandler(event);
      expect(result2.statusCode).toBe(429);
      expect(result2.headers).toHaveProperty("Retry-After");
    });

    it("should sanitize malicious input", async () => {
      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(mockHandler),
        {
          requireAuth: true,
        }
      );

      const maliciousEvent = createMockEvent({
        body: JSON.stringify({
          name: "<script>alert('xss')</script>",
          description: "A test project description with malicious content <img src=x onerror=alert(1)>",
          category: "Technology",
          stockSupply: 1000,
        }),
      });

      const result = await securedHandler(maliciousEvent);

      expect(result.statusCode).toBe(200);
      expect(mockHandler).toHaveBeenCalled();

      // Check that the handler received sanitized data
      const handlerCall = mockHandler.mock.calls[0][0];
      const sanitizedBody = JSON.parse(handlerCall.body);
      expect(sanitizedBody.name).toBe("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;");
      expect(sanitizedBody.description).toContain("&lt;img");
    });

    it("should handle CORS preflight request", async () => {
      const securedHandler = CORSMiddleware.withCORS(mockHandler);

      const preflightEvent = createMockEvent({
        httpMethod: "OPTIONS",
        headers: {
          "Origin": "https://sachain.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type, Authorization",
        },
      });

      const result = await securedHandler(preflightEvent);

      expect(result.statusCode).toBe(204);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://sachain.com");
      expect(result.headers["Access-Control-Allow-Methods"]).toContain("POST");
      expect(result.headers["Access-Control-Allow-Headers"]).toContain("Authorization");
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should block request from disallowed origin", async () => {
      const securedHandler = CORSMiddleware.withCORS(mockHandler);

      const maliciousOriginEvent = createMockEvent({
        headers: {
          ...createMockEvent().headers,
          "Origin": "https://malicious.com",
        },
      });

      const result = await securedHandler(maliciousOriginEvent);

      expect(result.statusCode).toBe(200); // CORS doesn't block, just sets headers
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://sachain.com"); // Default origin
    });

    it("should detect and block suspicious user agents", async () => {
      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(mockHandler),
        {
          requireAuth: false,
        }
      );

      const botEvent = createMockEvent({
        headers: {
          ...createMockEvent().headers,
          "User-Agent": "Googlebot/2.1",
        },
      });

      const result = await securedHandler(botEvent);

      expect(result.statusCode).toBe(429); // Blocked by abuse prevention
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should validate request size limits", async () => {
      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(mockHandler),
        {
          requireAuth: false,
        }
      );

      const largeBodyEvent = createMockEvent({
        body: JSON.stringify({
          name: "Test Project",
          description: "x".repeat(11 * 1024 * 1024), // 11MB
          category: "Technology",
          stockSupply: 1000,
        }),
      });

      const result = await securedHandler(largeBodyEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).errors).toContain("Request body too large");
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should validate JSON structure and prevent prototype pollution", async () => {
      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(mockHandler),
        {
          requireAuth: false,
        }
      );

      const prototypePollutionEvent = createMockEvent({
        body: JSON.stringify({
          name: "Test Project",
          description: "Valid description",
          category: "Technology",
          stockSupply: 1000,
          "__proto__": {
            "isAdmin": true,
          },
        }),
      });

      const result = await securedHandler(prototypePollutionEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).errors).toContain("Request contains prototype pollution attempt");
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe("API Security Validator Integration", () => {
    it("should validate project creation with proper security config", async () => {
      const event = createMockEvent();
      const result = await APISecurityValidator.validateRequest(event, SecurityConfigs.PROJECT_CREATION);

      expect(result.isValid).toBe(true);
      expect(result.authContext).toBeDefined();
      expect(result.authContext?.userId).toBe("user-123");
      expect(result.authContext?.kycStatus).toBe("approved");
      expect(result.sanitizedBody).toBeDefined();
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

      const event = createMockEvent();
      const result = await APISecurityValidator.validateRequest(event, SecurityConfigs.PROJECT_CREATION);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("KYC status 'approved' required. Current status: 'pending'");
    });

    it("should validate admin operations with proper role", async () => {
      mockExtractUserIdFromToken.mockReturnValue({
        success: true,
        userId: "admin-123",
        payload: {
          sub: "admin-123",
          token_use: "id",
          aud: "client-id",
          iss: "https://cognito-idp.region.amazonaws.com/pool-id",
          "custom:roles": "admin",
        } as any,
      });

      const event = createMockEvent();
      const result = await APISecurityValidator.validateRequest(event, SecurityConfigs.ADMIN_OPERATIONS);

      expect(result.isValid).toBe(true);
      expect(result.authContext?.isAdmin).toBe(true);
    });

    it("should reject admin operations without proper role", async () => {
      const event = createMockEvent();
      const result = await APISecurityValidator.validateRequest(event, SecurityConfigs.ADMIN_OPERATIONS);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Admin privileges required");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle handler errors with security headers", async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error("Handler error"));
      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(errorHandler),
        {
          requireAuth: false,
        }
      );

      const event = createMockEvent();
      const result = await securedHandler(event);

      expect(result.statusCode).toBe(500);
      expect(result.headers).toHaveProperty("Strict-Transport-Security");
      expect(result.headers).toHaveProperty("Access-Control-Allow-Origin");
      expect(JSON.parse(result.body).message).toBe("Internal server error");
    });

    it("should handle security middleware errors gracefully", async () => {
      // Mock a security validation that throws an error
      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(mockHandler),
        {
          requireAuth: true,
        }
      );

      // Create an event that will cause JWT parsing to fail
      const malformedEvent = createMockEvent({
        headers: {
          ...createMockEvent().headers,
          "Authorization": "Bearer malformed.jwt.token",
        },
      });

      mockExtractUserIdFromToken.mockImplementation(() => {
        throw new Error("JWT parsing error");
      });

      const result = await securedHandler(malformedEvent);

      expect(result.statusCode).toBe(500);
      expect(result.headers).toHaveProperty("Content-Type", "application/json");
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle multiple concurrent requests efficiently", async () => {
      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(mockHandler),
        {
          requireAuth: true,
          rateLimitConfig: {
            windowMs: 60000,
            maxRequests: 100,
          },
        }
      );

      const event = createMockEvent();
      const promises = Array(10).fill(null).map(() => securedHandler(event));

      const results = await Promise.all(promises);

      // All requests should succeed (within rate limit)
      results.forEach((result) => {
        expect(result.statusCode).toBe(200);
      });

      expect(mockHandler).toHaveBeenCalledTimes(10);
    });

    it("should maintain security headers consistency across requests", async () => {
      const securedHandler = SecurityMiddleware.secureHandler(
        CORSMiddleware.withCORS(mockHandler),
        {
          requireAuth: false,
        }
      );

      const event = createMockEvent();
      const results = await Promise.all([
        securedHandler(event),
        securedHandler(event),
        securedHandler(event),
      ]);

      // Check that all responses have consistent security headers
      const expectedHeaders = [
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Access-Control-Allow-Origin",
      ];

      results.forEach((result) => {
        expectedHeaders.forEach((header) => {
          expect(result.headers).toHaveProperty(header);
        });
      });
    });
  });
});