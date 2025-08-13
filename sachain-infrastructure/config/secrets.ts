import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export interface SecretsConfig {
  environment: string;
}

export class SecretsManager extends Construct {
  public readonly cognitoClientSecret: secretsmanager.Secret;
  public readonly kmsKeyId: ssm.StringParameter;
  public readonly adminNotificationEmail: ssm.StringParameter;
  public readonly jwtSecretKey: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SecretsConfig) {
    super(scope, id);

    const { environment } = props;

    // Cognito Client Secret for secure authentication flows
    this.cognitoClientSecret = new secretsmanager.Secret(
      this,
      "CognitoClientSecret",
      {
        secretName: `/sachain/${environment}/cognito/client-secret`,
        description: `Cognito User Pool Client Secret for ${environment} environment`,
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ clientId: "" }),
          generateStringKey: "clientSecret",
          excludeCharacters: '"@/\\',
          passwordLength: 32,
        },
      }
    );

    // JWT Secret Key for additional token validation
    this.jwtSecretKey = new secretsmanager.Secret(this, "JWTSecretKey", {
      secretName: `/sachain/${environment}/jwt/secret-key`,
      description: `JWT Secret Key for ${environment} environment`,
      generateSecretString: {
        passwordLength: 64,
        excludeCharacters: '"@/\\',
      },
    });

    // KMS Key ID parameter for cross-service encryption
    this.kmsKeyId = new ssm.StringParameter(this, "KMSKeyId", {
      parameterName: `/sachain/${environment}/kms/key-id`,
      stringValue: "placeholder-will-be-updated-after-key-creation",
      description: `KMS Key ID for ${environment} environment encryption`,
    });

    // Admin notification email parameter
    this.adminNotificationEmail = new ssm.StringParameter(
      this,
      "AdminNotificationEmail",
      {
        parameterName: `/sachain/${environment}/admin/notification-email`,
        stringValue: this.getDefaultAdminEmail(environment),
        description: `Admin notification email for ${environment} environment`,
      }
    );

    // Additional environment-specific parameters
    this.createEnvironmentParameters(environment);
  }

  private getDefaultAdminEmail(environment: string): string {
    const emailMap: Record<string, string> = {
      dev: "admin-dev@sachain.com",
      staging: "admin-staging@sachain.com",
      prod: "admin@sachain.com",
    };
    return emailMap[environment] || "admin@sachain.com";
  }

  private createEnvironmentParameters(environment: string): void {
    // Database connection parameters
    new ssm.StringParameter(this, "DatabaseTableName", {
      parameterName: `/sachain/${environment}/database/table-name`,
      stringValue: `sachain-kyc-${environment}`,
      description: `DynamoDB table name for ${environment} environment`,
    });

    // S3 bucket parameters
    new ssm.StringParameter(this, "DocumentBucketName", {
      parameterName: `/sachain/${environment}/s3/document-bucket`,
      stringValue: `sachain-kyc-documents-${environment}`,
      description: `S3 document bucket name for ${environment} environment`,
    });

    // EventBridge parameters
    new ssm.StringParameter(this, "EventBusName", {
      parameterName: `/sachain/${environment}/eventbridge/bus-name`,
      stringValue: `sachain-kyc-events-${environment}`,
      description: `EventBridge bus name for ${environment} environment`,
    });

    // API Gateway parameters
    new ssm.StringParameter(this, "ApiGatewayStage", {
      parameterName: `/sachain/${environment}/api/stage`,
      stringValue: environment,
      description: `API Gateway stage for ${environment} environment`,
    });

    // Monitoring parameters
    new ssm.StringParameter(this, "LogGroupPrefix", {
      parameterName: `/sachain/${environment}/logs/group-prefix`,
      stringValue: `/aws/lambda/sachain-${environment}`,
      description: `CloudWatch log group prefix for ${environment} environment`,
    });

    // Security parameters
    new ssm.StringParameter(this, "SecurityComplianceLevel", {
      parameterName: `/sachain/${environment}/security/compliance-level`,
      stringValue: environment === "prod" ? "high" : "standard",
      description: `Security compliance level for ${environment} environment`,
    });
  }

  /**
   * Get all secret ARNs for IAM policy creation
   */
  public getSecretArns(): string[] {
    return [this.cognitoClientSecret.secretArn, this.jwtSecretKey.secretArn];
  }

  /**
   * Get all parameter ARNs for IAM policy creation
   */
  public getParameterArns(): string[] {
    return [
      this.kmsKeyId.parameterArn,
      this.adminNotificationEmail.parameterArn,
    ];
  }
}

/**
 * Utility function to retrieve secrets at runtime
 */
export class SecretsRetriever {
  private static instance: SecretsRetriever;
  private secretsCache: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): SecretsRetriever {
    if (!SecretsRetriever.instance) {
      SecretsRetriever.instance = new SecretsRetriever();
    }
    return SecretsRetriever.instance;
  }

  /**
   * Retrieve secret value with caching
   */
  public async getSecret(
    secretName: string,
    forceRefresh = false
  ): Promise<any> {
    if (!forceRefresh && this.secretsCache.has(secretName)) {
      return this.secretsCache.get(secretName);
    }

    try {
      const AWS = require("aws-sdk");
      const secretsManager = new AWS.SecretsManager();

      const result = await secretsManager
        .getSecretValue({ SecretId: secretName })
        .promise();
      const secretValue = JSON.parse(result.SecretString);

      this.secretsCache.set(secretName, secretValue);
      return secretValue;
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretName}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve parameter value
   */
  public async getParameter(parameterName: string): Promise<string> {
    try {
      const AWS = require("aws-sdk");
      const ssm = new AWS.SSM();

      const result = await ssm
        .getParameter({
          Name: parameterName,
          WithDecryption: true,
        })
        .promise();

      return result.Parameter.Value;
    } catch (error) {
      console.error(`Failed to retrieve parameter ${parameterName}:`, error);
      throw error;
    }
  }

  /**
   * Clear secrets cache
   */
  public clearCache(): void {
    this.secretsCache.clear();
  }
}
