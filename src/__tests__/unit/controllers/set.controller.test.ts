import { SetController } from '../../../controllers/v1/set.controller';
import { TestUtils } from '../../utils/test-utils';

describe('SetController', () => {
    beforeEach(async () => {
        await TestUtils.cleanupDatabase();
    });

    describe('listSets', () => {
        it('should return all sets', async () => {
            const req = TestUtils.createMockRequest();
            const res = TestUtils.createMockResponse();

            await SetController.listSets(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('createSet', () => {
        it('should create a new set successfully', async () => {
            const req = TestUtils.createMockRequest({
                body: {
                    name: 'test-set',
                    description: 'Test set for unit tests',
                    allowDuplicates: true,
                    strictChecking: false,
                },
            });
            const res = TestUtils.createMockResponse();

            await SetController.createSet(req as any, res as any);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('test-set');
            expect(res.body.data.description).toBe('Test set for unit tests');
            expect(res.body.data.allowDuplicates).toBe(true);
            expect(res.body.data.strictChecking).toBe(false);
        });

        it('should return error for duplicate set name', async () => {
            // Create first set
            await TestUtils.createTestSet({ name: 'duplicate-set' });

            const req = TestUtils.createMockRequest({
                body: {
                    name: 'duplicate-set',
                    description: 'Duplicate set',
                },
            });
            const res = TestUtils.createMockResponse();

            await SetController.createSet(req as any, res as any);

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Set with this name already exists');
        });

        it('should validate set name format', async () => {
            const req = TestUtils.createMockRequest({
                body: {
                    name: 'invalid set name with spaces',
                    description: 'Test set',
                },
            });
            const res = TestUtils.createMockResponse();

            await SetController.createSet(req as any, res as any);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('getSet', () => {
        it('should return specific set', async () => {
            const testSet = await TestUtils.createTestSet({ name: 'test-set' });

            const req = TestUtils.createMockRequest({
                params: { set: 'test-set' },
            });
            const res = TestUtils.createMockResponse();

            await SetController.getSet(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('test-set');
        });

        it('should return 404 for non-existent set', async () => {
            const req = TestUtils.createMockRequest({
                params: { set: 'non-existent' },
            });
            const res = TestUtils.createMockResponse();

            await SetController.getSet(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Set not found');
        });
    });

    describe('addSetValue', () => {
        it('should add value to set successfully', async () => {
            const testSet = await TestUtils.createTestSet({ name: 'test-set' });

            const req = TestUtils.createMockRequest({
                params: { set: 'test-set' },
                body: {
                    value: 'test-value-123',
                    metadata: { source: 'test' },
                },
            });
            const res = TestUtils.createMockResponse();

            await SetController.addSetValue(req as any, res as any);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.value).toBe('test-value-123');
        });

        it('should return 404 for non-existent set', async () => {
            const req = TestUtils.createMockRequest({
                params: { set: 'non-existent' },
                body: {
                    value: 'test-value-123',
                },
            });
            const res = TestUtils.createMockResponse();

            await SetController.addSetValue(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Set not found');
        });
    });

    describe('checkSetValue', () => {
        it('should check if value exists in set', async () => {
            const testSet = await TestUtils.createTestSet({ name: 'test-set' });

            const req = TestUtils.createMockRequest({
                params: { set: 'test-set' },
                query: { value: 'test-value-123' },
            });
            const res = TestUtils.createMockResponse();

            await SetController.checkSetValue(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(typeof res.body.data.exists).toBe('boolean');
        });

        it('should return 404 for non-existent set', async () => {
            const req = TestUtils.createMockRequest({
                params: { set: 'non-existent' },
                query: { value: 'test-value-123' },
            });
            const res = TestUtils.createMockResponse();

            await SetController.checkSetValue(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Set not found');
        });
    });

    describe('addSetValuesBulk', () => {
        it('should add multiple values to set successfully', async () => {
            const testSet = await TestUtils.createTestSet({ name: 'test-set' });

            const req = TestUtils.createMockRequest({
                params: { set: 'test-set' },
                body: {
                    values: [
                        { value: 'value-1', metadata: { source: 'test' } },
                        { value: 'value-2', metadata: { source: 'test' } },
                    ],
                },
            });
            const res = TestUtils.createMockResponse();

            await SetController.addSetValuesBulk(req as any, res as any);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.created).toBe(2);
            expect(res.body.data.errors).toHaveLength(0);
        });

        it('should return 404 for non-existent set', async () => {
            const req = TestUtils.createMockRequest({
                params: { set: 'non-existent' },
                body: {
                    values: [{ value: 'value-1' }],
                },
            });
            const res = TestUtils.createMockResponse();

            await SetController.addSetValuesBulk(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Set not found');
        });
    });

    describe('checkSetValuesBulk', () => {
        it('should check multiple values in set successfully', async () => {
            const testSet = await TestUtils.createTestSet({ name: 'test-set' });

            const req = TestUtils.createMockRequest({
                params: { set: 'test-set' },
                body: {
                    values: ['value-1', 'value-2', 'value-3'],
                },
            });
            const res = TestUtils.createMockResponse();

            await SetController.checkSetValuesBulk(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.checks).toHaveLength(3);
            expect(res.body.data.errors).toHaveLength(0);
        });

        it('should return 404 for non-existent set', async () => {
            const req = TestUtils.createMockRequest({
                params: { set: 'non-existent' },
                body: {
                    values: ['value-1', 'value-2'],
                },
            });
            const res = TestUtils.createMockResponse();

            await SetController.checkSetValuesBulk(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Set not found');
        });
    });

    describe('removeSetValue', () => {
        it('should remove value from set successfully', async () => {
            const testSet = await TestUtils.createTestSet({ name: 'test-set' });

            // First add a value to the set
            const addReq = TestUtils.createMockRequest({
                params: { set: 'test-set' },
                body: {
                    value: 'test-value-123',
                    metadata: { source: 'test' },
                },
            });
            const addRes = TestUtils.createMockResponse();
            await SetController.addSetValue(addReq as any, addRes as any);

            expect(addRes.statusCode).toBe(201);
            const valueId = addRes.body.data.id;

            // Now remove the value
            const req = TestUtils.createMockRequest({
                params: { set: 'test-set', valueId },
            });
            const res = TestUtils.createMockResponse();

            await SetController.removeSetValue(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.message).toBe('Value removed successfully');
        });

        it('should return 404 for non-existent set', async () => {
            const req = TestUtils.createMockRequest({
                params: { set: 'non-existent', valueId: 'some-value-id' },
            });
            const res = TestUtils.createMockResponse();

            await SetController.removeSetValue(req as any, res as any);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Set not found');
        });
    });
}); 