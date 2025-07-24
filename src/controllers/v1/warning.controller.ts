import type { Request, Response } from "express";
import { prisma } from "../../utils/database";
import logger from "../../utils/logger";
import { validateQuery, validateParams } from "../../utils/validator";
import { z } from "zod";

/**
 * Warning Controller - Handles warning-related operations
 *
 * @description Manages warnings for duplicate detection and other data quality issues
 */
export class WarningController {
  /**
   * List all warnings
   * GET /api/v1/warnings
   *
   * @description Retrieves all warnings with optional filtering
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.type] - Filter by warning type (lookup, set)
   * @param {string} [req.query.severity] - Filter by severity level
   * @param {boolean} [req.query.resolved] - Filter by resolution status
   * @param {number} [req.query.limit=50] - Maximum number of results
   * @param {number} [req.query.offset=0] - Pagination offset
   * @returns {Promise<void>}
   */
  static async listWarnings(req: Request, res: Response): Promise<void> {
    try {
      const querySchema = z.object({
        type: z.string().optional(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        resolved: z.string().optional().transform((val) => val === "true"),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 50),
        offset: z.string().optional().transform((val) => val ? parseInt(val, 10) : 0),
      });

      const { type, severity, resolved, limit, offset } = validateQuery(req, querySchema);

      const whereClause: any = {};
      if (type) whereClause.type = type;
      if (severity) whereClause.severity = severity;
      if (resolved !== undefined) whereClause.isResolved = resolved;

      const [warnings, total] = await Promise.all([
        prisma.warning.findMany({
          where: whereClause,
          orderBy: [
            { isResolved: "asc" }, // Unresolved first
            { severity: "desc" }, // High severity first
            { createdAt: "desc" } // Most recent first
          ],
          take: Math.min(limit, 100), // Cap at 100
          skip: offset,
        }),
        prisma.warning.count({ where: whereClause }),
      ]);

      res.json({
        success: true,
        data: {
          warnings,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        },
      });
    } catch (error: any) {
      if (error.code === "VALIDATION_ERROR") {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.details,
        });
        return;
      }
      logger.error("Error fetching warnings", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Get warning statistics
   * GET /api/v1/warnings/stats
   *
   * @description Retrieves warning statistics grouped by type and severity
   * @returns {Promise<void>}
   */
  static async getWarningStats(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalCount,
        unresolvedCount,
        severityStats,
        typeStats,
      ] = await Promise.all([
        prisma.warning.count(),
        prisma.warning.count({ where: { isResolved: false } }),
        prisma.warning.groupBy({
          by: ['severity'],
          _count: { _all: true },
          where: { isResolved: false },
        }),
        prisma.warning.groupBy({
          by: ['type'],
          _count: { _all: true },
          where: { isResolved: false },
        }),
      ]);

      const stats = {
        total: totalCount,
        unresolved: unresolvedCount,
        resolved: totalCount - unresolvedCount,
        bySeverity: severityStats.reduce((acc: any, item) => {
          acc[item.severity.toLowerCase()] = item._count._all;
          return acc;
        }, {}),
        byType: typeStats.reduce((acc: any, item) => {
          acc[item.type] = item._count._all;
          return acc;
        }, {}),
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Error fetching warning statistics", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Get specific warning
   * GET /api/v1/warnings/:id
   *
   * @description Retrieves a specific warning by ID
   * @param {string} req.params.id - Warning ID
   * @returns {Promise<void>}
   */
  static async getWarning(req: Request, res: Response): Promise<void> {
    try {
      const paramsSchema = z.object({
        id: z.string().cuid(),
      });

      const { id } = validateParams(req, paramsSchema);

      const warning = await prisma.warning.findUnique({
        where: { id },
      });

      if (!warning) {
        res.status(404).json({
          success: false,
          error: "Warning not found",
          code: "WARNING_NOT_FOUND",
        });
        return;
      }

      res.json({
        success: true,
        data: warning,
      });
    } catch (error: any) {
      if (error.code === "VALIDATION_ERROR") {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.details,
        });
        return;
      }
      logger.error("Error fetching warning", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Resolve warning
   * POST /api/v1/warnings/:id/resolve
   *
   * @description Marks a warning as resolved
   * @param {string} req.params.id - Warning ID
   * @returns {Promise<void>}
   */
  static async resolveWarning(req: Request, res: Response): Promise<void> {
    try {
      const paramsSchema = z.object({
        id: z.string().cuid(),
      });

      const { id } = validateParams(req, paramsSchema);

      const warning = await prisma.warning.findUnique({
        where: { id },
      });

      if (!warning) {
        res.status(404).json({
          success: false,
          error: "Warning not found",
          code: "WARNING_NOT_FOUND",
        });
        return;
      }

      if (warning.isResolved) {
        res.status(400).json({
          success: false,
          error: "Warning is already resolved",
          code: "WARNING_ALREADY_RESOLVED",
        });
        return;
      }

      const updatedWarning = await prisma.warning.update({
        where: { id },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: req.user?.id || null, // User ID from auth middleware
        },
      });

      logger.info("Warning resolved", {
        warningId: id,
        resolvedBy: req.user?.id,
      });

      res.json({
        success: true,
        data: updatedWarning,
      });
    } catch (error: any) {
      if (error.code === "VALIDATION_ERROR") {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.details,
        });
        return;
      }
      logger.error("Error resolving warning", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Resolve multiple warnings
   * POST /api/v1/warnings/resolve-bulk
   *
   * @description Marks multiple warnings as resolved
   * @param {Array} req.body - Array of warning IDs
   * @returns {Promise<void>}
   */
  static async resolveWarningsBulk(req: Request, res: Response): Promise<void> {
    try {
      const warningIds = req.body;

      if (!Array.isArray(warningIds)) {
        res.status(400).json({
          success: false,
          error: "Invalid request body. Expected array of warning IDs",
          code: "INVALID_BODY",
        });
        return;
      }

      const result = await prisma.warning.updateMany({
        where: {
          id: { in: warningIds },
          isResolved: false, // Only update unresolved warnings
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: req.user?.id || null,
        },
      });

      logger.info("Bulk warnings resolved", {
        warningIds,
        resolvedCount: result.count,
        resolvedBy: req.user?.id,
      });

      res.json({
        success: true,
        data: {
          message: "Warnings resolved successfully",
          resolvedCount: result.count,
        },
      });
    } catch (error) {
      logger.error("Error resolving bulk warnings", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Delete warning
   * DELETE /api/v1/warnings/:id
   *
   * @description Deletes a specific warning
   * @param {string} req.params.id - Warning ID
   * @returns {Promise<void>}
   */
  static async deleteWarning(req: Request, res: Response): Promise<void> {
    try {
      const paramsSchema = z.object({
        id: z.string().cuid(),
      });

      const { id } = validateParams(req, paramsSchema);

      const warning = await prisma.warning.findUnique({
        where: { id },
      });

      if (!warning) {
        res.status(404).json({
          success: false,
          error: "Warning not found",
          code: "WARNING_NOT_FOUND",
        });
        return;
      }

      await prisma.warning.delete({
        where: { id },
      });

      logger.info("Warning deleted", { warningId: id });

      res.json({
        success: true,
        data: { message: "Warning deleted successfully" },
      });
    } catch (error: any) {
      if (error.code === "VALIDATION_ERROR") {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.details,
        });
        return;
      }
      if (error.code === "P2025") {
        res.status(404).json({
          success: false,
          error: "Warning not found",
          code: "WARNING_NOT_FOUND",
        });
        return;
      }
      logger.error("Error deleting warning", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Clear all resolved warnings
   * DELETE /api/v1/warnings/resolved
   *
   * @description Deletes all resolved warnings
   * @returns {Promise<void>}
   */
  static async clearResolvedWarnings(req: Request, res: Response): Promise<void> {
    try {
      const result = await prisma.warning.deleteMany({
        where: { isResolved: true },
      });

      logger.info("Resolved warnings cleared", {
        deletedCount: result.count,
      });

      res.json({
        success: true,
        data: {
          message: "Resolved warnings cleared successfully",
          deletedCount: result.count,
        },
      });
    } catch (error) {
      logger.error("Error clearing resolved warnings", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
}