import { prisma } from '../utils/database';

// Global integration test setup
beforeAll(async () => {
    // Set test environment
    process.env['NODE_ENV'] = 'test';
});

// Global integration test teardown
afterAll(async () => {
    // Close database connection
    await prisma.$disconnect();
});

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}; 