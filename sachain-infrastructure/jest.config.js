module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  globals: {
    "ts-jest": {
      isolatedModules: true,
      tsconfig: {
        target: "ES2020",
        module: "commonjs",
        lib: ["es2020"],
        declaration: false,
        strict: false,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        types: ["jest", "node"],
      },
    },
  },
};
