/**
 * Admin Auth Service Tests
 */

import { AdminAuthService } from '../admin-auth-service';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { ADMIN_ERROR_CODES } from '../../../types/admin';

// Mock aws-jwt-verify
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({
      verify: jest.fn(),
    })),
  },
}));

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let mockVerifier: { verify: jest.Mock };

  beforeEach(() => {
    const { CognitoJwtVerifier } = require('aws-jwt-verify');
    mockVerifier = { verify: jest.fn() };
    CognitoJwtVerifier.create.mockReturnValue(mockVerifier);

    service = new AdminAuthService();
  });

  describe('authenticateAdmin', () => {
    const createMockEvent = (authHeader?: string): APIGatewayProxyEvent => ({
      headers: authHeader ? { Authorization: authHeader } : {},
      requestContext: { requestId: 'test-request' },
    } as any);

    it('should authenticate valid admin user', async () => {
      // Arrange
      const mockPayload = {
        sub: 'admin123',
        'cognito:groups': ['sachain-admins'],
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      const event = createMockEvent('Bearer valid-token');

      // Act
      const result = await service.authenticateAdmin(event);

      // Assert
      expect(result).toEqual({
        adminUserId: 'admin123',
        permissions: [
          'view_dashboard',
          'view_transactions',
          'retry_transactions',
          'handle_disputes',
          'generate_reports',
        ],
        sessionId: expect.any(String),
      });
    });

    it('should authenticate super admin with all permissions', async () => {
      // Arrange
      const mockPayload = {
        sub: 'superadmin123',
        'cognito:groups': ['sachain-super-admins'],
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      const event = createMockEvent('Bearer valid-token');

      // Act
      const result = await service.authenticateAdmin(event);

      // Assert
      expect(result.permissions).toContain('system_admin');
      expect(result.permissions).toContain('manage_treasury');
    });

    it('should throw unauthorized error for missing auth header', async () => {
      // Arrange
      const event = createMockEvent();

      // Act & Assert
      await expect(service.authenticateAdmin(event)).rejects.toThrow(
        ADMIN_ERROR_CODES.UNAUTHORIZED
      );
    });

    it('should throw unauthorized error for invalid auth header format', async () => {
      // Arrange
      const event = createMockEvent('Invalid token');

      // Act & Assert
      await expect(service.authenticateAdmin(event)).rejects.toThrow(
        ADMIN_ERROR_CODES.UNAUTHORIZED
      );
    });

    it('should throw insufficient permissions for non-admin user', async () => {
      // Arrange
      const mockPayload = {
        sub: 'user123',
        'cognito:groups': ['sachain-users'],
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      const event = createMockEvent('Bearer valid-token');

      // Act & Assert
      await expect(service.authenticateAdmin(event)).rejects.toThrow(
        ADMIN_ERROR_CODES.INSUFFICIENT_PERMISSIONS
      );
    });

    it('should throw unauthorized error for invalid token', async () => {
      // Arrange
      mockVerifier.verify.mockRejectedValue(new Error('Token verification failed'));

      const event = createMockEvent('Bearer invalid-token');

      // Act & Assert
      await expect(service.authenticateAdmin(event)).rejects.toThrow(
        ADMIN_ERROR_CODES.UNAUTHORIZED
      );
    });

    it('should handle user with multiple admin groups', async () => {
      // Arrange
      const mockPayload = {
        sub: 'admin123',
        'cognito:groups': ['sachain-admins', 'sachain-treasury-managers'],
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      const event = createMockEvent('Bearer valid-token');

      // Act
      const result = await service.authenticateAdmin(event);

      // Assert
      expect(result.permissions).toContain('view_dashboard');
      expect(result.permissions).toContain('manage_treasury');
      // Should not have duplicates
      const uniquePermissions = [...new Set(result.permissions)];
      expect(result.permissions.length).toBe(uniquePermissions.length);
    });
  });

  describe('requirePermission', () => {
    it('should allow access with correct permission', () => {
      // Arrange
      const authContext = {
        adminUserId: 'admin123',
        permissions: ['view_dashboard', 'view_transactions'],
        sessionId: 'session123',
      };

      // Act & Assert
      expect(() => {
        service.requirePermission(authContext, 'view_dashboard');
      }).not.toThrow();
    });

    it('should allow access for system admin', () => {
      // Arrange
      const authContext = {
        adminUserId: 'admin123',
        permissions: ['system_admin'],
        sessionId: 'session123',
      };

      // Act & Assert
      expect(() => {
        service.requirePermission(authContext, 'manage_treasury');
      }).not.toThrow();
    });

    it('should deny access without required permission', () => {
      // Arrange
      const authContext = {
        adminUserId: 'admin123',
        permissions: ['view_dashboard'],
        sessionId: 'session123',
      };

      // Act & Assert
      expect(() => {
        service.requirePermission(authContext, 'manage_treasury');
      }).toThrow(ADMIN_ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });
  });

  describe('requireAnyPermission', () => {
    it('should allow access with one of required permissions', () => {
      // Arrange
      const authContext = {
        adminUserId: 'admin123',
        permissions: ['view_dashboard', 'view_transactions'],
        sessionId: 'session123',
      };

      // Act & Assert
      expect(() => {
        service.requireAnyPermission(authContext, ['manage_treasury', 'view_dashboard']);
      }).not.toThrow();
    });

    it('should deny access without any required permissions', () => {
      // Arrange
      const authContext = {
        adminUserId: 'admin123',
        permissions: ['view_dashboard'],
        sessionId: 'session123',
      };

      // Act & Assert
      expect(() => {
        service.requireAnyPermission(authContext, ['manage_treasury', 'handle_disputes']);
      }).toThrow(ADMIN_ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    it('should allow system admin for any permission', () => {
      // Arrange
      const authContext = {
        adminUserId: 'admin123',
        permissions: ['system_admin'],
        sessionId: 'session123',
      };

      // Act & Assert
      expect(() => {
        service.requireAnyPermission(authContext, ['manage_treasury', 'handle_disputes']);
      }).not.toThrow();
    });
  });

  describe('permission mapping', () => {
    it('should map treasury manager group correctly', async () => {
      // Arrange
      const mockPayload = {
        sub: 'treasury123',
        'cognito:groups': ['sachain-treasury-managers'],
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      const event = createMockEvent('Bearer valid-token');

      // Act
      const result = await service.authenticateAdmin(event);

      // Assert
      expect(result.permissions).toEqual([
        'view_dashboard',
        'view_transactions',
        'manage_treasury',
        'generate_reports',
      ]);
    });

    it('should map compliance officer group correctly', async () => {
      // Arrange
      const mockPayload = {
        sub: 'compliance123',
        'cognito:groups': ['sachain-compliance-officers'],
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      const event = createMockEvent('Bearer valid-token');

      // Act
      const result = await service.authenticateAdmin(event);

      // Assert
      expect(result.permissions).toEqual([
        'view_dashboard',
        'view_transactions',
        'handle_disputes',
        'generate_reports',
      ]);
    });

    it('should map support agent group correctly', async () => {
      // Arrange
      const mockPayload = {
        sub: 'support123',
        'cognito:groups': ['sachain-support-agents'],
      };

      mockVerifier.verify.mockResolvedValue(mockPayload);

      const event = createMockEvent('Bearer valid-token');

      // Act
      const result = await service.authenticateAdmin(event);

      // Assert
      expect(result.permissions).toEqual([
        'view_dashboard',
        'view_transactions',
        'handle_disputes',
      ]);
    });
  });
});