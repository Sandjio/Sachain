module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/__tests__/e2e"],
  testMatch: ["**/*.e2e.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/e2e/test-setup.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],
  coverageDirectory: "coverage/e2e",
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 300000, // 5 minutes for E2E tests
  maxWorkers: 4, // Limit concurrent workers for E2E tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
};