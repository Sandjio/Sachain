// Cognito Authentication Utilities

import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  userType: 'entrepreneur' | 'investor';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: CognitoUser;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  error?: string;
}

export class CognitoAuth {
  private userPool: CognitoUserPool;

  constructor(config: CognitoConfig) {
    this.userPool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.clientId,
    });
  }

  async signUp(data: SignUpData): Promise<AuthResult> {
    return new Promise((resolve) => {
      const attributes = [
        new CognitoUserAttribute({ Name: 'email', Value: data.email }),
        new CognitoUserAttribute({ Name: 'custom:user_type', Value: data.userType }),
      ];

      if (data.firstName) {
        attributes.push(new CognitoUserAttribute({ Name: 'given_name', Value: data.firstName }));
      }
      if (data.lastName) {
        attributes.push(new CognitoUserAttribute({ Name: 'family_name', Value: data.lastName }));
      }

      this.userPool.signUp(data.email, data.password, attributes, [], (err, result) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }
        resolve({ success: true, user: result?.user });
      });
    });
  }

  async signIn(data: SignInData): Promise<AuthResult> {
    return new Promise((resolve) => {
      const user = new CognitoUser({
        Username: data.email,
        Pool: this.userPool,
      });

      const authDetails = new AuthenticationDetails({
        Username: data.email,
        Password: data.password,
      });

      user.authenticateUser(authDetails, {
        onSuccess: (result) => {
          resolve({
            success: true,
            user,
            accessToken: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken(),
          });
        },
        onFailure: (err) => {
          resolve({ success: false, error: err.message });
        },
      });
    });
  }

  getCurrentUser(): CognitoUser | null {
    return this.userPool.getCurrentUser();
  }

  async getCurrentSession(): Promise<{ accessToken: string; idToken: string } | null> {
    const user = this.getCurrentUser();
    if (!user) return null;

    return new Promise((resolve) => {
      user.getSession((err: any, session: any) => {
        if (err || !session.isValid()) {
          resolve(null);
          return;
        }
        resolve({
          accessToken: session.getAccessToken().getJwtToken(),
          idToken: session.getIdToken().getJwtToken(),
        });
      });
    });
  }

  signOut(): void {
    const user = this.getCurrentUser();
    if (user) {
      user.signOut();
    }
  }
}