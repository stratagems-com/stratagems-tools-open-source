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
        '**/__tests__/unit/**/*.test.ts',
        '**/__tests__/unit/**/*.spec.ts'
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/setup.ts$',
        '/integration.setup.ts$',
        '/test-utils.ts$',
        '/integration/'
    ],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/**/__tests__/**',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts',
    ],
    coverageDirectory: 'coverage/unit',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testTimeout: 5000,
    verbose: true,
    clearMocks: true,
    restoreMocks: true,
    // Unit tests can run in parallel since they don't use the database
    maxWorkers: '50%',
}; 