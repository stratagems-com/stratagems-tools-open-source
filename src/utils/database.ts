
import { PrismaClient } from '@prisma/client';
import logger from './logger';

// Create Prisma client instance
export const prisma = new PrismaClient({
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'event',
            level: 'error',
        },
        {
            emit: 'event',
            level: 'info',
        },
        {
            emit: 'event',
            level: 'warn',
        },
    ],
});

// Log Prisma events
prisma.$on('query', (e) => {
    logger.debug('Query', { query: e.query, params: e.params, duration: e.duration });
});

prisma.$on('error', (e) => {
    logger.error('Prisma Error', { error: e.message, target: e.target });
});

prisma.$on('info', (e) => {
    logger.info('Prisma Info', { message: e.message });
});

prisma.$on('warn', (e) => {
    logger.warn('Prisma Warning', { message: e.message });
});

// Connect to database
export const connectDatabase = async (): Promise<void> => {
    try {
        await prisma.$connect();
        logger.info('Database connected successfully');
    } catch (error) {
        logger.error('Failed to connect to database', { error });
        throw error;
    }
};

// Disconnect from database
export const disconnectDatabase = async (): Promise<void> => {
    try {
        await prisma.$disconnect();
        logger.info('Database disconnected successfully');
    } catch (error) {
        logger.error('Failed to disconnect from database', { error });
        throw error;
    }
}; 