import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface CognitoConstructProps {
  postAuthLambda: lambda.Function;
  environment: string;
}

export class CognitoConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    // Task 3.1: Configure User Pool with password policies and security settings
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `sachain-user-pool-${props.environment}`,

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
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },

      // Account recovery settings
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // Advanced security features
      advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,

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

      // Lambda triggers - will be configured in task 3.2
      lambdaTriggers: {
        postAuthentication: props.postAuthLambda,
      },

      // Deletion protection
      removalPolicy:
        props.environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    // Task 3.2: Create User Pool Client and configure authentication flow
    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: `sachain-client-${props.environment}`,

      // Authentication flows
      authFlows: {
        userSrp: true,
        userPassword: false,
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
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes("userType", "kycStatus"),

      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes("userType", "kycStatus"),

      // Generate secret for server-side applications
      generateSecret: true,
    });
  }
}
