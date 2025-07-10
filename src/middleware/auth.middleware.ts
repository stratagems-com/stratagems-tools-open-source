import type { App } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/database';
import logger from '../utils/logger';

// Extend Request interface to include authenticated app
declare global {
    namespace Express {
        interface Request {
            authenticatedApp?: App;
        }
    }
}

/**
 * Middleware to validate API key
 * Validates the X-API-Key header and attaches the app to the request
 */
export const validateApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        res.status(401).json({
            success: false,
            error: 'API key is required',
            code: 'MISSING_API_KEY'
        });
        return;
    }

    try {
        const app = await prisma.app.findUnique({
            where: { secret: apiKey as string },
        });

        if (!app) {
            res.status(401).json({
                success: false,
                error: 'Invalid API key',
                code: 'INVALID_API_KEY'
            });
            return;
        }

        if (!app.isActive) {
            res.status(401).json({
                success: false,
                error: 'API key is inactive',
                code: 'INACTIVE_API_KEY'
            });
            return;
        }
        if (app.activeUntil && app.activeUntil < new Date()) {
            res.status(401).json({
                success: false,
                error: 'API key is expired',
                code: 'EXPIRED_API_KEY'
            });
            return;
        }

        // Attach app to request for use in controllers
        req.authenticatedApp = app;
        next();
    } catch (error) {
        logger.error('Error validating API key', { error });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'AUTH_ERROR'
        });
    }
};

