import { LookupController } from '../../../controllers/v1/lookup.controller';
import { TestUtils } from '../../utils/test-utils';

describe('LookupController', () => {
    beforeEach(async () => {
        await TestUtils.cleanupDatabase();
    });

    describe('listLookups', () => {
        it('should return all lookups', async () => {
            const req = TestUtils.createMockRequest();
            const res = TestUtils.createMockResponse();

            await LookupController.listLookups(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('createLookup', () => {
        it('should create a new lookup successfully', async () => {
            const req = TestUtils.createMockRequest({
                body: {
                    name: 'test-lookup',
                    description: 'Test lookup for unit tests',
                    leftSystem: 'erp',
                    rightSystem: 'shopify',
                },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.createLookup(req as any, res as any);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('test-lookup');
            expect(res.body.data.description).toBe('Test lookup for unit tests');
            expect(res.body.data.leftSystem).toBe('erp');
            expect(res.body.data.rightSystem).toBe('shopify');
        });

        it('should return error for duplicate lookup name', async () => {
            // Create first lookup
            await TestUtils.createTestLookup({ name: 'duplicate-lookup' });

            const req = TestUtils.createMockRequest({
                body: {
                    name: 'duplicate-lookup',
                    description: 'Duplicate lookup',
                },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.createLookup(req as any, res as any);

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Lookup with this name already exists');
        });

        it('should validate lookup name format', async () => {
            const req = TestUtils.createMockRequest({
                body: {
                    name: 'invalid lookup name with spaces',
                    description: 'Test lookup',
                },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.createLookup(req as any, res as any);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('getLookup', () => {
        it('should return specific lookup', async () => {
            const testLookup = await TestUtils.createTestLookup({ name: 'test-lookup' });

            const req = TestUtils.createMockRequest({
                params: { lookup: 'test-lookup' },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.getLookup(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(testLookup.id);
            expect(res.body.data.name).toBe('test-lookup');
        });

        it('should return 404 for non-existent lookup', async () => {
            const req = TestUtils.createMockRequest({
                params: { lookup: 'non-existent' },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.getLookup(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Lookup not found');
        });
    });

    describe('addLookupValue', () => {
        it('should add value to lookup successfully', async () => {
            const testLookup = await TestUtils.createTestLookup({ name: 'test-lookup' });

            const req = TestUtils.createMockRequest({
                params: { lookup: 'test-lookup' },
                body: {
                    left: 'erp-id-123',
                    right: 'shopify-id-456',
                    leftMetadata: { source: 'erp' },
                    rightMetadata: { source: 'shopify' },
                },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.addLookupValue(req as any, res as any);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.left).toBe('erp-id-123');
            expect(res.body.data.right).toBe('shopify-id-456');
        });

        it('should return 404 for non-existent lookup', async () => {
            const req = TestUtils.createMockRequest({
                params: { lookup: 'non-existent' },
                body: {
                    left: 'erp-id-123',
                    right: 'shopify-id-456',
                },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.addLookupValue(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Lookup not found');
        });
    });

    describe('addLookupValuesBulk', () => {
        it('should add multiple values to lookup successfully', async () => {
            const testLookup = await TestUtils.createTestLookup({ name: 'test-lookup' });

            const req = TestUtils.createMockRequest({
                params: { lookup: 'test-lookup' },
                body: {
                    values: [
                        { left: 'erp-1', right: 'shopify-1' },
                        { left: 'erp-2', right: 'shopify-2' },
                    ],
                },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.addLookupValuesBulk(req as any, res as any);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.created).toBe(2);
            expect(res.body.data.errors).toHaveLength(0);
        });

        it('should return 404 for non-existent lookup', async () => {
            const req = TestUtils.createMockRequest({
                params: { lookup: 'non-existent' },
                body: {
                    values: [{ left: 'erp-1', right: 'shopify-1' }],
                },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.addLookupValuesBulk(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Lookup not found');
        });
    });

    describe('searchLookupValues', () => {
        it('should search lookup values by left value', async () => {
            const testLookup = await TestUtils.createTestLookup({ name: 'test-lookup' });

            const req = TestUtils.createMockRequest({
                params: { lookup: 'test-lookup' },
                query: { left: 'erp-id-123' },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.searchLookupValues(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should return 404 for non-existent lookup', async () => {
            const req = TestUtils.createMockRequest({
                params: { lookup: 'non-existent' },
                query: { left: 'erp-id-123' },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.searchLookupValues(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Lookup not found');
        });
    });

    describe('removeLookupValue', () => {
        it('should remove value from lookup successfully', async () => {
            const testLookup = await TestUtils.createTestLookup({ name: 'test-lookup' });

            // First add a value to the lookup
            const addReq = TestUtils.createMockRequest({
                params: { lookup: 'test-lookup' },
                body: {
                    left: 'erp-id-123',
                    right: 'shopify-id-456',
                    leftMetadata: { source: 'erp' },
                    rightMetadata: { source: 'shopify' },
                },
            });
            const addRes = TestUtils.createMockResponse();
            await LookupController.addLookupValue(addReq as any, addRes as any);

            expect(addRes.statusCode).toBe(201);
            const valueId = addRes.body.data.id;

            // Now remove the value
            const req = TestUtils.createMockRequest({
                params: { lookup: 'test-lookup', valueId },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.removeLookupValue(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.message).toBe('Value removed successfully');
        });

        it('should return 404 for non-existent lookup', async () => {
            const req = TestUtils.createMockRequest({
                params: { lookup: 'non-existent', valueId: 'some-value-id' },
            });
            const res = TestUtils.createMockResponse();

            await LookupController.removeLookupValue(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Lookup not found');
        });
    });
}); 