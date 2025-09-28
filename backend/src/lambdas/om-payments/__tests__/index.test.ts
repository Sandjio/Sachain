/**
 * Unit tests for Orange Money Lambda Handler
 * Tests both regular payments and HBAR recharge functionality
 */

import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../index";
import { HBARRechargePaymentRequest, PaymentRequest } from "../types";

// Mock the recharge service
jest.mock("../recharge-service", () => ({
  OrangeMoneyRechargeService: jest.fn().mockImplementation(() => ({
    initiateRechargePayment: jest.fn(),
  })),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("Orange Money Lambda Handler", () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  const createMockEvent = (body: any): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/om-payments",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: "",
  });

  describe("Regular Orange Money Payments", () => {
    it("should handle regular payment requests", async () => {
      const paymentRequest: PaymentRequest = {
        customerNumber: "677123456",
        amount: "50000",
        pin: "1234",
        description: "Test payment",
        orderId: "order-123",
      };

      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "mock-access-token",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: "Success",
            data: { payToken: "mock-pay-token" },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: "Payment created",
            data: {
              id: 12345,
              createtime: "2024-01-01T10:00:00Z",
              subscriberMsisdn: "677123456",
              amount: 50000,
              payToken: "mock-pay-token",
              txnid: "om-txn-789",
              txnmode: "PUSH",
              inittxnmessage: "Transaction initiated",
              inittxnstatus: "PENDING",
              confirmtxnstatus: null,
              confirmtxnmessage: null,
              status: "PENDING",
              notifUrl: "",
              description: "Test payment",
              channelUserMsisdn: "657615723",
            },
          }),
        } as Response);

      const event = createMockEvent(paymentRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should return 400 for missing required parameters", async () => {
      const invalidRequest = {
        customerNumber: "",
        amount: "50000",
        // Missing pin
      };

      const event = createMockEvent(invalidRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Missing required parameters");
    });
  });

  describe("HBAR Recharge Payments", () => {
    it("should handle HBAR recharge requests", async () => {
      const rechargeRequest: HBARRechargePaymentRequest = {
        transactionId: "txn-123",
        userId: "user-456",
        userHederaAccountId: "0.0.123456",
        customerNumber: "677123456",
        amount: "50000",
        xafAmount: 50000,
        estimatedHBARAmount: 25.5,
        pin: "1234",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 1000,
          totalFees: 1500,
        },
      };

      // Mock the recharge service
      const { OrangeMoneyRechargeService } = require("../recharge-service");
      const mockInitiateRechargePayment = jest.fn().mockResolvedValue({
        success: true,
        transactionId: "txn-123",
        orangeMoneyTransactionId: "om-txn-789",
        paymentData: {
          id: 12345,
          status: "PENDING",
        },
      });

      OrangeMoneyRechargeService.mockImplementation(() => ({
        initiateRechargePayment: mockInitiateRechargePayment,
      }));

      const event = createMockEvent(rechargeRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.transactionId).toBe("txn-123");
      expect(responseBody.orangeMoneyTransactionId).toBe("om-txn-789");
      expect(responseBody.status).toBe("payment_initiated");
      expect(mockInitiateRechargePayment).toHaveBeenCalledWith(rechargeRequest);
    });

    it("should handle HBAR recharge validation errors", async () => {
      const invalidRechargeRequest: HBARRechargePaymentRequest = {
        transactionId: "txn-123",
        userId: "user-456",
        userHederaAccountId: "0.0.123456",
        customerNumber: "677123456",
        amount: "500", // Below minimum
        xafAmount: 500,
        estimatedHBARAmount: 0.25,
        pin: "1234",
        fees: {
          orangeMoneyFee: 5,
          platformFee: 10,
          totalFees: 15,
        },
      };

      // Mock the recharge service to return validation error
      const { OrangeMoneyRechargeService } = require("../recharge-service");
      const mockInitiateRechargePayment = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: "OM_AMOUNT_TOO_LOW",
          message: "Amount must be at least 1,000 XAF",
        },
      });

      OrangeMoneyRechargeService.mockImplementation(() => ({
        initiateRechargePayment: mockInitiateRechargePayment,
      }));

      const event = createMockEvent(invalidRechargeRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe("OM_AMOUNT_TOO_LOW");
      expect(responseBody.error.message).toContain("1,000 XAF");
    });

    it("should handle HBAR recharge service errors", async () => {
      const rechargeRequest: HBARRechargePaymentRequest = {
        transactionId: "txn-123",
        userId: "user-456",
        userHederaAccountId: "0.0.123456",
        customerNumber: "677123456",
        amount: "50000",
        xafAmount: 50000,
        estimatedHBARAmount: 25.5,
        pin: "1234",
        fees: {
          orangeMoneyFee: 500,
          platformFee: 1000,
          totalFees: 1500,
        },
      };

      // Mock the recharge service to throw an error
      const { OrangeMoneyRechargeService } = require("../recharge-service");
      const mockInitiateRechargePayment = jest
        .fn()
        .mockRejectedValue(new Error("Service unavailable"));

      OrangeMoneyRechargeService.mockImplementation(() => ({
        initiateRechargePayment: mockInitiateRechargePayment,
      }));

      const event = createMockEvent(rechargeRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe("INTERNAL_ERROR");
      expect(responseBody.error.message).toContain("Internal server error");
    });
  });

  describe("General Error Handling", () => {
    it("should return 400 for missing body", async () => {
      const event: APIGatewayProxyEvent = {
        body: null,
        headers: {},
        multiValueHeaders: {},
        httpMethod: "POST",
        isBase64Encoded: false,
        path: "/om-payments",
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Missing body");
    });

    it("should handle JSON parsing errors", async () => {
      const event: APIGatewayProxyEvent = {
        body: "invalid json",
        headers: {},
        multiValueHeaders: {},
        httpMethod: "POST",
        isBase64Encoded: false,
        path: "/om-payments",
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: "",
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Internal server error");
    });

    it("should handle Orange Money API errors for regular payments", async () => {
      const paymentRequest: PaymentRequest = {
        customerNumber: "677123456",
        amount: "50000",
        pin: "1234",
      };

      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const event = createMockEvent(paymentRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe("Internal server error");
      expect(responseBody.error).toBe("Network error");
    });
  });

  describe("Request Type Detection", () => {
    it("should correctly identify HBAR recharge requests", async () => {
      const rechargeRequest = {
        transactionId: "txn-123",
        userHederaAccountId: "0.0.123456",
        customerNumber: "677123456",
        amount: "50000",
        pin: "1234",
      };

      // Mock the recharge service
      const { OrangeMoneyRechargeService } = require("../recharge-service");
      const mockInitiateRechargePayment = jest.fn().mockResolvedValue({
        success: true,
        transactionId: "txn-123",
      });

      OrangeMoneyRechargeService.mockImplementation(() => ({
        initiateRechargePayment: mockInitiateRechargePayment,
      }));

      const event = createMockEvent(rechargeRequest);
      await handler(event);

      expect(mockInitiateRechargePayment).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled(); // Should not call regular payment APIs
    });

    it("should correctly identify regular payment requests", async () => {
      const paymentRequest = {
        customerNumber: "677123456",
        amount: "50000",
        pin: "1234",
        // No transactionId or userHederaAccountId
      };

      // Mock successful API responses for regular payment
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: "token" }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { payToken: "token" } }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 123 } }),
        } as Response);

      const event = createMockEvent(paymentRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Should call regular payment APIs
    });
  });
});
