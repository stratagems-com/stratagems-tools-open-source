import request from 'supertest';
import server from '../../index';
import { TestUtils } from '../utils/test-utils';

const { app } = server;

describe('Lookup API Integration Tests', () => {
    let testApp: any;
    let apiKey: string;
    let testLookup: any;

    beforeEach(async () => {
        await TestUtils.cleanupDatabase();

        // Create a test app for authentication
        testApp = await TestUtils.createTestApp();
        apiKey = testApp.secret;

        // Create a test lookup
        testLookup = await TestUtils.createTestLookup({ name: 'test-lookup' });
    });

    afterEach(async () => {
        await TestUtils.cleanupDatabase();
    });

    describe('POST /api/v1/lookups', () => {
        it('should create a new lookup', async () => {
            const response = await request(app)
                .post('/api/v1/lookups')
                .set('x-api-key', apiKey)
                .send({
                    name: 'customer-mapping',
                    description: 'Map customers between ERP and Shopify',
                    leftSystem: 'erp',
                    rightSystem: 'shopify',
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('customer-mapping');
            expect(response.body.data.description).toBe('Map customers between ERP and Shopify');
            expect(response.body.data.leftSystem).toBe('erp');
            expect(response.body.data.rightSystem).toBe('shopify');
        });

        it('should return 409 for duplicate lookup name', async () => {
            const response = await request(app)
                .post('/api/v1/lookups')
                .set('x-api-key', apiKey)
                .send({
                    name: 'test-lookup',
                    description: 'Duplicate lookup',
                })
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Lookup with this name already exists');
        });

        it('should validate lookup name format', async () => {
            const response = await request(app)
                .post('/api/v1/lookups')
                .set('x-api-key', apiKey)
                .send({
                    name: 'invalid lookup name',
                    description: 'Test lookup',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('VALIDATION_ERROR');
        });

        it('should return 401 for missing API key', async () => {
            const response = await request(app)
                .post('/api/v1/lookups')
                .send({
                    name: 'test-lookup',
                    description: 'Test lookup',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('API key is required');
        });
    });

    describe('GET /api/v1/lookups', () => {
        it('should list all lookups', async () => {
            // Create additional test lookups
            await TestUtils.createTestLookup({ name: 'lookup-1' });
            await TestUtils.createTestLookup({ name: 'lookup-2' });

            const response = await request(app)
                .get('/api/v1/lookups')
                .set('x-api-key', apiKey)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3); // 1 auth lookup + 2 test lookups
            expect(response.body.data[0].name).toBe('lookup-2'); // Ordered by createdAt desc
            expect(response.body.data[1].name).toBe('lookup-1');
            expect(response.body.data[2].name).toBe('test-lookup');
        });

        it('should return 401 for missing API key', async () => {
            const response = await request(app)
                .get('/api/v1/lookups')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('API key is required');
        });
    });

    describe('GET /api/v1/lookups/:lookup', () => {
        it('should return specific lookup', async () => {
            const response = await request(app)
                .get(`/api/v1/lookups/${testLookup.name}`)
                .set('x-api-key', apiKey)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(testLookup.id);
            expect(response.body.data.name).toBe(testLookup.name);
        });

        it('should return 404 for non-existent lookup', async () => {
            const response = await request(app)
                .get('/api/v1/lookups/non-existent')
                .set('x-api-key', apiKey)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Lookup not found');
        });
    });

    describe('POST /api/v1/lookups/:lookup/values', () => {
        it('should add value to lookup', async () => {
            const response = await request(app)
                .post(`/api/v1/lookups/${testLookup.name}/values`)
                .set('x-api-key', apiKey)
                .send({
                    left: 'erp-id-123',
                    right: 'shopify-id-456',
                    leftMetadata: { source: 'erp' },
                    rightMetadata: { source: 'shopify' },
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.left).toBe('erp-id-123');
            expect(response.body.data.right).toBe('shopify-id-456');
        });

        it('should return 404 for non-existent lookup', async () => {
            const response = await request(app)
                .post('/api/v1/lookups/non-existent/values')
                .set('x-api-key', apiKey)
                .send({
                    left: 'erp-id-123',
                    right: 'shopify-id-456',
                })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Lookup not found');
        });
    });

    describe('POST /api/v1/lookups/:lookup/values/bulk', () => {
        it('should add multiple values to lookup', async () => {
            const response = await request(app)
                .post(`/api/v1/lookups/${testLookup.name}/values/bulk`)
                .set('x-api-key', apiKey)
                .send({
                    values: [
                        { left: 'erp-1', right: 'shopify-1' },
                        { left: 'erp-2', right: 'shopify-2' },
                        { left: 'erp-3', right: 'shopify-3' },
                    ],
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.created).toBe(3);
            expect(response.body.data.errors).toHaveLength(0);
            expect(response.body.data.values).toHaveLength(3);
        });

        it('should return 404 for non-existent lookup', async () => {
            const response = await request(app)
                .post('/api/v1/lookups/non-existent/values/bulk')
                .set('x-api-key', apiKey)
                .send({
                    values: [{ left: 'erp-1', right: 'shopify-1' }],
                })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Lookup not found');
        });
    });

    describe('GET /api/v1/lookups/:lookup/search', () => {
        it('should search lookup values', async () => {
            // Add some values first
            await request(app)
                .post(`/api/v1/lookups/${testLookup.name}/values`)
                .set('x-api-key', apiKey)
                .send({
                    left: 'erp-id-123',
                    right: 'shopify-id-456',
                });

            const response = await request(app)
                .get(`/api/v1/lookups/${testLookup.name}/search`)
                .set('x-api-key', apiKey)
                .query({ left: 'erp-id-123' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should return 404 for non-existent lookup', async () => {
            const response = await request(app)
                .get('/api/v1/lookups/non-existent/search')
                .set('x-api-key', apiKey)
                .query({ left: 'erp-id-123' })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Lookup not found');
        });
    });

    describe('DELETE /api/v1/lookups/:lookup/values/:valueId', () => {
        it('should remove value from lookup', async () => {
            // Add a value first
            const addResponse = await request(app)
                .post(`/api/v1/lookups/${testLookup.name}/values`)
                .set('x-api-key', apiKey)
                .send({
                    left: 'erp-id-123',
                    right: 'shopify-id-456',
                });

            const valueId = addResponse.body.data.id;

            const response = await request(app)
                .delete(`/api/v1/lookups/${testLookup.name}/values/${valueId}`)
                .set('x-api-key', apiKey)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe('Value removed successfully');
        });

        it('should return 404 for non-existent lookup', async () => {
            const response = await request(app)
                .delete('/api/v1/lookups/non-existent/values/some-id')
                .set('x-api-key', apiKey)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Lookup not found');
        });
    });
}); 