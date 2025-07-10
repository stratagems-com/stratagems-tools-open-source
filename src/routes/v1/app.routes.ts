import express, { Router } from 'express';
import { AppController } from '../../controllers/v1/app.controller';
import { validateApiKey } from '../../middleware/auth.middleware';

const router: express.Router = Router();

// Admin routes (no API key required for app management)
// GET /api/v1/apps - List all apps (admin only)
router.get('/', AppController.listApps);

// POST /api/v1/apps - Create a new app
router.post('/', AppController.createApp);

// Authenticated app routes (require API key) - MUST come before /:id routes
// GET /api/v1/apps/me - Get current app info
router.get('/me', validateApiKey, AppController.getAppInfo);

// GET /api/v1/apps/health - App-specific health check
router.get('/health', validateApiKey, AppController.getAppHealth);

// GET /api/v1/apps/:id - Get specific app (admin only)
router.get('/:id', AppController.getApp);

// PUT /api/v1/apps/:id - Update app (admin only)
router.put('/:id', AppController.updateApp);

// POST /api/v1/apps/:id/regenerate-key - Regenerate API key (admin only)
router.post('/:id/regenerate-key', AppController.regenerateApiKey);

// DELETE /api/v1/apps/:id - Delete app (admin only)
router.delete('/:id', AppController.deleteApp);

export default router; 