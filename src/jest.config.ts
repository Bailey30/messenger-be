/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
    transform: {
        // '^.+\\.ts?$': 'ts-jest',
    },
    testEnvironment: 'jest-environment-node',
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',
    testMatch: ['**/tests/unit/*.test.ts'],
};
