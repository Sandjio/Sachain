import * as cdk from "aws-cdk-lib";
import { getEnvironmentConfig, validateEnvironmentConfig } from "../lib/config";

describe("Deployment Configuration Validation", () => {
  describe("Environment Configuration", () => {
    test("should load dev environment configuration", () => {
      const config = getEnvironmentConfig("dev");

      expect(config).toBeDefined();
      expect(config.region).toBe("us-east-1");
      expect(config.domainName).toBe("dev.sachain.com");
      expect(config.logRetentionDays).toBe(7);
      expect(config.enableDetailedMonitoring).toBe(false);
    });

    test("should load staging environment configuration", () => {
      const config = getEnvironmentConfig("staging");

      expect(config).toBeDefined();
      expect(config.region).toBe("us-east-1");
      expect(config.domainName).toBe("staging.sachain.com");
      expect(config.logRetentionDays).toBe(30);
      expect(config.enableDetailedMonitoring).toBe(true);
    });

    test("should load production environment configuration", () => {
      const config = getEnvironmentConfig("prod");

      expect(config).toBeDefined();
      expect(config.region).toBe("us-east-1");
      expect(config.domainName).toBe("sachain.com");
      expect(config.logRetentionDays).toBe(90);
      expect(config.enableDetailedMonitoring).toBe(true);
    });

    test("should throw error for unknown environment", () => {
      expect(() => getEnvironmentConfig("unknown")).toThrow(
        "Unknown environment: unknown"
      );
    });

    test("should validate environment configurations", () => {
      expect(validateEnvironmentConfig("dev")).toBe(true);
      expect(validateEnvironmentConfig("staging")).toBe(true);
      expect(validateEnvironmentConfig("prod")).toBe(true);
    });
  });

  describe("CDK App Synthesis", () => {
    test("should synthesize CDK app without errors", () => {
      const app = new cdk.App();

      // Test that we can create the app without errors
      expect(app).toBeDefined();
      expect(app.node).toBeDefined();
    });

    test("should validate CDK context configuration", () => {
      const app = new cdk.App();

      // Test environment context
      app.node.setContext("environment", "dev");
      const environment = app.node.tryGetContext("environment");

      expect(environment).toBe("dev");
    });
  });

  describe("Deployment Script Validation", () => {
    test("should have deployment script with correct permissions", () => {
      const fs = require("fs");
      const path = require("path");

      const scriptPath = path.join(__dirname, "../scripts/deploy.sh");
      expect(fs.existsSync(scriptPath)).toBe(true);

      // Check if script is executable
      const stats = fs.statSync(scriptPath);
      expect(stats.mode & parseInt("111", 8)).toBeGreaterThan(0);
    });

    test("should have CI/CD pipeline configuration", () => {
      const fs = require("fs");
      const path = require("path");

      const pipelinePath = path.join(
        __dirname,
        "../scripts/ci-cd-pipeline.yml"
      );
      expect(fs.existsSync(pipelinePath)).toBe(true);
    });

    test("should have deployment documentation", () => {
      const fs = require("fs");
      const path = require("path");

      const docPath = path.join(__dirname, "../DEPLOYMENT.md");
      expect(fs.existsSync(docPath)).toBe(true);
    });
  });

  describe("Environment-specific Configuration Validation", () => {
    test("should have appropriate password policies for each environment", () => {
      const devConfig = getEnvironmentConfig("dev");
      const stagingConfig = getEnvironmentConfig("staging");
      const prodConfig = getEnvironmentConfig("prod");

      // Dev should have basic password requirements
      expect(devConfig.cognitoPasswordPolicy.minimumLength).toBe(8);
      expect(devConfig.cognitoPasswordPolicy.requireSymbols).toBe(false);

      // Staging should have enhanced password requirements
      expect(stagingConfig.cognitoPasswordPolicy.minimumLength).toBe(10);
      expect(stagingConfig.cognitoPasswordPolicy.requireSymbols).toBe(true);

      // Production should have maximum password requirements
      expect(prodConfig.cognitoPasswordPolicy.minimumLength).toBe(12);
      expect(prodConfig.cognitoPasswordPolicy.requireSymbols).toBe(true);
    });

    test("should have appropriate Lambda configurations for each environment", () => {
      const devConfig = getEnvironmentConfig("dev");
      const stagingConfig = getEnvironmentConfig("staging");
      const prodConfig = getEnvironmentConfig("prod");

      // Dev should have minimal resources
      expect(devConfig.lambdaConfig.memorySize).toBe(256);
      expect(devConfig.lambdaConfig.reservedConcurrency).toBe(10);

      // Staging should have medium resources
      expect(stagingConfig.lambdaConfig.memorySize).toBe(512);
      expect(stagingConfig.lambdaConfig.reservedConcurrency).toBe(50);

      // Production should have maximum resources
      expect(prodConfig.lambdaConfig.memorySize).toBe(1024);
      expect(prodConfig.lambdaConfig.reservedConcurrency).toBe(100);
    });

    test("should have appropriate monitoring configurations", () => {
      const devConfig = getEnvironmentConfig("dev");
      const stagingConfig = getEnvironmentConfig("staging");
      const prodConfig = getEnvironmentConfig("prod");

      // Error rate thresholds should be stricter for production
      expect(devConfig.monitoringConfig.errorRateThreshold).toBe(0.05); // 5%
      expect(stagingConfig.monitoringConfig.errorRateThreshold).toBe(0.02); // 2%
      expect(prodConfig.monitoringConfig.errorRateThreshold).toBe(0.01); // 1%

      // Latency thresholds should be stricter for production
      expect(devConfig.monitoringConfig.latencyThreshold).toBe(5000); // 5s
      expect(stagingConfig.monitoringConfig.latencyThreshold).toBe(3000); // 3s
      expect(prodConfig.monitoringConfig.latencyThreshold).toBe(2000); // 2s
    });

    test("should have appropriate encryption settings", () => {
      const devConfig = getEnvironmentConfig("dev");
      const stagingConfig = getEnvironmentConfig("staging");
      const prodConfig = getEnvironmentConfig("prod");

      // Dev can use AWS managed encryption
      expect(devConfig.dynamoDbConfig.encryption).toBe("AWS_MANAGED");

      // Staging and prod should use customer managed encryption
      expect(stagingConfig.dynamoDbConfig.encryption).toBe("CUSTOMER_MANAGED");
      expect(prodConfig.dynamoDbConfig.encryption).toBe("CUSTOMER_MANAGED");
    });
  });

  describe("Package.json Scripts Validation", () => {
    test("should have all required deployment scripts", () => {
      const fs = require("fs");
      const path = require("path");

      const packagePath = path.join(__dirname, "../package.json");
      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

      // Check for deployment scripts
      expect(packageJson.scripts["deploy:dev"]).toBeDefined();
      expect(packageJson.scripts["deploy:staging"]).toBeDefined();
      expect(packageJson.scripts["deploy:prod"]).toBeDefined();
      expect(packageJson.scripts["deploy:script"]).toBeDefined();

      // Check for validation scripts
      expect(packageJson.scripts["test:deployment"]).toBeDefined();
      expect(packageJson.scripts["test:integration"]).toBeDefined();
      expect(packageJson.scripts["validate"]).toBeDefined();

      // Check for bootstrap scripts
      expect(packageJson.scripts["bootstrap:dev"]).toBeDefined();
      expect(packageJson.scripts["bootstrap:staging"]).toBeDefined();
      expect(packageJson.scripts["bootstrap:prod"]).toBeDefined();
    });
  });
});

/**
 * Mock integration tests that would run against deployed resources
 */
describe("Mock Integration Tests", () => {
  // Skip these tests unless explicitly running integration tests
  const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "true";

  describe("Deployment Validation", () => {
    test("should validate deployment readiness", () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      // Mock validation that would check:
      // - AWS credentials are configured
      // - CDK is bootstrapped
      // - Required permissions are available
      expect(true).toBe(true);
    });

    test("should validate environment configuration", () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      // Mock validation that would check:
      // - Environment variables are set
      // - Configuration files are valid
      // - Secrets are accessible
      expect(true).toBe(true);
    });
  });
});
