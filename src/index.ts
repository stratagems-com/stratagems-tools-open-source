import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config, isTest } from './utils/config';
import { connectDatabase, disconnectDatabase } from './utils/database';
import logger from './utils/logger';

// Import middleware
import { errorHandler } from './middleware/error-handler';
import { healthCheck } from './middleware/health-check';
import { notFoundHandler } from './middleware/not-found-handler';

// Import v1 routes
import appRoutes from './routes/v1/app.routes';
import lookupRoutes from './routes/v1/lookup.routes';
import setRoutes from './routes/v1/set.routes';

const app = express() as express.Express;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Secret-Key'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_DURATION * 1000,
    max: config.RATE_LIMIT_POINTS,
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: config.MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: config.MAX_REQUEST_SIZE }));

// Compression
app.use(compression());

// Request logging
app.use((req, _, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
    });
    next();
});

// Health check endpoint
app.get('/health', healthCheck);

// API versioning - v1 routes
app.use('/api/v1/apps', appRoutes);
app.use('/api/v1/lookups', lookupRoutes);
app.use('/api/v1/sets', setRoutes);

// API info endpoint
app.get('/api/info', (_, res) => {
    res.json({
        name: 'StratagemsTools Open Source API',
        version: config.VERSION,
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
        endpoints: {
            v1: {
                apps: '/api/v1/apps',
                lookups: '/api/v1/lookups',
                sets: '/api/v1/sets',
            },
        },
        health: '/health',
    });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
        await disconnectDatabase();
        logger.info('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown', { error });
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDatabase();

        // Start listening
        app.listen(config.PORT, () => {
            logger.info(`Server started successfully`, {
                port: config.PORT,
                environment: config.NODE_ENV,
                version: config.VERSION,
            });
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
};

// Start the server
if (!isTest()) {
    startServer();
}

export default { app };
