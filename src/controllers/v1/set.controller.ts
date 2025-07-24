import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../../utils/database";
import logger from "../../utils/logger";
import { validateBody, validateParams } from "../../utils/validator";
import {
  addSetValueSchema,
  addSetValuesBulkSchema,
  checkSetValueSchema,
  checkSetValuesBulkSchema,
  createSetSchema,
  setIdParamSchema,
  setValueIdParamSchema,
} from "../../validations/v1";

/**
 * Set Controller - Handles set-related operations
 *
 * @description Manages sets to prevent duplicate processing of entities
 * @example
 * // Create a set for processed orders
 * POST /api/v1/sets
 * {
 *   "name": "processed-orders",
 *   "description": "Track processed orders to prevent duplicates"
 * }
 */
export class SetController {
  /**
   * List all sets for the app
   * GET /api/v1/sets
   *
   * @description Retrieves all sets associated with the authenticated app
   * @returns {Promise<void>}
   */
  static async listSets(_: Request, res: Response): Promise<void> {
    try {
      const sets = await prisma.set.findMany({
        include: {
          _count: {
            select: { values: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: sets,
      });
    } catch (error) {
      logger.error("Error fetching sets", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Create a new set
   * POST /api/v1/sets
   *
   * @description Creates a new set for tracking processed entities
   * @param {Object} req.body - Set configuration
   * @param {string} req.body.name - Unique name for the set
   * @param {string} [req.body.description] - Optional description
   * @returns {Promise<void>}
   */
  static async createSet(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, allowDuplicates, strictChecking } =
        validateBody(req, createSetSchema);

      const set = await prisma.set.create({
        data: {
          name,
          description: description || null,
          allowDuplicates,
          strictChecking,
        },
      });

      logger.info("Set created", { setId: set.id });
      res.status(201).json({
        success: true,
        data: set,
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
      if (error.code === "P2002") {
        res.status(409).json({
          success: false,
          error: "Set with this name already exists",
          code: "DUPLICATE_SET",
        });
        return;
      }
      logger.error("Error creating set", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Get specific set
   * GET /api/v1/sets/:id
   *
   * @description Retrieves a specific set with its recent values
   * @param {string} req.params.id - Set ID
   * @returns {Promise<void>}
   */
  static async getSet(req: Request, res: Response): Promise<void> {
    try {
      const { set } = validateParams(req, setIdParamSchema);

      const setData = await prisma.set.findFirst({
        where: {
          name: set,
        },
        include: {
          // values: {
          //     orderBy: { createdAt: 'desc' },
          //     take: 100, // Limit to recent 100 values
          // },
          _count: {
            select: { values: true },
          },
        },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      res.json({
        success: true,
        data: setData,
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
      logger.error("Error fetching set", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Add value to set
   * POST /api/v1/sets/:id/values
   *
   * @description Adds a new value to the set
   * @param {string} req.params.id - Set ID
   * @param {Object} req.body - Value data
   * @param {string} req.body.value - Value to add
   * @param {Object} [req.body.metadata] - Additional metadata
   * @returns {Promise<void>}
   */
  static async addSetValue(req: Request, res: Response): Promise<void> {
    try {
      const { value, metadata } = validateBody(req, addSetValueSchema);
      const { set } = validateParams(req, setIdParamSchema);

      const setData = await prisma.set.findUnique({
        where: {
          name: set,
        },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      const setValue = await prisma.setValue.create({
        data: {
          setId: setData.id,
          value,
          metadata: metadata ? (metadata as any) : Prisma.JsonNull,
        },
      });

      logger.info("Set value added", {
        setId: setData.id,
        valueId: setValue.id,
      });
      res.status(201).json({
        success: true,
        data: setValue,
      });
    } catch (error) {
      logger.error("Error adding set value", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Check if value exists in set
   * GET /api/v1/sets/:id/contains
   *
   * @description Checks if a value exists in the set
   * @param {string} req.params.id - Set ID
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.value - Value to check
   * @returns {Promise<void>}
   */
  static async checkSetValue(req: Request, res: Response): Promise<void> {
    try {
      const { value } = validateBody(req, checkSetValueSchema);
      const { set } = validateParams(req, setIdParamSchema);

      const setData = await prisma.set.findUnique({
        where: {
          name: set,
        },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      const setValue = await prisma.setValue.findFirst({
        where: {
          setId: setData.id,
          value,
        },
      });

      res.json({
        success: true,
        data: {
          exists: !!setValue,
          value: setValue,
        },
      });
    } catch (error) {
      logger.error("Error checking set value", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Remove value from set
   * DELETE /api/v1/sets/:id/values/:valueId
   *
   * @description Removes a specific value from the set
   * @param {string} req.params.id - Set ID
   * @param {string} req.params.valueId - Value ID to remove
   * @returns {Promise<void>}
   */
  static async removeSetValue(req: Request, res: Response): Promise<void> {
    try {
      const { set, valueId } = validateParams(req, setValueIdParamSchema);

      const setData = await prisma.set.findUnique({
        where: {
          name: set,
        },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      const deletedCount = await prisma.setValue.deleteMany({
        where: {
          OR: [{ id: valueId }, { setId: setData.id, value: valueId }],
        },
      });

      if (deletedCount.count === 0) {
        res.status(404).json({
          success: false,
          error: "Value not found",
          code: "VALUE_NOT_FOUND",
        });
        return;
      }

      logger.info("Set value removed", { setId: setData.id, valueId });
      res.json({
        success: true,
        data: { message: "Value removed successfully" },
      });
    } catch (error) {
      logger.error("Error removing set value", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Add values to set in bulk
   * POST /api/v1/sets/:set/values/bulk
   *
   * @description Adds multiple values to the set in a single request
   * @param {string} req.params.set - Set name
   * @param {Object} req.body - Bulk value data
   * @param {Array} req.body.values - Array of values to add
   * @returns {Promise<void>}
   */
  static async addSetValuesBulk(req: Request, res: Response): Promise<void> {
    try {
      const { values } = validateBody(req, addSetValuesBulkSchema);
      const { set } = validateParams(req, setIdParamSchema);

      const setData = await prisma.set.findUnique({
        where: {
          name: set,
        },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      const results = {
        created: 0,
        errors: [] as Array<{ index: number; error: string }>,
        values: [] as any[],
      };

      // Process values in batches for better performance
      const batchSize = 100;
      for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);

        for (let j = 0; j < batch.length; j++) {
          const valueData = batch[j];
          const globalIndex = i + j;

          if (!valueData) {
            results.errors.push({
              index: globalIndex,
              error: "Invalid value data",
            });
            continue;
          }

          try {
            // Create new value
            const newValue = await prisma.setValue.create({
              data: {
                setId: setData.id,
                value: valueData.value,
                metadata: valueData.metadata
                  ? (valueData.metadata as any)
                  : Prisma.JsonNull,
              },
            });
            results.created++;
            results.values.push(newValue);
          } catch (error: any) {
            results.errors.push({
              index: globalIndex,
              error: error.message || "Unknown error",
            });
          }
        }
      }

      logger.info("Bulk set values processed", {
        setId: setData.id,
        total: values.length,
        created: results.created,
        errors: results.errors.length,
      });

      res.status(201).json({
        success: true,
        data: results,
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
      logger.error("Error adding bulk set values", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Check multiple values in set
   * POST /api/v1/sets/:set/contains/bulk
   *
   * @description Checks if multiple values exist in the set
   * @param {string} req.params.set - Set name
   * @param {Object} req.body - Bulk check data
   * @param {Array} req.body.values - Array of values to check
   * @returns {Promise<void>}
   */
  static async checkSetValuesBulk(req: Request, res: Response): Promise<void> {
    try {
      const { values } = validateBody(req, checkSetValuesBulkSchema);
      const { set } = validateParams(req, setIdParamSchema);

      const setData = await prisma.set.findUnique({
        where: {
          name: set,
        },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      const results = {
        found: 0,
        notFound: 0,
        errors: [] as Array<{ index: number; error: string }>,
        checks: [] as Array<{ value: string; exists: boolean; setValue?: any }>,
      };

      // Process values in batches for better performance
      const batchSize = 100;
      for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);

        for (let j = 0; j < batch.length; j++) {
          const value = batch[j];
          const globalIndex = i + j;

          if (!value) {
            results.errors.push({
              index: globalIndex,
              error: "Invalid value",
            });
            continue;
          }

          try {
            const setValue = await prisma.setValue.findFirst({
              where: {
                setId: setData.id,
                value,
              },
            });

            const exists = !!setValue;
            if (exists) {
              results.found++;
            } else {
              results.notFound++;
            }

            results.checks.push({
              value,
              exists,
              setValue: exists ? setValue : undefined,
            });
          } catch (error: any) {
            results.errors.push({
              index: globalIndex,
              error: error.message || "Unknown error",
            });
          }
        }
      }

      logger.info("Bulk set value checks processed", {
        setId: setData.id,
        total: values.length,
        found: results.found,
        notFound: results.notFound,
        errors: results.errors.length,
      });

      res.json({
        success: true,
        data: results,
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
      logger.error("Error checking bulk set values", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Get all values for a set
   * GET /api/v1/sets/:set/values
   */
  static async getSetValues(req: Request, res: Response): Promise<void> {
    try {
      const { set } = validateParams(req, setIdParamSchema);

      const setData = await prisma.set.findFirst({
        where: { name: set },
        include: {
          values: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      res.json({
        success: true,
        data: setData.values,
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
      logger.error("Error fetching set values", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Update a specific set value
   * PUT /api/v1/sets/:set/values/:valueId
   */
  static async updateSetValue(req: Request, res: Response): Promise<void> {
    try {
      const { set, valueId } = validateParams(req, setValueIdParamSchema);
      const { value, metadata } = validateBody(req, addSetValueSchema);

      const setData = await prisma.set.findFirst({
        where: { name: set },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      const updatedValue = await prisma.setValue.update({
        where: {
          id: valueId,
          setId: setData.id,
        },
        data: {
          value,
          metadata: metadata ? (metadata as any) : Prisma.JsonNull,
        },
      });

      res.json({
        success: true,
        data: updatedValue,
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        res.status(404).json({
          success: false,
          error: "Set value not found",
          code: "SET_VALUE_NOT_FOUND",
        });
        return;
      }
      if (error.code === "VALIDATION_ERROR") {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.details,
        });
        return;
      }
      logger.error("Error updating set value", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Clear all values from a set
   * DELETE /api/v1/sets/:set/values/clear
   */
  static async clearSetValues(req: Request, res: Response): Promise<void> {
    try {
      const { set } = validateParams(req, setIdParamSchema);

      const setData = await prisma.set.findFirst({
        where: { name: set },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      await prisma.setValue.deleteMany({
        where: { setId: setData.id },
      });

      res.json({
        success: true,
        data: { message: "All values cleared successfully" },
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
      logger.error("Error clearing set values", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Delete multiple set values
   * POST /api/v1/sets/:set/values/delete-list
   */
  static async deleteMultipleSetValues(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { set } = validateParams(req, setIdParamSchema);
      const valueIds = req.body; // Array of value IDs

      if (!Array.isArray(valueIds)) {
        res.status(400).json({
          success: false,
          error: "Invalid request body. Expected array of value IDs",
          code: "INVALID_BODY",
        });
        return;
      }

      const setData = await prisma.set.findFirst({
        where: { name: set },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      const result = await prisma.setValue.deleteMany({
        where: {
          id: { in: valueIds },
          setId: setData.id,
        },
      });

      res.json({
        success: true,
        data: {
          message: "Values deleted successfully",
          deletedCount: result.count,
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
      logger.error("Error deleting multiple set values", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Update set configuration
   * PUT /api/v1/sets/:set
   */
  static async updateSet(req: Request, res: Response): Promise<void> {
    try {
      const { set } = validateParams(req, setIdParamSchema);
      const { name, description, allowDuplicates, strictChecking } = req.body;

      const setData = await prisma.set.findFirst({
        where: { name: set },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      const updatedSet = await prisma.set.update({
        where: { id: setData.id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(allowDuplicates !== undefined && { allowDuplicates }),
          ...(strictChecking !== undefined && { strictChecking }),
        },
        include: {
          _count: {
            select: { values: true },
          },
        },
      });

      res.json({
        success: true,
        data: updatedSet,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        res.status(409).json({
          success: false,
          error: "Set name already exists",
          code: "SET_NAME_EXISTS",
        });
        return;
      }
      if (error.code === "VALIDATION_ERROR") {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.details,
        });
        return;
      }
      logger.error("Error updating set", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Delete a set
   * DELETE /api/v1/sets/:set
   */
  static async deleteSet(req: Request, res: Response): Promise<void> {
    try {
      const { set } = validateParams(req, setIdParamSchema);

      const setData = await prisma.set.findFirst({
        where: { name: set },
      });

      if (!setData) {
        res.status(404).json({
          success: false,
          error: "Set not found",
          code: "SET_NOT_FOUND",
        });
        return;
      }

      // Delete all values first (cascade should handle this, but being explicit)
      await prisma.setValue.deleteMany({
        where: { setId: setData.id },
      });

      // Delete the set
      await prisma.set.delete({
        where: { id: setData.id },
      });

      res.json({
        success: true,
        data: { message: "Set deleted successfully" },
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
      logger.error("Error deleting set", { error });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
}
