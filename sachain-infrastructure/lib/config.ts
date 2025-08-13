import * as fs from "fs";
import * as path from "path";

export interface CognitoPasswordPolicy {
  minimumLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
}

export interface LambdaConfig {
  timeout: number;
  memorySize: number;
  reservedConcurrency: number;
}

export interface S3Config {
  maxFileSize: number;
  allowedFileTypes: string[];
  lifecycleRules: {
    transitionToIA: number;
    transitionToGlacier: number;
    expiration: number;
  };
}

export interface DynamoDbConfig {
  billingMode: string;
  pointInTimeRecovery: boolean;
  encryption: string;
}

export interface MonitoringConfig {
  errorRateThreshold: number;
  latencyThreshold: number;
  enableDashboard: boolean;
}

export interface EnvironmentConfig {
  account?: string;
  region: string;
  domainName: string;
  certificateArn?: string;
  enableXRayTracing: boolean;
  logRetentionDays: number;
  enableDetailedMonitoring: boolean;
  kmsKeyAlias: string;
  cognitoPasswordPolicy: CognitoPasswordPolicy;
  lambdaConfig: LambdaConfig;
  s3Config: S3Config;
  dynamoDbConfig: DynamoDbConfig;
  monitoringConfig: MonitoringConfig;
}

let environmentConfigs: Record<string, EnvironmentConfig> | null = null;

function loadEnvironmentConfigs(): Record<string, EnvironmentConfig> {
  if (environmentConfigs) {
    return environmentConfigs;
  }

  try {
    const configPath = path.join(__dirname, "../config/environments.json");
    const configData = fs.readFileSync(configPath, "utf8");
    environmentConfigs = JSON.parse(configData);
    return environmentConfigs!;
  } catch (error) {
    console.warn(
      "Could not load environment configurations from file, using defaults"
    );
    // Fallback to hardcoded configurations
    environmentConfigs = {
      dev: {
        region: "us-east-1",
        domainName: "dev.sachain.com",
        enableXRayTracing: true,
        logRetentionDays: 7,
        enableDetailedMonitoring: false,
        kmsKeyAlias: "alias/sachain-dev-key",
        cognitoPasswordPolicy: {
          minimumLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false,
        },
        lambdaConfig: {
          timeout: 30,
          memorySize: 256,
          reservedConcurrency: 10,
        },
        s3Config: {
          maxFileSize: 10485760,
          allowedFileTypes: ["image/jpeg", "image/png", "application/pdf"],
          lifecycleRules: {
            transitionToIA: 30,
            transitionToGlacier: 90,
            expiration: 2555,
          },
        },
        dynamoDbConfig: {
          billingMode: "PAY_PER_REQUEST",
          pointInTimeRecovery: true,
          encryption: "AWS_MANAGED",
        },
        monitoringConfig: {
          errorRateThreshold: 0.05,
          latencyThreshold: 5000,
          enableDashboard: true,
        },
      },
      staging: {
        region: "us-east-1",
        domainName: "staging.sachain.com",
        enableXRayTracing: true,
        logRetentionDays: 30,
        enableDetailedMonitoring: true,
        kmsKeyAlias: "alias/sachain-staging-key",
        cognitoPasswordPolicy: {
          minimumLength: 10,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
        },
        lambdaConfig: {
          timeout: 30,
          memorySize: 512,
          reservedConcurrency: 50,
        },
        s3Config: {
          maxFileSize: 10485760,
          allowedFileTypes: ["image/jpeg", "image/png", "application/pdf"],
          lifecycleRules: {
            transitionToIA: 30,
            transitionToGlacier: 90,
            expiration: 2555,
          },
        },
        dynamoDbConfig: {
          billingMode: "PAY_PER_REQUEST",
          pointInTimeRecovery: true,
          encryption: "CUSTOMER_MANAGED",
        },
        monitoringConfig: {
          errorRateThreshold: 0.02,
          latencyThreshold: 3000,
          enableDashboard: true,
        },
      },
      prod: {
        region: "us-east-1",
        domainName: "sachain.com",
        enableXRayTracing: true,
        logRetentionDays: 90,
        enableDetailedMonitoring: true,
        kmsKeyAlias: "alias/sachain-prod-key",
        cognitoPasswordPolicy: {
          minimumLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
        },
        lambdaConfig: {
          timeout: 30,
          memorySize: 1024,
          reservedConcurrency: 100,
        },
        s3Config: {
          maxFileSize: 10485760,
          allowedFileTypes: ["image/jpeg", "image/png", "application/pdf"],
          lifecycleRules: {
            transitionToIA: 30,
            transitionToGlacier: 90,
            expiration: 2555,
          },
        },
        dynamoDbConfig: {
          billingMode: "PAY_PER_REQUEST",
          pointInTimeRecovery: true,
          encryption: "CUSTOMER_MANAGED",
        },
        monitoringConfig: {
          errorRateThreshold: 0.01,
          latencyThreshold: 2000,
          enableDashboard: true,
        },
      },
    };
    return environmentConfigs;
  }
}

export function getEnvironmentConfig(environment: string): EnvironmentConfig {
  const configs = loadEnvironmentConfigs();
  const config = configs[environment];
  if (!config) {
    throw new Error(
      `Unknown environment: ${environment}. Available environments: ${Object.keys(
        configs
      ).join(", ")}`
    );
  }
  return config;
}

export function getAllEnvironments(): string[] {
  const configs = loadEnvironmentConfigs();
  return Object.keys(configs);
}

export function validateEnvironmentConfig(environment: string): boolean {
  try {
    const config = getEnvironmentConfig(environment);

    // Validate required fields
    const requiredFields = ["region", "domainName", "kmsKeyAlias"];
    for (const field of requiredFields) {
      if (!config[field as keyof EnvironmentConfig]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate password policy
    if (config.cognitoPasswordPolicy.minimumLength < 8) {
      throw new Error("Password minimum length must be at least 8");
    }

    // Validate lambda config
    if (config.lambdaConfig.timeout < 1 || config.lambdaConfig.timeout > 900) {
      throw new Error("Lambda timeout must be between 1 and 900 seconds");
    }

    if (
      config.lambdaConfig.memorySize < 128 ||
      config.lambdaConfig.memorySize > 10240
    ) {
      throw new Error("Lambda memory size must be between 128 and 10240 MB");
    }

    return true;
  } catch (error) {
    console.error(
      `Environment config validation failed for ${environment}:`,
      error
    );
    return false;
  }
}
