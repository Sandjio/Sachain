const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/src/sdk/__tests__/setup.ts'],
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/sdk/__tests__/**/*.test.ts',
    '<rootDir>/src/sdk/__tests__/**/*.test.tsx'
  ],
  collectCoverageFrom: [
    'src/sdk/**/*.{ts,tsx}',
    '!src/sdk/**/*.d.ts',
    '!src/sdk/__tests__/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
}

module.exports = createJestConfig(customJestConfig)