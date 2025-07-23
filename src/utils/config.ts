import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Log loaded environment variables (excluding sensitive ones)
const logEnvironment = () => {
    //const sensitiveKeys = ['SECRET', 'PASSWORD', 'KEY', 'TOKEN', 'URL'];

    console.log('🔧 Environment variables loaded:');
    // Object.keys(process.env).forEach(key => {
    //     const isSensitive = sensitiveKeys.some(sensitive => key.includes(sensitive));
    //     const value = isSensitive ? '[REDACTED]' : process.env[key];
    //     console.log(`  ${key}: ${value}`);
    // });
    // console.log('');
};

// Call logging function
logEnvironment();

// Get version from Docker tag or package.json
const getVersion = (): string => {
    // Check for Docker tag first (set by Docker build)
    if (process.env['DOCKER_TAG']) {
        return process.env['DOCKER_TAG'];
    }

    // Check for VERSION environment variable
    if (process.env['VERSION']) {
        return process.env['VERSION'];
    }

    // Fallback to package.json version
    try {
        const packageJson = require('../../package.json');
        return packageJson.version || '0.1.0';
    } catch {
        return '0.1.0';
    }
};

// Configuration schema with Zod validation
const configSchema = z.object({
    // Server configuration
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    VERSION: z.string().default(getVersion()),

    // Database configuration
    DATABASE_URL: z.string().url(),

    // Security
    JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // Rate limiting
    RATE_LIMIT_POINTS: z.coerce.number().default(500),
    RATE_LIMIT_DURATION: z.coerce.number().default(120),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:3000'),

    // Request limits
    MAX_REQUEST_SIZE: z.string().default('10mb'),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

    // Loki logging (optional)
    LOKI_HOST: z.string().url().optional(),
    LOKI_APP_NAME: z.string().default('st-open-source'),

    // Docker tag (optional, for versioning)
    DOCKER_TAG: z.string().optional(),

    TEST_DATA: z.coerce.boolean().optional()
});

// Parse and validate configuration
const parseConfig = () => {
    try {
        return configSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues.map((err) => err.path.join('.')).join(', ');
            throw new Error(`Configuration validation failed. Missing or invalid variables: ${missingVars}`);
        }
        throw error;
    }
};

// Export validated configuration
export const config = parseConfig();

// Configuration type
export type Config = z.infer<typeof configSchema>;

// Helper functions
export const isDevelopment = (): boolean => config.NODE_ENV === 'development';
export const isProduction = (): boolean => config.NODE_ENV === 'production';
export const isTest = (): boolean => config.NODE_ENV === 'test'; 