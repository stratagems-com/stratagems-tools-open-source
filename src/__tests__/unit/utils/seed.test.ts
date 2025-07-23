import { seedTestData } from '../../../utils/seed';

// Mock the logger to avoid console output during tests
jest.mock('../../../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

// Mock Prisma client
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        app: {
            count: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        set: {
            count: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        lookup: {
            count: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        setValue: {
            count: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        lookupValue: {
            count: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
        },
    })),
}));

describe('Seed Test Data', () => {
    let mockPrismaClient: any;

    beforeEach(() => {
        jest.clearAllMocks();
        const { PrismaClient } = require('@prisma/client');
        mockPrismaClient = new PrismaClient();
    });

    it('should handle database connection errors gracefully', async () => {
        // Mock database error
        mockPrismaClient.app.count.mockRejectedValue(new Error('Database connection failed'));

        await expect(seedTestData()).rejects.toThrow('Database connection failed');
    });

    it('should create test data when no existing data is found', async () => {
        // Mock no existing data
        mockPrismaClient.app.count.mockResolvedValue(0);
        mockPrismaClient.set.count.mockResolvedValue(0);
        mockPrismaClient.lookup.count.mockResolvedValue(0);
        mockPrismaClient.setValue.count.mockResolvedValue(0);
        mockPrismaClient.lookupValue.count.mockResolvedValue(0);

        // Mock successful creation
        mockPrismaClient.app.findFirst.mockResolvedValue(null);
        mockPrismaClient.app.create.mockResolvedValue({ id: 'test-app-id' } as any);
        mockPrismaClient.set.findUnique.mockResolvedValue(null);
        mockPrismaClient.set.create.mockResolvedValue({ id: 'test-set-id', name: 'orders' } as any);
        mockPrismaClient.lookup.findUnique.mockResolvedValue(null);
        mockPrismaClient.lookup.create.mockResolvedValue({ id: 'test-lookup-id', leftSystem: 'shopify', rightSystem: 'bc' } as any);
        mockPrismaClient.setValue.findFirst.mockResolvedValue(null);
        mockPrismaClient.setValue.create.mockResolvedValue({ id: 'test-set-value-id' } as any);
        mockPrismaClient.lookupValue.findFirst.mockResolvedValue(null);
        mockPrismaClient.lookupValue.create.mockResolvedValue({ id: 'test-lookup-value-id' } as any);

        await expect(seedTestData()).resolves.not.toThrow();
    });

    it('should skip creation when data already exists', async () => {
        // Mock existing data
        mockPrismaClient.app.count.mockResolvedValue(1);
        mockPrismaClient.set.count.mockResolvedValue(1);
        mockPrismaClient.lookup.count.mockResolvedValue(1);
        mockPrismaClient.setValue.count.mockResolvedValue(1);
        mockPrismaClient.lookupValue.count.mockResolvedValue(1);

        // Mock existing entities
        mockPrismaClient.app.findFirst.mockResolvedValue({ id: 'existing-app-id' } as any);
        mockPrismaClient.set.findUnique.mockResolvedValue({ id: 'existing-set-id', name: 'orders' } as any);
        mockPrismaClient.lookup.findUnique.mockResolvedValue({ id: 'existing-lookup-id', leftSystem: 'shopify', rightSystem: 'bc' } as any);
        mockPrismaClient.setValue.findFirst.mockResolvedValue(null);
        mockPrismaClient.setValue.create.mockResolvedValue({ id: 'test-set-value-id' } as any);
        mockPrismaClient.lookupValue.findFirst.mockResolvedValue(null);
        mockPrismaClient.lookupValue.create.mockResolvedValue({ id: 'test-lookup-value-id' } as any);

        await expect(seedTestData()).resolves.not.toThrow();
    });
}); 