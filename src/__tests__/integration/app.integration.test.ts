import request from 'supertest';
import server from '../../index';
import { TestUtils } from '../utils/test-utils';

const { app } = server;

describe('App API Integration Tests', () => {
    let testApp: any;
    let apiKey: string;

    beforeEach(async () => {
        await TestUtils.cleanupDatabase();

        // Create a test app for authentication
        testApp = await TestUtils.createTestApp();
        apiKey = testApp.secret;
    });

    afterEach(async () => {
        await TestUtils.cleanupDatabase();
    });

    describe('POST /api/v1/apps', () => {
        it('should create a new app', async () => {
            const response = await request(app)
                .post('/api/v1/apps')
                .send({
                    name: 'integration-test-app',
                    description: 'App for integration testing',
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('integration-test-app');
            expect(response.body.data.description).toBe('App for integration testing');
            expect(response.body.data.apiKey).toBeDefined();
            expect(response.body.data.apiKey).toMatch(/^st_/);
        });

        it('should return 409 for duplicate app name', async () => {
            // Create first app
            await TestUtils.createTestApp({ name: 'duplicate-app' });

            const response = await request(app)
                .post('/api/v1/apps')
                .send({
                    name: 'duplicate-app',
                    description: 'Duplicate app',
                })
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('App with this name already exists');
        });

        it('should validate app name format', async () => {
            const response = await request(app)
                .post('/api/v1/apps')
                .send({
                    name: 'invalid app name',
                    description: 'Test app',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('GET /api/v1/apps', () => {
        it('should list all apps', async () => {
            // Create test apps
            await TestUtils.createTestApp({ name: 'app-1' });
            await TestUtils.createTestApp({ name: 'app-2' });

            const response = await request(app)
                .get('/api/v1/apps')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3); // 1 auth app + 2 test apps
            expect(response.body.data[0].name).toBe('app-2'); // Ordered by createdAt desc
            expect(response.body.data[1].name).toBe('app-1');
            expect(response.body.data[2].name).toBe(testApp.name); // The auth app
        });
    });

    describe('GET /api/v1/apps/me', () => {
        it('should return app info for authenticated app', async () => {
            const response = await request(app)
                .get('/api/v1/apps/me')
                .set('x-api-key', apiKey)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(testApp.id);
            expect(response.body.data.name).toBe(testApp.name);
            expect(response.body.data.secret).toBeUndefined(); // Should not include secret
        });

        it('should return 401 for invalid API key', async () => {
            const response = await request(app)
                .get('/api/v1/apps/me')
                .set('x-api-key', 'invalid-key')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid API key');
        });

        it('should return 401 for missing API key', async () => {
            const response = await request(app)
                .get('/api/v1/apps/me')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('API key is required');
        });
    });

    describe('GET /api/v1/apps/:id', () => {
        it('should return specific app', async () => {
            const response = await request(app)
                .get(`/api/v1/apps/${testApp.id}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(testApp.id);
            expect(response.body.data.name).toBe(testApp.name);
            expect(response.body.data.secret).toBeUndefined(); // Should not include secret
        });

        it('should return 404 for non-existent app', async () => {
            const response = await request(app)
                .get('/api/v1/apps/non-existent-id')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('App not found');
        });
    });
}); 