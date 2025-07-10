import { AppController } from '../../../controllers/v1/app.controller';
import { TestUtils } from '../../utils/test-utils';

describe('AppController', () => {
    beforeEach(async () => {
        await TestUtils.cleanupDatabase();
    });

    describe('createApp', () => {
        it('should create a new app successfully', async () => {
            const req = TestUtils.createMockRequest({
                body: {
                    name: 'test-app',
                    description: 'Test application',
                },
            });
            const res = TestUtils.createMockResponse();

            await AppController.createApp(req as any, res as any);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('test-app');
            expect(res.body.data.description).toBe('Test application');
            expect(res.body.data.apiKey).toBeDefined();
            expect(res.body.data.apiKey).toMatch(/^st_/);
        });

        it('should return error for duplicate app name', async () => {
            // Create first app
            await TestUtils.createTestApp({ name: 'duplicate-app' });

            const req = TestUtils.createMockRequest({
                body: {
                    name: 'duplicate-app',
                    description: 'Duplicate app',
                },
            });
            const res = TestUtils.createMockResponse();

            await AppController.createApp(req as any, res as any);

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('App with this name already exists');
        });

        it('should validate app name format', async () => {
            const req = TestUtils.createMockRequest({
                body: {
                    name: 'invalid app name with spaces',
                    description: 'Test application',
                },
            });
            const res = TestUtils.createMockResponse();

            await AppController.createApp(req as any, res as any);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('getAppInfo', () => {
        it('should return app info for authenticated app', async () => {
            const testApp = await TestUtils.createTestApp();
            const req = TestUtils.createMockRequest({
                authenticatedApp: testApp,
            });
            const res = TestUtils.createMockResponse();

            await AppController.getAppInfo(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(testApp.id);
            expect(res.body.data.name).toBe(testApp.name);
            expect(res.body.data.secret).toBeUndefined(); // Should not include secret
        });

        it('should return error when no authenticated app', async () => {
            const req = TestUtils.createMockRequest();
            const res = TestUtils.createMockResponse();

            await AppController.getAppInfo(req as any, res as any);

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('App not found in request context');
        });
    });

    describe('listApps', () => {
        it('should return all apps', async () => {
            const app1 = await TestUtils.createTestApp({ name: 'app-1' });
            const app2 = await TestUtils.createTestApp({ name: 'app-2' });

            const req = TestUtils.createMockRequest();
            const res = TestUtils.createMockResponse();

            await AppController.listApps(req as any, res as any);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data[0].name).toBe('app-2'); // Should be ordered by createdAt desc
            expect(res.body.data[1].name).toBe('app-1');
            expect(res.body.data[0].secret).toBeUndefined(); // Should not include secrets
        });
    });
}); 