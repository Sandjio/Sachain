// Sachain Frontend SDK

export * from './types/api';
export * from './auth/cognito';
export * from './upload/kyc';

import { CognitoAuth, CognitoConfig } from './auth/cognito';
import { KYCUploader } from './upload/kyc';

export interface SachainSDKConfig {
  apiBaseUrl: string;
  cognito: CognitoConfig;
}

export class SachainSDK {
  public auth: CognitoAuth;
  public kyc: KYCUploader;

  constructor(config: SachainSDKConfig) {
    this.auth = new CognitoAuth(config.cognito);
    this.kyc = new KYCUploader(config.apiBaseUrl, this.getAuthToken.bind(this));
  }

  private async getAuthToken(): Promise<string | null> {
    const session = await this.auth.getCurrentSession();
    return session?.accessToken || null;
  }
}