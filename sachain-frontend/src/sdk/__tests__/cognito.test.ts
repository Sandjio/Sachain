// Unit tests for Cognito authentication utilities

import { CognitoAuth, CognitoConfig, SignUpData, SignInData } from '../auth/cognito';

// Mock amazon-cognito-identity-js
jest.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: jest.fn().mockImplementation(() => ({
    signUp: jest.fn(),
    getCurrentUser: jest.fn(),
  })),
  CognitoUser: jest.fn().mockImplementation(() => ({
    authenticateUser: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
  })),
  AuthenticationDetails: jest.fn(),
  CognitoUserAttribute: jest.fn(),
}));

describe('CognitoAuth', () => {
  const mockConfig: CognitoConfig = {
    userPoolId: 'us-east-1_test',
    clientId: 'test-client-id',
    region: 'us-east-1',
  };

  let cognitoAuth: CognitoAuth;

  beforeEach(() => {
    cognitoAuth = new CognitoAuth(mockConfig);
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should sign up user successfully', async () => {
      const signUpData: SignUpData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'investor',
      };

      const mockUserPool = (cognitoAuth as any).userPool;
      mockUserPool.signUp.mockImplementation((email, password, attributes, validationData, callback) => {
        callback(null, { user: { username: email } });
      });

      const result = await cognitoAuth.signUp(signUpData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(mockUserPool.signUp).toHaveBeenCalledWith(
        signUpData.email,
        signUpData.password,
        expect.any(Array),
        [],
        expect.any(Function)
      );
    });

    it('should handle sign up error', async () => {
      const signUpData: SignUpData = {
        email: 'test@example.com',
        password: 'weak',
        userType: 'investor',
      };

      const mockUserPool = (cognitoAuth as any).userPool;
      mockUserPool.signUp.mockImplementation((email, password, attributes, validationData, callback) => {
        callback(new Error('Password too weak'));
      });

      const result = await cognitoAuth.signUp(signUpData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password too weak');
    });
  });

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const signInData: SignInData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const mockResult = {
        getAccessToken: () => ({ getJwtToken: () => 'access-token' }),
        getIdToken: () => ({ getJwtToken: () => 'id-token' }),
        getRefreshToken: () => ({ getToken: () => 'refresh-token' }),
      };

      const { CognitoUser } = require('amazon-cognito-identity-js');
      CognitoUser.mockImplementation(() => ({
        authenticateUser: jest.fn().mockImplementation((authDetails, callbacks) => {
          callbacks.onSuccess(mockResult);
        }),
      }));

      const result = await cognitoAuth.signIn(signInData);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('access-token');
      expect(result.idToken).toBe('id-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should handle sign in error', async () => {
      const signInData: SignInData = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const { CognitoUser } = require('amazon-cognito-identity-js');
      CognitoUser.mockImplementation(() => ({
        authenticateUser: jest.fn().mockImplementation((authDetails, callbacks) => {
          callbacks.onFailure(new Error('Incorrect username or password'));
        }),
      }));

      const result = await cognitoAuth.signIn(signInData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Incorrect username or password');
    });
  });

  describe('getCurrentSession', () => {
    it('should return current session when valid', async () => {
      const mockUser = {
        getSession: jest.fn().mockImplementation((callback) => {
          const mockSession = {
            isValid: () => true,
            getAccessToken: () => ({ getJwtToken: () => 'access-token' }),
            getIdToken: () => ({ getJwtToken: () => 'id-token' }),
          };
          callback(null, mockSession);
        }),
      };

      const mockUserPool = (cognitoAuth as any).userPool;
      mockUserPool.getCurrentUser.mockReturnValue(mockUser);

      const session = await cognitoAuth.getCurrentSession();

      expect(session).toEqual({
        accessToken: 'access-token',
        idToken: 'id-token',
      });
    });

    it('should return null when no user', async () => {
      const mockUserPool = (cognitoAuth as any).userPool;
      mockUserPool.getCurrentUser.mockReturnValue(null);

      const session = await cognitoAuth.getCurrentSession();

      expect(session).toBeNull();
    });
  });
});