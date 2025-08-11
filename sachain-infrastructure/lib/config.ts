export interface EnvironmentConfig {
  account?: string;
  region: string;
  domainName: string;
  certificateArn?: string;
  enableXRayTracing: boolean;
  logRetentionDays: number;
  enableDetailedMonitoring: boolean;
}

export const environmentConfigs: Record<string, EnvironmentConfig> = {
  dev: {
    region: "us-east-1",
    domainName: "dev.sachain.com",
    enableXRayTracing: true,
    logRetentionDays: 7,
    enableDetailedMonitoring: false,
  },
  staging: {
    region: "us-east-1",
    domainName: "staging.sachain.com",
    enableXRayTracing: true,
    logRetentionDays: 30,
    enableDetailedMonitoring: true,
  },
  prod: {
    region: "us-east-1",
    domainName: "sachain.com",
    enableXRayTracing: true,
    logRetentionDays: 90,
    enableDetailedMonitoring: true,
  },
};

export function getEnvironmentConfig(environment: string): EnvironmentConfig {
  const config = environmentConfigs[environment];
  if (!config) {
    throw new Error(
      `Unknown environment: ${environment}. Available environments: ${Object.keys(
        environmentConfigs
      ).join(", ")}`
    );
  }
  return config;
}
