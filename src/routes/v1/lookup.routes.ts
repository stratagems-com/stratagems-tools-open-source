import express, { Router } from 'express';
import { LookupController } from '../../controllers/v1/lookup.controller';
import { validateApiKey } from '../../middleware/auth.middleware';

const router: express.Router = Router();

// Apply API key validation to all routes
router.use(validateApiKey);

// GET /api/v1/lookups - List all lookups for the app
router.get('/', LookupController.listLookups);

// POST /api/v1/lookups - Create a new lookup
router.post('/', LookupController.createLookup);

// Specific lookup routes - MUST come before /:lookup route
// POST /api/v1/lookups/:lookup/values - Add value to lookup
router.post('/:lookup/values', LookupController.addLookupValue);

// POST /api/v1/lookups/:lookup/values/bulk - Add multiple values to lookup
router.post('/:lookup/values/bulk', LookupController.addLookupValuesBulk);

// GET /api/v1/lookups/:lookup/search - Search lookup values
router.get('/:lookup/search', LookupController.searchLookupValues);

// DELETE /api/v1/lookups/:lookup/values/:valueId - Remove value from lookup
router.delete('/:lookup/values/:valueId', LookupController.removeLookupValue);

// GET /api/v1/lookups/:lookup - Get specific lookup (must be last)
router.get('/:lookup', LookupController.getLookup);

export default router; 