import express, { Router } from "express";
import { LookupController } from "../../controllers/v1/lookup.controller";

const router: express.Router = Router();

// GET /api/v1/lookups - List all lookups for the app
router.get("/", LookupController.listLookups);

// POST /api/v1/lookups - Create a new lookup
router.post("/", LookupController.createLookup);

// Specific lookup routes - MUST come before /:lookup route
// POST /api/v1/lookups/:lookup/values - Add value to lookup
router.post("/:lookup/values", LookupController.addLookupValue);

// POST /api/v1/lookups/:lookup/values/bulk - Add multiple values to lookup
router.post("/:lookup/values/bulk", LookupController.addLookupValuesBulk);

// GET /api/v1/lookups/:lookup/search - Search lookup values
router.get("/:lookup/search", LookupController.searchLookupValues);

// DELETE /api/v1/lookups/:lookup/values/:valueId - Remove value from lookup
router.delete("/:lookup/values/:valueId", LookupController.removeLookupValue);

// GET /api/v1/lookups/:lookup/values - Get all values for a lookup
router.get("/:lookup/values", LookupController.getLookupValues);

// PUT /api/v1/lookups/:lookup/values/:valueId - Update a specific lookup value
router.put("/:lookup/values/:valueId", LookupController.updateLookupValue);

// DELETE /api/v1/lookups/:lookup/values/clear - Clear all values from lookup
router.delete("/:lookup/values/clear", LookupController.clearLookupValues);

// POST /api/v1/lookups/:lookup/values/delete-list - Delete multiple values
router.post("/:lookup/values/delete-list", LookupController.deleteMultipleLookupValues);

// PUT /api/v1/lookups/:lookup - Update lookup configuration
router.put("/:lookup", LookupController.updateLookup);

// DELETE /api/v1/lookups/:lookup - Delete lookup
router.delete("/:lookup", LookupController.deleteLookup);

// GET /api/v1/lookups/:lookup - Get specific lookup (must be last)
router.get("/:lookup", LookupController.getLookup);

export default router;
