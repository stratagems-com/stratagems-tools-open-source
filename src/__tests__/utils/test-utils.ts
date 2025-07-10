import type { App, Lookup, Set } from '@prisma/client';
import { prisma } from '../../utils/database';

export interface TestApp extends Omit<App, 'id' | 'createdAt' | 'updatedAt'> {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TestLookup extends Omit<Lookup, 'id' | 'createdAt' | 'updatedAt'> {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TestSet extends Omit<Set, 'id' | 'createdAt' | 'updatedAt'> {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class TestUtils {
    /**
 * Clean up all test data from database
 */
    static async cleanupDatabase(): Promise<void> {
        try {
            // Delete in order to respect foreign key constraints
            await prisma.lookupValue.deleteMany();
            await prisma.lookup.deleteMany();
            await prisma.setValue.deleteMany();
            await prisma.set.deleteMany();
            await prisma.app.deleteMany();

            // Force a small delay to ensure cleanup is complete
            await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
            console.error('Error during database cleanup:', error);
        }
    }

    /**
     * Create a test app
     */
    static async createTestApp(data: Partial<TestApp> = {}): Promise<App> {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);

        return await prisma.app.create({
            data: {
                name: data.name || `test-app-${timestamp}-${random}`,
                description: data.description || 'Test app for unit tests',
                secret: data.secret || `test-secret-${timestamp}-${random}`,
                isActive: data.isActive ?? true,
                ...data,
            },
        });
    }

    /**
     * Create a test lookup
     */
    static async createTestLookup(data: Partial<TestLookup> = {}): Promise<Lookup> {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);

        return await prisma.lookup.create({
            data: {
                name: data.name || `test-lookup-${timestamp}-${random}`,
                description: data.description || 'Test lookup for unit tests',
                leftSystem: data.leftSystem || 'test-left',
                rightSystem: data.rightSystem || 'test-right',
                allowLeftDups: data.allowLeftDups ?? true,
                allowRightDups: data.allowRightDups ?? true,
                allowLeftRightDups: data.allowLeftRightDups ?? true,
                strictChecking: data.strictChecking ?? false,
                ...data,
            },
        });
    }

    /**
     * Create a test set
     */
    static async createTestSet(data: Partial<TestSet> = {}): Promise<Set> {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);

        return await prisma.set.create({
            data: {
                name: data.name || `test-set-${timestamp}-${random}`,
                description: data.description || 'Test set for unit tests',
                allowDuplicates: data.allowDuplicates ?? true,
                strictChecking: data.strictChecking ?? false,
                ...data,
            },
        });
    }

    /**
     * Generate a random API key for testing
     */
    static generateApiKey(): string {
        return `st_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Create mock request object for testing
     */
    static createMockRequest(data: {
        body?: any;
        params?: any;
        query?: any;
        headers?: any;
        authenticatedApp?: any;
    } = {}) {
        return {
            body: data.body || {},
            params: data.params || {},
            query: data.query || {},
            headers: data.headers || {},
            authenticatedApp: data.authenticatedApp || null,
        };
    }

    /**
     * Create mock response object for testing
     */
    static createMockResponse() {
        const res: any = {};
        res.statusCode = 200;
        res.status = (code: number) => {
            res.statusCode = code;
            return res;
        };
        res.json = (data: any) => {
            res.body = data;
            return res;
        };
        res.send = (data: any) => {
            res.body = data;
            return res;
        };
        return res;
    }
} 