/**
 * CognitoConstruct sets up an Amazon Cognito User Pool with standard configurations.
 * It includes password policies, custom attributes, user groups, and OAuth settings.
 * The construct also integrates Lambda triggers for post-authentication and post-confirmation events.
 * This setup ensures a secure and flexible authentication system for the Sachain application.
 */

import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import { EnvironmentType } from "../types";

export interface CognitoConstructProps {
  postAuthLambda?: lambda.IFunction;
  postAddUserToGroupLambda?: lambda.IFunction;
  environment: EnvironmentType;
}

export class CognitoConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, "SachainUserPool", {
      selfSignUpEnabled: true,
      signInCaseSensitive: true,

      // Email verification configuration
      signInAliases: {
        email: true,
        username: false,
        phone: false,
      },
      autoVerify: {
        email: true,
      },

      // Password policies
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },

      // Custom attributes for user metadata
      customAttributes: {
        userType: new cognito.StringAttribute({
          mutable: true,
        }),
        kycStatus: new cognito.StringAttribute({
          mutable: true,
        }),
      },

      // Standard attributes
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },

      // Account recovery settings
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // Device tracking
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: false,
      },

      // Email configuration
      email: cognito.UserPoolEmail.withCognito(),

      // User invitation settings
      userInvitation: {
        emailSubject: "Welcome to Sachain - Verify your account",
        emailBody:
          "Hello {username}, welcome to Sachain! Your temporary password is {####}. Please sign in and change your password.",
      },

      // User verification settings
      userVerification: {
        emailSubject: "Verify your email for Sachain",
        emailBody:
          "Thank you for signing up to Sachain! Your verification code is {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },

      // Lambda triggers - conditionally configured to avoid circular dependencies
      ...(props.postAuthLambda || props.postAddUserToGroupLambda
        ? {
            lambdaTriggers: {
              ...(props.postAuthLambda && {
                postAuthentication: props.postAuthLambda,
              }),
              ...(props.postAddUserToGroupLambda && {
                postConfirmation: props.postAddUserToGroupLambda,
              }),
            },
          }
        : {}),

      // Deletion protection
      removalPolicy:
        props.environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    // Managed UI domain for Cognito User Pool
    this.userPool.addDomain("CognitoDomain", {
      cognitoDomain: {
        domainPrefix: `sachain-${props.environment}`,
      },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });

    // Add Groups to the user pool
    this.userPool.addGroup("EntrepreneurGroup", {
      groupName: "Entrepreneur",
      description: "Group for entrepreneurs",
      precedence: 1,
    });
    this.userPool.addGroup("InvestorGroup", {
      groupName: "Investor",
      description: "Group for investors",
      precedence: 2,
    });
    this.userPool.addGroup("AdminGroup", {
      groupName: "Admin",
      description: "Group for admins",
      precedence: 0,
    });

    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: `sachain-client-${props.environment}`,

      // Authentication flows
      authFlows: {
        userSrp: true,
        userPassword: true,
        adminUserPassword: true,
        custom: false,
      },

      // OAuth configuration
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
          clientCredentials: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          `https://sachain-${props.environment}.com/auth/callback`,
          "http://localhost:3000/auth/callback", // For development
        ],
        logoutUrls: [
          `https://sachain-${props.environment}.com/auth/logout`,
          "http://localhost:3000/auth/logout", // For development
        ],
      },

      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),

      // Security settings
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,

      // Read and write attributes
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          emailVerified: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes("userType"),

      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes("userType"),

      // Generate secret for server-side applications
      generateSecret: false,
    });
  }
}
