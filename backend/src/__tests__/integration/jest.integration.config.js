/**
 * Jest configuration for HBAR Recharge Integration Tests
 */

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/src/__tests__/integration/**/*.integration.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],
  coverageDirectory: "coverage/integration",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/integration/setup.ts"],
  testTimeout: 30000, // 30 seconds for integration tests
  maxWorkers: 4, // Limit concurrent workers for integration tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,

  // Environment variables for tests
  setupFiles: ["<rootDir>/src/__tests__/integration/env-setup.ts"],

  // Test reporting
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "test-results/integration",
        outputName: "integration-test-results.xml",
        suiteName: "HBAR Recharge Integration Tests",
      },
    ],
  ],

  // Performance monitoring
  slowTestThreshold: 10, // Warn about tests taking longer than 10 seconds

  // Global test configuration
  globals: {
    "ts-jest": {
      tsconfig: {
        target: "es2020",
        module: "commonjs",
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
      },
    },
  },
};
