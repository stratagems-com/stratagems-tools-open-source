import request from 'supertest';
import server from '../../index';
import { TestUtils } from '../utils/test-utils';

const { app } = server;

describe('Set API Integration Tests', () => {
    let testApp: any;
    let apiKey: string;
    let testSet: any;

    beforeEach(async () => {
        await TestUtils.cleanupDatabase();

        // Create a test app for authentication
        testApp = await TestUtils.createTestApp();
        apiKey = testApp.secret;

        // Create a test set
        testSet = await TestUtils.createTestSet({ name: 'test-set' });
    });

    afterEach(async () => {
        await TestUtils.cleanupDatabase();
    });

    describe('POST /api/v1/sets', () => {
        it('should create a new set', async () => {
            const response = await request(app)
                .post('/api/v1/sets')
                .set('x-api-key', apiKey)
                .send({
                    name: 'processed-orders',
                    description: 'Track processed orders to prevent duplicates',
                    allowDuplicates: false,
                    strictChecking: true,
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('processed-orders');
            expect(response.body.data.description).toBe('Track processed orders to prevent duplicates');
            expect(response.body.data.allowDuplicates).toBe(false);
            expect(response.body.data.strictChecking).toBe(true);
        });

        it('should return 409 for duplicate set name', async () => {
            const response = await request(app)
                .post('/api/v1/sets')
                .set('x-api-key', apiKey)
                .send({
                    name: 'test-set',
                    description: 'Duplicate set',
                })
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Set with this name already exists');
        });

        it('should validate set name format', async () => {
            const response = await request(app)
                .post('/api/v1/sets')
                .set('x-api-key', apiKey)
                .send({
                    name: 'invalid set name',
                    description: 'Test set',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('VALIDATION_ERROR');
        });

        it('should return 401 for missing API key', async () => {
            const response = await request(app)
                .post('/api/v1/sets')
                .send({
                    name: 'test-set',
                    description: 'Test set',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('API key is required');
        });
    });

    describe('GET /api/v1/sets', () => {
        it('should list all sets', async () => {
            // Create additional test sets
            await TestUtils.createTestSet({ name: 'set-1' });
            await TestUtils.createTestSet({ name: 'set-2' });

            const response = await request(app)
                .get('/api/v1/sets')
                .set('x-api-key', apiKey)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3); // 1 auth set + 2 test sets
            expect(response.body.data[0].name).toBe('set-2'); // Ordered by createdAt desc
            expect(response.body.data[1].name).toBe('set-1');
            expect(response.body.data[2].name).toBe('test-set');
        });

        it('should return 401 for missing API key', async () => {
            const response = await request(app)
                .get('/api/v1/sets')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('API key is required');
        });
    });

    describe('GET /api/v1/sets/:set', () => {
        it('should return specific set', async () => {
            const response = await request(app)
                .get(`/api/v1/sets/${testSet.name}`)
                .set('x-api-key', apiKey)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(testSet.name);
        });

        it('should return 404 for non-existent set', async () => {
            const response = await request(app)
                .get('/api/v1/sets/non-existent')
                .set('x-api-key', apiKey)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Set not found');
        });
    });

    describe('POST /api/v1/sets/:set/values', () => {
        it('should add value to set', async () => {
            const response = await request(app)
                .post(`/api/v1/sets/${testSet.name}/values`)
                .set('x-api-key', apiKey)
                .send({
                    value: 'order-123',
                    metadata: { source: 'shopify' },
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.value).toBe('order-123');
        });

        it('should return 404 for non-existent set', async () => {
            const response = await request(app)
                .post('/api/v1/sets/non-existent/values')
                .set('x-api-key', apiKey)
                .send({
                    value: 'order-123',
                })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Set not found');
        });
    });

    describe('GET /api/v1/sets/:set/contains', () => {
        it('should check if value exists in set', async () => {
            // Add a value first
            await request(app)
                .post(`/api/v1/sets/${testSet.name}/values`)
                .set('x-api-key', apiKey)
                .send({
                    value: 'order-123',
                });

            const response = await request(app)
                .get(`/api/v1/sets/${testSet.name}/contains`)
                .set('x-api-key', apiKey)
                .query({ value: 'order-123' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.exists).toBe(true);
        });

        it('should return false for non-existent value', async () => {
            const response = await request(app)
                .get(`/api/v1/sets/${testSet.name}/contains`)
                .set('x-api-key', apiKey)
                .query({ value: 'non-existent-order' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.exists).toBe(false);
        });

        it('should return 404 for non-existent set', async () => {
            const response = await request(app)
                .get('/api/v1/sets/non-existent/contains')
                .set('x-api-key', apiKey)
                .query({ value: 'order-123' })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Set not found');
        });
    });

    describe('POST /api/v1/sets/:set/values/bulk', () => {
        it('should add multiple values to set', async () => {
            const response = await request(app)
                .post(`/api/v1/sets/${testSet.name}/values/bulk`)
                .set('x-api-key', apiKey)
                .send({
                    values: [
                        { value: 'order-1', metadata: { source: 'shopify' } },
                        { value: 'order-2', metadata: { source: 'shopify' } },
                        { value: 'order-3', metadata: { source: 'shopify' } },
                    ],
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.created).toBe(3);
            expect(response.body.data.errors).toHaveLength(0);
            expect(response.body.data.values).toHaveLength(3);
        });

        it('should return 404 for non-existent set', async () => {
            const response = await request(app)
                .post('/api/v1/sets/non-existent/values/bulk')
                .set('x-api-key', apiKey)
                .send({
                    values: [{ value: 'order-1' }],
                })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Set not found');
        });
    });

    describe('POST /api/v1/sets/:set/contains/bulk', () => {
        it('should check multiple values in set', async () => {
            // Add some values first
            await request(app)
                .post(`/api/v1/sets/${testSet.name}/values/bulk`)
                .set('x-api-key', apiKey)
                .send({
                    values: [
                        { value: 'order-1' },
                        { value: 'order-2' },
                    ],
                });

            const response = await request(app)
                .post(`/api/v1/sets/${testSet.name}/contains/bulk`)
                .set('x-api-key', apiKey)
                .send({
                    values: ['order-1', 'order-2', 'order-3'],
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.checks).toHaveLength(3);
            expect(response.body.data.found).toBe(2);
            expect(response.body.data.notFound).toBe(1);
            expect(response.body.data.errors).toHaveLength(0);
        });

        it('should return 404 for non-existent set', async () => {
            const response = await request(app)
                .post('/api/v1/sets/non-existent/contains/bulk')
                .set('x-api-key', apiKey)
                .send({
                    values: ['order-1', 'order-2'],
                })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Set not found');
        });
    });

    describe('DELETE /api/v1/sets/:set/values/:valueId', () => {
        it('should remove value from set', async () => {
            // Add a value first
            const addResponse = await request(app)
                .post(`/api/v1/sets/${testSet.name}/values`)
                .set('x-api-key', apiKey)
                .send({
                    value: 'order-123',
                });

            const valueId = addResponse.body.data.id;

            const response = await request(app)
                .delete(`/api/v1/sets/${testSet.name}/values/${valueId}`)
                .set('x-api-key', apiKey)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe('Value removed successfully');
        });

        it('should return 404 for non-existent set', async () => {
            const response = await request(app)
                .delete('/api/v1/sets/non-existent/values/some-id')
                .set('x-api-key', apiKey)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Set not found');
        });
    });
}); 