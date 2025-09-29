/**
 * Integration tests for comprehensive error handling system
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler as projectCreationHandler } from '../../lambdas/project-creation/index';
import { handler as stockMintingHandler } from '../../lambdas/stock-minting/index';
import {
  ProjectError,
  ProjectErrorCategory,
  ProjectErrorClassifier
} from '../../utils/enhanced-error-handler';
import { ErrorResponseFormatter } from '../../utils/error-response-formatter';
import { ProjectRecoveryManager } from '../../utils/error-recovery';

// Mock external dependencies
jest.mock('../../utils/structured-logger');
jest.mock('../../utils/event-publisher');
jest.mock('../../repositories/user-repository');
jest.mock('../../repositories/project-repository');
jest.mock('../../utils/hedera-service');
jest.mock('../../utils/ipfs-service');

describe('Comprehensive Error Handling Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear recovery contexts
    (ProjectRecoveryManager as any).recoveryContexts.clear();
  });

  describe('Project Creation Error Scenarios', () => {
    const createMockEvent = (body: any, headers: any = {}): APIGatewayProxyEvent => ({
      httpMethod: 'POST',
      path: '/projects',
      pathParameters: null,
      queryStringParameters: null,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body),
      isBase64Encoded: false,
      requestContext: {
        requestId: 'test-request-id',
        accountId: 'test-account',
        apiId: 'test-api',
        stage: 'test',
        httpMethod: 'POST',
        path: '/projects',
        protocol: 'HTTP/1.1',
        requestTime: '2023-01-01T00:00:00.000Z',
        requestTimeEpoch: 1672531200000,
        resourceId: 'test-resource',
        resourcePath: '/projects',
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent'
        } as any
      } as any,
      resource: '/projects',
      stageVariables: null,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null
    });

    it('should handle validation errors with proper error classification', async () => {
      const invalidEvent = createMockEvent({
        name: '', // Invalid: empty name
        description: 'Test description',
        category: 'technology'
      }, {
        'Authorization': 'Bearer valid-token'
      });

      const result = await projectCreationHandler(invalidEvent) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toContain('check your input');
      expect(body.requestId).toBe('test-request-id');
      expect(body.details.category).toBe(ProjectErrorCategory.VALIDATION);
      expect(body.details.suggestedActions).toContain('Verify all required fields are provided');
    });

    it('should handle authentication errors with proper error classification', async () => {
      const unauthenticatedEvent = createMockEvent({
        name: 'Test Project',
        description: 'Test description',
        category: 'technology'
      }); // No Authorization header

      const result = await projectCreationHandler(unauthenticatedEvent) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body.code).toBe('AUTHENTICATION_ERROR');
      expect(body.message).toContain('log in again');
      expect(body.details.category).toBe(ProjectErrorCategory.AUTHENTICATION);
      expect(body.details.suggestedActions).toContain('Refresh your authentication token');
    });

    it('should handle business logic errors with proper error classification', async () => {
      // Mock KYC not verified scenario
      const mockUserRepository = require('../../repositories/user-repository');
      mockUserRepository.UserRepository.mockImplementation(() => ({
        getUserProfile: jest.fn().mockResolvedValue({
          kycStatus: 'pending' // Not approved
        })
      }));

      const event = createMockEvent({
        name: 'Test Project',
        description: 'Test description',
        category: 'technology'
      }, {
        'Authorization': 'Bearer valid-token'
      });

      const result = await projectCreationHandler(event) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(body.message).toContain('business rules');
      expect(body.details.category).toBe(ProjectErrorCategory.BUSINESS_LOGIC);
    });

    it('should handle database errors with retry capability', async () => {
      // Mock database error
      const mockProjectRepository = require('../../repositories/project-repository');
      mockProjectRepository.ProjectRepository.mockImplementation(() => ({
        createProject: jest.fn().mockRejectedValue(
          Object.assign(new Error('ProvisionedThroughputExceededException'), {
            name: 'ProvisionedThroughputExceededException'
          })
        )
      }));

      const mockUserRepository = require('../../repositories/user-repository');
      mockUserRepository.UserRepository.mockImplementation(() => ({
        getUserProfile: jest.fn().mockResolvedValue({
          kycStatus: 'approved'
        })
      }));

      const event = createMockEvent({
        name: 'Test Project',
        description: 'Test description',
        category: 'technology'
      }, {
        'Authorization': 'Bearer valid-token'
      });

      const result = await projectCreationHandler(event) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(429);

      const body = JSON.parse(result.body);
      expect(body.code).toBe('DATABASE_ERROR');
      expect(body.message).toContain('busy');
      expect(body.details.category).toBe(ProjectErrorCategory.RATE_LIMIT);
    });

    it('should handle system errors with proper classification', async () => {
      // Mock unexpected system error
      const mockProjectRepository = require('../../repositories/project-repository');
      mockProjectRepository.ProjectRepository.mockImplementation(() => ({
        createProject: jest.fn().mockRejectedValue(new Error('Unexpected system error'))
      }));

      const mockUserRepository = require('../../repositories/user-repository');
      mockUserRepository.UserRepository.mockImplementation(() => ({
        getUserProfile: jest.fn().mockResolvedValue({
          kycStatus: 'approved'
        })
      }));

      const event = createMockEvent({
        name: 'Test Project',
        description: 'Test description',
        category: 'technology'
      }, {
        'Authorization': 'Bearer valid-token'
      });

      const result = await projectCreationHandler(event) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.code).toBe('SYSTEM_ERROR');
      expect(body.message).toContain('unexpected error');
      expect(body.details.category).toBe(ProjectErrorCategory.SYSTEM);
      expect(body.details.suggestedActions).toContain('Contact technical support');
    });
  });

  describe('Stock Minting Error Scenarios', () => {
    const createMockStockMintingEvent = (
      projectId: string,
      body: any,
      headers: any = {}
    ): APIGatewayProxyEvent => ({
      httpMethod: 'POST',
      path: `/projects/${projectId}/mint-stocks`,
      pathParameters: { projectId },
      queryStringParameters: null,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body),
      isBase64Encoded: false,
      requestContext: {
        requestId: 'test-request-id',
        accountId: 'test-account',
        apiId: 'test-api',
        stage: 'test',
        httpMethod: 'POST',
        path: `/projects/${projectId}/mint-stocks`,
        protocol: 'HTTP/1.1',
        requestTime: '2023-01-01T00:00:00.000Z',
        requestTimeEpoch: 1672531200000,
        resourceId: 'test-resource',
        resourcePath: '/projects/{projectId}/mint-stocks',
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent'
        } as any
      } as any,
      resource: '/projects/{projectId}/mint-stocks',
      stageVariables: null,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null
    });

    it('should handle Hedera service errors with retry capability', async () => {
      // Mock successful project validation but Hedera service failure
      const mockProjectRepository = require('../../repositories/project-repository');
      mockProjectRepository.ProjectRepository.mockImplementation(() => ({
        getProject: jest.fn().mockResolvedValue({
          projectId: 'test-project-id',
          entrepreneurId: 'test-user-id',
          status: 'draft',
          stockSupply: 100
        }),
        updateProject: jest.fn().mockResolvedValue(undefined)
      }));

      const mockHederaService = require('../../utils/hedera-service');
      mockHederaService.createHederaService.mockReturnValue({
        calculateGasFees: jest.fn().mockResolvedValue({
          totalEstimate: '10.0'
        }),
        validateWallet: jest.fn().mockResolvedValue({
          isValid: true,
          canAffordOperation: true,
          balance: '100.0'
        }),
        createToken: jest.fn().mockRejectedValue(new Error('Hedera network unavailable'))
      });

      const event = createMockStockMintingEvent(
        'test-project-id',
        { walletAddress: '0x123456789' },
        { 'Authorization': 'Bearer valid-token' }
      );

      const result = await stockMintingHandler(event) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(503);

      const body = JSON.parse(result.body);
      expect(body.code).toBe('HEDERA_SERVICE_ERROR');
      expect(body.message).toContain('temporarily unavailable');
      expect(body.details.category).toBe(ProjectErrorCategory.EXTERNAL_SERVICE);
      expect(body.details.suggestedActions).toContain('Check wallet balance for gas fees');
    });

    it('should handle insufficient wallet balance errors', async () => {
      // Mock project validation success but insufficient wallet balance
      const mockProjectRepository = require('../../repositories/project-repository');
      mockProjectRepository.ProjectRepository.mockImplementation(() => ({
        getProject: jest.fn().mockResolvedValue({
          projectId: 'test-project-id',
          entrepreneurId: 'test-user-id',
          status: 'draft',
          stockSupply: 100
        })
      }));

      const mockHederaService = require('../../utils/hedera-service');
      mockHederaService.createHederaService.mockReturnValue({
        calculateGasFees: jest.fn().mockResolvedValue({
          totalEstimate: '100.0'
        }),
        validateWallet: jest.fn().mockResolvedValue({
          isValid: true,
          canAffordOperation: false,
          balance: '10.0',
          estimatedGasFee: '100.0'
        })
      });

      const event = createMockStockMintingEvent(
        'test-project-id',
        { walletAddress: '0x123456789' },
        { 'Authorization': 'Bearer valid-token' }
      );

      const result = await stockMintingHandler(event) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(402);

      const body = JSON.parse(result.body);
      expect(body.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(body.message).toContain('business rules');
      expect(body.details.category).toBe(ProjectErrorCategory.BUSINESS_LOGIC);
    });

    it('should handle project not found errors', async () => {
      const mockProjectRepository = require('../../repositories/project-repository');
      mockProjectRepository.ProjectRepository.mockImplementation(() => ({
        getProject: jest.fn().mockResolvedValue(null)
      }));

      const event = createMockStockMintingEvent(
        'non-existent-project',
        { walletAddress: '0x123456789' },
        { 'Authorization': 'Bearer valid-token' }
      );

      const result = await stockMintingHandler(event) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(body.message).toContain('business rules');
      expect(body.details.category).toBe(ProjectErrorCategory.BUSINESS_LOGIC);
    });
  });

  describe('Error Recovery and Rollback Integration', () => {
    it('should execute rollback operations on project creation failure', async () => {
      const mockProjectRepository = require('../../repositories/project-repository');
      const mockDeleteProject = jest.fn().mockResolvedValue(undefined);
      
      mockProjectRepository.ProjectRepository.mockImplementation(() => ({
        createProject: jest.fn().mockResolvedValue({
          projectId: 'test-project-id',
          name: 'Test Project'
        }),
        deleteProject: mockDeleteProject
      }));

      const mockUserRepository = require('../../repositories/user-repository');
      mockUserRepository.UserRepository.mockImplementation(() => ({
        getUserProfile: jest.fn().mockResolvedValue({
          kycStatus: 'approved'
        })
      }));

      // Mock event publisher to fail (simulating downstream failure)
      const mockEventPublisher = require('../../utils/event-publisher');
      mockEventPublisher.EventPublisher.mockImplementation(() => ({
        publishProjectCreatedEvent: jest.fn().mockRejectedValue(new Error('Event publishing failed'))
      }));

      const event = {
        httpMethod: 'POST',
        path: '/projects',
        pathParameters: null,
        queryStringParameters: null,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          name: 'Test Project',
          description: 'Test description',
          category: 'technology'
        }),
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id'
        } as any
      } as APIGatewayProxyEvent;

      const result = await projectCreationHandler(event) as APIGatewayProxyResult;

      // Should still succeed as event publishing is not critical
      expect(result.statusCode).toBe(201);
    });

    it('should handle rollback failures gracefully', async () => {
      const mockProjectRepository = require('../../repositories/project-repository');
      const mockDeleteProject = jest.fn().mockRejectedValue(new Error('Rollback failed'));
      
      mockProjectRepository.ProjectRepository.mockImplementation(() => ({
        createProject: jest.fn().mockResolvedValue({
          projectId: 'test-project-id',
          name: 'Test Project'
        }),
        deleteProject: mockDeleteProject,
        updateProject: jest.fn().mockRejectedValue(new Error('Critical failure after project creation'))
      }));

      const mockUserRepository = require('../../repositories/user-repository');
      mockUserRepository.UserRepository.mockImplementation(() => ({
        getUserProfile: jest.fn().mockResolvedValue({
          kycStatus: 'approved'
        })
      }));

      const event = {
        httpMethod: 'POST',
        path: '/projects',
        pathParameters: null,
        queryStringParameters: null,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          name: 'Test Project',
          description: 'Test description',
          category: 'technology'
        }),
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id'
        } as any
      } as APIGatewayProxyEvent;

      const result = await projectCreationHandler(event) as APIGatewayProxyResult;

      // Should return error but not crash due to rollback failure
      expect(result.statusCode).toBe(500);
      expect(mockDeleteProject).toHaveBeenCalled();
    });
  });

  describe('Error Classification Integration', () => {
    it('should classify various error types correctly', () => {
      const testCases = [
        {
          error: new Error('Validation failed: required field missing'),
          expectedCategory: ProjectErrorCategory.VALIDATION,
          expectedStatusCode: 400
        },
        {
          error: Object.assign(new Error('Invalid token'), { name: 'UnauthorizedException' }),
          expectedCategory: ProjectErrorCategory.AUTHENTICATION,
          expectedStatusCode: 401
        },
        {
          error: new Error('Access denied to resource'),
          expectedCategory: ProjectErrorCategory.AUTHORIZATION,
          expectedStatusCode: 403
        },
        {
          error: new Error('KYC not verified'),
          expectedCategory: ProjectErrorCategory.BUSINESS_LOGIC,
          expectedStatusCode: 422
        },
        {
          error: new Error('Hedera service unavailable'),
          expectedCategory: ProjectErrorCategory.EXTERNAL_SERVICE,
          expectedStatusCode: 503
        },
        {
          error: Object.assign(new Error('ThrottlingException'), { name: 'ThrottlingException' }),
          expectedCategory: ProjectErrorCategory.RATE_LIMIT,
          expectedStatusCode: 429
        },
        {
          error: new Error('Network timeout'),
          expectedCategory: ProjectErrorCategory.TIMEOUT,
          expectedStatusCode: 504
        }
      ];

      testCases.forEach(({ error, expectedCategory, expectedStatusCode }) => {
        const classified = ProjectErrorClassifier.classify(error, {
          operation: 'test-operation',
          requestId: 'test-request-id'
        });

        expect(classified.category).toBe(expectedCategory);
        expect(classified.httpStatusCode).toBe(expectedStatusCode);
        expect(classified.suggestedActions).toBeDefined();
        expect(classified.suggestedActions!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Response Formatting Integration', () => {
    it('should format error responses consistently', () => {
      const projectError = new ProjectError({
        category: ProjectErrorCategory.VALIDATION,
        severity: 'low' as any,
        retryable: false,
        recoveryStrategy: 'none' as any,
        userMessage: 'Invalid input provided',
        technicalMessage: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        httpStatusCode: 400,
        context: {
          operation: 'test-operation',
          requestId: 'test-request-id',
          timestamp: new Date().toISOString(),
          environment: 'test',
          service: 'test-service'
        }
      });

      const response = ErrorResponseFormatter.formatErrorResponse(projectError);

      expect(response.statusCode).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(response.body);
      expect(body.message).toBe('Invalid input provided');
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.requestId).toBe('test-request-id');
      expect(body.details).toBeDefined();
    });

    it('should format success responses consistently', () => {
      const data = { id: '123', name: 'Test Project' };
      const response = ErrorResponseFormatter.formatSuccessResponse(data, 201, 'Created successfully');

      expect(response.statusCode).toBe(201);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.message).toBe('Created successfully');
      expect(body.timestamp).toBeDefined();
    });
  });
});