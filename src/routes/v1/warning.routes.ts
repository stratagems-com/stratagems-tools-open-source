import { Router } from "express";
import { WarningController } from "../../controllers/v1/warning.controller";

const router = Router();

/**
 * Warning Routes - /api/v1/warnings
 * 
 * @description Routes for managing warnings (duplicate detection, data quality issues)
 */

// GET /api/v1/warnings - List all warnings with optional filtering
router.get("/", WarningController.listWarnings);

// GET /api/v1/warnings/stats - Get warning statistics
router.get("/stats", WarningController.getWarningStats);

// GET /api/v1/warnings/:id - Get specific warning
router.get("/:id", WarningController.getWarning);

// POST /api/v1/warnings/:id/resolve - Resolve specific warning
router.post("/:id/resolve", WarningController.resolveWarning);

// POST /api/v1/warnings/resolve-bulk - Resolve multiple warnings
router.post("/resolve-bulk", WarningController.resolveWarningsBulk);

// DELETE /api/v1/warnings/:id - Delete specific warning
router.delete("/:id", WarningController.deleteWarning);

// DELETE /api/v1/warnings/resolved - Clear all resolved warnings
router.delete("/resolved", WarningController.clearResolvedWarnings);

export default router;