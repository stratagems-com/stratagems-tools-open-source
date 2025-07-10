import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { prisma } from '../../utils/database';
import logger from '../../utils/logger';
import { validateBody, validateParams, validateSchema } from '../../utils/validator';
import { appIdParamSchema, createAppSchema, updateAppSchema } from '../../validations/v1';

/**
 * App Controller - Handles application-related operations
 * 
 * @description Manages application registration and configuration
 * @example
 * // Create a new app
 * POST /api/v1/apps
 * {
 *   "name": "My Integration App",
 *   "description": "App for syncing data between systems"
 * }
 */
export class AppController {
    /**
     * List all apps (admin only)
     * GET /api/v1/apps
     * 
     * @description Retrieves all applications (requires admin privileges)
     * @returns {Promise<void>}
     */
    static async listApps(_: Request, res: Response): Promise<void> {
        try {
            // Note: In a real implementation, you'd check for admin privileges here
            const apps = await prisma.app.findMany({
                select: {
                    id: true,
                    name: true,
                    description: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    // Don't include secret for security
                },
                orderBy: { createdAt: 'desc' },
            });

            res.json({
                success: true,
                data: apps,
            });
        } catch (error) {
            logger.error('Error fetching apps', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Create a new app
     * POST /api/v1/apps
     * 
     * @description Creates a new application with a generated API key
     * @param {Object} req.body - App configuration
     * @param {string} req.body.name - Application name
     * @param {string} [req.body.description] - Optional description
     * @returns {Promise<void>}
     */
    static async createApp(req: Request, res: Response): Promise<void> {
        try {
            // Validate request body and get typed data
            const { name, description } = validateBody(req, createAppSchema);

            // Generate a secure API key
            const apiKey = `st_${randomBytes(32).toString('hex')}`;

            const app = await prisma.app.create({
                data: {
                    name,
                    description: description || null,
                    secret: apiKey,
                    isActive: true,
                },
            });

            logger.info('App created', { appId: app.id, name: app.name });

            // Return the app with the API key (only on creation)
            res.status(201).json({
                success: true,
                data: {
                    ...app,
                    apiKey, // Include API key in response
                },
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
                    error: 'App with this name already exists',
                    code: 'DUPLICATE_APP'
                });
                return;
            }
            logger.error('Error creating app', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Get current app information
     * GET /api/v1/apps/me
     * 
     * @description Retrieves information about the authenticated app
     * @returns {Promise<void>}
     */
    static async getAppInfo(req: Request, res: Response): Promise<void> {
        try {
            const app = req.authenticatedApp;

            if (!app) {
                res.status(401).json({
                    success: false,
                    error: 'App not found in request context',
                    code: 'APP_NOT_FOUND'
                });
                return;
            }

            // Don't return the secret
            const { secret, ...appInfo } = app;

            res.json({
                success: true,
                data: appInfo,
            });
        } catch (error) {
            logger.error('Error getting app info', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Get specific app (admin only)
     * GET /api/v1/apps/:id
     * 
     * @description Retrieves a specific app by ID (requires admin privileges)
     * @param {string} req.params.id - App ID
     * @returns {Promise<void>}
     */
    static async getApp(req: Request, res: Response): Promise<void> {
        try {
            // Validate request params and get typed data
            const { id } = validateParams(req, appIdParamSchema);

            const app = await prisma.app.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    // Don't include secret for security
                },
            });

            if (!app) {
                res.status(404).json({
                    success: false,
                    error: 'App not found',
                    code: 'APP_NOT_FOUND'
                });
                return;
            }

            res.json({
                success: true,
                data: app,
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
            logger.error('Error fetching app', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Update app
     * PUT /api/v1/apps/:id
     * 
     * @description Updates an existing app (admin only)
     * @param {string} req.params.id - App ID
     * @param {Object} req.body - Update data
     * @param {string} [req.body.name] - New app name
     * @param {string} [req.body.description] - New description
     * @param {boolean} [req.body.isActive] - Active status
     * @returns {Promise<void>}
     */
    static async updateApp(req: Request, res: Response): Promise<void> {
        try {
            // Validate request params and body, get typed data
            const { params, body } = validateSchema(req, {
                params: appIdParamSchema,
                body: updateAppSchema,
            });

            const { name, description, isActive } = body;

            const existingApp = await prisma.app.findUnique({
                where: { id: params.id },
            });

            if (!existingApp) {
                res.status(404).json({
                    success: false,
                    error: 'App not found',
                    code: 'APP_NOT_FOUND'
                });
                return;
            }

            const app = await prisma.app.update({
                where: { id: params.id },
                data: {
                    ...(name && { name }),
                    ...(description !== undefined && { description }),
                    ...(isActive !== undefined && { isActive }),
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    // Don't include secret for security
                },
            });

            logger.info('App updated', { appId: app.id, name: app.name });
            res.json({
                success: true,
                data: app,
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
                    error: 'App with this name already exists',
                    code: 'DUPLICATE_APP'
                });
                return;
            }
            logger.error('Error updating app', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Regenerate API key
     * POST /api/v1/apps/:id/regenerate-key
     * 
     * @description Regenerates the API key for an app (admin only)
     * @param {string} req.params.id - App ID
     * @returns {Promise<void>}
     */
    static async regenerateApiKey(req: Request, res: Response): Promise<void> {
        try {
            // Validate request params and get typed data
            const { id } = validateParams(req, appIdParamSchema);

            const existingApp = await prisma.app.findUnique({
                where: { id },
            });

            if (!existingApp) {
                res.status(404).json({
                    success: false,
                    error: 'App not found',
                    code: 'APP_NOT_FOUND'
                });
                return;
            }

            // Generate a new secure API key
            const newApiKey = `st_${randomBytes(32).toString('hex')}`;

            const app = await prisma.app.update({
                where: { id },
                data: {
                    secret: newApiKey,
                },
            });

            logger.info('API key regenerated', { appId: app.id, name: app.name });

            res.json({
                success: true,
                data: {
                    id: app.id,
                    name: app.name,
                    apiKey: newApiKey, // Include new API key in response
                    message: 'API key regenerated successfully',
                },
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
            logger.error('Error regenerating API key', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Delete app
     * DELETE /api/v1/apps/:id
     * 
     * @description Deletes an app and all its associated data (admin only)
     * @param {string} req.params.id - App ID
     * @returns {Promise<void>}
     */
    static async deleteApp(req: Request, res: Response): Promise<void> {
        try {
            // Validate request params and get typed data
            const { id } = validateParams(req, appIdParamSchema);

            const existingApp = await prisma.app.findUnique({
                where: { id },
            });

            if (!existingApp) {
                res.status(404).json({
                    success: false,
                    error: 'App not found',
                    code: 'APP_NOT_FOUND'
                });
                return;
            }

            // Delete app and all associated data (cascade)
            await prisma.app.delete({
                where: { id },
            });

            logger.info('App deleted', { appId: existingApp.id, name: existingApp.name });

            res.json({
                success: true,
                data: {
                    message: 'App deleted successfully',
                },
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
            logger.error('Error deleting app', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Get app health status
     * GET /api/v1/apps/health
     * 
     * @description Returns health status for the authenticated app
     * @returns {Promise<void>}
     */
    static async getAppHealth(req: Request, res: Response): Promise<void> {
        try {
            const app = req.authenticatedApp;

            if (!app) {
                res.status(401).json({
                    success: false,
                    error: 'App not found in request context',
                    code: 'APP_NOT_FOUND'
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    appId: app.id,
                    appName: app.name,
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            logger.error('Error in app health check', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
} 