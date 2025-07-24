import express, { Router } from "express";
import { SetController } from "../../controllers/v1/set.controller";

const router: express.Router = Router();

// GET /api/v1/sets - List all sets for the app
router.get("/", SetController.listSets);

// POST /api/v1/sets - Create a new set
router.post("/", SetController.createSet);

// Specific set routes - MUST come before /:set route
// POST /api/v1/sets/:set/values - Add value to set
router.post("/:set/values", SetController.addSetValue);

// POST /api/v1/sets/:set/values/bulk - Add multiple values to set
router.post("/:set/values/bulk", SetController.addSetValuesBulk);

// GET /api/v1/sets/:set/contains - Check if value exists in set
router.post("/:set/contains", SetController.checkSetValue);

// POST /api/v1/sets/:set/contains/bulk - Check multiple values in set
router.post("/:set/contains/bulk", SetController.checkSetValuesBulk);

// DELETE /api/v1/sets/:set/values/:valueId - Remove value from set
router.delete("/:set/values/:valueId", SetController.removeSetValue);

// GET /api/v1/sets/:set/values - Get all values for a set
router.get("/:set/values", SetController.getSetValues);

// PUT /api/v1/sets/:set/values/:valueId - Update a specific value
router.put("/:set/values/:valueId", SetController.updateSetValue);

// DELETE /api/v1/sets/:set/values/clear - Clear all values from set
router.delete("/:set/values/clear", SetController.clearSetValues);

// POST /api/v1/sets/:set/values/delete-list - Delete multiple values
router.post("/:set/values/delete-list", SetController.deleteMultipleSetValues);

// PUT /api/v1/sets/:set - Update set configuration
router.put("/:set", SetController.updateSet);

// DELETE /api/v1/sets/:set - Delete set
router.delete("/:set", SetController.deleteSet);

// GET /api/v1/sets/:set - Get specific set (must be last)
router.get("/:set", SetController.getSet);

export default router;
