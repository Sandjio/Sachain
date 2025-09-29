/**
 * Admin Authentication Service
 * Handles admin user authentication and authorization
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { AdminAuthContext, AdminPermission, ADMIN_ERROR_CODES } from '../../types/admin';
import { structuredLogger } from '../../utils/structured-logger';

const logger = structuredLogger.child({ service: 'admin-auth-service' });

export class AdminAuthService {
  private jwtVerifier: CognitoJwtVerifier;

  constructor() {
    this.jwtVerifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID!,
    });
  }

  /**
   * Authenticate admin user from API Gateway event
   */
  async authenticateAdmin(event: APIGatewayProxyEvent): Promise<AdminAuthContext> {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error(ADMIN_ERROR_CODES.UNAUTHORIZED);
    }

    const token = authHeader.substring(7);

    try {
      const payload = await this.jwtVerifier.verify(token);
      
      // Extract user information
      const adminUserId = payload.sub;
      const groups = payload['cognito:groups'] || [];
      
      // Check if user has admin privileges
      if (!this.isAdminUser(groups)) {
        throw new Error(ADMIN_ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // Map groups to permissions
      const permissions = this.mapGroupsToPermissions(groups);

      logger.info('Admin user authenticated', {
        adminUserId,
        groups,
        permissions,
      });

      return {
        adminUserId,
        permissions,
        sessionId: `session-${Date.now()}`,
      };
    } catch (error) {
      logger.error('Admin authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      if (error instanceof Error && error.message.includes('Token')) {
        throw new Error(ADMIN_ERROR_CODES.UNAUTHORIZED);
      }
      
      throw error;
    }
  }

  /**
   * Check if user has required permission
   */
  requirePermission(authContext: AdminAuthContext, permission: AdminPermission): void {
    if (!authContext.permissions.includes(permission) && !authContext.permissions.includes('system_admin')) {
      logger.warn('Permission denied', {
        adminUserId: authContext.adminUserId,
        requiredPermission: permission,
        userPermissions: authContext.permissions,
      });
      
      throw new Error(ADMIN_ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }
  }

  /**
   * Check if user has any of the required permissions
   */
  requireAnyPermission(authContext: AdminAuthContext, permissions: AdminPermission[]): void {
    const hasPermission = permissions.some(permission => 
      authContext.permissions.includes(permission) || authContext.permissions.includes('system_admin')
    );

    if (!hasPermission) {
      logger.warn('Permission denied - no matching permissions', {
        adminUserId: authContext.adminUserId,
        requiredPermissions: permissions,
        userPermissions: authContext.permissions,
      });
      
      throw new Error(ADMIN_ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }
  }

  // Private helper methods

  private isAdminUser(groups: string[]): boolean {
    const adminGroups = [
      'sachain-admins',
      'sachain-super-admins',
      'sachain-treasury-managers',
      'sachain-compliance-officers',
      'sachain-support-agents',
    ];

    return groups.some(group => adminGroups.includes(group));
  }

  private mapGroupsToPermissions(groups: string[]): AdminPermission[] {
    const permissions: AdminPermission[] = [];

    // Map Cognito groups to permissions
    const groupPermissionMap: Record<string, AdminPermission[]> = {
      'sachain-super-admins': [
        'view_dashboard',
        'view_transactions',
        'retry_transactions',
        'manage_treasury',
        'handle_disputes',
        'generate_reports',
        'system_admin',
      ],
      'sachain-admins': [
        'view_dashboard',
        'view_transactions',
        'retry_transactions',
        'handle_disputes',
        'generate_reports',
      ],
      'sachain-treasury-managers': [
        'view_dashboard',
        'view_transactions',
        'manage_treasury',
        'generate_reports',
      ],
      'sachain-compliance-officers': [
        'view_dashboard',
        'view_transactions',
        'handle_disputes',
        'generate_reports',
      ],
      'sachain-support-agents': [
        'view_dashboard',
        'view_transactions',
        'handle_disputes',
      ],
    };

    // Collect all permissions from user's groups
    groups.forEach(group => {
      const groupPermissions = groupPermissionMap[group];
      if (groupPermissions) {
        permissions.push(...groupPermissions);
      }
    });

    // Remove duplicates
    return [...new Set(permissions)];
  }
}