import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { prisma } from '../../utils/database';
import logger from '../../utils/logger';
import { validateBody, validateParams, validateQuery } from '../../utils/validator';
import { addLookupValueSchema, addLookupValuesBulkSchema, createLookupSchema, lookupIdParamSchema, lookupValueIdParamSchema, searchLookupValuesSchema } from '../../validations/v1';

/**
 * Lookup Controller - Handles lookup-related operations
 * 
 * @description Manages bidirectional ID mapping between different business systems
 * @example
 * // Create a lookup for customer mapping
 * POST /api/v1/lookups
 * {
 *   "name": "customer-mapping",
 *   "description": "Map customers between ERP and Shopify",
 *   "leftSystem": "erp",
 *   "rightSystem": "shopify"
 * }
 */
export class LookupController {
    /**
     * List all lookups for the app
     * GET /api/v1/lookups
     * 
     * @description Retrieves all lookups associated with the authenticated app
     * @returns {Promise<void>}
     */
    static async listLookups(_: Request, res: Response): Promise<void> {
        try {

            const lookups = await prisma.lookup.findMany({
                include: {
                    _count: {
                        select: { values: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            res.json({
                success: true,
                data: lookups,
            });
        } catch (error) {
            logger.error('Error fetching lookups', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Create a new lookup
     * POST /api/v1/lookups
     * 
     * @description Creates a new lookup for mapping entities between systems
     * @param {Object} req.body - Lookup configuration
     * @param {string} req.body.name - Unique name for the lookup
     * @param {string} [req.body.description] - Optional description
     * @param {string} [req.body.leftSystem] - Name of the left system
     * @param {string} [req.body.rightSystem] - Name of the right system
     * @param {boolean} [req.body.allowLeftDups=true] - Allow duplicate left values
     * @param {boolean} [req.body.allowRightDups=true] - Allow duplicate right values
     * @param {boolean} [req.body.allowLeftRightDups=true] - Allow duplicate left-right pairs
     * @param {boolean} [req.body.strictChecking=false] - Enable strict validation
     * @returns {Promise<void>}
     */
    static async createLookup(req: Request, res: Response): Promise<void> {
        try {

            const { name, description, leftSystem, rightSystem, allowLeftDups, allowRightDups, allowLeftRightDups, strictChecking } = validateBody(req, createLookupSchema);


            const lookup = await prisma.lookup.create({
                data: {
                    name,
                    description: description || null,
                    leftSystem: leftSystem || null,
                    rightSystem: rightSystem || null,
                    allowLeftDups: allowLeftDups ?? true,
                    allowRightDups: allowRightDups ?? true,
                    allowLeftRightDups: allowLeftRightDups ?? true,
                    strictChecking: strictChecking ?? false,
                },
            });

            logger.info('Lookup created', { lookupId: lookup.id });
            res.status(201).json({
                success: true,
                data: lookup,
            });
        } catch (error: any) {
            if (error.code === 'VALIDATION_ERROR') {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: error.details,
                });
                return;
            }
            if (error.code === 'P2002') {
                res.status(409).json({
                    success: false,
                    error: 'Lookup with this name already exists',
                    code: 'DUPLICATE_LOOKUP'
                });
                return;
            }
            logger.error('Error creating lookup', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Get specific lookup
     * GET /api/v1/lookups/:id
     * 
     * @description Retrieves a specific lookup with its recent values
     * @param {string} req.params.id - Lookup ID
     * @returns {Promise<void>}
     */
    static async getLookup(req: Request, res: Response): Promise<void> {
        try {
            const { lookup } = validateParams(req, lookupIdParamSchema);

            const lookupData = await prisma.lookup.findFirst({
                where: {
                    name: lookup,
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

            if (!lookupData) {
                res.status(404).json({
                    success: false,
                    error: 'Lookup not found',
                    code: 'LOOKUP_NOT_FOUND'
                });
                return;
            }

            res.json({
                success: true,
                data: lookupData,
            });
        } catch (error: any) {
            if (error.code === 'VALIDATION_ERROR') {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: error.details,
                });
                return;
            }
            logger.error('Error fetching lookup', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Add values to lookup
     * POST /api/v1/lookups/:id/values
     * 
     * @description Adds a new value pair to the lookup
     * @param {string} req.params.lookup - Lookup name
     * @param {Object} req.body - Value pair data
     * @param {string} req.body.left - Left system value
     * @param {string} req.body.right - Right system value
     * @param {Object} [req.body.leftMetadata] - Additional metadata for left value
     * @param {Object} [req.body.rightMetadata] - Additional metadata for right value
     * @returns {Promise<void>}
     */
    static async addLookupValue(req: Request, res: Response): Promise<void> {
        try {



            const { left, right, leftMetadata, rightMetadata } = validateBody(req, addLookupValueSchema);
            const { lookup } = validateParams(req, lookupIdParamSchema);

            const lookupData = await prisma.lookup.findUnique({
                where: {
                    name: lookup,
                },
            });

            if (!lookupData) {
                res.status(404).json({
                    success: false,
                    error: 'Lookup not found',
                    code: 'LOOKUP_NOT_FOUND'
                });
                return;
            }


            const value = await prisma.lookupValue.create({
                data: {
                    lookupId: lookupData.id,
                    left,
                    right,
                    leftMetadata: leftMetadata ? (leftMetadata as any) : Prisma.JsonNull,
                    rightMetadata: rightMetadata ? (rightMetadata as any) : Prisma.JsonNull,
                },
            });

            logger.info('Lookup value added', { lookupId: lookupData.id, valueId: value.id, left, right });
            res.status(201).json({
                success: true,
                data: value,
            });
        } catch (error: any) {
            if (error.code === 'VALIDATION_ERROR') {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: error.details,
                });
                return;
            }
            logger.error('Error adding lookup value', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Add values to lookup in bulk
     * POST /api/v1/lookups/:id/values/bulk
     * 
     * @description Adds multiple value pairs to the lookup in a single request
     * @param {string} req.params.lookup - Lookup name
     * @param {Object} req.body - Bulk value data
     * @param {Array} req.body.values - Array of value pairs
     * @param {boolean} [req.body.skipDuplicates=false] - Skip duplicate values instead of erroring
     * @param {boolean} [req.body.updateExisting=false] - Update existing values instead of skipping
     * @returns {Promise<void>}
     */
    static async addLookupValuesBulk(req: Request, res: Response): Promise<void> {
        try {
            const { values } = validateBody(req, addLookupValuesBulkSchema);
            const { lookup } = validateParams(req, lookupIdParamSchema);

            const lookupData = await prisma.lookup.findUnique({
                where: {
                    name: lookup,
                },
            });

            if (!lookupData) {
                res.status(404).json({
                    success: false,
                    error: 'Lookup not found',
                    code: 'LOOKUP_NOT_FOUND'
                });
                return;
            }

            const results = {
                created: 0,
                updated: 0,
                skipped: 0,
                errors: [] as Array<{ index: number; error: string }>,
                values: [] as any[]
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
                            error: 'Invalid value data'
                        });
                        continue;
                    }

                    try {
                        // Create new value
                        const newValue = await prisma.lookupValue.create({
                            data: {
                                lookupId: lookupData.id,
                                left: valueData.left,
                                right: valueData.right,
                                leftMetadata: valueData.leftMetadata ? (valueData.leftMetadata as any) : Prisma.JsonNull,
                                rightMetadata: valueData.rightMetadata ? (valueData.rightMetadata as any) : Prisma.JsonNull,
                            },
                        });
                        results.created++;
                        results.values.push(newValue);

                    } catch (error: any) {
                        results.errors.push({
                            index: globalIndex,
                            error: error.message || 'Unknown error'
                        });
                    }
                }
            }

            logger.info('Bulk lookup values processed', {
                lookupId: lookupData.id,
                total: values.length,
                created: results.created,
                updated: results.updated,
                skipped: results.skipped,
                errors: results.errors.length
            });

            res.status(201).json({
                success: true,
                data: results,
            });
        } catch (error: any) {
            if (error.code === 'VALIDATION_ERROR') {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: error.details,
                });
                return;
            }
            logger.error('Error adding bulk lookup values', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Search lookup values
     * GET /api/v1/lookups/:id/search
     * 
     * @description Searches for lookup values by left or right value
     * @param {string} req.params.id - Lookup ID
     * @param {Object} req.query - Search parameters
     * @param {string} [req.query.left] - Search by left value (partial match)
     * @param {string} [req.query.right] - Search by right value (partial match)
     * @param {number} [req.query.limit=50] - Maximum number of results (max 100)
     * @returns {Promise<void>}
     */
    static async searchLookupValues(req: Request, res: Response): Promise<void> {
        try {

            const { left, right, search } = validateQuery(req, searchLookupValuesSchema);
            const { lookup } = validateParams(req, lookupIdParamSchema);

            const lookupData = await prisma.lookup.findUnique({
                where: {
                    name: lookup,
                },
            });

            if (!lookupData) {
                res.status(404).json({
                    success: false,
                    error: 'Lookup not found',
                    code: 'LOOKUP_NOT_FOUND'
                });
                return;
            }

            const whereClause: any = { lookupId: lookupData.id };
            if (left) whereClause.left = { equals: left as string };
            if (right) whereClause.right = { equals: right as string };
            if (search) whereClause.OR = [
                { left: { contains: search as string, mode: 'insensitive' } },
                { right: { contains: search as string, mode: 'insensitive' } },
            ];

            const values = await prisma.lookupValue.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
            });

            res.json({
                success: true,
                data: values,
            });
        } catch (error) {
            logger.error('Error searching lookup values', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Remove value from lookup
     * DELETE /api/v1/lookups/:id/values/:valueId
     * 
     * @description Removes a specific value pair from the lookup
     * @param {string} req.params.id - Lookup ID
     * @param {string} req.params.valueId - Value ID to remove
     * @returns {Promise<void>}
     */
    static async removeLookupValue(req: Request, res: Response): Promise<void> {
        try {

            const { lookup, valueId } = validateParams(req, lookupValueIdParamSchema);

            const lookupData = await prisma.lookup.findUnique({
                where: {
                    name: lookup,
                },
            });

            if (!lookupData) {
                res.status(404).json({
                    success: false,
                    error: 'Lookup not found',
                    code: 'LOOKUP_NOT_FOUND'
                });
                return;
            }

            const value = await prisma.lookupValue.findUnique({
                where: {
                    id: valueId,
                },
            });

            if (!value) {
                res.status(404).json({
                    success: false,
                    error: 'Value not found',
                    code: 'VALUE_NOT_FOUND'
                });
                return;
            }

            await prisma.lookupValue.delete({
                where: { id: value.id },
            });

            logger.info('Lookup value removed', { lookupId: lookupData.id, valueId: value.id });
            res.json({
                success: true,
                data: { message: 'Value removed successfully' },
            });
        } catch (error: any) {
            if (error.code === 'VALIDATION_ERROR') {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: error.details,
                });
                return;
            }
            if (error.code === 'P2025') {
                res.status(404).json({
                    success: false,
                    error: 'Value not found',
                    code: 'VALUE_NOT_FOUND'
                });
                return;
            }
            logger.error('Error removing lookup value', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
} 