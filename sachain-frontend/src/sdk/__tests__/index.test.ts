// Unit tests for main SDK

// Mock the auth and upload modules
jest.mock('../auth/cognito', () => ({
  CognitoAuth: jest.fn(),
}));

jest.mock('../upload/kyc', () => ({
  KYCUploader: jest.fn(),
}));

import { SachainSDK, SachainSDKConfig } from '../index';
import { CognitoAuth } from '../auth/cognito';
import { KYCUploader } from '../upload/kyc';

const mockCognitoAuth = CognitoAuth as jest.MockedClass<typeof CognitoAuth>;
const mockKYCUploader = KYCUploader as jest.MockedClass<typeof KYCUploader>;

describe('SachainSDK', () => {
  const mockConfig: SachainSDKConfig = {
    apiBaseUrl: 'https://api.example.com',
    cognito: {
      userPoolId: 'us-east-1_test',
      clientId: 'test-client-id',
      region: 'us-east-1',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with auth and kyc modules', () => {
    const sdk = new SachainSDK(mockConfig);
    expect(sdk.auth).toBeDefined();
    expect(sdk.kyc).toBeDefined();
  });

  it('should pass correct config to auth module', () => {
    new SachainSDK(mockConfig);
    expect(mockCognitoAuth).toHaveBeenCalledWith(mockConfig.cognito);
  });

  it('should pass correct config to kyc module', () => {
    new SachainSDK(mockConfig);
    expect(mockKYCUploader).toHaveBeenCalledWith(
      mockConfig.apiBaseUrl,
      expect.any(Function)
    );
  });
});