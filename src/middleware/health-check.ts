import { config } from '@/utils/config';
import type { Request, Response } from 'express';

export const healthCheck = (_: Request, res: Response): void => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV,
        version: config.VERSION,
    });
}; 