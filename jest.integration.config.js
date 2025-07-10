
export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true,
        }],
    },
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/__tests__/integration/**/*.test.ts',
        '**/__tests__/integration/**/*.spec.ts'
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/setup.ts$',
        '/test-utils.ts$',
        '/unit/'
    ],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/**/__tests__/**',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts',
    ],
    coverageDirectory: 'coverage/integration',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testTimeout: 15000,
    verbose: true,
    clearMocks: true,
    restoreMocks: true,
    // Integration tests must run sequentially to avoid database conflicts
    maxWorkers: 1,
}; 